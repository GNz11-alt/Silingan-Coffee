<template>
  <div class="maintenance-page">
    <div class="page-header mb-4">
      <h4 class="page-title mb-1">System Maintenance</h4>
      <p class="page-sub">Monitor and maintain Silingan Coffee system health</p>
    </div>

    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-icon-wrap green">
          <component :is="CheckCircle" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>System Health</h3>
          <p class="stat-value green">{{ stats.health_label }}</p>
          <span class="stat-sub">All systems operational</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <component :is="Clock" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Uptime</h3>
          <p class="stat-value">{{ stats.uptime_percent }}%</p>
          <span class="stat-sub">{{ stats.uptime_label }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <component :is="Users" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Active Users</h3>
          <p class="stat-value">{{ totalUsers }}</p>
          <span class="stat-sub">registered users</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap">
          <component :is="Database" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Last Backup</h3>
          <p class="stat-value">{{ lastBackupTime }}</p>
          <span class="stat-sub">{{ lastBackupStatus }}</span>
        </div>
      </div>
    </div>

    <div class="tab-bar mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB: OVERVIEW -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <div v-if="isLoadingStats" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-secondary"></div>
        <p class="mt-2 text-muted small">Loading system stats...</p>
      </div>
      <div v-else class="two-col">
        <div class="panel">
          <div class="panel-header">
            <component :is="HardDrive" :size="18" class="panel-icon" />
            <h5>System Resources</h5>
          </div>
          <div class="resource-list">
            <div class="resource-row">
              <span class="resource-label">Storage Usage</span>
              <span class="resource-value">
                {{ stats.storage_used_gb }}MB / {{ stats.storage_total_gb }}MB
              </span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{ width: storagePercent + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <component :is="Shield" :size="18" class="panel-icon" />
            <h5>Security Status</h5>
          </div>
          <div class="security-list">
            <div class="security-row">
              <span class="security-label">Firewall</span>
              <span class="badge badge-active">Active</span>
            </div>
            <div class="security-row">
              <span class="security-label">SSL Certificate</span>
              <span
                :class="['badge', sslValid ? 'badge-active' : 'badge-inactive']"
              >
                {{ sslValid ? "Valid" : "Not Secure" }}
              </span>
            </div>
            <div class="security-row">
              <span class="security-label">Failed Login Attempts</span>
              <span class="security-val">{{ failedLogins }} (Last 24h)</span>
            </div>
          </div>
        </div>
      </div>

      <div class="alert-panel mt-3" v-if="showOptimizationAlert">
        <component :is="AlertTriangle" :size="18" class="alert-icon" />
        <div>
          <div class="alert-title">System Optimization Recommended</div>
          <div class="alert-sub">
            Consider running query optimization to refresh database statistics.
            Last optimization was {{ lastOptimization }}.
          </div>
        </div>
        <button
          class="btn-optimize"
          @click="runOptimization"
          :disabled="optimizing"
        >
          <span
            v-if="optimizing"
            class="spinner-border spinner-border-sm me-1"
          ></span>
          <span v-else>Run Now</span>
        </button>
      </div>

      <div class="panel mt-3">
        <div class="panel-header">
          <component :is="Database" :size="18" class="panel-icon" />
          <h5>Backup History</h5>
        </div>
        <p class="panel-sub">
          Backups are created from the Backup &amp; Restore module. This panel
          shows the log.
        </p>
        <div v-if="isLoadingBackups" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
        </div>
        <div v-else class="scrollable-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Type</th>
                <th>Size</th>
                <th>Backed Up By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in backupHistory" :key="b.id">
                <td>{{ b.date }}</td>
                <td>{{ b.type }}</td>
                <td>{{ b.size }}</td>
                <td>{{ b.backedUpBy }}</td>
                <td>
                  <span
                    class="badge"
                    :class="
                      b.status === 'Success' ? 'badge-active' : 'badge-inactive'
                    "
                  >
                    {{ b.status }}
                  </span>
                </td>
              </tr>
              <tr v-if="!backupHistory.length">
                <td
                  colspan="5"
                  class="text-center text-muted py-4"
                  style="font-size: 13px"
                >
                  No backups yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB: USER SESSIONS -->
    <div v-if="activeTab === 'sessions'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="Users" :size="18" class="panel-icon" />
          <h5>Registered Users</h5>
        </div>
        <div v-if="isLoadingUsers" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
          <p class="mt-2 text-muted small">Loading users...</p>
        </div>
        <div v-else class="scrollable-table-wrap">
          <table class="history-table users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Position</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in userList" :key="u.id">
                <td>{{ u.fullName }}</td>
                <td>{{ u.email }}</td>
                <td>{{ u.position ?? "—" }}</td>
                <td>{{ u.role }}</td>
                <td>{{ u.branch ?? "—" }}</td>
                <td>
                  <span
                    class="active-badge"
                    :class="lastActiveClass(u.last_active)"
                  >
                    {{ u.lastActivePretty ?? "Never" }}
                  </span>
                </td>
              </tr>
              <tr v-if="!userList.length">
                <td
                  colspan="6"
                  class="text-center text-muted py-4"
                  style="font-size: 13px"
                >
                  No users found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i
          :class="
            toast.type === 'success'
              ? 'bi bi-check-circle'
              : 'bi bi-exclamation-circle'
          "
          class="me-2"
        ></i>
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "@/supabase.js";
import {
  CheckCircle,
  Clock,
  Users,
  Database,
  HardDrive,
  Shield,
  AlertTriangle,
} from "lucide-vue-next";

// ── Cache helpers ─────────────────────────────────────────
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_KEY_STATS = "cache_maint_stats";
const CACHE_KEY_USERS = "cache_maint_users";
const CACHE_KEY_BACKUPS = "cache_maint_backups";
const CACHE_KEY_TASKS = "cache_maint_tasks";
const CACHE_KEY_LOGINS = "cache_maint_logins";

const saveCache = (key, data) =>
  sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));

const loadCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("maint_refreshed", "1");
});

// ── State ─────────────────────────────────────────────────
const branches = ref([]);
const sslValid = ref(window.location.protocol === "https:");
const activeTab = ref("overview");
const tabs = [
  { key: "overview", label: "Overview" },
  { key: "sessions", label: "User Sessions" },
];

const isLoadingStats = ref(false);
const isLoadingUsers = ref(false);
const isLoadingBackups = ref(false);
const isLoadingTasks = ref(false);

const stats = ref({
  health_label: "—",
  uptime_percent: 0,
  uptime_label: "—",
  storage_used_gb: 0,
  storage_total_gb: 0,
});

const storagePercent = computed(() => {
  if (!stats.value.storage_total_gb) return 0;
  return (stats.value.storage_used_gb / stats.value.storage_total_gb) * 100;
});

const failedLogins = ref(0);
const totalUsers = ref(0);
const userList = ref([]);
const backupHistory = ref([]);
const lastBackupStatus = ref("—");
const lastBackupTime = ref("—");
const showOptimizationAlert = ref(false);
const lastOptimization = ref("—");
const optimizing = ref(false);
const tasks = ref([]);

const toast = ref({ show: false, message: "", type: "success" });
const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

const formatDate = (iso) => {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const lastActiveClass = (iso) => {
  if (!iso) return "status-never";
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000;
  return hours >= 3 ? "status-inactive" : "status-active";
};

const timeAgo = (iso) => {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

// ── Fetchers (all cached) ─────────────────────────────────
const fetchStats = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_STATS);
    if (cached) {
      stats.value = cached;
      return;
    }
  }
  isLoadingStats.value = true;
  await supabase.rpc("refresh_system_stats");
  const { data, error } = await supabase
    .from("system_stats")
    .select("*")
    .eq("id", 1)
    .single();
  isLoadingStats.value = false;
  if (error) {
    showToast("Failed to load system stats.", "error");
    return;
  }
  const mapped = {
    health_label: data.health_label,
    uptime_percent: data.uptime_percent,
    uptime_label: data.uptime_label,
    storage_used_gb: Math.round(data.storage_used_gb * 1024),
    storage_total_gb: Math.round(data.storage_total_gb * 1024),
  };
  stats.value = mapped;
  saveCache(CACHE_KEY_STATS, mapped);
};

