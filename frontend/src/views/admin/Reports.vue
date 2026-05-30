<template>
  <div class="reports-page">
      <div>
        <h4 class="page-title mb-1">Reports &amp; Analytics</h4>
        <p class="page-sub mb-0">Business insights, visualizations, and report generation</p>
      </div>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <select v-model="period" class="form-select fc-brand" style="width:150px" @change="onPeriodChange">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <select v-model="branchFilter" class="form-select fc-brand" style="width:190px" @change="onPeriodChange">
          <option :value="null">All Branches</option>
          <option v-for="b in branches" :key="b.branchid" :value="b.branchid">{{ b.branchname }}</option>
        </select>
      </div>

    <!-- ── GLOBAL ERROR ───────────────────────────────────────── -->
    <div v-if="globalError" class="alert-error mb-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ globalError }}
    </div>

    <!-- ── CHART ERRORS ──────────────────────────────────────── -->
    <div v-if="Object.keys(chartErrors).length" class="alert-warn mb-3">
      <i class="bi bi-info-circle me-2"></i>
      Some charts failed to load:
      <span v-for="(msg, key) in chartErrors" :key="key" class="ms-2">
        <strong>{{ key }}:</strong> {{ msg }}<br>
      </span>
      <small class="d-block mt-1 text-muted">Check the browser console (F12) for full details.</small>
    </div>

    <!-- ── KPI CARDS ──────────────────────────────────────────── -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
        <div class="kpi-card">
          <div v-if="kpiLoading" class="skeleton-block" style="height:70px"></div>
          <template v-else>
            <div class="kpi-top">
              <span class="kpi-label">{{ kpi.label }}</span>
              <div class="kpi-icon"><i :class="kpi.icon"></i></div>
            </div>
            <div class="kpi-value">{{ kpi.value }}</div>
            <div class="kpi-change" :class="kpi.up ? 'up' : 'down'">
              <i class="bi" :class="kpi.up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'"></i>
              {{ kpi.change }} from last period
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ── MAIN TABS ───────────────────────────────────────────── -->
    <div class="tab-bar mb-4">
      <button class="tab-btn" :class="{ active: mainTab === 'analytics' }"
        @click="mainTab = 'analytics'; $nextTick(renderActiveCharts)">
        <i class="bi bi-bar-chart-line me-1"></i> Analytics Dashboard
      </button>
      <button class="tab-btn" :class="{ active: mainTab === 'view' }"
        @click="mainTab = 'view'; loadSavedReports()">
        <i class="bi bi-file-earmark-bar-graph me-1"></i> View Reports
      </button>
      <button class="tab-btn" :class="{ active: mainTab === 'generate' }"
        @click="mainTab = 'generate'">
        <i class="bi bi-file-earmark-plus me-1"></i> Generate Reports
      </button>

    </div>

    <!-- ════════════════════════════════════════════════════════
         TAB 1 — ANALYTICS DASHBOARD
    ═════════════════════════════════════════════════════════ -->
    <div v-show="mainTab === 'analytics'">
      <div class="sub-tab-bar mb-4">
        <button v-for="st in subTabs" :key="st.key"
          class="sub-tab-btn" :class="{ active: subTab === st.key }"
          @click="subTab = st.key; $nextTick(renderActiveCharts)">
          {{ st.label }}
        </button>
      </div>

      <!-- SALES -->
      <div v-show="subTab === 'sales'">
        <div class="row g-3 mb-3">
          <div class="col-12 col-md-7">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Sales Trend</div>
                <div class="chart-sub">Daily revenue · {{ periodLabel }}</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.salesTrend">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.salesTrend">
                <canvas ref="salesTrendChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Order Volume</div>
                <div class="chart-sub">Orders per day</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.orderVolume">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.orderVolume">
                <canvas ref="orderVolumeChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Peak Hours</div>
                <div class="chart-sub">Avg orders per hour — use this to plan staffing</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.peakHours">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.peakHours">
                <canvas ref="peakHoursChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Revenue by Category</div>
                <div class="chart-sub">% of total revenue per product category</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.revCategory">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap chart-wrap--sm" v-show="!chartsLoading.revCategory">
                <canvas ref="revCategoryChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PRODUCTS -->
      <div v-show="subTab === 'products'">
        <div class="row g-3 mb-3">
          <div class="col-12 col-md-7">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Top Selling Products</div>
                <div class="chart-sub">By revenue this {{ period }}</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.topProducts">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.topProducts">
                <canvas ref="topProductsChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Sales by Category</div>
                <div class="chart-sub">Revenue share per category</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.categoryPie">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap chart-wrap--sm" v-show="!chartsLoading.categoryPie">
                <canvas ref="categoryPieChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-title mb-3">Product Performance</div>
          <div class="chart-loading" v-if="chartsLoading.topProducts">
            <div class="spinner-border spinner-border-sm text-muted"></div>
          </div>
          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Avg Price</th></tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in topProductsData" :key="p.product_name">
                  <td class="rank">{{ i + 1 }}</td>
                  <td class="fw-600">{{ p.product_name }}</td>
                  <td><span class="cat-badge">{{ p.category }}</span></td>
                  <td>{{ Number(p.units_sold).toLocaleString() }}</td>
                  <td>₱{{ Number(p.revenue).toLocaleString() }}</td>
                  <td>₱{{ Number(p.avg_price).toFixed(2) }}</td>
                </tr>
                <tr v-if="!topProductsData.length">
                  <td colspan="6" class="text-center text-muted py-3">No product data for this period.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- BRANCHES -->
      <div v-show="subTab === 'branches'">
        <div class="row g-3 mb-3">
          <div class="col-12 col-md-8">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Branch Revenue Comparison</div>
                <div class="chart-sub">Net sales per branch · {{ periodLabel }}</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.branchRevenue">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.branchRevenue">
                <canvas ref="branchRevenueChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-4">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Branch Share</div>
                <div class="chart-sub">% of total revenue</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.branchShare">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap chart-wrap--sm" v-show="!chartsLoading.branchShare">
                <canvas ref="branchShareChart"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-4" v-for="b in branchCompData" :key="b.branch_id">
            <div class="branch-stat-card">
              <div class="bsc-name">{{ b.branch_name }}</div>
              <div class="bsc-revenue">₱{{ Number(b.net_sales).toLocaleString() }}</div>
              <div class="bsc-row"><span>Total Orders</span><span>{{ Number(b.total_orders).toLocaleString() }}</span></div>
              <div class="bsc-row"><span>Avg Order Value</span><span>₱{{ Number(b.avg_order_value).toFixed(0) }}</span></div>
            </div>
          </div>
          <div v-if="!branchCompData.length && !chartsLoading.branchRevenue" class="col-12">
            <p class="text-muted text-center py-3">No branch data for this period.</p>
          </div>
        </div>
      </div>

      <!-- INVENTORY -->
      <div v-show="subTab === 'inventory'">
        <div class="row g-3 mb-3">
          <div class="col-12">
            <div class="chart-card">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div class="chart-title">Low Stock Alerts</div>
                  <div class="chart-sub">Items at or below reorder level — action required</div>
                </div>
                <span v-if="!chartsLoading.lowStock" class="alert-count-badge">
                  {{ lowStockData.length }} items
                </span>
              </div>
              <div class="chart-loading" v-if="chartsLoading.lowStock">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr><th>Item</th><th>Category</th><th>Current Stock</th><th>Reorder Level</th><th>Status</th><th>Expiration</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in lowStockData" :key="item.rawproductid">
                      <td class="fw-600">{{ item.name }}</td>
                      <td>{{ item.category }}</td>
                      <td>{{ item.stockquantity }} {{ item.unit }}</td>
                      <td>{{ item.reorderlevel }} {{ item.unit }}</td>
                      <td>
                        <span class="badge-pill" :class="Number(item.stockquantity) === 0 ? 'badge-danger' : 'badge-warn'">
                          {{ Number(item.stockquantity) === 0 ? 'Out of Stock' : 'Low Stock' }}
                        </span>
                      </td>
                      <td :class="item.days_until_expiry != null && item.days_until_expiry <= 3 ? 'text-danger fw-600' : ''">
                        {{ item.expirationdate || 'N/A' }}
                        <span v-if="item.days_until_expiry != null && item.days_until_expiry <= 0"> (EXPIRED)</span>
                      </td>
                    </tr>
                    <tr v-if="!lowStockData.length">
                      <td colspan="6" class="text-center text-muted py-3">All items are adequately stocked.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Days of Stock Remaining</div>
                <div class="chart-sub">Red = under 3 days, Amber = under 7 days</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.stockTurnover">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.stockTurnover">
                <canvas ref="stockTurnoverChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Daily Consumption Rates</div>
                <div class="chart-sub">How fast each raw material is used per day</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.stockTurnover">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead><tr><th>Item</th><th>Rate / Day</th><th>Days Left</th></tr></thead>
                  <tbody>
                    <tr v-for="item in stockTurnoverData.slice(0, 8)" :key="item.name">
                      <td class="fw-600">{{ item.name }}</td>
          <td>{{ formatRate(item.daily_consumption_rate) }} {{ item.unit }}/day</td>
          <td :class="item.days_of_stock_remaining != null && item.days_of_stock_remaining <= 3
            ? 'text-danger fw-600' : ''">
            {{ formatTimeRemaining(item.days_of_stock_remaining) }}
          </td>
                    </tr>
                    <tr v-if="!stockTurnoverData.length">
                      <td colspan="3" class="text-center text-muted py-3">No turnover data.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div><!-- end analytics tab -->

    <!-- ════════════════════════════════════════════════════════
         TAB 2 — VIEW REPORTS
    ═════════════════════════════════════════════════════════ -->
    <div v-show="mainTab === 'view'">
      <div class="row g-3">
        <div class="col-12">
          <div class="report-type-bar">
            <button v-for="rc in reportCategories" :key="rc.key"
              class="rt-btn" :class="{ active: viewCategoryFilter === rc.key }"
              @click="viewCategoryFilter = rc.key; loadSavedReports()">
              <i :class="rc.icon"></i> {{ rc.label }}
            </button>
          </div>
        </div>
        <div class="col-12">
          <div class="filter-bar d-flex flex-wrap gap-2 align-items-center">
            <input v-model="viewSearch" type="text" class="form-control fc-brand"
              style="width:230px" placeholder="Search reports…" @input="loadSavedReports" />
            <input v-model="viewDateFrom" type="date" class="form-control fc-brand"
              style="width:160px" @change="loadSavedReports" />
            <input v-model="viewDateTo" type="date" class="form-control fc-brand"
              style="width:160px" @change="loadSavedReports" />
            <button class="btn btn-ghost btn-sm"
              @click="viewSearch=''; viewDateFrom=''; viewDateTo=''; loadSavedReports()">
              Clear
            </button>
          </div>
        </div>
        <div class="col-12">
          <div class="chart-card p-0">
            <div class="chart-loading py-5" v-if="reportsListLoading">
              <div class="spinner-border text-primary-brand"></div>
              <span class="ms-3 text-muted fw-600">Retrieving report archive...</span>
            </div>
            <div v-else class="table-wrap">
              <table class="data-table reports-table">
                <thead>
                  <tr>
                    <th class="col-id">ID</th>
                    <th class="col-title">Report Title</th>
                    <th class="col-category">Category</th>
                    <th class="col-period">Coverage Period</th>
                    <th class="col-created">Created</th>
                    <th class="col-branch">Branch</th>
                    <th class="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in savedReports" :key="r.reportid" class="report-row">
                    <td class="col-id">
                      <span class="report-id-badge">#{{ String(r.reportid).padStart(4, '0') }}</span>
                    </td>
                    <td class="col-title">
                      <div class="report-title-cell">
                        <div class="report-title-main">{{ r.reporttitle }}</div>
                        <div class="report-title-sub">Generated by {{ r.generatedby?.firstname || 'Admin' }}</div>
                      </div>
                    </td>
                    <td class="col-category">
                      <span class="report-type-badge" :class="'type-' + getCategorySlug(r.reporttype)">
                        {{ getReportTypeLabel(r.reporttype) }}
                      </span>
                    </td>
                    <td class="col-period">
                      <span class="period-text">{{ formatPeriod(r) }}</span>
                    </td>
                    <td class="col-created">
                      {{ formatDate(r.createdat || r.reportdate) }}
                    </td>
                    <td class="col-branch">
                      <span class="badge-branch">{{ r.branch?.BranchName || 'All Branches' }}</span>
                    </td>
                    <td class="col-actions">
                      <div class="action-buttons-group">
                        <button class="action-btn preview" 
                          @click="openPreview(r)" 
                          title="View Details"
                          aria-label="View report details">
                          <i class="bi bi-info-circle"></i>
                        </button>
                        <button class="action-btn download" 
                          @click="reDownloadReport(r)" 
                          title="Re-download File"
                          aria-label="Download report file">
                          <i class="bi bi-cloud-download"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!savedReports.length">
                    <td colspan="7" class="col-empty">
                      <div class="empty-state">
                        <div class="empty-state-icon">
                          <i class="bi bi-folder2-open"></i>
                        </div>
                        <div class="empty-state-title">No Reports Found</div>
                        <p class="empty-state-description">No reports matching your filters were found.</p>
                        <button class="btn btn-sm btn-primary-brand" @click="mainTab = 'generate'">
                          <i class="bi bi-file-earmark-plus me-1"></i> Generate First Report
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════
         TAB 3 — GENERATE REPORTS
    ═════════════════════════════════════════════════════════ -->
    <div v-show="mainTab === 'generate'">
      <div class="row g-4">

        <!-- LEFT: config -->
        <div class="col-12 col-lg-5">
          <div class="gen-panel">
            <div class="gen-panel-title">Report Configuration</div>
            <div class="gen-panel-sub mb-4">Set your parameters then click Generate</div>

            <div class="mb-3">
              <label class="form-label-sm">Report Category</label>
              <select v-model="genForm.category" class="form-select fc-brand" @change="genForm.type = ''">
                <option value="" disabled>Select category</option>
                <option v-for="rc in reportCategories.filter(r => r.key !== 'all')" :key="rc.key" :value="rc.key">
                  {{ rc.label }}
                </option>
              </select>
              <div v-if="genErrors.category" class="field-error">{{ genErrors.category }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Report Type</label>
              <select v-model="genForm.type" class="form-select fc-brand" :disabled="!genForm.category">
                <option value="" disabled>Select report type</option>
                <option v-for="t in availableTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
              <div v-if="genErrors.type" class="field-error">{{ genErrors.type }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Date From</label>
              <input v-model="genForm.dateFrom" type="date" class="form-control fc-brand" />
              <div v-if="genErrors.dateFrom" class="field-error">{{ genErrors.dateFrom }}</div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Date To</label>
              <input v-model="genForm.dateTo" type="date" class="form-control fc-brand" />
              <div v-if="genErrors.dateTo" class="field-error">{{ genErrors.dateTo }}</div>
            </div>

            <div class="mb-3" v-if="genForm.category !== 'consolidated'">
              <label class="form-label-sm">Branch</label>
              <select v-model="genForm.branchId" class="form-select fc-brand">
                <option :value="null">All Branches</option>
                <option v-for="b in branches" :key="b.branchid" :value="b.branchid">{{ b.branchname }}</option>
              </select>
            </div>
            <div class="mb-3" v-else>
              <div class="info-box">
                <i class="bi bi-info-circle me-2"></i>
                Consolidated report fetches and combines data across <strong>all branches</strong>.
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label-sm">Export Format</label>
              <div class="format-grid">
                <label v-for="fmt in formats" :key="fmt.value"
                  class="format-opt" :class="{ active: genForm.format === fmt.value }">
                  <input type="radio" v-model="genForm.format" :value="fmt.value" hidden />
                  <i :class="fmt.icon"></i>
                  <span>{{ fmt.label }}</span>
                </label>
              </div>
            </div>

            <div class="mb-3">
              <label class="d-flex align-items-center gap-2" style="cursor:pointer;font-size:.82rem">
                <input type="checkbox" v-model="genForm.saveToCloud" class="form-check-input" />
                <span>Save to cloud storage after generation</span>
              </label>
            </div>

            <button class="btn btn-generate w-100 mb-2" @click="generateReport" :disabled="generating">
              <span v-if="generating" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else class="bi bi-file-earmark-arrow-down me-2"></i>
              {{ generating ? 'Generating…' : 'Generate Report' }}
            </button>
            <button class="btn btn-gray w-100" @click="resetGenForm">Reset</button>
          </div>
        </div>

        <!-- RIGHT: templates -->
        <div class="col-12 col-lg-7">
          <div class="fw-700 mb-3" style="font-size:.95rem">Quick Report Templates</div>
          <div class="row g-3">
            <div class="col-12 col-md-6" v-for="tpl in reportTemplates" :key="tpl.key">
              <div class="tpl-card" @click="applyTemplate(tpl)">
                <div class="tpl-card-top">
                  <div class="tpl-icon" :class="'tpl-icon--' + tpl.color"><i :class="tpl.icon"></i></div>
                  <div class="tpl-formats">
                    <span v-for="f in tpl.formats" :key="f" class="tpl-fmt">{{ f }}</span>
                  </div>
                </div>
                <div class="tpl-name">{{ tpl.name }}</div>
                <div class="tpl-desc">{{ tpl.desc }}</div>
                <button class="tpl-select-btn" @click.stop="applyTemplate(tpl)">Select</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── PREVIEW MODAL ──────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
        <div class="modal-panel modal-panel--lg">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">{{ previewData?.reporttitle }}</h5>
              <p class="modal-sub mb-0">
                {{ formatDate(previewData?.reportdate) }} · {{ previewData?.branch?.branchname || 'All Branches' }}
              </p>
            </div>
            <button class="btn-close-panel" @click="showPreview = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-panel-body">
            <span class="preview-type-badge">{{ previewData?.reporttype }}</span>
            <div class="preview-placeholder mt-3">
              <i class="bi bi-file-earmark-bar-graph fs-1 text-muted"></i>
              <p class="text-muted mt-2 mb-0">
                To re-export this report, use the Generate tab with the same parameters.<br />
                <span v-if="previewData?.filepath">File saved at: <code>{{ previewData.filepath }}</code></span>
              </p>
              <a v-if="previewData?.filepath" :href="previewData.filepath" target="_blank"
                class="btn btn-primary-brand mt-3" style="display:inline-block">
                <i class="bi bi-download me-1"></i> Download File
              </a>
            </div>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showPreview = false">Close</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i class="bi" :class="toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
        {{ toast.message }}
      </div>
    </Teleport>

  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import {
  getDateRange,
  getKpiSummary,
  getSalesTrend,
  getPeakHours,
  getRevenueByCategory,
  getTopProducts,
  getBranchComparison,
  getLowStockItems,
  getStockTurnover,
  getSavedReports,
  saveReportRecord,
  fetchReportData,
  getBranches,
  uploadReportFile,
} from '../../services/reportService.js'
import { exportPDF }   from '../../services/pdfExporter.js'
import { exportExcel } from '../../services/excelExporter.js'
import { generateInsights } from '../../services/aiService.js'
import { supabase } from '../../supabase.js'

Chart.register(...registerables)

const BRAND   = '#2D5A7B'
const PALETTE = ['#2D5A7B','#50B86C','#E8A838','#7B5EA7','#36B5A0','#E67E3A','#5D9CEC']
const GRAY    = '#6b7280'
const GRID    = '#f0ebe8'
const LBL     = { size: 10, family: 'inherit' }

function baseOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#374151', font: LBL, padding: 10 } },
      ...extra.plugins,
    },
    scales: {
      x: { ticks: { color: GRAY, font: LBL }, grid: { color: GRID } },
      y: { ticks: { color: GRAY, font: LBL }, grid: { color: GRID } },
      ...extra.scales,
    },
  }
}

