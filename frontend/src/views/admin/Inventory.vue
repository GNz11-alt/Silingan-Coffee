<template>
  <div class="inventory-content">
    <div class="branch-selector">
      <label>Managing inventory for:</label>
      <select v-model="selectedBranchId" class="branch-dropdown" @change="fetchInventory">
        <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
          {{ b.BranchName }}
        </option>
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
            <span class="item-stock">{{ item.stock }} remaining</span>
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

      <!-- Loading -->
      <div v-if="isLoading" class="text-center py-5">
        <div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
        <p class="mt-2 text-muted small">Loading inventory...</p>
      </div>

      <div v-else class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Status</th>
              <th>Price</th>
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
              <td>{{ item.stock }}</td>
              <td>{{ item.minStock }}</td>
              <td>
                <span :class="['status-badge', getStockStatus(item.stock, item.minStock)]">
                  {{ getStockStatusText(item.stock, item.minStock) }}
                </span>
              </td>
              <td>₱{{ Number(item.price).toLocaleString() }}</td>
              <td class="actions-cell">
                <button class="icon-btn edit" @click="editItem(item)" title="Edit">
                  <component :is="Edit2" :size="16" />
                </button>
                <button class="icon-btn delete" @click="confirmDelete(item)" title="Archive">
                  <component :is="Trash2" :size="16" />
                </button>
              </td>
            </tr>
            <tr v-if="!filteredItems.length">
              <td colspan="7" class="text-center text-muted py-4" style="font-size:13px">
                No products found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── ADD / EDIT MODAL ──────────────────────────────── -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" v-model="formData.name" placeholder="e.g. Arabica Coffee Beans" />
            <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="formData.category">
                <option value="">Select Category</option>
                <option value="Beverages">Beverages</option>
                <option value="Food">Food</option>
                <option value="Coffee">Coffee</option>
                <option value="Dairy">Dairy</option>
                <option value="Sweetener">Sweetener</option>
                <option value="Pastries">Pastries</option>
                <option value="Supplies">Supplies</option>
              </select>
              <span v-if="errors.category" class="field-error">{{ errors.category }}</span>
            </div>

            <div class="form-group">
              <label>Product Type</label>
              <select v-model="formData.productType">
                <option value="finished">Finished</option>
                <option value="raw">Raw Material</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Stock Quantity *</label>
              <input type="number" v-model="formData.stock" min="0" />
              <span v-if="errors.stock" class="field-error">{{ errors.stock }}</span>
            </div>

            <div class="form-group">
              <label>Min Stock Level *</label>
              <input type="number" v-model="formData.minStock" min="0" />
              <span v-if="errors.minStock" class="field-error">{{ errors.minStock }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>Selling Price (₱) *</label>
            <input type="number" v-model="formData.price" min="0" step="0.01" />
            <span v-if="errors.price" class="field-error">{{ errors.price }}</span>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="closeModal">Cancel</button>
            <button class="btn-primary" :disabled="saving" @click="saveItem">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEditing ? 'Update' : 'Add' }} Product
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── DELETE CONFIRM MODAL ──────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal" @click.self="showDeleteConfirm = false">
        <div class="modal-content" style="max-width:420px">
          <div class="modal-header">
            <h2>Archive Product</h2>
            <button class="close-btn" @click="showDeleteConfirm = false">×</button>
          </div>
          <div class="modal-body">
            <p style="font-size:14px;margin-bottom:8px">
              Are you sure you want to archive <strong>{{ deleteTarget?.name }}</strong>?
            </p>
            <p style="font-size:12px;color:#6c757d">
              This product will be archived and can be restored from the
              <strong>Backup &amp; Restore</strong> page.
            </p>
            <div class="modal-actions">
              <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
              <button class="btn-danger" :disabled="deleting" @click="archiveItem">
                <span v-if="deleting" class="spinner-border spinner-border-sm me-1"></span>
                Archive
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i :class="toast.type === 'success' ? 'bi bi-check-circle' : 'bi bi-exclamation-circle'" class="me-2"></i>
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  Plus, Package, AlertCircle, DollarSign, Layers,
  Search, Coffee, Edit2, Trash2, AlertTriangle
} from 'lucide-vue-next'
import { supabase } from '@/supabase.js'

