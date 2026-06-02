import { supabase } from '../supabase.js'
import { transformRowData, getColumnLabel } from './reportColumnMap.js'

//helper function date range based on period selection (week, month, year)
export function getDateRange(period) {
  const today = new Date()
  const pad   = n => String(n).padStart(2, '0')
  const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const to    = fmt(today)
 
  if (period === 'week') {
    const from = new Date(today); from.setDate(today.getDate() - 6)
    return { from: fmt(from), to }
  }
  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: fmt(from), to }
  }
  if (period === 'year') {
    const from = new Date(today.getFullYear(), 0, 1)
    return { from: fmt(from), to }
  }
  return { from: to, to }
}

//analytics queries

// daily sales trend (date, revenue, order count)
export async function getSalesTrend(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_sales_trend', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}

//  KPI cards (tot sales, orders, AOV, active products + period change)
export async function getKpiSummary(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_kpi_summary', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}

// avg order per hour of day (peak hrs)
export async function getPeakHours(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_peak_hours', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}

//revenue percent product category for revenue breakdown
export async function getRevenueByCategory(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_revenue_by_category', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}


//Top N product by revenue
export async function getTopProducts(dateFrom, dateTo, branchId = null, limit = 10) {
  return supabase.rpc('get_top_products', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
    p_limit:     limit,
  })
}

//revenue per branch
export async function getBranchComparison(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_branch_comparison', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}


//raw mats at or below reorder level
export async function getLowStockItems(branchId = null) {
  return supabase.rpc('get_low_stock_items', {
    p_branch_id: branchId,
  })
}

export async function getLowRawMaterials(branchId = null) {
  return supabase.rpc('get_low_raw_materials', {
    p_branch_id: branchId,
  })
}

//daily consumption rate per raw mats 
export async function getStockTurnover(dateFrom, dateTo, branchId = null) {
  return supabase.rpc('get_stock_turnover', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
}


//REPORTS LIST

// load saved report recs from the reports table
export async function getSavedReports({ types, branchId, dateFrom, dateTo } = {}) {
  let query = supabase
    .from('report')
    .select(`
      reportid,
      reporttype,
      reporttitle,
      reportdate,
      date_from,
      date_to,
      filepath,
      createdat,
      branch:branchid(BranchName),
      generatedby
    `)
    .order('createdat', { ascending: false })
    .limit(100)
 
  if (types?.length) query = query.in('reporttype', types)
  if (branchId)      query = query.eq('branchid', branchId)
  if (dateFrom)      query = query.gte('reportdate', dateFrom)
  if (dateTo)        query = query.lte('reportdate', dateTo)
 
  return query
}

//save repost metadata record after report
export async function saveReportRecord({ type, title, branchId, generatedBy, filePath, dateFrom, dateTo }) {
  const today = new Date().toISOString().split('T')[0]

  let recordBranchId = branchId
  if (!recordBranchId) {
    const { data: branches } = await supabase.from('branch').select('BranchId').limit(1)
    recordBranchId = branches?.[0]?.BranchId ?? null
    if (!recordBranchId) {
      console.warn('[Reports] Skipping save — no branches in DB')
      return
    }
    console.warn('[Reports] branchId was null, fell back to branch', recordBranchId)
  }

  const record = {
    reporttype:  type,
    reporttitle: title,
    reportdate:  today,
    branchid:    recordBranchId,
    generatedby: generatedBy,
    createdat:   new Date().toISOString(),
    date_from:   dateFrom || today,
    date_to:     dateTo   || today,
  }
  if (filePath)    record.filepath    = filePath
  return supabase.from('report').insert(record).select().single()
}

//REPORT DATA FETCHING

//fetch row data that gets exported to csv/excel for the different report types
const REPORT_FUNCTION_MAP = {
  'sales-pipeline':      'report_sales_pipeline',
  'sales-performance':   'report_sales_performance',
  'sales-forecast':      'report_sales_forecast',
  'customer-churn':      'report_sales_pipeline',
  'sales-summary':       'report_sales_summary',
  'inventory-on-hand':   null,                        // direct handler below
  'inventory-aging':     null,
  'stock-turnover':      'get_stock_turnover',
  'low-inventory':       null,
  'low-raw-materials':   null,
  'inventory-summary':   null,
  'employee-schedule':   null,
  'consolidated-report': 'report_consolidated',
}

//fetch actual data rows, returns an array of objects report ready
export async function fetchReportData(reportType, { dateFrom, dateTo, branchId } = {}) {
  const fnName = REPORT_FUNCTION_MAP[reportType]

  // Normalize dates to YYYY-MM-DD strings (PostgREST URL filters can't handle Date objects)
  if (dateFrom instanceof Date) dateFrom = dateFrom.toISOString().slice(0, 10)
  if (dateTo instanceof Date) dateTo = dateTo.toISOString().slice(0, 10)

// Inventory reports: source from rawproduct + rawproducttransaction
  if (reportType === 'inventory-on-hand') {
    const [prodRes, txRes] = await Promise.all([
      supabase.from('rawproduct').select('rawproductid, name, category, unit, reorderlevel, hasexpiry').neq('status', 'Archived'),
      supabase.from('rawproducttransaction').select('rawproductid, branchid, transactiontype, quantity'),
    ])
    if (prodRes.error) return { data: [], raw: [], error: prodRes.error }
    const filteredTx = branchId ? (txRes.data || []).filter(t => t.branchid === branchId) : (txRes.data || [])
    const stockByProduct = {}
    for (const tx of filteredTx) {
      const qty = tx.transactiontype === 'in' ? tx.quantity : -tx.quantity
      stockByProduct[tx.rawproductid] = (stockByProduct[tx.rawproductid] || 0) + qty
    }
    const raw = (prodRes.data || []).map(p => {
      const stock = stockByProduct[p.rawproductid] || 0
      return {
        name: p.name,
        category: p.category,
        unit: p.unit || '—',
        stockquantity: stock,
        reorderlevel: p.reorderlevel,
        shortage: p.reorderlevel ? Math.max(0, p.reorderlevel - stock) : 0,
        status: stock === 0 ? 'Out of Stock'
              : (p.reorderlevel && stock <= p.reorderlevel) ? 'Low Stock' : 'In Stock',
      }
    })
    return { data: transformRowData(reportType, raw), raw, error: null }
  }

  if (reportType === 'inventory-aging') {
    const [prodRes, txRes] = await Promise.all([
      supabase.from('rawproduct').select('rawproductid, name, category, unit, hasexpiry').eq('hasexpiry', true).neq('status', 'Archived'),
      supabase.from('rawproducttransaction').select('rawproductid, branchid, transactiontype, quantity, expirationdate').not('expirationdate', 'is', null),
    ])
    if (prodRes.error) return { data: [], raw: [], error: prodRes.error }
    const filteredTx = branchId ? (txRes.data || []).filter(t => t.branchid === branchId) : (txRes.data || [])
    const today = new Date()
    const batchesByProduct = {}
    for (const tx of filteredTx) {
      if (!batchesByProduct[tx.rawproductid]) batchesByProduct[tx.rawproductid] = []
      batchesByProduct[tx.rawproductid].push(tx)
    }
    const raw = (prodRes.data || []).map(p => {
      const batches = batchesByProduct[p.rawproductid] || []
      let stock = 0
      let nearestExpiry = null
      for (const b of batches) {
        const qty = b.transactiontype === 'in' ? b.quantity : -b.quantity
        stock += qty
        if (b.expirationdate && (!nearestExpiry || new Date(b.expirationdate) < new Date(nearestExpiry))) {
          nearestExpiry = b.expirationdate
        }
      }
      const expDate = nearestExpiry ? new Date(nearestExpiry) : null
      const daysLeft = expDate ? Math.ceil((expDate - today) / 86400000) : null
      return {
        name: p.name,
        category: p.category,
        unit: p.unit || '—',
        stockquantity: stock,
        expirationdate: nearestExpiry || 'N/A',
        days_until_expiry: daysLeft != null ? daysLeft : 'N/A',
        urgency: daysLeft == null ? 'N/A'
                : daysLeft <= 0 ? 'EXPIRED'
                : daysLeft <= 3 ? 'Critical'
                : daysLeft <= 7 ? 'Warning' : 'OK',
      }
    })
      .filter(p => p.stockquantity > 0 && p.expirationdate && p.expirationdate !== 'N/A')
    return { data: transformRowData(reportType, raw), raw, error: null }
  }

  if (reportType === 'low-inventory') {
    const { data, error } = await getLowStockItems(branchId)
    if (error) return { data: [], raw: [], error }
    const raw = (data || []).map(i => ({
      product_name: i.product_name,
      category: i.category,
      we_have: i.we_have,
      minimum_safe: i.minimum_safe,
      need_more: i.need_more,
      expiration_date: i.expiration_date,
      days_until_expiry: i.days_until_expiry,
      branch_name: i.branch_name,
      status_label: i.status_label,
    }))
    return { data: transformRowData(reportType, raw), raw, error: null }
  }

  if (reportType === 'low-raw-materials') {
    const { data, error } = await getLowRawMaterials(branchId)
    if (error) return { data: [], raw: [], error }
    return { data: transformRowData(reportType, data), raw: data, error: null }
  }

  if (reportType === 'stock-turnover') {
    const start = dateFrom ? new Date(dateFrom) : null
    const end = dateTo ? new Date(dateTo) : null
    const daysInRange = start && end ? Math.max(1, Math.floor((end - start) / 86400000) + 1) : 1

    const [prodRes, recipeRes, orderRes] = await Promise.all([
      supabase.from('rawproduct').select('rawproductid, name, category, unit').neq('status', 'Archived'),
      supabase.from('recipe').select('rawproductid, finishedproductid, quantityneeded'),
      (() => {
        let q = supabase.from('orders').select('OrderId').eq('Status', 'completed')
        if (dateFrom) q = q.gte('CreatedAt', dateFrom + 'T00:00:00')
        if (dateTo) q = q.lte('CreatedAt', dateTo + 'T23:59:59')
        if (branchId) q = q.eq('BranchId', branchId)
        return q
      })(),
    ])
    if (prodRes.error) return { data: [], raw: [], error: prodRes.error }

    const orderIds = (orderRes.data || []).map(o => o.OrderId)
    let oiQuery = supabase.from('orderitem').select('ProductId, Quantity')
    if (orderIds.length) oiQuery = oiQuery.in('OrderId', orderIds)
    const { data: orderItems } = orderIds.length ? await oiQuery : { data: [] }

    const recipeMap = {}
    for (const r of recipeRes.data || []) {
      if (!recipeMap[r.finishedproductid]) recipeMap[r.finishedproductid] = []
      recipeMap[r.finishedproductid].push({ rawproductid: r.rawproductid, qty: r.quantityneeded })
    }

    const consumptionMap = {}
    for (const oi of orderItems || []) {
      const recipes = recipeMap[oi.ProductId] || []
      for (const r of recipes) {
        consumptionMap[r.rawproductid] = (consumptionMap[r.rawproductid] || 0) + r.qty * oi.Quantity
      }
    }

    let txQuery = supabase.from('rawproducttransaction').select('rawproductid, branchid, transactiontype, quantity')
    if (branchId) txQuery = txQuery.eq('branchid', branchId)
    const { data: transactions } = await txQuery

    const stockByProduct = {}
    for (const tx of transactions || []) {
      const qty = tx.transactiontype === 'in' ? tx.quantity : -tx.quantity
      stockByProduct[tx.rawproductid] = (stockByProduct[tx.rawproductid] || 0) + qty
    }

    const raw = (prodRes.data || []).map(p => {
      const totalUsed = consumptionMap[p.rawproductid] || 0
      const dailyRate = daysInRange > 0 ? totalUsed / daysInRange : 0
      const stock = stockByProduct[p.rawproductid] || 0
      const daysRemaining = dailyRate > 0 ? Math.round(stock / dailyRate * 10) / 10 : (stock > 0 ? 'N/A' : 0)
      return {
        name: p.name,
        category: p.category || '—',
        unit: p.unit || '—',
        daily_consumption_rate: Math.round(dailyRate * 100) / 100,
        days_of_stock_remaining: daysRemaining,
      }
    })
      .filter(p => p.daily_consumption_rate > 0 || p.days_of_stock_remaining === 'N/A')

    return { data: transformRowData(reportType, raw), raw, error: null }
  }

  if (reportType === 'inventory-summary') {
    const isWeekly = dateFrom && dateTo ? (new Date(dateTo) - new Date(dateFrom)) / 86400000 <= 42 : false;
    const [prodRes, recipeRes, orderRes, branchRes] = await Promise.all([
      supabase.from('rawproduct').select('rawproductid, name, category, unit, reorderlevel').neq('status', 'Archived'),
      supabase.from('recipe').select('rawproductid, finishedproductid, quantityneeded'),
      (() => {
        let q = supabase.from('orders').select('OrderId, CreatedAt, BranchId').eq('Status', 'completed')
        if (dateFrom) q = q.gte('CreatedAt', dateFrom + 'T00:00:00')
        if (dateTo) q = q.lte('CreatedAt', dateTo + 'T23:59:59')
        if (branchId) q = q.eq('BranchId', branchId)
        return q
      })(),
      supabase.from('branch').select('BranchId, BranchName'),
    ])
    if (prodRes.error) return { data: [], raw: [], error: prodRes.error }

    const branchNameMap = {}
    for (const b of branchRes.data || []) branchNameMap[b.BranchId] = b.BranchName

    const orderIds = (orderRes.data || []).map(o => o.OrderId)
    let oiQuery = supabase.from('orderitem').select('OrderId, ProductId, Quantity')
    if (orderIds.length) oiQuery = oiQuery.in('OrderId', orderIds)
    const { data: orderItems } = orderIds.length ? await oiQuery : { data: [] }

    const recipeMap = {}
    for (const r of recipeRes.data || []) {
      if (!recipeMap[r.finishedproductid]) recipeMap[r.finishedproductid] = []
      recipeMap[r.finishedproductid].push({ rawproductid: r.rawproductid, qty: r.quantityneeded })
    }

    const orderLookup = {}
    for (const o of orderRes.data || []) orderLookup[o.OrderId] = o

    const consumptionByPeriod = {}
    for (const oi of orderItems || []) {
      const order = orderLookup[oi.OrderId]
      if (!order) continue
      const createdAt = new Date(order.CreatedAt)
      let periodKey, periodLabel
      if (isWeekly) {
        const ws = new Date(createdAt)
        ws.setDate(ws.getDate() - ws.getDay())
        periodKey = ws.toISOString().split('T')[0]
        const we = new Date(ws)
        we.setDate(we.getDate() + 6)
        periodLabel = ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' - ' +
          we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } else {
        periodKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`
        periodLabel = periodKey
      }
      const oBranchId = order.BranchId
      const recipes = recipeMap[oi.ProductId] || []
      for (const r of recipes) {
        const key = `${periodKey}:${oBranchId}:${r.rawproductid}`
        if (!consumptionByPeriod[key]) consumptionByPeriod[key] = { periodLabel, qty: 0 }
        consumptionByPeriod[key].qty += r.qty * oi.Quantity
      }
    }

    let txQuery = supabase.from('rawproducttransaction').select('rawproductid, branchid, transactiontype, quantity')
    if (branchId) txQuery = txQuery.eq('branchid', branchId)
    const { data: transactions } = await txQuery

    const stockByProductBranch = {}
    for (const tx of transactions || []) {
      const qty = tx.transactiontype === 'in' ? tx.quantity : -tx.quantity
      const key = `${tx.rawproductid}:${tx.branchid}`
      stockByProductBranch[key] = (stockByProductBranch[key] || 0) + qty
    }

    const productMap = {}
    for (const p of prodRes.data || []) productMap[p.rawproductid] = p

    const raw = []
    for (const [key, val] of Object.entries(consumptionByPeriod)) {
      const parts = key.split(':')
      const periodKey = parts[0]
      const branchIdStr = parts[1]
      const rawproductid = Number(parts[2])
      const p = productMap[rawproductid]
      if (!p) continue
      const stockKey = `${rawproductid}:${branchIdStr}`
      const stock = stockByProductBranch[stockKey] || 0
      const branchName = branchNameMap[Number(branchIdStr)] || '—'
      const status = stock === 0 ? 'Out of Stock'
        : (p.reorderlevel && stock <= p.reorderlevel) ? 'Low Stock' : 'In Stock'
      raw.push({
        period_label: val.periodLabel,
        branch_name: branchName,
        product_name: p.name,
        category: p.category || '—',
        unit: p.unit || '—',
        total_quantity_used: val.qty,
        current_stock: stock,
        stock_status: status,
      })
    }

    return { data: transformRowData(reportType, raw), raw, error: null }
  }

// Employee Schedule — direct query (no RPC)
  if (reportType === 'employee-schedule') {
    let query = supabase
      .from('schedule')
      .select('Role, ShiftDate, StartTime, EndTime, Status, BranchId, employee(FirstName, LastName), branch(BranchName)')
      .neq('Status', 'Archived')
      .gte('ShiftDate', dateFrom)
      .lte('ShiftDate', dateTo)
      .order('ShiftDate', { ascending: true })

    if (branchId) query = query.eq('BranchId', branchId)

    const { data, error } = await query
    if (error) return { data: [], raw: [], error }

    const raw = (data || []).map((s) => ({
      employee_name: s.employee
        ? `${s.employee.FirstName || ''} ${s.employee.LastName || ''}`.trim()
        : 'Unknown',
      role: s.Role || '—',
      shift_date: s.ShiftDate ? String(s.ShiftDate).slice(0, 10) : '',
      start_time: s.StartTime ? String(s.StartTime).slice(0, 5) : '',
      end_time: s.EndTime ? String(s.EndTime).slice(0, 5) : '',
      status: s.Status || 'Scheduled',
      branch_name: s.branch?.BranchName || '—',
    }))

    return { data: transformRowData(reportType, raw), raw, error: null }
  }

//rpc based queries
  if (!fnName) {
    return { data: [], error: { message: `No query defined for type: ${reportType}` } }
  }
  const { data, error } = await supabase.rpc(fnName, {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
    p_branch_id: branchId,
  })
  
  if (error) {
    console.error(`[reportService] ${fnName} RPC failed:`, error)
  } else if (!data || data.length === 0) {
    console.warn(`[reportService] ${fnName} returned empty set`, { dateFrom, dateTo, branchId })
  }
  
  // Transform to human-friendly column headers using column map
  const transformed = transformRowData(reportType, data || [])
 
  return { data: transformed, raw: data || [], error }
}

//BRANCHES
export async function getBranches() {
  return supabase.from('branch').select('branchid:BranchId, branchname:BranchName').order('BranchName')
}

//STORAGE — Upload a file buffer/blob to the reports bucket
export async function uploadReportFile(buffer, fileName, contentType) {
  const filePath = `reports/${fileName}`
  const { error } = await supabase.storage
    .from('reports')
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
    })
  if (error) {
    console.error('[Storage] upload failed:', error)
    return { error }
  }
  const { data: publicUrl } = supabase.storage
    .from('reports')
    .getPublicUrl(filePath)
  return { filePath, publicUrl: publicUrl?.publicUrl || null, error: null }
}

export async function deleteReportFile(filePath) {
  const { error } = await supabase.storage.from('reports').remove([filePath])
  if (error) console.error('[Storage] delete failed:', error)
  return { error }
}
