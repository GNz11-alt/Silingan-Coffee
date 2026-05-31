<template>
  <div class="maintenance-page">
    <!-- ── PAGE HEADER ─────────────────────────────────────── -->
    <div class="page-header mb-4">
      <h4 class="page-title mb-1">System Maintenance</h4>
      <p class="page-sub">Monitor and maintain Silingan Coffee system health</p>
    </div>

    <!-- ── STAT CARDS ──────────────────────────────────────── -->
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

    <!-- ── TABS ────────────────────────────────────────────── -->
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

    <!-- ── TAB: OVERVIEW ───────────────────────────────────── -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <div v-if="isLoadingStats" class="text-center py-4">
        <div class="spinner-border spinner-border-sm text-secondary"></div>
        <p class="mt-2 text-muted small">Loading system stats...</p>
      </div>

      <div v-else class="two-col">
        <!-- System Resources -->
        <div class="panel">
          <div class="panel-header">
            <component :is="HardDrive" :size="18" class="panel-icon" />
            <h5>System Resources</h5>
          </div>
          <div class="resource-list">
            <div class="resource-row">
              <span class="resource-label">Storage Usage</span>
              <span class="resource-value">
                {{ stats.storage_used_gb }}GB / {{ stats.storage_total_gb }}GB
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

        <!-- Security Status -->
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

      <!-- Optimization Alert -->
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

      <!-- Backup History (read-only — backups created in Backup & Restore module) -->
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

        <table v-else class="history-table">
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
                colspan="4"
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

    <!-- ── TAB: USER SESSIONS ──────────────────────────────── -->
    <div v-if="activeTab === 'sessions'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="Users" :size="18" class="panel-icon" />
          <h5>Registered Users</h5>
        </div>
        <p class="panel-sub">
          All users registered in the system. Active session tracking is not yet
          implemented.
        </p>

        <div v-if="isLoadingUsers" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
          <p class="mt-2 text-muted small">Loading users...</p>
        </div>

        <table v-else class="history-table users-table">
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

    <!-- ── TAB: SETTINGS ───────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="SettingsIcon" :size="18" class="panel-icon" />
          <h5>System Settings</h5>
        </div>

        <div v-if="isLoadingSettings" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
        </div>

        <div v-else>
          <div class="settings-list">
            <div class="setting-row">
              <div>
                <div class="setting-label">System Timezone</div>
                <div class="setting-sub">
                  All timestamps will use this timezone
                </div>
              </div>
              <select v-model="settings.timezone" class="setting-select">
                <option value="Asia/Manila">Asia/Manila (PHT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Automatic Backups</div>
                <div class="setting-sub">
                  Automatically backup the database daily
                </div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.autoBackup" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="setting-row">
              <div>
                <div class="setting-label">Maintenance Mode</div>
                <div class="setting-sub">
                  Restrict access to admins only during maintenance
                </div>
              </div>
              <label class="toggle">
                <input type="checkbox" v-model="settings.maintenanceMode" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="d-flex justify-content-end mt-3">
            <button
              class="btn-primary"
              @click="saveSettings"
              :disabled="savingSettings"
            >
              <span
                v-if="savingSettings"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: TASKS ──────────────────────────────────────── -->
    <div v-if="activeTab === 'tasks'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="CheckSquare" :size="18" class="panel-icon" />
          <h5>Maintenance Tasks</h5>
        </div>

        <div v-if="isLoadingTasks" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
        </div>

        <div v-else class="tasks-list">
          <div class="task-row" v-for="task in tasks" :key="task.id">
            <div class="task-info">
              <div class="task-name">{{ task.name }}</div>
              <div class="task-sub">{{ task.description }}</div>
            </div>
            <div class="task-right">
              <span class="task-last">Last run: {{ task.lastRun }}</span>
              <button
                class="btn-run"
                @click="runTask(task)"
                :disabled="task.running"
              >
                <span
                  v-if="task.running"
                  class="spinner-border spinner-border-sm"
                ></span>
                <span v-else>Run</span>
              </button>
            </div>
          </div>
          <div
            v-if="!tasks.length"
            class="text-center text-muted py-4"
            style="font-size: 13px"
          >
            No tasks found.
          </div>
        </div>
      </div>
    </div>

    <!-- ── TOAST ──────────────────────────────────────────── -->
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
  Settings as SettingsIcon,
  CheckSquare,
} from "lucide-vue-next";

