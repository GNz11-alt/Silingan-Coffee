<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <h1>Dashboard</h1>
      <p class="welcome-message">
        Welcome back, <strong>{{ username }}!</strong>
      </p>
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
          <component :is="AlertCircle" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ isLoading ? "..." : lowStockCount }}</p>
          <span
            :class="[
              'stat-trend',
              lowStockCount >= 5
                ? 'danger'
                : lowStockCount > 0
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              lowStockCount >= 5
                ? "needs attention"
                : lowStockCount > 0
                  ? "needs restocking"
                  : "all stocked"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Calendar" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>My Shifts Today</h3>
          <p class="stat-value">{{ isLoading ? "..." : shiftsToday }}</p>
          <span class="stat-trend">scheduled</span>
        </div>
      </div>
    </div>

    <div class="bottom-section">
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        <p class="section-subtitle">Latest transactions in {{ branchLabel }}</p>
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
import { useUserBranch } from "@/composables/useUserBranch.js";
import {
  DollarSign,
  ShoppingBag,
  AlertCircle,
  ClipboardList,
  ShoppingCart,
  Package,
  Calendar,
} from "lucide-vue-next";

const router = useRouter();
const raw = localStorage.getItem("username") || "User";
const name = raw.split(/[^a-zA-Z]/)[0];
const username = ref(
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
);
const { userBranchId, userBranchName, resolveBranch } = useUserBranch();
const isLoading = ref(true);

const totalRevenue = ref(0);
const totalOrders = ref(0);
const lowStockCount = ref(0);
const shiftsToday = ref(0);
const recentOrders = ref([]);
const branchLabel = ref("");

const formatCurrency = (value) =>
  "₱" +
  Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  await resolveBranch();
  const branchId = userBranchId.value;
  branchLabel.value = userBranchName.value || localStorage.getItem("branch") || "";

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
        (sum, o) => sum + Number(o.FinalAmount),
        0,
      );
    }

    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("Quantity, LowStockThreshold")
      .eq("BranchId", branchId);

    lowStockCount.value = (inventoryData ?? []).filter(
      (item) => item.Quantity <= item.LowStockThreshold && item.Quantity > 0,
    ).length;

    const { data: recentData } = await supabase
      .from("orders")
      .select(
        "OrderId, FinalAmount, CreatedAt, orderitem(Quantity, ProductId, product(ProductName))",
      )
      .eq("BranchId", branchId)
      .gte("CreatedAt", `${today}T00:00:00`)
      .lte("CreatedAt", `${today}T23:59:59`)
      .eq("Status", "completed")
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

  const { data: userData } = await supabase
    .from("users")
    .select("employee_id")
    .eq("username", localStorage.getItem("username"))
    .maybeSingle();

  if (userData?.employee_id) {
    const { count } = await supabase
      .from("schedule")
      .select("*", { count: "exact", head: true })
      .eq("EmployeeId", userData.employee_id)
      .eq("ShiftDate", today);

    shiftsToday.value = count || 0;
  }

  isLoading.value = false;
};

const quickActions = [
  {
    icon: ShoppingCart,
    text: "Process Sale",
    onClick: () => router.push("/staff/pos"),
  },
  {
    icon: Package,
    text: "View Inventory",
    onClick: () => router.push("/staff/inventory"),
  },
  {
    icon: Calendar,
    text: "My Schedule",
    onClick: () => router.push("/staff/schedule"),
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
.branch-label {
  font-size: 13px;
  color: #8b4513;
  font-weight: 500;
  margin-top: 20px;
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
  color: #f59e0b;
}
.stat-trend.danger {
  color: #dc2626;
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
.order-items {
  color: #495057;
  font-size: 12px;
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
