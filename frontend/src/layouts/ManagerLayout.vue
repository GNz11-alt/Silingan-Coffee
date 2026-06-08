<template>
  <div class="dashboard" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside class="sidebar">
      <div class="sidebar-top">
        <button class="toggle-btn" @click="toggleSidebar">
          <component
            :is="isSidebarCollapsed ? ChevronRight : ChevronLeft"
            :size="20"
          />
        </button>

        <div class="brand-section">
          <div class="logo-wrapper">
            <img
              src="@/assets/images/logo.png"
              alt="Silingan Coffee"
              class="logo"
            />
          </div>
          <div class="brand-text" v-show="!isSidebarCollapsed">
            <h2>Silingan Coffee</h2>
            <p class="user-role">Manager</p>
            <p class="user-branch">{{ userBranchName || "All Branches" }}</p>
          </div>
        </div>

        <div class="datetime-section" v-show="!isSidebarCollapsed">
          <p class="datetime-time">{{ currentTime }}</p>
          <p class="datetime-date">{{ currentDate }}</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          to="/manager/search"
          class="nav-item"
          :class="{ active: $route.path === '/manager/search' }"
        >
          <component :is="SearchIcon" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Search</span>
        </router-link>

        <router-link
          to="/manager/dashboard"
          class="nav-item"
          :class="{ active: $route.path === '/manager/dashboard' }"
        >
          <component :is="Home" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Dashboard</span>
        </router-link>

        <router-link
          to="/manager/inventory"
          class="nav-item"
          :class="{ active: $route.path === '/manager/inventory' }"
        >
          <component :is="Package" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Inventory</span>
        </router-link>

        <router-link
          to="/manager/sales"
          class="nav-item"
          :class="{ active: $route.path === '/manager/sales' }"
        >
          <component :is="BarChart3" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Sales</span>
        </router-link>

        <router-link
          to="/manager/shift-management"
          class="nav-item"
          :class="{ active: $route.path === '/manager/shift-management' }"
        >
          <component :is="Users" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Shift Management</span>
        </router-link>

        <router-link
          to="/manager/menu-pricing"
          class="nav-item"
          :class="{ active: $route.path === '/manager/menu-pricing' }"
        >
          <component :is="Coffee" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Menu & Pricing</span>
        </router-link>

        <router-link
          to="/manager/reports"
          class="nav-item"
          :class="{ active: $route.path === '/manager/reports' }"
        >
          <component :is="FileText" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Reports & Analytics</span>
        </router-link>

        <router-link
          to="/manager/backup"
          class="nav-item"
          :class="{ active: $route.path === '/manager/backup' }"
        >
          <component :is="Database" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Backup & Restore</span>
        </router-link>

        <router-link
          to="/manager/help"
          class="nav-item"
          :class="{ active: $route.path === '/manager/help' }"
        >
          <component :is="HelpCircle" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Help</span>
        </router-link>

        <router-link
          to="/manager/about"
          class="nav-item"
          :class="{ active: $route.path === '/manager/about' }"
        >
          <component :is="Info" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">About</span>
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <button class="nav-item notification-btn" @click="toggleNotifications">
          <component :is="Bell" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Notifications</span>
          <span
            class="notification-badge"
            v-if="unreadCount && !isSidebarCollapsed"
            >{{ unreadCount }}</span
          >
        </button>
        <NotificationPanel
          v-if="showNotifPanel"
          :branch-id="userBranchId"
          @close="showNotifPanel = false"
          @update-count="unreadCount = $event"
        />

        <button
          class="nav-item change-pw-btn"
          @click="showChangePwModal = true"
        >
          <component :is="KeyRound" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Change Password</span>
        </button>
        <button class="nav-item logout-btn" @click="logout">
          <component :is="LogOut" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <KeepAlive include="ManagerSchedule">
          <component :is="Component" />
        </KeepAlive>
      </router-view>
    </main>
    <Teleport to="body">
      <div
        v-if="showChangePwModal"
        class="cpw-overlay"
        @click.self="closeChangePw"
      >
        <div class="cpw-box">
          <div class="cpw-header">
            <h6>Change Password</h6>
            <button class="cpw-close" @click="closeChangePw">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="cpw-body">
            <!-- Current Password -->
            <div class="cpw-field">
              <label>Current Password</label>
              <div class="cpw-input-wrap">
                <input
                  v-model="cpw.current"
                  :type="cpw.showCurrent ? 'text' : 'password'"
                  placeholder="Enter current password"
                  class="cpw-input"
                />
                <button
                  class="cpw-eye"
                  @click="cpw.showCurrent = !cpw.showCurrent"
                >
                  <i
                    :class="cpw.showCurrent ? 'bi bi-eye-slash' : 'bi bi-eye'"
                  ></i>
                </button>
              </div>
            </div>

            <!-- New Password -->
            <div class="cpw-field">
              <label>New Password</label>
              <div class="cpw-input-wrap">
                <input
                  v-model="cpw.new"
                  :type="cpw.showNew ? 'text' : 'password'"
                  placeholder="Enter new password"
                  class="cpw-input"
                  @input="validateNewPw"
                />
                <button class="cpw-eye" @click="cpw.showNew = !cpw.showNew">
                  <i :class="cpw.showNew ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <!-- Rules -->
              <div class="cpw-rules">
                <span :class="['cpw-rule', { met: cpwRules.length }]"
                  >✓ At least 8 characters</span
                >
                <span :class="['cpw-rule', { met: cpwRules.uppercase }]"
                  >✓ Uppercase letter</span
                >
                <span :class="['cpw-rule', { met: cpwRules.lowercase }]"
                  >✓ Lowercase letter</span
                >
                <span :class="['cpw-rule', { met: cpwRules.number }]"
                  >✓ Number</span
                >
                <span :class="['cpw-rule', { met: cpwRules.special }]"
                  >✓ Special character</span
                >
              </div>
            </div>

            <!-- Confirm New Password -->
            <div class="cpw-field">
              <label>Confirm New Password</label>
              <div class="cpw-input-wrap">
                <input
                  v-model="cpw.confirm"
                  :type="cpw.showConfirm ? 'text' : 'password'"
                  placeholder="Re-enter new password"
                  class="cpw-input"
                />
                <button
                  class="cpw-eye"
                  @click="cpw.showConfirm = !cpw.showConfirm"
                >
                  <i
                    :class="cpw.showConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'"
                  ></i>
                </button>
              </div>
            </div>

            <p v-if="cpw.error" class="cpw-error">{{ cpw.error }}</p>
            <p v-if="cpw.success" class="cpw-success">{{ cpw.success }}</p>
          </div>

          <div class="cpw-footer">
            <button class="cpw-cancel" @click="closeChangePw">Cancel</button>
            <button
              class="cpw-submit"
              :disabled="cpw.loading"
              @click="doChangePassword"
            >
              <span
                v-if="cpw.loading"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              <span v-else>Update Password</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { supabase } from "@/supabase.js";
