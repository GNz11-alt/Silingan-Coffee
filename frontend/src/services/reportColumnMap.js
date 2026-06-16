/**
 * Column name mappings for all report types
 * Maps raw database column names to human-readable display names
 */

export const COLUMN_MAPS = {
  // Inventory Reports
  'inventory-on-hand': {
    'productname':        'Product Name',
    'product_name':       'Product Name',
    'name':               'Product Name',
    'category':           'Category',
    'unit':               'Unit',
    'stockquantity':      'How Many We Have',
    'reorderlevel':       'Minimum Safe Amount',
    'expirationdate':     'Expiry Date',
    'shortage':           'How Many We Need',
    'status':             'Status',
  },
 

  'inventory-aging': {
    'productname':        'Product Name',
    'product_name':       'Product Name',
    'name':               'Product Name',
    'category':           'Category',
    'unit':               'Unit',
    'stockquantity':      'How Many We Have',
    'expirationdate':     'Expiry Date',
    'days_until_expiry':  'Days Until Expiry',
    'urgency':            'Action Needed',
  },
 

  'low-inventory': {
    'name':                   'Product Name',
    'category':               'Category',
    'unit':                   'Unit',
    'stockquantity':          'How Many We Have',
    'reorderlevel':           'Minimum Safe Amount',
    'shortage':               'How Many We Need',
    'expirationdate':         'Expiry Date',
    'days_of_stock_remaining':'Days of Stock Left',
    'branch_name':            'Branch',
  },

    'low-raw-materials': {
    'rawproductid':       'ID',
    'name':               'Ingredient / Supply',
    'category':           'Category',
    'unit':               'Unit',
    'stockquantity':      'How Many We Have',
    'reorderlevel':       'Minimum Safe Amount',
    'expirationdate':     'Expiry Date',
    'hasexpiry':          'Has Expiry Date',
    'leadtimedays':       'Days to Arrive After Ordering',
    'status_label':       'What to Do',
  },



  'stock-turnover': {
    'name':                       'Product Name',
    'category':                   'Category',
    'unit':                       'Unit',
    'daily_consumption_rate':     'Sold Per Day (Average)',
    'days_of_stock_remaining':    'Days of Stock Left',
  },


  // Sales Reports
  'sales-pipeline': {
    'order_id':     'Order Number',
    'order_date':   'Date',
    'sale_date':    'Date',
    'branch_name':  'Branch',
    'product_name': 'Product',
    'quantity':     'Number Sold',
    'unit_price':   'Price Each',
    'subtotal':     'Subtotal',
    'discount':     'Discount',
    'net_sales':    'Amount Collected',
    'status':       'Status',
  },

  'sales-performance': {
    'branch_name':        'Branch',
    'product_category':   'Category',
    'total_revenue':      'Total Money Collected',
    'total_orders':       'Number of Orders',
    'avg_order_value':    'Average per Order',
    'revenue_percentage': 'Share of Total Sales',
  },

  'sales-monthly': {
    'year_month':       'Month',
    'branch_name':      'Branch',
    'total_revenue':    'Total Money Collected',
    'total_orders':     'Number of Orders',
    'avg_order_value':  'Average per Order',
  },
 

  'sales-weekly': {
    'week_start':       'Week Starting',
    'week_end':         'Week Ending',
    'branch_name':      'Branch',
    'total_revenue':    'Total Money Collected',
    'total_orders':     'Number of Orders',
    'avg_order_value':  'Average per Order',
  },


  'sales-forecast': {
    'sale_date':        'Date',
    'net_sales':        'Actual Sales',
    'moving_avg_3d':    '3-Day Average',
    'forecast_sales':   'Expected Sales',
  },


  // Employee Reports
  'employee-schedule': {
    'employee_name':  'Staff Name',
    'role':           'Position',
    'shift_date':     'Date',
    'start_time':     'Shift Start',
    'end_time':       'Shift End',
    'status':         'Status',
    'branch_name':    'Branch',
  },

  // Inventory Period Reports
  'inventory-monthly': {
    'year_month':           'Month',
    'branch_name':          'Branch',
    'product_name':         'Product',
    'category':             'Category',
    'unit':                 'Unit',
    'total_quantity_used':  'Amount Used',
    'current_stock':        'How Many We Have',
    'stock_status':         'Status',
  },

  'inventory-weekly': {
    'week_start':           'Week Starting',
    'week_end':             'Week Ending',
    'branch_name':          'Branch',
    'product_name':         'Product',
    'category':             'Category',
    'unit':                 'Unit',
    'total_quantity_used':  'Amount Used',
    'current_stock':        'How Many We Have',
    'stock_status':         'Status',
  },


  // Consolidated Report
  'consolidated-report': {
    'branch_name':          'Branch',
    'total_revenue':        'Total Money Collected',
    'total_orders':         'Number of Orders',
    'avg_order_value':      'Average per Order',
    'total_products_sold':  'Total Items Sold',
    'top_product':          'Best-Selling Product',
  },

};

