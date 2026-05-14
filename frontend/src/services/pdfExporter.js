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

// ─── Analysis Generators — Comprehensive Narrative Summaries ────────────────

function analyzeInventoryOnHand(rows) {
  const inStock = rows.filter(r => (r['Current Stock'] || r.stockquantity) > (r['Reorder Level'] || r.reorderlevel)).length;
  const low = rows.filter(r => (r['Current Stock'] || r.stockquantity) > 0 && (r['Current Stock'] || r.stockquantity) <= (r['Reorder Level'] || r.reorderlevel)).length;
  const out = rows.filter(r => (r['Current Stock'] || r.stockquantity) === 0).length;
  const totalStock = rows.reduce((s, r) => s + (r['Current Stock'] || r.stockquantity || 0), 0);
  const avgStock = totalStock / Math.max(rows.length, 1);
  
  const healthScore = rows.length > 0 ? (inStock / rows.length * 100) : 0;
  
  return `
INVENTORY OVERVIEW & ANALYSIS

This report provides a comprehensive snapshot of your current inventory across all tracked products. The inventory is categorized into three operational states to help guide purchasing and production decisions.

CURRENT STATUS SUMMARY:
Your inventory contains ${num(rows.length)} tracked items with a total of ${num(totalStock)} units in stock. The average stock level per item is ${num(avgStock.toFixed(0))} units. Currently, ${inStock} item(s) (${(inStock/rows.length*100).toFixed(1)}%) are in adequate supply above reorder thresholds, ${low} item(s) (${(low/rows.length*100).toFixed(1)}%) have fallen below minimum thresholds, and ${out} item(s) (${(out/rows.length*100).toFixed(1)}%) are completely depleted.

INVENTORY HEALTH ASSESSMENT:
Your inventory health score is ${healthScore.toFixed(1)}%, which indicates the percentage of items currently maintained at optimal levels. ${out > 0 ? `The presence of ${out} out-of-stock item(s) represents an immediate operational risk that must be addressed to prevent service disruption and lost revenue opportunities.` : 'This healthy status indicates strong inventory management practices.'}

KEY CONCERNS & RECOMMENDATIONS:
${low > 0 ? `Low stock conditions affect ${low} item(s), suggesting these materials are being consumed faster than expected or replenishment has been delayed. Review consumption rates and establish expedited reordering processes for these items to prevent stockouts.` : 'All items requiring replenishment are currently within acceptable safety margins.'}
${out > 0 ? `Out-of-stock items require immediate action. Identify alternative sourcing options or expedited delivery terms to restore availability as quickly as possible.` : ''}

OPERATIONAL IMPACT:
Maintaining adequate inventory levels is critical to meeting customer demand, fulfilling production schedules, and avoiding operational bottlenecks. Items below reorder levels should trigger purchasing actions immediately.
`;
}

function analyzeInventoryAging(rows) {
  const getDays = (r) => {
    const d = r['Days Until Expiry'] ?? r.days_until_expiry;
    if (d != null) return d;
    if (r.expirationdate) return Math.ceil((new Date(r.expirationdate) - new Date()) / 86400000);
    return 9999;
  };
  const expired = rows.filter(r => getDays(r) <= 0).length;
  const critical = rows.filter(r => getDays(r) > 0 && getDays(r) <= 3).length;
  const warning = rows.filter(r => getDays(r) > 3 && getDays(r) <= 7).length;
  const safe = rows.filter(r => getDays(r) > 7).length;
  
  const wastageRiskValue = (expired + critical + warning) * 100 / Math.max(rows.length, 1);
  
  return `
INVENTORY AGING ANALYSIS & SPOILAGE RISK ASSESSMENT

This report monitors the age profile of your inventory, specifically tracking items approaching or past their expiration dates. Managing perishable inventory aging is critical to minimizing waste, maintaining food safety compliance, and protecting profitability.

EXPIRATION STATUS BREAKDOWN:
Your inventory includes ${num(rows.length)} items with tracked expiration dates. Of these: ${expired} item(s) (${(expired/rows.length*100).toFixed(1)}%) have already expired and must be removed from service immediately, ${critical} item(s) (${(critical/rows.length*100).toFixed(1)}%) will expire within 3 days and require urgent use or disposal, ${warning} item(s) (${(warning/rows.length*100).toFixed(1)}%) are approaching expiration within 7 days and should be prioritized in production, and ${safe} item(s) (${(safe/rows.length*100).toFixed(1)}%) have adequate shelf life remaining.

WASTE PREVENTION ANALYSIS:
Your current spoilage risk score is ${wastageRiskValue.toFixed(1)}%, representing the percentage of inventory at risk of loss due to expiration. ${expired > 0 ? `Expired inventory (${expired} item(s)) represents direct financial loss and must be disposed of immediately to maintain health and safety compliance.` : 'No expired items currently in inventory.'} ${critical + warning > 0 ? `A total of ${critical + warning} item(s) require action within the next week to prevent spoilage.` : ''}

OPERATIONAL RECOMMENDATIONS:
${expired > 0 ? '1. IMMEDIATE: Remove all expired items from inventory and document disposal for compliance records.' : ''}
${critical > 0 ? `2. URGENT: Prioritize the use of ${critical} critical-stage item(s) in production within the next 24-48 hours to prevent loss.` : ''}
${warning > 0 ? `3. HIGH PRIORITY: Incorporate ${warning} warning-stage item(s) into meal planning and menu offerings to maximize consumption before expiration.` : ''}
4. ONGOING: Implement FIFO (First In, First Out) inventory rotation practices to minimize aging and spoilage.

FINANCIAL IMPACT:
Inventory spoilage directly reduces profit margins and increases food costs. Proactive management of aging inventory can yield significant cost savings and maintain operational efficiency.
`;
}