import { useSessionGuard } from "@/composables/userSessionGuard.js";
import { ref, onMounted, onUnmounted, computed, reactive } from "vue";
import { useRouter } from "vue-router";
import {
  Home,
  Package,
  BarChart3,
  Users,
  KeyRound,
  Coffee,
  FileText,
  Database,
  Search as SearchIcon,
  HelpCircle,
  Info,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { useUserBranch } from "@/composables/useUserBranch.js";
import NotificationPanel from "@/components/NotificationPanel.vue";
import { useNotifications } from "@/composables/useNotifications.js";

const router = useRouter();
const isSidebarCollapsed = ref(false);
const branch = ref("");
const unreadCount = ref(0);
const showNotifPanel = ref(false);
const { fetchNotifications } = useNotifications();

const now = ref(new Date());
let clockInterval = null;

const currentTime = computed(() =>
  now.value.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }),
);
const currentDate = computed(() =>
  now.value.toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
);

useSessionGuard();
const showChangePwModal = ref(false);

const cpw = reactive({
  current: "",
  new: "",
  confirm: "",
  showCurrent: false,
  showNew: false,
  showConfirm: false,
  loading: false,
  error: "",
  success: "",
});

const cpwRules = reactive({
  length: false,
  uppercase: false,
  lowercase: false,
  number: false,
  special: false,
});

const validateNewPw = () => {
  const v = cpw.new;
  cpwRules.length = v.length >= 8;
  cpwRules.uppercase = /[A-Z]/.test(v);
  cpwRules.lowercase = /[a-z]/.test(v);
  cpwRules.number = /[0-9]/.test(v);
  cpwRules.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v);
};

const isNewPwValid = () =>
  cpwRules.length &&
  cpwRules.uppercase &&
  cpwRules.lowercase &&
  cpwRules.number &&
  cpwRules.special;

const hashPassword = async (plaintext) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const closeChangePw = () => {
  showChangePwModal.value = false;
  cpw.current = "";
  cpw.new = "";
  cpw.confirm = "";
  cpw.showCurrent = false;
  cpw.showNew = false;
  cpw.showConfirm = false;
  cpw.error = "";
  cpw.success = "";
  Object.keys(cpwRules).forEach((k) => (cpwRules[k] = false));
};

const doChangePassword = async () => {
  cpw.error = "";
  cpw.success = "";

  if (!cpw.current || !cpw.new || !cpw.confirm) {
    cpw.error = "Please fill in all fields.";
    return;
  }
  if (!isNewPwValid()) {
    cpw.error = "New password does not meet the requirements.";
    return;
  }
  if (cpw.new !== cpw.confirm) {
    cpw.error = "New passwords do not match.";
    return;
  }
  if (cpw.current === cpw.new) {
    cpw.error = "New password must be different from your current password.";
    return;
  }

  cpw.loading = true;

  const storedUsername = localStorage.getItem("username");
  const hashedCurrent = await hashPassword(cpw.current);

  const { data: userCheck } = await supabase
    .from("users")
    .select("id")
    .eq("username", storedUsername)
    .eq("password", hashedCurrent)
    .maybeSingle();

  if (!userCheck) {
    cpw.error = "Current password is incorrect.";
    cpw.loading = false;
    return;
  }

  const hashedNew = await hashPassword(cpw.new);

  // Single update: password + force_logout_at together
  const { error: updateError } = await supabase
    .from("users")
    .update({
      password: hashedNew,
      force_logout_at: new Date().toISOString(),
    })
    .eq("id", userCheck.id);

  cpw.loading = false;

  if (updateError) {
    cpw.error = "Failed to update password. Please try again.";
    return;
  }

  cpw.success = "Password updated. Logging out...";

  setTimeout(() => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("branch");
    localStorage.removeItem("userId");
    localStorage.removeItem("loginTime");
    router.push("/login");
  }, 1800);
};