// ── State ──────────────────────────────────────────────────
const isLoading  = ref(false)
const saving     = ref(false)
const deleting   = ref(false)
const branches   = ref([])
const selectedBranchId = ref(null)
const inventoryItems = ref([])
const searchQuery    = ref('')
const selectedCategory = ref('')
const showModal      = ref(false)
const isEditing      = ref(false)
const currentItemId  = ref(null)
const showDeleteConfirm = ref(false)
const deleteTarget   = ref(null)
const errors         = ref({})
const toast = ref({ show: false, message: '', type: 'success' })

const formData = ref({
  name: '', category: '', productType: 'finished',
  stock: 0, minStock: 10, price: 0,
})

// ── Computed ───────────────────────────────────────────────
const selectedBranchName = computed(() => {
  const b = branches.value.find(b => b.BranchId === selectedBranchId.value)
  return b ? b.BranchName : ''
})

const filteredItems = computed(() => {
  let items = inventoryItems.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(i => i.name.toLowerCase().includes(q))
  }
  if (selectedCategory.value) {
    items = items.filter(i => i.category === selectedCategory.value)
  }
  return items
})

const categories = computed(() =>
  [...new Set(inventoryItems.value.map(i => i.category).filter(Boolean))]
)

const lowStockItems = computed(() =>
  filteredItems.value.filter(i => i.stock <= i.minStock)
)

const lowStockCount = computed(() => lowStockItems.value.length)

const totalValue = computed(() =>
  filteredItems.value.reduce((sum, i) => sum + (i.stock * Number(i.price)), 0)
)

// ── Fetch ──────────────────────────────────────────────────
const fetchBranches = async () => {
  const { data } = await supabase.from('branch').select('BranchId, BranchName')
  if (data) {
    branches.value = data
    if (data.length) selectedBranchId.value = data[0].BranchId
  }
}

const fetchInventory = async () => {
  if (!selectedBranchId.value) return
  isLoading.value = true

  const { data, error } = await supabase
    .from('inventory')
    .select('InventoryId, Quantity, LowStockThreshold, Status, product(ProductId, ProductName, Category, Price, ProductType)')
    .eq('BranchId', selectedBranchId.value)
    .neq('Status', 'Archived')
    .order('InventoryId', { ascending: true })

  if (data) {
    inventoryItems.value = data.map(i => ({
      id: i.InventoryId,
      productId: i.product?.ProductId,
      name: i.product?.ProductName ?? '—',
      category: i.product?.Category ?? '—',
      productType: i.product?.ProductType ?? 'finished',
      price: i.product?.Price ?? 0,
      stock: i.Quantity ?? 0,
      minStock: i.LowStockThreshold ?? 10,
      status: i.Status,
    }))
  }

  if (error) showToast('Failed to load inventory.', 'error')
  isLoading.value = false
}

// ── Save (Add / Edit) ──────────────────────────────────────
const validate = () => {
  const e = {}
  if (!formData.value.name.trim()) e.name = 'Product name is required.'
  if (!formData.value.category)    e.category = 'Category is required.'
  if (formData.value.stock < 0)    e.stock = 'Stock cannot be negative.'
  if (formData.value.minStock < 0) e.minStock = 'Min stock cannot be negative.'
  if (!formData.value.price || formData.value.price <= 0) e.price = 'Price must be greater than 0.'
  errors.value = e
  return Object.keys(e).length === 0
}

const saveItem = async () => {
  if (!validate()) return
  saving.value = true

  if (isEditing.value) {
    // Update product name/category/price in product table
    const item = inventoryItems.value.find(i => i.id === currentItemId.value)
    if (item?.productId) {
      await supabase.from('product').update({
        ProductName: formData.value.name,
        Category: formData.value.category,
        ProductType: formData.value.productType,
        Price: formData.value.price,
      }).eq('ProductId', item.productId)
    }

    // Update quantity/threshold in inventory table
    const { error } = await supabase.from('inventory').update({
      Quantity: formData.value.stock,
      LowStockThreshold: formData.value.minStock,
    }).eq('InventoryId', currentItemId.value)

    if (error) showToast('Failed to update product.', 'error')
    else { showToast('Product updated successfully.', 'success'); await fetchInventory() }

  } else {
    // Insert new product row
    const { data: newProduct, error: productError } = await supabase
      .from('product')
      .insert([{
        ProductName: formData.value.name,
        Category: formData.value.category,
        ProductType: formData.value.productType,
        Price: formData.value.price,
        BranchId: selectedBranchId.value,
      }])
      .select('ProductId')
      .single()

    if (productError || !newProduct) {
      showToast('Failed to add product.', 'error')
      saving.value = false
      return
    }

    // Insert inventory row linked to new product
    const { error: invError } = await supabase.from('inventory').insert([{
      ProductId: newProduct.ProductId,
      BranchId: selectedBranchId.value,
      Quantity: formData.value.stock,
      LowStockThreshold: formData.value.minStock,
      Status: 'Active',
    }])

    if (invError) showToast('Failed to add inventory entry.', 'error')
    else { showToast('Product added successfully.', 'success'); await fetchInventory() }
  }

  saving.value = false
  closeModal()
}

