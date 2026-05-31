<template>
  <div class="reports-page">
    <div class="page-header-row">
      <div>
        <h4 class="page-title mb-1">Reports &amp; Analytics</h4>
        <p v-if="managerBranchName" class="branch-label">
          {{ managerBranchName }}
        </p>
      </div>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <select
          v-model="period"
          class="form-select fc-brand"
          style="width: 150px"
          @change="onPeriodChange"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>
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
        <strong>{{ key }}:</strong> {{ msg }}<br />
      </span>
      <small class="d-block mt-1 text-muted"
        >Check the browser console (F12) for full details.</small
      >
    </div>

    <!-- ── KPI CARDS ──────────────────────────────────────────── -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
        <div class="kpi-card">
          <div
            v-if="kpiLoading"
            class="skeleton-block"
            style="height: 70px"
          ></div>
          <template v-else>
            <div class="kpi-icon"><i :class="kpi.icon"></i></div>
            <div class="kpi-info">
              <h3>{{ kpi.label }}</h3>
              <p class="kpi-value">{{ kpi.value }}</p>
              <div class="kpi-change" :class="kpi.up ? 'up' : 'down'">
                <i
                  class="bi"
                  :class="kpi.up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'"
                ></i>
                {{ kpi.change }} from last period
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ── MAIN TABS ───────────────────────────────────────────── -->
    <div class="tab-bar mb-4">
      <button
        class="tab-btn"
        :class="{ active: mainTab === 'analytics' }"
        @click="
          mainTab = 'analytics';
          $nextTick(renderActiveCharts);
        "
      >
        <i class="bi bi-bar-chart-line me-1"></i> Analytics Dashboard
      </button>
      <button
        class="tab-btn"
        :class="{ active: mainTab === 'view' }"
        @click="
          mainTab = 'view';
          loadSavedReports();
        "
      >
        <i class="bi bi-file-earmark-bar-graph me-1"></i> View Reports
      </button>
      <button
        class="tab-btn"
        :class="{ active: mainTab === 'generate' }"
        @click="mainTab = 'generate'"
      >
        <i class="bi bi-file-earmark-plus me-1"></i> Generate Reports
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════
         TAB 1 — ANALYTICS DASHBOARD
    ═════════════════════════════════════════════════════════ -->
    <div v-show="mainTab === 'analytics'">
      <div class="sub-tab-bar mb-4">
        <button
          v-for="st in subTabs"
          :key="st.key"
          class="sub-tab-btn"
          :class="{ active: subTab === st.key }"
          @click="
            subTab = st.key;
            $nextTick(renderActiveCharts);
          "
        >
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
              </div>
              <div class="chart-loading" v-if="chartsLoading.revCategory">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div
                class="chart-wrap chart-wrap--sm"
                v-show="!chartsLoading.revCategory"
              >
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
              </div>
              <div class="chart-loading" v-if="chartsLoading.categoryPie">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div
                class="chart-wrap chart-wrap--sm"
                v-show="!chartsLoading.categoryPie"
              >
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
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in topProductsData" :key="p.product_name">
                  <td class="rank">{{ i + 1 }}</td>
                  <td class="fw-600">{{ p.product_name }}</td>
                  <td>
                    <span class="cat-badge">{{ p.category }}</span>
                  </td>
                  <td>{{ Number(p.units_sold).toLocaleString() }}</td>
                  <td>₱{{ Number(p.revenue).toLocaleString() }}</td>
                  <td>₱{{ Number(p.avg_price).toFixed(2) }}</td>
                </tr>
                <tr v-if="!topProductsData.length">
                  <td colspan="6" class="text-center text-muted py-3">
                    No product data for this period.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- INVENTORY (replaces Branches tab for managers) -->
      <div ref="invSect" v-show="subTab === 'inventory'">
        <div class="row g-3 mb-3">
          <div class="col-12">
            <div class="chart-card">
              <div
                class="d-flex align-items-center justify-content-between mb-3"
              >
                <div>
                  <div class="chart-title">Low Stock Alerts</div>
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
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Reorder Level</th>
                      <th>Status</th>
                      <th>Expiration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in lowStockData" :key="item.rawproductid">
                      <td class="fw-600">{{ item.name }}</td>
                      <td>{{ item.category }}</td>
                      <td>{{ item.stockquantity }} {{ item.unit }}</td>
                      <td>{{ item.reorderlevel }} {{ item.unit }}</td>
                      <td>
                        <span
                          class="badge-pill"
                          :class="
                            Number(item.stockquantity) === 0
                              ? 'badge-danger'
                              : 'badge-warn'
                          "
                        >
                          {{
                            Number(item.stockquantity) === 0
                              ? "Out of Stock"
                              : "Low Stock"
                          }}
                        </span>
                      </td>
                      <td
                        :class="
                          item.days_until_expiry != null &&
                          item.days_until_expiry <= 3
                            ? 'text-danger fw-600'
                            : ''
                        "
                      >
                        {{ item.expirationdate || "N/A" }}
                        <span
                          v-if="
                            item.days_until_expiry != null &&
                            item.days_until_expiry <= 0
                          "
                        >
                          (EXPIRED)</span
                        >
                      </td>
                    </tr>
                    <tr v-if="!lowStockData.length">
                      <td colspan="6" class="text-center text-muted py-3">
                        All items are adequately stocked.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-3 mb-3">
          <div class="col-12 col-md-7">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Top Selling Products</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.topProducts">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.topProducts">
                <canvas ref="invTopProductsChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Sales by Category</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.categoryPie">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div
                class="chart-wrap chart-wrap--sm"
                v-show="!chartsLoading.categoryPie"
              >
                <canvas ref="invCategoryPieChart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- end analytics tab -->

    <!-- ════════════════════════════════════════════════════════
         TAB 2 — VIEW REPORTS
    ═════════════════════════════════════════════════════════ -->
    <div v-show="mainTab === 'view'">
      <div class="row g-3">
        <div class="col-12">
          <div class="report-type-bar">
            <button
              v-for="rc in reportCategories"
              :key="rc.key"
              class="rt-btn"
              :class="{ active: viewCategoryFilter === rc.key }"
              @click="
                viewCategoryFilter = rc.key;
                loadSavedReports();
              "
            >
              <i :class="rc.icon"></i> {{ rc.label }}
            </button>
          </div>
        </div>
        <div class="col-12">
          <div class="filter-bar d-flex flex-wrap gap-2 align-items-center">
            <input
              v-model="viewSearch"
              type="text"
              class="form-control fc-brand"
              style="width: 230px"
              placeholder="Search reports…"
              @input="loadSavedReports"
            />
            <input
              v-model="viewDateFrom"
              type="date"
              class="form-control fc-brand"
              style="width: 160px"
              @change="loadSavedReports"
            />
            <input
              v-model="viewDateTo"
              type="date"
              class="form-control fc-brand"
              style="width: 160px"
              @change="loadSavedReports"
            />
            <button
              class="btn btn-ghost btn-sm"
              @click="
                viewSearch = '';
                viewDateFrom = '';
                viewDateTo = '';
                loadSavedReports();
              "
            >
              Clear
            </button>
          </div>
        </div>
        <div class="col-12">
          <div class="chart-card p-0">
            <div class="chart-loading py-5" v-if="reportsListLoading">
              <div class="spinner-border text-primary-brand"></div>
              <span class="ms-3 text-muted fw-600"
                >Retrieving report archive...</span
              >
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
                    <th class="col-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in savedReports"
                    :key="r.reportid"
                    class="report-row"
                  >
                    <td class="col-id">
                      <span class="report-id-badge"
                        >#{{ String(r.reportid).padStart(4, "0") }}</span
                      >
                    </td>
                    <td class="col-title">
                      <div class="report-title-cell">
                        <div class="report-title-main">{{ r.reporttitle }}</div>
                        <div class="report-title-sub">
                          Generated by
                          {{ r.generatedby?.firstname || "Manager" }}
                        </div>
                      </div>
                    </td>
                    <td class="col-category">
                      <span
                        class="report-type-badge"
                        :class="'type-' + getCategorySlug(r.reporttype)"
                      >
                        {{ getReportTypeLabel(r.reporttype) }}
                      </span>
                    </td>
                    <td class="col-period">
                      <span class="period-text">{{ formatPeriod(r) }}</span>
                    </td>
                    <td class="col-created">
                      {{ formatDate(r.createdat || r.reportdate) }}
                    </td>
                    <td class="col-actions">
                      <div class="action-buttons-group">
                        <button
                          class="action-btn preview"
                          @click="openPreview(r)"
                          title="View Details"
                          aria-label="View report details"
                        >
                          <i class="bi bi-info-circle"></i>
                        </button>
                        <button
                          class="action-btn download"
                          @click="reDownloadReport(r)"
                          title="Re-download File"
                          aria-label="Download report file"
                        >
                          <i class="bi bi-cloud-download"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!savedReports.length">
                    <td colspan="6" class="col-empty">
                      <div class="empty-state">
                        <div class="empty-state-icon">
                          <i class="bi bi-folder2-open"></i>
                        </div>
                        <div class="empty-state-title">No Reports Found</div>
                        <p class="empty-state-description">
                          No reports matching your filters were found.
                        </p>
                        <button
                          class="btn btn-sm btn-primary-brand"
                          @click="mainTab = 'generate'"
                        >
                          <i class="bi bi-file-earmark-plus me-1"></i> Generate
                          First Report
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
            <div class="gen-panel-sub mb-4">
              Set your parameters then click Generate
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Report Category</label>
              <select
                v-model="genForm.category"
                class="form-select fc-brand"
                @change="genForm.type = ''"
              >
                <option value="" disabled>Select category</option>
                <option
                  v-for="rc in reportCategories.filter((r) => r.key !== 'all')"
                  :key="rc.key"
                  :value="rc.key"
                >
                  {{ rc.label }}
                </option>
              </select>
              <div v-if="genErrors.category" class="field-error">
                {{ genErrors.category }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Report Type</label>
              <select
                v-model="genForm.type"
                class="form-select fc-brand"
                :disabled="!genForm.category"
              >
                <option value="" disabled>Select report type</option>
                <option
                  v-for="t in availableTypes"
                  :key="t.value"
                  :value="t.value"
                >
                  {{ t.label }}
                </option>
              </select>
              <div v-if="genErrors.type" class="field-error">
                {{ genErrors.type }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Date From</label>
              <input
                v-model="genForm.dateFrom"
                type="date"
                class="form-control fc-brand"
              />
              <div v-if="genErrors.dateFrom" class="field-error">
                {{ genErrors.dateFrom }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label-sm">Date To</label>
              <input
                v-model="genForm.dateTo"
                type="date"
                class="form-control fc-brand"
              />
              <div v-if="genErrors.dateTo" class="field-error">
                {{ genErrors.dateTo }}
              </div>
            </div>

            <!-- Branch is locked to manager's branch — shown as read-only info -->
            <div class="mb-3">
              <label class="form-label-sm">Branch</label>
              <div class="branch-locked-box">
                <i class="bi bi-geo-alt-fill me-2"></i>
                <span>{{ managerBranchName || "Your Branch" }}</span>
                <span class="branch-locked-badge">Assigned</span>
              </div>
            </div>

            <div class="mb-4">
              <label class="form-label-sm">Export Format</label>
              <div class="format-grid">
                <label
                  v-for="fmt in formats"
                  :key="fmt.value"
                  class="format-opt"
                  :class="{ active: genForm.format === fmt.value }"
                >
                  <input
                    type="radio"
                    v-model="genForm.format"
                    :value="fmt.value"
                    hidden
                  />
                  <i :class="fmt.icon"></i>
                  <span>{{ fmt.label }}</span>
                </label>
              </div>
            </div>

            <div class="mb-3">
              <label
                class="d-flex align-items-center gap-2"
                style="cursor: pointer; font-size: 0.82rem"
              >
                <input
                  type="checkbox"
                  v-model="genForm.saveToCloud"
                  class="form-check-input"
                />
                <span>Save to cloud storage after generation</span>
              </label>
            </div>

            <button
              class="btn btn-generate w-100 mb-2"
              @click="generateReport"
              :disabled="generating"
            >
              <span
                v-if="generating"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              <i v-else class="bi bi-file-earmark-arrow-down me-2"></i>
              {{ generating ? "Generating…" : "Generate Report" }}
            </button>
            <button class="btn btn-gray w-100" @click="resetGenForm">
              Reset
            </button>
          </div>
        </div>

        <!-- RIGHT: templates -->
        <div class="col-12 col-lg-7">
          <div class="fw-700 mb-3" style="font-size: 0.95rem">
            Quick Report Templates
          </div>
          <div class="row g-3">
            <div
              class="col-12 col-md-6"
              v-for="tpl in reportTemplates"
              :key="tpl.key"
            >
              <div class="tpl-card" @click="applyTemplate(tpl)">
                <div class="tpl-card-top">
                  <div class="tpl-icon" :class="'tpl-icon--' + tpl.color">
                    <i :class="tpl.icon"></i>
                  </div>
                  <div class="tpl-formats">
                    <span v-for="f in tpl.formats" :key="f" class="tpl-fmt">{{
                      f
                    }}</span>
                  </div>
                </div>
                <div class="tpl-name">{{ tpl.name }}</div>
                <div class="tpl-desc">{{ tpl.desc }}</div>
                <button class="tpl-select-btn" @click.stop="applyTemplate(tpl)">
                  Select
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── PREVIEW MODAL ──────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showPreview"
        class="modal-overlay"
        @click.self="showPreview = false"
      >
        <div class="modal-panel modal-panel--lg">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">{{ previewData?.reporttitle }}</h5>
              <p class="modal-sub mb-0">
                {{ formatDate(previewData?.reportdate) }} ·
                {{ managerBranchName || "Your Branch" }}
              </p>
            </div>
            <button class="btn-close-panel" @click="showPreview = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <span class="preview-type-badge">{{
              previewData?.reporttype
            }}</span>
            <div v-if="previewData?.filepath" class="preview-viewer mt-3">
              <iframe
                v-if="isPdfFile(previewData.filepath)"
                :src="previewData.filepath"
                class="pdf-viewer"
                frameborder="0"
              ></iframe>
              <div v-else class="preview-excel-placeholder">
                <i class="bi bi-file-earmark-spreadsheet fs-1 text-muted"></i>
                <p class="text-muted mt-2 mb-0">
                  Excel files cannot be previewed inline.
                </p>
                <a
                  :href="previewData.filepath"
                  target="_blank"
                  class="btn btn-primary-brand mt-3"
                  style="display: inline-block"
                >
                  <i class="bi bi-download me-1"></i> Download File
                </a>
              </div>
            </div>
            <div v-else class="preview-placeholder mt-3">
              <i class="bi bi-cloud-slash fs-1 text-muted"></i>
              <p class="text-muted mt-2 mb-0">
                File was not saved to cloud storage.
              </p>
            </div>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showPreview = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i
          class="bi"
          :class="
            toast.type === 'success'
              ? 'bi-check-circle'
              : 'bi-exclamation-circle'
          "
        ></i>
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script>
import { Chart, registerables } from "chart.js";
import {
  getDateRange,
  getKpiSummary,
  getSalesTrend,
  getPeakHours,
  getRevenueByCategory,
  getTopProducts,
  getLowStockItems,
  getStockTurnover,
  getSavedReports,
  saveReportRecord,
  fetchReportData,
  uploadReportFile,
} from "../../services/reportService.js";
import { exportPDF } from "../../services/pdfExporter.js";
import { exportExcel } from "../../services/excelExporter.js";
import { supabase } from "../../supabase.js";

Chart.register(...registerables);

const BRAND = "#2D5A7B";
const PALETTE = [
  "#2D5A7B",
  "#50B86C",
  "#E8A838",
  "#7B5EA7",
  "#36B5A0",
  "#E67E3A",
  "#5D9CEC",
];
const GRAY = "#6b7280";
const GRID = "#f0ebe8";
const LBL = { size: 10, family: "inherit" };

function baseOpts(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#374151", font: LBL, padding: 10 } },
      ...extra.plugins,
    },
    scales: {
      x: { ticks: { color: GRAY, font: LBL }, grid: { color: GRID } },
      y: { ticks: { color: GRAY, font: LBL }, grid: { color: GRID } },
      ...extra.scales,
    },
  };
}