/**
 * Get human-readable column name
 */
export function getColumnLabel(reportType, rawColumnName) {
  const map = COLUMN_MAPS[reportType] || {};
  return map[rawColumnName] || formatColumnName(rawColumnName);
}

/**
 * Format a column name by replacing underscores and capitalizing
 */
function formatColumnName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Transform row data from database columns to human-readable format
 */
export function transformRowData(reportType, rows) {
  if (!rows || rows.length === 0) return [];
  
  const map = COLUMN_MAPS[reportType];
  
  if (!map) {
    // Fallback: apply generic transformation
    return rows.map(row => {
      const out = {};
      for (const [key, value] of Object.entries(row)) {
        const label = formatColumnName(key);
        out[label] = value ?? '—';
      }
      return out;
    });
  }

  return rows.map(row => {
    const out = {};
    for (const [key, value] of Object.entries(row)) {
      const label = getColumnLabel(reportType, key);
      out[label] = value ?? '—';
    }
    return out;
  });
}

/**
 * Get ordered column headers for a report type
 */
export function getColumnOrder(reportType) {
  const orders = {
    'inventory-on-hand':    ['Product Name', 'Category', 'Unit', 'How Many We Have', 'Minimum Safe Amount', 'How Many We Need', 'Status'],
    'inventory-aging':      ['Product Name', 'Category', 'Unit', 'How Many We Have', 'Expiry Date', 'Days Until Expiry', 'Action Needed'],
    'low-inventory':        ['Product Name', 'Category', 'Unit', 'How Many We Have', 'Minimum Safe Amount', 'How Many We Need', 'Days of Stock Left', 'Expiry Date', 'Branch'],
    'low-raw-materials':    ['Ingredient / Supply', 'Category', 'Unit', 'How Many We Have', 'Minimum Safe Amount', 'Expiry Date', 'Days to Arrive After Ordering', 'What to Do'],
    'stock-turnover':       ['Product Name', 'Category', 'Unit', 'Sold Per Day (Average)', 'Days of Stock Left'],
    'sales-pipeline':       ['Date', 'Branch', 'Order Number', 'Product', 'Number Sold', 'Price Each', 'Subtotal', 'Discount', 'Amount Collected', 'Status'],
    'sales-performance':    ['Branch', 'Category', 'Number of Orders', 'Total Money Collected', 'Average per Order', 'Share of Total Sales'],
    'sales-monthly':        ['Month', 'Branch', 'Number of Orders', 'Total Money Collected', 'Average per Order'],
    'sales-weekly':         ['Week Starting', 'Week Ending', 'Branch', 'Number of Orders', 'Total Money Collected', 'Average per Order'],
    'sales-forecast':       ['Date', 'Actual Sales', '3-Day Average', 'Expected Sales'],
    'inventory-monthly':    ['Month', 'Branch', 'Product', 'Category', 'Unit', 'Amount Used', 'How Many We Have', 'Status'],
    'inventory-weekly':     ['Week Starting', 'Week Ending', 'Branch', 'Product', 'Category', 'Unit', 'Amount Used', 'How Many We Have', 'Status'],
    'employee-schedule':    ['Staff Name', 'Position', 'Date', 'Shift Start', 'Shift End', 'Status', 'Branch'],
    'consolidated-report':  ['Branch', 'Total Money Collected', 'Number of Orders', 'Average per Order', 'Total Items Sold', 'Best-Selling Product'],
  };
  return orders[reportType] || [];
}
