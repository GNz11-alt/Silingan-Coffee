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
            <p class="user-role">Staff</p>
          </div>
        </div>

        <div class="datetime-section" v-show="!isSidebarCollapsed">
          <p class="datetime-time">{{ currentTime }}</p>
          <p class="datetime-date">{{ currentDate }}</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          to="/staff/search"
          class="nav-item"
          :class="{ active: $route.path === '/staff/search' }"
        >
          <component :is="SearchIcon" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Search</span>
        </router-link>
        
        <router-link
          to="/staff/dashboard"
          class="nav-item"
          :class="{ active: $route.path === '/staff/dashboard' }"
        >
          <component :is="Home" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Dashboard</span>
        </router-link>

        <router-link
          to="/staff/pos"
          class="nav-item"
          :class="{ active: $route.path === '/staff/pos' }"
        >
          <component :is="ShoppingCart" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Point of Sale</span>
        </router-link>

        <router-link
          to="/staff/inventory"
          class="nav-item"
          :class="{ active: $route.path === '/staff/inventory' }"
        >
          <component :is="Package" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Inventory</span>
        </router-link>

        <router-link
          to="/staff/schedule"
          class="nav-item"
          :class="{ active: $route.path === '/staff/schedule' }"
        >
          <component :is="Calendar" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">My Schedule</span>
        </router-link>

        <router-link
          to="/staff/menu"
          class="nav-item"
          :class="{ active: $route.path === '/staff/menu' }"
        >
          <component :is="Coffee" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Menu & Pricing</span>
        </router-link>

        <router-link
          to="/staff/backup"
          class="nav-item"
          :class="{ active: $route.path === '/staff/backup' }"
        >
          <component :is="Database" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Backup & Restore</span>
        </router-link>

        <router-link
          to="/staff/help"
          class="nav-item"
          :class="{ active: $route.path === '/staff/help' }"
        >
          <component :is="HelpCircle" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Help</span>
        </router-link>

        <router-link
          to="/staff/about"
          class="nav-item"
          :class="{ active: $route.path === '/staff/about' }"
        >
          <component :is="Info" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">About</span>
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <button class="nav-item notification-btn" @click="toggleNotifications">
          <component :is="Bell" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Notifications</span>
          <span class="notification-badge" v-if="unreadCount && !isSidebarCollapsed">{{ unreadCount }}</span>
        </button>
        <NotificationPanel
          v-if="showNotifPanel"
          :branch-id="userBranchId"
          @close="showNotifPanel = false"
          @update-count="unreadCount = $event"
        />

        <button class="nav-item logout-btn" @click="logout">
          <component :is="LogOut" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import {
  Home,
  Package,
  Calendar,
  Coffee,
  Database,
  ShoppingCart,
  HelpCircle,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Info,
  Search as SearchIcon,
} from "lucide-vue-next";
import { useUserBranch } from "@/composables/useUserBranch.js";
import NotificationPanel from "@/components/NotificationPanel.vue";
import { useNotifications } from "@/composables/useNotifications.js";

const now = ref(new Date());
let clockInterval = null;

const currentTime = computed(() =>
  now.value.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
);
const currentDate = computed(() =>
  now.value.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
);

const router = useRouter();
const isSidebarCollapsed = ref(false);
const branch = ref("");
const unreadCount = ref(0);
const showNotifPanel = ref(false);
const { fetchNotifications } = useNotifications();

const { isAdmin, userBranchId, userBranchName, resolveBranch } = useUserBranch();

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

.logout-btn {
  margin-top: 10px;
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

.main-content {
  flex: 1;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

.dashboard.sidebar-collapsed .main-content {
  margin-left: 80px;
}
</style>
