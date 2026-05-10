<template>
  <div class="inventory-content">
    <div class="branch-selector">
      <label>Managing inventory for:</label>
      <select v-model="selectedBranch" class="branch-dropdown">
        <option value="DLSU">Silingan DLSU - De La Salle University, Taft</option>
        <option value="Ateneo">Silingan Ateneo - Katipunan, Quezon City</option>
        <option value="Batangas">Silingan Batangas - Batangas City</option>
        <option value="Lipa">Silingan Lipa - Lipa City</option>
        <option value="Cubao Expo">Silingan Cubao Expo - Cubao, Quezon City</option>
      </select>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Package" :size="28" />
        </div>
        <div class="stat-info">
          <h3>Total Products</h3>
          <p class="stat-value">{{ filteredItems.length }}</p>
          <span class="stat-label">items in inventory</span>
        </div>
      </div>

      <div class="stat-card warning">
        <div class="stat-icon">
          <component :is="AlertCircle" :size="28" />
        </div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ lowStockCount }}</p>
          <span class="stat-label">need restocking</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="DollarSign" :size="28" />
        </div>
        <div class="stat-info">
          <h3>Total Value</h3>
          <p class="stat-value">₱{{ totalValue.toLocaleString() }}</p>
          <span class="stat-label">inventory value</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Layers" :size="28" />
        </div>
        <div class="stat-info">
          <h3>Categories</h3>
          <p class="stat-value">{{ categories.length }}</p>
          <span class="stat-label">product categories</span>
        </div>
      </div>
    </div>

    <div v-if="lowStockItems.length > 0" class="alert-section">
      <div class="alert-header">
        <component :is="AlertTriangle" :size="20" />
        <h3>Low Stock Alert</h3>
      </div>
      <p class="alert-subtitle">The following items need restocking:</p>
      <div class="low-stock-list">
        <div v-for="item in lowStockItems" :key="item.id" class="low-stock-item">
          <div class="item-details">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-stock">{{ item.stock }} {{ item.unit }} remaining</span>
          </div>
          <span class="low-stock-badge">Low Stock</span>
        </div>
      </div>
    </div>

    <div class="inventory-section">
      <div class="section-header">
        <div>
          <h2>Product Inventory</h2>
          <p class="section-subtitle">Product inventory for {{ selectedBranchName }}</p>
        </div>
        <button class="btn-primary" @click="openAddModal">
          <component :is="Plus" :size="18" />
          Add Product
        </button>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <component :is="Search" :size="18" />
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search products..."
          />
        </div>
        <select v-model="selectedCategory" class="filter-select">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td class="product-name">
                <div class="product-info">
                  <component :is="Coffee" :size="16" class="product-icon" />
                  <strong>{{ item.name }}</strong>
                </div>
              </td>
              <td>{{ item.category }}</td>
              <td>{{ item.stock }} {{ item.unit }}</td>
              <td>{{ item.minStock }} {{ item.unit }}</td>
              <td>
                <span :class="['status-badge', getStockStatus(item.stock, item.minStock)]">
                  {{ getStockStatusText(item.stock, item.minStock) }}
                </span>
              </td>
              <td>₱{{ item.price.toLocaleString() }}</td>
              <td>₱{{ item.cost.toLocaleString() }}</td>
              <td class="value-cell">₱{{ (item.stock * item.cost).toLocaleString() }}</td>
              <td class="actions-cell">
                <button class="icon-btn edit" @click="editItem(item)" title="Edit">
                  <component :is="Edit2" :size="16" />
                </button>
                <button class="icon-btn delete" @click="deleteItem(item.id)" title="Delete">
                  <component :is="Trash2" :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <form @submit.prevent="saveItem">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" v-model="formData.name" required />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="formData.category" required>
                <option value="">Select Category</option>
                <option value="Coffee">Coffee</option>
                <option value="Dairy">Dairy</option>
                <option value="Sweetener">Sweetener</option>
                <option value="Pastries">Pastries</option>
                <option value="Supplies">Supplies</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Unit *</label>
              <select v-model="formData.unit" required>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="pcs">pcs</option>
                <option value="liters">liters</option>
                <option value="bags">bags</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Stock Quantity *</label>
              <input type="number" v-model="formData.stock" required min="0" />
            </div>
            
            <div class="form-group">
              <label>Minimum Stock Level *</label>
              <input type="number" v-model="formData.minStock" required min="0" />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Selling Price (₱) *</label>
              <input type="number" v-model="formData.price" required min="0" step="0.01" />
            </div>
            
            <div class="form-group">
              <label>Cost Price (₱) *</label>
              <input type="number" v-model="formData.cost" required min="0" step="0.01" />
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn-primary">{{ isEditing ? 'Update' : 'Add' }} Product</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Plus, 
  Package, 
  AlertCircle, 
  DollarSign, 
  Layers,
  Search, 
  Coffee, 
  Edit2, 
  Trash2,
  AlertTriangle
} from 'lucide-vue-next'