export default {
  name: 'ReportsAnalytics',

  data() {
    const today   = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    return {
      // UI
      mainTab: 'analytics',
      subTab:  'sales',
      period:  'week',
      branchFilter: null,
      showPreview: false,
      previewData: null,
      generating: false,
      globalError: null,

      // Loading flags
      kpiLoading: false,
      reportsListLoading: false,
      chartsLoading: {
        salesTrend: false, orderVolume: false, peakHours: false, revCategory: false,
        topProducts: false, categoryPie: false,
        branchRevenue: false, branchShare: false,
        lowStock: false, stockTurnover: false,
      },
      chartErrors: {},

      _charts: {},

      // Data
      kpis: [
        { label: 'Total Sales',     value: '—', change: '—', up: true, icon: 'bi bi-currency-dollar' },
        { label: 'Total Orders',    value: '—', change: '—', up: true, icon: 'bi bi-receipt'         },
        { label: 'Avg Order Value', value: '—', change: '—', up: true, icon: 'bi bi-graph-up'        },
        { label: 'Active Products', value: '—', change: '—', up: true, icon: 'bi bi-box-seam'        },
      ],
      salesTrendData:    [],
      peakHoursData:     [],
      revCategoryData:   [],
      topProductsData:   [],
      branchCompData:    [],
      lowStockData:      [],
      stockTurnoverData: [],
      savedReports:      [],
      branches:          [],

      // View Reports
      viewCategoryFilter: 'all',
      viewSearch:   '',
      viewDateFrom: '',
      viewDateTo:   '',

      // Generate
      genForm: { category: '', type: '', dateFrom: weekAgo, dateTo: today, branchId: null, format: 'pdf', saveToCloud: false },
      genErrors: {},

      toast: { show: false, message: '', type: 'success' },
      insightsLoading: false,
      insightsData: null,
      insightsLastRun: null,

      // Static config
      subTabs: [
        { key: 'sales',     label: 'Sales'     },
        { key: 'products',  label: 'Products'  },
        { key: 'branches',  label: 'Branches'  },
        { key: 'inventory', label: 'Inventory' },
      ],

      reportCategories: [
        { key: 'all',          label: 'All Reports',  icon: 'bi bi-grid'            },
        { key: 'sales',        label: 'Sales',        icon: 'bi bi-currency-dollar' },
        { key: 'inventory',    label: 'Inventory',    icon: 'bi bi-box-seam'        },
        { key: 'schedule',     label: 'Schedule',     icon: 'bi bi-calendar3'       },
        { key: 'consolidated', label: 'Consolidated', icon: 'bi bi-collection'      },
      ],

      reportTypeMap: {
        sales: [
          { value: 'sales-pipeline',    label: 'Sales Pipeline Report'    },
          { value: 'sales-performance', label: 'Sales Performance Report' },
          { value: 'sales-forecast',    label: 'Sales Forecast Report'    },
          { value: 'sales-monthly',     label: 'Monthly Summary Report'   },
          { value: 'sales-weekly',      label: 'Weekly Summary Report'    },
        ],
        inventory: [
          { value: 'inventory-on-hand', label: 'Inventory on Hand Report' },
          { value: 'inventory-aging',   label: 'Inventory Aging Report'   },
          { value: 'stock-turnover',    label: 'Stock Turnover Report'    },
          { value: 'low-inventory',     label: 'Low Inventory Report'     },
          { value: 'inventory-monthly', label: 'Monthly Summary Report'   },
          { value: 'inventory-weekly',  label: 'Weekly Summary Report'    },
        ],
        schedule: [
          { value: 'employee-schedule', label: 'Employee Schedule Report' },
        ],
        consolidated: [
          { value: 'consolidated-report', label: 'Consolidated Report (All Branches)' },
        ],
      },

      formats: [
        { value: 'pdf',   label: 'PDF',   icon: 'bi bi-file-earmark-pdf'  },
        { value: 'excel', label: 'Excel', icon: 'bi bi-file-earmark-excel' },
      ],

      reportTemplates: [
        { key: 'daily-sales',    name: 'Daily Sales Report',          desc: 'Detailed breakdown of daily sales transactions',          icon: 'bi bi-receipt',              color: 'brown',  category: 'sales',        type: 'sales-pipeline',      formats: ['PDF','Excel'] },
        { key: 'monthly-rev',    name: 'Monthly Revenue Report',      desc: 'Comprehensive monthly revenue analysis',                  icon: 'bi bi-graph-up-arrow',       color: 'green',  category: 'sales',        type: 'sales-monthly',       formats: ['PDF','Excel']       },
        { key: 'inv-status',     name: 'Inventory Status Report',     desc: 'Current stock levels for all raw materials',              icon: 'bi bi-box-seam',             color: 'blue',   category: 'inventory',    type: 'inventory-on-hand',   formats: ['PDF','Excel'] },
        { key: 'low-stock',      name: 'Low Stock Alert Report',      desc: 'Items that need immediate reordering',                    icon: 'bi bi-exclamation-triangle', color: 'red',    category: 'inventory',    type: 'low-inventory',       formats: ['PDF','Excel']       },
        { key: 'aging',          name: 'Inventory Aging Report',      desc: 'Items nearing expiration — prevent food waste',           icon: 'bi bi-clock-history',        color: 'gold',   category: 'inventory',    type: 'inventory-aging',     formats: ['PDF','Excel']       },
        { key: 'top-products',   name: 'Top Selling Products',        desc: 'Best-performing menu items this period',                  icon: 'bi bi-star',                 color: 'gold',   category: 'sales',        type: 'sales-performance',   formats: ['PDF','Excel']       },
        { key: 'employee-sched', name: 'Employee Schedule Report',    desc: 'Staff shift assignments and schedule summary',            icon: 'bi bi-person-lines-fill',    color: 'purple', category: 'schedule',     type: 'employee-schedule',   formats: ['PDF','Excel']       },
        { key: 'consolidated',   name: 'Branch Consolidated Report',  desc: 'Combined performance data across all branches',           icon: 'bi bi-diagram-3',            color: 'teal',   category: 'consolidated', type: 'consolidated-report', formats: ['PDF','Excel']       },
      ],
    }
  },

  computed: {
    periodLabel() {
      return { week: 'past 7 days', month: 'this month', year: 'this year' }[this.period]
    },
    availableTypes() {
      return this.reportTypeMap[this.genForm.category] || []
    },
  },

  async mounted() {
    await this.loadBranches()
    await this.loadAnalyticsData()
    this.$nextTick(() => this.renderActiveCharts())
    this.loadInsights() // generate notifications silently
  },

  beforeUnmount() {
    Object.values(this._charts).forEach(c => c?.destroy())
  },

  methods: {
    // ── LOADERS ──────────────────────────────────────────────────

    async loadBranches() {
      const { data, error } = await getBranches()
      if (!error) this.branches = data || []
    },

    async onPeriodChange() {
      await this.loadAnalyticsData()
      this.$nextTick(() => this.renderActiveCharts())
      this.loadInsights() // generate notifications silently
    },

    async loadAnalyticsData() {
      const { from, to } = getDateRange(this.period)
      const branch = this.branchFilter

      // KPIs
      this.kpiLoading = true
      const { data: kpiRaw, error: kpiErr } = await getKpiSummary(from, to, branch)
      this.kpiLoading = false

      if (kpiErr) {
        this.globalError = 'Failed to load KPIs: ' + kpiErr.message
        return
      }

      const k = kpiRaw?.[0] || {}
      const pctChange = (curr, prev) => {
        curr = Number(curr) || 0; prev = Number(prev) || 0
        if (!prev) return { val: 'N/A', up: true }
        const pct = ((curr - prev) / prev * 100).toFixed(1)
        return { val: (pct > 0 ? '+' : '') + pct + '%', up: Number(pct) >= 0 }
      }
      const sc = pctChange(k.total_sales,  k.prev_total_sales)
      const oc = pctChange(k.total_orders, k.prev_total_orders)

      this.kpis = [
        { label: 'Total Sales',     value: '₱' + Number(k.total_sales    || 0).toLocaleString(), change: sc.val, up: sc.up, icon: 'bi bi-currency-dollar' },
        { label: 'Total Orders',    value:       Number(k.total_orders   || 0).toLocaleString(),  change: oc.val, up: oc.up, icon: 'bi bi-receipt'         },
        { label: 'Avg Order Value', value: '₱' + Number(k.avg_order_value || 0).toFixed(2),       change: '—',   up: true,  icon: 'bi bi-graph-up'        },
        { label: 'Active Products', value:       Number(k.active_products || 0).toLocaleString(), change: '—',   up: true,  icon: 'bi bi-box-seam'        },
      ]

      // All chart data in parallel
      await Promise.all([
        this.loadSalesTrend(from, to, branch),
        this.loadPeakHours(from, to, branch),
        this.loadRevCategory(from, to, branch),
        this.loadTopProducts(from, to, branch),
        this.loadBranchComp(from, to, branch),
        this.loadLowStock(from, to, branch),
        this.loadStockTurnover(from, to, branch),
      ])
    },

    async loadChart(key, loader, dataProp) {
      this.chartsLoading[key] = true
      delete this.chartErrors[key]
      const { data, error } = await loader()
      this.chartsLoading[key] = false
      if (error) {
        console.error(`[Reports] ${key} query failed:`, error)
        this.chartErrors[key] = error.message
      } else {
        this[dataProp] = data || []
      }
    },

    async loadSalesTrend(from, to, branch) {
      this.chartsLoading.salesTrend = this.chartsLoading.orderVolume = true
      delete this.chartErrors.salesTrend; delete this.chartErrors.orderVolume
      const { data, error } = await getSalesTrend(from, to, branch)
      this.chartsLoading.salesTrend = this.chartsLoading.orderVolume = false
      if (error) {
        console.error('[Reports] SalesTrend query failed:', error)
        this.chartErrors.salesTrend = error.message
      } else {
        this.salesTrendData = data || []
      }
    },

    async loadPeakHours(from, to, branch) {
      await this.loadChart('peakHours',
        () => getPeakHours(from, to, branch), 'peakHoursData')
    },

    async loadRevCategory(from, to, branch) {
      await this.loadChart('revCategory',
        () => getRevenueByCategory(from, to, branch), 'revCategoryData')
    },

    async loadTopProducts(from, to, branch) {
      this.chartsLoading.topProducts = this.chartsLoading.categoryPie = true
      delete this.chartErrors.topProducts; delete this.chartErrors.categoryPie
      const { data, error } = await getTopProducts(from, to, branch, 10)
      this.chartsLoading.topProducts = this.chartsLoading.categoryPie = false
      if (error) {
        console.error('[Reports] TopProducts query failed:', error)
        this.chartErrors.topProducts = error.message
      } else {
        this.topProductsData = data || []
      }
    },

    async loadBranchComp(from, to, branch) {
      this.chartsLoading.branchRevenue = this.chartsLoading.branchShare = true
      delete this.chartErrors.branchRevenue; delete this.chartErrors.branchShare
      const { data, error } = await getBranchComparison(from, to, branch)
      this.chartsLoading.branchRevenue = this.chartsLoading.branchShare = false
      if (error) {
        console.error('[Reports] BranchComp query failed:', error)
        this.chartErrors.branchRevenue = error.message
      } else {
        this.branchCompData = data || []
      }
    },

    async loadLowStock(from, to, branch) {
      this.chartsLoading.lowStock = true
      delete this.chartErrors.lowStock
      const { data, error } = await getLowStockItems(from, to, branch)
      this.chartsLoading.lowStock = false
      if (error) {
        console.error('[Reports] LowStock query failed:', error)
        this.chartErrors.lowStock = error.message
      } else {
        this.lowStockData = data || []
      }
    },

    async loadStockTurnover(from, to, branch) {
      await this.loadChart('stockTurnover',
        () => getStockTurnover(from, to, branch), 'stockTurnoverData')
    },

    async loadSavedReports() {
      this.reportsListLoading = true
      const types = this.viewCategoryFilter !== 'all'
        ? this.reportTypeMap[this.viewCategoryFilter]?.map(t => t.value)
        : undefined
      const { data, error } = await getSavedReports({
        types, dateFrom: this.viewDateFrom || undefined, dateTo: this.viewDateTo || undefined,
      })
      this.reportsListLoading = false
      if (error) { this.showToast('Failed to load reports: ' + error.message, 'error'); return }
      let rows = data || []
      if (this.viewSearch) {
        const q = this.viewSearch.toLowerCase()
        rows = rows.filter(r => r.reporttitle.toLowerCase().includes(q) || r.reporttype.toLowerCase().includes(q))
      }
      this.savedReports = rows
    },

    async loadInsights() {
      if (this.insightsLoading) return
      this.insightsLoading = true
      try {
        const { from, to } = getDateRange(this.period)
        const branch = this.branchFilter

        const [kpiRes, agingRes, schedRes] = await Promise.all([
          getKpiSummary(from, to, branch),
          supabase.rpc('get_inventory_aging', { p_date_from: from, p_date_to: to, p_branch_id: branch || null }),
          supabase.rpc('report_employee_schedule', { p_date_from: from, p_date_to: to, p_branch_id: branch || null }),
        ])

        this.insightsData = generateInsights({
          kpiSummary: kpiRes.data || [],
          salesTrend: this.salesTrendData,
          peakHours: this.peakHoursData,
          revenueByCategory: this.revCategoryData,
          topProducts: this.topProductsData,
          branchComparison: this.branchCompData,
          lowStock: this.lowStockData,
          stockTurnover: this.stockTurnoverData,
          inventoryAging: agingRes.data || [],
          scheduleData: schedRes.data || [],
        })
        this.insightsLastRun = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
        // Bridge high/medium findings to notifications
        const role = localStorage.getItem('role') || 'admin'
        const notifBranchId = branch || null
        for (const f of (this.insightsData?.findings || [])) {
          if (f.severity !== 'high' && f.severity !== 'medium') continue
          const linkPath = f.link?.module
            ? `/${role}/${f.link.module}`
            : null
          await supabase.from('notifications').insert({
            role,
            branch_id: notifBranchId,
            category: f.category,
            title: f.title,
            message: f.description,
            severity: f.severity,
            link: linkPath,
            is_read: false,
            created_at: new Date().toISOString(),
          }).maybeSingle()
        }
      } catch (err) {
        console.error('[Insights] Failed:', err)
        this.insightsData = { findings: [], priorities: [], summary: 'Failed to analyze data.' }
      } finally {
        this.insightsLoading = false
      }
    },

    // ── CHARTS ───────────────────────────────────────────────────

    renderActiveCharts() {
      if (this.mainTab !== 'analytics') return
      if (this.subTab === 'sales')     this.renderSalesCharts()
      if (this.subTab === 'products')  this.renderProductCharts()
      if (this.subTab === 'branches')  this.renderBranchCharts()
      if (this.subTab === 'inventory') this.renderInventoryCharts()
    },

    destroyChart(key) { this._charts[key]?.destroy(); delete this._charts[key] },

    makeChart(key, refName, config) {
      this.destroyChart(key)
      const el = this.$refs[refName]
      if (!el) return
      this._charts[key] = new Chart(el, config)
    },

    renderSalesCharts() {
      const labels  = this.salesTrendData.map(r => r.sale_date)
      const sales   = this.salesTrendData.map(r => Number(r.net_sales))
      const orders  = this.salesTrendData.map(r => Number(r.order_count))

      this.makeChart('salesTrend', 'salesTrendChart', {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue (₱)', data: sales, borderColor: BRAND, backgroundColor: 'rgba(123,29,29,0.10)', tension: 0.4, fill: true, pointBackgroundColor: BRAND, pointRadius: 4, pointHoverRadius: 6 }] },
        options: { ...baseOpts(), plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₱' + Number(c.raw).toLocaleString() } } } },
      })

      this.makeChart('orderVolume', 'orderVolumeChart', {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Orders', data: orders, backgroundColor: BRAND, borderRadius: 5 }] },
        options: { ...baseOpts(), plugins: { legend: { display: false } } },
      })

      const hLabels = this.peakHoursData.map(r => r.hour + ':00')
      const hVals   = this.peakHoursData.map(r => Number(r.avg_orders))

      this.makeChart('peakHours', 'peakHoursChart', {
        type: 'bar',
        data: { labels: hLabels, datasets: [{ label: 'Avg Orders', data: hVals, backgroundColor: hVals.map(v => v >= 40 ? BRAND : v >= 20 ? '#5D9CEC' : '#B0D4F1'), borderRadius: 4 }] },
        options: { ...baseOpts(), plugins: { legend: { display: false } } },
      })

      const cLabels = this.revCategoryData.map(r => r.category)
      const cVals   = this.revCategoryData.map(r => Number(r.percentage ?? r.pct))

      this.makeChart('revCategory', 'revCategoryChart', {
        type: 'doughnut',
        data: { labels: cLabels, datasets: [{ data: cVals, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#374151', font: LBL, padding: 8 } }, tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + '%' } } } },
      })
    },

    renderProductCharts() {
      const names = this.topProductsData.map(p => p.product_name.length > 16 ? p.product_name.slice(0,16) + '…' : p.product_name)
      const revs  = this.topProductsData.map(p => Number(p.revenue))

      this.makeChart('topProducts', 'topProductsChart', {
        type: 'bar',
        data: { labels: names, datasets: [{ label: 'Revenue (₱)', data: revs, backgroundColor: PALETTE, borderRadius: 5 }] },
        options: { ...baseOpts(), indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₱' + Number(c.raw).toLocaleString() } } } },
      })

      const catLabels = this.revCategoryData.map(r => r.category)
      const catRevs   = this.revCategoryData.map(r => Number(r.revenue))

      this.makeChart('categoryPie', 'categoryPieChart', {
        type: 'pie',
        data: { labels: catLabels, datasets: [{ data: catRevs, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#374151', font: LBL, padding: 8 } }, tooltip: { callbacks: { label: c => c.label + ': ₱' + Number(c.raw).toLocaleString() } } } },
      })
    },

    renderBranchCharts() {
      const names = this.branchCompData.map(b => b.branch_name)
      const revs  = this.branchCompData.map(b => Number(b.net_sales))

      this.makeChart('branchRevenue', 'branchRevenueChart', {
        type: 'bar',
        data: { labels: names, datasets: [{ label: 'Net Sales (₱)', data: revs, backgroundColor: PALETTE, borderRadius: 5 }] },
        options: { ...baseOpts(), plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₱' + Number(c.raw).toLocaleString() } } } },
      })

      this.makeChart('branchShare', 'branchShareChart', {
        type: 'doughnut',
        data: { labels: names, datasets: [{ data: revs, backgroundColor: PALETTE.slice(0, names.length), borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#374151', font: LBL } }, tooltip: { callbacks: { label: c => c.label + ': ₱' + Number(c.raw).toLocaleString() } } } },
      })
    },

    renderInventoryCharts() {
      const top8 = this.stockTurnoverData.slice(0, 8)
      const names = top8.map(r => r.name.length > 18 ? r.name.slice(0, 18) + '…' : r.name)
      const days  = top8.map(r => Number(r.days_of_stock_remaining) || 0)

      const fmt = this.formatTimeRemaining
      this.makeChart('stockTurnover', 'stockTurnoverChart', {
        type: 'bar',
        data: { labels: names, datasets: [{ label: 'Days Remaining', data: days, backgroundColor: days.map(d => d <= 3 ? '#E67E3A' : d <= 7 ? '#E8A838' : '#8D8D8D'), borderRadius: 4 }] },
        options: { ...baseOpts(), indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } } },
      })
    },

    // ── GENERATE ─────────────────────────────────────────────────

    validateGenForm() {
      const e = {}
      if (!this.genForm.category) e.category = 'Select a report category.'
      if (!this.genForm.type)     e.type     = 'Select a report type.'
      if (!this.genForm.dateFrom) e.dateFrom = 'Date from is required.'
      if (!this.genForm.dateTo)   e.dateTo   = 'Date to is required.'
      if (this.genForm.dateFrom && this.genForm.dateTo && this.genForm.dateFrom > this.genForm.dateTo)
        e.dateTo = 'Date To must be after Date From.'
      this.genErrors = e
      return !Object.keys(e).length
    },

    async generateReport() {
      if (!this.validateGenForm()) return
      this.generating = true
      try {
        // 1. Fetch data from Supabase
        const { data: rows, raw: rawRows, error } = await fetchReportData(this.genForm.type, {
          dateFrom: this.genForm.dateFrom,
          dateTo:   this.genForm.dateTo,
          branchId: this.genForm.branchId,
        })
        if (error) throw new Error(error.message)
        if (!rows || rows.length === 0) {
          console.warn('[Reports] fetchReportData returned empty:', { type: this.genForm.type, dateFrom: this.genForm.dateFrom, dateTo: this.genForm.dateTo, branchId: this.genForm.branchId, rawData: rawRows })
          this.showToast('No data found for the selected period and filters. Check console (F12) for details.', 'error')
          return
        }

        // 2. Build meta
        const typeDef    = this.availableTypes.find(t => t.value === this.genForm.type)
        const branchName = this.genForm.branchId
          ? this.branches.find(b => b.branchid === this.genForm.branchId)?.branchname || 'Branch'
          : 'All Branches'
        const meta = {
          title:       typeDef?.label || this.genForm.type,
          dateFrom:    this.genForm.dateFrom,
          dateTo:      this.genForm.dateTo,
          branch:      branchName,
          generatedBy: localStorage.getItem('username') || localStorage.getItem('role') || 'Admin',
        }

        // 3. Export — triggers browser download
        const insightsData = this.insightsData || undefined
        let fileBuffer = null
        let contentType = ''
        if (this.genForm.format === 'pdf') {
          fileBuffer = await exportPDF(this.genForm.type, rawRows || rows, meta, insightsData)
          contentType = 'application/pdf'
        }
        if (this.genForm.format === 'excel') {
          fileBuffer = await exportExcel(this.genForm.type, rows, meta)
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        // 4. Upload to cloud storage if opted in
        let filePath = null
        if (this.genForm.saveToCloud && fileBuffer) {
          const ts = Date.now()
          const ext = this.genForm.format === 'pdf' ? 'pdf' : 'xlsx'
          const fileName = `${this.genForm.type.replace(/[^a-z0-9]/g, '-')}-${ts}.${ext}`
          const { filePath: uploadedPath, publicUrl, error: uploadErr } = await uploadReportFile(fileBuffer, fileName, contentType)
          if (uploadErr) {
            console.error('[Reports] Storage upload failed:', uploadErr)
            if (uploadErr.message?.includes('Bucket not found')) {
              this.showToast('Storage bucket "reports" not found — create it in Supabase Storage dashboard', 'error')
            } else {
              this.showToast('Cloud upload failed: ' + (uploadErr.message || 'unknown error'), 'error')
            }
          } else {
            filePath = publicUrl || uploadedPath
          }
        }

        // 5. Save record in Supabase
        const { error: saveErr } = await saveReportRecord({
          type:        this.genForm.type,
          title:       meta.title + ` (${this.genForm.dateFrom} – ${this.genForm.dateTo})`,
          branchId:    this.genForm.branchId,
          generatedBy: Number(localStorage.getItem('userId')) || null,
          filePath:    filePath,
        })
        if (saveErr) console.error('[Reports] Failed to save report record:', saveErr)

        this.showToast('Report exported as ' + this.genForm.format.toUpperCase() + ' successfully!', 'success')
        this.mainTab = 'view'
        await this.loadSavedReports()

      } catch (err) {
        this.showToast('Export failed: ' + err.message, 'error')
      } finally {
        this.generating = false
      }
    },

    applyReportLink(link) {
      if (!link || !link.module) return
      const role = localStorage.getItem('role') || 'admin'
      const base = role === 'staff' ? '/staff' : role === 'manager' ? '/manager' : '/admin'
      const routes = { inventory: '/inventory', sales: '/sales', schedule: '/schedule' }
      const path = routes[link.module]
      if (!path) return
      const fullPath = base + path
      if (this.$route.path !== fullPath) {
        this.$router.push(fullPath)
      }
    },

    applyTemplate(tpl) {
      this.genForm.category = tpl.category
      this.genForm.type     = tpl.type
      this.mainTab          = 'generate'
      this.showToast(`Template "${tpl.name}" applied.`, 'success')
    },

    resetGenForm() {
      const today   = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      this.genForm  = { category: '', type: '', dateFrom: weekAgo, dateTo: today, branchId: null, format: 'pdf', saveToCloud: false }
      this.genErrors = {}
    },

    openPreview(r) { this.previewData = r; this.showPreview = true },

    getReportTypeLabel(type) {
      const map = {}
      for (const cat of Object.values(this.reportTypeMap))
        for (const t of cat) map[t.value] = t.label
      return map[type] || type
    },

    getCategorySlug(type) {
      const map = {
        'Sales': 'sales', 'Inventory': 'inventory', 'Schedule': 'schedule', 'Consolidated': 'consolidated',
      }
      return map[type] || (type || '').toLowerCase().replace(/\s+/g, '-')
    },

    getSlugFromTitle(title) {
      return (title || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    },

    formatRate(rate) {
      if (rate == null || isNaN(rate)) return '—'
      return Math.round(Number(rate))
    },

    formatTimeRemaining(days) {
      if (days == null || isNaN(days)) return '—'
      const totalMin = Math.round(Number(days) * 24 * 60)
      const d = Math.floor(totalMin / 1440)
      const h = Math.floor((totalMin % 1440) / 60)
      const m = totalMin % 60
      if (d > 0) return `${d}d ${h}h ${m}m`
      if (h > 0) return `${h}h ${m}m`
      return `${m}m`
    },

    formatDate(d) {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    },

    formatPeriod(report) {
      if (!report) return '—'
      const from = report.date_from || report.dateFrom
      const to = report.date_to || report.dateTo
      if (from && to) {
        const fromDate = new Date(from).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        const toDate = new Date(to).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${fromDate} – ${toDate}`
      }
      if (report.reportdate) {
        return new Date(report.reportdate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return '—'
    },

    reDownloadReport(r) {
      if (r?.filepath) {
        window.open(r.filepath, '_blank')
      } else {
        this.showToast('No file available for this report.', 'error')
      }
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => { this.toast.show = false }, 3500)
    },
  },
}
</script>

<style scoped>
:root { --brand:#7B1D1D; --brand2:#A83232; --border:#e5e0dd; --shadow:0 2px 10px rgba(0,0,0,.07); --text:#1a1a1a; --muted:#6b7280; }
.reports-page { padding:1.5rem; background:#f4f1ef; min-height:100vh; }
.page-title   { font-size:1.35rem; font-weight:700; color:#1a1a1a; }
.page-sub     { font-size:.82rem; color:#6b7280; }

/* KPI */
.kpi-card  { background:#fff; border-radius:10px; padding:1.1rem 1.25rem; box-shadow:var(--shadow); border:1px solid var(--border); }
.kpi-top   { display:flex; align-items:center; justify-content:space-between; margin-bottom:.5rem; }
.kpi-label { font-size:.72rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; }
.kpi-icon  { color:#7B1D1D; font-size:1rem; }
.kpi-value { font-size:1.65rem; font-weight:800; color:#1a1a1a; line-height:1.1; }
.kpi-change{ font-size:.72rem; margin-top:.3rem; display:flex; align-items:center; gap:.2rem; }
.kpi-change.up { color:#16a34a; } .kpi-change.down { color:#7B1D1D; }
.skeleton-block { background:linear-gradient(90deg,#f0ebe8 25%,#f9f5f3 50%,#f0ebe8 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
@keyframes shimmer { to { background-position:-200% 0; } }

/* Tabs */
.tab-bar { display:flex; gap:.25rem; border-bottom:2px solid var(--border); }
.tab-btn { background:none; border:none; padding:.65rem 1.1rem; font-size:.84rem; font-weight:600; color:#6b7280; border-bottom:2px solid transparent; margin-bottom:-2px; transition:color .15s,border-color .15s; cursor:pointer; }
.tab-btn:hover { color:#7B1D1D; } .tab-btn.active { color:#7B1D1D; border-bottom-color:#7B1D1D; }
.sub-tab-bar { display:flex; gap:.5rem; flex-wrap:wrap; }
.sub-tab-btn { background:#fff; border:1px solid var(--border); border-radius:6px; padding:.4rem .9rem; font-size:.82rem; font-weight:600; color:#6b7280; cursor:pointer; transition:all .15s; }
.sub-tab-btn:hover { border-color:#7B1D1D; color:#7B1D1D; } .sub-tab-btn.active { background:#f5ede8; color:#5D4037; border-color:#5D4037; }

/* Charts */
.chart-card { background:#fff; border-radius:12px; padding:1.25rem; box-shadow:var(--shadow); border:1px solid var(--border); height:100%; }
.chart-card-header { margin-bottom:.75rem; }
.chart-title  { font-size:.92rem; font-weight:700; color:#1a1a1a; }
.chart-sub    { font-size:.74rem; color:#6b7280; }
.chart-wrap   { position:relative; height:220px; }
.chart-wrap--sm { height:200px; }
.chart-loading { display:flex; align-items:center; justify-content:center; height:160px; gap:.5rem; }

/* Tables */
.table-wrap { border-radius:10px; border:1px solid var(--border); overflow:hidden; }
.data-table { width:100%; border-collapse:collapse; }
.data-table thead tr { background:#f9f5f3; }
.data-table th { padding:.7rem 1rem; text-align:left; font-size:.72rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--border); }
.data-table td { padding:.7rem 1rem; font-size:.82rem; color:#1a1a1a; border-bottom:1px solid #f0ebe8; }
.data-table tbody tr:last-child td { border-bottom:none; }
.data-table tbody tr:hover { background:#faf7f5; }
.rank    { font-weight:800; color:#7B1D1D; } .fw-600 { font-weight:600; } .fw-700 { font-weight:700; }
.font-mono { font-family:monospace; font-size:.78rem; }
.cat-badge { background:#f5ede8; color:#7B1D1D; font-size:.7rem; font-weight:600; padding:.15rem .5rem; border-radius:4px; }
.badge-pill   { display:inline-block; font-size:.68rem; font-weight:700; padding:.2rem .55rem; border-radius:999px; }
.badge-danger { background:#F5EDE8; color:#7B1D1D; }
.badge-warn   { background:#fef9c3; color:#92400e; }
.alert-count-badge { background:#F5EDE8; color:#7B1D1D; font-size:.75rem; font-weight:700; padding:.3rem .75rem; border-radius:6px; }

/* Report type badges */
.report-type-bar { display:flex; gap:.5rem; flex-wrap:wrap; }
.rt-btn { background:#fff; border:1px solid var(--border); border-radius:7px; padding:.4rem 1rem; font-size:.82rem; font-weight:600; color:#6b7280; cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:.4rem; }
.rt-btn:hover { border-color:#7B1D1D; color:#7B1D1D; } .rt-btn.active { background:#f5ede8; color:#5D4037; border-color:#5D4037; }
.report-type-badge { font-size:.68rem; font-weight:600; padding:.2rem .55rem; border-radius:4px; display:inline-block; }
.type-sales        { background:#fef9c3; color:#92400e; }
.type-inventory    { background:#dcfce7; color:#166534; }
.type-schedule     { background:#dbeafe; color:#1e40af; }
.type-consolidated { background:#f3e8ff; color:#6b21a8; }

/* Report Type Styles */
.reports-table { width: 100%; }
.reports-table thead th {
  background: #f9f5f3;
  padding: .75rem 1rem;
  font-size: .72rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: .04em;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.reports-table tbody tr { transition: background .15s; }
.reports-table tbody tr:hover { background: #faf7f5; }
.report-row td { padding: .7rem 1rem; font-size: .82rem; color: #1a1a1a; border-bottom: 1px solid #f0ebe8; }
.reports-table tbody tr:last-child td { border-bottom: none; }

/* Column Widths */
.col-id { width: 8%; }
.col-title { width: 28%; }
.col-category { width: 14%; }
.col-period { width: 16%; }
.col-created { width: 12%; }
.col-branch { width: 14%; }
.col-actions { width: 8%; }
.col-empty { text-align: center; }

/* Report ID Badge */
.report-id-badge {
  font-family: monospace;
  font-size: .78rem;
  font-weight: 600;
  color: #6b7280;
  background: #f5f0ed;
  padding: .2rem .5rem;
  border-radius: 4px;
  display: inline-block;
}

/* Report Title Cell */
.report-title-cell { display: flex; flex-direction: column; gap: .2rem; }
.report-title-main { font-weight: 600; color: #1a1a1a; }
.report-title-sub { font-size: .7rem; color: #6b7280; }

/* Period Text */
.period-text { 
  font-size: .82rem; 
  color: #1a1a1a; 
  font-weight: 500;
  white-space: nowrap;
}

/* Badge Branch */
.badge-branch {
  display: inline-block;
  background: #f0f9ff;
  color: #0369a1;
  font-size: .72rem;
  font-weight: 600;
  padding: .25rem .6rem;
  border-radius: 5px;
  border: 1px solid #bae6fd;
  white-space: nowrap;
}

/* Action Buttons */
.action-buttons-group {
  display: flex;
  gap: .5rem;
  justify-content: center;
  align-items: center;
}

.action-btn {
  background: none;
  border: 1px solid var(--border);
  padding: .35rem .5rem;
  border-radius: 5px;
  color: #6b7280;
  font-size: .85rem;
  cursor: pointer;
  transition: all .15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.action-btn:hover {
  background: #faf7f5;
  border-color: #7B1D1D;
  color: #7B1D1D;
}

.action-btn.preview {
  color: #1e40af;
}

.action-btn.preview:hover {
  background: #eff6ff;
  border-color: #1e40af;
  color: #1e40af;
}

.action-btn.download {
  color: #059669;
}

.action-btn.download:hover {
  background: #ecfdf5;
  border-color: #059669;
  color: #059669;
}

.action-btn:active {
  transform: scale(.95);
}

.action-btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-state-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #f5f0ed;
  border-radius: 50%;
  font-size: 2.5rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-state-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: .5rem;
}

.empty-state-description {
  font-size: .85rem;
  color: #6b7280;
  margin-bottom: 1.25rem;
}

.empty-state .btn {
  margin-top: .5rem;
}

/* Table Wrap Enhancements */
.table-wrap {
  border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
}

/* Branch stat cards */
.branch-stat-card { background:#fff; border-radius:10px; padding:1rem 1.15rem; border:1px solid var(--border); box-shadow:var(--shadow); }
.bsc-name    { font-size:.78rem; font-weight:600; color:#6b7280; margin-bottom:.25rem; }
.bsc-revenue { font-size:1.45rem; font-weight:800; color:#1a1a1a; margin-bottom:.6rem; }
.bsc-row     { display:flex; justify-content:space-between; font-size:.78rem; color:#6b7280; padding:.18rem 0; border-bottom:1px solid #f5f0ed; }
.bsc-row:last-child { border-bottom:none; }

/* Generate panel */
.gen-panel       { background:#fff; border-radius:12px; padding:1.5rem; box-shadow:var(--shadow); border:1px solid var(--border); }
.gen-panel-title { font-size:1rem; font-weight:700; color:#1a1a1a; }
.gen-panel-sub   { font-size:.78rem; color:#6b7280; }
.form-label-sm   { font-size:.78rem; font-weight:600; color:#1a1a1a; margin-bottom:.25rem; display:block; }
.field-error     { font-size:.73rem; color:#7B1D1D; margin-top:.25rem; }
.info-box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:7px; padding:.65rem .9rem; font-size:.8rem; color:#0369a1; }
.format-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:.5rem; }
.format-opt  { border:1.5px solid var(--border); border-radius:8px; padding:.6rem .5rem; display:flex; flex-direction:column; align-items:center; gap:.25rem; cursor:pointer; font-size:.78rem; font-weight:600; color:#6b7280; transition:all .15s; }
.format-opt:hover { border-color:#7B1D1D; color:#7B1D1D; } .format-opt.active { border-color:#7B1D1D; background:#fdf5f5; color:#7B1D1D; }
.format-opt i { font-size:1.2rem; }

/* Templates */
.tpl-card { background:#fff; border-radius:10px; padding:1rem 1.1rem; border:1px solid var(--border); box-shadow:var(--shadow); cursor:pointer; transition:box-shadow .2s,border-color .2s; }
.tpl-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); border-color:#7B1D1D; }
.tpl-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem; }
.tpl-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1rem; }
.tpl-icon--brown  { background:#f5ede8; color:#7B1D1D; } .tpl-icon--green { background:#dcfce7; color:#16a34a; }
.tpl-icon--blue   { background:#dbeafe; color:#1d4ed8; } .tpl-icon--red   { background:#F5EDE8; color:#7B1D1D; }
.tpl-icon--purple { background:#f3e8ff; color:#9333ea; } .tpl-icon--gold  { background:#fef9c3; color:#b45309; }
.tpl-icon--teal   { background:#ccfbf1; color:#0f766e; }
.tpl-formats { display:flex; gap:.25rem; }
.tpl-fmt  { font-size:.64rem; background:#f5f0ed; color:#6b7280; font-weight:600; padding:.1rem .35rem; border-radius:3px; }
.tpl-name { font-size:.85rem; font-weight:700; color:#1a1a1a; margin-bottom:.25rem; }
.tpl-desc { font-size:.75rem; color:#6b7280; margin-bottom:.75rem; }
.tpl-select-btn { background:none; border:1px solid var(--border); color:#7B1D1D; font-size:.75rem; font-weight:600; padding:.25rem .7rem; border-radius:5px; cursor:pointer; transition:all .15s; }
.tpl-select-btn:hover { background:#7B1D1D; color:#fff; border-color:#7B1D1D; }

/* Filter bar */
.filter-bar { background:#fff; border-radius:10px; padding:.75rem 1rem; box-shadow:var(--shadow); border:1px solid var(--border); }

/* Buttons */
.btn-primary-brand { background:#7B1D1D; color:#fff; border:none; padding:.5rem .9rem; border-radius:6px; font-size:.85rem; font-weight:600; transition:background .18s; cursor:pointer; }
.btn-primary-brand:hover:not(:disabled) { background:#A83232; } .btn-primary-brand:disabled { opacity:.6; cursor:not-allowed; }

.btn-generate {
  background: #5D4037; color: #fff; border: none;
  padding: .5rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
  transition: all .18s; cursor: pointer;
}
.btn-generate:hover:not(:disabled) { background: #fff; color: #5D4037; border: 1px solid #5D4037; }
.btn-generate:disabled { opacity: .6; cursor: not-allowed; }

.btn-gray {
  background: #e0e0e0; color: #333; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .84rem; cursor: pointer;
  transition: background .18s;
}
.btn-gray:hover { background: #d0d0d0; }

.btn-ghost { background:transparent; border:1px solid var(--border); color:#1a1a1a; padding:.45rem .9rem; border-radius:6px; font-size:.84rem; cursor:pointer; }
.btn-ghost:hover { background:#f0ebe8; }
.icon-btn { background:none; border:none; padding:.25rem .35rem; border-radius:5px; color:#6b7280; font-size:.9rem; transition:color .15s,background .15s; cursor:pointer; display:inline-flex; align-items:center; }
.icon-btn:hover { background:#f0e8e6; color:#7B1D1D; }
.fc-brand { font-size:.84rem; border-color:var(--border); border-radius:6px; }
.fc-brand:focus { border-color:#7B1D1D; box-shadow:0 0 0 2px rgba(123,29,29,.15); outline:none; }

/* Alert */
.alert-error { background:#F5EDE8; border:1px solid #D4B8B0; color:#7B1D1D; padding:.75rem 1rem; border-radius:8px; font-size:.84rem; }
.alert-warn  { background:#fff3cd; border:1px solid #ffeeba; color:#856404; padding:.75rem 1rem; border-radius:8px; font-size:.84rem; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1050; padding:1rem; }
.modal-panel { background:#fff; border-radius:14px; width:100%; max-width:580px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.2); animation:slideUp .22s ease; }
.modal-panel--lg { max-width:680px; }
@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
.modal-panel-header { display:flex; align-items:flex-start; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border); }
.modal-panel-header h5 { font-size:1rem; font-weight:700; }
.modal-sub { font-size:.78rem; color:#6b7280; }
.modal-panel-body { flex:1; overflow-y:auto; padding:1.5rem; }
.modal-panel-footder { display:flex; justify-content:flex-end; gap:.6rem; padding:1rem 1.5rem; border-top:1px solid var(--border); }
.btn-close-panel { background:none; border:none; font-size:.9rem; color:#6b7280; cursor:pointer; }
.preview-type-badge { display:inline-block; background:rgba(123,29,29,.10); color:#7B1D1D; font-size:.75rem; font-weight:700; padding:.2rem .6rem; border-radius:4px; }
.preview-placeholder { text-align:center; padding:2rem; background:#f9f5f3; border-radius:10px; margin-top:1rem; }
.preview-placeholder code { font-size:.75rem; background:#f0e8e6; color:#7B1D1D; padding:.15rem .4rem; border-radius:4px; }

/* Toast */
.toast-wrap { position:fixed; bottom:1.5rem; right:1.5rem; z-index:2000; background:#1a1a1a; color:#fff; padding:.75rem 1.2rem; border-radius:8px; font-size:.84rem; display:flex; align-items:center; gap:.5rem; box-shadow:0 4px 16px rgba(0,0,0,.25); animation:fadeIn .2s ease; }
.toast-wrap.success { border-left:4px solid #28a745; } .toast-wrap.error { border-left:4px solid #7B1D1D; }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

/* Insights */
.alert-brand { background:#f5ede8; border:1px solid #d4b8b0; color:#5D4037; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; line-height:1.5; }
.severity-badge { font-size:.64rem; font-weight:700; padding:.15rem .5rem; border-radius:4px; text-transform:uppercase; letter-spacing:.03em; white-space:nowrap; }
.sev-high { background:#F5EDE8; color:#7B1D1D; }
.sev-medium { background:#F0EBE3; color:#8D6E63; }
.sev-low { background:#f3f4f6; color:#6b7280; }

.narrative-list { display:flex; flex-direction:column; gap:.75rem; }
.narrative-card { padding:.9rem 1rem; border-radius:8px; border:1px solid var(--border); background:#fff; transition:box-shadow .15s; }
.narrative-card:hover { box-shadow:0 1px 6px rgba(0,0,0,.08); }
.narrative-card.narrative--high { border-left:3px solid #7B1D1D; }
.narrative-card.narrative--medium { border-left:3px solid #d97706; }
.narrative-card.narrative--low { border-left:3px solid #6b7280; }
.narrative-header { display:flex; justify-content:space-between; align-items:flex-start; gap:.5rem; margin-bottom:.4rem; }
.narrative-title { font-size:.88rem; font-weight:700; color:#1a1a1a; line-height:1.3; }
.narrative-body { font-size:.82rem; color:#374151; line-height:1.55; }
.narrative-footer { display:flex; justify-content:space-between; align-items:center; margin-top:.5rem; padding-top:.4rem; border-top:1px solid var(--border); }
.narrative-category { font-size:.7rem; color:#6b7280; text-transform:capitalize; }
.narrative-link { font-size:.72rem; color:#7B1D1D; display:inline-flex; align-items:center; gap:3px; font-weight:600; }

.priority-list { display:flex; flex-direction:column; gap:.5rem; }
.priority-item { padding:.8rem 1rem; border-radius:8px; border:1px solid var(--border); background:#fff; transition:box-shadow .15s; }
.priority-item:hover { box-shadow:0 1px 6px rgba(0,0,0,.08); }
.priority-item.priority--high { border-left:3px solid #7B1D1D; }
.priority-item.priority--medium { border-left:3px solid #d97706; }
.priority-item.priority--low { border-left:3px solid #6b7280; }
.priority-body { flex:1; }
.priority-action { font-size:.84rem; font-weight:700; color:#1a1a1a; }
.priority-desc { font-size:.78rem; color:#4b5563; line-height:1.45; margin-top:.2rem; }
.priority-meta { display:flex; gap:.75rem; align-items:center; margin-top:.35rem; }
.priority-due { font-size:.72rem; color:#6b7280; }
.insights-footer { text-align:center; padding:.5rem; }
</style>