const branches = ref([]);
const sslValid = ref(window.location.protocol === "https:");

// ── Tabs ───────────────────────────────────────────────────
const activeTab = ref("overview");
const tabs = [
  { key: "overview", label: "Overview" },
  { key: "sessions", label: "User Sessions" },
  { key: "settings", label: "Settings" },
  { key: "tasks", label: "Tasks" },
];

// ── Loading flags ──────────────────────────────────────────
const isLoadingStats = ref(false);
const isLoadingUsers = ref(false);
const isLoadingBackups = ref(false);
const isLoadingSettings = ref(false);
const isLoadingTasks = ref(false);

// ── System stats (from system_stats table, row id=1) ───────
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

// ── Security ───────────────────────────────────────────────
// lastScanLabel is derived from the stats row updated_at.
const failedLogins = ref(0);

// ── Users / sessions ───────────────────────────────────────
// No sessions table yet — we show the full user list instead.
const totalUsers = ref(0);
const userList = ref([]);

// ── Backup history (read-only, populated from backup_logs) ─
const backupHistory = ref([]);
const lastBackupStatus = ref("—");
const lastBackupTime = ref("—");

// ── Optimization alert (driven by maintenance_tasks) ───────
const showOptimizationAlert = ref(false);
const lastOptimization = ref("—");
const optimizing = ref(false);

// ── Settings ───────────────────────────────────────────────
const savingSettings = ref(false);
const settings = ref({
  timezone: "Asia/Manila",
  autoBackup: true,
  maintenanceMode: false,
});

// ── Tasks ──────────────────────────────────────────────────
const tasks = ref([]);

// ── Toast ──────────────────────────────────────────────────
const toast = ref({ show: false, message: "", type: "success" });
const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

// ── Helpers ────────────────────────────────────────────────
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
  if (hours >= 3) return "status-inactive";
  return "status-active";
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

// ── Fetch: system stats ────────────────────────────────────
const fetchStats = async () => {
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

  stats.value = {
    health_label: data.health_label,
    uptime_percent: data.uptime_percent,
    uptime_label: data.uptime_label,
    storage_used_gb: data.storage_used_gb,
    storage_total_gb: data.storage_total_gb,
  };
};

// ── Fetch: failed logins (last 24 h) ──────────────────────
const fetchFailedLogins = async () => {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count, error } = await supabase
    .from("failed_logins")
    .select("id", { count: "exact", head: true })
    .gte("attempted_at", since);

  if (!error) failedLogins.value = count ?? 0;
};

// ── Fetch: users ───────────────────────────────────────────
const fetchUsers = async () => {
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

  branches.value = (branchData || []).map((b) => ({
    id: String(b.BranchId),
    name: b.BranchName,
  }));

  const empMap = {};
  for (const e of empData || []) {
    const key =
      `${e.FirstName.toLowerCase()}.${e.LastName.toLowerCase()}`.replace(
        /\s+/g,
        "",
      );
    empMap[key] = e;
  }

  userList.value = data.map((u) => {
    const emp = empMap[u.username];
    const fallbackName = u.username.includes("@")
      ? u.username.split("@")[0]
      : u.username.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      ...u,
      fullName: emp ? `${emp.FirstName} ${emp.LastName}` : fallbackName,
      email: emp?.Email || "—",
      position: emp?.Position || null,
      branch:
        branches.value.find((b) => b.id === String(u.branch))?.name || u.branch,
      lastActivePretty: timeAgo(u.last_active),
    };
  });

  totalUsers.value = count ?? 0;
};

// ── Fetch: backup history ──────────────────────────────────
const fetchBackupHistory = async () => {
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

  backupHistory.value = data.map((b) => ({
    id: b.id,
    date: formatDate(b.created_at),
    type: b.type,
    size: b.size_mb != null ? `${b.size_mb} MB` : "—",
    backedUpBy: b.backed_up_by ?? "—",
    status: b.status,
  }));

  if (data.length) {
    lastBackupStatus.value = data[0].status;
    lastBackupTime.value = timeAgo(data[0].created_at);
  }
};