const selectedBranch = ref('DLSU')

const selectedBranchName = computed(() => {
  const branches = {
    DLSU: 'Silingan DLSU',
    Ateneo: 'Silingan Ateneo',
    Batangas: 'Silingan Batangas',
    Lipa: 'Silingan Lipa',
    'Cubao Expo': 'Silingan Cubao Expo'
  }
  return branches[selectedBranch.value] || selectedBranch.value
})

// Inventory data
const inventoryItems = ref([
  {
    id: 1,
    name: 'Arabica Coffee Beans',
    category: 'Coffee',
    branch: 'DLSU',
    stock: 25,
    unit: 'kg',
    minStock: 10,
    price: 180,
    cost: 120
  },
  {
    id: 2,
    name: 'Robusta Coffee Beans',
    category: 'Coffee',
    branch: 'DLSU',
    stock: 8,
    unit: 'kg',
    minStock: 15,
    price: 150,
    cost: 100
  },
  {
    id: 3,
    name: 'Whole Milk',
    category: 'Dairy',
    branch: 'DLSU',
    stock: 30,
    unit: 'liters',
    minStock: 5,
    price: 80,
    cost: 60
  },
  {
    id: 4,
    name: 'Sugar',
    category: 'Sweetener',
    branch: 'DLSU',
    stock: 50,
    unit: 'kg',
    minStock: 20,
    price: 45,
    cost: 30
  },
  {
    id: 5,
    name: 'Paper Cups (16oz)',
    category: 'Supplies',
    branch: 'DLSU',
    stock: 5,
    unit: 'pcs',
    minStock: 50,
    price: 15,
    cost: 8
  },
  {
    id: 6,
    name: 'Vanilla Syrup',
    category: 'Sweetener',
    branch: 'DLSU',
    stock: 12,
    unit: 'liters',
    minStock: 8,
    price: 450,
    cost: 350
  }
])

const searchQuery = ref('')
const selectedCategory = ref('')
const showModal = ref(false)
const isEditing = ref(false)
const currentItemId = ref(null)

const formData = ref({
  name: '',
  category: '',
  stock: 0,
  unit: 'kg',
  minStock: 0,
  price: 0,
  cost: 0
})

