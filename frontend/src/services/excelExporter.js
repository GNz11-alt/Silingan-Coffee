import ExcelJS from 'exceljs';
import { getColumnOrder, transformRowData } from './reportColumnMap.js';

// ─── Brand Constants ────────────────────────────────────────────────────────
const BRAND_RED = '7B1D1D'; // #7B1D1D
const BRAND_ACCENT = 'A83232';
const PALE_BG  = 'F9F4F3'; // #F9F4F3
const WHITE     = 'FFFFFF';
const GRAY      = '6B7280';
const LIGHT_GRAY = 'F3F4F6';
const CURRENCY_FMT = '"₱"#,##0.00';
const PERCENT_FMT  = '0.0%';
const NUMBER_FMT = '#,##0';

const fmtTimeRemaining = (days) => {
  if (days == null || isNaN(days)) return '—';
  const totalMin = Math.round(Number(days) * 24 * 60);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.length > 0 ? parts.join(' ') : '0m';
};

// ─── Report Builders — Comprehensive formatting for all report types ──────
// These functions transform raw data into well-formatted rows for Excel
const BUILDERS = {
  'inventory-on-hand': (rows) => {
    const headers = ['Product Name', 'Category', 'Unit', 'Current Stock', 'Reorder Level', 'Shortage', 'Status'];
    const data = rows.map(r => [
      r['Product Name'] || r.productname || r.name,
      r['Category'] || r.category,
      r['Unit'] || r.unit,
      r['Current Stock'] || r.stockquantity,
      r['Reorder Level'] || r.reorderlevel,
      r['Shortage'] || (Math.max(0, (r['Reorder Level'] || r.reorderlevel) - (r['Current Stock'] || r.stockquantity))),
      r['Status'] || (r.stockquantity === 0 ? 'Out of Stock' : (r.stockquantity || 0) <= (r.reorderlevel || 0) ? 'Low Stock' : 'In Stock'),
    ]);
    const totals = ['TOTAL', '', '', rows.reduce((s, r) => s + (r['Current Stock'] || r.stockquantity || 0), 0), '', '', ''];
    return { headers, data, totals, colWidths: [28, 18, 10, 14, 14, 12, 14], numericCols: [3, 4, 5] };
  },

  'inventory-aging': (rows) => {
    const headers = ['Product Name', 'Category', 'Unit', 'Current Stock', 'Expiration Date', 'Days Until Expiry', 'Urgency'];
    const data = rows.map(r => [
      r['Product Name'] || r.productname || r.name,
      r['Category'] || r.category,
      r['Unit'] || r.unit,
      r['Current Stock'] || r.stockquantity,
      r['Expiration Date'] || r.expirationdate,
      fmtTimeRemaining(r['Days Until Expiry'] ?? r.days_until_expiry),
      r['Urgency'] || r.urgency,
    ]);
    return { headers, data, colWidths: [28, 18, 10, 14, 16, 16, 14], numericCols: [3] };
  },

  'low-inventory': (rows) => {
    const headers = ['Product Name', 'Category', 'Current Stock', 'Reorder Level', 'Shortage', 'Days of Stock', 'Expiration Date', 'Branch'];
    const data = rows.map(r => [
      r['Product Name'] || r.name,
      r['Category'] || r.category,
      r['Current Stock'] || r.stockquantity,
      r['Reorder Level'] || r.reorderlevel,
      r['Shortage'] || (Math.max(0, (r['Reorder Level'] || r.reorderlevel) - (r['Current Stock'] || r.stockquantity))),
      fmtTimeRemaining(r['Days of Stock Remaining'] ?? r.days_of_stock_remaining),
      r['Expiration Date'] || r.expirationdate || 'N/A',
      r['Branch'] || r.branch_name || 'All',
    ]);
    return { headers, data, colWidths: [26, 16, 14, 14, 12, 14, 16, 16], numericCols: [2, 3, 4] };
  },

  'stock-turnover': (rows) => {
    const headers = ['Product Name', 'Category', 'Unit', 'Daily Consumption', 'Days of Stock', 'Stock Status'];
    const data = rows.map(r => [
      r['Product Name'] || r.name,
      r['Category'] || r.category,
      r['Unit'] || r.unit,
      Number(r['Daily Consumption Rate'] || r.daily_consumption_rate || 0).toFixed(2),
      fmtTimeRemaining(r['Days of Stock Remaining'] ?? r.days_of_stock_remaining),
      (r['Days of Stock Remaining'] ?? r.days_of_stock_remaining) <= 3 ? 'Critical' : 'Adequate',
    ]);
    return { headers, data, colWidths: [26, 16, 10, 16, 14, 14], numericCols: [3, 4] };
  },

  'sales-pipeline': (rows) => {
    const headers = ['Date', 'Branch', 'Order ID', 'Product', 'Quantity', 'Unit Price', 'Subtotal', 'Discount', 'Net Sales', 'Status'];
    const data = rows.map(r => [
      r['Date'] || r.order_date || r.sale_date,
      r['Branch'] || r.branch_name || '—',
      r['Order ID'] || r.order_id,
      r['Product'] || r.product_name,
      r['Quantity'] || r.quantity,
      Number(r['Unit Price'] || r.unit_price || 0),
      Number(r['Subtotal'] || r.subtotal || 0),
      Number(r['Discount'] || r.discount || 0),
      Number(r['Net Sales'] || r.subtotal || 0) - Number(r['Discount'] || r.discount || 0),
      r['Status'] || r.status || 'Completed',
    ]);
    const totals = ['', '', '', '', rows.reduce((s, r) => s + (r['Quantity'] || r.quantity || 0), 0), '', 
                   rows.reduce((s, r) => s + Number(r['Subtotal'] || r.subtotal || 0), 0),
                   rows.reduce((s, r) => s + Number(r['Discount'] || r.discount || 0), 0),
                   rows.reduce((s, r) => s + (Number(r['Subtotal'] || r.subtotal || 0) - Number(r['Discount'] || r.discount || 0)), 0), ''];
    return { headers, data, totals, colWidths: [14, 18, 12, 28, 12, 12, 14, 12, 14, 12], numericCols: [4, 5, 6, 7, 8], formats: { F: CURRENCY_FMT, G: CURRENCY_FMT, H: CURRENCY_FMT, I: CURRENCY_FMT } };
  },

  'sales-performance': (rows) => {
    const headers = ['Branch', 'Category', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Revenue Share %'];
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const data = rows.map(r => [
      r['Branch'] || r.branch_name,
      r['Category'] || r.product_category,
      r['Total Orders'] || r.total_orders,
      Number(r['Total Revenue'] || r.total_revenue || 0),
      Number(r['Avg Order Value'] || r.avg_order_value || 0),
      totalRev > 0 ? (Number(r['Total Revenue'] || r.total_revenue || 0) / totalRev) : 0
    ]);
    const totals = ['TOTAL', '—', rows.reduce((s, r) => s + (r['Total Orders'] || r.total_orders || 0), 0), totalRev, totalRev > 0 ? totalRev / rows.length : 0, 1];
    return { headers, data, totals, colWidths: [22, 18, 14, 16, 16, 14], numericCols: [2, 3, 4, 5], formats: { D: CURRENCY_FMT, E: CURRENCY_FMT, F: PERCENT_FMT } };
  },

  'sales-monthly': (rows) => {
    const headers = ['Month', 'Branch', 'Total Orders', 'Total Revenue', 'Avg Order Value'];
    const data = rows.map(r => [
      r['Month'] || r.year_month,
      r['Branch'] || r.branch_name,
      r['Total Orders'] || r.total_orders,
      Number(r['Total Revenue'] || r.total_revenue || 0),
      Number(r['Avg Order Value'] || r.avg_order_value || 0),
    ]);
    return { headers, data, colWidths: [14, 20, 14, 16, 16], numericCols: [2, 3, 4], formats: { D: CURRENCY_FMT, E: CURRENCY_FMT } };
  },

  'sales-weekly': (rows) => {
    const headers = ['Week Start', 'Week End', 'Branch', 'Total Orders', 'Total Revenue', 'Avg Order Value'];
    const data = rows.map(r => [
      r['Week Start'] || r.week_start,
      r['Week End'] || r.week_end,
      r['Branch'] || r.branch_name,
      r['Total Orders'] || r.total_orders,
      Number(r['Total Revenue'] || r.total_revenue || 0),
      Number(r['Avg Order Value'] || r.avg_order_value || 0),
    ]);
    return { headers, data, colWidths: [14, 14, 20, 14, 16, 16], numericCols: [3, 4, 5], formats: { E: CURRENCY_FMT, F: CURRENCY_FMT } };
  },

  'sales-forecast': (rows) => {
    const headers = ['Date', 'Actual Sales', '3-Day Moving Avg', 'Forecast'];
    const data = rows.map(r => [
      r['Date'] || r.sale_date,
      Number(r['Actual Sales'] || r.net_sales || 0),
      Number(r['3-Day Moving Avg'] || r.moving_avg_3d || 0),
      Number(r['Forecast'] || r.forecast_sales || 0),
    ]);
    return { headers, data, colWidths: [14, 16, 18, 16], numericCols: [1, 2, 3], formats: { B: CURRENCY_FMT, C: CURRENCY_FMT, D: CURRENCY_FMT } };
  },

  'employee-schedule': (rows) => {
    const headers = ['Employee', 'Position', 'Date', 'Start Time', 'End Time', 'Status', 'Branch'];
    const data = rows.map(r => [
      r['Employee'] || r.employee_name,
      r['Position'] || r.role,
      r['Date'] || r.shift_date,
      r['Start Time'] || r.start_time,
      r['End Time'] || r.end_time,
      r['Status'] || r.status,
      r['Branch'] || r.branch_name,
    ]);
    return { headers, data, colWidths: [22, 16, 14, 12, 12, 12, 16] };
  },

  'inventory-monthly': (rows) => {
    const headers = ['Month', 'Branch', 'Product', 'Category', 'Unit', 'Qty Used', 'Current Stock', 'Status'];
    const data = rows.map(r => [
      r['Month'] || r.year_month,
      r['Branch'] || r.branch_name,
      r['Product'] || r.product_name,
      r['Category'] || r.category,
      r['Unit'] || r.unit,
      Number(r['Qty Used'] || r.total_quantity_used || 0),
      r['Current Stock'] || r.current_stock,
      r['Status'] || r.stock_status || 'In Stock',
    ]);
    return { headers, data, colWidths: [14, 18, 24, 14, 10, 14, 14, 14], numericCols: [5, 6] };
  },

  'inventory-weekly': (rows) => {
    const headers = ['Week Start', 'Week End', 'Branch', 'Product', 'Category', 'Unit', 'Qty Used', 'Current Stock', 'Status'];
    const data = rows.map(r => [
      r['Week Start'] || r.week_start,
      r['Week End'] || r.week_end,
      r['Branch'] || r.branch_name,
      r['Product'] || r.product_name,
      r['Category'] || r.category,
      r['Unit'] || r.unit,
      Number(r['Qty Used'] || r.total_quantity_used || 0),
      r['Current Stock'] || r.current_stock,
      r['Status'] || r.stock_status || 'In Stock',
    ]);
    return { headers, data, colWidths: [14, 14, 18, 24, 14, 10, 14, 14, 14], numericCols: [6, 7] };
  },

  'consolidated-report': (rows) => {
    const headers = ['Branch', 'Total Revenue', 'Total Orders', 'Avg Order Value', 'Products Sold', 'Top Product'];
    const data = rows.map(r => [
      r['Branch'] || r.branch_name,
      Number(r['Total Revenue'] || r.total_revenue || 0),
      r['Total Orders'] || r.total_orders,
      Number(r['Avg Order Value'] || r.avg_order_value || 0),
      r['Products Sold'] || r.total_products_sold,
      r['Top Product'] || r.top_product || '—',
    ]);
    return { headers, data, colWidths: [20, 16, 14, 16, 14, 24], numericCols: [1, 2, 3, 4], formats: { B: CURRENCY_FMT, D: CURRENCY_FMT } };
  },
};

/**
 * Main Export Function
 */
export async function exportExcel(reportType, rows, meta) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.generatedBy || 'Silingan Admin';
  
  const mainSheet = workbook.addWorksheet('Report Data');
  const summarySheet = workbook.addWorksheet('Summary');

  // 1. Prepare Data using specific builder or fallback
  const builder = BUILDERS[reportType];
  let reportConfig;

  if (builder) {
    reportConfig = builder(rows, meta);
  } else {
    // Fallback: Use column mapping if builder doesn't exist
    const transformedRows = transformRowData(reportType, rows);
    const headers = transformedRows.length > 0 ? Object.keys(transformedRows[0]) : ['No Data'];
    const data = transformedRows.map(row => Object.values(row));
    reportConfig = { headers, data, colWidths: headers.map(() => 20) };
  }

  // 2. Build Meta Header on Main Sheet
  const titleRow1 = mainSheet.addRow(['Silingan Coffee']);
  const titleRow2 = mainSheet.addRow([meta.title]);
  const dateRow = mainSheet.addRow([`Period: ${meta.dateFrom} to ${meta.dateTo}`]);
  const metaRow = mainSheet.addRow([`Branch: ${meta.branch || 'All Branches'} | Generated: ${new Date().toLocaleDateString('en-PH')} by ${meta.generatedBy || 'Admin'}`]);
  mainSheet.addRow([]); // Gap

  // Style the Title
  titleRow1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF' + BRAND_RED } };
  titleRow2.font = { size: 13, bold: true, color: { argb: 'FF' + BRAND_ACCENT } };
  dateRow.font = { size: 10, color: { argb: 'FF' + GRAY } };
  metaRow.font = { size: 9, color: { argb: 'FF' + GRAY }, italic: true };

  // 3. Add Table Headers
  const headerRow = mainSheet.addRow(reportConfig.headers);
  headerRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_RED } };
    cell.font = { color: { argb: 'FF' + WHITE }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }
    };
  });

  // 4. Add Data Rows with Formatting
  reportConfig.data.forEach((rowData, index) => {
    const row = mainSheet.addRow(rowData);
    
    // Zebra Striping
    row.eachCell((cell, colNum) => {
      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + PALE_BG } };
      }
      
      // Apply numeric formatting
      if (reportConfig.numericCols && reportConfig.numericCols.includes(colNum - 1)) {
        const colLetter = String.fromCharCode(64 + colNum);
        if (reportConfig.formats && reportConfig.formats[colLetter]) {
          cell.numFmt = reportConfig.formats[colLetter];
        } else if (typeof rowData[colNum - 1] === 'number') {
          cell.numFmt = NUMBER_FMT;
        }
      }
      
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFF0F0F0' } }
      };
    });
  });

  // 5. Add Totals Row (if applicable)
  if (reportConfig.totals) {
    mainSheet.addRow([]); // Gap before totals
    const totalRow = mainSheet.addRow(reportConfig.totals);
    totalRow.font = { bold: true, size: 11 };
    totalRow.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = { 
        top: { style: 'medium', color: { argb: 'FF' + GRAY } },
        bottom: { style: 'medium', color: { argb: 'FF' + GRAY } }
      };
      
      // Apply formatting to totals
      if (reportConfig.numericCols && reportConfig.numericCols.includes(colNum - 1)) {
        const colLetter = String.fromCharCode(64 + colNum);
        if (reportConfig.formats && reportConfig.formats[colLetter]) {
          cell.numFmt = reportConfig.formats[colLetter];
        } else if (typeof reportConfig.totals[colNum - 1] === 'number') {
          cell.numFmt = NUMBER_FMT;
        }
      }
    });
  }

  // 6. Apply Column Widths and Formats
  mainSheet.columns.forEach((column, colIndex) => {
    if (reportConfig.colWidths && reportConfig.colWidths[colIndex]) {
      column.width = reportConfig.colWidths[colIndex];
    } else {
      column.width = 20;
    }
  });

  // 7. Freeze Panes
  mainSheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 6 }];

  // 8. Build Summary Sheet
  buildSummarySheet(summarySheet, reportType, reportConfig, rows, meta);

  // 9. Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `silingan-${reportType.replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
  return buffer;
}