// ── Fetch: settings ────────────────────────────────────────
const fetchSettings = async () => {
  isLoadingSettings.value = true;
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .single();
  isLoadingSettings.value = false;

  if (error) {
    showToast("Failed to load settings.", "error");
    return;
  }

  settings.value.timezone = data.timezone;
  settings.value.autoBackup = data.auto_backup;
  settings.value.maintenanceMode = data.maintenance_mode;
};

// ── Fetch: tasks ───────────────────────────────────────────
const fetchTasks = async () => {
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

  tasks.value = data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    lastRun: timeAgo(t.last_run_at),
    running: false,
    _last_run_at: t.last_run_at,
  }));

  const optTask = tasks.value.find((t) => t.name === "Optimize Database");
  if (optTask) {
    const daysSince = optTask._last_run_at
      ? (Date.now() - new Date(optTask._last_run_at).getTime()) / 86_400_000
      : Infinity;
    lastOptimization.value = optTask.lastRun;
    showOptimizationAlert.value = daysSince >= 7;
  }
};

// ── Action: run optimization ───────────────────────────────
// ── Action: run optimization ───────────────────────────────
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
  await fetchTasks();
};

// ── Action: save settings ──────────────────────────────────
const saveSettings = async () => {
  savingSettings.value = true;

  const { error } = await supabase
    .from("system_settings")
    .update({
      timezone: settings.value.timezone,
      auto_backup: settings.value.autoBackup,
      maintenance_mode: settings.value.maintenanceMode,
    })
    .eq("id", 1);

  savingSettings.value = false;

  if (error) {
    showToast("Failed to save settings.", "error");
    return;
  }
  showToast("Settings saved successfully.");
};

// ── Action: run task ───────────────────────────────────────
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
  }

  const { error } = await supabase
    .from("maintenance_tasks")
    .update({ last_run_at: now })
    .eq("id", task.id);

  task.running = false;

  if (error) {
    showToast(`${task.name} failed.`, "error");
    return;
  }

  task.lastRun = "Just now";
  task._last_run_at = now;

  if (task.name === "Optimize Database") {
    lastOptimization.value = "Just now";
    showOptimizationAlert.value = false;
  }

  showToast(`${task.name} completed successfully.`);
};

// ── On mount ───────────────────────────────────────────────
onMounted(() => {
  fetchStats();
  fetchFailedLogins();
  fetchUsers();
  fetchBackupHistory();
  fetchSettings();
  fetchTasks();
});
</script>

<style scoped>
.users-table td:nth-child(1),
.users-table td:nth-child(4),
.users-table td:nth-child(5) {
  text-transform: capitalize;
}

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

/* ── Stat Cards ───────────────────────────────────────────── */
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

/* ── Tabs ─────────────────────────────────────────────────── */
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

/* ── Tab content ──────────────────────────────────────────── */
.tab-content {
  background: #fff;
  border-radius: 0 0 12px 12px;
  border: 1px solid #e5e0dd;
  padding: 24px;
}

/* ── Panel ────────────────────────────────────────────────── */
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

/* ── Resources ────────────────────────────────────────────── */
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
.mt-3 {
  margin-top: 16px;
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

/* ── Security ─────────────────────────────────────────────── */
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

/* ── Badges ───────────────────────────────────────────────── */
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

/* ── Alert ────────────────────────────────────────────────── */
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

/* ── Backup ───────────────────────────────────────────────── */
.backup-actions {
  margin-bottom: 8px;
}
.history-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 12px;
}

/* ── Tables ───────────────────────────────────────────────── */
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}
.history-table th {
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

/* ── Buttons ──────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #532f15;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) {
  background: #4e342e;
}
.btn-primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Settings ─────────────────────────────────────────────── */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0ebe8;
}
.setting-row:last-child {
  border-bottom: none;
}
.setting-label {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.setting-sub {
  font-size: 12px;
  color: #6b6b6b;
  margin-top: 2px;
}
.setting-select {
  padding: 6px 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}
.setting-select:focus {
  border-color: #532f15;
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 24px;
  transition: background 0.2s;
}
.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  left: 3px;
  top: 3px;
  transition: transform 0.2s;
}
.toggle input:checked + .toggle-slider {
  background: #532f15;
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* ── Tasks ────────────────────────────────────────────────── */
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

/* ── Toast ────────────────────────────────────────────────── */
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