export default {
  name: "ReportsAnalyticsManager",

  data() {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000)
      .toISOString()
      .split("T")[0];

    return {
      // Manager branch — resolved on mount from localStorage 'branch'
      managerBranchId: null,
      managerBranchName: "",
      branchResolved: false,

      // UI
      mainTab: "analytics",
      subTab: "sales",
      period: "week",
      showPreview: false,
      previewData: null,
      generating: false,
      globalError: null,

      // Loading flags
      kpiLoading: false,
      reportsListLoading: false,
      chartsLoading: {
        salesTrend: false,
        orderVolume: false,
        peakHours: false,
        revCategory: false,
        topProducts: false,
        categoryPie: false,
        lowStock: false,
        stockTurnover: false,
      },
      chartErrors: {},

      _charts: {},

      // Data
      kpis: [
        {
          label: "Total Sales",
          value: "—",
          change: "—",
          up: true,
          icon: "bi bi-currency-dollar",
        },
        {
          label: "Total Orders",
          value: "—",
          change: "—",
          up: true,
          icon: "bi bi-receipt",
        },
        {
          label: "Avg Order Value",
          value: "—",
          change: "—",
          up: true,
          icon: "bi bi-graph-up",
        },
        {
          label: "Active Products",
          value: "—",
          change: "—",
          up: true,
          icon: "bi bi-box-seam",
        },
      ],
      salesTrendData: [],
      peakHoursData: [],
      revCategoryData: [],
      topProductsData: [],
      lowStockData: [],
      stockTurnoverData: [],
      savedReports: [],

      // View Reports
      viewCategoryFilter: "all",
      viewSearch: "",
      viewDateFrom: "",
      viewDateTo: "",

      // Generate
      genForm: {
        category: "",
        type: "",
        dateFrom: weekAgo,
        dateTo: today,
        branchId: null,
        format: "pdf",
        saveToCloud: false,
      },
      genErrors: {},

      toast: { show: false, message: "", type: "success" },

      // Static config — no "branches" sub-tab (manager sees only their own branch)
      subTabs: [
        { key: "sales", label: "Sales" },
        { key: "products", label: "Products" },
        { key: "inventory", label: "Inventory" },
      ],

      // No "consolidated" category for managers
      reportCategories: [
        { key: "all", label: "All Reports", icon: "bi bi-grid" },
        { key: "sales", label: "Sales", icon: "bi bi-currency-dollar" },
        { key: "inventory", label: "Inventory", icon: "bi bi-box-seam" },
        { key: "schedule", label: "Schedule", icon: "bi bi-calendar3" },
      ],

      reportTypeMap: {
        sales: [
          { value: "sales-pipeline", label: "Sales Pipeline Report" },
          { value: "sales-performance", label: "Sales Performance Report" },
          { value: "sales-forecast", label: "Sales Forecast Report" },
          { value: "sales-monthly", label: "Monthly Summary Report" },
          { value: "sales-weekly", label: "Weekly Summary Report" },
        ],
        inventory: [
          { value: "inventory-on-hand", label: "Inventory on Hand Report" },
          { value: "inventory-aging", label: "Inventory Aging Report" },
          { value: "stock-turnover", label: "Stock Turnover Report" },
          { value: "low-inventory", label: "Low Inventory Report" },
          { value: "inventory-monthly", label: "Monthly Summary Report" },
          { value: "inventory-weekly", label: "Weekly Summary Report" },
        ],
        schedule: [
          { value: "employee-schedule", label: "Employee Schedule Report" },
        ],
      },

      formats: [
        { value: "pdf", label: "PDF", icon: "bi bi-file-earmark-pdf" },
        { value: "excel", label: "Excel", icon: "bi bi-file-earmark-excel" },
      ],

      // No "consolidated" template for managers
      reportTemplates: [
        {
          key: "daily-sales",
          name: "Daily Sales Report",
          desc: "Detailed breakdown of daily sales transactions",
          icon: "bi bi-receipt",
          color: "brown",
          category: "sales",
          type: "sales-pipeline",
          formats: ["PDF", "Excel"],
        },
        {
          key: "monthly-rev",
          name: "Monthly Revenue Report",
          desc: "Comprehensive monthly revenue analysis",
          icon: "bi bi-graph-up-arrow",
          color: "green",
          category: "sales",
          type: "sales-monthly",
          formats: ["PDF", "Excel"],
        },
        {
          key: "inv-status",
          name: "Inventory Status Report",
          desc: "Current stock levels for all raw materials",
          icon: "bi bi-box-seam",
          color: "blue",
          category: "inventory",
          type: "inventory-on-hand",
          formats: ["PDF", "Excel"],
        },
        {
          key: "low-stock",
          name: "Low Stock Alert Report",
          desc: "Items that need immediate reordering",
          icon: "bi bi-exclamation-triangle",
          color: "red",
          category: "inventory",
          type: "low-inventory",
          formats: ["PDF", "Excel"],
        },
        {
          key: "aging",
          name: "Inventory Aging Report",
          desc: "Items nearing expiration — prevent food waste",
          icon: "bi bi-clock-history",
          color: "gold",
          category: "inventory",
          type: "inventory-aging",
          formats: ["PDF", "Excel"],
        },
        {
          key: "top-products",
          name: "Top Selling Products",
          desc: "Best-performing menu items this period",
          icon: "bi bi-star",
          color: "gold",
          category: "sales",
          type: "sales-performance",
          formats: ["PDF", "Excel"],
        },
        {
          key: "employee-sched",
          name: "Employee Schedule Report",
          desc: "Staff shift assignments and schedule summary",
          icon: "bi bi-person-lines-fill",
          color: "purple",
          category: "schedule",
          type: "employee-schedule",
          formats: ["PDF", "Excel"],
        },
      ],
    };
  },

  computed: {
    periodLabel() {
      return { week: "past 7 days", month: "this month", year: "this year" }[
        this.period
      ];
    },
    availableTypes() {
      return this.reportTypeMap[this.genForm.category] || [];
    },
  },

  async mounted() {
    await this.resolveManagerBranch();
    await this.loadAnalyticsData();
    this.$nextTick(() => this.renderActiveCharts());
  },

  beforeUnmount() {
    Object.values(this._charts).forEach((c) => c?.destroy());
  },

  methods: {
    // ── BRANCH RESOLUTION ────────────────────────────────────────

    async resolveManagerBranch() {
      const slug = localStorage.getItem("branch");
      if (!slug || slug === "all") {
        this.branchResolved = true;
        return;
      }
      const parsed = parseInt(slug, 10);
      if (!isNaN(parsed)) {
        const { data } = await supabase
          .from("branch")
          .select("BranchId, BranchName")
          .eq("BranchId", parsed)
          .maybeSingle();
        if (data) {
          this.managerBranchId = data.BranchId;
          this.managerBranchName = data.BranchName;
        }
      } else {
        const { data } = await supabase
          .from("branch")
          .select("BranchId, BranchName")
          .ilike("BranchName", `%${slug}%`)
          .limit(1)
          .maybeSingle();
        if (data) {
          this.managerBranchId = data.BranchId;
          this.managerBranchName = data.BranchName;
        } else {
          const { data: locData } = await supabase
            .from("branch")
            .select("BranchId, BranchName")
            .ilike("Location", `%${slug}%`)
            .limit(1)
            .maybeSingle();
          if (locData) {
            this.managerBranchId = locData.BranchId;
            this.managerBranchName = locData.BranchName;
          }
        }
      }
      this.branchResolved = true;
    },

    // ── LOADERS ──────────────────────────────────────────────────

    async onPeriodChange() {
      await this.loadAnalyticsData();
      this.$nextTick(() => this.renderActiveCharts());
    },

    async loadAnalyticsData() {
      const { from, to } = getDateRange(this.period);
      // Always use manager's branch — never null/all-branches
      const branch = this.managerBranchId;

      // KPIs
      this.kpiLoading = true;
      const { data: kpiRaw, error: kpiErr } = await getKpiSummary(
        from,
        to,
        branch,
      );
      this.kpiLoading = false;

      if (kpiErr) {
        this.globalError = "Failed to load KPIs: " + kpiErr.message;
        return;
      }

      const k = kpiRaw?.[0] || {};
      const pctChange = (curr, prev) => {
        curr = Number(curr) || 0;
        prev = Number(prev) || 0;
        if (!prev) return { val: "N/A", up: true };
        const pct = (((curr - prev) / prev) * 100).toFixed(1);
        return { val: (pct > 0 ? "+" : "") + pct + "%", up: Number(pct) >= 0 };
      };
      const sc = pctChange(k.total_sales, k.prev_total_sales);
      const oc = pctChange(k.total_orders, k.prev_total_orders);

      this.kpis = [
        {
          label: "Total Sales",
          value: "₱" + Number(k.total_sales || 0).toLocaleString(),
          change: sc.val,
          up: sc.up,
          icon: "bi bi-currency-dollar",
        },
        {
          label: "Total Orders",
          value: Number(k.total_orders || 0).toLocaleString(),
          change: oc.val,
          up: oc.up,
          icon: "bi bi-receipt",
        },
        {
          label: "Avg Order Value",
          value: "₱" + Number(k.avg_order_value || 0).toFixed(2),
          change: "—",
          up: true,
          icon: "bi bi-graph-up",
        },
        {
          label: "Active Products",
          value: Number(k.active_products || 0).toLocaleString(),
          change: "—",
          up: true,
          icon: "bi bi-box-seam",
        },
      ];

      await Promise.all([
        this.loadSalesTrend(from, to, branch),
        this.loadPeakHours(from, to, branch),
        this.loadRevCategory(from, to, branch),
        this.loadTopProducts(from, to, branch),
        this.loadLowStock(from, to, branch),
        this.loadStockTurnover(from, to, branch),
      ]);
    },

    async loadChart(key, loader, dataProp) {
      this.chartsLoading[key] = true;
      delete this.chartErrors[key];
      const { data, error } = await loader();
      this.chartsLoading[key] = false;
      if (error) {
        console.error(`[Reports] ${key} query failed:`, error);
        this.chartErrors[key] = error.message;
      } else {
        this[dataProp] = data || [];
      }
    },

    async loadSalesTrend(from, to, branch) {
      this.chartsLoading.salesTrend = this.chartsLoading.orderVolume = true;
      delete this.chartErrors.salesTrend;
      delete this.chartErrors.orderVolume;
      const { data, error } = await getSalesTrend(from, to, branch);
      this.chartsLoading.salesTrend = this.chartsLoading.orderVolume = false;
      if (error) {
        console.error("[Reports] SalesTrend query failed:", error);
        this.chartErrors.salesTrend = error.message;
      } else {
        this.salesTrendData = data || [];
      }
    },

    async loadPeakHours(from, to, branch) {
      await this.loadChart(
        "peakHours",
        () => getPeakHours(from, to, branch),
        "peakHoursData",
      );
    },

    async loadRevCategory(from, to, branch) {
      await this.loadChart(
        "revCategory",
        () => getRevenueByCategory(from, to, branch),
        "revCategoryData",
      );
    },

    async loadTopProducts(from, to, branch) {
      this.chartsLoading.topProducts = this.chartsLoading.categoryPie = true;
      delete this.chartErrors.topProducts;
      delete this.chartErrors.categoryPie;
      const { data, error } = await getTopProducts(from, to, branch, 10);
      this.chartsLoading.topProducts = this.chartsLoading.categoryPie = false;
      if (error) {
        console.error("[Reports] TopProducts query failed:", error);
        this.chartErrors.topProducts = error.message;
      } else {
        this.topProductsData = data || [];
      }
    },

    async loadLowStock(from, to, branch) {
      this.chartsLoading.lowStock = true;
      delete this.chartErrors.lowStock;
      const { data, error } = await getLowStockItems(from, to, branch);
      this.chartsLoading.lowStock = false;
      if (error) {
        console.error("[Reports] LowStock query failed:", error);
        this.chartErrors.lowStock = error.message;
      } else {
        this.lowStockData = data || [];
      }
    },

    async loadStockTurnover(from, to, branch) {
      await this.loadChart(
        "stockTurnover",
        () => getStockTurnover(from, to, branch),
        "stockTurnoverData",
      );
    },

    async loadSavedReports() {
      this.reportsListLoading = true;
      const types =
        this.viewCategoryFilter !== "all"
          ? this.reportTypeMap[this.viewCategoryFilter]?.map((t) => t.value)
          : undefined;
      const { data, error } = await getSavedReports({
        types,
        dateFrom: this.viewDateFrom || undefined,
        dateTo: this.viewDateTo || undefined,
        branchId: this.managerBranchId, // scope reports to manager's branch only
      });
      this.reportsListLoading = false;
      if (error) {
        this.showToast("Failed to load reports: " + error.message, "error");
        return;
      }
      let rows = data || [];
      if (this.viewSearch) {
        const q = this.viewSearch.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.reporttitle.toLowerCase().includes(q) ||
            r.reporttype.toLowerCase().includes(q),
        );
      }
      this.savedReports = rows;
    },

    // ── CHARTS ───────────────────────────────────────────────────

    renderActiveCharts() {
      if (this.mainTab !== "analytics") return;
      if (this.subTab === "sales") this.renderSalesCharts();
      if (this.subTab === "products") this.renderProductCharts();
      if (this.subTab === "inventory") this.renderInventoryCharts();
    },

    destroyChart(key) {
      this._charts[key]?.destroy();
      delete this._charts[key];
    },

    makeChart(key, refName, config) {
      this.destroyChart(key);
      const el = this.$refs[refName];
      if (!el) return;
      this._charts[key] = new Chart(el, config);
    },

    renderSalesCharts() {
      const labels = this.salesTrendData.map((r) => r.sale_date);
      const sales = this.salesTrendData.map((r) => Number(r.net_sales));
      const orders = this.salesTrendData.map((r) => Number(r.order_count));

      this.makeChart("salesTrend", "salesTrendChart", {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Revenue (₱)",
              data: sales,
              borderColor: BRAND,
              backgroundColor: "rgba(123,29,29,0.10)",
              tension: 0.4,
              fill: true,
              pointBackgroundColor: BRAND,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        },
        options: {
          ...baseOpts(),
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (c) => "₱" + Number(c.raw).toLocaleString() },
            },
          },
        },
      });

      this.makeChart("orderVolume", "orderVolumeChart", {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Orders",
              data: orders,
              backgroundColor: BRAND,
              borderRadius: 5,
            },
          ],
        },
        options: { ...baseOpts(), plugins: { legend: { display: false } } },
      });

      const hLabels = this.peakHoursData.map((r) => r.hour + ":00");
      const hVals = this.peakHoursData.map((r) => Number(r.avg_orders));

      this.makeChart("peakHours", "peakHoursChart", {
        type: "bar",
        data: {
          labels: hLabels,
          datasets: [
            {
              label: "Avg Orders",
              data: hVals,
              backgroundColor: hVals.map((v) =>
                v >= 40 ? BRAND : v >= 20 ? "#5D9CEC" : "#B0D4F1",
              ),
              borderRadius: 4,
            },
          ],
        },
        options: { ...baseOpts(), plugins: { legend: { display: false } } },
      });

      const cLabels = this.revCategoryData.map((r) => r.category);
      const cVals = this.revCategoryData.map((r) =>
        Number(r.percentage ?? r.pct),
      );

      this.makeChart("revCategory", "revCategoryChart", {
        type: "doughnut",
        data: {
          labels: cLabels,
          datasets: [
            {
              data: cVals,
              backgroundColor: PALETTE,
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#374151", font: LBL, padding: 8 },
            },
            tooltip: {
              callbacks: { label: (c) => c.label + ": " + c.raw + "%" },
            },
          },
        },
      });
    },

    renderProductCharts() {
      const names = this.topProductsData.map((p) =>
        p.product_name.length > 16
          ? p.product_name.slice(0, 16) + "…"
          : p.product_name,
      );
      const revs = this.topProductsData.map((p) => Number(p.revenue));

      this.makeChart("topProducts", "topProductsChart", {
        type: "bar",
        data: {
          labels: names,
          datasets: [
            {
              label: "Revenue (₱)",
              data: revs,
              backgroundColor: PALETTE,
              borderRadius: 5,
            },
          ],
        },
        options: {
          ...baseOpts(),
          indexAxis: "y",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (c) => "₱" + Number(c.raw).toLocaleString() },
            },
          },
        },
      });

      const catLabels = this.revCategoryData.map((r) => r.category);
      const catRevs = this.revCategoryData.map((r) => Number(r.revenue));

      this.makeChart("categoryPie", "categoryPieChart", {
        type: "pie",
        data: {
          labels: catLabels,
          datasets: [
            {
              data: catRevs,
              backgroundColor: PALETTE,
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#374151", font: LBL, padding: 8 },
            },
            tooltip: {
              callbacks: {
                label: (c) => c.label + ": ₱" + Number(c.raw).toLocaleString(),
              },
            },
          },
        },
      });
    },

    renderInventoryCharts() {
      const names = this.topProductsData.map((p) =>
        p.product_name.length > 16
          ? p.product_name.slice(0, 16) + "…"
          : p.product_name,
      );
      const revs = this.topProductsData.map((p) => Number(p.revenue));

      this.makeChart("invTopProducts", "invTopProductsChart", {
        type: "bar",
        data: {
          labels: names,
          datasets: [
            {
              label: "Revenue (₱)",
              data: revs,
              backgroundColor: PALETTE,
              borderRadius: 5,
            },
          ],
        },
        options: {
          ...baseOpts(),
          indexAxis: "y",
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: { label: (c) => "₱" + Number(c.raw).toLocaleString() },
            },
          },
        },
      });

      const catLabels = this.revCategoryData.map((r) => r.category);
      const catRevs = this.revCategoryData.map((r) => Number(r.revenue));

      this.makeChart("invCategoryPie", "invCategoryPieChart", {
        type: "pie",
        data: {
          labels: catLabels,
          datasets: [
            {
              data: catRevs,
              backgroundColor: PALETTE,
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: "#374151", font: LBL, padding: 8 },
            },
            tooltip: {
              callbacks: {
                label: (c) => c.label + ": ₱" + Number(c.raw).toLocaleString(),
              },
            },
          },
        },
      });
    },

    // ── GENERATE ─────────────────────────────────────────────────

    validateGenForm() {
      const e = {};
      if (!this.genForm.category) e.category = "Select a report category.";
      if (!this.genForm.type) e.type = "Select a report type.";
      if (!this.genForm.dateFrom) e.dateFrom = "Date from is required.";
      if (!this.genForm.dateTo) e.dateTo = "Date to is required.";
      if (
        this.genForm.dateFrom &&
        this.genForm.dateTo &&
        this.genForm.dateFrom > this.genForm.dateTo
      )
        e.dateTo = "Date To must be after Date From.";
      this.genErrors = e;
      return !Object.keys(e).length;
    },

    async generateReport() {
      if (!this.validateGenForm()) return;
      this.generating = true;
      try {
        const {
          data: rows,
          raw: rawRows,
          error,
        } = await fetchReportData(this.genForm.type, {
          dateFrom: this.genForm.dateFrom,
          dateTo: this.genForm.dateTo,
          branchId: this.managerBranchId, // always manager's branch
        });
        if (error) throw new Error(error.message);
        if (!rows || rows.length === 0) {
          this.showToast("No data found for the selected period.", "error");
          return;
        }

        const typeDef = this.availableTypes.find(
          (t) => t.value === this.genForm.type,
        );
        const meta = {
          title: typeDef?.label || this.genForm.type,
          dateFrom: this.genForm.dateFrom,
          dateTo: this.genForm.dateTo,
          branch: this.managerBranchName || "Your Branch",
          generatedBy:
            localStorage.getItem("username") ||
            localStorage.getItem("role") ||
            "Manager",
        };

        // Capture chart canvases for PDF
        let chartImages = [];
        if (this.genForm.format === "pdf") {
          const isInventory = this.genForm.type.startsWith("inventory-");

          if (isInventory) {
            const CHART_W = 480;
            const BAR_H = 24;
            const BAR_GAP = 6;
            const LABEL_W = 110;

            // Top Products Horizontal Bar
            const top = this.topProductsData || [];
            const maxRev = Math.max(...top.map((p) => Number(p.revenue)), 1);
            const barSvg = top.length
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${top.length * (BAR_H + BAR_GAP) + 30}" viewBox="0 0 ${CHART_W} ${top.length * (BAR_H + BAR_GAP) + 30}">
                  <style>.t{fill:#374151;font:11px sans-serif}.l{fill:#6b7280;font:10px sans-serif}</style>
                  ${top
                    .map((p, i) => {
                      const y = i * (BAR_H + BAR_GAP);
                      const w = Math.max(
                        (Number(p.revenue) / maxRev) * (CHART_W - LABEL_W - 60),
                        2,
                      );
                      const color = PALETTE[i % PALETTE.length];
                      return (
                        `<text x="0" y="${y + BAR_H / 2 + 4}" class="t" text-anchor="end">${(p.product_name || "").length > 14 ? (p.product_name || "").slice(0, 14) + "…" : p.product_name || ""}</text>` +
                        `<rect x="${LABEL_W + 4}" y="${y + 2}" width="${w}" height="${BAR_H - 4}" rx="3" fill="${color}"/>` +
                        `<text x="${LABEL_W + 8 + w}" y="${y + BAR_H / 2 + 4}" class="l">₱${Number(p.revenue).toLocaleString()}</text>`
                      );
                    })
                    .join("")}
                  <text x="0" y="${top.length * (BAR_H + BAR_GAP) + 20}" class="l">Revenue (₱)</text>
                </svg>`
              : "";
            if (barSvg)
              chartImages.push({
                svg: barSvg,
                width: CHART_W,
                title: "Top Selling Products",
                desc: "Highest-grossing products by revenue.",
              });

            // Sales by Category Pie
            const cats = this.revCategoryData || [];
            const total = cats.reduce((s, c) => s + Number(c.revenue), 0) || 1;
            const PIE_W = 320,
              PIE_H = 200,
              CX = 140,
              CY = 100,
              R = 80;
            let angle = -Math.PI / 2;
            const slices = cats.map((c, i) => {
              const val = (Number(c.revenue) / total) * 2 * Math.PI;
              const a1 = angle,
                a2 = angle + val;
              const x1 = CX + R * Math.cos(a1),
                y1 = CY + R * Math.sin(a1);
              const x2 = CX + R * Math.cos(a2),
                y2 = CY + R * Math.sin(a2);
              const large = val > Math.PI ? 1 : 0;
              const color = PALETTE[i % PALETTE.length];
              const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`;
              angle = a2;
              return {
                path,
                color,
                label: c.category || "—",
                pct: ((Number(c.revenue) / total) * 100).toFixed(1),
              };
            });
            const pieSvg = cats.length
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="${PIE_W + 160}" height="${PIE_H + 20}" viewBox="0 0 ${PIE_W + 160} ${PIE_H + 20}">
                  <style>.t{fill:#374151;font:11px sans-serif}.p{fill:#6b7280;font:10px sans-serif}</style>
                  ${slices.map((s) => `<path d="${s.path}" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join("")}
                  ${slices
                    .map((s, i) => {
                      const ly = 20 + i * 22;
                      return (
                        `<rect x="${PIE_W + 10}" y="${ly}" width="12" height="12" rx="2" fill="${s.color}"/>` +
                        `<text x="${PIE_W + 28}" y="${ly + 10}" class="t">${s.label}</text>` +
                        `<text x="${PIE_W + 28}" y="${ly + 21}" class="p">${s.pct}%</text>`
                      );
                    })
                    .join("")}
                </svg>`
              : "";
            if (pieSvg)
              chartImages.push({
                svg: pieSvg,
                width: PIE_W + 160,
                title: "Sales by Category",
                desc: "Proportion of sales by product category.",
              });
          } else {
            const chartDefs = [
              {
                ref: "salesTrendChart",
                key: "salesTrend",
                title: "Sales Trend",
                desc: "Daily sales trend over the selected period.",
              },
              {
                ref: "orderVolumeChart",
                key: "orderVolume",
                title: "Order Volume",
                desc: "Number of orders placed per day.",
              },
              {
                ref: "peakHoursChart",
                key: "peakHours",
                title: "Peak Hours",
                desc: "Busiest hours of operation.",
              },
              {
                ref: "revCategoryChart",
                key: "revCategory",
                title: "Revenue by Category",
                desc: "Distribution of revenue across product categories.",
              },
              {
                ref: "topProductsChart",
                key: "topProducts",
                title: "Top Selling Products",
                desc: "Highest-grossing products by revenue.",
              },
              {
                ref: "categoryPieChart",
                key: "categoryPie",
                title: "Sales by Category",
                desc: "Proportion of sales by product category.",
              },
              {
                ref: "branchRevenueChart",
                key: "branchRevenue",
                title: "Branch Revenue",
                desc: "Total revenue comparison across branches.",
              },
              {
                ref: "branchShareChart",
                key: "branchShare",
                title: "Branch Share",
                desc: "Each branch's contribution to total revenue.",
              },
              {
                ref: "invTopProductsChart",
                key: "invTopProducts",
                title: "Top Selling Products",
                desc: "Highest-grossing products by revenue.",
              },
              {
                ref: "invCategoryPieChart",
                key: "invCategoryPie",
                title: "Sales by Category",
                desc: "Proportion of sales by product category.",
              },
            ];
            for (const def of chartDefs) {
              if (!this._charts[def.key]) continue;
              const canvas = this.$refs[def.ref];
              if (canvas && typeof canvas.toDataURL === "function") {
                try {
                  chartImages.push({
                    data: canvas.toDataURL("image/png"),
                    width: 500,
                    title: def.title,
                    desc: def.desc,
                  });
                } catch (_) {}
              }
            }
          }
        }

        let fileBuffer = null;
        let contentType = "";
        if (this.genForm.format === "pdf") {
          fileBuffer = await exportPDF(
            this.genForm.type,
            rawRows || rows,
            meta,
            chartImages,
            this.topProductsData,
          );
          contentType = "application/pdf";
        }
        if (this.genForm.format === "excel") {
          fileBuffer = await exportExcel(this.genForm.type, rows, meta);
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        }

        let filePath = null;
        if (this.genForm.saveToCloud && fileBuffer) {
          const ts = Date.now();
          const ext = this.genForm.format === "pdf" ? "pdf" : "xlsx";
          const fileName = `${this.genForm.type.replace(/[^a-z0-9]/g, "-")}-${ts}.${ext}`;
          const {
            filePath: uploadedPath,
            publicUrl,
            error: uploadErr,
          } = await uploadReportFile(fileBuffer, fileName, contentType);
          if (uploadErr) {
            console.error("[Reports] Storage upload failed:", uploadErr);
          } else {
            filePath = publicUrl || uploadedPath;
          }
        }

        const { error: saveErr } = await saveReportRecord({
          type: this.genForm.type,
          title:
            meta.title + ` (${this.genForm.dateFrom} – ${this.genForm.dateTo})`,
          branchId: this.managerBranchId,
          generatedBy: Number(localStorage.getItem("userId")) || null,
          filePath: filePath,
          dateFrom: this.genForm.dateFrom,
          dateTo: this.genForm.dateTo,
        });
        if (saveErr)
          console.error("[Reports] Failed to save report record:", saveErr);

        this.showToast(
          "Report exported as " +
            this.genForm.format.toUpperCase() +
            " successfully!",
          "success",
        );
        this.mainTab = "view";
        await this.loadSavedReports();
      } catch (err) {
        this.showToast("Export failed: " + err.message, "error");
      } finally {
        this.generating = false;
      }
    },

    applyReportLink(link) {
      if (!link || !link.module) return;
      const base = "/manager";
      const routes = {
        inventory: "/inventory",
        sales: "/sales",
        schedule: "/schedule",
      };
      const path = routes[link.module];
      if (!path) return;
      const fullPath = base + path;
      if (this.$route.path !== fullPath) this.$router.push(fullPath);
    },

    applyTemplate(tpl) {
      this.genForm.category = tpl.category;
      this.genForm.type = tpl.type;
      this.mainTab = "generate";
      this.showToast(`Template "${tpl.name}" applied.`, "success");
    },

    resetGenForm() {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .split("T")[0];
      this.genForm = {
        category: "",
        type: "",
        dateFrom: weekAgo,
        dateTo: today,
        branchId: this.managerBranchId,
        format: "pdf",
        saveToCloud: false,
      };
      this.genErrors = {};
    },

    openPreview(r) {
      this.previewData = r;
      this.showPreview = true;
    },

    getReportTypeLabel(type) {
      const map = {};
      for (const cat of Object.values(this.reportTypeMap))
        for (const t of cat) map[t.value] = t.label;
      return map[type] || type;
    },

    getCategorySlug(type) {
      const map = {
        Sales: "sales",
        Inventory: "inventory",
        Schedule: "schedule",
      };
      return map[type] || (type || "").toLowerCase().replace(/\s+/g, "-");
    },

    formatRate(rate) {
      if (rate == null || isNaN(rate)) return "—";
      return Math.round(Number(rate));
    },

    formatTimeRemaining(days) {
      if (days == null || days === "N/A") return days || "—";
      if (isNaN(days)) return "—";
      const totalMin = Math.round(Number(days) * 24 * 60);
      const d = Math.floor(totalMin / 1440);
      const h = Math.floor((totalMin % 1440) / 60);
      const m = totalMin % 60;
      if (d > 0) return `${d}d ${h}h ${m}m`;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    },

    formatDate(d) {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },

    formatPeriod(report) {
      if (!report) return "—";
      const from = report.date_from || report.dateFrom;
      const to = report.date_to || report.dateTo;
      if (from && to) {
        const fromDate = new Date(from).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
        });
        const toDate = new Date(to).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `${fromDate} – ${toDate}`;
      }
      if (report.reportdate) {
        return new Date(report.reportdate).toLocaleDateString("en-PH", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return "—";
    },

    isPdfFile(path) {
      return path && path.match(/\.pdf($|\?)/i);
    },

    reDownloadReport(r) {
      if (r?.filepath) window.open(r.filepath, "_blank");
      else this.showToast("No file available for this report.", "error");
    },

    showToast(message, type = "success") {
      this.toast = { show: true, message, type };
      setTimeout(() => {
        this.toast.show = false;
      }, 3500);
    },
  },
};
</script>

