const RULES = {
  branchUnderperformancePct: 0.8,
  branchHeavyHitterPct: 0.3,
  stockCriticalDays: 3,
  expirationDays: 3,
  volatilityThreshold: 0.3,
  stabilityThreshold: 0.15,
  trendSlopeMin: 1,
  trendChangePctMin: 5,
  maxMeaningfulPct: 500,
  topFindingsCount: 12,
  maxPriorities: 5,
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 }

function sortBySeverity(items) {
  return [...items].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}

function pct(a, b) {
  if (!b || !a) return 0
  return ((Number(a) - Number(b)) / Number(b)) * 100
}

function safeChangeDesc(pctVal) {
  const abs = Math.abs(pctVal)
  if (abs > RULES.maxMeaningfulPct) {
    return `significantly ${pctVal > 0 ? 'higher' : 'lower'} than`
  }
  return `${abs.toFixed(2)}% ${pctVal > 0 ? 'higher' : 'lower'} than`
}

function stdDev(arr) {
  const n = arr.length
  if (n < 2) return 0
  const mean = arr.reduce((s, v) => s + v, 0) / n
  const sq = arr.reduce((s, v) => s + (v - mean) ** 2, 0)
  return Math.sqrt(sq / (n - 1))
}

function linearRegression(data) {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const xs = data.map((_, i) => i)
  const ys = data.map(v => Number(v))
  const sumX = xs.reduce((s, v) => s + v, 0)
  const sumY = ys.reduce((s, v) => s + v, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumX2 = xs.reduce((s, v) => s + v * v, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  const yPred = xs.map(x => slope * x + intercept)
  const ssRes = ys.reduce((s, v, i) => s + (v - yPred[i]) ** 2, 0)
  const ssTot = ys.reduce((s, v) => s + (v - sumY / n) ** 2, 0)
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  return { slope, intercept, r2 }
}

function engineAnomalies(data) {
  const findings = []
  const r = RULES

  const ls = data.lowStock || []
  const outOfStock = ls.filter(v => Number(v.stockquantity) === 0)
  const lowItems = ls.filter(v => Number(v.stockquantity) > 0)

  if (outOfStock.length > 0) {
    const names = outOfStock.map(v => v.name)
    const list = names.slice(0, 5).join(', ')
    findings.push({
      severity: 'high',
      category: 'stock',
      link: { module: 'inventory', label: 'View Inventory' },
      title: 'Critical Stockout Alert',
      description: `${outOfStock.length} raw material(s) — ${list}${names.length > 5 ? ` and ${names.length - 5} others` : ''} — are currently out of stock with zero quantity on hand. This means these materials are unavailable for production or sale, directly impacting the business's ability to fulfill orders. Immediate restocking is necessary to prevent service disruption and revenue loss.`
    })
  }

  if (lowItems.length > 0) {
    const names = lowItems.map(v => v.name).slice(0, 3).join(', ')
    findings.push({
      severity: 'high',
      category: 'stock',
      link: { module: 'inventory', label: 'View Inventory' },
      title: 'Raw Materials Below Minimum Stock Threshold',
      description: `${lowItems.length} raw material(s) — ${names}${lowItems.length > 3 ? ` and ${lowItems.length - 3} others` : ''} — have fallen below their established reorder levels. These items are still available but risk stockout if not replenished soon. At the current rate of consumption, the remaining stock will be depleted quickly, making timely reordering a priority.`
    })
  }

  const aging = data.inventoryAging || []
  const expiring = aging.filter(v => {
    if (!v.expirationdate) return false
    const days = (new Date(v.expirationdate) - new Date()) / 86400000
    return days >= 0 && days <= r.expirationDays
  })
  if (expiring.length > 0) {
    findings.push({
      severity: 'high',
      category: 'inventory',
      link: { module: 'inventory', label: 'View Inventory' },
      title: 'Raw Materials Approaching Expiration',
      description: `${expiring.length} raw material(s) are set to expire within ${r.expirationDays} days. Perishable goods that pass their expiration date become unusable, resulting in direct waste and financial loss. It is recommended to conduct a physical audit of these items and prioritize their use, consider markdowns, or prepare for disposal as appropriate.`
    })
  }

  const turnover = data.stockTurnover || []
  const critical = turnover.filter(v => Number(v.days_of_stock_remaining) > 0 && Number(v.days_of_stock_remaining) <= r.stockCriticalDays)
  if (critical.length > 0) {
    const names = critical.map(v => v.name).slice(0, 3).join(', ')
    findings.push({
      severity: 'high',
      category: 'stock',
      link: { module: 'inventory', label: 'View Inventory' },
      title: 'Critically Low Stock — Raw Materials',
      description: `${critical.length} raw material(s) — ${names}${critical.length > 3 ? ` and ${critical.length - 3} others` : ''} — have ${r.stockCriticalDays} or fewer days of stock remaining at current usage rates. This metric combines consumption velocity with available quantity to project when each item will run out. Even if current stock levels appear adequate, the rate of consumption means these items will be exhausted soon without prompt replenishment.`
    })
  }

  const branches = data.branchComparison || []
  if (branches.length > 1) {
    const avg = branches.reduce((s, v) => s + Number(v.net_sales), 0) / branches.length
    const belowAvg = branches.filter(v => Number(v.net_sales) < avg * r.branchUnderperformancePct)
    for (const b of belowAvg) {
      const diff = Math.round((1 - Number(b.net_sales) / avg) * 100)
      findings.push({
        severity: 'medium',
        category: 'branch',
        link: { module: 'sales', label: 'View Sales' },
        title: `Branch Underperformance — ${b.branch_name}`,
        description: `${b.branch_name} generated ₱${Number(b.net_sales).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in revenue during this period, which is ${diff}% below the system-wide average of ₱${Number(avg).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. A performance gap of this magnitude warrants a closer look at local operations — including staffing sufficiency, inventory availability, foot traffic patterns, and any external factors affecting that location. Consider conducting an operational audit to identify specific causes.`
      })
    }
  }

  const peak = data.peakHours || []
  if (peak.length > 0) {
    const max = peak.reduce((a, b) => (a.avg_orders > b.avg_orders ? a : b))
    findings.push({
      severity: 'low',
      category: 'sales',
      link: { module: 'sales', label: 'View Sales' },
      title: 'Peak Operating Hours Identified',
      description: `The busiest period across all branches is ${max.hour}:00, averaging ${Math.round(Number(max.avg_orders))} orders during that hour. Concentrated demand during this window creates pressure on both front-of-house and kitchen staff. Ensuring adequate staffing and pre-prepared inventory during peak hours can improve service speed and customer satisfaction. Conversely, slower hours may present opportunities for maintenance or staff breaks.`
    })
  }

  return findings
}

function engineTrends(data) {
  const findings = []
  const r = RULES

  if (data.kpiSummary && data.kpiSummary.length > 0) {
    const k = data.kpiSummary[0]
    const salesPct = pct(k.total_sales, k.prev_total_sales)
    const ordersPct = pct(k.total_orders, k.prev_total_orders)

    if (Math.abs(salesPct) >= r.trendChangePctMin) {
      const dir = salesPct > 0 ? 'increase' : 'decline'
      const sig = Math.abs(salesPct) > r.maxMeaningfulPct
      const pctDesc = sig ? 'significantly' : `${Math.abs(salesPct).toFixed(2)}%`
      const rec = salesPct > 0
        ? 'The current strategies appear effective and should be maintained or scaled.'
        : 'A review of recent changes, promotions, pricing, and operational factors is recommended to identify the root cause.'
      findings.push({
        severity: salesPct > 0 ? 'low' : 'medium',
        category: 'trend',
        link: { module: 'sales', label: 'View Sales' },
        title: `Sales Revenue ${salesPct > 0 ? 'Growth' : 'Decline'} Detected`,
        description: `Total revenue ${dir}ed ${pctDesc} compared to the previous period. ${sig ? 'The magnitude of this change may indicate a data coverage issue or a significant shift in operations — the previous period\'s data should be verified for completeness. ' : ''}${rec} Monitoring this trend closely in the coming weeks will clarify whether this is a temporary fluctuation or an emerging pattern.`
      })
    }

    if (Math.abs(ordersPct) >= r.trendChangePctMin) {
      const dir = ordersPct > 0 ? 'higher' : 'lower'
      const sig = Math.abs(ordersPct) > r.maxMeaningfulPct
      const pctDesc = sig ? 'significantly' : `${Math.abs(ordersPct).toFixed(2)}%`
      findings.push({
        severity: ordersPct > 0 ? 'low' : 'medium',
        category: 'trend',
        link: { module: 'sales', label: 'View Sales' },
        title: `Order Volume Trending ${ordersPct > 0 ? 'Upward' : 'Downward'}`,
        description: `Customer order volume was ${pctDesc} ${dir} than the comparable prior period. ${sig ? 'This large swing suggests the previous period may have incomplete data or an operational change occurred. Verifying the data coverage is recommended. ' : ''}This metric reflects actual customer traffic and purchasing frequency. ${ordersPct > 0 ? 'Rising order counts suggest growing customer engagement and may justify increased inventory ordering.' : 'A decrease in orders may indicate shifting customer preferences, increased competition, or external factors affecting demand. Further analysis is advised.'}`
      })
    }
  }

  const trend = data.salesTrend || []
  if (trend.length >= 3) {
    const vals = trend.map(v => Number(v.net_sales))
    const reg = linearRegression(vals)
    if (Math.abs(reg.slope) > r.trendSlopeMin) {
      const dir = reg.slope > 0 ? 'rising' : 'declining'
      const dailyText = Math.abs(reg.slope).toFixed(2)
      findings.push({
        severity: 'medium',
        category: 'trend',
        link: { module: 'sales', label: 'View Sales' },
        title: `Sales Trend Analysis — ${dir === 'rising' ? 'Upward Momentum' : 'Downward Pressure'}`,
        description: `Regression analysis of daily sales reveals a ${dir} trend averaging approximately ₱${dailyText} per day over the observed period. The R² value of ${reg.r2.toFixed(2)} indicates the strength of this trend. ${reg.r2 > 0.7 ? 'This represents a strong, consistent pattern rather than random fluctuation.' : 'This suggests moderate consistency, though day-to-day variability should still be monitored.'} Understanding this trajectory is useful for forecasting and operational planning.`
      })
    }

    const stdev = stdDev(vals)
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length
    const cv = mean > 0 ? stdev / mean : 0
    if (cv > r.volatilityThreshold) {
      findings.push({
        severity: 'medium',
        category: 'trend',
        link: { module: 'sales', label: 'View Sales' },
        title: 'Sales Volatility Requires Attention',
        description: `Daily revenue shows significant fluctuation with a coefficient of variation of ${(cv * 100).toFixed(2)}% (standard deviation: ₱${stdev.toFixed(2)}). High volatility makes cash flow and inventory planning more difficult, as demand varies considerably from day to day. Investigating the patterns behind the spikes and dips — such as day-of-week effects, promotions, or external events — can help build more reliable forecasts.`
      })
    } else if (cv < r.stabilityThreshold) {
      findings.push({
        severity: 'low',
        category: 'trend',
        link: { module: 'sales', label: 'View Sales' },
        title: 'Consistent Sales Performance Observed',
        description: `Sales are notably stable with a coefficient of variation of ${(cv * 100).toFixed(2)}%, indicating predictable daily revenue with minimal fluctuation. This stability allows for more accurate inventory planning, staffing schedules, and cash flow projections. The current operational model appears well-calibrated to demand patterns.`
      })
    }
  }

  return findings
}

function engineComparison(data) {
  const findings = []
  const r = RULES

  const branches = data.branchComparison || []
  if (branches.length > 1) {
    const sorted = [...branches].sort((a, b) => Number(b.net_sales) - Number(a.net_sales))
    const totalRevenue = branches.reduce((s, v) => s + Number(v.net_sales), 0)

    findings.push({
      severity: 'low',
      category: 'branch',
      link: { module: 'sales', label: 'View Sales' },
      title: 'Top Performing Branch Identified',
      description: `${sorted[0].branch_name} leads all branches with ₱${Number(sorted[0].net_sales).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in revenue during this period. This performance may reflect factors such as location, customer base, management practices, or operational efficiency. Reviewing this branch's practices could yield insights applicable to other locations.`
    })

    findings.push({
      severity: 'low',
      category: 'branch',
      link: { module: 'sales', label: 'View Sales' },
      title: 'Lowest Performing Branch Recorded',
      description: `${sorted[sorted.length - 1].branch_name} recorded the lowest revenue at ₱${Number(sorted[sorted.length - 1].net_sales).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. While context matters — such as location size, operating hours, or local demographics — this ranking serves as a starting point for identifying improvement opportunities.`
    })

    for (const b of branches) {
      const share = totalRevenue > 0 ? Number(b.net_sales) / totalRevenue : 0
      if (share >= r.branchHeavyHitterPct) {
        findings.push({
          severity: 'medium',
          category: 'branch',
          link: { module: 'sales', label: 'View Sales' },
          title: `Primary Revenue Driver — ${b.branch_name}`,
          description: `${b.branch_name} accounts for ${(share * 100).toFixed(2)}% of total system revenue, classifying it as a primary revenue driver. The performance of this branch has an outsized impact on overall business health. Any operational issues affecting this location should be prioritized to protect the largest revenue stream.`
        })
      }
    }
  }

  const cats = data.revenueByCategory || []
  if (cats.length > 0 && cats[0].percentage) {
    const top = cats[0]
    findings.push({
      severity: 'low',
      category: 'sales',
      link: { module: 'sales', label: 'View Sales' },
      title: 'Top Revenue Category',
      description: `${top.category} is the highest-grossing product category this period, contributing ${Number(top.percentage).toFixed(2)}% of total revenue. This category represents the core of the business and should be prioritized in inventory planning, marketing efforts, and menu development.`
    })
  }

  const products = data.topProducts || []
  if (products.length > 0) {
    const top = products[0]
    findings.push({
      severity: 'low',
      category: 'sales',
      link: { module: 'sales', label: 'View Sales' },
      title: 'Best-Selling Product',
      description: `${top.product_name} is the top-selling product with ${Number(top.units_sold)} units sold and ₱${Number(top.revenue).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in revenue this period. Strong demand for this item makes it critical to maintain adequate stock levels and consider its role in promotions and menu positioning.`
    })
  }

  return findings
}

function engineSchedule(data) {
  const findings = []
  const schedules = data.scheduleData || []
  const pending = schedules.filter(v => {
    const status = (v.status || '').toLowerCase()
    return status === 'pending'
  })
  if (pending.length > 0) {
    const names = pending.map(v => v.employee_name).slice(0, 5).join(', ')
    findings.push({
      severity: 'medium',
      category: 'schedule',
      link: { module: 'schedule', label: 'View Schedule' },
      title: 'Unresolved Schedule Items',
      description: `${pending.length} employee shift(s) currently have a pending status — ${names}${pending.length > 5 ? ` and ${pending.length - 5} others` : ''}. These schedules have been submitted or created but not yet finalized. Unresolved schedules can lead to staffing gaps, confusion about assignments, and payroll inaccuracies. Reviewing and approving these items will ensure that all shifts are properly assigned and confirmed.`
    })
  }
  return findings
}

export function generateInsights(data) {
  const allFindings = sortBySeverity([
    ...engineAnomalies(data),
    ...engineTrends(data),
    ...engineComparison(data),
    ...engineSchedule(data),
  ])

  const top = allFindings.slice(0, RULES.topFindingsCount)

  const priorities = top
    .filter(f => f.severity === 'high' || f.severity === 'medium')
    .slice(0, RULES.maxPriorities)
    .map(f => ({
      title: f.title,
      description: f.description,
      severity: f.severity,
      due: f.severity === 'high' ? 'Today' : 'This week',
      link: f.link,
    }))

  const highCount = top.filter(f => f.severity === 'high').length
  const medCount = top.filter(f => f.severity === 'medium').length
  const summary = highCount > 0 || medCount > 0
    ? `${highCount} critical issue(s) and ${medCount} area(s) requiring attention were identified during this analysis. The findings below provide context and recommended actions.`
    : 'No significant issues were detected. All key business metrics — stock levels, sales performance, and operational scheduling — appear within acceptable parameters.'

  return { findings: top, priorities, summary }
}
