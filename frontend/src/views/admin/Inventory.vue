<template>
  <div class="inventory-content">

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1>Inventory Management</h1>
        <p>Managing inventory for <strong>{{ selectedBranchName || 'All Branches' }}</strong></p>
      </div>
    </div>

    <!-- Branch Selector -->
    <div class="branch-selector">
      <label>Select Branch:</label>
      <div class="select-wrap">
        <select v-model="selectedBranchId" class="branch-dropdown">
          <option :value="null">All Branches</option>
          <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
            {{ b.BranchName }}
          </option>
        </select>
        <ChevronDown :size="14" class="sel-icon" />
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><Package :size="26" /></div>
        <div class="stat-info">
          <h3>Total Items</h3>
          <p class="stat-value">{{ allBranchStats.total }}</p>
          <span class="stat-label">across all branches</span>
        </div>
      </div>
      <div class="stat-card warning">
        <div class="stat-icon warn"><AlertCircle :size="26" /></div>
        <div class="stat-info">
          <h3>Low Stock</h3>
          <p class="stat-value">{{ allBranchStats.low }}</p>
          <span class="stat-label">need restocking</span>
        </div>
      </div>
      <div class="stat-card danger">
        <div class="stat-icon danger-icon"><XCircle :size="26" /></div>
        <div class="stat-info">
          <h3>Out of Stock</h3>
          <p class="stat-value">{{ allBranchStats.out }}</p>
          <span class="stat-label">zero quantity</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon expiry-icon"><CalendarX :size="26" /></div>
        <div class="stat-info">
          <h3>Expiring Soon</h3>
          <p class="stat-value">{{ allBranchStats.expiring }}</p>
          <span class="stat-label">within 7 days</span>
        </div>
      </div>
    </div>

    <!-- Branch Overview Cards -->
    <div v-if="!selectedBranchId" class="branch-overview">
      <h3 class="overview-title">Branch Overview</h3>
      <div class="branch-cards">
        <div v-for="b in branchSummaries" :key="b.BranchId" class="branch-card"
          @click="selectedBranchId = b.BranchId">
          <div class="branch-card-header">
            <span class="branch-name">{{ b.BranchName }}</span>
            <span class="branch-total">{{ b.total }} items</span>
          </div>
          <div class="branch-card-stats">
            <span v-if="b.out > 0" class="bs-out">{{ b.out }} out of stock</span>
            <span v-if="b.low > 0" class="bs-low">{{ b.low }} low stock</span>
            <span v-if="b.out === 0 && b.low === 0" class="bs-good">All good</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockItems.length > 0" class="alert-section">
      <div class="alert-header">
        <AlertTriangle :size="18" />
        <h3>Stock Alert</h3>
      </div>
      <p class="alert-subtitle">These items need attention:</p>
      <div class="low-stock-list">
        <div v-for="item in lowStockItems.slice(0, 6)" :key="item.rawproductid" class="low-stock-item">
          <div class="item-details">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-stock">
              {{ item.stockquantity }} {{ item.unit }} remaining
              <span v-if="item.reorderlevel">(reorder at {{ item.reorderlevel }})</span>
            </span>
          </div>
          <div class="item-alert-actions">
            <span :class="['low-stock-badge', item.stockquantity <= 0 ? 'out' : 'low']">
              {{ item.stockquantity <= 0 ? 'Out of Stock' : 'Low Stock' }}
            </span>
            <button class="restock-quick-btn" @click="openRestockModal(item)">
              <Plus :size="12" /> Restock
            </button>
          </div>
        </div>
        <p v-if="lowStockItems.length > 6" class="more-alerts">
          +{{ lowStockItems.length - 6 }} more items need attention
        </p>
      </div>
    </div>

    <!-- Inventory Table -->
    <div class="inventory-section">
      <div class="section-header">
        <div>
          <h2>Raw Materials & Supplies</h2>
          <p class="section-subtitle">{{ selectedBranchName || 'All Branches' }} · {{ filteredItems.length }} items</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary-outline" @click="openRestockModal(null)">
            <RefreshCw :size="14" /> Add Stock
          </button>
          <button class="btn-primary" @click="openNewItemModal">
            <Plus :size="14" /> Add New Item
          </button>
        </div>
      </div>

      <div class="filters-bar">
        <div class="search-box">
          <Search :size="15" />
          <input type="text" v-model="searchQuery" placeholder="Search items..." />
        </div>
        <div class="select-wrap sm">
          <select v-model="filterCategory" class="filter-select">
            <option value="">All Categories</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <ChevronDown :size="13" class="sel-icon" />
        </div>
        <div class="select-wrap sm">
          <select v-model="filterStatus" class="filter-select">
            <option value="">All Statuses</option>
            <option value="good">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
            <option value="expiring">Expiring Soon</option>
          </select>
          <ChevronDown :size="13" class="sel-icon" />
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div> Loading inventory...
      </div>
      <div v-else class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Item</th>
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
            <tr v-for="item in filteredItems" :key="item.rawproductid">
              <td>
                <div class="product-info">
                  <Package :size="14" class="product-icon" />
                  <strong>{{ item.name }}</strong>
                </div>
              </td>
              <td class="muted">{{ item.category ?? '—' }}</td>
              <td>
                <span :class="['qty-val', getStatus(item)]">{{ item.stockquantity ?? 0 }}</span>
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
                <span :class="['status-badge', getStatus(item)]">{{ getStatusText(item) }}</span>
              </td>
              <td class="actions-cell">
                <button class="icon-btn restock" @click="openRestockModal(item)" title="Add Stock">
                  <RefreshCw :size="13" />
                </button>
                <button class="icon-btn delete" @click="confirmDelete(item)" title="Delete">
                  <Trash2 :size="13" />
                </button>
              </td>
            </tr>
            <tr v-if="!filteredItems.length">
              <td colspan="8" class="empty-row">No items found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── ADD NEW ITEM MODAL (brand new raw material) ── -->
    <div v-if="showNewItemModal" class="modal" @click.self="closeNewItemModal">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <h2>Add New Item</h2>
            <p class="modal-sub">Register a new raw material or supply</p>
          </div>
          <button class="close-btn" @click="closeNewItemModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Item Name *</label>
            <input type="text" v-model="newItemForm.name"
              placeholder="e.g. Whole Milk, Arabica Beans, Paper Cups" />
            <span v-if="newItemErrors.name" class="field-error">{{ newItemErrors.name }}</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select v-model="newItemForm.category">
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
              <select v-model="newItemForm.unit">
                <option value="g">g (grams)</option>
                <option value="kg">kg (kilograms)</option>
                <option value="ml">ml (milliliters)</option>
                <option value="l">l (liters)</option>
                <option value="pcs">pcs (pieces)</option>
                <option value="oz">oz (ounces)</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
              <span v-if="newItemErrors.unit" class="field-error">{{ newItemErrors.unit }}</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Initial Stock Quantity</label>
              <input type="number" v-model.number="newItemForm.stockquantity" min="0"
                placeholder="0" />
            </div>
            <div class="form-group">
              <label>Reorder Level</label>
              <input type="number" v-model.number="newItemForm.reorderlevel" min="0"
                placeholder="Alert when below this" />
            </div>
          </div>
          <div class="form-group">
            <label>Expiration Date <span class="optional">(optional)</span></label>
            <input type="date" v-model="newItemForm.expirationdate" />
          </div>

          <div class="info-box">
            <Info :size="14" />
            <span>This registers a <strong>new item</strong> in your inventory. To add more stock to an existing item, use <strong>Add Stock</strong> instead.</span>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="closeNewItemModal">Cancel</button>
            <button class="btn-primary" :disabled="savingNewItem" @click="saveNewItem">
              {{ savingNewItem ? 'Saving...' : 'Add New Item' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── ADD STOCK MODAL (restock existing item) ── -->
    <div v-if="showRestockModal" class="modal" @click.self="closeRestockModal">
      <div class="modal-content" style="max-width:480px">
        <div class="modal-header">
          <div>
            <h2>Add Stock</h2>
            <p class="modal-sub">Log incoming supplies</p>
          </div>
          <button class="close-btn" @click="closeRestockModal">×</button>
        </div>
        <div class="modal-body">

          <!-- If no item pre-selected, show dropdown to pick one -->
          <div v-if="!restockTarget" class="form-group">
            <label>Select Item *</label>
            <div class="select-wrap full">
              <select v-model="restockSelectedId" class="filter-select">
                <option :value="null">Choose an existing item...</option>
                <option v-for="i in allRawItems" :key="i.rawproductid" :value="i.rawproductid">
                  {{ i.name }} — current: {{ i.stockquantity }} {{ i.unit }}
                </option>
              </select>
              <ChevronDown :size="13" class="sel-icon" />
            </div>
          </div>

          <!-- If item pre-selected, show info card -->
          <div v-else class="restock-target-card">
            <div class="rtc-name">
              <Package :size="14" />
              <strong>{{ restockTarget.name }}</strong>
            </div>
            <div class="rtc-stats">
              <span>Current stock: <strong>{{ restockTarget.stockquantity }} {{ restockTarget.unit }}</strong></span>
              <span v-if="restockTarget.reorderlevel">Reorder at: {{ restockTarget.reorderlevel }}</span>
            </div>
            <button class="change-item-btn" @click="restockTarget = null; restockSelectedId = null">
              Change item
            </button>
          </div>

          <div class="form-row" style="margin-top: 16px;">
            <div class="form-group">
              <label>Quantity to Add *</label>
              <input type="number" v-model.number="restockForm.quantity" min="1"
                placeholder="e.g. 500" />
              <span v-if="restockErrors.quantity" class="field-error">{{ restockErrors.quantity }}</span>
            </div>
            <div class="form-group">
              <label>New Expiry Date <span class="optional">(optional)</span></label>
              <input type="date" v-model="restockForm.expirationdate" />
            </div>
          </div>

          <!-- Preview new total -->
          <div class="restock-preview" v-if="restockPreviewItem && restockForm.quantity > 0">
            <div class="rp-row">
              <span>Current stock</span>
              <span>{{ restockPreviewItem.stockquantity }} {{ restockPreviewItem.unit }}</span>
            </div>
            <div class="rp-row add">
              <span>Adding</span>
              <span>+ {{ restockForm.quantity }} {{ restockPreviewItem.unit }}</span>
            </div>
            <div class="rp-row total">
              <span>New total</span>
              <span>{{ restockPreviewItem.stockquantity + restockForm.quantity }} {{ restockPreviewItem.unit }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-secondary" @click="closeRestockModal">Cancel</button>
            <button class="btn-primary" :disabled="savingRestock" @click="saveRestock">
              {{ savingRestock ? 'Saving...' : 'Confirm Add Stock' }}
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
            <h2>Remove Item</h2>
            <button class="close-btn" @click="showDeleteConfirm = false">×</button>
          </div>
          <div class="modal-body">
            <p style="font-size:14px;margin-bottom:16px">
              Remove <strong>{{ deleteTarget?.name }}</strong> from inventory? This cannot be undone.
            </p>
            <div class="modal-actions">
              <button class="btn-secondary" @click="showDeleteConfirm = false">Cancel</button>
              <button class="btn-danger" :disabled="deleting" @click="doDelete">
                {{ deleting ? 'Removing...' : 'Remove' }}
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
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Package, AlertCircle, Search, Trash2,
  AlertTriangle, ChevronDown, CalendarX, XCircle, RefreshCw, Info
} from 'lucide-vue-next'
import { supabase } from '@/supabase.js'

// State
const isLoading  = ref(false)
const savingNewItem = ref(false)
const savingRestock = ref(false)
const deleting   = ref(false)

const branches         = ref([])
const selectedBranchId = ref(null)
const allRawItems      = ref([])

const searchQuery    = ref('')
const filterCategory = ref('')
const filterStatus   = ref('')

// New Item Modal
const showNewItemModal = ref(false)
const newItemErrors    = ref({})
const newItemForm      = ref({
  name: '', category: '', unit: 'g',
  stockquantity: 0, reorderlevel: 0, expirationdate: ''
})

// Restock Modal
const showRestockModal  = ref(false)
const restockTarget     = ref(null)   // pre-selected item (from alert quick button or table button)
const restockSelectedId = ref(null)   // dropdown selection when no pre-selected
const restockErrors     = ref({})
const restockForm       = ref({ quantity: 0, expirationdate: '' })

// Delete
const showDeleteConfirm = ref(false)
const deleteTarget      = ref(null)

const toast = ref({ show: false, message: '', type: 'success' })

// Computed 
const selectedBranchName = computed(() =>
  branches.value.find(b => b.BranchId === selectedBranchId.value)?.BranchName ?? ''
)

const filteredItems = computed(() => {
  let list = allRawItems.value
  if (searchQuery.value)
    list = list.filter(i => i.name?.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (filterCategory.value)
    list = list.filter(i => i.category === filterCategory.value)
  if (filterStatus.value === 'expiring')
    list = list.filter(i => getExpiryStatus(i.expirationdate) === 'expiring')
  else if (filterStatus.value)
    list = list.filter(i => getStatus(i) === filterStatus.value)
  return list
})

const categories = computed(() =>
  [...new Set(allRawItems.value.map(i => i.category).filter(Boolean))].sort()
)

const lowStockItems = computed(() =>
  allRawItems.value.filter(i =>
    (i.stockquantity ?? 0) <= 0 || (i.reorderlevel && i.stockquantity <= i.reorderlevel)
  )
)

const allBranchStats = computed(() => ({
  total:    allRawItems.value.length,
  low:      allRawItems.value.filter(i => i.reorderlevel && i.stockquantity > 0 && i.stockquantity <= i.reorderlevel).length,
  out:      allRawItems.value.filter(i => (i.stockquantity ?? 0) <= 0).length,
  expiring: allRawItems.value.filter(i => getExpiryStatus(i.expirationdate) === 'expiring').length,
}))

const branchSummaries = computed(() =>
  branches.value.map(b => ({
    BranchId: b.BranchId, BranchName: b.BranchName,
    total: allRawItems.value.length,
    low:   allRawItems.value.filter(i => i.reorderlevel && i.stockquantity > 0 && i.stockquantity <= i.reorderlevel).length,
    out:   allRawItems.value.filter(i => (i.stockquantity ?? 0) <= 0).length,
  }))
)

// The actual item being restocked — either pre-selected or picked from dropdown
const restockPreviewItem = computed(() => {
  if (restockTarget.value) return restockTarget.value
  if (restockSelectedId.value)
    return allRawItems.value.find(i => i.rawproductid === restockSelectedId.value) ?? null
  return null
})

// Fetch
const fetchBranches = async () => {
  const { data } = await supabase.from('branch').select('BranchId, BranchName').order('BranchName')
  if (data) branches.value = data
  const slug = localStorage.getItem('branch')
  if (slug && slug !== 'all') {
    const match = (data ?? []).find(b => b.BranchName?.toLowerCase().includes(slug.toLowerCase()))
    if (match) selectedBranchId.value = match.BranchId
  }
}

const fetchRawMaterials = async () => {
  isLoading.value = true
  const { data, error } = await supabase
    .from('rawproduct')
    .select('rawproductid, name, category, unit, stockquantity, reorderlevel, expirationdate, createdat, updatedat')
    .order('name')
  if (error) { showToast('Failed to load inventory.', 'error'); isLoading.value = false; return }
  allRawItems.value = data ?? []
  isLoading.value = false
}

// Add New Item 
const openNewItemModal = () => {
  newItemErrors.value = {}
  newItemForm.value = { name: '', category: '', unit: 'g', stockquantity: 0, reorderlevel: 0, expirationdate: '' }
  showNewItemModal.value = true
}

const closeNewItemModal = () => { showNewItemModal.value = false; newItemErrors.value = {} }

const validateNewItem = () => {
  const e = {}
  if (!newItemForm.value.name.trim()) e.name = 'Name is required.'
  if (!newItemForm.value.unit) e.unit = 'Unit is required.'
  newItemErrors.value = e
  return Object.keys(e).length === 0
}

const saveNewItem = async () => {
  if (!validateNewItem()) return
  savingNewItem.value = true
  const { error } = await supabase.from('rawproduct').insert([{
    name: newItemForm.value.name,
    category: newItemForm.value.category || null,
    unit: newItemForm.value.unit,
    stockquantity: newItemForm.value.stockquantity || 0,
    reorderlevel: newItemForm.value.reorderlevel || null,
    expirationdate: newItemForm.value.expirationdate || null,
  }])
  if (error) showToast('Failed: ' + error.message, 'error')
  else {
    showToast(`"${newItemForm.value.name}" added to inventory.`, 'success')
    await fetchRawMaterials()
    closeNewItemModal()
  }
  savingNewItem.value = false
}

// Add Stock (Restock)
const openRestockModal = (item) => {
  restockErrors.value = {}
  restockForm.value = { quantity: 0, expirationdate: '' }
  restockTarget.value = item  // null = user will pick from dropdown
  restockSelectedId.value = item?.rawproductid ?? null
  showRestockModal.value = true
}

const closeRestockModal = () => {
  showRestockModal.value = false
  restockTarget.value = null
  restockSelectedId.value = null
  restockErrors.value = {}
}

const validateRestock = () => {
  const e = {}
  if (!restockPreviewItem.value) e.quantity = 'Please select an item.'
  else if (!restockForm.value.quantity || restockForm.value.quantity <= 0) e.quantity = 'Enter a valid quantity.'
  restockErrors.value = e
  return Object.keys(e).length === 0
}

const saveRestock = async () => {
  if (!validateRestock()) return
  savingRestock.value = true

  const item = restockPreviewItem.value
  const newQty = (item.stockquantity ?? 0) + restockForm.value.quantity

  // Update stock quantity 
  // needs improvement- should be sub expiriry i think 
  const updatePayload = { stockquantity: newQty }
  if (restockForm.value.expirationdate) updatePayload.expirationdate = restockForm.value.expirationdate

  const { error: upErr } = await supabase
    .from('rawproduct').update(updatePayload).eq('rawproductid', item.rawproductid)

  if (upErr) { showToast('Failed: ' + upErr.message, 'error'); savingRestock.value = false; return }

  // Also log to rawproducttransaction 
  await supabase.from('rawproducttransaction').insert([{
    rawproductid: item.rawproductid,
    transactiontype: 'restock',
    quantity: restockForm.value.quantity,
    expirationdate: restockForm.value.expirationdate || null,
  }])

  showToast(`Added ${restockForm.value.quantity} ${item.unit} of ${item.name}.`, 'success')
  await fetchRawMaterials()
  closeRestockModal()
  savingRestock.value = false
}

// Delete
const confirmDelete = (item) => { deleteTarget.value = item; showDeleteConfirm.value = true }

const doDelete = async () => {
  deleting.value = true
  const { error } = await supabase.from('rawproduct').delete().eq('rawproductid', deleteTarget.value.rawproductid)
  if (error) showToast('Failed to delete.', 'error')
  else { showToast('Item removed.', 'success'); await fetchRawMaterials() }
  deleting.value = false
  showDeleteConfirm.value = false
}

// Helpers
const getStatus = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'out'
  if (item.reorderlevel && item.stockquantity <= item.reorderlevel) return 'low'
  return 'good'
}
const getStatusText = (item) => {
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
  setTimeout(() => { toast.value.show = false }, 3500)
}

onMounted(async () => {
  await fetchBranches()
  await fetchRawMaterials()
})
</script>

<style scoped>
.inventory-content { padding: 24px 32px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }

.page-header { margin-bottom: 20px; }
.page-header h1 { font-size: 26px; font-weight: 800; color: #31201D; margin: 0 0 4px; }
.page-header p { font-size: 14px; color: #888; margin: 0; }
.page-header strong { color: #31201D; }

.branch-selector { background: white; padding: 14px 20px; border-radius: 12px; border: 1px solid #E9ECEF; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
.branch-selector label { font-size: 14px; font-weight: 600; color: #495057; white-space: nowrap; }
.select-wrap { position: relative; flex: 1; max-width: 360px; }
.select-wrap.sm { max-width: 170px; flex: unset; }
.select-wrap.full { max-width: 100%; }
.branch-dropdown, .filter-select { width: 100%; appearance: none; padding: 9px 32px 9px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white; outline: none; cursor: pointer; box-sizing: border-box; transition: border-color 0.2s; }
.branch-dropdown:focus, .filter-select:focus { border-color: #8B4513; }
.sel-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; border: 1px solid #E9ECEF; transition: box-shadow 0.2s; }
.stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.stat-card.warning { border-left: 3px solid #f59e0b; }
.stat-card.danger  { border-left: 3px solid #ef4444; }
.stat-icon { color: #8B4513; }
.stat-icon.warn        { color: #f59e0b; }
.stat-icon.danger-icon { color: #ef4444; }
.stat-icon.expiry-icon { color: #8b5cf6; }
.stat-info h3 { font-size: 12px; color: #6C757D; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value { font-size: 26px; font-weight: 800; color: #212529; margin: 0 0 2px; }
.stat-label { font-size: 11px; color: #ADB5BD; }

.branch-overview { margin-bottom: 20px; }
.overview-title { font-size: 13px; font-weight: 700; color: #495057; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.branch-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.branch-card { background: white; border: 1px solid #E9ECEF; border-radius: 10px; padding: 14px 16px; cursor: pointer; transition: 0.2s; }
.branch-card:hover { border-color: #8B4513; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.branch-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.branch-name { font-size: 14px; font-weight: 700; color: #212529; }
.branch-total { font-size: 12px; color: #888; }
.branch-card-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.bs-out  { font-size: 12px; font-weight: 600; color: #C62828; }
.bs-low  { font-size: 12px; font-weight: 600; color: #F57C00; }
.bs-good { font-size: 12px; font-weight: 600; color: #2E7D32; }

.alert-section { background: #FFF8E7; border: 1px solid #FFE4B5; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
.alert-header { display: flex; align-items: center; gap: 8px; color: #F57C00; margin-bottom: 4px; }
.alert-header h3 { font-size: 15px; font-weight: 700; color: #F57C00; margin: 0; }
.alert-subtitle { font-size: 13px; color: #856404; margin: 0 0 12px; }
.low-stock-list { display: flex; flex-direction: column; gap: 8px; }
.low-stock-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: white; border-radius: 8px; border-left: 3px solid #FFC107; }
.item-details { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.item-name { font-weight: 600; color: #212529; font-size: 14px; }
.item-stock { font-size: 13px; color: #6C757D; }
.item-alert-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.low-stock-badge { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 20px; }
.low-stock-badge.low { background: #FFF3E0; color: #F57C00; }
.low-stock-badge.out { background: #FFEBEE; color: #C62828; }
.restock-quick-btn { display: flex; align-items: center; gap: 4px; background: #8B4513; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; }
.restock-quick-btn:hover { background: #A0522D; }
.more-alerts { font-size: 12px; color: #92400e; margin: 6px 0 0; }

.inventory-section { background: white; border-radius: 12px; border: 1px solid #E9ECEF; overflow: hidden; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #E9ECEF; }
.section-header h2 { font-size: 17px; font-weight: 700; color: #212529; margin: 0 0 3px; }
.section-subtitle { font-size: 13px; color: #6C757D; margin: 0; }
.header-actions { display: flex; gap: 10px; }
.btn-primary { display: flex; align-items: center; gap: 7px; background: #8B4513; color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; white-space: nowrap; }
.btn-primary:hover { background: #A0522D; }
.btn-primary:disabled { opacity: .65; cursor: not-allowed; }
.btn-secondary-outline { display: flex; align-items: center; gap: 7px; background: white; color: #8B4513; border: 1px solid #8B4513; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; white-space: nowrap; }
.btn-secondary-outline:hover { background: #FFF4E6; }

.filters-bar { display: flex; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #F1F3F5; flex-wrap: wrap; align-items: center; }
.search-box { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; border: 1px solid #E9ECEF; border-radius: 8px; padding: 8px 12px; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }

.loading-state { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 50px; color: #999; font-size: 14px; }
.spinner { width: 18px; height: 18px; border: 2px solid #eee; border-top-color: #8B4513; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.table-container { overflow-x: auto; }
.inventory-table { width: 100%; border-collapse: collapse; }
.inventory-table th { text-align: left; padding: 11px 16px; background: #F8F9FA; color: #495057; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #E9ECEF; white-space: nowrap; }
.inventory-table td { padding: 13px 16px; border-bottom: 1px solid #F1F3F5; font-size: 14px; vertical-align: middle; }
.inventory-table tr:hover td { background: #fafafa; }
.product-info { display: flex; align-items: center; gap: 8px; }
.product-icon { color: #8B4513; flex-shrink: 0; }
.muted { color: #999; font-size: 13px; }
.empty-row { text-align: center; color: #bbb; padding: 40px !important; font-size: 13px; }
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
.icon-btn.restock { color: #2E7D32; }
.icon-btn.restock:hover { background: #E8F5E9; }
.icon-btn.delete { color: #DC3545; }
.icon-btn.delete:hover { background: #FFEBEE; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; border-radius: 12px; width: 90%; max-width: 540px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 1px solid #E9ECEF; }
.modal-header h2 { font-size: 17px; font-weight: 700; color: #212529; margin: 0 0 2px; }
.modal-sub { font-size: 13px; color: #888; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6C757D; line-height: 1; flex-shrink: 0; }
.close-btn:hover { color: #212529; }
.modal-body { padding: 20px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #495057; }
.optional { font-size: 11px; color: #bbb; font-weight: 400; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #E9ECEF; border-radius: 6px; font-size: 14px; outline: none; box-sizing: border-box; transition: 0.2s; }
.form-group input:focus, .form-group select:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.1); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-error { font-size: 12px; color: #dc3545; margin-top: 4px; display: block; }

.info-box { display: flex; align-items: flex-start; gap: 10px; background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin: 16px 0; font-size: 13px; color: #1e40af; }
.info-box strong { color: #1d4ed8; }

/* RESTOCK MODAL SPECIFIC */
.restock-target-card { background: #f9f4ef; border: 1px solid #e8d5c4; border-radius: 10px; padding: 14px 16px; }
.rtc-name { display: flex; align-items: center; gap: 8px; font-size: 15px; color: #31201D; margin-bottom: 6px; }
.rtc-stats { display: flex; gap: 16px; font-size: 13px; color: #888; margin-bottom: 8px; }
.rtc-stats strong { color: #31201D; }
.change-item-btn { background: none; border: none; color: #8B4513; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline; }

.restock-preview { background: #f9f9f9; border-radius: 10px; padding: 14px 16px; margin: 16px 0 0; display: flex; flex-direction: column; gap: 8px; }
.rp-row { display: flex; justify-content: space-between; font-size: 14px; color: #555; }
.rp-row.add { color: #2E7D32; font-weight: 600; }
.rp-row.total { font-size: 16px; font-weight: 800; color: #212529; padding-top: 10px; border-top: 1px solid #eee; margin-top: 4px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E9ECEF; }
.btn-secondary { background: #F8F9FA; border: 1px solid #E9ECEF; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; transition: 0.2s; }
.btn-secondary:hover { background: #E9ECEF; }
.btn-danger { background: #dc3545; color: white; border: none; padding: 9px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: 0.2s; }
.btn-danger:hover:not(:disabled) { background: #b02a37; }
.btn-danger:disabled { opacity: .65; cursor: not-allowed; }

.toast-wrap { position: fixed; bottom: 24px; right: 24px; padding: 11px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,.12); z-index: 9999; animation: slideUp .2s ease; max-width: 360px; }
.toast-wrap.success { background: #d1e7dd; color: #0a3622; }
.toast-wrap.error   { background: #f8d7da; color: #58151c; }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

@media (max-width: 768px) {
  .inventory-content { padding: 16px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .branch-selector { flex-direction: column; align-items: flex-start; }
  .select-wrap { max-width: 100%; width: 100%; }
  .filters-bar { flex-direction: column; }
  .header-actions { flex-direction: column; }
}
</style>