function analyzeLowInventory(rows) {
  const getDays = (r) => r['Days of Stock Remaining'] ?? r.days_of_stock_remaining ?? r.days_until_expiry ?? 0;
  const urgent = rows.filter(r => (r['Current Stock'] || r.stockquantity) === 0).length;
  const critical = rows.filter(r => getDays(r) <= 3 && (r['Current Stock'] || r.stockquantity) > 0).length;
  const avgShortage = rows.reduce((s, r) => s + (r['Shortage'] || 0), 0) / Math.max(rows.length, 1);
  
  return `
LOW INVENTORY ALERT REPORT & PROCUREMENT ANALYSIS

This report identifies all inventory items that have fallen below their established minimum stock thresholds (reorder levels). These items represent immediate purchasing priorities to prevent production delays and stockouts.

ALERT SUMMARY & URGENCY CLASSIFICATION:
${num(rows.length)} item(s) currently require restocking action. Of these urgent items, ${urgent} item(s) (${(urgent/rows.length*100).toFixed(1)}%) are completely out of stock and represent critical supply gaps, while ${critical} item(s) (${(critical/rows.length*100).toFixed(1)}%) have fewer than 3 days of stock remaining at current consumption rates. The average shortage across all alert items is ${num(avgShortage.toFixed(0))} units, indicating substantial replenishment requirements.

CONSUMPTION RATE IMPACT:
The "Days of Stock Remaining" metric combines current inventory quantity with your historical consumption velocity to project when each item will be depleted. Items showing 3 or fewer days of remaining stock face imminent stockout risk if consumption continues at current rates. This time window is often insufficient for standard supplier delivery cycles, making immediate action essential.

PROCUREMENT STRATEGY:
1. IMMEDIATE ACTION: Contact suppliers for ${urgent} out-of-stock item(s) to arrange emergency delivery if possible, or identify alternative sources.
2. EXPEDITED ORDERING: Place priority orders for items with less than 3 days of stock, requesting accelerated delivery if available at reasonable cost premium.
3. CONSUMPTION ADJUSTMENTS: Review production schedules and menu offerings to reduce consumption of items in critical status until replenishment arrives.
4. SUPPLIER COMMUNICATION: Alert suppliers of upcoming reorder activity to ensure adequate stock availability and confirm delivery timelines.

RISK MITIGATION:
Delayed restocking of these items could result in production halts, inability to fulfill customer orders, emergency purchasing at premium rates, or loss of competitive advantage. Swift action on these reorder recommendations is essential to operational continuity.
`;
}

function analyzeStockTurnover(rows) {
  const critical = rows.filter(r => (r['Days of Stock Remaining'] || r.days_of_stock_remaining) <= 3).length;
  const adequate = rows.length - critical;
  const avgDailyCons = rows.reduce((s, r) => s + Number(r['Daily Consumption Rate'] || r.daily_consumption_rate || 0), 0) / Math.max(rows.length, 1);
  const slowMovers = rows.filter(r => Number(r['Daily Consumption Rate'] || r.daily_consumption_rate || 0) < 0.5).length;
  
  return `
STOCK TURNOVER ANALYSIS & CONSUMPTION VELOCITY REPORT

This report analyzes the consumption rate and stock depletion timeline for your inventory items. Understanding turnover velocity is crucial for optimizing inventory levels, minimizing holding costs, and preventing both stockouts and excess accumulation.

TURNOVER PERFORMANCE OVERVIEW:
Your ${num(rows.length)} inventory items are being consumed at varying rates, ranging from slow-moving items to high-velocity stock. The average daily consumption rate across all items is ${avgDailyCons.toFixed(2)} units per day. Based on current stock levels and consumption patterns, ${critical} item(s) (${(critical/rows.length*100).toFixed(1)}%) have critical turnover trajectories with fewer than 3 days of stock remaining, while ${adequate} item(s) (${(adequate/rows.length*100).toFixed(1)}%) maintain adequate stock duration relative to consumption.

CONSUMPTION VELOCITY CLASSIFICATION:
${slowMovers > 0 ? `${slowMovers} item(s) are classified as slow-moving stock with consumption rates below 0.5 units per day. These items accumulate inventory value without generating cash flow, potentially indicating menu underutilization, recipe changes, or seasonal demand fluctuations. Monitor slow-moving items carefully to avoid waste and tied-up capital.` : 'All tracked items demonstrate reasonable consumption velocity.'}

INVENTORY OPTIMIZATION INSIGHTS:
Items with high daily consumption (above 1 unit/day) require frequent replenishment and represent core business drivers. Items with moderate consumption (0.5-1 unit/day) provide operational stability. Slow-moving items warrant review to determine if they should continue to be stocked or if alternatives would better serve business objectives.

PROCUREMENT PLANNING:
Use consumption velocity data to establish reorder frequencies. High-velocity items may justify weekly or bi-weekly ordering to maintain freshness and minimize carrying costs. Moderate-velocity items can accommodate standard ordering cycles. Slow-moving items should be evaluated for reduced order quantities or discontinuation.

CASH FLOW OPTIMIZATION:
Efficient stock turnover converts inventory investment into revenue more quickly, improving cash flow and reducing spoilage risk. Targeting faster turnover for all items—while maintaining service levels—strengthens overall financial performance.
`;
}

