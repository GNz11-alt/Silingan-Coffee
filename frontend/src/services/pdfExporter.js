import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { transformRowData } from './reportColumnMap.js';

pdfMake.vfs = pdfFonts;

// ─── Constants ─────────────────────────────────────────────────────────────
const DARK       = '#1A1A1A';
const MUTED      = '#6B7280';
const BORDER     = '#E5E0DD';

// ─── Shared Helpers ─────────────────────────────────────────────────────────
const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => Number(n || 0).toLocaleString('en-PH');
const pct = (n) => Number(n || 0).toFixed(1) + '%';
const fmtTimeRemaining = (days) => {
  if (days == null || days === 'N/A') return days || '—';
  if (isNaN(days)) return '—';
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

/**
 * Creates a KPI Summary Strip
 */
const kpiStrip = (kpis) => ({
  table: {
    widths: kpis.map(() => '*'),
    body: [
      kpis.map(k => ({
        stack: [
          { text: k.label.toUpperCase(), style: 'kpiLabel' },
          { text: String(k.value), style: 'kpiValue' },
          { text: k.sub || '', style: 'kpiSub' }
        ],
        margin: [5, 8, 5, 8],
        alignment: 'center'
      }))
    ]
  },
  layout: {
    hLineWidth: () => 1,
    vLineWidth: (i) => (i === 0 || i === kpis.length) ? 1 : 0.5,
    hLineColor: () => BORDER,
    vLineColor: () => BORDER,
  },
  margin: [0, 0, 0, 15]
});

/**
 * Creates a Section Header
 */
const sectionHeader = (text) => ({
  text: text,
  style: 'sectionHeader',
  margin: [0, 15, 0, 8]
});

/**
 * Creates a Note/Alert Box
 */
const noteBox = (text, type = 'info') => ({
  table: {
    widths: ['*'],
    body: [[{ text, style: 'noteText' }]]
  },
  layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
  margin: [0, 10, 0, 10]
});

// ─── Report Builders ────────────────────────────────────────────────────────

const BUILDERS = {
  'inventory-on-hand': (rows) => {
    const inStock = rows.filter(r => (r['Current Stock'] || r.stockquantity) > (r['Reorder Level'] || r.reorderlevel)).length;
    const low = rows.filter(r => (r['Current Stock'] || r.stockquantity) > 0 && (r['Current Stock'] || r.stockquantity) <= (r['Reorder Level'] || r.reorderlevel)).length;
    const out = rows.filter(r => (r['Current Stock'] || r.stockquantity) === 0).length;

    const kpis = [
      { label: 'Total Items', value: num(rows.length) },
      { label: 'In Stock', value: num(inStock) },
      { label: 'Low Stock', value: num(low) },
      { label: 'Out of Stock', value: num(out) }
    ];

    const headers = ['Product', 'Category', 'Current Stock', 'Reorder Level', 'Shortage', 'Status'];
    const body = rows.map(r => {
      const stock = r['Current Stock'] || r.stockquantity;
      const reorder = r['Reorder Level'] || r.reorderlevel;
      const shortage = stock < reorder ? reorder - stock : 0;
      const status = stock === 0 ? 'OUT OF STOCK' : stock <= reorder ? 'LOW STOCK' : 'In Stock';
      const unit = r['Unit'] || r.unit || '';
      const u = (v) => unit ? num(v) + ' ' + unit : num(v);
      return [
        { text: r['Product Name'] || r.productname || r.name, bold: stock === 0 || stock <= reorder },
        r['Category'] || r.category,
        { text: u(stock), alignment: 'right' },
        { text: u(reorder), alignment: 'right' },
        { text: shortage > 0 ? u(shortage) : '—', alignment: 'right' },
        { text: status, alignment: 'center', bold: true, color: status === 'OUT OF STOCK' ? '#DC2626' : status === 'LOW STOCK' ? '#D97706' : '#16A34A' }
      ];
    });

    return { 
      content: [
        kpiStrip(kpis),
        sectionHeader('Detailed Inventory Listing'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
        out > 0 ? noteBox(`⚠️ CRITICAL: ${out} item(s) are out of stock. Immediate restocking action required.`, 'danger') : ''
      ]
    };
  },

  'inventory-aging': (rows) => {
    const expired = rows.filter(r => {
      const d = r['Days Until Expiry'] || r.days_until_expiry;
      return d <= 0;
    }).length;
    const critical = rows.filter(r => {
      const d = r['Days Until Expiry'] || r.days_until_expiry;
      return d > 0 && d <= 3;
    }).length;

    const kpis = [
      { label: 'Total Items', value: num(rows.length) },
      { label: 'Expired', value: num(expired) },
      { label: 'Expiring Soon', value: num(critical) },
      { label: 'Safe', value: num(rows.length - expired - critical) }
    ];

    const headers = ['Product', 'Category', 'Current Stock', 'Exp. Date', 'Days Left', 'Status'];
    const body = rows.map(r => {
      const days = (() => {
        const d = r['Days Until Expiry'] ?? r.days_until_expiry;
        if (d != null) return d;
        if (r.expirationdate) return Math.ceil((new Date(r.expirationdate) - new Date()) / 86400000);
        return 'N/A';
      })();
      const status = days <= 0 ? 'EXPIRED' : days <= 3 ? 'CRITICAL' : 'OK';
      const unit = r['Unit'] || r.unit || '';
      const u = (v) => unit ? num(v) + ' ' + unit : num(v);
      return [
        { text: r['Product Name'] || r.productname || r.name, bold: status !== 'OK' },
        r['Category'] || r.category,
        { text: u(r['Current Stock'] || r.stockquantity), alignment: 'right' },
        r['Expiration Date'] || r.expirationdate,
        { text: fmtTimeRemaining(days), alignment: 'right', bold: days <= 3 },
        { text: status, alignment: 'center', bold: true }
      ];
    });

    return { 
      content: [
        kpiStrip(kpis),
        sectionHeader('Aging Analysis Detail'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
        expired > 0 ? noteBox(`⚠️ URGENT: ${expired} item(s) have expired. Remove from inventory immediately for compliance.`, 'danger') : ''
      ]
    };
  },

  'low-inventory': (rows) => {
    const urgent = rows.filter(r => (r['How Many We Have'] ?? r.we_have) === 0).length;
    const critical = rows.filter(r => {
      const d = r['Days Until Expiry'] ?? r.days_until_expiry ?? 'N/A';
      return d <= 3 && (r['How Many We Have'] ?? r.we_have) > 0;
    }).length;

    const kpis = [
      { label: 'Alert Items', value: num(rows.length) },
      { label: 'Out of Stock', value: num(urgent) },
      { label: 'Critical (≤3 days)', value: num(critical) },
    ];

    const headers = ['Product', 'Category', 'We Have', 'Min Safe', 'Need More', 'Days Left', 'Branch'];
    const body = rows.map(r => {
      const unit = r['Unit'] || r.unit || '';
      const u = (v) => unit ? num(v) + ' ' + unit : num(v);
      return [
        { text: r['Product Name'] || r.product_name || r['Product'], bold: true },
        r['Category'] || r.category,
        { text: u(r['How Many We Have'] ?? r.we_have ?? 0), alignment: 'right' },
        { text: u(r['Minimum Safe Amount'] ?? r.minimum_safe ?? 0), alignment: 'right' },
        { text: u(r['Need More'] ?? r.need_more ?? 0), alignment: 'right' },
        { text: fmtTimeRemaining(r['Days Until Expiry'] ?? r.days_until_expiry), alignment: 'right' },
        r['Branch'] || r.branch_name || '—'
      ];
    });

    return { 
      content: [
        kpiStrip(kpis),
        sectionHeader('Restocking Priority List'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto', '*'], body: [headers, ...body] }, layout: 'silingan' },
        noteBox(`Action Required: Reorder ${rows.length} item(s) to restore adequate inventory levels.`, urgent > 0 ? 'danger' : 'warning')
      ]
    };
  },

  'low-raw-materials': (rows) => {
    const urgent = rows.filter(r => (r['How Many We Have'] ?? r.we_have) === 0).length;
    const critical = rows.filter(r => {
      const d = r['Days Until Expiry'] ?? r.days_until_expiry ?? 'N/A';
      return d <= 3 && (r['How Many We Have'] ?? r.we_have) > 0;
    }).length;

    const kpis = [
      { label: 'Alert Items', value: num(rows.length) },
      { label: 'Out of Stock', value: num(urgent) },
      { label: 'Critical (≤3 days)', value: num(critical) },
    ];

    const headers = ['Raw Material', 'Category', 'We Have', 'Min Safe', 'Daily Usage', 'Lead Time', 'Suggested Order'];
    const body = rows.map(r => {
      const unit = r['Unit'] || r.unit || '';
      const u = (v) => unit ? num(v) + ' ' + unit : num(v);
      const safe = r['Minimum Safe Amount'] ?? r.minimum_safe ?? 0;
      const daily = r['Used Per Day (Average)'] ?? (r.daily_usage || safe / 14);
      const leadtime = r['Days to Arrive After Ordering'] ?? r.lead_time_days ?? r.leadtimedays ?? 7;
      const suggested = r['Suggested Order Amount'] ?? r.suggested_order ?? Math.ceil(Math.max(0, safe - (r['How Many We Have'] ?? r.we_have ?? 0)) * 1.2);
      return [
        { text: r['Raw Material'] || r.name || r['Product Name'], bold: true },
        r['Category'] || r.category,
        { text: u(r['How Many We Have'] ?? r.we_have ?? 0), alignment: 'right' },
        { text: u(safe), alignment: 'right' },
        { text: unit ? Number(daily).toFixed(2) + ' ' + unit : Number(daily).toFixed(2), alignment: 'right' },
        { text: leadtime + ' day(s)', alignment: 'center' },
        { text: u(suggested), alignment: 'right' },
      ];
    });

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Raw Materials Restocking Priority'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
        noteBox(`Immediate action recommended for ${urgent} out-of-stock raw material(s).`, urgent > 0 ? 'danger' : 'warning')
      ]
    };
  },

  'stock-turnover': (rows) => {
    const critical = rows.filter(r => {
      const d = r['Days of Stock Remaining'] ?? r.days_of_stock_remaining;
      const rate = r['Daily Consumption Rate'] ?? r.daily_consumption_rate ?? 0;
      return rate > 0 && d !== 'N/A' && d <= 3;
    }).length;
    const adequate = rows.length - critical;

    const kpis = [
      { label: 'Items Tracked', value: num(rows.length) },
      { label: 'Critical Stock', value: num(critical) },
      { label: 'Adequate Stock', value: num(adequate) },
    ];

    const headers = ['Product', 'Category', 'Daily Rate', 'Days Left', 'Stock Status'];
    const body = rows.map(r => {
      const rate = r['Daily Consumption Rate'] ?? r.daily_consumption_rate ?? 0;
      const days = r['Days of Stock Remaining'] ?? r.days_of_stock_remaining;
      const displayDays = rate > 0 ? days : 'N/A';
      const status = rate > 0 ? (days === 'N/A' ? 'N/A' : (days <= 3 ? 'CRITICAL' : 'ADEQUATE')) : 'N/A';
      const unit = r['Unit'] || r.unit || '';
      return [
        { text: r['Product Name'] || r.name, bold: status === 'CRITICAL' },
        r['Category'] || r.category,
        { text: Number(rate).toFixed(2) + (unit ? ' ' + unit : ''), alignment: 'right' },
        { text: rate > 0 ? fmtTimeRemaining(days) : 'N/A', alignment: 'right', bold: status === 'CRITICAL' },
        { text: status, alignment: 'center', bold: true }
      ];
    });

    return { 
      content: [
        kpiStrip(kpis),
        sectionHeader('Consumption Velocity Analysis'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-pipeline': (rows) => {
    const totalSales = rows.reduce((s, r) => s + Number(r['Net Sales'] || r.net_sales || 0), 0);
    const orderIds = new Set(rows.map(r => r['Order ID'] || r.order_id));
    const totalOrders = orderIds.size;
    const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;

    const kpis = [
      { label: 'Total Sales', value: peso(totalSales) },
      { label: 'Total Orders', value: num(totalOrders) },
      { label: 'Avg Order', value: peso(avgOrder) },
    ];

    const headers = ['Date', 'Order ID', 'Product', 'Qty', 'Unit Price', 'Subtotal', 'Net Sales', 'Status'];
    const body = rows.map(r => [
      r['Date'] || r.order_date || r.sale_date,
      { text: r['Order ID'] || r.order_id, alignment: 'center' },
      r['Product'] || r.product_name,
      { text: r['Quantity'] || r.quantity, alignment: 'right' },
      { text: peso(r['Unit Price'] || r.unit_price || 0), alignment: 'right' },
      { text: peso(r['Subtotal'] || r.subtotal || 0), alignment: 'right' },
      { text: peso(r['Net Sales'] || r.net_sales || 0), alignment: 'right', bold: true },
      { text: r['Status'] || r.status || 'Completed', alignment: 'center' }
    ]);

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Transaction Details'),
        { table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-performance': (rows) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows[0]?.total_distinct_orders || rows[0]?.['Total Distinct Orders'] || 0;
    const topBranch = rows.reduce((a, b) => (Number(b['Total Revenue'] || b.total_revenue || 0) > Number(a['Total Revenue'] || a.total_revenue || 0)) ? b : a);

    const kpis = [
      { label: 'Total Revenue', value: peso(totalRev) },
      { label: 'Total Orders', value: num(totalOrds) },
      { label: 'Top Branch', value: topBranch['Branch'] || topBranch.branch_name || '—' },
    ];

    const headers = ['Branch', 'Category', 'Orders', 'Revenue', 'Avg Order', 'Share %'];
    const body = rows.map(r => [
      { text: r['Branch'] || r.branch_name, bold: true },
      r['Category'] || r.product_category,
      { text: num(r['Total Orders'] || r.total_orders), alignment: 'right' },
      { text: peso(r['Total Revenue'] || r.total_revenue || 0), alignment: 'right' },
      { text: peso(r['Avg Order Value'] || r.avg_order_value || 0), alignment: 'right' },
      { text: totalRev > 0 ? pct((Number(r['Total Revenue'] || r.total_revenue || 0) / totalRev) * 100) : '0%', alignment: 'right' }
    ]);

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Performance Breakdown'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-summary': (rows, meta) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);
    const distinctPeriods = new Set(rows.map(r => r['Period'] || r.period_label));
    const count = distinctPeriods.size || rows.length;
    const sampleLabel = distinctPeriods.values().next().value || '';
    const isWeekly = sampleLabel.includes(' - ');
    const periodLabel = isWeekly ? 'Weekly' : 'Monthly';
    const avgLabel = count > 0 ? (isWeekly ? 'Avg Weekly' : 'Avg Monthly') : 'Total (Single Period)';

    const kpis = [
      { label: 'Total Revenue', value: peso(totalRev) },
      { label: 'Total Orders', value: num(totalOrds) },
      { label: avgLabel, value: count > 1 ? peso(totalRev / count) : peso(totalRev) },
    ];

    const headers = ['Period', 'Branch', 'Orders', 'Revenue', 'Avg Order'];
    const body = rows.map(r => [
      { text: r['Period'] || r.period_label, bold: true },
      r['Branch'] || r.branch_name,
      { text: num(r['Total Orders'] || r.total_orders), alignment: 'right' },
      { text: peso(r['Total Revenue'] || r.total_revenue || 0), alignment: 'right' },
      { text: peso(r['Avg Order Value'] || r.avg_order_value || 0), alignment: 'right' }
    ]);

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader(`${periodLabel} Performance Metrics`),
        { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'consolidated-report': (rows) => {
    const totalBranches = rows.length;
    const totalRevenue = rows.reduce((s, r) => s + Number(r['Total Revenue'] ?? r.total_revenue ?? 0), 0);
    const totalOrders = rows.reduce((s, r) => s + Number(r['Total Orders'] ?? r.total_orders ?? 0), 0);
    const totalProducts = rows.reduce((s, r) => s + Number(r['Products Sold'] ?? r.total_products_sold ?? 0), 0);

    const kpis = [
      { label: 'Total Branches', value: num(totalBranches) },
      { label: 'Total Revenue', value: peso(totalRevenue) },
      { label: 'Total Orders', value: num(totalOrders) },
      { label: 'Products Sold', value: num(totalProducts) },
    ];

    const headers = ['Branch', 'Total Revenue', 'Total Orders', 'Avg Order Value', 'Products Sold', 'Top Product'];
    const body = rows.map(r => [
      { text: r['Branch'] || r.branch_name || '—', bold: true },
      { text: peso(r['Total Revenue'] ?? r.total_revenue ?? 0), alignment: 'right' },
      { text: num(r['Total Orders'] ?? r.total_orders ?? 0), alignment: 'right' },
      { text: peso(r['Avg Order Value'] ?? r.avg_order_value ?? 0), alignment: 'right' },
      { text: num(r['Products Sold'] ?? r.total_products_sold ?? 0), alignment: 'right' },
      { text: r['Top Product'] || r.top_product || '—' },
    ]);

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Branch Performance Overview'),
        { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', '*'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'employee-schedule': (rows) => {
    const getHours = (r) => {
      const h = r['Hours Worked'] ?? r.hours;
      if (h != null) return Number(h);
      if (r.start_time && r.end_time) {
        const [sh, sm] = String(r.start_time).split(':').map(Number);
        const [eh, em] = String(r.end_time).split(':').map(Number);
        return ((eh || 0) - (sh || 0)) + ((em || 0) - (sm || 0)) / 60;
      }
      return 0;
    };
    const totalHours = rows.reduce((s, r) => s + getHours(r), 0);
    const employees = [...new Set(rows.map(r => r['Employee Name'] || r.employee_name || r.name))].length;
    const avgHours = totalHours / Math.max(employees, 1);

    const kpis = [
      { label: 'Total Employees', value: num(employees) },
      { label: 'Total Hours', value: totalHours.toFixed(0) },
      { label: 'Avg Hours/Employee', value: avgHours.toFixed(1) },
    ];

    const headers = ['Employee', 'Position', 'Shift Date', 'Hours', 'Status'];
    const body = rows.map(r => [
      { text: r['Employee Name'] || r.employee_name || r.name, bold: true },
      r['Position'] || r.position || r.role,
      r['Shift Date'] || r.shift_date || r.date,
      { text: getHours(r).toFixed(1), alignment: 'right' },
      { text: r['Status'] || r.status || 'Scheduled', alignment: 'center' }
    ]);

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Staff Schedule Detail'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'inventory-summary': (rows) => {
    const totalUsed = rows.reduce((s, r) => s + Number(r['Qty Used'] || r.total_quantity_used || 0), 0);
    const periods = [...new Set(rows.map(r => r['Period'] || r.period_label))].length;

    const kpis = [
      { label: 'Periods', value: num(periods) },
      { label: 'Total Units Used', value: num(totalUsed) },
      { label: 'Products Tracked', value: num(rows.length) },
    ];

    const headers = ['Period', 'Branch', 'Product', 'Category', 'Qty Used', 'Stock', 'Status'];
    const body = rows.map(r => {
      const unit = r['Unit'] || r.unit || '';
      const u = (v) => unit ? num(v) + ' ' + unit : num(v);
      return [
        { text: r['Period'] || r.period_label, bold: true },
        r['Branch'] || r.branch_name,
        r['Product'] || r.product_name,
        r['Category'] || r.category,
        { text: u(r['Qty Used'] || r.total_quantity_used || 0), alignment: 'right' },
        { text: u(r['Current Stock'] || r.current_stock), alignment: 'right' },
        { text: r['Status'] || r.stock_status || '—', alignment: 'center', bold: true }
      ];
    });

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Inventory Usage Summary'),
        { table: { headerRows: 1, widths: ['auto', 'auto', '*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-forecast': (rows) => {
    const forecastAccuracy = (actual, forecast) => {
      if (forecast <= 0) return 0;
      const denom = Math.max(actual, forecast);
      return Math.max(0, (1 - Math.abs(actual - forecast) / denom) * 100);
    };

    const validForecasts = rows.filter(r => {
      const forecast = Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0);
      const actual = Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0);
      return forecast > 0 || actual > 0;
    });
    
    const totalForecast = validForecasts.reduce((s, r) => s + Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0), 0);
    const totalActual = validForecasts.reduce((s, r) => s + Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0), 0);
    const accuracyRows = validForecasts.filter(r =>
        Number(r.forecast_sales || r['Forecast'] || 0) > 0
    );
    const totalDiff = accuracyRows.reduce((s, r) => {
        const f = Number(r.forecast_sales || r['Forecast'] || 0);
        const a = Number(r.net_sales || r['Actual Sales'] || 0);
        return s + Math.abs(a - f);
    }, 0);
    const totalActualFiltered = accuracyRows.reduce((s, r) =>
        s + Number(r.net_sales || r['Actual Sales'] || 0), 0
    );
    const accuracy = totalActualFiltered > 0
        ? Math.max(0, (1 - totalDiff / totalActualFiltered) * 100)
        : 0;

    const kpis = [
      { label: 'Forecasted Revenue', value: peso(totalForecast) },
      { label: 'Actual Revenue', value: peso(totalActual) },
      { label: 'Accuracy', value: accuracy.toFixed(1) + '%' },
    ];

    const headers = ['Date', 'Actual Sales', '3-Day Moving Avg', 'Forecast', 'Accuracy %'];
    const body = validForecasts.map(r => {
      const forecast = Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0);
      const actual = Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0);
      const movAvg = Number(r.moving_avg_3d || r['3-Day Moving Avg'] || 0);
      const acc = forecastAccuracy(actual, forecast);
      return [
        { text: r.sale_date || r['Date'] || '', bold: true },
        { text: peso(actual), alignment: 'right' },
        { text: peso(movAvg), alignment: 'right' },
        forecast > 0
          ? { text: peso(forecast), alignment: 'right' }
          : { text: 'N/A—no prior data', alignment: 'right', color: '#6B7280' },
        forecast > 0
          ? { text: acc.toFixed(1) + '%', alignment: 'right', bold: true, color: acc >= 80 ? '#16A34A' : acc >= 50 ? '#D97706' : '#DC2626' }
          : { text: 'N/A', alignment: 'right', color: '#6B7280' }
      ];
    });

    return {
      content: [
        kpiStrip(kpis),
        sectionHeader('Forecast vs. Actual Detail'),
        { table: { headerRows: 1, widths: ['auto', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },
};

// ─── Main Export Function ───────────────────────────────────────────────────

export function exportPDF(reportType, rows, meta) {
  // 1. Determine Builder and prepare document content
  const builder = BUILDERS[reportType];
  let reportConfig;

  if (builder) {
    reportConfig = builder(rows, meta);
  } else {
    // Fallback: Generic table from transformed data
    const transformedRows = transformRowData(reportType, rows);
    const headers = transformedRows.length > 0 ? Object.keys(transformedRows[0]) : [];
    const body = transformedRows.map(row => Object.values(row).map(v => {
      if (v === null || v === undefined) return '—';
      if (typeof v === 'number') return num(v);
      return String(v);
    }));
    reportConfig = {
      content: [
        { table: { headerRows: 1, widths: headers.map(() => '*'), body: [headers, ...body] }, layout: 'silingan' }
      ]
    };
  }

  // 2. Build content array
  const contentArray = Array.isArray(reportConfig.content) ? reportConfig.content : [reportConfig.content];
  
  // Prepend a Report Summary header
  contentArray.unshift({ text: 'Report Summary', style: 'sectionHeader', alignment: 'center', margin: [0, 0, 0, 12] });
  
  // 3. Build the document
  const isWide = rows.length > 0 && Object.keys(rows[0]).length > 7;

  const docDefinition = {
    pageOrientation: isWide ? 'landscape' : 'portrait',
    pageSize: 'A4',
    pageMargins: [40, 110, 40, 60],

    // Fixed Header
    header: (currentPage) => ({
      stack: [
        {
          canvas: [{ type: 'line', x1: 40, y1: 20, x2: isWide ? 802 : 555, y2: 20, lineWidth: 2, lineColor: DARK }]
        },
        {
          margin: [40, 20, 40, 8],
          columns: [
            { 
              text: 'Silingan Coffee', 
              fontSize: 14, 
              bold: true, 
              color: DARK,
            },
            { 
              text: meta.title.toUpperCase(), 
              fontSize: 9, 
              color: MUTED, 
              alignment: 'right',
              margin: [0, 3, 0, 0]
            }
          ]
        },
        {
          canvas: [{ type: 'line', x1: 40, y1: 0, x2: isWide ? 802 : 555, y2: 0, lineWidth: 0.5, lineColor: BORDER }],
          margin: [0, 0, 0, 8]
        },
        {
          margin: [40, 0, 40, 0],
          text: `${meta.dateFrom} – ${meta.dateTo}  •  Branch: ${meta.branch || 'All'}  •  Generated: ${new Date().toLocaleDateString('en-PH')}  •  By: ${meta.generatedBy || 'System'}`,
          style: 'metaText',
          fontSize: 7.5
        }
      ]
    }),

    // Footer
    footer: (currentPage, pageCount) => ({
      stack: [
        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: isWide ? 802 : 555, y2: 0, lineWidth: 0.5, lineColor: BORDER }] },
        {
          columns: [
            { text: 'Silingan Coffee • CONFIDENTIAL — Internal Use Only', style: 'footerText' },
            { text: `Page ${currentPage} of ${pageCount}`, style: 'footerText', alignment: 'right' }
          ],
          margin: [40, 8, 40, 0]
        }
      ]
    }),

    content: contentArray,

    styles: {
      sectionHeader: { fontSize: 11, bold: true, color: DARK, margin: [0, 10, 0, 6] },
      kpiLabel: { fontSize: 7.5, color: MUTED, bold: true, margin: [0, 0, 0, 3] },
      kpiValue: { fontSize: 14, bold: true, margin: [0, 2, 0, 0] },
      kpiSub: { fontSize: 6.5, color: MUTED },
      metaText: { fontSize: 7.5, color: MUTED },
      footerText: { fontSize: 7, color: MUTED },
      noteText: { fontSize: 8, italic: true },
      tableHeader: { fontSize: 8.5, bold: true, color: DARK, margin: [4, 4, 4, 4] },
    },

    defaultStyle: {
      fontSize: 8.5,
      color: DARK,
      lineHeight: 1.4
    }
  };

  // 4. Define Custom Table Layout
  pdfMake.tableLayouts = {
    silingan: {
      hLineWidth: (i, node) => {
        if (i === 0 || i === node.table.body.length) return 1.5;
        return 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: () => BORDER,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
      fillColor: () => null
    }
  };

  // 5. Style table headers
  contentArray.forEach(item => {
    if (item && item.table && item.table.body) {
      item.table.body[0] = item.table.body[0].map(h => 
        (typeof h === 'string') 
          ? { text: h, style: 'tableHeader' } 
          : { ...h, style: 'tableHeader' }
      );
    }
  });

  // 6. Generate and download
  const pdfDoc = pdfMake.createPdf(docDefinition);
  const filename = `silingan-${reportType.replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdfDoc.download(filename);
  return pdfDoc.getBlob();
}