// ── Archive (soft delete) ──────────────────────────────────
const confirmDelete = (item) => {
  deleteTarget.value = item
  showDeleteConfirm.value = true
}

const archiveItem = async () => {
  deleting.value = true
  const { error } = await supabase
    .from('inventory')
    .update({ Status: 'Archived' })
    .eq('InventoryId', deleteTarget.value.id)

  if (error) showToast('Failed to archive product.', 'error')
  else {
    showToast('Product archived. Restore it from Backup & Restore.', 'success')
    await fetchInventory()
  }

  deleting.value = false
  showDeleteConfirm.value = false
}

// ── Modal helpers ──────────────────────────────────────────
const openAddModal = () => {
  isEditing.value = false
  errors.value = {}
  formData.value = { name: '', category: '', productType: 'finished', stock: 0, minStock: 10, price: 0 }
  showModal.value = true
}

const editItem = (item) => {
  isEditing.value = true
  currentItemId.value = item.id
  errors.value = {}
  formData.value = {
    name: item.name, category: item.category, productType: item.productType,
    stock: item.stock, minStock: item.minStock, price: item.price,
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditing.value = false
  currentItemId.value = null
  errors.value = {}
}

// ── Helpers ────────────────────────────────────────────────
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

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

// Re-fetch when branch changes
watch(selectedBranchId, fetchInventory)

onMounted(async () => {
  await fetchBranches()
  await fetchInventory()
})
</script>

<style scoped>
.inventory-content { padding: 24px 32px; }

/* Branch Selector */
.branch-selector {
  background: white; padding: 16px 20px; border-radius: 12px;
  border: 1px solid #E9ECEF; margin-bottom: 24px;
  display: flex; align-items: center; gap: 12px;
}
.branch-selector label { font-size: 14px; font-weight: 500; color: #495057; }
.branch-dropdown {
  flex: 1; max-width: 400px; padding: 8px 12px;
  border: 1px solid #E9ECEF; border-radius: 8px;
  font-size: 14px; color: #212529; background: white; cursor: pointer;
}
.branch-dropdown:focus { outline: none; border-color: #8B4513; }

/* Stats Grid */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px; margin-bottom: 28px;
}
.stat-card {
  background: white; border-radius: 12px; padding: 20px;
  display: flex; align-items: center; gap: 16px;
  border: 1px solid #E9ECEF; transition: all 0.2s ease;
}
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.stat-card.warning { border-left: 4px solid #FFC107; }
.stat-icon { color: #8B4513; }
.stat-info h3 { font-size: 13px; color: #6C757D; margin-bottom: 6px; font-weight: 500; }
.stat-value { font-size: 28px; font-weight: 600; color: #212529; margin-bottom: 4px; }
.stat-label { font-size: 11px; color: #ADB5BD; }

/* Alert */
.alert-section {
  background: #FFF8E7; border: 1px solid #FFE4B5;
  border-radius: 12px; padding: 20px; margin-bottom: 28px;
}
.alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: #F57C00; }
.alert-header h3 { font-size: 16px; font-weight: 600; color: #F57C00; margin: 0; }
.alert-subtitle { font-size: 13px; color: #856404; margin-bottom: 16px; }
.low-stock-list { display: flex; flex-direction: column; gap: 12px; }
.low-stock-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px; background: white; border-radius: 8px; border-left: 3px solid #FFC107;
}
.item-details { display: flex; gap: 16px; align-items: center; }
.item-name { font-weight: 600; color: #212529; font-size: 14px; }
.item-stock { font-size: 13px; color: #6C757D; }
.low-stock-badge {
  background: #FFF3E0; color: #F57C00;
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
}

/* Inventory Section */
.inventory-section { background: white; border-radius: 12px; border: 1px solid #E9ECEF; overflow: hidden; }
.section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid #E9ECEF;
}
.section-header h2 { font-size: 18px; font-weight: 600; color: #212529; margin-bottom: 4px; }
.section-subtitle { font-size: 13px; color: #6C757D; }

.btn-primary {
  display: flex; align-items: center; gap: 8px;
  background: #8B4513; color: white; border: none;
  padding: 8px 16px; border-radius: 8px; cursor: pointer;
  font-size: 14px; font-weight: 500; transition: all 0.2s ease;
}
.btn-primary:hover { background: #A0522D; }
.btn-primary:disabled { opacity: .65; cursor: not-allowed; }

.filters-bar { display: flex; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #F1F3F5; }
.search-box {
  flex: 1; display: flex; align-items: center; gap: 8px;
  border: 1px solid #E9ECEF; border-radius: 8px; padding: 8px 12px;
}
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid #E9ECEF; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }

/* Table */
.table-container { overflow-x: auto; }
.inventory-table { width: 100%; border-collapse: collapse; }
.inventory-table th {
  text-align: left; padding: 14px 16px; background: #F8F9FA;
  color: #495057; font-weight: 600; font-size: 13px; border-bottom: 1px solid #E9ECEF;
}
.inventory-table td { padding: 14px 16px; border-bottom: 1px solid #F1F3F5; font-size: 14px; }
.inventory-table tr:last-child td { border-bottom: none; }
.inventory-table tr:hover td { background: #fafafa; }
.product-name { font-weight: 500; }
.product-info { display: flex; align-items: center; gap: 8px; }
.product-icon { color: #8B4513; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-badge.good { background: #E8F5E9; color: #2E7D32; }
.status-badge.low  { background: #FFF3E0; color: #F57C00; }
.status-badge.out  { background: #FFEBEE; color: #C62828; }

.actions-cell { display: flex; gap: 8px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s ease; }
.icon-btn.edit { color: #8B4513; }
.icon-btn.edit:hover { background: #FFF4E6; }
.icon-btn.delete { color: #DC3545; }
.icon-btn.delete:hover { background: #FFEBEE; }

/* Modal */
.modal {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal-content {
  background: white; border-radius: 12px;
  width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px; border-bottom: 1px solid #E9ECEF;
}
.modal-header h2 { font-size: 20px; font-weight: 600; color: #212529; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6C757D; }
.close-btn:hover { color: #212529; }
.modal-body { padding: 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #495057; }
.form-group input,
.form-group select {
  width: 100%; padding: 10px; border: 1px solid #E9ECEF;
  border-radius: 6px; font-size: 14px; outline: none; box-sizing: border-box;
}
.form-group input:focus,
.form-group select:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-error { font-size: 12px; color: #dc3545; margin-top: 4px; display: block; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E9ECEF; }
.btn-secondary {
  background: #F8F9FA; border: 1px solid #E9ECEF;
  padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;
}
.btn-secondary:hover { background: #E9ECEF; }
.btn-danger {
  background: #dc3545; color: white; border: none;
  padding: 8px 16px; border-radius: 6px; cursor: pointer;
  font-size: 14px; font-weight: 500; display: inline-flex; align-items: center;
}
.btn-danger:hover:not(:disabled) { background: #b02a37; }
.btn-danger:disabled { opacity: .65; cursor: not-allowed; }

/* Toast */
.toast-wrap {
  position: fixed; bottom: 24px; right: 24px;
  padding: 11px 18px; border-radius: 8px; font-size: 13px; font-weight: 500;
  display: flex; align-items: center; box-shadow: 0 4px 16px rgba(0,0,0,.12);
  z-index: 9999; animation: slideUp .2s ease;
}
.toast-wrap.success { background: #d1e7dd; color: #0a3622; }
.toast-wrap.error   { background: #f8d7da; color: #58151c; }
@keyframes slideUp {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@media (max-width: 768px) {
  .inventory-content { padding: 16px; }
  .form-row { grid-template-columns: 1fr; }
  .branch-selector { flex-direction: column; align-items: flex-start; }
  .branch-dropdown { max-width: 100%; width: 100%; }
  .filters-bar { flex-direction: column; }
  .stats-grid { grid-template-columns: 1fr; }
}
</style>