const { isAdmin, userBranchId, userBranchName, resolveBranch } =
  useUserBranch();

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
  localStorage.setItem("sidebarCollapsed", isSidebarCollapsed.value);
};

const toggleNotifications = () => {
  showNotifPanel.value = !showNotifPanel.value;
};

const logout = () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  localStorage.removeItem("branch");
  localStorage.removeItem("userId");
  router.push("/login");
};

const savedState = localStorage.getItem("sidebarCollapsed");
if (savedState !== null) {
  isSidebarCollapsed.value = savedState === "true";
}

onMounted(async () => {
  clockInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);

  await resolveBranch();

  const notifs = await fetchNotifications(null);
  unreadCount.value = notifs.length;
});

onUnmounted(() => {
  clearInterval(clockInterval);
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

.sidebar {
  width: 280px;
  background: #31201d;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-y: auto;
  z-index: 100;
  color: white;
}

.dashboard.sidebar-collapsed .sidebar {
  width: 80px;
}

.sidebar-top {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.toggle-btn {
  position: absolute;
  right: 15px;
  top: 28px;
  background: none;
  border: none;
  cursor: pointer;
  color: #ffffff;
  transition: all 0.2s ease;
  z-index: 10;
}

.brand-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.logo {
  width: 32px;
  height: 32px;
  filter: invert(1);
}

.brand-text h2 {
  font-size: 18px;
  font-weight: 500;
  color: #ffffff;
  margin: 0;
}

.cpw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.cpw-box {
  background: #fff;
  border-radius: 14px;
  width: 420px;
  max-width: 94vw;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}
.cpw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.cpw-header h6 {
  font-size: 15px;
  font-weight: 700;
  color: #31201d;
  margin: 0;
}
.cpw-close {
  background: none;
  border: none;
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
}
.cpw-close:hover {
  color: #212529;
}
.cpw-body {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cpw-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cpw-field label {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
}
.cpw-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.cpw-input {
  width: 100%;
  height: 36px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0 36px 0 12px;
  font-size: 13px;
  color: #343a40;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.cpw-input:focus {
  border-color: #8b4513;
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.08);
}
.cpw-input::placeholder {
  color: #adb5bd;
}
.cpw-eye {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
}
.cpw-eye:hover {
  color: #343a40;
}
.cpw-rules {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
}
.cpw-rule {
  font-size: 11px;
  color: #adb5bd;
  transition: color 0.15s;
}
.cpw-rule.met {
  color: #2e7d32;
}
.cpw-error {
  font-size: 12px;
  color: #c62828;
  margin: 0;
}
.cpw-success {
  font-size: 12px;
  color: #2e7d32;
  margin: 0;
}
.cpw-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 22px 18px;
  border-top: 1px solid #f0f0f0;
}
.cpw-cancel {
  background: none;
  border: 1px solid #dee2e6;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 13px;
  color: #495057;
  cursor: pointer;
}
.cpw-cancel:hover {
  background: #f8f9fa;
}
.cpw-submit {
  background: #532f15;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: background 0.15s;
}
.cpw-submit:hover:not(:disabled) {
  background: #3d2210;
}
.cpw-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
input::-ms-reveal,
input::-ms-clear {
  display: none;
}

input::-webkit-credentials-auto-fill-button {
  display: none;
}

input[type="password"]::-ms-reveal {
  display: none;
}

.user-role {
  font-size: 14px;
  color: #a69794;
  margin-top: 2px;
}

.user-branch {
  font-size: 12px;
  color: #c49a6c;
  margin-top: 2px;
  text-transform: capitalize;
}

.sidebar-nav {
  flex: 1;
  padding: 10px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #ffffff;
  text-decoration: none;
  transition: all 0.2s ease;
  gap: 16px;
  font-size: 15px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  border-radius: 8px;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  background: #c49a6c;
  color: #2d1b18;
  font-weight: 500;
}

.nav-icon {
  stroke-width: 1.8;
  flex-shrink: 0;
}

.sidebar-bottom {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.notification-btn {
  position: relative;
}

.notification-badge {
  background: #e5533d;
  color: white;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: bold;
  margin-left: auto;
}

.datetime-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.datetime-time {
  font-size: 20px;
  font-weight: 500;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.datetime-date {
  font-size: 11px;
  color: #a69794;
  margin-top: 2px;
}

.logout-btn {
  margin-top: 10px;
}

.main-content {
  flex: 1;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

.dashboard.sidebar-collapsed .main-content {
  margin-left: 80px;
}
</style>
