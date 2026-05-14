<template>
  <div class="inventory-content">

    <!-- Branch Selector -->
    <div class="branch-selector">
      <label>Managing inventory for:</label>
      <select v-model="selectedBranchId" class="branch-dropdown">
        <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
          {{ b.BranchName }}
        </option>
      </select>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><component :is="Package" :size="28" /></div>
        <div class="stat-info">
          <h3>Total Products</h3>
          <p class="stat-value">{{ filteredItems.length }}</p>
          <span class="stat-label">items in inventory</span>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon"><component :is="AlertCircle" :size="28" /></div>
        <div class="stat-info">
          <h3>Low Stock Items</h3>
          <p class="stat-value">{{ lowStockCount }}</p>
          <span class="stat-label">need restocking</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><component :is="DollarSign" :size="28" /></div>
        <div class="stat-info">
          <h3>Total Value</h3>
          <p class="stat-value">₱{{ totalValue.toLocaleString() }}</p>
          <span class="stat-label">inventory value</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><component :is="Layers" :size="28" /></div>
        <div class="stat-info">
          <h3>Categories</h3>
          <p class="stat-value">{{ categories.length }}</p>
          <span class="stat-label">product categories</span>
        </div>
      </div>
    </div>

    <!-- Low Stock Alert -->
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
            <span class="item-stock">{{ item.stock }} remaining (min: {{ item.minStock }})</span>
          </div>
          <span class="low-stock-badge">Low Stock</span>
        </div>
      </div>
    </div>

    <!-- Tabs: Finished Products / Raw Materials -->
    <div class="tabs-row">
      <button :class="['tab-btn', activeTab === 'finished' ? 'active' : '']"
        @click="activeTab = 'finished'">
        <component :is="Coffee" :size="14" /> Finished Products
      </button>
      <button :class="['tab-btn', activeTab === 'raw' ? 'active' : '']"
        @click="activeTab = 'raw'">
        <component :is="Package" :size="14" /> Raw Materials
      </button>
    </div>

    <!-- FINISHED PRODUCTS (inventory → product) -->
    <div v-if="activeTab === 'finished'" class="inventory-section">
      <div class="section-header">
        <div>
          <h2>Product Inventory</h2>
          <p class="section-subtitle">Finished products for {{ selectedBranchName }}</p>
        </div>
        <button class="btn-primary" @click="openAddModal('finished')">
          <component :is="Plus" :size="16" /> Add Product
        </button>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <component :is="Search" :size="16" />
          <input type="text" v-model="searchQuery" placeholder="Search products..." />
        </div>
        <select v-model="selectedCategory" class="filter-select">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div> Loading inventory...
      </div>
      <div v-else class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Threshold</th>
              <th>Expiry Date</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>
                <div class="product-info">
                  <component :is="Coffee" :size="14" class="product-icon" />
                  <strong>{{ item.name }}</strong>
                </div>
              </td>
              <td class="muted">{{ item.category }}</td>
              <td>
                <span :class="['type-badge', item.productType]">
                  {{ item.productType }}
                </span>
              </td>
              <td>
                <span :class="['qty-val', getStockStatus(item.stock, item.minStock)]">
                  {{ item.stock }}
                </span>
              </td>
              <td class="muted">{{ item.minStock ?? '—' }}</td>
              <td>
                <span v-if="item.expiryDate"
                  :class="['expiry-val', getExpiryStatus(item.expiryDate)]">
                  {{ formatDate(item.expiryDate) }}
                </span>
                <span v-else class="muted">—</span>
              </td>
              <td class="muted">{{ item.price != null ? '₱' + Number(item.price).toFixed(2) : '—' }}</td>
              <td>
                <span :class="['status-badge', getStockStatus(item.stock, item.minStock)]">
                  {{ getStockStatusText(item.stock, item.minStock) }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="icon-btn edit" @click="editItem(item)" title="Edit">
                  <component :is="Edit2" :size="15" />
                </button>
                <button class="icon-btn delete" @click="confirmDelete(item, 'finished')" title="Delete">
                  <component :is="Trash2" :size="15" />
                </button>
              </td>
            </tr>
            <tr v-if="!filteredItems.length">
              <td colspan="9" class="empty-row">No products found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- RAW MATERIALS (rawproduct) -->
    <div v-if="activeTab === 'raw'" class="inventory-section">
      <div class="section-header">
        <div>
          <h2>Raw Materials</h2>
          <p class="section-subtitle">Ingredients and supplies</p>
        </div>
        <button class="btn-primary" @click="openAddModal('raw')">
          <component :is="Plus" :size="16" /> Add Raw Material
        </button>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <component :is="Search" :size="16" />
          <input type="text" v-model="rawSearchQuery" placeholder="Search raw materials..." />
        </div>
        <select v-model="rawSelectedCategory" class="filter-select">
          <option value="">All Categories</option>
          <option v-for="cat in rawCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <div v-if="isLoadingRaw" class="loading-state">
        <div class="spinner"></div> Loading raw materials...
      </div>
      <div v-else class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Stock Qty</th>
              <th>Unit</th>
              <th>Reorder Level</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredRawItems" :key="item.rawproductid">
              <td>
                <div class="product-info">
                  <component :is="Package" :size="14" class="product-icon" />
                  <strong>{{ item.name }}</strong>
                </div>
              </td>
              <td class="muted">{{ item.category ?? '—' }}</td>
              <td>
                <span :class="['qty-val', getRawStockStatus(item)]">
                  {{ item.stockquantity ?? 0 }}
                </span>
              </td>
              <td class="muted">{{ item.unit }}</td>
              <td class="muted">{{ item.reorderlevel ?? '—' }}</td>
              <td>
                <span v-if="item.expirationdate"
                  :class="['expiry-val', getExpiryStatus(item.expirationdate)]">
                  {{ formatDate(item.expirationdate) }}
                </span>
                <span v-else class="muted">—</span>
              </td>
              <td>
                <span :class="['status-badge', getRawStockStatus(item)]">
                  {{ getRawStockStatusText(item) }}
                </span>
              </td>
              <td class="actions-cell">
                <button class="icon-btn edit" @click="editRawItem(item)" title="Edit">
                  <component :is="Edit2" :size="15" />
                </button>
                <button class="icon-btn delete" @click="confirmDelete(item, 'raw')" title="Delete">
                  <component :is="Trash2" :size="15" />
                </button>
              </td>
            </tr>
            <tr v-if="!filteredRawItems.length">
              <td colspan="8" class="empty-row">No raw materials found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD / EDIT MODAL — Finished Product -->
    <div v-if="showModal && modalType === 'finished'" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Product' : 'Add New Product' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" v-model="formData.name" placeholder="e.g. Iced Latte" />
            <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="formData.category">
                <option value="">Select Category</option>
                <option value="Beverages">Beverages</option>
                <option value="Pastries">Pastries</option>
                <option value="Food">Food</option>
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
              <input type="number" v-model.number="formData.stock" min="0" />
              <span v-if="errors.stock" class="field-error">{{ errors.stock }}</span>
            </div>
            <div class="form-group">
              <label>Low Stock Threshold</label>
              <input type="number" v-model.number="formData.minStock" min="0" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Price (₱) *</label>
              <input type="number" v-model.number="formData.price" min="0" step="0.01" />
              <span v-if="errors.price" class="field-error">{{ errors.price }}</span>
            </div>
            <div class="form-group">
              <label>Expiration Date</label>
              <input type="date" v-model="formData.expiryDate" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeModal">Cancel</button>
            <button class="btn-primary" :disabled="saving" @click="saveItem">
              {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Add') }} Product
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD / EDIT MODAL — Raw Material -->
    <div v-if="showModal && modalType === 'raw'" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditing ? 'Edit Raw Material' : 'Add Raw Material' }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" v-model="rawFormData.name" placeholder="e.g. Whole Milk" />
            <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select v-model="rawFormData.category">
                <option value="">Select Category</option>
                <option value="Coffee Beans">Coffee Beans</option>
                <option value="Dairy">Dairy</option>
                <option value="Syrup">Syrup</option>
                <option value="Powder">Powder</option>
                <option value="Sweetener">Sweetener</option>
                <option value="Baking">Baking</option>
                <option value="Supplies">Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label>Unit *</label>
              <select v-model="rawFormData.unit">
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="pcs">pcs</option>
                <option value="oz">oz</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
              <span v-if="errors.unit" class="field-error">{{ errors.unit }}</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Stock Quantity</label>
              <input type="number" v-model.number="rawFormData.stockquantity" min="0" />
            </div>
            <div class="form-group">
              <label>Reorder Level</label>
              <input type="number" v-model.number="rawFormData.reorderlevel" min="0" />
            </div>
          </div>
          <div class="form-group">
            <label>Expiration Date</label>
            <input type="date" v-model="rawFormData.expirationdate" />
          </div>
          <div class="modal-actions">
            <button class="btn-secondary" @click="closeModal">Cancel</button>
            <button class="btn-primary" :disabled="saving" @click="saveRawItem">
              {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Add') }} Raw Material
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- DELETE CONFIRM -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal" @click.self="showDeleteConfirm = false">
        <div class="modal-content" style="max-width:420px">
          <div class="modal-header">
            <h2>Delete Item</h2>
            <button class="close-btn" @click="showDeleteConfirm = false">×</button>
          </div>
          <div class="modal-body">
            <p style="font-size:14px;margin-bottom:16px">
              Are you sure you want to delete <strong>{{ deleteTarget?.name }}</strong>?
              This cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
              <button class="btn-danger" :disabled="deleting" @click="doDelete">
                {{ deleting ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- TOAST -->
    <Teleport to="body">
      <div v-if="toast.show" :class="['toast-wrap', toast.type]">{{ toast.message }}</div>
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

// State
const isLoading    = ref(false)
const isLoadingRaw = ref(false)
const saving       = ref(false)
const deleting     = ref(false)

const branches         = ref([])
const selectedBranchId = ref(null)
const inventoryItems   = ref([])
const rawItems         = ref([])

const activeTab           = ref('finished')
const searchQuery         = ref('')
const selectedCategory    = ref('')
const rawSearchQuery      = ref('')
const rawSelectedCategory = ref('')

const showModal     = ref(false)
const modalType     = ref('finished')
const isEditing     = ref(false)
const currentItemId = ref(null)
const errors        = ref({})

const showDeleteConfirm = ref(false)
const deleteTarget      = ref(null)
const deleteType        = ref('finished')

const toast = ref({ show: false, message: '', type: 'success' })

const formData = ref({
  name: '', category: '', productType: 'finished',
  stock: 0, minStock: 0, price: null, expiryDate: ''
})
const rawFormData = ref({
  name: '', category: '', unit: 'g',
  stockquantity: 0, reorderlevel: 0, expirationdate: ''
})

// Computed
const selectedBranchName = computed(() =>
  branches.value.find(b => b.BranchId === selectedBranchId.value)?.BranchName ?? ''
)

const filteredItems = computed(() => {
  let list = inventoryItems.value
  if (searchQuery.value)
    list = list.filter(i => i.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (selectedCategory.value)
    list = list.filter(i => i.category === selectedCategory.value)
  return list
})

const filteredRawItems = computed(() => {
  let list = rawItems.value
  if (rawSearchQuery.value)
    list = list.filter(i => i.name?.toLowerCase().includes(rawSearchQuery.value.toLowerCase()))
  if (rawSelectedCategory.value)
    list = list.filter(i => i.category === rawSelectedCategory.value)
  return list
})

const categories = computed(() =>
  [...new Set(inventoryItems.value.map(i => i.category).filter(Boolean))].sort()
)
const rawCategories = computed(() =>
  [...new Set(rawItems.value.map(i => i.category).filter(Boolean))].sort()
)

const lowStockItems = computed(() =>
  filteredItems.value.filter(i => i.minStock && i.stock <= i.minStock)
)
const lowStockCount = computed(() => lowStockItems.value.length)
const totalValue = computed(() =>
  filteredItems.value.reduce((s, i) => s + (i.stock * Number(i.price || 0)), 0)
)

//  Fetch 
const fetchBranches = async () => {
  const { data } = await supabase.from('branch').select('BranchId, BranchName').order('BranchName')
  if (data) {
    branches.value = data
    const slug = localStorage.getItem('branch')
    if (slug && slug !== 'all') {
      const match = data.find(b => b.BranchName?.toLowerCase().includes(slug.toLowerCase()))
      selectedBranchId.value = match?.BranchId ?? data[0]?.BranchId
    } else {
      selectedBranchId.value = data[0]?.BranchId
    }
  }
}

const fetchInventory = async () => {
  if (!selectedBranchId.value) return
  isLoading.value = true

  // inventory has: InventoryId, ProductId, BranchId, Quantity, LowStockThreshold, ExpirationDate, CreatedAt, UpdatedAt
  // NO Status column — removed
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      InventoryId, Quantity, LowStockThreshold, ExpirationDate,
      product ( ProductId, ProductName, Category, ProductType, Price )
    `)
    .eq('BranchId', selectedBranchId.value)
    .order('InventoryId', { ascending: true })

  if (error) { showToast('Failed to load inventory.', 'error'); isLoading.value = false; return }

  inventoryItems.value = (data ?? []).map(i => ({
    id: i.InventoryId,
    productId: i.product?.ProductId,
    name: i.product?.ProductName ?? '—',
    category: i.product?.Category ?? '—',
    productType: i.product?.ProductType ?? '—',
    price: i.product?.Price ?? null,
    stock: i.Quantity ?? 0,
    minStock: i.LowStockThreshold ?? 0,
    expiryDate: i.ExpirationDate ?? null,
  }))

  isLoading.value = false
}

const fetchRawMaterials = async () => {
  isLoadingRaw.value = true
  // rawproduct has: rawproductid, unit, reorderlevel, createdat, name, category, stockquantity, expirationdate, updatedat
  const { data, error } = await supabase
    .from('rawproduct')
    .select('rawproductid, name, category, unit, stockquantity, reorderlevel, expirationdate, createdat, updatedat')
    .order('name')

  if (error) { showToast('Failed to load raw materials.', 'error'); isLoadingRaw.value = false; return }
  rawItems.value = data ?? []
  isLoadingRaw.value = false
}

// Finished Product CRUD
const openAddModal = (type) => {
  modalType.value = type
  isEditing.value = false
  currentItemId.value = null
  errors.value = {}
  formData.value = { name: '', category: '', productType: 'finished', stock: 0, minStock: 0, price: null, expiryDate: '' }
  rawFormData.value = { name: '', category: '', unit: 'g', stockquantity: 0, reorderlevel: 0, expirationdate: '' }
  showModal.value = true
}

const editItem = (item) => {
  modalType.value = 'finished'
  isEditing.value = true
  currentItemId.value = item.id
  errors.value = {}
  formData.value = {
    name: item.name, category: item.category, productType: item.productType,
    stock: item.stock, minStock: item.minStock, price: item.price,
    expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : ''
  }
  showModal.value = true
}

const editRawItem = (item) => {
  modalType.value = 'raw'
  isEditing.value = true
  currentItemId.value = item.rawproductid
  errors.value = {}
  rawFormData.value = {
    name: item.name ?? '', category: item.category ?? '',
    unit: item.unit ?? 'g', stockquantity: item.stockquantity ?? 0,
    reorderlevel: item.reorderlevel ?? 0,
    expirationdate: item.expirationdate ? item.expirationdate.split('T')[0] : ''
  }
  showModal.value = true
}

const closeModal = () => { showModal.value = false; isEditing.value = false; currentItemId.value = null; errors.value = {} }

const validateFinished = () => {
  const e = {}
  if (!formData.value.name.trim()) e.name = 'Product name is required.'
  if (!formData.value.category)    e.category = 'Category is required.'
  if (formData.value.stock < 0)    e.stock = 'Stock cannot be negative.'
  if (!formData.value.price || formData.value.price <= 0) e.price = 'Price must be greater than 0.'
  errors.value = e
  return Object.keys(e).length === 0
}

const validateRaw = () => {
  const e = {}
  if (!rawFormData.value.name.trim()) e.name = 'Name is required.'
  if (!rawFormData.value.unit)        e.unit = 'Unit is required.'
  errors.value = e
  return Object.keys(e).length === 0
}

const saveItem = async () => {
  if (!validateFinished()) return
  saving.value = true

  if (isEditing.value) {
    const item = inventoryItems.value.find(i => i.id === currentItemId.value)
    if (item?.productId) {
      await supabase.from('product').update({
        ProductName: formData.value.name,
        Category: formData.value.category,
        ProductType: formData.value.productType,
        Price: formData.value.price,
      }).eq('ProductId', item.productId)
    }
    const { error } = await supabase.from('inventory').update({
      Quantity: formData.value.stock,
      LowStockThreshold: formData.value.minStock || null,
      ExpirationDate: formData.value.expiryDate || null,
    }).eq('InventoryId', currentItemId.value)

    if (error) showToast('Failed to update.', 'error')
    else { showToast('Product updated.', 'success'); await fetchInventory() }

  } else {
    const { data: newProduct, error: pErr } = await supabase
      .from('product')
      .insert([{
        ProductName: formData.value.name,
        Category: formData.value.category,
        ProductType: formData.value.productType,
        Price: formData.value.price,
        BranchId: selectedBranchId.value,
      }])
      .select('ProductId').single()

    if (pErr || !newProduct) { showToast('Failed to add product.', 'error'); saving.value = false; return }

    const { error: iErr } = await supabase.from('inventory').insert([{
      ProductId: newProduct.ProductId,
      BranchId: selectedBranchId.value,
      Quantity: formData.value.stock,
      LowStockThreshold: formData.value.minStock || null,
      ExpirationDate: formData.value.expiryDate || null,
    }])

    if (iErr) showToast('Failed to add inventory entry.', 'error')
    else { showToast('Product added.', 'success'); await fetchInventory() }
  }

  saving.value = false
  closeModal()
}

const saveRawItem = async () => {
  if (!validateRaw()) return
  saving.value = true

  const payload = {
    name: rawFormData.value.name,
    category: rawFormData.value.category || null,
    unit: rawFormData.value.unit,
    stockquantity: rawFormData.value.stockquantity || 0,
    reorderlevel: rawFormData.value.reorderlevel || null,
    expirationdate: rawFormData.value.expirationdate || null,
  }

  let error
  if (isEditing.value) {
    ({ error } = await supabase.from('rawproduct').update(payload).eq('rawproductid', currentItemId.value))
  } else {
    ({ error } = await supabase.from('rawproduct').insert([payload]))
  }

  if (error) showToast('Failed to save raw material: ' + error.message, 'error')
  else { showToast(isEditing.value ? 'Updated.' : 'Added.', 'success'); await fetchRawMaterials() }

  saving.value = false
  closeModal()
}

// Delete
const confirmDelete = (item, type) => {
  deleteTarget.value = item
  deleteType.value = type
  showDeleteConfirm.value = true
}

const doDelete = async () => {
  deleting.value = true
  if (deleteType.value === 'finished') {
    await supabase.from('inventory').delete().eq('InventoryId', deleteTarget.value.id)
    if (deleteTarget.value.productId)
      await supabase.from('product').delete().eq('ProductId', deleteTarget.value.productId)
    await fetchInventory()
  } else {
    const { error } = await supabase.from('rawproduct').delete().eq('rawproductid', deleteTarget.value.rawproductid)
    if (error) { showToast('Failed to delete.', 'error'); deleting.value = false; return }
    await fetchRawMaterials()
  }
  showToast('Deleted.', 'success')
  deleting.value = false
  showDeleteConfirm.value = false
}

// Helpers 
const getStockStatus = (stock, min) => {
  if (stock <= 0) return 'out'
  if (min && stock <= min) return 'low'
  return 'good'
}
const getStockStatusText = (stock, min) => {
  if (stock <= 0) return 'Out of Stock'
  if (min && stock <= min) return 'Low Stock'
  return 'In Stock'
}
const getRawStockStatus = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'out'
  if (item.reorderlevel && item.stockquantity <= item.reorderlevel) return 'low'
  return 'good'
}
const getRawStockStatusText = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'Out of Stock'
  if (item.reorderlevel && item.stockquantity <= item.reorderlevel) return 'Low Stock'
  return 'In Stock'
}
const getExpiryStatus = (date) => {
  if (!date) return null
  const diff = (new Date(date) - new Date()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'expired'
  if (diff <= 7) return 'expiring'
  return 'ok'
}
const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

watch(selectedBranchId, () => { fetchInventory(); fetchRawMaterials() })

onMounted(async () => {
  await fetchBranches()
  await Promise.all([fetchInventory(), fetchRawMaterials()])
})
</script>

<style scoped>
.inventory-content { padding: 24px 32px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }

.branch-selector { background: white; padding: 14px 20px; border-radius: 12px; border: 1px solid #E9ECEF; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
.branch-selector label { font-size: 14px; font-weight: 500; color: #495057; }
.branch-dropdown { flex: 1; max-width: 400px; padding: 8px 12px; border: 1px solid #E9ECEF; border-radius: 8px; font-size: 14px; color: #212529; background: white; cursor: pointer; outline: none; }
.branch-dropdown:focus { border-color: #8B4513; }

.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 24px; }
.stat-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid #E9ECEF; transition: all 0.2s ease; }
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.stat-card.warning { border-left: 4px solid #FFC107; }
.stat-icon { color: #8B4513; }
.stat-info h3 { font-size: 13px; color: #6C757D; margin-bottom: 6px; font-weight: 500; }
.stat-value { font-size: 28px; font-weight: 600; color: #212529; margin-bottom: 4px; }
.stat-label { font-size: 11px; color: #ADB5BD; }

.alert-section { background: #FFF8E7; border: 1px solid #FFE4B5; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.alert-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: #F57C00; }
.alert-header h3 { font-size: 16px; font-weight: 600; color: #F57C00; margin: 0; }
.alert-subtitle { font-size: 13px; color: #856404; margin-bottom: 16px; }
.low-stock-list { display: flex; flex-direction: column; gap: 10px; }
.low-stock-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: white; border-radius: 8px; border-left: 3px solid #FFC107; }
.item-details { display: flex; gap: 16px; align-items: center; }
.item-name { font-weight: 600; color: #212529; font-size: 14px; }
.item-stock { font-size: 13px; color: #6C757D; }
.low-stock-badge { background: #FFF3E0; color: #F57C00; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }

.tabs-row { display: flex; gap: 4px; margin-bottom: 16px; background: white; border: 1px solid #eee; border-radius: 10px; padding: 4px; width: fit-content; }
.tab-btn { display: flex; align-items: center; gap: 7px; padding: 8px 18px; border: none; border-radius: 7px; background: none; font-size: 14px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s; }
.tab-btn.active { background: #8B4513; color: white; }
.tab-btn:not(.active):hover { background: #f5f5f5; color: #8B4513; }

.inventory-section { background: white; border-radius: 12px; border: 1px solid #E9ECEF; overflow: hidden; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #E9ECEF; }
.section-header h2 { font-size: 18px; font-weight: 600; color: #212529; margin-bottom: 4px; }
.section-subtitle { font-size: 13px; color: #6C757D; margin: 0; }
.btn-primary { display: flex; align-items: center; gap: 8px; background: #8B4513; color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: 0.2s; }
.btn-primary:hover { background: #A0522D; }
.btn-primary:disabled { opacity: .65; cursor: not-allowed; }

.filters-bar { display: flex; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #F1F3F5; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; border: 1px solid #E9ECEF; border-radius: 8px; padding: 8px 12px; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }
.filter-select { padding: 8px 12px; border: 1px solid #E9ECEF; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; outline: none; }

.loading-state { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 50px; color: #999; font-size: 14px; }
.spinner { width: 18px; height: 18px; border: 2px solid #eee; border-top-color: #8B4513; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-container { overflow-x: auto; }
.inventory-table { width: 100%; border-collapse: collapse; }
.inventory-table th { text-align: left; padding: 12px 16px; background: #F8F9FA; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #E9ECEF; white-space: nowrap; }
.inventory-table td { padding: 13px 16px; border-bottom: 1px solid #F1F3F5; font-size: 14px; vertical-align: middle; }
.inventory-table tr:hover td { background: #fafafa; }
.product-info { display: flex; align-items: center; gap: 8px; }
.product-icon { color: #8B4513; flex-shrink: 0; }
.muted { color: #999; font-size: 13px; }
.empty-row { text-align: center; color: #bbb; padding: 40px !important; font-size: 13px; }

.type-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: capitalize; }
.type-badge.finished { background: #dbeafe; color: #1d4ed8; }
.type-badge.raw { background: #f3f4f6; color: #374151; }

.qty-val { font-weight: 700; font-size: 15px; }
.qty-val.good { color: #2E7D32; }
.qty-val.low  { color: #F57C00; }
.qty-val.out  { color: #C62828; }

.expiry-val { font-size: 13px; font-weight: 600; }
.expiry-val.ok       { color: #555; }
.expiry-val.expiring { color: #F57C00; }
.expiry-val.expired  { color: #C62828; }

.status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.status-badge.good { background: #E8F5E9; color: #2E7D32; }
.status-badge.low  { background: #FFF3E0; color: #F57C00; }
.status-badge.out  { background: #FFEBEE; color: #C62828; }

.actions-cell { display: flex; gap: 8px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 5px; border-radius: 4px; transition: 0.2s; display: flex; }
.icon-btn.edit { color: #8B4513; }
.icon-btn.edit:hover { background: #FFF4E6; }
.icon-btn.delete { color: #DC3545; }
.icon-btn.delete:hover { background: #FFEBEE; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; border-radius: 12px; width: 90%; max-width: 550px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; border-bottom: 1px solid #E9ECEF; }
.modal-header h2 { font-size: 18px; font-weight: 600; color: #212529; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6C757D; line-height: 1; }
.close-btn:hover { color: #212529; }
.modal-body { padding: 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #495057; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #E9ECEF; border-radius: 6px; font-size: 14px; outline: none; box-sizing: border-box; transition: 0.2s; }
.form-group input:focus, .form-group select:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-error { font-size: 12px; color: #dc3545; margin-top: 4px; display: block; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 18px; border-top: 1px solid #E9ECEF; }
.btn-secondary { background: #F8F9FA; border: 1px solid #E9ECEF; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: 0.2s; }
.btn-secondary:hover { background: #E9ECEF; }
.btn-danger { background: #dc3545; color: white; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: 0.2s; }
.btn-danger:hover:not(:disabled) { background: #b02a37; }
.btn-danger:disabled { opacity: .65; cursor: not-allowed; }

.toast-wrap { position: fixed; bottom: 24px; right: 24px; padding: 11px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; display: flex; align-items: center; box-shadow: 0 4px 16px rgba(0,0,0,.12); z-index: 9999; animation: slideUp .2s ease; }
.toast-wrap.success { background: #d1e7dd; color: #0a3622; }
.toast-wrap.error   { background: #f8d7da; color: #58151c; }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .inventory-content { padding: 16px; }
  .form-row { grid-template-columns: 1fr; }
  .branch-selector { flex-direction: column; align-items: flex-start; }
  .branch-dropdown { max-width: 100%; width: 100%; }
  .filters-bar { flex-direction: column; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
}
</style>