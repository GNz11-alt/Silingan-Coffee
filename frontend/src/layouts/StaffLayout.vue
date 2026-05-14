<template>
  <div class="dashboard" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <aside class="sidebar">
      <div class="sidebar-top">
        <button class="toggle-btn" @click="toggleSidebar">
          <component :is="isSidebarCollapsed ? ChevronRight : ChevronLeft" :size="20" />
        </button>

        <div class="brand-section">
          <div class="logo-wrapper">
            <img src="@/assets/images/logo.png" alt="Silingan Coffee" class="logo" />
          </div>
          <div class="brand-text" v-show="!isSidebarCollapsed">
            <h2>Silingan Coffee</h2>
            <p class="user-role">Staff</p>
            <p class="user-branch">{{ branch }}</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/staff/dashboard" class="nav-item" :class="{ active: $route.path === '/staff/dashboard' }">
          <component :is="Home" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Dashboard</span>
        </router-link>

        <router-link to="/staff/pos" class="nav-item" :class="{ active: $route.path === '/staff/pos' }">
          <component :is="ShoppingCart" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Point of Sale</span>
        </router-link>

        <router-link to="/staff/inventory" class="nav-item" :class="{ active: $route.path === '/staff/inventory' }">
          <component :is="Package" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Inventory</span>
        </router-link>

        <router-link to="/staff/schedule" class="nav-item" :class="{ active: $route.path === '/staff/schedule' }">
          <component :is="Calendar" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">My Schedule</span>
        </router-link>

        <router-link to="/staff/menu" class="nav-item" :class="{ active: $route.path === '/staff/menu' }">
          <component :is="Coffee" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Menu & Pricing</span>
        </router-link>

        <router-link to="/staff/help" class="nav-item" :class="{ active: $route.path === '/staff/help' }">
          <component :is="HelpCircle" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Help</span>
        </router-link>
      </nav>

      <div class="sidebar-bottom">
        <button class="nav-item notification-btn" @click="showNotifications">
          <component :is="Bell" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Notifications</span>
          <span class="notification-badge" v-if="!isSidebarCollapsed">3</span>
        </button>

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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Home, Package, Calendar, Coffee, ShoppingCart,
  HelpCircle, LogOut, Bell, ChevronLeft, ChevronRight
} from 'lucide-vue-next'

const router = useRouter()
const isSidebarCollapsed = ref(false)
const branch = ref(localStorage.getItem('branch') || '')

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  localStorage.setItem('sidebarCollapsed', isSidebarCollapsed.value)
}

const showNotifications = () => {
  alert('You have 3 new notifications')
}

const logout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  localStorage.removeItem('role')
  localStorage.removeItem('branch')
  localStorage.removeItem('userId')
  router.push('/login')
}

const savedState = localStorage.getItem('sidebarCollapsed')
if (savedState !== null) {
  isSidebarCollapsed.value = savedState === 'true'
}
</script>

<style scoped>
* { margin: 0; padding: 0; box-sizing: border-box; }

.dashboard {
  display: flex;
  min-height: 100vh;
  background: #F8F9FA;
}

.sidebar {
  width: 280px;
  background: #31201D;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-y: auto;
  z-index: 100;
  color: white;
}

.dashboard.sidebar-collapsed .sidebar { width: 80px; }

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
  color: #FFFFFF;
  transition: all 0.2s ease;
  z-index: 10;
}

.brand-section { display: flex; flex-direction: column; gap: 15px; }

.logo { width: 32px; height: 32px; filter: invert(1); }

.brand-text h2 { font-size: 18px; font-weight: 500; color: #FFFFFF; margin: 0; }

.user-role { font-size: 14px; color: #A69794; margin-top: 2px; }

.user-branch { font-size: 12px; color: #C49A6C; margin-top: 2px; text-transform: capitalize; }

.sidebar-nav { flex: 1; padding: 10px 12px; }

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #FFFFFF;
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

.nav-item:hover { background: rgba(255, 255, 255, 0.05); }

.nav-item.active {
  background: #C49A6C;
  color: #2D1B18;
  font-weight: 500;
}

.nav-icon { stroke-width: 1.8; flex-shrink: 0; }

.sidebar-bottom {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.notification-btn { position: relative; }

.notification-badge {
  background: #E5533D;
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

.logout-btn { margin-top: 10px; }

.main-content { flex: 1; margin-left: 280px; transition: margin-left 0.3s ease; }

.dashboard.sidebar-collapsed .main-content { margin-left: 80px; }
</style>