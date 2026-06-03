<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <h1>Dashboard</h1>
      <p class="welcome-message">
        Welcome back, <strong>{{ username }}!</strong>
      </p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="DollarSign" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Network Revenue</h3>
          <p class="stat-value">
            {{ isLoading ? "..." : formatCurrency(totalRevenue) }}
          </p>
          <span
            :class="[
              'stat-trend',
              totalRevenue === 0
                ? 'danger'
                : yesterdayRevenue > 0 && totalRevenue < yesterdayRevenue * 0.5
                  ? 'danger'
                  : yesterdayRevenue > 0 &&
                      totalRevenue < yesterdayRevenue * 0.8
                    ? 'warning'
                    : 'positive',
            ]"
          >
            {{
              totalRevenue === 0
                ? "no revenue today"
                : yesterdayRevenue > 0 && totalRevenue < yesterdayRevenue * 0.5
                  ? "well below yesterday"
                  : yesterdayRevenue > 0 &&
                      totalRevenue < yesterdayRevenue * 0.8
                    ? "slightly below yesterday"
                    : "today across all branches"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="ShoppingBag" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Orders</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalOrders }}</p>
          <span
            :class="[
              'stat-trend',
              totalOrders === 0
                ? 'danger'
                : yesterdayOrders > 0 && totalOrders < yesterdayOrders * 0.5
                  ? 'danger'
                  : yesterdayOrders > 0 && totalOrders < yesterdayOrders * 0.8
                    ? 'warning'
                    : 'positive',
            ]"
          >
            {{
              totalOrders === 0
                ? "no orders today"
                : yesterdayOrders > 0 && totalOrders < yesterdayOrders * 0.5
                  ? "well below yesterday"
                  : yesterdayOrders > 0 && totalOrders < yesterdayOrders * 0.8
                    ? "slightly below yesterday"
                    : "today across all branches"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Building" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Active Branches</h3>
          <p class="stat-value">
            {{ isLoading ? "..." : `${activeBranches}/5` }}
          </p>
          <span
            :class="[
              'stat-trend',
              activeBranches < 3
                ? 'danger'
                : activeBranches < 5
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              activeBranches < 3
                ? "several branches offline"
                : activeBranches < 5
                  ? "some branches inactive"
                  : "locations operating"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="AlertCircle" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ isLoading ? "..." : lowStockCount }}</p>
          <span
            :class="[
              'stat-trend',
              lowStockPercent >= 20
                ? 'danger'
                : lowStockPercent > 0
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              lowStockPercent >= 20
                ? "critical — needs attention"
                : lowStockPercent > 0
                  ? "across all branches"
                  : "all items stocked"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="TrendingUp" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Employees</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalEmployees }}</p>
          <span
            :class="[
              'stat-trend',
              totalEmployees < 10
                ? 'danger'
                : totalEmployees < 20
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              totalEmployees < 10
                ? "critically understaffed"
                : totalEmployees < 20
                  ? "below ideal headcount"
                  : "across all branches"
            }}
          </span>
        </div>
      </div>
    </div>

    <div class="branch-section">
      <h2>Branch Performance Summary</h2>
      <p class="section-subtitle">Today's performance across all locations</p>
      <div class="branch-grid">
        <div
          class="branch-card"
          v-for="branch in branchPerformance"
          :key="branch.name"
        >
          <div class="branch-info">
            <h4>{{ branch.name }}</h4>
            <p class="branch-revenue">{{ formatCurrency(branch.revenue) }}</p>
            <span :class="['branch-trend', branch.status]">{{
              branch.statusText
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        <p class="section-subtitle">Today's transactions across all branches</p>
        <div class="orders-list">
          <div v-if="recentOrders.length === 0" class="empty-state">
            <ShoppingBag :size="32" class="empty-icon" />
            <p>No recent orders today.</p>
            <span
              >Orders will appear here once customers start purchasing.</span
            >
          </div>
          <div
            class="order-item"
            v-for="order in recentOrders"
            :key="order.OrderId"
          >
            <div class="order-info">
              <span class="order-id">#{{ order.OrderId }}</span>
              <span class="order-time">{{ formatTime(order.CreatedAt) }}</span>
              <span class="order-branch">{{ order.branch }}</span>
            </div>
            <div class="order-amount">
              {{ formatCurrency(order.FinalAmount) }}
            </div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Quick Actions</h2>
        <p class="section-subtitle">Common tasks</p>
        <div class="actions-list">
          <button
            class="action-item"
            v-for="action in quickActions"
            :key="action.text"
            @click="action.onClick"
          >
            <component :is="action.icon" :size="18" />
            <span>{{ action.text }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabase.js";
import {
  DollarSign,
  ShoppingBag,
  Building,
  AlertCircle,
  TrendingUp,
  Plus,
  Package,
  RefreshCw,
} from "lucide-vue-next";

const router = useRouter();
const raw = localStorage.getItem("username") || "User";
const name = raw.split(/[^a-zA-Z]/)[0];
const username = ref(
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
);
const isLoading = ref(true);

// Stats
const totalRevenue = ref(0);
const totalOrders = ref(0);
const activeBranches = ref(0);
const lowStockCount = ref(0);
const totalEmployees = ref(0);
const yesterdayRevenue = ref(0);
const yesterdayOrders = ref(0);
const lowStockPercent = ref(0);

// Data
const branchPerformance = ref([]);
const recentOrders = ref([]);

const formatCurrency = (value) => {
  return (
    "₱" +
    Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })
  );
};

const formatTime = (iso) =>
  iso
    ? new Date(iso + 'Z').toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const fetchDashboardData = async () => {
  isLoading.value = true;

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Fetch today's completed orders
  const { data: ordersData } = await supabase
    .from("orders")
    .select("OrderId, FinalAmount, BranchId, CreatedAt")
    .gte("CreatedAt", `${today}T00:00:00`)
    .lte("CreatedAt", `${today}T23:59:59`)
    .eq("Status", "completed");

  if (ordersData) {
    totalOrders.value = ordersData.length;
    totalRevenue.value = ordersData.reduce(
      (sum, o) => sum + Number(o.FinalAmount),
      0,
    );
  }

  const { data: yesterdayData } = await supabase
    .from("orders")
    .select("FinalAmount")
    .gte("CreatedAt", `${yesterday}T00:00:00`)
    .lte("CreatedAt", `${yesterday}T23:59:59`)
    .eq("Status", "completed");

  yesterdayRevenue.value = (yesterdayData ?? []).reduce(
    (sum, o) => sum + Number(o.FinalAmount),
    0,
  );
  yesterdayOrders.value = yesterdayData?.length ?? 0;

  // Fetch branches
  const { data: branchData } = await supabase
    .from("branch")
    .select("BranchId, BranchName");

  activeBranches.value = branchData?.length || 0;

  // Fetch raw inventory grouped by branch + product
  const { data: rawInventory } = await supabase
    .from("rawproducttransaction")
    .select("branchid, rawproductid, quantity, rawproduct(reorderlevel)")
    .eq("transactiontype", "in")
    .gt("quantity", 0);

  // Group quantity by branchid + rawproductid
  const branchItemStock = {};
  for (const row of rawInventory ?? []) {
    const key = `${row.branchid}__${row.rawproductid}`;
    if (!branchItemStock[key]) {
      branchItemStock[key] = {
        branchid: row.branchid,
        rawproductid: row.rawproductid,
        quantity: 0,
        reorderlevel: row.rawproduct?.reorderlevel ?? null,
      };
    }
    branchItemStock[key].quantity += row.quantity;
  }

  const branchStockList = Object.values(branchItemStock);

  // Global low stock count
  const { data: allProducts } = await supabase
    .from("rawproduct")
    .select("rawproductid")
    .neq("status", "Archived");

  const totalItems = allProducts?.length ?? 0;
  lowStockCount.value = branchStockList.filter(
    (i) => i.reorderlevel && i.quantity <= i.reorderlevel && i.quantity > 0,
  ).length;
  lowStockPercent.value =
    totalItems > 0 ? (lowStockCount.value / totalItems) * 100 : 0;

  // Build branch performance
  if (branchData) {
    branchPerformance.value = branchData.map((branch) => {
      const branchOrders = (ordersData || []).filter(
        (o) => o.BranchId === branch.BranchId,
      );
      const revenue = branchOrders.reduce(
        (sum, o) => sum + Number(o.FinalAmount),
        0,
      );

      const branchItems = branchStockList.filter(
        (i) => i.branchid === branch.BranchId,
      );

      const zeroStockCount = branchItems.filter((i) => i.quantity <= 0).length;
      const branchLowStock = branchItems.filter(
        (i) => i.reorderlevel && i.quantity <= i.reorderlevel && i.quantity > 0,
      ).length;

      let status = "good";
      let statusText = "no low stock items";

      if (zeroStockCount > 0) {
        status = "critical";
        statusText = `${zeroStockCount} Out of Stock`;
      } else if (branchLowStock > 0) {
        status = "warning";
        statusText = `${branchLowStock} low stock item${branchLowStock > 1 ? "s" : ""}`;
      }

      return {
        name: branch.BranchName,
        revenue,
        orders: branchOrders.length,
        status,
        statusText,
      };
    });
  }

  // Fetch total employees
  const { count } = await supabase
    .from("employee")
    .select("*", { count: "exact", head: true })
    .neq("Status", "Archived");

  totalEmployees.value = count || 0;

  // Fetch recent orders — today only
  const { data: recentData } = await supabase
    .from("orders")
    .select("OrderId, FinalAmount, BranchId, CreatedAt, branch(BranchName)")
    .gte("CreatedAt", `${today}T00:00:00`)
    .lte("CreatedAt", `${today}T23:59:59`)
    .eq("Status", "completed")
    .order("CreatedAt", { ascending: false })
    .limit(5);

  if (recentData) {
    recentOrders.value = recentData.map((o) => ({
      ...o,
      branch: o.branch?.BranchName || "Unknown",
    }));
  }

  isLoading.value = false;
};

const quickActions = [
  {
    icon: Plus,
    text: "Add New Product",
    onClick: () => router.push("/admin/inventory"),
  },
  {
    icon: Package,
    text: "View Inventory",
    onClick: () => router.push("/admin/inventory"),
  },
  {
    icon: DollarSign,
    text: "Process Sale",
    onClick: () => router.push("/admin/sales"),
  },
  {
    icon: RefreshCw,
    text: "View Reports",
    onClick: () => router.push("/admin/reports"),
  },
];

onMounted(() => {
  fetchDashboardData();
});
</script>

<style scoped>
.dashboard-content {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

.welcome-header {
  margin-bottom: 28px;
}

.welcome-header h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0;
}

.welcome-header strong {
  color: #31201d;
}

.welcome-message {
  font-size: 14px;
  color: #888;
  margin: 4px 0 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
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
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.stat-trend {
  font-size: 11px;
  color: #adb5bd;
}
.stat-trend.danger {
  color: #dc2626;
}
.stat-trend.warning {
  color: #f59e0b;
}
.stat-trend.positive {
  color: #28a745;
}

.empty-state {
  text-align: center;
  padding: 28px 0;
  color: #adb5bd;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.empty-state p {
  font-size: 14px;
  font-weight: 600;
  color: #6c757d;
  margin: 0;
}
.empty-state span {
  font-size: 12px;
  color: #adb5bd;
}
.empty-icon {
  opacity: 0.3;
}

.branch-section {
  margin-bottom: 32px;
}

.branch-section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 6px;
}

.section-subtitle {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 20px;
}

.branch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.branch-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.branch-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.branch-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 8px;
}

