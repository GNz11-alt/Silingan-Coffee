<template>
  <div class="sales-container">
    <header class="page-header">
      <div class="header-text">
        <h1>Sales Overview</h1>
        <p>View sales transactions and performance</p>
      </div>
    </header>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="DollarSign" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Revenue</h3>
          <p class="stat-value">
            ₱{{
              totalRevenue.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }}
          </p>
          <span class="stat-trend positive"
            >{{ filteredTransactions.length }} orders shown</span
          >
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="ShoppingBag" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Orders</h3>
          <p class="stat-value">{{ completedCount }}</p>
<span class="stat-trend positive">completed orders</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="TrendingUp" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Average Sale</h3>
          <p class="stat-value">₱{{ avgSale.toFixed(2) }}</p>
          <span class="stat-trend">per transaction</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Tag" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Discounts</h3>
          <p class="stat-value">
            ₱{{
              totalDiscounts.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            }}
          </p>
          <span class="stat-trend warning">given out</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Branch</label>
        <div class="select-wrap">
          <select v-model="filterBranch">
            <option value="">All Branches</option>
            <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
              {{ b.BranchName }}
            </option>
          </select>
          <ChevronDown :size="14" class="sel-icon" />
        </div>
      </div>

      <div class="filter-group">
        <label>Status</label>
        <div class="select-wrap">
          <select v-model="filterStatus">
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown :size="14" class="sel-icon" />
        </div>
      </div>

      <div class="filter-group">
        <label>Payment</label>
        <div class="select-wrap">
          <select v-model="filterPayment">
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
          <ChevronDown :size="14" class="sel-icon" />
        </div>
      </div>

      <div class="filter-group">
        <label>Date From</label>
        <input type="date" v-model="filterDateFrom" class="date-input" />
      </div>

      <div class="filter-group">
        <label>Date To</label>
        <input type="date" v-model="filterDateTo" class="date-input" />
      </div>

      <div class="filter-group search-group">
        <label>Search</label>
        <div class="search-wrap">
          <Search :size="14" class="search-icon" />
          <input
            type="text"
            v-model="filterSearch"
            placeholder="Order ID or product..."
            class="search-input"
          />
        </div>
      </div>

      <button class="clear-btn" @click="clearFilters" v-if="hasActiveFilters">
        <X :size="14" /> Clear
      </button>
    </div>

    <!-- Table -->
    <div class="table-section">
      <div class="table-header-row">
        <h3>
          Orders
          <span class="count-chip">{{ filteredTransactions.length }}</span>
        </h3>
        <div class="pagination-info" v-if="filteredTransactions.length > 0">
          Showing {{ pageStart + 1 }}–{{ pageEnd }} of
          {{ filteredTransactions.length }}
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        Loading orders...
      </div>

      <div v-else-if="filteredTransactions.length === 0" class="empty-state">
        <ShoppingBag :size="40" class="empty-icon" />
        <p>No orders match your filters.</p>
      </div>

      <template v-else>
        <div class="table-scroll-wrap">
          <table class="main-table">
            <thead>
              <tr>
                <th @click="setSort('OrderId')" class="sortable">
                  Order ID
                  <SortIcon field="OrderId" :current="sortBy" :dir="sortDir" />
                </th>
                <th @click="setSort('CreatedAt')" class="sortable">
                  Date
                  <SortIcon
                    field="CreatedAt"
                    :current="sortBy"
                    :dir="sortDir"
                  />
                </th>
                <th>Branch</th>
                <th>Items</th>
                <th>Discount</th>
                <th @click="setSort('TotalAmount')" class="sortable">
                  Subtotal
                  <SortIcon
                    field="TotalAmount"
                    :current="sortBy"
                    :dir="sortDir"
                  />
                </th>
                <th @click="setSort('FinalAmount')" class="sortable">
                  Total
                  <SortIcon
                    field="FinalAmount"
                    :current="sortBy"
                    :dir="sortDir"
                  />
                </th>
                <th>Payment</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="tr in pagedTransactions" :key="tr.OrderId">
                <tr
                  :class="{ 'expanded-row': expandedId === tr.OrderId }"
                  @click="toggleExpand(tr.OrderId)"
                >
                  <td>
                    <span class="id-tag">#{{ tr.OrderId }}</span>
                  </td>
                  <td class="date-cell">
                    <span class="date-main">{{
                      formatDateShort(tr.CreatedAt)
                    }}</span>
                    <span class="date-time">{{
                      formatTime(tr.CreatedAt)
                    }}</span>
                  </td>
                  <td>
                    <span class="branch-pill">{{
                      getBranchName(tr.BranchId)
                    }}</span>
                  </td>
                  <td class="items-preview">
                    <span
                      v-for="(item, i) in (tr.orderitem ?? []).slice(0, 2)"
                      :key="i"
                      class="item-chip"
                    >
                      {{ item.Quantity }}x
                      {{ item.product?.ProductName ?? "—" }}
                    </span>
                    <span
                      v-if="(tr.orderitem ?? []).length > 2"
                      class="more-chip"
                    >
                      +{{ tr.orderitem.length - 2 }} more
                    </span>
                  </td>
                  <td>
                    <span v-if="tr.discount" class="discount-badge">
                      {{ tr.discount.discountname }}
                      <em
                        >({{
                          tr.discount.discounttype === "percentage"
                            ? tr.discount.discountvalue + "%"
                            : "₱" + tr.discount.discountvalue
                        }})</em
                      >
                    </span>
                    <span v-else class="no-discount">—</span>
                  </td>
                  <td class="amount-cell">
                    ₱{{ (tr.TotalAmount ?? 0).toFixed(2) }}
                  </td>
                  <td class="total-cell">
                    ₱{{ (tr.FinalAmount ?? 0).toFixed(2) }}
                  </td>
                  <td>
                    <span :class="['payment-badge', tr.PaymentMethod]">{{
                      tr.PaymentMethod ?? "—"
                    }}</span>
                  </td>
                  <td>
                    <span :class="['status-badge', tr.Status]">{{
                      tr.Status
                    }}</span>
                  </td>
                  <td>
                    <ChevronDown
                      :size="16"
                      :class="[
                        'expand-icon',
                        { rotated: expandedId === tr.OrderId },
                      ]"
                    />
                  </td>
                </tr>

                <!-- Expanded detail row -->
                <tr v-if="expandedId === tr.OrderId" class="detail-row">
                  <td colspan="10">
                    <div class="detail-panel">
                      <div class="detail-cols">
                        <div class="detail-col">
                          <h4>Order Items</h4>
                          <table class="inner-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="item in tr.orderitem"
                                :key="item.OrderItemId"
                              >
                                <td>{{ item.product?.ProductName ?? "—" }}</td>
                                <td>{{ item.Quantity }}</td>
                                <td>₱{{ (item.UnitPrice ?? 0).toFixed(2) }}</td>
                                <td>₱{{ (item.Subtotal ?? 0).toFixed(2) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div class="detail-col summary-col">
                          <h4>Payment Summary</h4>
                          <div class="summary-rows">
                            <div class="s-row">
                              <span>Subtotal</span
                              ><span
                                >₱{{ (tr.TotalAmount ?? 0).toFixed(2) }}</span
                              >
                            </div>
                            <div class="s-row" v-if="tr.discount">
                              <span
                                >Discount ({{ tr.discount.discountname }})</span
                              >
                              <span class="s-discount"
                                >-₱{{
                                  (tr.DiscountedAmount ?? 0).toFixed(2)
                                }}</span
                              >
                            </div>
                            <div class="s-row total">
                              <span>Total</span
                              ><span
                                >₱{{ (tr.FinalAmount ?? 0).toFixed(2) }}</span
                              >
                            </div>
                            <div class="s-row" v-if="tr.cashpaid">
                              <span>Cash Paid</span
                              ><span>₱{{ (tr.cashpaid ?? 0).toFixed(2) }}</span>
                            </div>
                            <div class="s-row green" v-if="tr.changegiven">
                              <span>Change</span
                              ><span
                                >₱{{ (tr.changegiven ?? 0).toFixed(2) }}</span
                              >
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-bar">
          <button class="page-btn" @click="page--" :disabled="page === 1">
            <ChevronLeft :size="16" />
          </button>
          <span class="page-label">Page {{ page }} of {{ totalPages }}</span>
          <button
            class="page-btn"
            @click="page++"
            :disabled="page === totalPages"
          >
            <ChevronRight :size="16" />
          </button>
          <select v-model.number="perPage" class="per-page-select">
            <option :value="20">20 / page</option>
            <option :value="50">50 / page</option>
            <option :value="100">100 / page</option>
          </select>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import {
  DollarSign,
  TrendingUp,
  Tag,
  ShoppingBag,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "lucide-vue-next";
import { supabase } from "@/supabase";

const route = useRoute();

// Sort icon inline component
const SortIcon = {
  props: ["field", "current", "dir"],
  template: `<span class="sort-arrows">
    <span :style="{ opacity: current === field && dir === 'asc' ? 1 : 0.25 }">▲</span>
    <span :style="{ opacity: current === field && dir === 'desc' ? 1 : 0.25 }">▼</span>
  </span>`,
};

// State
const allTransactions = ref([]);
const branches = ref([]);
const loading = ref(false);

// Add after the state declarations
let refreshInterval = null;

onMounted(async () => {
  await Promise.all([fetchBranches(), fetchAllOrders()]);
  const viewId = route.query.edit;
  if (viewId) {
    const idNum = Number(viewId);
    const order = allTransactions.value.find((o) => o.OrderId === idNum);
    if (order) expandedId.value = idNum;
  }

  // Refetch every 30 seconds
  refreshInterval = setInterval(fetchAllOrders, 30_000);

  // Also refetch when tab becomes visible again
  document.addEventListener("visibilitychange", onVisibilityChange);
});

onUnmounted(() => {
  clearInterval(refreshInterval);
  document.removeEventListener("visibilitychange", onVisibilityChange);
});

const onVisibilityChange = () => {
  if (document.visibilityState === "visible") fetchAllOrders();
};


const completedCount = computed(() =>
  allTransactions.value.filter((t) => t.Status === "completed").length
);


// Filters
const filterBranch = ref("");
const filterStatus = ref("");
const filterPayment = ref("");
const filterDateFrom = ref("");
const filterDateTo = ref("");
const filterSearch = ref("");

// Sort
const sortBy = ref("CreatedAt");
const sortDir = ref("desc");

// Pagination
const page = ref(1);
const perPage = ref(20);

// Expand
const expandedId = ref(null);

// Computed
const hasActiveFilters = computed(
  () =>
    filterBranch.value ||
    filterStatus.value ||
    filterPayment.value ||
    filterDateFrom.value ||
    filterDateTo.value ||
    filterSearch.value,
);

const filteredTransactions = computed(() => {
  let list = [...allTransactions.value];

  if (filterBranch.value)
    list = list.filter((t) => t.BranchId === filterBranch.value);

  if (filterStatus.value)
    list = list.filter((t) => t.Status === filterStatus.value);

  if (filterPayment.value)
    list = list.filter((t) => t.PaymentMethod === filterPayment.value);

if (filterDateFrom.value)
  list = list.filter((t) => {
    const d = t.CreatedAt?.includes("+") || t.CreatedAt?.endsWith("Z")
      ? t.CreatedAt
      : t.CreatedAt + "+08:00";
    return new Date(d) >= new Date(filterDateFrom.value);
  });

if (filterDateTo.value) {
  const to = new Date(filterDateTo.value);
  to.setHours(23, 59, 59, 999);
  list = list.filter((t) => {
    const d = t.CreatedAt?.includes("+") || t.CreatedAt?.endsWith("Z")
      ? t.CreatedAt
      : t.CreatedAt + "+08:00";
    return new Date(d) <= to;
  });
}

  if (filterSearch.value) {
    const q = filterSearch.value.toLowerCase();
    list = list.filter(
      (t) =>
        String(t.OrderId).includes(q) ||
        (t.orderitem ?? []).some((i) =>
          i.product?.ProductName?.toLowerCase().includes(q),
        ),
    );
  }

  // Sort
  list.sort((a, b) => {
    let av = a[sortBy.value],
      bv = b[sortBy.value];
    if (sortBy.value === "CreatedAt") {
      av = new Date(av);
      bv = new Date(bv);
    }
    if (av < bv) return sortDir.value === "asc" ? -1 : 1;
    if (av > bv) return sortDir.value === "asc" ? 1 : -1;
    return 0;
  });

  return list;
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredTransactions.value.length / perPage.value)),
);
const pageStart = computed(() => (page.value - 1) * perPage.value);
const pageEnd = computed(() =>
  Math.min(pageStart.value + perPage.value, filteredTransactions.value.length),
);
const pagedTransactions = computed(() =>
  filteredTransactions.value.slice(pageStart.value, pageEnd.value),
);

const totalRevenue = computed(() =>
  filteredTransactions.value
    .filter((t) => t.Status !== "cancelled")  // add this
    .reduce((s, t) => s + (t.FinalAmount ?? 0), 0)
);
const avgSale = computed(() =>
  filteredTransactions.value.length
    ? totalRevenue.value / filteredTransactions.value.length
    : 0,
);
const totalDiscounts = computed(() =>
  filteredTransactions.value.reduce((s, t) => s + (t.DiscountedAmount ?? 0), 0),
);

// Reset to page 1 when filters change
watch(
  [
    filterBranch,
    filterStatus,
    filterPayment,
    filterDateFrom,
    filterDateTo,
    filterSearch,
  ],
  () => {
    page.value = 1;
    expandedId.value = null;
  },
);

// Data Fetching
const fetchBranches = async () => {
  const { data } = await supabase
    .from("branch")
    .select("BranchId, BranchName, Location")
    .order("BranchName");
  if (data) branches.value = data;
};

const fetchAllOrders = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      OrderId,
      BranchId,
      CashierId,
      TotalAmount,
      DiscountId,
      DiscountedAmount,
      FinalAmount,
      cashpaid,
      changegiven,
      PaymentMethod,
      Status,
      CreatedAt,
      discount ( discountid, discountname, discounttype, discountvalue ),
      orderitem (
        OrderItemId,
        Quantity,
        UnitPrice,
        Subtotal,
        ProductId,
        product ( ProductId, ProductName )
      )
    `,
    )
    .order("CreatedAt", { ascending: false });

  if (error) console.error("Error fetching orders:", error.message);
  else allTransactions.value = data ?? [];
  loading.value = false;
};

// Helpers
const getBranchName = (id) => {
  const b = branches.value.find((b) => b.BranchId === id);
  return b ? b.BranchName : id ? `Branch ${id}` : "—";
};

const parseManila = (iso) => {
  if (!iso) return null;
  return new Date(
    iso.includes("+") || iso.endsWith("Z") ? iso : iso + "+08:00"
  );
};

const formatDateShort = (iso) => {
  const d = parseManila(iso);
  if (!d) return "—";
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short", day: "numeric", year: "numeric",
  });
};

const formatTime = (iso) => {
  const d = parseManila(iso);
  if (!d) return "";
  return d.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit", minute: "2-digit",
  });
};

const setSort = (field) => {
  if (sortBy.value === field)
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  else {
    sortBy.value = field;
    sortDir.value = "desc";
  }
};

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const clearFilters = () => {
  filterBranch.value = "";
  filterStatus.value = "";
  filterPayment.value = "";
  filterDateFrom.value = "";
  filterDateTo.value = "";
  filterSearch.value = "";
};

// Init
onMounted(async () => {
  await Promise.all([fetchBranches(), fetchAllOrders()]);
  const viewId = route.query.edit;
  if (viewId) {
    const idNum = Number(viewId);
    const order = allTransactions.value.find((o) => o.OrderId === idNum);
    if (order) expandedId.value = idNum;
  }
});
</script>

<style scoped>
.sales-container {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

/* HEADER */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.header-text h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.header-text p {
  font-size: 14px;
  color: #888;
  margin: 0;
}

/* STATS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  color: #8b4513;
}

.stat-info h3 {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 6px;
  font-weight: 500;
  margin-top: 0;
}

.stat-info .stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
  margin-top: 0;
}

.stat-trend {
  font-size: 11px;
  color: #adb5bd;
}

.stat-trend.positive {
  color: #28a745;
}

.stat-trend.warning {
  color: #ffc107;
}

/* FILTERS */
.filters-bar {
  background: white;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-group label {
  font-size: 12px;
  font-weight: 700;
  color: #31201d;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.select-wrap {
  position: relative;
}
.select-wrap select {
  appearance: none;
  padding: 9px 32px 9px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  outline: none;
  cursor: pointer;
  min-width: 150px;
  transition: border-color 0.2s;
}
.select-wrap select:focus {
  border-color: #31201d;
}
.sel-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
  pointer-events: none;
}
.date-input {
  padding: 9px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.date-input:focus {
  border-color: #31201d;
}
.search-group {
  flex: 1;
  min-width: 200px;
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}
.search-input {
  width: 100%;
  padding: 9px 12px 9px 32px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.search-input:focus {
  border-color: #31201d;
}
.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
  align-self: flex-end;
}
.clear-btn:hover {
  background: #fecaca;
}

/* TABLE SECTION */
.table-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #eee;
  padding: 14px;
  overflow-x: visible;
}
.table-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.table-header-row h3 {
  margin: 0;
  font-size: 18px;
  color: #31201d;
  display: flex;
  align-items: center;
  gap: 10px;
}
.count-chip {
  background: #f0f0f0;
  color: #666;
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 20px;
}
.pagination-info {
  font-size: 13px;
  color: #999;
}

/* LOADING / EMPTY */
.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  padding: 60px;
  color: #999;
}
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #eee;
  border-top-color: #31201d;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.empty-state {
  text-align: center;
  padding: 60px;
  color: #bbb;
}
.empty-icon {
  margin: 0 auto 12px;
  display: block;
  opacity: 0.3;
}
.empty-state p {
  margin: 0;
  font-size: 15px;
}

/* MAIN TABLE */
.main-table {
  width: 100%;
  border-collapse: collapse;
}
.main-table th {
  text-align: left;
  padding: 11px 12px;
  color: #666;
  font-size: 12px;
  font-weight: 700;
  border-bottom: 2px solid #f5f5f5;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.main-table th.sortable {
  cursor: pointer;
  user-select: none;
}
.main-table th.sortable:hover {
  color: #31201d;
}
.sort-arrows {
  margin-left: 4px;
  font-size: 9px;
  display: inline-flex;
  flex-direction: column;
  line-height: 1;
  gap: 1px;
  vertical-align: middle;
}
.main-table tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}
.main-table tbody tr:hover {
  background: #fdfaf8;
}
.main-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 15px;
  vertical-align: top;
}
.expanded-row {
  background: #fdfaf8 !important;
}

.id-tag {
  background: #f0f0f0;
  padding: 4px 9px;
  border-radius: 4px;
  font-family: monospace;
  font-weight: 700;
  font-size: 13px;
}
.date-cell {
}
.date-main {
  display: block;
  font-size: 14px;
  font-weight: 600;
}
.date-time {
  display: block;
  font-size: 13px;
  color: #999;
  margin-top: 2px;
}
.branch-pill {
  font-size: 15px;
  font-weight: 600;
  color: #31201d;
}
.items-preview {
}
.item-chip {
  display: block;
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}
.more-chip {
  display: block;
  font-size: 13px;
  color: #aaa;
  font-style: italic;
  margin-top: 2px;
}
.discount-badge {
  color: #15803d;
  font-size: 14px;
  font-weight: 600;
}
.discount-badge em {
  font-style: normal;
  opacity: 0.75;
}
.no-discount {
  color: #ddd;
}
.amount-cell {
  color: #666;
}
.total-cell {
  font-weight: 800;
  color: #31201d;
}
.payment-badge {
  font-size: 15px;
  font-weight: 500;
  color: #444;
  text-transform: capitalize;
  background: none;
  border: none;
  outline: none;
}
.payment-badge.cash {
  color: #444;
}
.payment-badge.card {
  color: #444;
}
.status-badge {
  font-size: 15px;
  font-weight: 600;
}
.status-badge.completed {
  color: #15803d;
}
.status-badge.pending {
  color: #a16207;
}
.status-badge.cancelled {
  color: #dc2626;
}
.expand-icon {
  color: #ccc;
  transition: transform 0.2s;
}
.expand-icon.rotated {
  transform: rotate(180deg);
}

/* EXPANDED DETAIL ROW */
.detail-row td {
  padding: 0;
  border-bottom: 2px solid #f0f0f0;
}
.detail-panel {
  background: #fdfaf8;
  padding: 20px 24px;
  border-top: 1px solid #f0f0f0;
}
.detail-cols {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 24px;
}
.detail-col h4 {
  margin: 0 0 12px;
  font-size: 13px;
  color: #31201d;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.inner-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.inner-table th {
  text-align: left;
  padding: 8px 10px;
  color: #999;
  font-size: 12px;
  border-bottom: 1px solid #eee;
}
.inner-table td {
  padding: 8px 10px;
  border-bottom: 1px dotted #f0f0f0;
}
.summary-col {
}
.summary-rows {
  background: white;
  border-radius: 10px;
  border: 1px solid #eee;
  padding: 16px;
}
.s-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  padding: 6px 0;
  color: #555;
  border-bottom: 1px dotted #f5f5f5;
}
.s-row:last-child {
  border-bottom: none;
}
.s-row.total {
  font-weight: 800;
  font-size: 15px;
  color: #31201d;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid #eee;
  border-bottom: none;
}
.s-row.green span:last-child {
  color: #16a34a;
  font-weight: 700;
}
.s-discount {
  color: #16a34a;
}

/* PAGINATION */
.pagination-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #f5f5f5;
  margin-top: 8px;
}
.page-btn {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: 0.2s;
}
.page-btn:hover:not(:disabled) {
  border-color: #31201d;
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.page-label {
  font-size: 14px;
  color: #666;
  font-weight: 600;
}
.per-page-select {
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
/* ─── RESPONSIVE ───────────────────────────────────────── */
@media (min-width: 769px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .sales-container {
    padding: 14px;
    overflow-x: hidden;
    max-width: 100vw;
  }

  /* Header */
  .header-text h1 {
    font-size: 22px;
  }

  /* Stats — always 2 col */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .stat-card {
    padding: 12px;
    gap: 8px;
    min-width: 0;
  }
  .stat-info {
    min-width: 0;
  }
  .stat-info h3 {
    font-size: 11px;
  }
  .stat-info .stat-value {
    font-size: 18px;
  }
  .stat-trend {
    font-size: 10px;
  }
  .stat-icon svg {
    width: 20px;
    height: 20px;
  }

  /* Filters — stack vertically */
  .filters-bar {
    padding: 14px;
    gap: 10px;
  }
  .filter-group {
    width: 100%;
  }
  .select-wrap select {
    width: 100%;
    min-width: unset;
    box-sizing: border-box;
  }
  .date-input {
    width: 100%;
    box-sizing: border-box;
  }
  .search-group {
    width: 100%;
    min-width: unset;
  }
  .search-input {
    width: 100%;
  }
  .clear-btn {
    width: 100%;
    justify-content: center;
  }

  /* Table section */
  .table-section {
    padding: 14px;
    overflow-x: visible;
  }
  .table-scroll-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
  }
  .main-table {
    min-width: 700px;
  }
  .table-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .table-header-row h3 {
    font-size: 16px;
  }
  .main-table {
    min-width: 700px;
  }

  /* Expanded detail */
  .detail-cols {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .detail-panel {
    padding: 14px;
  }

  /* Pagination */
  .pagination-bar {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .page-label {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .stat-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .stat-info .stat-value {
    font-size: 16px;
  }
}
</style>