function analyzeSalesPipeline(rows) {
  const totalSales = rows.reduce((s, r) => s + Number((r['Net Sales'] || r.subtotal) || 0), 0);
  const totalOrders = rows.length;
  const avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
  const topProduct = rows.reduce((a, b) => (Number(b['Subtotal'] || b.subtotal || 0) > Number(a['Subtotal'] || a.subtotal || 0)) ? b : a, rows[0] || {});
  const branches = [...new Set(rows.map(r => r['Branch'] || r.branch_name))].length;
  
  return `
SALES PIPELINE ANALYSIS & TRANSACTION FLOW REPORT

This report provides a detailed transaction-level view of all sales activity during the specified period. The pipeline represents the complete journey from order creation through fulfillment, offering insights into sales patterns, product performance, and customer behavior.

SALES PERFORMANCE SUMMARY:
Your organization processed ${num(totalOrders)} transactions generating ${peso(totalSales)} in total net revenue during this period. The average transaction value is ${peso(avgOrder)}, indicating typical customer spending patterns. Sales activity spans ${num(branches)} branch(es), suggesting multi-location operational capacity.

TRANSACTION PATTERNS & INSIGHTS:
The sales pipeline reveals order distribution, product mix, and discount utilization across your operations. High-value transactions indicate strong customer spending capacity or group orders, while frequent low-value transactions suggest consistent individual customer traffic. Analyzing these patterns helps identify peak sales periods, popular product combinations, and pricing optimization opportunities.

PRODUCT PERFORMANCE:
${topProduct['Product'] || topProduct.product_name ? `The leading product by revenue is "${topProduct['Product'] || topProduct.product_name}" contributing significant transaction value. Prioritizing inventory and marketing focus on top-performing products maximizes revenue potential and customer satisfaction.` : ''} Understanding which products drive revenue vs. volume helps balance your product portfolio and menu strategy.

REVENUE QUALITY ASSESSMENT:
Beyond total revenue volume, examining transaction frequency, average order value, and customer retention patterns provides deeper insights into business health. Increasing average transaction value through upselling and cross-selling while maintaining traffic volume drives profitability growth.

OPERATIONAL IMPLICATIONS:
Pipeline analysis supports staffing decisions, inventory procurement timing, and resource allocation. High-traffic periods require enhanced staff availability, while patterns reveal opportunities for operational efficiency improvements and targeted marketing initiatives.
`;
}

function analyzeSalesPerformance(rows) {
  if (!rows || rows.length === 0) { return []; }
  const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
  const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);
  const avgOrderVal = totalOrds > 0 ? totalRev / totalOrds : 0;
  const topBranch = rows.reduce((a, b) => (Number(b['Total Revenue'] || b.total_revenue || 0) > Number(a['Total Revenue'] || a.total_revenue || 0)) ? b : a, rows[0] || {});
  const categories = [...new Set(rows.map(r => r['Category'] || r.product_category))];
  
  return `
SALES PERFORMANCE ANALYSIS & BRANCH COMPARATIVE METRICS

This report evaluates sales performance across your organizational units (branches) and product categories. Comparative analysis identifies high performers, underperformers, and category-level trends that drive strategic and operational decision-making.

CONSOLIDATED PERFORMANCE METRICS:
Total revenue across all reporting units is ${peso(totalRev)} from ${num(totalOrds)} orders, delivering an average transaction value of ${peso(avgOrderVal)}. Performance spans ${num(rows.length)} category segments across your branch network, providing comprehensive operational insight.

BRANCH PERFORMANCE RANKING:
${topBranch['Branch'] || topBranch.branch_name ? `The highest-performing unit, "${topBranch['Branch'] || topBranch.branch_name}", is generating the largest revenue contribution at ${peso(topBranch['Total Revenue'] || topBranch.total_revenue || 0)}. This branch represents best-practice performance and serves as a benchmark for operational excellence. Investigate their management practices, customer service approaches, and operational procedures to replicate success across other locations.` : ''} Significant performance variance between branches suggests differences in market conditions, management effectiveness, staffing quality, or customer base characteristics. Analyzing top performers and supporting underperformers is essential for portfolio optimization.

CATEGORY ANALYSIS:
Your ${num(categories.length)} tracked categories demonstrate varying market demand and profitability. Understanding category-level performance guides menu development, promotional strategies, and pricing optimization. High-performing categories may warrant expanded offerings and marketing emphasis, while weak categories require evaluation for improvement or potential discontinuation.

STRATEGIC IMPLICATIONS:
Performance data supports resource allocation decisions, management incentive structures, and growth investment priorities. Consistent underperformance may indicate management changes, operational improvements, or market repositioning requirements.
`;
}

function analyzeSalesMonthly(rows) {
  const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
  const avgMonthlyRev = totalRev / Math.max(rows.length, 1);
  const monthlyTrend = rows.length > 1 ? ((Number(rows[0]['Total Revenue'] || rows[0].total_revenue || 0) - Number(rows[1]['Total Revenue'] || rows[1].total_revenue || 0)) / Math.max(Number(rows[1]['Total Revenue'] || rows[1].total_revenue || 1), 1) * 100) : 0;
  
  return `
MONTHLY SALES TREND ANALYSIS & REVENUE FORECASTING

This report aggregates sales data by month across your organization, revealing seasonal patterns, growth trends, and performance trajectories. Monthly analysis enables strategic planning, budget forecasting, and tactical decision-making for revenue optimization.

TEMPORAL PERFORMANCE OVERVIEW:
Your monthly revenue data spans ${num(rows.length)} months with cumulative revenue of ${peso(totalRev)} and an average monthly revenue of ${peso(avgMonthlyRev)}. ${monthlyTrend > 0 ? `Recent months show positive momentum with revenue trending upward by approximately ${monthlyTrend.toFixed(1)}%, suggesting successful growth initiatives or favorable market conditions.` : monthlyTrend < 0 ? `Recent months indicate revenue decline of approximately ${Math.abs(monthlyTrend).toFixed(1)}%, warranting investigation into market changes, competitive pressures, or operational challenges.` : 'Recent months show stable revenue patterns.'}

SEASONAL & CYCLICAL PATTERNS:
Monthly aggregation reveals whether your business experiences seasonal variation, promotional impacts, or other cyclical patterns. Identifying peak months informs inventory planning, staffing adjustments, marketing timing, and cash flow management. Understanding expected seasonal variation prevents misinterpretation of normal fluctuations as performance problems.

GROWTH TRAJECTORY ASSESSMENT:
Comparing consecutive months reveals whether the business is on a growth, decline, or stability trajectory. Sustained growth indicates effective execution and market opportunity capture. Declining trends require diagnostic analysis to identify root causes and corrective actions. Stable patterns suggest mature market position or effective maintenance of status quo.

FORECASTING & PLANNING:
Historical monthly performance provides the foundation for revenue forecasting, budget planning, and resource allocation. Using monthly data to project future revenue enables proactive financial management and strategic decision-making.
`;
}

