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
            <p class="user-role">Administrator</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/dashboard" class="nav-item" :class="{ active: $route.path === '/dashboard' }">
          <component :is="Home" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Dashboard</span>
        </router-link>
        
        <router-link to="/inventory" class="nav-item" :class="{ active: $route.path === '/inventory' }">
          <component :is="Package" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Inventory</span>
        </router-link>
        
        <router-link to="/sales" class="nav-item" :class="{ active: $route.path === '/sales' }">
          <component :is="BarChart3" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Sales</span>
        </router-link>
        
        <router-link to="/employees" class="nav-item" :class="{ active: $route.path === '/employees' }">
          <component :is="Users" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Employees</span>
        </router-link>
        
        <router-link to="/schedule" class="nav-item" :class="{ active: $route.path === '/schedule' }">
          <component :is="Calendar" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Schedule</span>
        </router-link>
        
        <router-link to="/menu-pricing" class="nav-item" :class="{ active: $route.path === '/menu-pricing' }">
          <component :is="Coffee" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Menu & Pricing</span>
        </router-link>
        
        <router-link to="/reports" class="nav-item" :class="{ active: $route.path === '/reports' }">
          <component :is="FileText" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Reports & Analytics</span>
        </router-link>
        
        <router-link to="/backup" class="nav-item" :class="{ active: $route.path === '/backup' }">
          <component :is="Database" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Backup & Restore</span>
        </router-link>
        
        <router-link to="/search" class="nav-item" :class="{ active: $route.path === '/search' }">
          <component :is="Search" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Search</span>
        </router-link>
        
        <router-link to="/maintenance" class="nav-item" :class="{ active: $route.path === '/maintenance' }">
          <component :is="Settings" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Maintenance</span>
        </router-link>
        
        <router-link to="/help" class="nav-item" :class="{ active: $route.path === '/help' }">
          <component :is="HelpCircle" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Help</span>
        </router-link>
        
        <router-link to="/about" class="nav-item" :class="{ active: $route.path === '/about' }">
          <component :is="Info" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">About</span>
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
  Home,
  Package,
  BarChart3,
  Users,
  Calendar,
  Coffee,
  FileText,
  Database,
  Search,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

const router = useRouter()
const isSidebarCollapsed = ref(false)

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
  router.push('/login')
}

// Load saved sidebar state
const savedState = localStorage.getItem('sidebarCollapsed')
if (savedState !== null) {
  isSidebarCollapsed.value = savedState === 'true'
}
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
  background: #F8F9FA;
}

/* Sidebar - Updated to Deep Brown */
.sidebar {
  width: 280px;
  background: #31201D; /* Dark coffee brown from image */
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
  color: #FFFFFF;
  transition: all 0.2s ease;
  z-index: 10;
}

.brand-section {
  display: flex;
  flex-direction: column; /* Stacked layout like image */
  gap: 15px;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  filter: invert(1); /* Makes black logo white if needed */
}

.brand-text h2 {
  font-size: 18px;
  font-weight: 500;
  color: #FFFFFF;
  margin: 0;
}

.user-info {
  margin-top: 10px;
}

.user-name {
  font-size: 18px;
  font-weight: 500;
  color: white;
  display: block;
}

.user-role {
  font-size: 14px;
  color: #A69794; /* Muted grey/brown */
  margin-top: 2px;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 10px 12px; /* Spacing for the active background rounded corners */
}

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
  border-radius: 8px; /* Rounded highlight like image */
  margin-bottom: 4px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* Active State - Gold/Tan Highlight */
.nav-item.active {
  background: #C49A6C; /* Gold/Tan color from image */
  color: #2D1B18; /* Dark text for contrast on gold */
  font-weight: 500;
}

.nav-icon {
  stroke-width: 1.8;
  flex-shrink: 0;
}

/* Sidebar Bottom */
.sidebar-bottom {
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.notification-btn {
  position: relative;
}

.notification-badge {
  background: #E5533D; /* Muted red from image */
  color: white;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: bold;
  margin-left: auto; /* Push to right */
}

.logout-btn {
  margin-top: 10px;
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 280px;
  transition: margin-left 0.3s ease;
}

.dashboard.sidebar-collapsed .main-content {
  margin-left: 80px;
}
</style>