const fetchFailedLogins = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_LOGINS);
    if (cached !== null) {
      failedLogins.value = cached;
      return;
    }
  }
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await supabase
    .from("failed_logins")
    .select("id", { count: "exact", head: true })
    .gte("attempted_at", since);
  if (!error) {
    failedLogins.value = count ?? 0;
    saveCache(CACHE_KEY_LOGINS, failedLogins.value);
  }
};

const fetchUsers = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_USERS);
    if (cached) {
      userList.value = cached.userList;
      totalUsers.value = cached.totalUsers;
      branches.value = cached.branches;
      return;
    }
  }
  isLoadingUsers.value = true;
  const [{ data, error }, { count }, { data: empData }, { data: branchData }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, username, role, branch, last_active")
        .neq("status", "archived")
        .order("last_active", { ascending: false }),
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .gte("last_active", new Date(Date.now() - 15 * 60000).toISOString()),
      supabase
        .from("employee")
        .select("Email, FirstName, LastName, Position")
        .neq("Status", "Archived"),
      supabase.from("branch").select("BranchId, BranchName"),
    ]);
  isLoadingUsers.value = false;
  if (error) {
    showToast("Failed to load users.", "error");
    return;
  }

  const mappedBranches = (branchData || []).map((b) => ({
    id: String(b.BranchId),
    name: b.BranchName,
  }));
  branches.value = mappedBranches;

  const empMap = {};
  for (const e of empData || []) {
    const key =
      `${e.FirstName.toLowerCase()}.${e.LastName.toLowerCase()}`.replace(
        /\s+/g,
        "",
      );
    empMap[key] = e;
  }

  const mappedUsers = data.map((u) => {
    const emp = empMap[u.username];
    const fallbackName = u.username.includes("@")
      ? u.username.split("@")[0]
      : u.username.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      ...u,
      fullName: emp ? `${emp.FirstName} ${emp.LastName}` : fallbackName,
      email: emp?.Email || (u.role === "admin" ? "admin@gmail.com" : "—"),
      position: emp?.Position || (u.role === "admin" ? "Admin" : null),
      branch:
        mappedBranches.find((b) => b.id === String(u.branch))?.name || u.branch,
      lastActivePretty: timeAgo(u.last_active),
    };
  });

  userList.value = mappedUsers;
  totalUsers.value = count ?? 0;
  saveCache(CACHE_KEY_USERS, {
    userList: mappedUsers,
    totalUsers: totalUsers.value,
    branches: mappedBranches,
  });
};

const fetchBackupHistory = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_BACKUPS);
    if (cached) {
      backupHistory.value = cached.backupHistory;
      lastBackupStatus.value = cached.lastBackupStatus;
      lastBackupTime.value = cached.lastBackupTime;
      return;
    }
  }
  isLoadingBackups.value = true;
  const { data, error } = await supabase
    .from("backup_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  isLoadingBackups.value = false;
  if (error) {
    showToast("Failed to load backup history.", "error");
    return;
  }

  const mapped = data.map((b) => ({
    id: b.id,
    date: formatDate(b.created_at),
    type: b.type,
    size: b.size_mb != null ? `${b.size_mb} MB` : "—",
    backedUpBy: b.backed_up_by ?? "—",
    status: b.status,
  }));
  const lbStatus = data.length ? data[0].status : "—";
  const lbTime = data.length ? timeAgo(data[0].created_at) : "—";

  backupHistory.value = mapped;
  lastBackupStatus.value = lbStatus;
  lastBackupTime.value = lbTime;
  saveCache(CACHE_KEY_BACKUPS, {
    backupHistory: mapped,
    lastBackupStatus: lbStatus,
    lastBackupTime: lbTime,
  });
};

