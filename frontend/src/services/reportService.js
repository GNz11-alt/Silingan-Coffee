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
export async function getLowStockItems(dateFrom = null, dateTo = null, branchId = null) {
  return supabase.rpc('get_low_stock_items', {
    p_date_from: dateFrom,
    p_date_to:   dateTo,
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
      filepath,
      createdat,
      branchid,
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
export async function saveReportRecord({ type, title, branchId, generatedBy, filePath }) {
  const today = new Date().toISOString().split('T')[0]

  let recordBranchId = branchId
  if (!recordBranchId) {
    const { data: branches } = await supabase.from('branch').select('BranchId').limit(1)
    recordBranchId = branches?.[0]?.BranchId ?? null
    if (!recordBranchId) { console.warn('[Reports] Skipping save — no branches in DB'); return }
  }

  const record = {
    reporttype:  type,
    reporttitle: title,
    reportdate:  today,
    branchid:    recordBranchId,
    generatedby: generatedBy,
    createdat:   new Date().toISOString(),
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
  'sales-monthly':       'report_sales_monthly',
  'sales-weekly':        'report_sales_weekly',
  'inventory-on-hand':   null,                        // direct handler below
  'inventory-aging':     null,
  'stock-turnover':      'get_stock_turnover',
  'low-inventory':       null,
  'inventory-monthly':   'get_inventory_monthly',
  'inventory-weekly':    'get_inventory_weekly',
  'employee-schedule':   'report_employee_schedule',
  'consolidated-report': 'report_consolidated',
}

//fetch actual data rows, returns an array of objects report ready
export async function fetchReportData(reportType, { dateFrom, dateTo, branchId } = {}) {
  const fnName = REPORT_FUNCTION_MAP[reportType]

//custom RPC handlers
  if (reportType === 'inventory-on-hand') {
    const { data, error } = await supabase.rpc('get_inventory_on_hand', {
      p_date_from: dateFrom,
      p_date_to:   dateTo,
      p_branch_id: branchId,
    })
    return { data: data?.map(r => ({
      'Product Name':     r.productname,
      'Category':         r.category,
      'Unit':             r.unit || '—',
      'Current Stock':   r.stockquantity,
      'Reorder Level':    r.reorderlevel,
      'Expiration Date':  r.expirationdate || 'N/A',
      'Status': r.stockquantity === 0 ? 'Out of Stock'
              : r.stockquantity <= r.reorderlevel ? 'Low Stock' : 'In Stock',
    })), raw: data || [], error }
  }
  
  if (reportType === 'inventory-aging') {
    const { data, error } = await supabase.rpc('get_inventory_aging', {
      p_date_from: dateFrom,
      p_date_to:   dateTo,
      p_branch_id: branchId,
    })
    const today = new Date()
    return { data: data?.map(r => {
      const expDate = new Date(r.expirationdate)
      const daysLeft = Math.ceil((expDate - today) / 86400000)
      const rawRecord = { ...r, days_until_expiry: isNaN(daysLeft) ? 9999 : daysLeft }
      return {
        'Product Name':     r.productname,
        'Category':         r.category,
        'Unit':             r.unit || '—',
        'Current Stock':    r.stockquantity,
        'Expiration Date':  r.expirationdate,
        'Days Until Expiry': daysLeft,
        'Urgency': daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 3 ? 'Critical' : daysLeft <= 7 ? 'Warning' : 'OK',
      }
    }), raw: data?.map(r => {
      const expDate = new Date(r.expirationdate)
      const daysLeft = Math.ceil((expDate - today) / 86400000)
      return { ...r, days_until_expiry: isNaN(daysLeft) ? 9999 : daysLeft }
    }) || [], error }
  }
  if (reportType === 'low-inventory') {
    const invParams = {}
    if (branchId) invParams.p_branch_id = branchId
    const { data, error } = await supabase.rpc('get_low_stock_items', Object.keys(invParams).length ? invParams : undefined)
    return { data: data?.map(r => ({
      'Product Name':     r.name,
      'Category':         r.category,
      'Unit':             r.unit || '—',
      'Current Stock':    r.stockquantity,
      'Reorder Level':    r.reorderlevel,
      'Shortage':         Math.max(0, r.reorderlevel - r.stockquantity),
      'Expiration Date':  r.expirationdate || 'N/A',
      'Days of Stock Remaining': r.days_until_expiry != null ? r.days_until_expiry : '—',
      'Branch':           r.branch_name || '—',
    })), raw: data?.map(r => ({
      ...r,
      branch_name:         r.branch_name || null,
      days_of_stock_remaining: r.days_until_expiry,
    })) || [], error }
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
  
  // Transform to human-friendly column headers using column map
  const transformed = transformRowData(reportType, data || [])
 
  return { data: transformed, raw: data || [], error }
}

//BRANCHES
export async function getBranches() {
  return supabase.from('branch').select('branchid:BranchId, branchname:BranchName').order('BranchName')
}
