<template>
  <div class="dashboard-content">
    <div class="welcome-header">
      <div style="display: flex; align-items: center; gap: 10px">
        <h1>Dashboard</h1>
        <button
          class="toggle-amounts-btn"
          @click="showAmounts = !showAmounts"
          :title="showAmounts ? 'Hide amounts' : 'Show amounts'"
        >
          <component :is="showAmounts ? Eye : EyeOff" :size="18" />
        </button>
      </div>
      <p class="welcome-message">
        Welcome back, <strong>{{ username }}!</strong>
      </p>
      <p class="branch-label">{{ branchLabel }}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="PesoSign" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Branch Revenue</h3>
          <p class="stat-value">
            {{
              isLoading
                ? "..."
                : showAmounts
                  ? formatCurrency(totalRevenue)
                  : "••••••"
            }}
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
                ? "No revenue today"
                : yesterdayRevenue > 0 && totalRevenue < yesterdayRevenue * 0.5
                  ? "Well below yesterday"
                  : yesterdayRevenue > 0 &&
                      totalRevenue < yesterdayRevenue * 0.8
                    ? "Slightly below yesterday"
                    : "Today"
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
                    : "today"
            }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Users" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Staff on Duty</h3>
          <p class="stat-value">{{ isLoading ? "..." : staffOnDuty }}</p>
          <span
            :class="[
              'stat-trend',
              staffOnDuty === 0
                ? 'danger'
                : staffOnDuty < 3
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              staffOnDuty === 0
                ? "no staff scheduled"
                : staffOnDuty < 3
                  ? "low coverage today"
                  : "scheduled today"
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
              totalEmployees < 3
                ? 'danger'
                : totalEmployees < 6
                  ? 'warning'
                  : 'positive',
            ]"
          >
            {{
              totalEmployees < 3
                ? "Critically understaffed"
                : totalEmployees < 6
                  ? "Below ideal headcount"
                  : "In your branch"
            }}
          </span>
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
import { ref, onMounted, h } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/supabase.js";
import { useUserBranch } from "@/composables/useUserBranch.js";
import {
  Eye,
  EyeOff,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  FileText,
  Calendar,
  RefreshCw,
} from "lucide-vue-next";

const router = useRouter();
const raw = localStorage.getItem("username") || "User";
const name = raw.split(/[^a-zA-Z]/)[0];
const username = ref(
  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
);
const { userBranchId, userBranchName, resolveBranch } = useUserBranch();
const yesterdayRevenue = ref(0);
const yesterdayOrders = ref(0);
const recentOrders = ref([]);
const branchLabel = ref("");
const isLoading = ref(true);

const showAmounts = ref(true);

const totalRevenue = ref(0);
const totalOrders = ref(0);
const lowStockCount = ref(0);
const lowStockPercent = ref(0);
const staffOnDuty = ref(0);
const totalEmployees = ref(0);

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PesoSign = {
  render() {
    return h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: "28",
        height: "28",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        stroke: "none",
      },
      [
        h(
          "text",
          {
            x: "50%",
            y: "50%",
            "dominant-baseline": "central",
            "text-anchor": "middle",
            "font-size": "18",
            "font-weight": "600",
            "font-family": "Arial, sans-serif",
          },
          "₱",
        ),
      ],
    );
  },
};