const fetchTasks = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_TASKS);
    if (cached) {
      tasks.value = cached;
      const optTask = tasks.value.find((t) => t.name === "Optimize Database");
      if (optTask) {
        const daysSince = optTask._last_run_at
          ? (Date.now() - new Date(optTask._last_run_at).getTime()) / 86_400_000
          : Infinity;
        lastOptimization.value = optTask.lastRun;
        showOptimizationAlert.value = daysSince >= 7;
      }
      return;
    }
  }
  isLoadingTasks.value = true;
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .order("id");
  isLoadingTasks.value = false;
  if (error) {
    showToast("Failed to load tasks.", "error");
    return;
  }

  const mapped = data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    lastRun: timeAgo(t.last_run_at),
    running: false,
    _last_run_at: t.last_run_at,
  }));
  tasks.value = mapped;
  saveCache(CACHE_KEY_TASKS, mapped);

  const optTask = mapped.find((t) => t.name === "Optimize Database");
  if (optTask) {
    const daysSince = optTask._last_run_at
      ? (Date.now() - new Date(optTask._last_run_at).getTime()) / 86_400_000
      : Infinity;
    lastOptimization.value = optTask.lastRun;
    showOptimizationAlert.value = daysSince >= 7;
  }
};

// ── Mutations (force-refresh cache after) ────────────────
const runOptimization = async () => {
  optimizing.value = true;
  const now = new Date().toISOString();
  const { error: fnError } = await supabase.rpc("run_vacuum");
  if (fnError) {
    optimizing.value = false;
    showToast("Optimization failed: " + fnError.message, "error");
    return;
  }
  const { error: dbError } = await supabase
    .from("maintenance_tasks")
    .update({ last_run_at: now })
    .eq("name", "Optimize Database");
  optimizing.value = false;
  if (dbError) {
    showToast("Optimization ran but failed to log.", "error");
    return;
  }
  lastOptimization.value = "Just now";
  showOptimizationAlert.value = false;
  showToast("Query statistics updated successfully.");
  sessionStorage.removeItem(CACHE_KEY_TASKS);
  await fetchTasks(true);
};

const runTask = async (task) => {
  task.running = true;
  const now = new Date().toISOString();
  if (task.name === "Optimize Database") {
    const { error: fnError } = await supabase.rpc("run_vacuum");
    if (fnError) {
      task.running = false;
      showToast("Optimization failed: " + fnError.message, "error");
      return;
    }
  } else if (task.name === "Clear Cache") {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      task.running = false;
      showToast("Cache clear failed: " + e.message, "error");
      return;
    }
  }
  const { error } = await supabase
    .from("maintenance_tasks")
    .update({ last_run_at: now })
    .eq("id", task.id);
  task.running = false;
  if (error) {
    showToast(`${task.name} failed to log.`, "error");
    return;
  }
  task.lastRun = "Just now";
  task._last_run_at = now;
  if (task.name === "Optimize Database") {
    lastOptimization.value = "Just now";
    showOptimizationAlert.value = false;
  }
  showToast(`${task.name} completed successfully.`);
  sessionStorage.removeItem(CACHE_KEY_TASKS);
};

// ── Mount ─────────────────────────────────────────────────
onMounted(() => {
  if (sessionStorage.getItem("maint_refreshed")) {
    sessionStorage.removeItem("maint_refreshed");
    [
      CACHE_KEY_STATS,
      CACHE_KEY_USERS,
      CACHE_KEY_BACKUPS,
      CACHE_KEY_TASKS,
      CACHE_KEY_LOGINS,
    ].forEach((k) => sessionStorage.removeItem(k));
  }

  fetchStats();
  fetchFailedLogins();
  fetchUsers();
  fetchBackupHistory();
  fetchTasks();
});
</script>

<style scoped>
.users-table td:nth-child(1),
.users-table td:nth-child(4),
.users-table td:nth-child(5) {
  text-transform: capitalize;
}