function analyzeConsolidatedReport(rows) {
  const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
  const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);
  const totalProductsSold = rows.reduce((s, r) => s + Number(r['Products Sold'] || r.total_products_sold || 0), 0);
  const avgOrderVal = totalOrds > 0 ? totalRev / totalOrds : 0;
  
  return `
CONSOLIDATED BUSINESS PERFORMANCE OVERVIEW & EXECUTIVE SUMMARY

This report synthesizes key operational metrics across your entire organization, providing a high-level view of business performance, market presence, and strategic positioning. Consolidated metrics enable executive assessment and board-level reporting.

ORGANIZATIONAL PERFORMANCE SNAPSHOT:
Your business generated ${peso(totalRev)} in total revenue from ${num(totalOrds)} customer transactions representing ${num(totalProductsSold)} units sold across all operational units during this reporting period. The average transaction value of ${peso(avgOrderVal)} reflects your pricing strategy and customer spending patterns. These metrics represent the aggregate result of all operational activities across your organization.

MULTI-LOCATION ANALYSIS:
Revenue distribution across locations reveals which branches are driving profitability, market share, and strategic growth. Analyzing revenue concentration helps identify geographic strength, market penetration success, and opportunities for expansion or consolidation. Geographic diversification reduces risk while concentration maximizes focused resource deployment.

OPERATIONAL EFFICIENCY METRICS:
The relationship between total revenue, order count, and products sold reveals operational efficiency. Higher revenue from fewer orders indicates strong average transaction values and pricing power. Higher order frequency with stable revenue suggests traffic-dependent business model. Examining this balance informs staffing, inventory, and marketing strategies.

STRATEGIC PERFORMANCE ASSESSMENT:
Consolidated metrics serve as dashboard indicators for organizational health, competitive position, and strategic progress toward defined goals. Comparing current performance against historical benchmarks and industry standards provides context for assessment and informs strategic planning.

FORWARD-LOOKING IMPLICATIONS:
This consolidated view establishes the performance baseline for strategic planning, capital allocation decisions, and organizational goal-setting. Understanding current consolidated performance enables data-driven strategic decisions about growth investments, operational improvements, and market positioning.
`;
}

function analyzeSalesWeekly(rows) {
  const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
  const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);
  const avgOrderVal = totalOrds > 0 ? totalRev / totalOrds : 0;
  const weeks = [...new Set(rows.map(r => r['Week Start'] || r.week_start || r['Week'] || r.week_number))].length;
  
  return `
WEEKLY SALES ANALYSIS & SHORT-TERM PERFORMANCE TRACKING

This report segments sales data by week, revealing short-term performance trends, weekly rhythm patterns, and tactical opportunities for immediate intervention. Weekly analysis enables agile management and rapid response to market conditions.

WEEKLY PERFORMANCE SUMMARY:
Your organization processed ${num(totalOrds)} transactions generating ${peso(totalRev)} in revenue across ${weeks} week(s), with an average weekly revenue of ${peso(totalRev / Math.max(weeks, 1))} and average transaction value of ${peso(avgOrderVal)}. Weekly aggregation reveals business cyclicity, promotional impacts, and operational variations that monthly reporting would obscure.

INTRA-WEEK PATTERNS:
Different days of the week typically demonstrate distinct sales patterns—weekday business may differ significantly from weekend activity. Understanding these patterns enables optimized staffing schedules, targeted promotions timed to peak demand periods, and inventory planning aligned with weekly consumption cycles. Identifying your business's unique weekly rhythm guides tactical operational decisions.

PROMOTIONAL & EVENT IMPACT:
Weekly data reveals the immediate impact of promotions, events, or special offerings. Comparing weeks with and without promotional activity quantifies marketing effectiveness and ROI. This granular view enables rapid iteration and optimization of promotional strategies within the current business cycle.

TREND DETECTION & FORECASTING:
Weekly trends emerging within the reporting period may indicate emerging business directions—positive momentum, seasonal shifts, or market pressures. Identifying these directional trends earlier than monthly reporting allows for faster management response and strategic adjustment. Consistent week-over-week growth indicates positive trajectory; declining patterns warrant investigation and corrective action.

OPERATIONAL AGILITY:
Weekly performance monitoring supports weekly management meetings, operational team coordination, and tactical decision-making. Using weekly data enables the organization to remain responsive to market conditions and operational challenges while maintaining strategic focus.
`;
}

