import { supabase } from '@/supabase.js'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function tomorrowRange() {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setDate(end.getDate() + 1)
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function sevenDaysFromNow() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

async function existsToday(category, title, branchId) {
  const { start } = todayRange()
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('category', category)
    .eq('title', title)
    .eq('branch_id', branchId || null)
    .gte('created_at', start)
    .limit(1)
  return data && data.length > 0
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

export async function checkLowStock(branchId) {
  let query = supabase
    .from('rawproduct')
    .select('rawproductid, name, stockquantity, reorderlevel, unit')

  const { data: items } = await query
  if (!items) return

  for (const item of items) {
    if (item.stockquantity <= item.reorderlevel) {
      const title = `Low Stock: ${item.name}`
      const message = `${item.name} has ${item.stockquantity} ${item.unit || 'units'} remaining — below reorder level of ${item.reorderlevel}.`

      if (await existsToday('stock', title, branchId)) continue

      // Create for admin (all branches)
      await insertNotification({
        role: 'admin',
        branch_id: null,
        category: 'stock',
        title,
        message,
        severity: 'high',
      })
      // Create for manager of this branch
      if (branchId) {
        await insertNotification({
          role: 'manager',
          branch_id: branchId,
          category: 'stock',
          title,
          message,
          severity: 'high',
        })
        await insertNotification({
          role: 'staff',
          branch_id: branchId,
          category: 'stock',
          title,
          message,
          severity: 'high',
        })
      }
    }
  }
}

export async function checkExpiringItems(branchId) {
  const until = sevenDaysFromNow()
  // Fetch batches expiring within 7 days
  let query = supabase
    .from('rawtransaction')
    .select(`
      rawtransactionid, rawproductid, branchid, quantity, expirationdate,
      rawproduct ( name )
    `)
    .not('expirationdate', 'is', null)
    .lte('expirationdate', until)
    .gte('expirationdate', new Date().toISOString())
    .gt('quantity', 0)

  if (branchId) query = query.eq('branchid', branchId)

  const { data: batches } = await query
  if (!batches) return

  // Group by product to avoid duplicate notifications
  const seen = new Set()
  for (const b of batches) {
    const prodName = b.rawproduct?.name || `Product #${b.rawproductid}`
    const key = `${prodName}-${b.branchid}`
    if (seen.has(key)) continue
    seen.add(key)

    const expiryDate = new Date(b.expirationdate).toLocaleDateString('en-PH')
    const title = `Expiring Soon: ${prodName}`
    const message = `${prodName} has a batch expiring on ${expiryDate} (${b.quantity} units). Use before expiration.`

    if (await existsToday('stock', title, b.branchid)) continue

    await insertNotification({
      role: 'admin',
      branch_id: null,
      category: 'stock',
      title,
      message,
      severity: 'medium',
    })
    if (b.branchid) {
      await insertNotification({
        role: 'manager',
        branch_id: b.branchid,
        category: 'stock',
        title,
        message,
        severity: 'medium',
      })
      await insertNotification({
        role: 'staff',
        branch_id: b.branchid,
        category: 'stock',
        title,
        message,
        severity: 'medium',
      })
    }
  }
}

export async function checkDailySales(branchId) {
  const { start, end } = todayRange()

  let query = supabase
    .from('orders')
    .select('BranchId, FinalAmount, TotalAmount')
    .gte('CreatedAt', start)
    .lte('CreatedAt', end)

  if (branchId) query = query.eq('BranchId', branchId)

  const { data: orders } = await query
  if (!orders) return

  // Group by branch
  const byBranch = {}
  for (const o of orders) {
    const bid = o.BranchId || 'unknown'
    if (!byBranch[bid]) byBranch[bid] = []
    byBranch[bid].push(o)
  }

  for (const [bid, branchOrders] of Object.entries(byBranch)) {
    const total = branchOrders.reduce((sum, o) => sum + Number(o.FinalAmount || o.TotalAmount || 0), 0)

    // Resolve branch name
    let branchName = `Branch #${bid}`
    if (bid !== 'unknown') {
      const { data: b } = await supabase
        .from('branch')
        .select('BranchName')
        .eq('BranchId', bid)
        .maybeSingle()
      if (b) branchName = b.BranchName
    }

    const title = `Sales Update: ${branchName}`
    const message = `Today's total sales for ${branchName}: ₱${total.toFixed(2)} (${branchOrders.length} orders)`

    if (await existsToday('sales', title, bid === 'unknown' ? null : Number(bid))) continue

    await insertNotification({
      role: 'admin',
      branch_id: null,
      category: 'sales',
      title,
      message,
      severity: 'low',
    })
    if (bid !== 'unknown') {
      await insertNotification({
        role: 'manager',
        branch_id: Number(bid),
        category: 'sales',
        title,
        message,
        severity: 'low',
      })
    }
  }
}

export async function generateAllNotifications({ branchId, role }) {
  if (role === 'admin' || role === 'manager') {
    await checkLowStock(branchId)
    await checkExpiringItems(branchId)
    await checkDailySales(branchId)
  } else if (role === 'staff') {
    await checkLowStock(branchId)
    await checkExpiringItems(branchId)
  }
}