.maintenance-page {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.page-sub {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
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
.stat-icon-wrap {
  color: #8b4513;
  flex-shrink: 0;
}
.stat-icon-wrap.green {
  color: #28a745;
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
.stat-value.green {
  color: #28a745;
}
.stat-sub {
  font-size: 11px;
  color: #adb5bd;
}

.tab-bar {
  display: flex;
  gap: 0.25rem;
  background: #fff;
  border-radius: 10px 10px 0 0;
  padding: 0 16px;
  border: 1px solid #e5e0dd;
  border-bottom: none;
}
.tab-btn {
  background: none;
  border: none;
  padding: 0.7rem 1.1rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #6b6b6b;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.tab-btn:hover {
  color: #532f15;
}
.tab-btn.active {
  color: #532f15;
  border-bottom-color: #532f15;
  background: #fff8f4;
  border-radius: 8px 8px 0 0;
}

.tab-content {
  background: #fff;
  border-radius: 0 0 12px 12px;
  border: 1px solid #e5e0dd;
  padding: 24px;
}

.panel {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e9ecef;
  padding: 20px;
}
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.panel-header h5 {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.panel-icon {
  color: #8b4513;
}
.panel-sub {
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 16px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.mt-3 {
  margin-top: 16px;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.resource-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.resource-label {
  font-size: 13px;
  color: #495057;
}
.resource-value {
  font-size: 13px;
  color: #8b4513;
  font-weight: 600;
}
.progress-bar-wrap {
  height: 8px;
  background: #e9ecef;
  border-radius: 999px;
  overflow: hidden;
  margin-top: 6px;
}
.progress-bar {
  height: 100%;
  background: #532f15;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.security-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.security-label {
  font-size: 13px;
  color: #495057;
}
.security-val {
  font-size: 13px;
  color: #8b4513;
  font-weight: 500;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.badge-active {
  background: #d4edda;
  color: #155724;
}
.badge-inactive {
  background: #f8d7da;
  color: #721c24;
}

.alert-panel {
  background: #fff8e7;
  border: 1px solid #ffe4b5;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.alert-icon {
  color: #f57c00;
  flex-shrink: 0;
}
.alert-title {
  font-size: 14px;
  font-weight: 600;
  color: #f57c00;
}
.alert-sub {
  font-size: 12px;
  color: #856404;
  margin-top: 2px;
}
.btn-optimize {
  margin-left: auto;
  flex-shrink: 0;
  background: #532f15;
  color: #fff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
}
.btn-optimize:hover:not(:disabled) {
  background: #4e342e;
}
.btn-optimize:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.active-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.status-active {
  background: #d4edda;
  color: #155724;
}
.status-inactive {
  background: #fff3cd;
  color: #856404;
}
.status-never {
  background: #f8d7da;
  color: #721c24;
}

/* ── Scrollable table wrapper (shared) ─────────────────────── */
.scrollable-table-wrap {
  max-height: 460px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

/* ── Tables ─────────────────────────────────────────────────── */
.history-table {
  width: 100%;
  /* border-separate + border-spacing:0 is required for sticky thead to work */
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  table-layout: fixed;
}
.history-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #f8f9fa;
  color: #6b6b6b;
  font-weight: 700;
  font-size: 12px;
  padding: 10px 14px;
  text-align: left;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
}
.history-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #f5f5f5;
  color: #343a40;
}
.history-table tr:last-child td {
  border-bottom: none;
}
.history-table tr:hover td {
  background: #fafafa;
}

/* column widths */
.history-table th:nth-child(1),
.history-table td:nth-child(1) {
  width: 15%;
}
.history-table th:nth-child(2),
.history-table td:nth-child(2) {
  width: 22%;
}
.history-table th:nth-child(3),
.history-table td:nth-child(3) {
  width: 15%;
}
.history-table th:nth-child(4),
.history-table td:nth-child(4) {
  width: 10%;
}
.history-table th:nth-child(5),
.history-table td:nth-child(5) {
  width: 12%;
}
.history-table th:nth-child(6),
.history-table td:nth-child(6) {
  width: 14%;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0ebe8;
  gap: 16px;
}
.task-row:last-child {
  border-bottom: none;
}
.task-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.task-sub {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}
.task-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.task-last {
  font-size: 12px;
  color: #6b6b6b;
  white-space: nowrap;
}
.btn-run {
  background: #fff;
  border: 1px solid #e9ecef;
  color: #532f15;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.btn-run:hover:not(:disabled) {
  background: #fff8f4;
  border-color: #532f15;
}
.btn-run:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.toast-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 11px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  animation: slideUp 0.2s ease;
}
.toast-wrap.success {
  background: #d1e7dd;
  color: #0a3622;
}
.toast-wrap.error {
  background: #f8d7da;
  color: #58151c;
}

@keyframes slideUp {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .maintenance-page {
    padding: 16px;
  }
  .two-col {
    grid-template-columns: 1fr;
  }
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .tab-bar {
    overflow-x: auto;
  }
}
</style>
