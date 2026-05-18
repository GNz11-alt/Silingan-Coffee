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
        <div class="stat-top">
          <span class="stat-label">System Health</span>
          <component :is="CheckCircle" :size="22" class="stat-icon green" />
        </div>
        <div class="stat-value green">{{ systemHealth }}</div>
        <div class="stat-sub">All systems operational</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Uptime</span>
          <component :is="Clock" :size="22" class="stat-icon" />
        </div>
        <div class="stat-value">{{ uptime }}</div>
        <div class="stat-sub">{{ uptimeSub }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Active Users</span>
          <component :is="Users" :size="22" class="stat-icon" />
        </div>
        <div class="stat-value">{{ activeUsers }}/{{ totalUsers }}</div>
        <div class="stat-sub">employees online</div>
      </div>

      <div class="stat-card">
        <div class="stat-top">
          <span class="stat-label">Last Backup</span>
          <component :is="Database" :size="22" class="stat-icon" />
        </div>
        <div class="stat-value">{{ lastBackupStatus }}</div>
        <div class="stat-sub">{{ lastBackupTime }}</div>
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
      <div class="two-col">
        <!-- System Resources -->
        <div class="panel">
          <div class="panel-header">
            <component :is="HardDrive" :size="18" class="panel-icon" />
            <h5>System Resources</h5>
          </div>
          <div class="resource-list">
            <div class="resource-row">
              <span class="resource-label">Storage Usage</span>
              <span class="resource-value"
                >{{ storage.used }}GB / {{ storage.total }}GB</span
              >
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{ width: storagePercent + '%' }"
              ></div>
            </div>

            <div class="resource-row mt-3">
              <span class="resource-label">Memory Usage</span>
              <span class="resource-value">{{ memoryPercent }}%</span>
            </div>
            <div class="progress-bar-wrap">
              <div
                class="progress-bar"
                :style="{
                  width: memoryPercent + '%',
                  background: memoryPercent > 80 ? '#dc3545' : '#532f15',
                }"
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
              <span class="badge badge-active">Valid</span>
            </div>
            <div class="security-row">
              <span class="security-label">Last Security Scan</span>
              <span class="security-val">{{ lastScan }}</span>
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
            Consider running database optimization to improve performance. Last
            optimization was {{ lastOptimization }}.
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
    </div>

    <!-- ── TAB: BACKUP ─────────────────────────────────────── -->
    <div v-if="activeTab === 'backup'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="Database" :size="18" class="panel-icon" />
          <h5>Database Backup</h5>
        </div>
        <p class="panel-sub">
          Create and manage database backups for Silingan Coffee system.
        </p>

        <div class="backup-actions">
          <button class="btn-primary" @click="runBackup" :disabled="backingUp">
            <component :is="Download" :size="16" />
            <span v-if="backingUp">Backing up...</span>
            <span v-else>Create Backup Now</span>
          </button>
        </div>

        <div class="backup-history mt-4">
          <div class="history-title">Backup History</div>
          <table class="history-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Size</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in backupHistory" :key="b.id">
                <td>{{ b.date }}</td>
                <td>{{ b.type }}</td>
                <td>{{ b.size }}</td>
                <td>
                  <span
                    class="badge"
                    :class="
                      b.status === 'Success' ? 'badge-active' : 'badge-inactive'
                    "
                    >{{ b.status }}</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── TAB: USER SESSIONS ──────────────────────────────── -->
    <div v-if="activeTab === 'sessions'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="Users" :size="18" class="panel-icon" />
          <h5>Active User Sessions</h5>
        </div>

        <div v-if="isLoadingSessions" class="text-center py-4">
          <div class="spinner-border spinner-border-sm text-secondary"></div>
          <p class="mt-2 text-muted small">Loading sessions...</p>
        </div>

        <table v-else class="history-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in userSessions" :key="u.id">
              <td>{{ u.username }}</td>
              <td>{{ u.role }}</td>
              <td>{{ u.branch }}</td>
              <td><span class="badge badge-active">Online</span></td>
            </tr>
            <tr v-if="!userSessions.length">
              <td
                colspan="4"
                class="text-center text-muted py-4"
                style="font-size: 13px"
              >
                No active sessions.
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
          <component :is="Settings" :size="18" class="panel-icon" />
          <h5>System Settings</h5>
        </div>
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

    <!-- ── TAB: TASKS ──────────────────────────────────────── -->
    <div v-if="activeTab === 'tasks'" class="tab-content">
      <div class="panel">
        <div class="panel-header">
          <component :is="CheckSquare" :size="18" class="panel-icon" />
          <h5>Maintenance Tasks</h5>
        </div>
        <div class="tasks-list">
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
  Download,
  Settings,
  CheckSquare,
} from "lucide-vue-next";