<style scoped>
:root {
  --brand: #7b1d1d;
  --brand2: #a83232;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  --text: #1a1a1a;
  --muted: #6b7280;
}
.reports-page {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.page-sub {
  font-size: 0.82rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Branch pill shown in subtitle */
.branch-label {
  font-size: 13px;
  color: #8b4513;
  font-weight: 500;
  margin: 4px 0 0;
}

/* Branch locked box in generate form */
.branch-locked-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 7px;
  padding: 0.55rem 0.85rem;
  font-size: 0.84rem;
  color: #0369a1;
  font-weight: 600;
}
.branch-locked-badge {
  margin-left: auto;
  font-size: 0.64rem;
  font-weight: 700;
  background: #dbeafe;
  color: #1e40af;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* KPI */
.kpi-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}
.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.kpi-icon {
  color: #7b1d1d;
  font-size: 28px;
  flex-shrink: 0;
}
.kpi-info h3 {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 6px;
  font-weight: 500;
  margin-top: 0;
}
.kpi-info .kpi-value {
  font-size: 24px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
  margin-top: 0;
}
.kpi-change {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.kpi-change.up {
  color: #16a34a;
}
.kpi-change.down {
  color: #7b1d1d;
}
.skeleton-block {
  background: linear-gradient(90deg, #f0ebe8 25%, #f9f5f3 50%, #f0ebe8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}
@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--border);
}
.tab-btn {
  background: none;
  border: none;
  padding: 0.65rem 1.1rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
  cursor: pointer;
}
.tab-btn:hover {
  color: #7b1d1d;
}
.tab-btn.active {
  color: #7b1d1d;
  border-bottom-color: #7b1d1d;
}
.sub-tab-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.sub-tab-btn {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}
.sub-tab-btn:hover {
  border-color: #7b1d1d;
  color: #7b1d1d;
}
.sub-tab-btn.active {
  background: #f5ede8;
  color: #5d4037;
  border-color: #5d4037;
}

/* Charts */
.chart-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  height: 100%;
}
.chart-card-header {
  margin-bottom: 0.75rem;
}
.chart-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a1a;
}

