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
        <a href="#" class="nav-item active">
          <component :is="Home" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Dashboard</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Package" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Inventory</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="BarChart3" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Sales</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Users" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Employees</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Calendar" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Schedule</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Coffee" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Menu & Pricing</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="FileText" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Reports & Analytics</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Database" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Backup & Restore</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Search" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Search</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Settings" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Maintenance</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="HelpCircle" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">Help</span>
        </a>
        <a href="#" class="nav-item">
          <component :is="Info" class="nav-icon" :size="20" />
          <span v-show="!isSidebarCollapsed">About</span>
        </a>
      </nav>

      <div class="sidebar-bottom">
        <button class="nav-item notification-btn">
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
      <div class="welcome-header">
        <h1>Dashboard</h1>
        <p class="welcome-message">Welcome back, Admin!</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <component :is="DollarSign" :size="28" stroke-width="1.5" />
          </div>
          <div class="stat-info">
            <h3>Network Revenue</h3>
            <p class="stat-value">₱186,750</p>
            <span class="stat-trend positive">+20.1% from yesterday</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <component :is="ShoppingBag" :size="28" stroke-width="1.5" />
          </div>
          <div class="stat-info">
            <h3>Total Orders</h3>
            <p class="stat-value">147</p>
            <span class="stat-trend positive">+18% from yesterday</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <component :is="Building" :size="28" stroke-width="1.5" />
          </div>
          <div class="stat-info">
            <h3>Active Branches</h3>
            <p class="stat-value">5/5</p>
            <span class="stat-trend">locations operating</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">
            <component :is="AlertCircle" :size="28" stroke-width="1.5" />
          </div>
          <div class="stat-info">
            <h3>Low Stock Items</h3>
            <p class="stat-value">8</p>
            <span class="stat-trend warning">across all branches</span>
          </div>
        </div>

        <div class="stat-card growth-card">
          <div class="stat-icon">
            <component :is="TrendingUp" :size="28" stroke-width="1.5" />
          </div>
          <div class="stat-info">
            <h3>Growth</h3>
            <p class="stat-value">+12%</p>
            <span class="stat-trend">This month vs last month</span>
          </div>
        </div>
      </div>

      <div class="branch-section">
        <h2>Branch Performance Summary</h2>
        <p class="section-subtitle">Today's performance across all locations</p>
        
        <div class="branch-grid">
          <div class="branch-card" v-for="branch in branches" :key="branch.name">
            <div class="branch-info">
              <h4>{{ branch.name }}</h4>
              <p class="branch-revenue">{{ branch.revenue }}</p>
              <p class="branch-orders">{{ branch.orders }} orders</p>
              <span :class="['branch-status', branch.status]">{{ branch.statusText }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-section">
        <div class="recent-orders">
          <h2>Recent Orders</h2>
          <p class="section-subtitle">Latest transactions across all branches</p>
          
          <div class="orders-list">
            <div class="order-item" v-for="order in recentOrders" :key="order.id">
              <div class="order-info">
                <span class="order-id">{{ order.id }}</span>
                <span class="order-time">{{ order.time }}</span>
                <span class="order-items">{{ order.items }}</span>
              </div>
              <div class="order-amount">{{ order.amount }}</div>
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <h2>Quick Actions</h2>
          <p class="section-subtitle">Common tasks</p>
          
          <div class="actions-list">
            <button class="action-item" v-for="action in quickActions" :key="action.text">
              <component :is="action.icon" :size="18" />
              <span>{{ action.text }}</span>
            </button>
          </div>
        </div>
      </div>
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
  DollarSign,
  ShoppingBag,
  Building,
  AlertCircle,
  TrendingUp,
  Plus,
  RefreshCw,
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

const router = useRouter()
const isSidebarCollapsed = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const branches = [
  { name: 'Silingan DLSU', revenue: '₱52,300', orders: 32, status: 'good', statusText: 'Good' },
  { name: 'Silingan Ateneo', revenue: '₱41,200', orders: 38, status: 'good', statusText: 'Good' },
  { name: 'Silingan Batangas', revenue: '₱38,900', orders: 28, status: 'warning', statusText: 'Low Stock' },
  { name: 'Silingan Lipa', revenue: '₱35,600', orders: 31, status: 'good', statusText: 'Good' },
  { name: 'Silingan Cubao Expo', revenue: '₱35,600', orders: 25, status: 'good', statusText: 'Good' }
]

const recentOrders = [
  { id: '#001', time: '10:30 AM', items: 'Americano, Croissant', amount: '₱270' },
  { id: '#002', time: '10:45 AM', items: 'Cappuccino x2, Muffin', amount: '₱450' },
  { id: '#003', time: '11:00 AM', items: 'Latte, Sandwich', amount: '₱380' },
  { id: '#004', time: '11:15 AM', items: 'Espresso, Cookie', amount: '₱250' }
]

const quickActions = [
  { icon: Plus, text: 'Add New Product' },
  { icon: Package, text: 'Add items to inventory' },
  { icon: DollarSign, text: 'Process Sale' },
  { icon: RefreshCw, text: 'Update Stock' }
]

const logout = () => {
  localStorage.removeItem('isLoggedIn')
  localStorage.removeItem('username')
  router.push('/login')
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
  padding: 24px 32px;
  transition: margin-left 0.3s ease;
}

.dashboard.sidebar-collapsed .main-content {
  margin-left: 80px;
}

.welcome-header {
  margin-bottom: 28px;
}

.welcome-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.welcome-message {
  font-size: 14px;
  color: #6C757D;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #E9ECEF;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.stat-icon {
  color: #8B4513;
}

.stat-info h3 {
  font-size: 13px;
  color: #6C757D;
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
  color: #ADB5BD;
}

.stat-trend.positive {
  color: #28A745;
}

.stat-trend.warning {
  color: #FFC107;
}

.growth-card {
  background: linear-gradient(135deg, #8B4513, #A0522D);
  border: none;
}

.growth-card .stat-icon,
.growth-card .stat-value,
.growth-card .stat-info h3,
.growth-card .stat-trend {
  color: #FFFFFF;
}

/* Branch Section */
.branch-section {
  margin-bottom: 32px;
}

.branch-section h2 {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 6px;
}

.section-subtitle {
  font-size: 13px;
  color: #6C757D;
  margin-bottom: 20px;
}

.branch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.branch-card {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #E9ECEF;
  transition: all 0.2s ease;
}

.branch-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.branch-info h4 {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 8px;
}

.branch-revenue {
  font-size: 18px;
  font-weight: 600;
  color: #8B4513;
  margin-bottom: 4px;
}

.branch-orders {
  font-size: 13px;
  color: #6C757D;
  margin-bottom: 8px;
}

.branch-status {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.branch-status.good {
  background: #E8F5E9;
  color: #2E7D32;
}

.branch-status.warning {
  background: #FFF3E0;
  color: #F57C00;
}

/* Bottom Section */
.bottom-section {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 24px;
}

.recent-orders,
.quick-actions {
  background: #FFFFFF;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #E9ECEF;
}

.recent-orders h2,
.quick-actions h2 {
  font-size: 16px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.orders-list {
  margin-top: 20px;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #F1F3F5;
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
  color: #8B4513;
  min-width: 45px;
}

.order-time {
  color: #ADB5BD;
  min-width: 70px;
}

.order-items {
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
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #495057;
  transition: all 0.2s ease;
  text-align: left;
}

.action-item:hover {
  background: #FFF4E6;
  border-color: #8B4513;
  color: #8B4513;
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

@media (max-width: 768px) {
  .bottom-section {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .main-content {
    padding: 20px;
  }
}
</style>