/**
 * Build Summary Sheet with Key Metrics
 */
function buildSummarySheet(sheet, reportType, config, rows, meta) {
  sheet.columns = [{ width: 28 }, { width: 45 }];

  // Title
  const titleRow = sheet.addRow(['REPORT SUMMARY']);
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_RED } };
  sheet.addRow([]);

  // Key Info
  const infoRows = [
    ['Report Type', getReportTypeLabel(reportType)],
    ['Report Name', meta.title],
    ['Period', `${meta.dateFrom} — ${meta.dateTo}`],
    ['Branch', meta.branch || 'All Branches'],
    ['Generated On', new Date().toLocaleString('en-PH')],
    ['Generated By', meta.generatedBy || 'System'],
    ['Total Records', rows.length],
  ];

  infoRows.forEach(row => {
    const r = sheet.addRow(row);
    r.getCell(1).font = { bold: true, color: { argb: 'FF' + BRAND_RED } };
    r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + LIGHT_GRAY } };
  });

  sheet.addRow([]);
  sheet.addRow(['Data Quality Notice']);
  sheet.addRow(['This report contains confidential business information intended for authorized users only.']);
  sheet.addRow(['Data is accurate as of the generation date. For discrepancies, consult your system administrator.']);
}

/**
 * Get Human-Readable Report Type Label
 */
function getReportTypeLabel(reportType) {
  const labels = {
    'inventory-on-hand': 'Inventory On-Hand',
    'inventory-aging': 'Inventory Aging',
    'low-inventory': 'Low Inventory Alert',
    'stock-turnover': 'Stock Turnover Analysis',
    'inventory-monthly': 'Inventory Monthly Summary',
    'inventory-weekly': 'Inventory Weekly Summary',
    'sales-pipeline': 'Sales Pipeline',
    'sales-performance': 'Sales Performance',
    'sales-monthly': 'Monthly Sales Report',
    'sales-weekly': 'Weekly Sales Report',
    'sales-forecast': 'Sales Forecast',
    'employee-schedule': 'Employee Schedule',
    'consolidated-report': 'Consolidated Report',
  };
  return labels[reportType] || reportType;
}