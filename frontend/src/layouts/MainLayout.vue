<template>
  <div class="dashboard" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <!-- Sidebar - Copied from Dashboard.vue -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <!-- Toggle Button -->
        <button class="toggle-btn" @click="toggleSidebar">
          <component :is="isSidebarCollapsed ? ChevronRight : ChevronLeft" :size="20" />
        </button>

        <!-- Brand Section -->
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

      <!-- Navigation Menu -->
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

      <!-- Bottom Section: Notifications & Logout -->
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

    <!-- Main Content - This is where your pages will load -->
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

/* Sidebar */
.sidebar {
  width: 280px;
  background: #FFFFFF;
  border-right: 1px solid #E9ECEF;
  position: fixed;
  height: 100vh;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  overflow-y: auto;
  z-index: 100;
}

.dashboard.sidebar-collapsed .sidebar {
  width: 80px;
}

.sidebar-top {
  padding: 20px;
  border-bottom: 1px solid #E9ECEF;
  position: relative;
}

.toggle-btn {
  position: absolute;
  right: -12px;
  top: 28px;
  background: #FFFFFF;
  border: 1px solid #E9ECEF;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #8B4513;
  transition: all 0.2s ease;
  z-index: 10;
}

.toggle-btn:hover {
  background: #8B4513;
  color: white;
  border-color: #8B4513;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-wrapper {
  flex-shrink: 0;
}

.logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.brand-text h2 {
  font-size: 18px;
  font-weight: 600;
  color: #8B4513;
  margin: 0;
  line-height: 1.3;
}

.user-role {
  font-size: 12px;
  color: #6C757D;
  margin-top: 2px;
}

.dashboard.sidebar-collapsed .brand-text {
  display: none;
}

.dashboard.sidebar-collapsed .brand-section {
  justify-content: center;
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  color: #495057;
  text-decoration: none;
  transition: all 0.2s ease;
  gap: 12px;
  font-size: 14px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: #F8F9FA;
  color: #8B4513;
}

.nav-item.active {
  background: #FFF4E6;
  color: #8B4513;
  border-right: 3px solid #8B4513;
}

.nav-icon {
  stroke-width: 1.5;
  flex-shrink: 0;
}

.dashboard.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.dashboard.sidebar-collapsed .nav-item span {
  display: none;
}

/* Sidebar Bottom */
.sidebar-bottom {
  padding: 16px 0;
  border-top: 1px solid #E9ECEF;
}

.notification-btn {
  position: relative;
}

.notification-badge {
  position: absolute;
  right: 20px;
  background: #DC3545;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.dashboard.sidebar-collapsed .notification-badge {
  display: none;
}

.logout-btn {
  color: #DC3545;
}

.logout-btn:hover {
  background: #FFF5F5;
  color: #DC3545;
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

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 80px;
  }
  
  .brand-text,
  .nav-item span {
    display: none;
  }
  
  .main-content {
    margin-left: 80px;
  }
  
  .nav-item {
    justify-content: center;
    padding: 12px;
  }
  
  .notification-badge {
    display: none;
  }
}
</style>