import { supabase } from '@/supabase.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayRange() {
  // Use UTC date from toISOString() — matches exactly how Dashboard.vue
  // constructs its date: `new Date().toISOString().split("T")[0]`
  const today = new Date().toISOString().split('T')[0]
  return {
    start: `${today}T00:00:00`,
    end: `${today}T23:59:59`,
  }
}

function todayDateStr() {
  // Returns YYYY-MM-DD in local time — matches ShiftDate column format
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function routeFor(role, page) {
  return `/${role}/${page}`
}

/**
 * Per-role deduplication: has this exact category+title already been inserted
 * today for this role+branch combination?
 */
async function existsToday(category, title, role, branchId) {
  const { start } = todayRange()
  let q = supabase
    .from('notifications')
    .select('id')
    .eq('category', category)
    .eq('title', title)
    .eq('role', role)
    .gte('created_at', start)
    .limit(1)

  const { data } = branchId != null
    ? await q.eq('branch_id', branchId)
    : await q.is('branch_id', null)

  return !!(data && data.length > 0)
}

function insertNotification({ role, branch_id, category, title, message, severity, link }) {
  return supabase.from('notifications').insert({
    role,
    branch_id,
    category,
    title,
    message,
    severity,
    is_read: false,
    created_at: new Date().toISOString(),
    ...(link ? { link } : {}),
  })
}

// ─── 1. Low Stock — top 4 most-consumed items currently low/out ──────────────

/**
 * Finds the 4 raw materials that are:
 *   a) currently at or below their reorder level
 *   b) most heavily consumed by menu orders in the last 30 days
 *
 * Ranking by actual menu usage means the items that will block sales soonest
 * always surface first.
 */
export async function checkTopLowStock(branchId, role) {
  // Step 1 — compute consumption per rawproductid over last 30 days
  const since = daysAgo(30)

  let ordersQuery = supabase
    .from('orders')
    .select('OrderId')
    .eq('Status', 'completed')
    .gte('CreatedAt', since)
  if (branchId) ordersQuery = ordersQuery.eq('BranchId', branchId)

  const { data: orders, error: oErr } = await ordersQuery
  if (oErr) { console.error('[Notifications] checkTopLowStock orders failed:', oErr); return }

  let consumptionMap = {} // rawproductid → total qty used

  if (orders && orders.length > 0) {
    const orderIds = orders.map(o => o.OrderId)

    const { data: items } = await supabase
      .from('orderitem')
      .select('ProductId, Quantity')
      .in('OrderId', orderIds)

    const { data: recipes } = await supabase
      .from('recipe')
      .select('finishedproductid, rawproductid, quantityneeded')

    if (items && recipes) {
      const recipeMap = {}
      for (const r of recipes) {
        if (!recipeMap[r.finishedproductid]) recipeMap[r.finishedproductid] = []
        recipeMap[r.finishedproductid].push({ rawproductid: r.rawproductid, qty: r.quantityneeded })
      }
      for (const oi of items) {
        for (const r of (recipeMap[oi.ProductId] || [])) {
          consumptionMap[r.rawproductid] = (consumptionMap[r.rawproductid] || 0) + r.qty * oi.Quantity
        }
      }
    }
  }

  // Step 2 — fetch raw products that are low/out of stock, scoped to branch
  let prodQuery = supabase
    .from('rawproduct')
    .select('rawproductid, name, stockquantity, reorderlevel, unit')
    .neq('status', 'Archived')

  if (branchId) {
    // Only products that have transactions in this branch
    const { data: txnIds } = await supabase
      .from('rawproducttransaction')
      .select('rawproductid')
      .eq('branchid', branchId)
    if (!txnIds || txnIds.length === 0) return
    const ids = [...new Set(txnIds.map(r => r.rawproductid))]
    prodQuery = prodQuery.in('rawproductid', ids)
  }

  const { data: products, error: pErr } = await prodQuery
  if (pErr) { console.error('[Notifications] checkTopLowStock products failed:', pErr); return }
  if (!products?.length) return

  // Filter to only low/out-of-stock items
  const lowItems = products.filter(p =>
    p.reorderlevel != null && p.stockquantity <= p.reorderlevel
  )
  if (!lowItems.length) return

  // Sort by consumption descending, take top 4
  const top4 = lowItems
    .sort((a, b) => (consumptionMap[b.rawproductid] || 0) - (consumptionMap[a.rawproductid] || 0))
    .slice(0, 4)

  const adminRoles = ['admin']
  const branchRoles = branchId ? ['manager', 'staff'] : []
  const allRoles = role === 'admin' ? adminRoles
    : role === 'manager' ? ['manager']
    : ['staff']

  for (const item of top4) {
    const isOut = item.stockquantity <= 0
    const severity = isOut ? 'critical' : 'high'
    const statusLabel = isOut ? 'OUT OF STOCK' : 'Low Stock'
    const used = consumptionMap[item.rawproductid]
    const usageNote = used ? ` (used ~${Math.round(used)} ${item.unit || 'units'} in 30 days)` : ''
    const title = `${statusLabel}: ${item.name}`
    const message = isOut
      ? `${item.name} is completely out of stock${usageNote}. Reorder immediately to avoid service disruption.`
      : `${item.name} has ${item.stockquantity} ${item.unit || 'units'} left — at or below reorder level of ${item.reorderlevel}${usageNote}.`

    // Admin always gets a global (branch_id: null) copy
    if (role === 'admin') {
      if (!(await existsToday('stock', title, 'admin', null))) {
        await insertNotification({
          role: 'admin', branch_id: null,
          category: 'stock', title, message, severity,
          link: routeFor('admin', 'inventory'),
        })
      }
    }
    // Manager gets branch-scoped copy
    if ((role === 'admin' || role === 'manager') && branchId) {
      if (!(await existsToday('stock', title, 'manager', branchId))) {
        await insertNotification({
          role: 'manager', branch_id: branchId,
          category: 'stock', title, message, severity,
          link: routeFor('manager', 'inventory'),
        })
      }
    }
    // Staff gets branch-scoped copy
    if (branchId && (role === 'staff' || role === 'admin' || role === 'manager')) {
      if (!(await existsToday('stock', title, 'staff', branchId))) {
        await insertNotification({
          role: 'staff', branch_id: branchId,
          category: 'stock', title, message, severity,
          link: routeFor('staff', 'inventory'),
        })
      }
    }
  }
}

// ─── 2. Expiry — 4 batches expiring soonest ───────────────────────────────────

/**
 * The 4 non-expired batches with the nearest expiration date.
 * Severity scales with how close the date is.
 */
export async function checkSoonestExpiry(branchId, role) {
  const now = new Date().toISOString()

  let query = supabase
    .from('rawproducttransaction')
    .select('rawtransactionid, rawproductid, branchid, quantity, expirationdate, rawproduct(name, unit)')
    .not('expirationdate', 'is', null)
    .gte('expirationdate', now)
    .eq('transactiontype', 'in')
    .gt('quantity', 0)
    .order('expirationdate', { ascending: true })
    .limit(4)

  if (branchId) query = query.eq('branchid', branchId)

  const { data: batches, error } = await query
  if (error) { console.error('[Notifications] checkSoonestExpiry failed:', error); return }
  if (!batches?.length) return

  for (const b of batches) {
    const prodName = b.rawproduct?.name || `Product #${b.rawproductid}`
    const unit = b.rawproduct?.unit || 'units'
    const expiryDate = new Date(b.expirationdate).toLocaleDateString('en-PH')
    const daysLeft = Math.ceil((new Date(b.expirationdate) - new Date()) / (1000 * 60 * 60 * 24))
    const daysLabel = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
    const severity = daysLeft <= 3 ? 'high' : 'medium'

    const title = `Expiring ${daysLeft <= 3 ? 'Very Soon' : 'Soon'}: ${prodName}`
    const message = `${prodName} (${b.quantity} ${unit}) expires ${daysLabel} on ${expiryDate}. ${daysLeft <= 3 ? 'Use immediately or discard.' : 'Plan to use it first.'}`

    const effectiveBranch = b.branchid ?? branchId

    if (role === 'admin') {
      if (!(await existsToday('stock', title, 'admin', null))) {
        await insertNotification({
          role: 'admin', branch_id: null,
          category: 'stock', title, message, severity,
          link: routeFor('admin', 'inventory'),
        })
      }
    }
    if ((role === 'admin' || role === 'manager') && effectiveBranch) {
      if (!(await existsToday('stock', title, 'manager', effectiveBranch))) {
        await insertNotification({
          role: 'manager', branch_id: effectiveBranch,
          category: 'stock', title, message, severity,
          link: routeFor('manager', 'inventory'),
        })
      }
    }
    if (effectiveBranch && (role === 'staff' || role === 'admin' || role === 'manager')) {
      if (!(await existsToday('stock', title, 'staff', effectiveBranch))) {
        await insertNotification({
          role: 'staff', branch_id: effectiveBranch,
          category: 'stock', title, message, severity,
          link: routeFor('staff', 'inventory'),
        })
      }
    }
  }
}

// ─── 3. Schedule — 4 upcoming shifts ─────────────────────────────────────────

/**
 * Resolves the EmployeeId for the logged-in staff user by matching their
 * localStorage username against the employee table — same logic as Schedule.vue.
 * Returns null if resolution fails.
 */
async function resolveStaffEmployeeId(branchId) {
  const username = localStorage.getItem('username')
  if (!username || !branchId) return null

  const { data: employees } = await supabase
    .from('employee')
    .select('EmployeeId, FirstName, LastName, Email')
    .eq('BranchAssigned', branchId)
    .eq('Status', 'Active')

  if (!employees?.length) return null

  // Try email match first (username → email prefix)
  const normalized = username.replace(/_/g, '.').toLowerCase()
  const byEmail = employees.find(e => e.Email?.toLowerCase().startsWith(normalized))
  if (byEmail) return byEmail.EmployeeId

  // Fallback: name token match
  const parts = username.split(/[_\-. ]+/).filter(p => p.length > 2)
  const byName = employees.find(e => {
    const full = `${e.FirstName} ${e.LastName}`.toLowerCase()
    return parts.some(p => full.includes(p))
  })
  return byName?.EmployeeId ?? employees[0]?.EmployeeId ?? null
}

/**
 * The 4 upcoming shifts ordered soonest-first.
 * Staff see only their own shifts; admin/manager see all shifts for their scope.
 */
export async function checkUpcomingSchedule(branchId, role) {
  const today = todayDateStr()

  let query = supabase
    .from('schedule')
    .select('ScheduleId, EmployeeId, Role, ShiftDate, StartTime, EndTime, Status, BranchId, employee(FirstName, LastName), branch(BranchName)')
    .neq('Status', 'Cancelled')
    .neq('Status', 'Archived')
    .gte('ShiftDate', today)
    .order('ShiftDate', { ascending: true })
    .limit(4)

  if (role === 'staff') {
    // Staff only see their own upcoming shifts
    const empId = await resolveStaffEmployeeId(branchId)
    if (!empId) return // can't resolve employee — skip silently
    query = query.eq('EmployeeId', empId)
  } else if (branchId) {
    // Manager: branch-scoped
    query = query.eq('BranchId', branchId)
  }
  // Admin: no branch filter — sees all upcoming shifts

  const { data: shifts, error } = await query
  if (error) { console.error('[Notifications] checkUpcomingSchedule failed:', error); return }
  if (!shifts?.length) return

  for (const s of shifts) {
    const empName = s.employee ? `${s.employee.FirstName} ${s.employee.LastName}` : `Employee #${s.EmployeeId}`
    const branchLabel = s.branch?.BranchName ? ` · ${s.branch.BranchName}` : ''
    const shiftDateStr = String(s.ShiftDate).slice(0, 10)
    const start = s.StartTime ? String(s.StartTime).slice(0, 5) : '?'
    const end = s.EndTime ? String(s.EndTime).slice(0, 5) : '?'
    const isToday = shiftDateStr === today
    const severity = isToday ? 'high' : 'medium'

    // Format date in readable form
    const shiftDate = new Date(shiftDateStr + 'T00:00:00')
    const dateLabel = shiftDate.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

    const title = isToday
      ? `Shift Today: ${empName}`
      : `Upcoming Shift: ${empName}`
    const message = `${empName} is scheduled on ${dateLabel} from ${start}–${end}${branchLabel}${s.Role ? ` (${s.Role})` : ''}.`

    const schedLink = role === 'staff' ? routeFor('staff', 'schedule') : routeFor(role, 'shift-management')
    const effectiveBranch = s.BranchId ?? branchId

    if (role === 'admin') {
      if (!(await existsToday('schedule', title, 'admin', null))) {
        await insertNotification({ role: 'admin', branch_id: null, category: 'schedule', title, message, severity, link: routeFor('admin', 'shift-management') })
      }
    }
    if ((role === 'admin' || role === 'manager') && effectiveBranch) {
      if (!(await existsToday('schedule', title, 'manager', effectiveBranch))) {
        await insertNotification({ role: 'manager', branch_id: effectiveBranch, category: 'schedule', title, message, severity, link: routeFor('manager', 'shift-management') })
      }
    }
    if (role === 'staff') {
      if (!(await existsToday('schedule', title, 'staff', effectiveBranch))) {
        await insertNotification({ role: 'staff', branch_id: effectiveBranch, category: 'schedule', title, message, severity, link: routeFor('staff', 'schedule') })
      }
    }
  }
}

// ─── 4. Sales — today's summary ───────────────────────────────────────────────

/**
 * One combined sales summary notification for today.
 * Admin/Manager: revenue + order count + avg order value.
 * Staff: order count only (no revenue figures).
 */
export async function checkTodaySales(branchId, role) {
  const { start, end } = todayRange()

  let query = supabase
    .from('orders')
    .select('BranchId, FinalAmount, TotalAmount, Status')
    .gte('CreatedAt', start)
    .lte('CreatedAt', end)
    .eq('Status', 'completed')

  if (branchId) query = query.eq('BranchId', branchId)

  const { data: orders, error } = await query
  if (error) { console.error('[Notifications] checkTodaySales failed:', error); return }
  if (!orders?.length) return

  const count = orders.length
  const totalRevenue = orders.reduce((s, o) => s + Number(o.FinalAmount || o.TotalAmount || 0), 0)
  const avg = totalRevenue / count

  // Resolve branch name for the message
  let branchLabel = 'all branches'
  if (branchId) {
    const { data: b } = await supabase.from('branch').select('BranchName').eq('BranchId', branchId).maybeSingle()
    if (b) branchLabel = b.BranchName
  }

  const today = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })

  if (role === 'admin') {
    const title = `Sales Summary: ${today}`
    const message = `${count} completed orders across ${branchLabel} today — ₱${totalRevenue.toFixed(2)} total revenue · avg ₱${avg.toFixed(2)}/order.`
    if (!(await existsToday('sales', title, 'admin', null))) {
      await insertNotification({ role: 'admin', branch_id: null, category: 'sales', title, message, severity: 'low', link: routeFor('admin', 'sales') })
    }
  }

  if ((role === 'admin' || role === 'manager') && branchId) {
    const title = `Sales Summary: ${today}`
    const message = `${count} completed orders at ${branchLabel} today — ₱${totalRevenue.toFixed(2)} total revenue · avg ₱${avg.toFixed(2)}/order.`
    if (!(await existsToday('sales', title, 'manager', branchId))) {
      await insertNotification({ role: 'manager', branch_id: branchId, category: 'sales', title, message, severity: 'low', link: routeFor('manager', 'sales') })
    }
  }

  if (role === 'staff' && branchId) {
    const title = `Orders Today: ${today}`
    const message = `${count} order${count !== 1 ? 's' : ''} completed at ${branchLabel} today.`
    if (!(await existsToday('sales', title, 'staff', branchId))) {
      await insertNotification({ role: 'staff', branch_id: branchId, category: 'sales', title, message, severity: 'low', link: routeFor('staff', 'dashboard') })
    }
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Runs all 4 checks on every refresh cycle (login + every 30 min).
 * Each check produces at most 4 notifications per category.
 * Deduplication prevents re-insertion within the same day.
 */
export async function generateAllNotifications({ branchId = null, role = 'staff' } = {}) {
  // Run all 4 in sequence so Supabase isn't hammered with parallel batch inserts
  await checkTopLowStock(branchId, role)
  await checkSoonestExpiry(branchId, role)
  await checkUpcomingSchedule(branchId, role)
  await checkTodaySales(branchId, role)
}