.chart-wrap {
  position: relative;
  height: 220px;
}
.chart-wrap--sm {
  height: 200px;
}
.chart-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 160px;
  gap: 0.5rem;
}

/* Tables */
.table-wrap {
  border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table thead tr {
  background: #f9f5f3;
}
.data-table th {
  padding: 0.7rem 1rem;
  text-align: left;
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
.data-table td {
  padding: 0.7rem 1rem;
  font-size: 0.82rem;
  color: #1a1a1a;
  border-bottom: 1px solid #f0ebe8;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover {
  background: #faf7f5;
}
.rank {
  font-weight: 800;
  color: #7b1d1d;
}
.fw-600 {
  font-weight: 600;
}
.fw-700 {
  font-weight: 700;
}
.cat-badge {
  background: #f5ede8;
  color: #7b1d1d;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}
.badge-pill {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.badge-danger {
  background: #f5ede8;
  color: #7b1d1d;
}
.badge-warn {
  background: #fef9c3;
  color: #92400e;
}
.alert-count-badge {
  background: #f5ede8;
  color: #7b1d1d;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
}

/* Report type bar */
.report-type-bar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.rt-btn {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 0.4rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.rt-btn:hover {
  border-color: #7b1d1d;
  color: #7b1d1d;
}
.rt-btn.active {
  background: #f5ede8;
  color: #5d4037;
  border-color: #5d4037;
}
.report-type-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  display: inline-block;
}
.type-sales {
  background: #fef9c3;
  color: #92400e;
}
.type-inventory {
  background: #dcfce7;
  color: #166534;
}
.type-schedule {
  background: #dbeafe;
  color: #1e40af;
}

/* Reports table */
.reports-table {
  width: 100%;
}
.reports-table thead th {
  background: #f9f5f3;
  padding: 0.75rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.reports-table tbody tr {
  transition: background 0.15s;
}
.reports-table tbody tr:hover {
  background: #faf7f5;
}
.report-row td {
  padding: 0.7rem 1rem;
  font-size: 0.82rem;
  color: #1a1a1a;
  border-bottom: 1px solid #f0ebe8;
}
.reports-table tbody tr:last-child td {
  border-bottom: none;
}
.col-id {
  width: 8%;
}
.col-title {
  width: 32%;
}
.col-category {
  width: 15%;
}
.col-period {
  width: 18%;
}
.col-created {
  width: 15%;
}
.col-actions {
  width: 12%;
}
.col-empty {
  text-align: center;
}
.report-id-badge {
  font-family: monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  background: #f5f0ed;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  display: inline-block;
}
.report-title-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.report-title-main {
  font-weight: 600;
  color: #1a1a1a;
}
.report-title-sub {
  font-size: 0.7rem;
  color: #6b7280;
}
.period-text {
  font-size: 0.82rem;
  color: #1a1a1a;
  font-weight: 500;
  white-space: nowrap;
}

/* Action buttons */
.action-buttons-group {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}
.action-btn {
  background: none;
  border: 1px solid var(--border);
  padding: 0.35rem 0.5rem;
  border-radius: 5px;
  color: #6b7280;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}
.action-btn:hover {
  background: #faf7f5;
  border-color: #7b1d1d;
  color: #7b1d1d;
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
  transform: scale(0.95);
}

/* Empty state */
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
  margin-bottom: 0.5rem;
}
.empty-state-description {
  font-size: 0.85rem;
  color: #6b7280;
  margin-bottom: 1.25rem;
}

/* Generate panel */
.gen-panel {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.gen-panel-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
}
.gen-panel-sub {
  font-size: 0.78rem;
  color: #6b7280;
}
.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 0.25rem;
  display: block;
}
.field-error {
  font-size: 0.73rem;
  color: #7b1d1d;
  margin-top: 0.25rem;
}
.format-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
.format-opt {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.15s;
}
.format-opt:hover {
  border-color: #7b1d1d;
  color: #7b1d1d;
}
.format-opt.active {
  border-color: #7b1d1d;
  background: #fdf5f5;
  color: #7b1d1d;
}
.format-opt i {
  font-size: 1.2rem;
}

/* Templates */
.tpl-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}
.tpl-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: #7b1d1d;
}
.tpl-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}
.tpl-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
.tpl-icon--brown {
  background: #f5ede8;
  color: #7b1d1d;
}
.tpl-icon--green {
  background: #dcfce7;
  color: #16a34a;
}
.tpl-icon--blue {
  background: #dbeafe;
  color: #1d4ed8;
}
.tpl-icon--red {
  background: #f5ede8;
  color: #7b1d1d;
}
.tpl-icon--purple {
  background: #f3e8ff;
  color: #9333ea;
}
.tpl-icon--gold {
  background: #fef9c3;
  color: #b45309;
}
.tpl-formats {
  display: flex;
  gap: 0.25rem;
}
.tpl-fmt {
  font-size: 0.64rem;
  background: #f5f0ed;
  color: #6b7280;
  font-weight: 600;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
}
.tpl-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.25rem;
}
.tpl-desc {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}
.tpl-select-btn {
  background: none;
  border: 1px solid var(--border);
  color: #7b1d1d;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.7rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
}
.tpl-select-btn:hover {
  background: #7b1d1d;
  color: #fff;
  border-color: #7b1d1d;
}