// Computed properties
const filteredItems = computed(() => {
  let items = inventoryItems.value.filter(item => item.branch === selectedBranch.value)
  
  if (searchQuery.value) {
    items = items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
  
  if (selectedCategory.value) {
    items = items.filter(item => item.category === selectedCategory.value)
  }
  
  return items
})

const categories = computed(() => {
  const branchItems = inventoryItems.value.filter(item => item.branch === selectedBranch.value)
  return [...new Set(branchItems.map(item => item.category))]
})

const lowStockItems = computed(() => {
  return filteredItems.value.filter(item => item.stock <= item.minStock)
})

const lowStockCount = computed(() => lowStockItems.value.length)

const totalValue = computed(() => {
  return filteredItems.value.reduce((total, item) => total + (item.stock * item.cost), 0)
})

// Methods
const getStockStatus = (stock, minStock) => {
  if (stock <= 0) return 'out'
  if (stock <= minStock) return 'low'
  return 'good'
}

const getStockStatusText = (stock, minStock) => {
  if (stock <= 0) return 'Out of Stock'
  if (stock <= minStock) return 'Low Stock'
  return 'In Stock'
}

const openAddModal = () => {
  isEditing.value = false
  formData.value = {
    name: '',
    category: '',
    stock: 0,
    unit: 'kg',
    minStock: 0,
    price: 0,
    cost: 0
  }
  showModal.value = true
}

const editItem = (item) => {
  isEditing.value = true
  currentItemId.value = item.id
  formData.value = { ...item }
  showModal.value = true
}

const saveItem = () => {
  if (isEditing.value) {
    const index = inventoryItems.value.findIndex(item => item.id === currentItemId.value)
    if (index !== -1) {
      inventoryItems.value[index] = { ...formData.value, id: currentItemId.value, branch: selectedBranch.value }
    }
  } else {
    const newId = Math.max(...inventoryItems.value.map(item => item.id), 0) + 1
    inventoryItems.value.push({ ...formData.value, id: newId, branch: selectedBranch.value })
  }
  closeModal()
}

const deleteItem = (id) => {
  if (confirm('Are you sure you want to delete this product?')) {
    inventoryItems.value = inventoryItems.value.filter(item => item.id !== id)
  }
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
  currentItemId.value = null
}
</script>

<style scoped>
.inventory-content {
  padding: 24px 32px;
}

/* Branch Selector */
.branch-selector {
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid #E9ECEF;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.branch-selector label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.branch-dropdown {
  flex: 1;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #E9ECEF;
  border-radius: 8px;
  font-size: 14px;
  color: #212529;
  background: white;
  cursor: pointer;
}

.branch-dropdown:focus {
  outline: none;
  border-color: #8B4513;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: white;
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

.stat-card.warning {
  border-left: 4px solid #FFC107;
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
  font-size: 28px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #ADB5BD;
}

/* Alert Section */
.alert-section {
  background: #FFF8E7;
  border: 1px solid #FFE4B5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: #F57C00;
}

.alert-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #F57C00;
  margin: 0;
}

.alert-subtitle {
  font-size: 13px;
  color: #856404;
  margin-bottom: 16px;
}

.low-stock-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.low-stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid #FFC107;
}

.item-details {
  display: flex;
  gap: 16px;
  align-items: center;
}

.item-name {
  font-weight: 600;
  color: #212529;
  font-size: 14px;
}

.item-stock {
  font-size: 13px;
  color: #6C757D;
}

.low-stock-badge {
  background: #FFF3E0;
  color: #F57C00;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* Inventory Section */
.inventory-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #E9ECEF;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #E9ECEF;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 13px;
  color: #6C757D;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #8B4513;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #A0522D;
  transform: translateY(-2px);
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #F1F3F5;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #E9ECEF;
  border-radius: 8px;
  padding: 8px 12px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #E9ECEF;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
}

.inventory-table th {
  text-align: left;
  padding: 14px 16px;
  background: #F8F9FA;
  color: #495057;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #E9ECEF;
}

.inventory-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #F1F3F5;
  font-size: 14px;
}

.product-name {
  font-weight: 500;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-icon {
  color: #8B4513;
}

.value-cell {
  font-weight: 500;
  color: #28A745;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.good {
  background: #E8F5E9;
  color: #2E7D32;
}

.status-badge.low {
  background: #FFF3E0;
  color: #F57C00;
}

.status-badge.out {
  background: #FFEBEE;
  color: #C62828;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.icon-btn.edit {
  color: #8B4513;
}

.icon-btn.edit:hover {
  background: #FFF4E6;
}

.icon-btn.delete {
  color: #DC3545;
}

.icon-btn.delete:hover {
  background: #FFEBEE;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #E9ECEF;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #212529;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6C757D;
}

.close-btn:hover {
  color: #212529;
}

form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #E9ECEF;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #8B4513;
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #E9ECEF;
}

.btn-secondary {
  background: #F8F9FA;
  border: 1px solid #E9ECEF;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #E9ECEF;
}

/* Responsive */
@media (max-width: 768px) {
  .inventory-content {
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .branch-selector {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .branch-dropdown {
    max-width: 100%;
    width: 100%;
  }
  
  .filters-bar {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>