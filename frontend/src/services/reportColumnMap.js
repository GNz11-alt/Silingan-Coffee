/**
 * Column name mappings for all report types
 * Maps raw database column names to human-readable display names
 */

export const COLUMN_MAPS = {
  // Inventory Reports
  'inventory-on-hand': {
    'productname': 'Product Name',
    'product_name': 'Product Name',
    'name': 'Product Name',
    'category': 'Category',
    'unit': 'Unit',
    'stockquantity': 'Current Stock',
    'reorderlevel': 'Reorder Level',
    'expirationdate': 'Expiration Date',
    'shortage': 'Shortage',
    'status': 'Status',
  },
  'inventory-aging': {
    'productname': 'Product Name',
    'product_name': 'Product Name',
    'name': 'Product Name',
    'category': 'Category',
    'unit': 'Unit',
    'stockquantity': 'Current Stock',
    'expirationdate': 'Expiration Date',
    'days_until_expiry': 'Days Until Expiry',
    'urgency': 'Urgency',
  },
  'low-inventory': {
    'name': 'Product Name',
    'category': 'Category',
    'unit': 'Unit',
    'stockquantity': 'Current Stock',
    'reorderlevel': 'Reorder Level',
    'shortage': 'Shortage',
    'expirationdate': 'Expiration Date',
    'days_of_stock_remaining': 'Days of Stock Remaining',
    'branch_name': 'Branch',
  },
  'stock-turnover': {
    'name': 'Product Name',
    'category': 'Category',
    'unit': 'Unit',
    'daily_consumption_rate': 'Daily Consumption Rate',
    'days_of_stock_remaining': 'Days of Stock Remaining',
  },

  // Sales Reports
  'sales-pipeline': {
    'order_id': 'Order ID',
    'order_date': 'Date',
    'sale_date': 'Date',
    'branch_name': 'Branch',
    'product_name': 'Product',
    'quantity': 'Quantity',
    'unit_price': 'Unit Price',
    'subtotal': 'Subtotal',
    'discount': 'Discount',
    'net_sales': 'Net Sales',
    'status': 'Status',
  },
  'sales-performance': {
    'branch_name': 'Branch',
    'product_category': 'Category',
    'total_revenue': 'Total Revenue',
    'total_orders': 'Total Orders',
    'avg_order_value': 'Avg Order Value',
    'revenue_percentage': 'Revenue Share %',
  },
  'sales-monthly': {
    'year_month': 'Month',
    'branch_name': 'Branch',
    'total_revenue': 'Total Revenue',
    'total_orders': 'Total Orders',
    'avg_order_value': 'Avg Order Value',
  },
  'sales-weekly': {
    'week_start': 'Week Start',
    'week_end': 'Week End',
    'branch_name': 'Branch',
    'total_revenue': 'Total Revenue',
    'total_orders': 'Total Orders',
    'avg_order_value': 'Avg Order Value',
  },
  'sales-forecast': {
    'sale_date': 'Date',
    'net_sales': 'Actual Sales',
    'moving_avg_3d': '3-Day Moving Avg',
    'forecast_sales': 'Forecast',
  },

  // Employee Reports
  'employee-schedule': {
    'employee_name': 'Employee',
    'role': 'Position',
    'shift_date': 'Date',
    'start_time': 'Start Time',
    'end_time': 'End Time',
    'status': 'Status',
    'branch_name': 'Branch',
  },

  // Inventory Period Reports
  'inventory-monthly': {
    'year_month': 'Month',
    'branch_name': 'Branch',
    'product_name': 'Product',
    'category': 'Category',
    'unit': 'Unit',
    'total_quantity_used': 'Qty Used',
    'current_stock': 'Current Stock',
    'stock_status': 'Status',
  },
  'inventory-weekly': {
    'week_start': 'Week Start',
    'week_end': 'Week End',
    'branch_name': 'Branch',
    'product_name': 'Product',
    'category': 'Category',
    'unit': 'Unit',
    'total_quantity_used': 'Qty Used',
    'current_stock': 'Current Stock',
    'stock_status': 'Status',
  },

  // Consolidated Report
  'consolidated-report': {
    'branch_name': 'Branch',
    'total_revenue': 'Total Revenue',
    'total_orders': 'Total Orders',
    'avg_order_value': 'Avg Order Value',
    'total_products_sold': 'Products Sold',
    'top_product': 'Top Product',
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
      const transformed = {};
      for (const [key, value] of Object.entries(row)) {
        const label = formatColumnName(key);
        transformed[label] = value ?? '—';
      }
      return transformed;
    });
  }

  return rows.map(row => {
    const transformed = {};
    for (const [key, value] of Object.entries(row)) {
      const label = getColumnLabel(reportType, key);
      transformed[label] = value ?? '—';
    }
    return transformed;
  });
}

/**
 * Get ordered column headers for a report type
 */
export function getColumnOrder(reportType) {
  const orders = {
    'inventory-on-hand': ['Product Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Shortage', 'Status'],
    'inventory-aging': ['Product Name', 'Category', 'Unit', 'Current Stock', 'Expiration Date', 'Days Until Expiry', 'Urgency'],
    'low-inventory': ['Product Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Shortage', 'Days of Stock Remaining', 'Expiration Date', 'Branch'],
    'stock-turnover': ['Product Name', 'Category', 'Unit', 'Daily Consumption Rate', 'Days of Stock Remaining'],
    'sales-pipeline': ['Date', 'Branch', 'Order ID', 'Product', 'Quantity', 'Unit Price', 'Subtotal', 'Discount', 'Net Sales', 'Status'],
    'sales-performance': ['Branch', 'Category', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Revenue Share %'],
    'sales-monthly': ['Month', 'Branch', 'Total Orders', 'Total Revenue', 'Avg Order Value'],
    'sales-weekly': ['Week Start', 'Week End', 'Branch', 'Total Orders', 'Total Revenue', 'Avg Order Value'],
    'sales-forecast': ['Date', 'Actual Sales', '3-Day Moving Avg', 'Forecast'],
    'inventory-monthly': ['Month', 'Branch', 'Product', 'Category', 'Unit', 'Qty Used', 'Current Stock', 'Status'],
    'inventory-weekly': ['Week Start', 'Week End', 'Branch', 'Product', 'Category', 'Unit', 'Qty Used', 'Current Stock', 'Status'],
    'employee-schedule': ['Employee', 'Position', 'Date', 'Start Time', 'End Time', 'Status', 'Branch'],
    'consolidated-report': ['Branch', 'Total Revenue', 'Total Orders', 'Avg Order Value', 'Products Sold', 'Top Product'],
  };

  return orders[reportType] || [];
}
