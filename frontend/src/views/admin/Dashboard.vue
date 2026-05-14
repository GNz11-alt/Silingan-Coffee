<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <h1>Dashboard</h1>
      <p class="welcome-message">Welcome back, {{ username }}!</p>
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
          <span class="stat-trend positive">Today across all branches</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="ShoppingBag" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Orders</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalOrders }}</p>
          <span class="stat-trend positive">Today across all branches</span>
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
          <span class="stat-trend">locations operating</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="AlertCircle" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ isLoading ? "..." : lowStockCount }}</p>
          <span class="stat-trend warning">across all branches</span>
        </div>
      </div>

      <div class="stat-card growth-card">
        <div class="stat-icon">
          <component :is="TrendingUp" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Employees</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalEmployees }}</p>
          <span class="stat-trend">across all branches</span>
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
            <p class="branch-orders">{{ branch.orders }} orders</p>
            <span :class="['branch-status', branch.status]">{{
              branch.statusText
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        <p class="section-subtitle">Latest transactions across all branches</p>

        <div class="orders-list">
          <div v-if="recentOrders.length === 0" class="empty-state">
            No orders yet today.
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
const username = ref(localStorage.getItem("username") || "User");
const isLoading = ref(true);

// Stats
const totalRevenue = ref(0);
const totalOrders = ref(0);
const activeBranches = ref(0);
const lowStockCount = ref(0);
const totalEmployees = ref(0);

// Data
const branchPerformance = ref([]);
const recentOrders = ref([]);

const formatCurrency = (value) => {
  return (
    "₱" +
    Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })
  );
};

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fetchDashboardData = async () => {
  isLoading.value = true;

  const today = new Date().toISOString().split("T")[0];

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

  // Fetch branches
  const { data: branchData } = await supabase
    .from("branch")
    .select("BranchId, BranchName");

  activeBranches.value = branchData?.length || 0;

  // Fetch inventory for all branches
  const { data: inventoryData } = await supabase
    .from("inventory")
    .select("BranchId, Quantity, LowStockThreshold");

  if (inventoryData) {
    lowStockCount.value = inventoryData.filter(
      (item) =>
        item.LowStockThreshold && item.Quantity <= item.LowStockThreshold,
    ).length;
  }

  // Build branch performance with real status
  if (branchData) {
    branchPerformance.value = branchData.map((branch) => {
      const branchOrders = (ordersData || []).filter(
        (o) => o.BranchId === branch.BranchId,
      );
      const revenue = branchOrders.reduce(
        (sum, o) => sum + Number(o.FinalAmount),
        0,
      );

      const branchInventory = (inventoryData || []).filter(
        (i) => i.BranchId === branch.BranchId,
      );
      const hasZeroStock = branchInventory.some((i) => i.Quantity === 0);
      const hasLowStock = branchInventory.some(
        (i) =>
          i.LowStockThreshold &&
          i.Quantity <= i.LowStockThreshold &&
          i.Quantity > 0,
      );

      let status = "good";
      let statusText = "Good";

      if (hasZeroStock) {
        status = "critical";
        statusText = "Out of Stock";
      } else if (hasLowStock) {
        status = "warning";
        statusText = "Low Stock";
      } else if (branchOrders.length === 0) {
        status = "inactive";
        statusText = "No Orders";
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

  // Fetch recent orders with branch name
  const { data: recentData } = await supabase
    .from("orders")
    .select("OrderId, FinalAmount, BranchId, CreatedAt, branch(BranchName)")
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
}

.welcome-header {
  margin-bottom: 28px;
}

.welcome-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.welcome-message {
  font-size: 14px;
  color: #6c757d;
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
.stat-trend.positive {
  color: #28a745;
}
.stat-trend.warning {
  color: #ffc107;
}

.growth-card {
  background: linear-gradient(135deg, #8b4513, #a0522d);
  border: none;
}

.growth-card .stat-icon,
.growth-card .stat-value,
.growth-card .stat-info h3,
.growth-card .stat-trend {
  color: #ffffff;
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

.branch-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

/* Status colors */
.branch-status.good {
  background: #e8f5e9;
  color: #2e7d32;
}
.branch-status.warning {
  background: #fff3e0;
  color: #f57c00;
}
.branch-status.critical {
  background: #ffebee;
  color: #c62828;
}
.branch-status.inactive {
  background: #f5f5f5;
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