.branch-revenue {
  font-size: 18px;
  font-weight: 600;
  color: #8b4513;
  margin-bottom: 4px;
}

.branch-orders {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 8px;
}

.branch-trend {
  font-size: 11px;
  font-weight: 500;
}
.branch-trend.good {
  color: #28a745;
}
.branch-trend.warning {
  color: #f57c00;
}
.branch-trend.critical {
  color: #c62828;
}
.branch-trend.inactive {
  color: #9e9e9e;
}

.bottom-section {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}

.recent-orders,
.quick-actions {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e9ecef;
}

.recent-orders h2,
.quick-actions h2 {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.empty-state {
  text-align: center;
  color: #adb5bd;
  font-size: 13px;
  padding: 20px 0;
}

.orders-list {
  margin-top: 20px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f5;
}

.order-item:last-child {
  border-bottom: none;
}

.order-info {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 13px;
}

.order-id {
  font-weight: 600;
  color: #8b4513;
  min-width: 45px;
}
.order-time {
  color: #adb5bd;
  min-width: 70px;
}
.order-branch {
  color: #495057;
}
.order-amount {
  font-weight: 500;
  color: #212529;
}

.actions-list {
  margin-top: 20px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.action-item:hover {
  background: #fff4e6;
  border-color: #8b4513;
  color: #8b4513;
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 16px;
  }
  .bottom-section {
    grid-template-columns: 1fr;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