/* Filter bar */
.filter-bar {
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

/* Buttons */
.btn-primary-brand {
  background: #7b1d1d;
  color: #fff;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.18s;
  cursor: pointer;
}
.btn-primary-brand:hover:not(:disabled) {
  background: #a83232;
}
.btn-generate {
  background: #5d4037;
  color: #fff;
  border: none;
  padding: 0.5rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.18s;
  cursor: pointer;
}
.btn-generate:hover:not(:disabled) {
  background: #fff;
  color: #5d4037;
  border: 1px solid #5d4037;
}
.btn-generate:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-gray {
  background: #e0e0e0;
  color: #333;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.84rem;
  cursor: pointer;
  transition: background 0.18s;
}
.btn-gray:hover {
  background: #d0d0d0;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: #1a1a1a;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.84rem;
  cursor: pointer;
}
.btn-ghost:hover {
  background: #f0ebe8;
}
.fc-brand {
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
}
.fc-brand:focus {
  border-color: #7b1d1d;
  box-shadow: 0 0 0 2px rgba(123, 29, 29, 0.15);
  outline: none;
}

/* Alerts */
.alert-error {
  background: #f5ede8;
  border: 1px solid #d4b8b0;
  color: #7b1d1d;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.84rem;
}
.alert-warn {
  background: #fff3cd;
  border: 1px solid #ffeeba;
  color: #856404;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.84rem;
}
.alert-brand {
  background: #f5ede8;
  border: 1px solid #d4b8b0;
  color: #5d4037;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  line-height: 1.5;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}
.modal-panel {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.22s ease;
}
.modal-panel--lg {
  max-width: 680px;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.modal-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}
.modal-panel-header h5 {
  font-size: 1rem;
  font-weight: 700;
}
.modal-sub {
  font-size: 0.78rem;
  color: #6b7280;
}
.modal-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
.modal-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}
.btn-close-panel {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #6b7280;
  cursor: pointer;
}
.preview-type-badge {
  display: inline-block;
  background: rgba(123, 29, 29, 0.1);
  color: #7b1d1d;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}
.preview-placeholder {
  text-align: center;
  padding: 2rem;
  background: #f9f5f3;
  border-radius: 10px;
  margin-top: 1rem;
}
.preview-placeholder code {
  font-size: 0.75rem;
  background: #f0e8e6;
  color: #7b1d1d;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}
.pdf-viewer {
  width: 100%;
  height: 70vh;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: #f9f9f9;
}
.preview-excel-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  border: 2px dashed var(--border);
  border-radius: 8px;
}

/* Toast */
.toast-wrap {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 2000;
  background: #1a1a1a;
  color: #fff;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  font-size: 0.84rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: fadeIn 0.2s ease;
}
.toast-wrap.success {
  border-left: 4px solid #28a745;
}
.toast-wrap.error {
  border-left: 4px solid #7b1d1d;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
<template>
  <div class="reports-page">
    <div class="page-header-row">
      <div>
        <h4 class="page-title mb-1">Reports &amp; Analytics</h4>
        <span class="branch-pill" v-if="managerBranchName">
          <i class="bi bi-geo-alt-fill"></i> {{ managerBranchName }}
        </span>
      </div>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <select v-model="period" class="form-select fc-brand" style="width:150px" @change="onPeriodChange">
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>
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

      <!-- INVENTORY (replaces Branches tab for managers) -->
      <div ref="invSect" v-show="subTab === 'inventory'">
        <div class="row g-3 mb-3">
          <div class="col-12">
            <div class="chart-card">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div class="chart-title">Low Stock Alerts</div>
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
        <div class="row g-3 mb-3">
          <div class="col-12 col-md-7">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Top Selling Products</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.topProducts">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap" v-show="!chartsLoading.topProducts">
                <canvas ref="invTopProductsChart"></canvas>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="chart-card">
              <div class="chart-card-header">
                <div class="chart-title">Sales by Category</div>
              </div>
              <div class="chart-loading" v-if="chartsLoading.categoryPie">
                <div class="spinner-border spinner-border-sm text-muted"></div>
              </div>
              <div class="chart-wrap chart-wrap--sm" v-show="!chartsLoading.categoryPie">
                <canvas ref="invCategoryPieChart"></canvas>
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
                        <div class="report-title-sub">Generated by {{ r.generatedby?.firstname || 'Manager' }}</div>
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
                    <td colspan="6" class="col-empty">
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

            <!-- Branch is locked to manager's branch — shown as read-only info -->
            <div class="mb-3">
              <label class="form-label-sm">Branch</label>
              <div class="branch-locked-box">
                <i class="bi bi-geo-alt-fill me-2"></i>
                <span>{{ managerBranchName || 'Your Branch' }}</span>
                <span class="branch-locked-badge">Assigned</span>
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
                {{ formatDate(previewData?.reportdate) }} · {{ managerBranchName || 'Your Branch' }}
              </p>
            </div>
            <button class="btn-close-panel" @click="showPreview = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-panel-body">
            <span class="preview-type-badge">{{ previewData?.reporttype }}</span>
            <div v-if="previewData?.filepath" class="preview-viewer mt-3">
              <iframe
                v-if="isPdfFile(previewData.filepath)"
                :src="previewData.filepath"
                class="pdf-viewer"
                frameborder="0"
              ></iframe>
              <div v-else class="preview-excel-placeholder">
                <i class="bi bi-file-earmark-spreadsheet fs-1 text-muted"></i>
                <p class="text-muted mt-2 mb-0">Excel files cannot be previewed inline.</p>
                <a :href="previewData.filepath" target="_blank"
                  class="btn btn-primary-brand mt-3" style="display:inline-block">
                  <i class="bi bi-download me-1"></i> Download File
                </a>
              </div>
            </div>
            <div v-else class="preview-placeholder mt-3">
              <i class="bi bi-cloud-slash fs-1 text-muted"></i>
              <p class="text-muted mt-2 mb-0">File was not saved to cloud storage.</p>
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
  getLowStockItems,
  getStockTurnover,
  getSavedReports,
  saveReportRecord,
  fetchReportData,
  uploadReportFile,
} from '../../services/reportService.js'
import { exportPDF }   from '../../services/pdfExporter.js'
import { exportExcel } from '../../services/excelExporter.js'
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
  name: 'ReportsAnalyticsManager',

  data() {
    const today   = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    return {
      // Manager branch — resolved on mount from localStorage 'branch'
      managerBranchId:   null,
      managerBranchName: '',
      branchResolved:    false,

      // UI
      mainTab: 'analytics',
      subTab:  'sales',
      period:  'week',
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
      lowStockData:      [],
      stockTurnoverData: [],
      savedReports:      [],

      // View Reports
      viewCategoryFilter: 'all',
      viewSearch:   '',
      viewDateFrom: '',
      viewDateTo:   '',

      // Generate
      genForm: {
        category: '',
        type: '',
        dateFrom: weekAgo,
        dateTo: today,
        branchId: null,
        format: 'pdf',
        saveToCloud: false,
      },
      genErrors: {},

      toast: { show: false, message: '', type: 'success' },

      // Static config — no "branches" sub-tab (manager sees only their own branch)
      subTabs: [
        { key: 'sales',     label: 'Sales'     },
        { key: 'products',  label: 'Products'  },
        { key: 'inventory', label: 'Inventory' },
      ],

      // No "consolidated" category for managers
      reportCategories: [
        { key: 'all',       label: 'All Reports', icon: 'bi bi-grid'            },
        { key: 'sales',     label: 'Sales',       icon: 'bi bi-currency-dollar' },
        { key: 'inventory', label: 'Inventory',   icon: 'bi bi-box-seam'        },
        { key: 'schedule',  label: 'Schedule',    icon: 'bi bi-calendar3'       },
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
      },

      formats: [
        { value: 'pdf',   label: 'PDF',   icon: 'bi bi-file-earmark-pdf'   },
        { value: 'excel', label: 'Excel', icon: 'bi bi-file-earmark-excel' },
      ],

      // No "consolidated" template for managers
      reportTemplates: [
        { key: 'daily-sales',    name: 'Daily Sales Report',       desc: 'Detailed breakdown of daily sales transactions',    icon: 'bi bi-receipt',              color: 'brown',  category: 'sales',     type: 'sales-pipeline',    formats: ['PDF','Excel'] },
        { key: 'monthly-rev',    name: 'Monthly Revenue Report',   desc: 'Comprehensive monthly revenue analysis',            icon: 'bi bi-graph-up-arrow',       color: 'green',  category: 'sales',     type: 'sales-monthly',     formats: ['PDF','Excel'] },
        { key: 'inv-status',     name: 'Inventory Status Report',  desc: 'Current stock levels for all raw materials',       icon: 'bi bi-box-seam',             color: 'blue',   category: 'inventory', type: 'inventory-on-hand', formats: ['PDF','Excel'] },
        { key: 'low-stock',      name: 'Low Stock Alert Report',   desc: 'Items that need immediate reordering',             icon: 'bi bi-exclamation-triangle', color: 'red',    category: 'inventory', type: 'low-inventory',     formats: ['PDF','Excel'] },
        { key: 'aging',          name: 'Inventory Aging Report',   desc: 'Items nearing expiration — prevent food waste',    icon: 'bi bi-clock-history',        color: 'gold',   category: 'inventory', type: 'inventory-aging',   formats: ['PDF','Excel'] },
        { key: 'top-products',   name: 'Top Selling Products',     desc: 'Best-performing menu items this period',           icon: 'bi bi-star',                 color: 'gold',   category: 'sales',     type: 'sales-performance', formats: ['PDF','Excel'] },
        { key: 'employee-sched', name: 'Employee Schedule Report', desc: 'Staff shift assignments and schedule summary',     icon: 'bi bi-person-lines-fill',    color: 'purple', category: 'schedule',  type: 'employee-schedule', formats: ['PDF','Excel'] },
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
    await this.resolveManagerBranch()
    await this.loadAnalyticsData()
    this.$nextTick(() => this.renderActiveCharts())
  },

  beforeUnmount() {
    Object.values(this._charts).forEach(c => c?.destroy())
  },

  methods: {
    // ── BRANCH RESOLUTION ────────────────────────────────────────

    async resolveManagerBranch() {
      const slug = localStorage.getItem('branch')
      if (!slug || slug === 'all') {
        this.branchResolved = true
        return
      }
      const parsed = parseInt(slug, 10)
      if (!isNaN(parsed)) {
        const { data } = await supabase
          .from('branch')
          .select('BranchId, BranchName')
          .eq('BranchId', parsed)
          .maybeSingle()
        if (data) {
          this.managerBranchId   = data.BranchId
          this.managerBranchName = data.BranchName
        }
      } else {
        const { data } = await supabase
          .from('branch')
          .select('BranchId, BranchName')
          .ilike('BranchName', `%${slug}%`)
          .limit(1)
          .maybeSingle()
        if (data) {
          this.managerBranchId   = data.BranchId
          this.managerBranchName = data.BranchName
        } else {
          const { data: locData } = await supabase
            .from('branch')
            .select('BranchId, BranchName')
            .ilike('Location', `%${slug}%`)
            .limit(1)
            .maybeSingle()
          if (locData) {
            this.managerBranchId   = locData.BranchId
            this.managerBranchName = locData.BranchName
          }
        }
      }
      this.branchResolved = true
    },

    // ── LOADERS ──────────────────────────────────────────────────

    async onPeriodChange() {
      await this.loadAnalyticsData()
      this.$nextTick(() => this.renderActiveCharts())
    },

    async loadAnalyticsData() {
      const { from, to } = getDateRange(this.period)
      // Always use manager's branch — never null/all-branches
      const branch = this.managerBranchId

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
        { label: 'Total Sales',     value: '₱' + Number(k.total_sales     || 0).toLocaleString(), change: sc.val, up: sc.up, icon: 'bi bi-currency-dollar' },
        { label: 'Total Orders',    value:       Number(k.total_orders    || 0).toLocaleString(),  change: oc.val, up: oc.up, icon: 'bi bi-receipt'         },
        { label: 'Avg Order Value', value: '₱' + Number(k.avg_order_value || 0).toFixed(2),        change: '—',   up: true,  icon: 'bi bi-graph-up'        },
        { label: 'Active Products', value:       Number(k.active_products || 0).toLocaleString(),  change: '—',   up: true,  icon: 'bi bi-box-seam'        },
      ]

      await Promise.all([
        this.loadSalesTrend(from, to, branch),
        this.loadPeakHours(from, to, branch),
        this.loadRevCategory(from, to, branch),
        this.loadTopProducts(from, to, branch),
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
      await this.loadChart('peakHours', () => getPeakHours(from, to, branch), 'peakHoursData')
    },

    async loadRevCategory(from, to, branch) {
      await this.loadChart('revCategory', () => getRevenueByCategory(from, to, branch), 'revCategoryData')
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
      await this.loadChart('stockTurnover', () => getStockTurnover(from, to, branch), 'stockTurnoverData')
    },

    async loadSavedReports() {
      this.reportsListLoading = true
      const types = this.viewCategoryFilter !== 'all'
        ? this.reportTypeMap[this.viewCategoryFilter]?.map(t => t.value)
        : undefined
      const { data, error } = await getSavedReports({
        types,
        dateFrom:  this.viewDateFrom || undefined,
        dateTo:    this.viewDateTo   || undefined,
        branchId:  this.managerBranchId, // scope reports to manager's branch only
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

    // ── CHARTS ───────────────────────────────────────────────────

    renderActiveCharts() {
      if (this.mainTab !== 'analytics') return
      if (this.subTab === 'sales')     this.renderSalesCharts()
      if (this.subTab === 'products')  this.renderProductCharts()
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
      const labels = this.salesTrendData.map(r => r.sale_date)
      const sales  = this.salesTrendData.map(r => Number(r.net_sales))
      const orders = this.salesTrendData.map(r => Number(r.order_count))

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

    renderInventoryCharts() {
      const names = this.topProductsData.map(p => p.product_name.length > 16 ? p.product_name.slice(0,16) + '…' : p.product_name)
      const revs  = this.topProductsData.map(p => Number(p.revenue))

      this.makeChart('invTopProducts', 'invTopProductsChart', {
        type: 'bar',
        data: { labels: names, datasets: [{ label: 'Revenue (₱)', data: revs, backgroundColor: PALETTE, borderRadius: 5 }] },
        options: { ...baseOpts(), indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => '₱' + Number(c.raw).toLocaleString() } } } },
      })

      const catLabels = this.revCategoryData.map(r => r.category)
      const catRevs   = this.revCategoryData.map(r => Number(r.revenue))

      this.makeChart('invCategoryPie', 'invCategoryPieChart', {
        type: 'pie',
        data: { labels: catLabels, datasets: [{ data: catRevs, backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#374151', font: LBL, padding: 8 } }, tooltip: { callbacks: { label: c => c.label + ': ₱' + Number(c.raw).toLocaleString() } } } },
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
        const { data: rows, raw: rawRows, error } = await fetchReportData(this.genForm.type, {
          dateFrom: this.genForm.dateFrom,
          dateTo:   this.genForm.dateTo,
          branchId: this.managerBranchId, // always manager's branch
        })
        if (error) throw new Error(error.message)
        if (!rows || rows.length === 0) {
          this.showToast('No data found for the selected period.', 'error')
          return
        }

        const typeDef = this.availableTypes.find(t => t.value === this.genForm.type)
        const meta = {
          title:       typeDef?.label || this.genForm.type,
          dateFrom:    this.genForm.dateFrom,
          dateTo:      this.genForm.dateTo,
          branch:      this.managerBranchName || 'Your Branch',
          generatedBy: localStorage.getItem('username') || localStorage.getItem('role') || 'Manager',
        }

        // Capture chart canvases for PDF
        let chartImages = []
        if (this.genForm.format === 'pdf') {
          const isInventory = this.genForm.type.startsWith('inventory-')

          if (isInventory) {
            const CHART_W = 480
            const BAR_H = 24
            const BAR_GAP = 6
            const LABEL_W = 110

            // Top Products Horizontal Bar
            const top = this.topProductsData || []
            const maxRev = Math.max(...top.map(p => Number(p.revenue)), 1)
            const barSvg = top.length
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="${CHART_W}" height="${top.length * (BAR_H + BAR_GAP) + 30}" viewBox="0 0 ${CHART_W} ${top.length * (BAR_H + BAR_GAP) + 30}">
                  <style>.t{fill:#374151;font:11px sans-serif}.l{fill:#6b7280;font:10px sans-serif}</style>
                  ${top.map((p, i) => {
                    const y = i * (BAR_H + BAR_GAP)
                    const w = Math.max((Number(p.revenue) / maxRev) * (CHART_W - LABEL_W - 60), 2)
                    const color = PALETTE[i % PALETTE.length]
                    return `<text x="0" y="${y + BAR_H / 2 + 4}" class="t" text-anchor="end">${(p.product_name || '').length > 14 ? (p.product_name || '').slice(0,14)+'…' : (p.product_name || '')}</text>` +
                           `<rect x="${LABEL_W + 4}" y="${y + 2}" width="${w}" height="${BAR_H - 4}" rx="3" fill="${color}"/>` +
                           `<text x="${LABEL_W + 8 + w}" y="${y + BAR_H / 2 + 4}" class="l">₱${Number(p.revenue).toLocaleString()}</text>`
                  }).join('')}
                  <text x="0" y="${top.length * (BAR_H + BAR_GAP) + 20}" class="l">Revenue (₱)</text>
                </svg>`
              : ''
            if (barSvg) chartImages.push({ svg: barSvg, width: CHART_W, title: 'Top Selling Products', desc: 'Highest-grossing products by revenue.' })

            // Sales by Category Pie
            const cats = this.revCategoryData || []
            const total = cats.reduce((s, c) => s + Number(c.revenue), 0) || 1
            const PIE_W = 320, PIE_H = 200, CX = 140, CY = 100, R = 80
            let angle = -Math.PI / 2
            const slices = cats.map((c, i) => {
              const val = Number(c.revenue) / total * 2 * Math.PI
              const a1 = angle, a2 = angle + val
              const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1)
              const x2 = CX + R * Math.cos(a2), y2 = CY + R * Math.sin(a2)
              const large = val > Math.PI ? 1 : 0
              const color = PALETTE[i % PALETTE.length]
              const path = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} Z`
              angle = a2
              return { path, color, label: c.category || '—', pct: (Number(c.revenue) / total * 100).toFixed(1) }
            })
            const pieSvg = cats.length
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="${PIE_W + 160}" height="${PIE_H + 20}" viewBox="0 0 ${PIE_W + 160} ${PIE_H + 20}">
                  <style>.t{fill:#374151;font:11px sans-serif}.p{fill:#6b7280;font:10px sans-serif}</style>
                  ${slices.map(s => `<path d="${s.path}" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('')}
                  ${slices.map((s, i) => {
                    const ly = 20 + i * 22
                    return `<rect x="${PIE_W + 10}" y="${ly}" width="12" height="12" rx="2" fill="${s.color}"/>` +
                           `<text x="${PIE_W + 28}" y="${ly + 10}" class="t">${s.label}</text>` +
                           `<text x="${PIE_W + 28}" y="${ly + 21}" class="p">${s.pct}%</text>`
                  }).join('')}
                </svg>`
              : ''
            if (pieSvg) chartImages.push({ svg: pieSvg, width: PIE_W + 160, title: 'Sales by Category', desc: 'Proportion of sales by product category.' })
          } else {
            const chartDefs = [
              { ref: 'salesTrendChart',    key: 'salesTrend',    title: 'Sales Trend',           desc: 'Daily sales trend over the selected period.' },
              { ref: 'orderVolumeChart',   key: 'orderVolume',   title: 'Order Volume',          desc: 'Number of orders placed per day.' },
              { ref: 'peakHoursChart',     key: 'peakHours',     title: 'Peak Hours',            desc: 'Busiest hours of operation.' },
              { ref: 'revCategoryChart',   key: 'revCategory',   title: 'Revenue by Category',   desc: 'Distribution of revenue across product categories.' },
              { ref: 'topProductsChart',   key: 'topProducts',   title: 'Top Selling Products',  desc: 'Highest-grossing products by revenue.' },
              { ref: 'categoryPieChart',   key: 'categoryPie',   title: 'Sales by Category',     desc: 'Proportion of sales by product category.' },
              { ref: 'branchRevenueChart', key: 'branchRevenue', title: 'Branch Revenue',        desc: 'Total revenue comparison across branches.' },
              { ref: 'branchShareChart',   key: 'branchShare',   title: 'Branch Share',          desc: "Each branch's contribution to total revenue." },
              { ref: 'invTopProductsChart', key: 'invTopProducts', title: 'Top Selling Products',  desc: 'Highest-grossing products by revenue.' },
              { ref: 'invCategoryPieChart', key: 'invCategoryPie', title: 'Sales by Category',     desc: 'Proportion of sales by product category.' },
            ]
            for (const def of chartDefs) {
              if (!this._charts[def.key]) continue
              const canvas = this.$refs[def.ref]
              if (canvas && typeof canvas.toDataURL === 'function') {
                try {
                  chartImages.push({ data: canvas.toDataURL('image/png'), width: 500, title: def.title, desc: def.desc })
                } catch (_) {}
              }
            }
          }
        }

        let fileBuffer = null
        let contentType = ''
        if (this.genForm.format === 'pdf') {
          fileBuffer = await exportPDF(this.genForm.type, rawRows || rows, meta, chartImages, this.topProductsData)
          contentType = 'application/pdf'
        }
        if (this.genForm.format === 'excel') {
          fileBuffer = await exportExcel(this.genForm.type, rows, meta)
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        let filePath = null
        if (this.genForm.saveToCloud && fileBuffer) {
          const ts = Date.now()
          const ext = this.genForm.format === 'pdf' ? 'pdf' : 'xlsx'
          const fileName = `${this.genForm.type.replace(/[^a-z0-9]/g, '-')}-${ts}.${ext}`
          const { filePath: uploadedPath, publicUrl, error: uploadErr } = await uploadReportFile(fileBuffer, fileName, contentType)
          if (uploadErr) {
            console.error('[Reports] Storage upload failed:', uploadErr)
          } else {
            filePath = publicUrl || uploadedPath
          }
        }

        const { error: saveErr } = await saveReportRecord({
          type:        this.genForm.type,
          title:       meta.title + ` (${this.genForm.dateFrom} – ${this.genForm.dateTo})`,
          branchId:    this.managerBranchId,
          generatedBy: Number(localStorage.getItem('userId')) || null,
          filePath:    filePath,
          dateFrom:    this.genForm.dateFrom,
          dateTo:      this.genForm.dateTo,
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
      const base   = '/manager'
      const routes = { inventory: '/inventory', sales: '/sales', schedule: '/schedule' }
      const path   = routes[link.module]
      if (!path) return
      const fullPath = base + path
      if (this.$route.path !== fullPath) this.$router.push(fullPath)
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
      this.genForm  = {
        category: '',
        type: '',
        dateFrom: weekAgo,
        dateTo: today,
        branchId: this.managerBranchId,
        format: 'pdf',
        saveToCloud: false,
      }
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
        'Sales': 'sales', 'Inventory': 'inventory', 'Schedule': 'schedule',
      }
      return map[type] || (type || '').toLowerCase().replace(/\s+/g, '-')
    },

    formatRate(rate) {
      if (rate == null || isNaN(rate)) return '—'
      return Math.round(Number(rate))
    },

    formatTimeRemaining(days) {
      if (days == null || days === 'N/A') return days || '—'
      if (isNaN(days)) return '—'
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
      const to   = report.date_to   || report.dateTo
      if (from && to) {
        const fromDate = new Date(from).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        const toDate   = new Date(to).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${fromDate} – ${toDate}`
      }
      if (report.reportdate) {
        return new Date(report.reportdate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
      }
      return '—'
    },

    isPdfFile(path) {
      return path && path.match(/\.pdf($|\?)/i);
    },

    reDownloadReport(r) {
      if (r?.filepath) window.open(r.filepath, '_blank')
      else this.showToast('No file available for this report.', 'error')
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

.page-header-row { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:.75rem; margin-bottom:1.5rem; }
.page-title { font-size:1.35rem; font-weight:700; color:#1a1a1a; }
.page-sub   { font-size:.82rem; color:#6b7280; display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }

/* Branch pill shown in subtitle */
.branch-pill {
  display:inline-flex; align-items:center; gap:.3rem;
  background:#eef6ff; color:#1d4ed8;
  border:1px solid #bfdbfe; border-radius:999px;
  font-size:.72rem; font-weight:700;
  padding:.15rem .65rem;
}

/* Branch locked box in generate form */
.branch-locked-box {
  display:flex; align-items:center; gap:.5rem;
  background:#f0f9ff; border:1px solid #bae6fd;
  border-radius:7px; padding:.55rem .85rem;
  font-size:.84rem; color:#0369a1; font-weight:600;
}
.branch-locked-badge {
  margin-left:auto;
  font-size:.64rem; font-weight:700; background:#dbeafe;
  color:#1e40af; padding:.15rem .5rem; border-radius:4px;
  text-transform:uppercase; letter-spacing:.04em;
}

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
.cat-badge { background:#f5ede8; color:#7B1D1D; font-size:.7rem; font-weight:600; padding:.15rem .5rem; border-radius:4px; }
.badge-pill   { display:inline-block; font-size:.68rem; font-weight:700; padding:.2rem .55rem; border-radius:999px; }
.badge-danger { background:#F5EDE8; color:#7B1D1D; }
.badge-warn   { background:#fef9c3; color:#92400e; }
.alert-count-badge { background:#F5EDE8; color:#7B1D1D; font-size:.75rem; font-weight:700; padding:.3rem .75rem; border-radius:6px; }

/* Report type bar */
.report-type-bar { display:flex; gap:.5rem; flex-wrap:wrap; }
.rt-btn { background:#fff; border:1px solid var(--border); border-radius:7px; padding:.4rem 1rem; font-size:.82rem; font-weight:600; color:#6b7280; cursor:pointer; transition:all .15s; display:flex; align-items:center; gap:.4rem; }
.rt-btn:hover { border-color:#7B1D1D; color:#7B1D1D; } .rt-btn.active { background:#f5ede8; color:#5D4037; border-color:#5D4037; }
.report-type-badge { font-size:.68rem; font-weight:600; padding:.2rem .55rem; border-radius:4px; display:inline-block; }
.type-sales     { background:#fef9c3; color:#92400e; }
.type-inventory { background:#dcfce7; color:#166534; }
.type-schedule  { background:#dbeafe; color:#1e40af; }

/* Reports table */
.reports-table { width:100%; }
.reports-table thead th { background:#f9f5f3; padding:.75rem 1rem; font-size:.72rem; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; border-bottom:1px solid var(--border); text-align:left; }
.reports-table tbody tr { transition:background .15s; }
.reports-table tbody tr:hover { background:#faf7f5; }
.report-row td { padding:.7rem 1rem; font-size:.82rem; color:#1a1a1a; border-bottom:1px solid #f0ebe8; }
.reports-table tbody tr:last-child td { border-bottom:none; }
.col-id { width:8%; } .col-title { width:32%; } .col-category { width:15%; }
.col-period { width:18%; } .col-created { width:15%; } .col-actions { width:12%; }
.col-empty { text-align:center; }
.report-id-badge { font-family:monospace; font-size:.78rem; font-weight:600; color:#6b7280; background:#f5f0ed; padding:.2rem .5rem; border-radius:4px; display:inline-block; }
.report-title-cell { display:flex; flex-direction:column; gap:.2rem; }
.report-title-main { font-weight:600; color:#1a1a1a; }
.report-title-sub  { font-size:.7rem; color:#6b7280; }
.period-text { font-size:.82rem; color:#1a1a1a; font-weight:500; white-space:nowrap; }

/* Action buttons */
.action-buttons-group { display:flex; gap:.5rem; justify-content:center; align-items:center; }
.action-btn { background:none; border:1px solid var(--border); padding:.35rem .5rem; border-radius:5px; color:#6b7280; font-size:.85rem; cursor:pointer; transition:all .15s ease; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; }
.action-btn:hover { background:#faf7f5; border-color:#7B1D1D; color:#7B1D1D; }
.action-btn.preview { color:#1e40af; } .action-btn.preview:hover { background:#eff6ff; border-color:#1e40af; color:#1e40af; }
.action-btn.download { color:#059669; } .action-btn.download:hover { background:#ecfdf5; border-color:#059669; color:#059669; }
.action-btn:active { transform:scale(.95); }

/* Empty state */
.empty-state { text-align:center; padding:3rem 2rem; }
.empty-state-icon { display:inline-flex; align-items:center; justify-content:center; width:80px; height:80px; background:#f5f0ed; border-radius:50%; font-size:2.5rem; color:#d1d5db; margin-bottom:1rem; }
.empty-state-title { font-size:1.05rem; font-weight:700; color:#1a1a1a; margin-bottom:.5rem; }
.empty-state-description { font-size:.85rem; color:#6b7280; margin-bottom:1.25rem; }

/* Generate panel */
.gen-panel       { background:#fff; border-radius:12px; padding:1.5rem; box-shadow:var(--shadow); border:1px solid var(--border); }
.gen-panel-title { font-size:1rem; font-weight:700; color:#1a1a1a; }
.gen-panel-sub   { font-size:.78rem; color:#6b7280; }
.form-label-sm   { font-size:.78rem; font-weight:600; color:#1a1a1a; margin-bottom:.25rem; display:block; }
.field-error     { font-size:.73rem; color:#7B1D1D; margin-top:.25rem; }
.format-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:.5rem; }
.format-opt  { border:1.5px solid var(--border); border-radius:8px; padding:.6rem .5rem; display:flex; flex-direction:column; align-items:center; gap:.25rem; cursor:pointer; font-size:.78rem; font-weight:600; color:#6b7280; transition:all .15s; }
.format-opt:hover { border-color:#7B1D1D; color:#7B1D1D; } .format-opt.active { border-color:#7B1D1D; background:#fdf5f5; color:#7B1D1D; }
.format-opt i { font-size:1.2rem; }

/* Templates */
.tpl-card { background:#fff; border-radius:10px; padding:1rem 1.1rem; border:1px solid var(--border); box-shadow:var(--shadow); cursor:pointer; transition:box-shadow .2s,border-color .2s; }
.tpl-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.1); border-color:#7B1D1D; }
.tpl-card-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem; }
.tpl-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1rem; }
.tpl-icon--brown  { background:#f5ede8; color:#7B1D1D; } .tpl-icon--green  { background:#dcfce7; color:#16a34a; }
.tpl-icon--blue   { background:#dbeafe; color:#1d4ed8; } .tpl-icon--red    { background:#F5EDE8; color:#7B1D1D; }
.tpl-icon--purple { background:#f3e8ff; color:#9333ea; } .tpl-icon--gold   { background:#fef9c3; color:#b45309; }
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
.btn-primary-brand:hover:not(:disabled) { background:#A83232; }
.btn-generate { background:#5D4037; color:#fff; border:none; padding:.5rem .9rem; border-radius:6px; font-size:.85rem; font-weight:600; transition:all .18s; cursor:pointer; }
.btn-generate:hover:not(:disabled) { background:#fff; color:#5D4037; border:1px solid #5D4037; }
.btn-generate:disabled { opacity:.6; cursor:not-allowed; }
.btn-gray { background:#e0e0e0; color:#333; border:none; padding:.45rem .9rem; border-radius:6px; font-size:.84rem; cursor:pointer; transition:background .18s; }
.btn-gray:hover { background:#d0d0d0; }
.btn-ghost { background:transparent; border:1px solid var(--border); color:#1a1a1a; padding:.45rem .9rem; border-radius:6px; font-size:.84rem; cursor:pointer; }
.btn-ghost:hover { background:#f0ebe8; }
.fc-brand { font-size:.84rem; border-color:var(--border); border-radius:6px; }
.fc-brand:focus { border-color:#7B1D1D; box-shadow:0 0 0 2px rgba(123,29,29,.15); outline:none; }

/* Alerts */
.alert-error { background:#F5EDE8; border:1px solid #D4B8B0; color:#7B1D1D; padding:.75rem 1rem; border-radius:8px; font-size:.84rem; }
.alert-warn  { background:#fff3cd; border:1px solid #ffeeba; color:#856404; padding:.75rem 1rem; border-radius:8px; font-size:.84rem; }
.alert-brand { background:#f5ede8; border:1px solid #d4b8b0; color:#5D4037; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; line-height:1.5; }

/* Modal */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:1050; padding:1rem; }
.modal-panel { background:#fff; border-radius:14px; width:100%; max-width:580px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.2); animation:slideUp .22s ease; }
.modal-panel--lg { max-width:680px; }
@keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
.modal-panel-header { display:flex; align-items:flex-start; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid var(--border); }
.modal-panel-header h5 { font-size:1rem; font-weight:700; }
.modal-sub { font-size:.78rem; color:#6b7280; }
.modal-panel-body { flex:1; overflow-y:auto; padding:1.5rem; }
.modal-panel-footer { display:flex; justify-content:flex-end; gap:.6rem; padding:1rem 1.5rem; border-top:1px solid var(--border); }
.btn-close-panel { background:none; border:none; font-size:.9rem; color:#6b7280; cursor:pointer; }
.preview-type-badge { display:inline-block; background:rgba(123,29,29,.10); color:#7B1D1D; font-size:.75rem; font-weight:700; padding:.2rem .6rem; border-radius:4px; }
.preview-placeholder { text-align:center; padding:2rem; background:#f9f5f3; border-radius:10px; margin-top:1rem; }
.preview-placeholder code { font-size:.75rem; background:#f0e8e6; color:#7B1D1D; padding:.15rem .4rem; border-radius:4px; }
.pdf-viewer { width:100%; height:70vh; border:1px solid var(--border); border-radius:6px; background:#f9f9f9; }
.preview-excel-placeholder { text-align:center; padding:3rem 1rem; border:2px dashed var(--border); border-radius:8px; }

/* Toast */
.toast-wrap { position:fixed; bottom:1.5rem; right:1.5rem; z-index:2000; background:#1a1a1a; color:#fff; padding:.75rem 1.2rem; border-radius:8px; font-size:.84rem; display:flex; align-items:center; gap:.5rem; box-shadow:0 4px 16px rgba(0,0,0,.25); animation:fadeIn .2s ease; }
.toast-wrap.success { border-left:4px solid #28a745; } .toast-wrap.error { border-left:4px solid #7B1D1D; }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

</style>