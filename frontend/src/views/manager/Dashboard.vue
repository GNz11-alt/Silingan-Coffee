<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <h1>Dashboard</h1>
      <p class="welcome-message">Welcome back, {{ username }}!</p>
      <p class="branch-label">{{ branchLabel }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="DollarSign" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Branch Revenue</h3>
          <p class="stat-value">
            {{ isLoading ? "..." : formatCurrency(totalRevenue) }}
          </p>
          <span class="stat-trend positive">Today</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="ShoppingBag" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Orders</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalOrders }}</p>
          <span class="stat-trend positive">Today</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Users" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Staff on Duty</h3>
          <p class="stat-value">{{ isLoading ? "..." : staffOnDuty }}</p>
          <span class="stat-trend">scheduled today</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="AlertCircle" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ isLoading ? "..." : lowStockCount }}</p>
          <span class="stat-trend warning">needs restocking</span>
        </div>
      </div>

      <div class="stat-card growth-card">
        <div class="stat-icon">
          <component :is="TrendingUp" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Employees</h3>
          <p class="stat-value">{{ isLoading ? "..." : totalEmployees }}</p>
          <span class="stat-trend">in your branch</span>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        <p class="section-subtitle">Latest transactions in {{userBranch}}</p>

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
              <span class="order-items">{{ order.items }}</span>
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
  AlertCircle,
  Users,
  TrendingUp,
  Package,
  FileText,
  Calendar,
  RefreshCw,
} from "lucide-vue-next";

const router = useRouter();
const username = ref(localStorage.getItem("username") || "User");
const userBranch = ref(localStorage.getItem("branch") || "");
const isLoading = ref(true);

// Stats
const totalRevenue = ref(0);
const totalOrders = ref(0);
const lowStockCount = ref(0);
const staffOnDuty = ref(0);
const totalEmployees = ref(0);

// Data
const recentOrders = ref([]);

// Branch label display
const branchLabels = {
  dlsu: "De La Salle University",
  ateneo: "Ateneo de Manila University",
  batangas: "Batangas City",
  lipa: "Lipa City",
  cubao: "Cubao Expo",
};
const branchLabel = ref(branchLabels[userBranch.value] || userBranch.value);

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

  const { data: branchData } = await supabase
    .from("branch")
    .select("BranchId")
    .eq("Location", userBranch.value)
    .maybeSingle();

  const branchId = branchData?.BranchId;

  if (branchId) {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("OrderId, FinalAmount, CreatedAt")
      .eq("BranchId", branchId)
      .gte("CreatedAt", `${today}T00:00:00`)
      .lte("CreatedAt", `${today}T23:59:59`)
      .eq("Status", "completed");

    if (ordersData) {
      totalOrders.value = ordersData.length;
      totalRevenue.value = ordersData.reduce(
        (sum, o) => sum + Number(o.FinalAmount), 0
      );
    }

    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("Quantity, LowStockThreshold")
      .eq("BranchId", branchId);

    if (inventoryData) {
      lowStockCount.value = inventoryData.filter(
        (item) => item.Quantity <= item.LowStockThreshold
      ).length;
    }

    const { count: empCount } = await supabase
      .from("employee")
      .select("*", { count: "exact", head: true })
      .eq("BranchAssigned", branchId);

    totalEmployees.value = empCount || 0;

    const { count: dutyCount } = await supabase
      .from("schedule")
      .select("*", { count: "exact", head: true })
      .eq("BranchId", branchId)
      .eq("ShiftDate", today);

    staffOnDuty.value = dutyCount || 0;

    const { data: recentData } = await supabase
      .from("orders")
      .select(
        "OrderId, FinalAmount, CreatedAt, orderitem(Quantity, ProductId, product(ProductName))",
      )
      .eq("BranchId", branchId)
      .order("CreatedAt", { ascending: false })
      .limit(5);

    if (recentData) {
      recentOrders.value = recentData.map((o) => ({
        ...o,
        items:
          o.orderitem?.map((i) => i.product?.ProductName).join(", ") ||
          "No items",
      }));
    }
  }

  isLoading.value = false;
};

const quickActions = [
  {
    icon: Package,
    text: "View Inventory",
    onClick: () => router.push("/manager/inventory"),
  },
  {
    icon: Calendar,
    text: "Manage Schedule",
    onClick: () => router.push("/manager/schedule"),
  },
  {
    icon: FileText,
    text: "View Reports",
    onClick: () => router.push("/manager/reports"),
  },
  {
    icon: RefreshCw,
    text: "Update Stock",
    onClick: () => router.push("/manager/inventory"),
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

.branch-label {
  font-size: 13px;
  color: #8b4513;
  font-weight: 500;
  margin-top: 2px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

.section-subtitle {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 20px;
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

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f3f5;
}

.order-items {
  color: #495057;
  font-size: 12px;
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