function analyzeEmployeeSchedule(rows) {
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
  const totalShifts = rows.length;
  const employees = [...new Set(rows.map(r => r['Employee Name'] || r.employee_name || r.name))].length;
  const totalHours = rows.reduce((s, r) => s + getHours(r), 0);
  
  return `
EMPLOYEE SCHEDULING ANALYSIS & STAFFING OPTIMIZATION REPORT

This report provides comprehensive analysis of employee scheduling, shift allocation, and staffing patterns. Effective scheduling balances labor costs, service quality, employee satisfaction, and operational flexibility. This analysis supports strategic workforce planning and tactical staffing optimization.

STAFFING CAPACITY OVERVIEW:
Your organization has ${num(employees)} employees scheduled across ${num(totalShifts)} shifts totaling ${totalHours.toFixed(0)} hours during this period. Average shift hours per employee is ${(totalHours / Math.max(employees, 1)).toFixed(1)} hours, reflecting typical workload distribution and scheduling patterns. Understanding labor utilization rates, cost per shift, and coverage adequacy guides staffing decisions.

SHIFT COVERAGE ANALYSIS:
Adequate shift coverage ensures service quality and operational efficiency while controlling labor costs. Analyzing shift patterns reveals whether coverage matches demand—peak periods should have optimal staffing, while slower periods can operate with reduced teams. Misalignment between coverage and demand creates either service deficits or labor inefficiency.

LABOR COST IMPLICATIONS:
Total scheduled hours directly drive labor cost as primary operational expense. Optimizing scheduling reduces unnecessary hours while maintaining service levels. Analyzing staff allocation across shifts and time periods identifies optimization opportunities. Technology-driven scheduling that matches staffing to demand patterns reduces costs while improving service quality.

EMPLOYEE SATISFACTION & RETENTION:
Predictable, fair scheduling improves employee satisfaction and retention while reducing turnover costs. Analyzing scheduling fairness, consecutive day-off patterns, and shift preferences supports HR objectives. Balancing operational needs with employee scheduling preferences strengthens organizational culture and reduces costly turnover.

STRATEGIC WORKFORCE PLANNING:
Scheduling data informs headcount decisions, hiring timelines, and training priorities. Projected demand growth may necessitate proactive recruiting; declining demand may require workforce adjustments. Using scheduling analysis for workforce planning enables proactive rather than reactive management.

OPERATIONAL FLEXIBILITY:
Understanding scheduling flexibility—ability to add/reduce shifts, cross-train staff, or adjust routes—supports business resilience. Contingency planning for absences, seasonal changes, or unexpected disruptions requires schedules that can flex without compromising operations.
`;
}

function analyzeInventoryMonthly(rows) {
  const totalUsed = rows.reduce((s, r) => s + Number(r['Qty Used'] || r.total_quantity_used || 0), 0);
  const months = [...new Set(rows.map(r => r['Month'] || r.year_month))].length;
  const lowStock = rows.filter(r => (r['Status'] || r.stock_status) === 'Low Stock').length;
  const outOfStock = rows.filter(r => (r['Status'] || r.stock_status) === 'Out of Stock').length;

  return `
INVENTORY MONTHLY CONSUMPTION ANALYSIS

This report tracks monthly inventory usage across all branches, providing visibility into consumption patterns, stock level trends, and inventory movement over time.

MONTHLY CONSUMPTION OVERVIEW:
Across ${num(months)} month(s), total inventory usage was ${num(totalUsed)} units. ${lowStock > 0 ? `${lowStock} product(s) are currently at low stock levels requiring attention.` : ''} ${outOfStock > 0 ? `${outOfStock} product(s) are out of stock.` : 'Stock levels are generally adequate.'}

CONSUMPTION PATTERNS:
Monthly aggregation reveals seasonal and cyclical usage patterns. High-consumption months may indicate increased business activity or promotional periods. Low-consumption months may suggest seasonal slowdowns or inventory optimization opportunities.

INVENTORY PLANNING:
Monthly usage data informs reorder quantities, safety stock levels, and supplier negotiations. Understanding consumption patterns by product category helps optimize inventory investment and reduce carrying costs.
`;
}

function analyzeInventoryWeekly(rows) {
  const totalUsed = rows.reduce((s, r) => s + Number(r['Qty Used'] || r.total_quantity_used || 0), 0);
  const weeks = [...new Set(rows.map(r => r['Week Start'] || r.week_start))].length;
  const lowStock = rows.filter(r => (r['Status'] || r.stock_status) === 'Low Stock').length;

  return `
INVENTORY WEEKLY USAGE ANALYSIS

This report provides a granular week-by-week view of inventory consumption, enabling rapid detection of usage trends and immediate operational adjustments.

WEEKLY CONSUMPTION SUMMARY:
Across ${num(weeks)} week(s), total inventory usage was ${num(totalUsed)} units. ${lowStock > 0 ? `${lowStock} product(s) are flagged as low stock.` : ''}

WEEKLY PATTERNS:
Weekly data reveals short-term consumption trends and operational rhythms. Comparing week-over-week consumption helps identify unusual usage spikes, potential theft or waste issues, and the immediate impact of menu changes or promotions.

TACTICAL PLANNING:
Weekly inventory insights support just-in-time ordering, waste reduction initiatives, and responsive inventory management. Frequent monitoring reduces the risk of stockouts while minimizing excess inventory carrying costs.
`;
}