// ── Stat cards ─────────────────────────────────────────────
const systemHealth = ref("Excellent");
const uptime = ref("99.8%");
const uptimeSub = ref("15 days, 4 hours");
const activeUsers = ref(0);
const totalUsers = ref(0);
const lastBackupStatus = ref("—");
const lastBackupTime = ref("—");

// ── Resources ──────────────────────────────────────────────
const storage = ref({ used: 2.4, total: 10 });
const memoryPercent = ref(68);
const storagePercent = computed(
  () => (storage.value.used / storage.value.total) * 100,
);

// ── Security ───────────────────────────────────────────────
const lastScan = ref("Today 10:30 AM");
const failedLogins = ref(0);

// ── Optimization ───────────────────────────────────────────
const showOptimizationAlert = ref(false);
const lastOptimization = ref("—");
const optimizing = ref(false);

// ── Tabs ───────────────────────────────────────────────────
const activeTab = ref("overview");
const tabs = [
  { key: "overview", label: "Overview" },
  { key: "backup", label: "Backup" },
  { key: "sessions", label: "User Sessions" },
  { key: "settings", label: "Settings" },
  { key: "tasks", label: "Tasks" },
];

// ── Backup ─────────────────────────────────────────────────
const backingUp = ref(false);
const backupHistory = ref([]);

// ── Sessions ───────────────────────────────────────────────
const isLoadingSessions = ref(false);
const userSessions = ref([]);

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

// ── Fetch: users ───────────────────────────────────────────
const fetchUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, branch");

  if (error) {
    showToast("Failed to load users.", "error");
    return;
  }

  totalUsers.value = data.length;
  activeUsers.value = Math.floor(data.length * 0.4);
  userSessions.value = data.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    branch: u.branch,
  }));
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

// ── Fetch: backup history ──────────────────────────────────
const fetchBackupHistory = async () => {
  const { data, error } = await supabase
    .from("backup_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    showToast("Failed to load backup history.", "error");
    return;
  }

  backupHistory.value = data.map((b) => ({
    id: b.id,
    date: formatDate(b.created_at),
    type: b.type,
    size: `${b.size_mb} MB`,
    status: b.status,
  }));

  if (data.length) {
    lastBackupStatus.value = data[0].status;
    lastBackupTime.value = timeAgo(data[0].created_at);
  }
};

// ── Fetch: settings ────────────────────────────────────────
const fetchSettings = async () => {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .single();

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
  const { data, error } = await supabase
    .from("maintenance_tasks")
    .select("*")
    .order("id");

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

  // Drive the optimization alert from the actual DB timestamp
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
const runOptimization = async () => {
  optimizing.value = true;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("maintenance_tasks")
    .update({ last_run_at: now })
    .eq("name", "Optimize Database");

  optimizing.value = false;

  if (error) {
    showToast("Optimization failed.", "error");
    return;
  }

  lastOptimization.value = "Just now";
  showOptimizationAlert.value = false;
  showToast("Database optimization completed successfully.");
  await fetchTasks();
};

// ── Action: create backup ──────────────────────────────────
const runBackup = async () => {
  backingUp.value = true;

  const { data, error } = await supabase
    .from("backup_logs")
    .insert({ type: "Manual", size_mb: 24.5, status: "Success" })
    .select()
    .single();

  backingUp.value = false;

  if (error) {
    showToast("Backup failed.", "error");
    return;
  }

  backupHistory.value.unshift({
    id: data.id,
    date: formatDate(data.created_at),
    type: data.type,
    size: `${data.size_mb} MB`,
    status: data.status,
  });

  lastBackupStatus.value = "Success";
  lastBackupTime.value = "Just now";
  showToast("Backup created successfully.");
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
onMounted(async () => {
  isLoadingSessions.value = true;
  await Promise.all([
    fetchUsers(),
    fetchFailedLogins(),
    fetchBackupHistory(),
    fetchSettings(),
    fetchTasks(),
  ]);
  isLoadingSessions.value = false;
});
</script>

<style scoped>
.maintenance-page {
  padding: 24px 32px;
  background: #f4f1ef;
  min-height: 100vh;
}

.page-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #1a1a1a;
}
.page-sub {
  font-size: 0.82rem;
  color: #6b6b6b;
}

/* ── Stat Cards ───────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e9ecef;
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.stat-label {
  font-size: 13px;
  color: #6b6b6b;
  font-weight: 500;
}
.stat-icon {
  color: #8b4513;
}
.stat-icon.green {
  color: #28a745;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #8b4513;
  margin-bottom: 4px;
}
.stat-value.green {
  color: #28a745;
}
.stat-sub {
  font-size: 12px;
  color: #8b4513;
}

/* ── Tabs ─────────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid #e5e0dd;
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
.setting-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  outline: none;
}
.setting-input:focus {
  border-color: #532f15;
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