// Interpret DB timestamps as Manila time (not UTC)
const formatTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(
    iso.includes("+") || iso.endsWith("Z") ? iso : iso + "+08:00",
  );
  return d.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fetchDashboardData = async () => {
  isLoading.value = true;

  // Use Manila local date to avoid wrong-day queries before 8 AM
  const manilaNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  const today = manilaNow.toLocaleDateString("en-CA"); // YYYY-MM-DD

  const tomorrowDate = new Date(manilaNow);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toLocaleDateString("en-CA");

  const yesterdayDate = new Date(manilaNow);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toLocaleDateString("en-CA");

  await resolveBranch();
  const branchId = userBranchId.value;
  branchLabel.value =
    userBranchName.value || localStorage.getItem("branch") || "";

  if (branchId) {
    // Today's completed orders — same date range logic as POS.vue
    const { data: ordersData } = await supabase
      .from("orders")
      .select("OrderId, FinalAmount, CreatedAt")
      .eq("BranchId", branchId)
      .gte("CreatedAt", today)
      .lt("CreatedAt", tomorrow)
      .eq("Status", "completed");

    if (ordersData) {
      totalOrders.value = ordersData.length;
      totalRevenue.value = ordersData.reduce(
        (sum, o) => sum + Number(o.FinalAmount),
        0,
      );
    }

    // Yesterday's completed orders for comparison
    const { data: yesterdayData } = await supabase
      .from("orders")
      .select("FinalAmount")
      .eq("BranchId", branchId)
      .gte("CreatedAt", yesterday)
      .lt("CreatedAt", today)
      .eq("Status", "completed");

    yesterdayRevenue.value = (yesterdayData ?? []).reduce(
      (sum, o) => sum + Number(o.FinalAmount),
      0,
    );
    yesterdayOrders.value = yesterdayData?.length ?? 0;

    // Inventory / low stock
    const { data: inventoryData } = await supabase
      .from("inventory")
      .select("Quantity, LowStockThreshold")
      .eq("BranchId", branchId);

    const totalItems = inventoryData?.length ?? 0;
    lowStockCount.value = (inventoryData ?? []).filter(
      (item) => item.Quantity <= item.LowStockThreshold && item.Quantity > 0,
    ).length;
    lowStockPercent.value =
      totalItems > 0 ? (lowStockCount.value / totalItems) * 100 : 0;

    // Total employees in branch
    const { count: empCount } = await supabase
      .from("employee")
      .select("*", { count: "exact", head: true })
      .eq("BranchAssigned", branchId)
      .neq("Status", "Archived");

    totalEmployees.value = empCount || 0;

    // Staff on duty today
    const { count: dutyCount } = await supabase
      .from("schedule")
      .select("*", { count: "exact", head: true })
      .eq("BranchId", branchId)
      .eq("ShiftDate", today);

    staffOnDuty.value = dutyCount || 0;

    // Recent orders (latest 5, completed, today)
    const { data: recentData } = await supabase
      .from("orders")
      .select("OrderId, FinalAmount, BranchId, CreatedAt, branch(BranchName)")
      .eq("BranchId", branchId)
      .gte("CreatedAt", today)
      .lt("CreatedAt", tomorrow)
      .eq("Status", "completed")
      .order("CreatedAt", { ascending: false })
      .limit(5);

    if (recentData) {
      recentOrders.value = recentData.map((o) => ({
        ...o,
        branch: o.branch?.BranchName || "Unknown",
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
    onClick: () => router.push("/manager/shift-management"),
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

.bottom-section {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}

.toggle-amounts-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}
.toggle-amounts-btn:hover {
  color: #8b4513;
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

@media (min-width: 769px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .branch-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(5, 1fr);
  }
  .branch-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-content {
    padding: 14px;
    overflow-x: hidden;
  }

  /* Stats and branch — always 2 col */
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
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
  .stat-value {
    font-size: 18px;
  }
  .stat-trend {
    font-size: 10px;
  }
  .stat-icon svg {
    width: 20px;
    height: 20px;
  }

  .branch-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .branch-card {
    padding: 14px;
  }
  .branch-info h4 {
    font-size: 13px;
  }
  .branch-revenue {
    font-size: 15px;
  }

  /* Bottom section stacks */
  .bottom-section {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .recent-orders,
  .quick-actions {
    padding: 16px;
  }

  /* Orders list tighter */
  .order-info {
    gap: 8px;
    flex-wrap: wrap;
  }
  .order-time {
    min-width: unset;
  }
}
</style>