function analyzeSalesForecast(rows) {
  const validForecasts = rows.filter(r => {
    const forecast = Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0);
    const actual = Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0);
    return forecast > 0 || actual > 0;
  });
  
  const totalForecast = validForecasts.reduce((s, r) => s + Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0), 0);
  const totalActual = validForecasts.reduce((s, r) => s + Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0), 0);
  const totalDiff = validForecasts.reduce((s, r) => {
    const f = Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0);
    const a = Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0);
    return s + Math.abs(a - f);
  }, 0);
  const forecastAccuracy = totalActual > 0 ? Math.max(0, (1 - totalDiff / totalActual) * 100) : 0;
  const periods = validForecasts.length;
  
  return `
SALES FORECAST ANALYSIS & PREDICTIVE PERFORMANCE REVIEW

This report compares forecasted versus actual sales performance, evaluating forecast accuracy, identifying forecast bias, and assessing predictive model reliability. Accurate forecasting enables better resource planning, inventory management, and strategic decision-making.

FORECAST PERFORMANCE SUMMARY:
Over ${periods} forecast period(s), total forecasted revenue was ${peso(totalForecast)} versus actual revenue of ${peso(totalActual)}, representing forecast accuracy of ${forecastAccuracy.toFixed(1)}%. ${Math.abs(100 - forecastAccuracy) < 10 ? 'Excellent forecast accuracy indicates reliable predictive models and effective planning assumptions.' : Math.abs(100 - forecastAccuracy) < 20 ? 'Good forecast accuracy with minor variations suggests reasonably reliable predictions.' : 'Significant forecast variance warrants investigation into forecast methodology, underlying assumptions, and market condition changes.'}

FORECAST BIAS ASSESSMENT:
Comparing forecasted to actual revenue reveals systematic bias—consistent under- or over-forecasting. Under-forecasting creates missed opportunities and supply constraints; over-forecasting leads to excess inventory and wasted resources. Identifying and correcting bias improves forecast reliability. Bias may originate from overly optimistic/pessimistic assumptions, external factors not captured in the model, or data quality issues.

MARKET CONDITION IMPACT:
External factors—seasonality changes, competitive actions, economic conditions, promotional effectiveness—may explain forecast variance. Qualitative assessment of whether variance reflects external conditions or model deficiency guides whether to adjust the model or adjust operational response to changed conditions.

PLANNING RELIABILITY:
Forecast accuracy directly impacts planning confidence. Resource allocation, inventory procurement, and staffing decisions depend on forecast reliability. Understanding your forecast accuracy range enables better contingency planning and more realistic margin of safety in operational planning.

MODEL IMPROVEMENT OPPORTUNITIES:
Analyzing forecast error patterns identifies improvement opportunities—specific periods with consistent error, particular categories with poor accuracy, or conditions under which forecasts systematically fail. Root cause analysis of forecast failures enables iterative model improvement and refinement of planning assumptions.

STRATEGIC DECISION-MAKING:
Forecast accuracy impacts strategic business decisions—market expansion, new product launches, capital investments. Understanding your forecasting capability guides confidence in strategic decisions. Conservative strategic plans are warranted with low forecast accuracy; more aggressive strategies are viable with high forecast accuracy.

CONTINUOUS IMPROVEMENT:
Systematic forecast monitoring, accuracy tracking, and improvement enable increasingly sophisticated and reliable forecasting. Organizations that continuously improve forecasting gain competitive advantage through better resource allocation and strategic positioning.
`;
}

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
      return [
        { text: r['Product Name'] || r.productname || r.name, bold: stock === 0 || stock <= reorder },
        r['Category'] || r.category,
        { text: num(stock), alignment: 'right' },
        { text: num(reorder), alignment: 'right' },
        { text: shortage > 0 ? num(shortage) : '—', alignment: 'right' },
        { text: status, alignment: 'center', bold: true, color: status === 'OUT OF STOCK' ? '#DC2626' : status === 'LOW STOCK' ? '#D97706' : '#16A34A' }
      ];
    });

    return { 
      content: [
        { text: analyzeInventoryOnHand(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
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
        return 9999;
      })();
      const status = days <= 0 ? 'EXPIRED' : days <= 3 ? 'CRITICAL' : 'OK';
      return [
        { text: r['Product Name'] || r.productname || r.name, bold: status !== 'OK' },
        r['Category'] || r.category,
        { text: num(r['Current Stock'] || r.stockquantity), alignment: 'right' },
        r['Expiration Date'] || r.expirationdate,
        { text: fmtTimeRemaining(days), alignment: 'right', bold: days <= 3 },
        { text: status, alignment: 'center', bold: true }
      ];
    });

    return { 
      content: [
        { text: analyzeInventoryAging(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Aging Analysis Detail'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
        expired > 0 ? noteBox(`⚠️ URGENT: ${expired} item(s) have expired. Remove from inventory immediately for compliance.`, 'danger') : ''
      ]
    };
  },

  'low-inventory': (rows) => {
    const urgent = rows.filter(r => (r['Current Stock'] || r.stockquantity) === 0).length;
    const critical = rows.filter(r => {
      const d = r['Days of Stock Remaining'] ?? r.days_of_stock_remaining ?? r.days_until_expiry ?? 9999;
      return d <= 3 && (r['Current Stock'] || r.stockquantity) > 0;
    }).length;

    const kpis = [
      { label: 'Alert Items', value: num(rows.length) },
      { label: 'Out of Stock', value: num(urgent) },
      { label: 'Critical (≤3 days)', value: num(critical) },
    ];

    const headers = ['Product', 'Category', 'Current', 'Reorder', 'Shortage', 'Days Left', 'Branch'];
    const body = rows.map(r => [
      { text: r['Product Name'] || r.name, bold: true },
      r['Category'] || r.category,
      { text: num(r['Current Stock'] || r.stockquantity), alignment: 'right' },
      { text: num(r['Reorder Level'] || r.reorderlevel), alignment: 'right' },
      { text: num(r['Shortage'] || Math.max(0, (r['Reorder Level'] || r.reorderlevel) - (r['Current Stock'] || r.stockquantity))), alignment: 'right' },
      { text: fmtTimeRemaining(r['Days of Stock Remaining'] ?? r.days_of_stock_remaining), alignment: 'right' },
      r['Branch'] || r.branch_name || '—'
    ]);

    return { 
      content: [
        { text: analyzeLowInventory(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Restocking Priority List'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto', '*'], body: [headers, ...body] }, layout: 'silingan' },
        noteBox(`Action Required: Reorder ${rows.length} item(s) to restore adequate inventory levels.`, urgent > 0 ? 'danger' : 'warning')
      ]
    };
  },

  'stock-turnover': (rows) => {
    const critical = rows.filter(r => (r['Days of Stock Remaining'] || r.days_of_stock_remaining) <= 3).length;
    const adequate = rows.length - critical;

    const kpis = [
      { label: 'Items Tracked', value: num(rows.length) },
      { label: 'Critical Stock', value: num(critical) },
      { label: 'Adequate Stock', value: num(adequate) },
    ];

    const headers = ['Product', 'Category', 'Daily Rate', 'Days Left', 'Stock Status'];
    const body = rows.map(r => {
      const days = r['Days of Stock Remaining'] || r.days_of_stock_remaining;
      const status = days <= 3 ? 'CRITICAL' : 'ADEQUATE';
      return [
        { text: r['Product Name'] || r.name, bold: status === 'CRITICAL' },
        r['Category'] || r.category,
        { text: (r['Daily Consumption Rate'] || r.daily_consumption_rate || 0).toFixed(2), alignment: 'right' },
        { text: fmtTimeRemaining(days), alignment: 'right', bold: days <= 3 },
        { text: status, alignment: 'center', bold: true }
      ];
    });

    return { 
      content: [
        { text: analyzeStockTurnover(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Consumption Velocity Analysis'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-pipeline': (rows) => {
    const totalSales = rows.reduce((s, r) => s + Number((r['Net Sales'] || r.subtotal) || 0), 0);
    const totalOrders = rows.length;
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
      { text: peso(Number(r['Subtotal'] || r.subtotal || 0) - Number(r['Discount'] || r.discount || 0)), alignment: 'right', bold: true },
      { text: r['Status'] || r.status || 'Completed', alignment: 'center' }
    ]);

    return {
      content: [
        { text: analyzeSalesPipeline(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Transaction Details'),
        { table: { headerRows: 1, widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-performance': (rows) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);
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
        { text: analyzeSalesPerformance(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Performance Breakdown'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-monthly': (rows) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);

    const kpis = [
      { label: 'Total Revenue', value: peso(totalRev) },
      { label: 'Total Orders', value: num(totalOrds) },
      { label: 'Avg Monthly', value: peso(totalRev / Math.max(1, rows.length)) },
    ];

    const headers = ['Month', 'Branch', 'Orders', 'Revenue', 'Avg Order'];
    const body = rows.map(r => [
      { text: r['Month'] || r.year_month, bold: true },
      r['Branch'] || r.branch_name,
      { text: num(r['Total Orders'] || r.total_orders), alignment: 'right' },
      { text: peso(r['Total Revenue'] || r.total_revenue || 0), alignment: 'right' },
      { text: peso(r['Avg Order Value'] || r.avg_order_value || 0), alignment: 'right' }
    ]);

    return {
      content: [
        { text: analyzeSalesMonthly(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Monthly Performance Metrics'),
        { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'consolidated-report': (rows) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);

    const kpis = [
      { label: 'Total Revenue', value: peso(totalRev) },
      { label: 'Total Orders', value: num(totalOrds) },
      { label: 'Avg Order', value: peso(totalOrds > 0 ? totalRev / totalOrds : 0) },
    ];

    const headers = ['Branch', 'Revenue', 'Orders', 'Avg Order', 'Products Sold', 'Top Product'];
    const body = rows.map(r => [
      { text: r['Branch'] || r.branch_name, bold: true },
      { text: peso(r['Total Revenue'] || r.total_revenue || 0), alignment: 'right' },
      { text: num(r['Total Orders'] || r.total_orders), alignment: 'right' },
      { text: peso(r['Avg Order Value'] || r.avg_order_value || 0), alignment: 'right' },
      { text: num(r['Products Sold'] || r.total_products_sold), alignment: 'right' },
      r['Top Product'] || r.top_product || '—'
    ]);

    return {
      content: [
        { text: analyzeConsolidatedReport(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Branch Summary Detail'),
        { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', 'auto', '*'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'sales-weekly': (rows) => {
    const totalRev = rows.reduce((s, r) => s + Number(r['Total Revenue'] || r.total_revenue || 0), 0);
    const totalOrds = rows.reduce((s, r) => s + Number(r['Total Orders'] || r.total_orders || 0), 0);

    const kpis = [
      { label: 'Total Revenue', value: peso(totalRev) },
      { label: 'Total Orders', value: num(totalOrds) },
      { label: 'Avg Weekly', value: peso(totalRev / Math.max(1, rows.length)) },
    ];

    const headers = ['Week Start', 'Branch', 'Orders', 'Revenue', 'Avg Order'];
    const body = rows.map(r => [
      { text: r['Week Start'] || r.week_start || r['Week'] || r.week_number, bold: true },
      r['Branch'] || r.branch_name,
      { text: num(r['Total Orders'] || r.total_orders), alignment: 'right' },
      { text: peso(r['Total Revenue'] || r.total_revenue || 0), alignment: 'right' },
      { text: peso(r['Avg Order Value'] || r.avg_order_value || 0), alignment: 'right' }
    ]);

    return {
      content: [
        { text: analyzeSalesWeekly(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Weekly Performance Metrics'),
        { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
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
        { text: analyzeEmployeeSchedule(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Staff Schedule Detail'),
        { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'inventory-monthly': (rows) => {
    const totalUsed = rows.reduce((s, r) => s + Number(r['Qty Used'] || r.total_quantity_used || 0), 0);
    const months = [...new Set(rows.map(r => r['Month'] || r.year_month))].length;

    const kpis = [
      { label: 'Months', value: num(months) },
      { label: 'Total Units Used', value: num(totalUsed) },
      { label: 'Products Tracked', value: num(rows.length) },
    ];

    const headers = ['Month', 'Branch', 'Product', 'Category', 'Qty Used', 'Stock', 'Status'];
    const body = rows.map(r => [
      { text: r['Month'] || r.year_month, bold: true },
      r['Branch'] || r.branch_name,
      r['Product'] || r.product_name,
      r['Category'] || r.category,
      { text: num(r['Qty Used'] || r.total_quantity_used || 0), alignment: 'right' },
      { text: num(r['Current Stock'] || r.current_stock), alignment: 'right' },
      { text: r['Status'] || r.stock_status || '—', alignment: 'center', bold: true }
    ]);

    return {
      content: [
        { text: analyzeInventoryMonthly(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Monthly Inventory Usage'),
        { table: { headerRows: 1, widths: ['auto', 'auto', '*', '*', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },

  'inventory-weekly': (rows) => {
    const totalUsed = rows.reduce((s, r) => s + Number(r['Qty Used'] || r.total_quantity_used || 0), 0);
    const weeks = [...new Set(rows.map(r => r['Week Start'] || r.week_start))].length;

    const kpis = [
      { label: 'Weeks', value: num(weeks) },
      { label: 'Total Units Used', value: num(totalUsed) },
      { label: 'Products Tracked', value: num(rows.length) },
    ];

    const headers = ['Week Start', 'Branch', 'Product', 'Category', 'Qty Used', 'Stock', 'Status'];
    const body = rows.map(r => [
      { text: r['Week Start'] || r.week_start, bold: true },
      r['Branch'] || r.branch_name,
      r['Product'] || r.product_name,
      r['Category'] || r.category,
      { text: num(r['Qty Used'] || r.total_quantity_used || 0), alignment: 'right' },
      { text: num(r['Current Stock'] || r.current_stock), alignment: 'right' },
      { text: r['Status'] || r.stock_status || '—', alignment: 'center', bold: true }
    ]);

    return {
      content: [
        { text: analyzeInventoryWeekly(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Weekly Inventory Usage'),
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
    const totalDiff = validForecasts.reduce((s, r) => {
      const f = Number(r['Forecasted Revenue'] || r.forecast_sales || r['Forecast'] || 0);
      const a = Number(r['Actual Revenue'] || r.net_sales || r['Actual Sales'] || 0);
      return s + Math.abs(a - f);
    }, 0);
    const accuracy = totalActual > 0 ? Math.max(0, (1 - totalDiff / totalActual) * 100) : 0;

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
        { text: peso(forecast), alignment: 'right' },
        { text: acc.toFixed(1) + '%', alignment: 'right', bold: true, color: acc >= 80 ? '#16A34A' : acc >= 50 ? '#D97706' : '#DC2626' }
      ];
    });

    return {
      content: [
        { text: analyzeSalesForecast(rows), style: 'narrative' },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 15, 0, 15] },
        kpiStrip(kpis),
        sectionHeader('Forecast vs. Actual Detail'),
        { table: { headerRows: 1, widths: ['auto', 'auto', 'auto', 'auto', 'auto'], body: [headers, ...body] }, layout: 'silingan' },
      ]
    };
  },
};

// ─── Main Export Function ───────────────────────────────────────────────────

export function exportPDF(reportType, rows, meta, insights) {
  // 1. Determine Builder and prepare document content
  const builder = BUILDERS[reportType];
  let reportConfig;

  if (builder) {
    reportConfig = builder(rows);
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

  // 2. Build content array with insights if available
  const contentArray = Array.isArray(reportConfig.content) ? reportConfig.content : [reportConfig.content];
  
  // Add AI insights if provided
  if (insights && insights.findings && insights.findings.length > 0) {
    contentArray.push(
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER }], margin: [0, 20, 0, 15] },
      sectionHeader('KEY INSIGHTS & RECOMMENDATIONS'),
      { text: insights.summary || 'Data analysis complete.', style: 'insightSummary', margin: [0, 0, 0, 12] }
    );

    // Add top findings
    insights.findings.slice(0, 5).forEach((finding, idx) => {
      const severityColor = MUTED;
      contentArray.push({
        table: {
          widths: ['auto', '*'],
          body: [[
            { 
              text: finding.severity.toUpperCase(), 
              style: 'badge',
              color: severityColor,
              alignment: 'center',
              margin: [3, 3, 3, 3]
            },
            {
              stack: [
                { text: finding.title, style: 'findingTitle' },
                { text: finding.description, style: 'findingDesc' }
              ]
            }
          ]]
        },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
        margin: [0, 0, 0, 10]
      });
    });
  }

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
      insightSummary: { fontSize: 8.5, color: DARK, lineHeight: 1.5 },
      findingTitle: { fontSize: 9, bold: true, color: DARK, margin: [0, 0, 0, 2] },
      findingDesc: { fontSize: 8, color: MUTED, lineHeight: 1.4 },
      badge: { fontSize: 6.5, bold: true },
      tableHeader: { fontSize: 8.5, bold: true, color: DARK, margin: [4, 4, 4, 4] },
      narrative: { fontSize: 8.5, color: DARK, lineHeight: 1.6, alignment: 'justify', margin: [0, 0, 0, 10] }
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
  pdfMake.createPdf(docDefinition).download(`silingan-${reportType.replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}