<template>
  <div class="inventory-content">

    <!-- Page Header -->
    <div class="page-header">
      <div class="ph-left">
        <h1>Inventory</h1>
        <p v-if="assignedBranchName">
          <span class="branch-pill"><span class="branch-dot"></span>{{ assignedBranchName }}</span>
        </p>
        <p v-else class="no-branch-warn">No branch assigned to your account.</p>
      </div>
    </div>

    <!-- No branch guard -->
    <div v-if="!assignedBranchId && !loadingBranch" class="no-branch-card">
      <AlertCircle :size="32" class="nbc-icon" />
      <h2>Branch Not Assigned</h2>
      <p>Your manager account has not been assigned to a branch yet. Please contact your administrator.</p>
    </div>

    <template v-else-if="assignedBranchId">

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon"><Package :size="24" /></div>
          <div class="stat-info">
            <h3>Total Items</h3>
            <p class="stat-value">{{ branchStats.total }}</p>
            <span class="stat-label">tracked materials</span>
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-icon warn"><AlertCircle :size="24" /></div>
          <div class="stat-info">
            <h3>Low Stock</h3>
            <p class="stat-value">{{ branchStats.low }}</p>
            <span class="stat-label">below reorder point</span>
          </div>
        </div>
        <div class="stat-card danger">
          <div class="stat-icon danger-icon"><XCircle :size="24" /></div>
          <div class="stat-info">
            <h3>Out of Stock</h3>
            <p class="stat-value">{{ branchStats.out }}</p>
            <span class="stat-label">zero quantity</span>
          </div>
        </div>
        <div class="stat-card expiring-card">
          <div class="stat-icon expiry-icon"><CalendarX :size="24" /></div>
          <div class="stat-info">
            <h3>Expiring Soon</h3>
            <p class="stat-value">{{ branchStats.expiring }}</p>
            <span class="stat-label">batches within 7 days</span>
          </div>
        </div>
      </div>

      <!-- FEFO Alert -->
      <div v-if="expiringBatches.length > 0" class="fefo-alert">
        <div class="fefo-header">
          <div class="fefo-title-row">
            <CalendarX :size="16" />
            <h3>Use These First</h3>
            <span class="fefo-badge">FEFO</span>
          </div>
          <p class="fefo-sub">These batches expire soonest. Use them before opening newer stock to minimize waste.</p>
        </div>
        <div class="fefo-list">
          <div v-for="batch in expiringBatches.slice(0, 5)" :key="batch.rawtransactionid" class="fefo-row">
            <div class="fefo-item-info">
              <span class="fefo-name">{{ batch.rawproduct?.name ?? '—' }}</span>
              <span class="fefo-batch">{{ batch.batchLabel }} · {{ batch.quantity }} {{ batch.rawproduct?.unit }}</span>
            </div>
            <div class="fefo-expiry-info">
              <span :class="['fefo-days', getDaysUntilExpiry(batch.expirationdate) < 0 ? 'expired' : getDaysUntilExpiry(batch.expirationdate) <= 3 ? 'critical' : 'warning']">
                {{ getDaysUntilExpiry(batch.expirationdate) < 0 ? 'EXPIRED'
                  : getDaysUntilExpiry(batch.expirationdate) === 0 ? 'Expires today'
                  : `${getDaysUntilExpiry(batch.expirationdate)}d left` }}
              </span>
              <span class="fefo-date">{{ formatDate(batch.expirationdate) }}</span>
            </div>
            <button v-if="getDaysUntilExpiry(batch.expirationdate) < 0" class="expire-btn" @click="markBatchExpired(batch)">
              Mark Used/Discard
            </button>
          </div>
          <p v-if="expiringBatches.length > 5" class="more-alerts">+{{ expiringBatches.length - 5 }} more batches expiring soon</p>
        </div>
      </div>

      <!-- EOQ Smart Reorder -->
      <div v-if="eoqItems.length > 0" class="eoq-panel">
        <div class="eoq-header">
          <div class="eoq-title-row">
            <TrendingUp :size="16" />
            <h3>Reorder Suggestions</h3>
            <span class="eoq-badge">Based on Sales</span>
          </div>
          <p class="eoq-sub">Items at or below reorder point.</p>
        </div>
        <div class="eoq-list">
          <div v-for="item in eoqItems.slice(0, 4)" :key="item.rawproductid" class="eoq-row">
            <div class="eoq-item-info">
              <span class="eoq-name">{{ item.name }}</span>
              <span class="eoq-stock">
                {{ item.stockquantity }} {{ item.unit }} remaining
                <span v-if="item._dailyUsage > 0" class="usage-hint">· ~{{ item._dailyUsage.toFixed(1) }} {{ item.unit }}/day from sales</span>
              </span>
            </div>
            <div class="eoq-suggestion">
              <span class="eoq-label">Order:</span>
              <span class="eoq-qty">{{ calculateEOQ(item) }} {{ item.unit }}</span>
            </div>
            <button class="eoq-restock-btn" @click="openRestockWithEOQ(item)">Add Stock →</button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs-row">
        <button :class="['tab-btn', activeTab === 'items' ? 'active' : '']" @click="activeTab = 'items'">
          <Package :size="14" /> Items Overview
        </button>
        <button :class="['tab-btn', activeTab === 'batches' ? 'active' : '']" @click="handleBatchTab">
          <Layers :size="14" /> Batch Tracker
          <span v-if="expiringBatches.length > 0" class="tab-alert-dot">{{ expiringBatches.length }}</span>
        </button>
      </div>

      <!-- ══ ITEMS TAB ══ -->
      <div v-if="activeTab === 'items'" class="inventory-section">
        <div class="section-header">
          <div>
            <h2>Raw Materials & Supplies</h2>
            <p class="section-subtitle">{{ filteredItems.length }} items</p>
          </div>
          <div class="header-actions">
            <button class="btn-secondary-outline" @click="openRestockModal(null)">
              <RefreshCw :size="13" /> Add Stock
            </button>
            <button class="btn-primary" @click="openNewItemModal">
              <Plus :size="13" /> Add New Item
            </button>
          </div>
        </div>

        <div class="filters-bar">
          <div class="search-box">
            <Search :size="14" />
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
            </select>
            <ChevronDown :size="13" class="sel-icon" />
          </div>
        </div>

        <div v-if="isLoading" class="loading-state"><div class="spinner"></div> Loading...</div>
        <div v-else class="table-container">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Unit</th>
                <th>Reorder Point</th>
                <th>EOQ Suggest</th>
                <th>Batches</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.rawproductid" :class="{ 'row-alert': getStatus(item) !== 'good' }">
                <td>
                  <div class="product-info">
                    <Package :size="14" class="product-icon" />
                    <strong class="item-name-text">{{ item.name }}</strong>
                  </div>
                  <span class="sku-label">SKU-{{ String(item.rawproductid).padStart(4, '0') }}</span>
                </td>
                <td class="td-text">{{ item.category ?? '—' }}</td>
                <td>
                  <div class="stock-cell">
                    <span :class="['qty-val', getStatus(item)]">{{ item.stockquantity ?? 0 }}</span>
                    <div class="stock-bar-wrap" v-if="item.reorderlevel">
                      <div class="stock-bar"
                        :style="{ width: Math.min(100, ((item.stockquantity / (item.reorderlevel * 3)) * 100)) + '%' }"
                        :class="getStatus(item)"></div>
                    </div>
                  </div>
                </td>
                <td class="td-text">{{ item.unit }}</td>
                <td class="td-text">{{ item.reorderlevel ?? '—' }}</td>
                <td>
                  <span v-if="item.reorderlevel" class="eoq-chip">{{ calculateEOQ(item) }} {{ item.unit }}</span>
                  <span v-else class="td-text">—</span>
                </td>
                <td>
                  <div class="batch-summary" @click="openBatchDetail(item)">
                    <span class="batch-count">
                      {{ getBatchCountForItem(item.rawproductid) }} batch{{ getBatchCountForItem(item.rawproductid) !== 1 ? 'es' : '' }}
                    </span>
                    <span v-if="getExpiringBatchCount(item.rawproductid) > 0" class="batch-expiring-warn">
                      {{ getExpiringBatchCount(item.rawproductid) }} expiring
                    </span>
                  </div>
                </td>
                <td>
                  <span :class="['status-badge', getStatus(item)]">{{ getStatusText(item) }}</span>
                </td>
                <td class="actions-cell">
                  <button class="icon-btn restock" @click="openRestockModal(item)" title="Add Stock"><RefreshCw :size="14" /></button>
                  <button class="icon-btn batches" @click="openBatchDetail(item)" title="View Batches"><Layers :size="14" /></button>
                  <button class="icon-btn delete" @click="confirmDelete(item)" title="Remove"><Trash2 :size="14" /></button>
                </td>
              </tr>
              <tr v-if="!filteredItems.length">
                <td colspan="9" class="empty-row">No items found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ BATCH TRACKER TAB ══ -->
      <div v-if="activeTab === 'batches'" class="inventory-section">
        <div class="section-header">
          <div>
            <h2>Batch Tracker</h2>
            <p class="section-subtitle">FEFO order — earliest expiring shown first · {{ allBatches.length }} active batches</p>
          </div>
          <div class="fefo-legend">
            <span class="fl-item"><span class="fl-dot expired"></span>Expired</span>
            <span class="fl-item"><span class="fl-dot critical"></span>≤3 days</span>
            <span class="fl-item"><span class="fl-dot warning"></span>≤7 days</span>
            <span class="fl-item"><span class="fl-dot ok"></span>Safe</span>
          </div>
        </div>

        <div class="filters-bar">
          <div class="search-box">
            <Search :size="14" />
            <input type="text" v-model="batchSearch" placeholder="Search by item name or batch ID..." />
          </div>
          <div class="select-wrap sm">
            <select v-model="batchFilterExpiry" class="filter-select">
              <option value="">All Batches</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (≤3 days)</option>
              <option value="warning">Warning (≤7 days)</option>
              <option value="ok">Safe</option>
            </select>
            <ChevronDown :size="13" class="sel-icon" />
          </div>
        </div>

        <div v-if="loadingBatches" class="loading-state"><div class="spinner"></div> Loading batches...</div>
        <div v-else-if="fetchBatchError" class="error-state">
          <AlertCircle :size="18" /> {{ fetchBatchError }}
          <button class="retry-btn" @click="fetchBatches">Retry</button>
        </div>
        <div v-else class="table-container">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Item</th>
                <th>Batch Qty</th>
                <th>Received</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>FEFO Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in filteredBatches" :key="batch.rawtransactionid"
                :class="['batch-row', getBatchExpiryClass(batch.expirationdate)]">
                <td><span class="batch-id-tag">{{ batch.batchLabel }}</span></td>
                <td><strong class="item-name-text">{{ batch.rawproduct?.name ?? '—' }}</strong></td>
                <td>
                  <span class="qty-val" :class="getBatchExpiryClass(batch.expirationdate)">{{ batch.quantity }}</span>
                  <span class="td-text"> {{ batch.rawproduct?.unit }}</span>
                </td>
                <td class="td-text">{{ formatDate(batch.createdat) }}</td>
                <td>
                  <span :class="['expiry-val', getBatchExpiryClass(batch.expirationdate)]">
                    {{ batch.expirationdate ? formatDate(batch.expirationdate) : '—' }}
                  </span>
                </td>
                <td>
                  <span :class="['days-chip', getBatchExpiryClass(batch.expirationdate)]">{{ getDaysLabel(batch.expirationdate) }}</span>
                </td>
                <td>
                  <span :class="['fefo-status-badge', getBatchExpiryClass(batch.expirationdate)]">{{ getFEFOLabel(batch.expirationdate) }}</span>
                </td>
                <td class="actions-cell">
                  <button class="icon-btn delete" @click="confirmDeleteBatch(batch)" title="Mark used/discard"><Trash2 :size="14" /></button>
                </td>
              </tr>
              <tr v-if="filteredBatches.length === 0">
                <td colspan="8" class="empty-row">No batches found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ ADD NEW ITEM MODAL ══ -->
      <div v-if="showNewItemModal" class="modal" @click.self="closeNewItemModal">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2>Add New Item</h2>
              <p class="modal-sub">Will be added to <strong>{{ assignedBranchName }}</strong> — a unique SKU will be assigned</p>
            </div>
            <button class="close-btn" @click="closeNewItemModal">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Item Name *</label>
              <input type="text" v-model="newItemForm.name" placeholder="e.g. Whole Milk, Arabica Beans, Paper Cups 16oz" />
              <span v-if="newItemErrors.name" class="field-error">{{ newItemErrors.name }}</span>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select v-model="newItemForm.category">
                  <option value="">Select</option>
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
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="pcs">pcs</option>
                  <option value="oz">oz</option>
                </select>
                <span v-if="newItemErrors.unit" class="field-error">{{ newItemErrors.unit }}</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Reorder Point <span class="label-hint">— alert threshold</span></label>
                <input type="number" v-model.number="newItemForm.reorderlevel" min="0" placeholder="e.g. 500" />
              </div>
              <div class="form-group">
                <label>Lead Time (days) <span class="label-hint">— days from order to arrival</span></label>
                <input type="number" v-model.number="newItemForm.leadtimedays" min="1" placeholder="2" />
              </div>
            </div>

            <!-- Hasexpiry toggle -->
            <div class="hasexpiry-toggle-row">
              <input type="checkbox" id="hasexpiry-toggle" v-model="newItemForm.hasexpiry" />
              <label for="hasexpiry-toggle">This item has an expiration date</label>
              <span class="hasexpiry-hint">
                {{ newItemForm.hasexpiry ? 'e.g. milk, syrups, dairy' : 'e.g. cups, straws, napkins' }}
              </span>
            </div>

            <div class="divider-label">Initial Stock Batch</div>

            <div class="form-row">
              <div class="form-group">
                <label>Initial Quantity</label>
                <input type="number" v-model.number="newItemForm.stockquantity" min="0" placeholder="0" />
              </div>
              <div class="form-group" v-if="newItemForm.hasexpiry">
                <label>Expiration Date <span class="label-hint" style="color:#dc2626"> * required</span></label>
                <input type="date" v-model="newItemForm.expirationdate" />
                <span v-if="newItemErrors.expirationdate" class="field-error">{{ newItemErrors.expirationdate }}</span>
              </div>
              <div class="form-group" v-else>
                <label>Expiration Date</label>
                <div class="no-expiry-note"><span>Non-perishable — no expiry needed</span></div>
              </div>
            </div>

            <div class="info-box">
              <Info :size="13" />
              <span>Stock will be added to <strong>{{ assignedBranchName }}</strong>. A unique <strong>SKU</strong> will be auto-assigned and FEFO tracking will be enabled per batch.</span>
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

      <!-- ══ ADD STOCK MODAL ══ -->
      <div v-if="showRestockModal" class="modal" @click.self="closeRestockModal">
        <div class="modal-content restock-modal">
          <div class="modal-header">
            <div>
              <h2>Add Stock</h2>
              <p class="modal-sub">Adding to <strong>{{ assignedBranchName }}</strong> — each delivery creates a new tracked batch</p>
            </div>
            <button class="close-btn" @click="closeRestockModal">×</button>
          </div>
          <div class="modal-body">

            <!-- STEP 1: Item picker -->
            <div v-if="!restockTarget && !restockSelectedId" class="step-block">
              <p class="step-label"><span class="step-num">1</span> Select an item to restock</p>
              <div class="item-picker-grid">
                <button
                  v-for="i in allRawItems" :key="i.rawproductid"
                  class="item-picker-card"
                  :class="{ selected: restockSelectedId === i.rawproductid, alert: getStatus(i) !== 'good' }"
                  @click="restockSelectedId = i.rawproductid"
                >
                  <div class="ipc-top">
                    <span class="ipc-sku">SKU-{{ String(i.rawproductid).padStart(4, '0') }}</span>
                    <span :class="['ipc-status', getStatus(i)]">{{ getStatusText(i) }}</span>
                  </div>
                  <span class="ipc-name">{{ i.name }}</span>
                  <span class="ipc-stock">{{ i.stockquantity }} {{ i.unit }} in stock</span>
                </button>
              </div>
              <span v-if="restockErrors.item" class="field-error">{{ restockErrors.item }}</span>
            </div>

            <!-- STEP 2: Batch details -->
            <div v-else>
              <div class="restock-target-card" v-if="restockPreviewItem">
                <div class="rtc-top">
                  <div class="rtc-name"><Package :size="13" /><strong>{{ restockPreviewItem.name }}</strong></div>
                  <span class="rtc-sku">SKU-{{ String(restockPreviewItem.rawproductid).padStart(4,'0') }}</span>
                </div>
                <div class="rtc-stat-grid">
                  <div class="rtc-stat">
                    <span class="rtcs-label">Current Stock</span>
                    <span :class="['rtcs-val', getStatus(restockPreviewItem)]">
                      {{ restockPreviewItem.stockquantity }} {{ restockPreviewItem.unit }}
                    </span>
                  </div>
                  <div class="rtc-stat" v-if="restockPreviewItem.reorderlevel">
                    <span class="rtcs-label">Reorder Point</span>
                    <span class="rtcs-val neutral">{{ restockPreviewItem.reorderlevel }} {{ restockPreviewItem.unit }}</span>
                  </div>
                  <div class="rtc-stat" v-if="restockPreviewItem.reorderlevel">
                    <span class="rtcs-label">EOQ Suggestion</span>
                    <span class="rtcs-val blue">{{ calculateEOQ(restockPreviewItem) }} {{ restockPreviewItem.unit }}</span>
                  </div>
                  <div class="rtc-stat" v-if="restockPreviewItem._dailyUsage > 0">
                    <span class="rtcs-label">Daily Usage</span>
                    <span class="rtcs-val neutral">~{{ restockPreviewItem._dailyUsage.toFixed(1) }} {{ restockPreviewItem.unit }}/day</span>
                  </div>
                </div>
                <button class="change-item-btn" @click="restockTarget = null; restockSelectedId = null">← Change item</button>
              </div>

              <!-- Branch is always locked — just show a note -->
              <div class="branch-assigned-note">
                <span>Stock will be added to <strong>{{ assignedBranchName }}</strong></span>
              </div>

              <div class="divider-label">New Batch Details</div>

              <div class="batch-form-grid">
                <div class="bfg-card">
                  <label class="bfg-label">Quantity to Add *</label>
                  <div class="bfg-qty-row">
                    <input
                      type="number"
                      v-model.number="restockForm.quantity"
                      min="1"
                      placeholder="0"
                      class="bfg-qty-input"
                    />
                    <span class="bfg-unit-badge">{{ restockPreviewItem?.unit }}</span>
                  </div>
                  <button
                    v-if="restockPreviewItem?.reorderlevel"
                    class="eoq-fill-btn"
                    @click="restockForm.quantity = calculateEOQ(restockPreviewItem)"
                  >
                    <TrendingUp :size="12" /> Fill EOQ ({{ calculateEOQ(restockPreviewItem) }})
                  </button>
                  <span v-if="restockErrors.quantity" class="field-error">{{ restockErrors.quantity }}</span>
                </div>

                <div class="bfg-card" v-if="restockPreviewItem?.hasexpiry !== false">
                  <label class="bfg-label">
                    Expiry Date
                    <span class="label-hint" style="color:#dc2626"> * required</span>
                  </label>
                  <input
                    type="date"
                    v-model="restockForm.expirationdate"
                    class="bfg-date-input"
                    :style="restockErrors.expiry ? 'border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.08)' : ''"
                  />
                  <span v-if="restockErrors.expiry" class="field-error">{{ restockErrors.expiry }}</span>
                </div>
                <div class="bfg-card" v-else>
                  <label class="bfg-label">Expiry Date</label>
                  <div class="no-expiry-note" style="margin-top:8px">
                    <span><strong>{{ restockPreviewItem?.name }}</strong> is non-perishable — no expiry date needed.</span>
                  </div>
                </div>
              </div>

              <div class="restock-preview" v-if="restockPreviewItem && restockForm.quantity > 0">
                <div class="rp-row"><span>Current total stock</span><span>{{ restockPreviewItem.stockquantity }} {{ restockPreviewItem.unit }}</span></div>
                <div class="rp-row add"><span>+ This batch</span><span>+{{ restockForm.quantity }} {{ restockPreviewItem.unit }}</span></div>
                <div class="rp-row total">
                  <span>New total</span>
                  <span>{{ restockPreviewItem.stockquantity + restockForm.quantity }} {{ restockPreviewItem.unit }}</span>
                </div>
                <div class="rp-row">
                  <span>Status after</span>
                  <span :class="['status-badge', getStatusAfterRestock(restockPreviewItem, restockForm.quantity)]">
                    {{ getStatusTextAfterRestock(restockPreviewItem, restockForm.quantity) }}
                  </span>
                </div>
              </div>

              <div class="fefo-note">
                <Layers :size="12" />
                <span>A new batch will be logged under <strong>{{ restockPreviewItem?.name }}</strong> with its own expiry date. Staff will be reminded to use earliest-expiring batches first.</span>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-secondary" @click="closeRestockModal">Cancel</button>
              <button class="btn-primary"
                :disabled="savingRestock || (!restockTarget && !restockSelectedId)"
                @click="saveRestock">
                {{ savingRestock ? 'Saving...' : 'Confirm Add Stock' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ BATCH DETAIL MODAL ══ -->
      <div v-if="showBatchDetail" class="modal" @click.self="showBatchDetail = false">
        <div class="modal-content" style="max-width:640px">
          <div class="modal-header">
            <div>
              <h2>{{ batchDetailItem?.name }} — Batches</h2>
              <p class="modal-sub">SKU-{{ String(batchDetailItem?.rawproductid).padStart(4,'0') }} · {{ assignedBranchName }} · FEFO order</p>
            </div>
            <button class="close-btn" @click="showBatchDetail = false">×</button>
          </div>
          <div class="modal-body" style="padding:0">
            <div v-if="loadingItemBatches" class="loading-state" style="padding:30px"><div class="spinner"></div> Loading batches...</div>
            <table v-else class="inventory-table">
              <thead>
                <tr>
                  <th>Batch ID</th>
                  <th>Qty</th>
                  <th>Received On</th>
                  <th>Expiry Date</th>
                  <th>Days Left</th>
                  <th>FEFO Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="batch in itemBatches" :key="batch.rawtransactionid"
                  :class="['batch-row', getBatchExpiryClass(batch.expirationdate)]">
                  <td><span class="batch-id-tag">{{ batch.batchLabel }}</span></td>
                  <td>
                    <strong class="qty-val" :class="getBatchExpiryClass(batch.expirationdate)">{{ batch.quantity }}</strong>
                    <span class="td-text"> {{ batchDetailItem?.unit }}</span>
                  </td>
                  <td class="td-text">{{ formatDate(batch.createdat) }}</td>
                  <td>
                    <span :class="['expiry-val', getBatchExpiryClass(batch.expirationdate)]">
                      {{ batch.expirationdate ? formatDate(batch.expirationdate) : 'No expiry' }}
                    </span>
                  </td>
                  <td>
                    <span :class="['days-chip', getBatchExpiryClass(batch.expirationdate)]">{{ getDaysLabel(batch.expirationdate) }}</span>
                  </td>
                  <td>
                    <span :class="['fefo-status-badge', getBatchExpiryClass(batch.expirationdate)]">{{ getFEFOLabel(batch.expirationdate) }}</span>
                  </td>
                  <td>
                    <button class="icon-btn delete" @click="confirmDeleteBatch(batch)"><Trash2 :size="13" /></button>
                  </td>
                </tr>
                <tr v-if="itemBatches.length === 0">
                  <td colspan="7" class="empty-row">No batches for this item yet.</td>
                </tr>
              </tbody>
            </table>
            <div v-if="itemBatches.length > 0" class="batch-total-row">
              <span>Total across {{ itemBatches.length }} batch{{ itemBatches.length !== 1 ? 'es' : '' }}:</span>
              <strong>{{ itemBatches.reduce((s, b) => s + (b.quantity || 0), 0) }} {{ batchDetailItem?.unit }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ DELETE CONFIRM ══ -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="modal" @click.self="showDeleteConfirm = false">
          <div class="modal-content" style="max-width:420px">
            <div class="modal-header">
              <h2>{{ deleteType === 'batch' ? 'Remove Batch' : 'Remove Item' }}</h2>
              <button class="close-btn" @click="showDeleteConfirm = false">×</button>
            </div>
            <div class="modal-body">
              <p style="font-size:14px;margin-bottom:16px">
                <span v-if="deleteType === 'batch'">
                  Remove batch <strong>{{ deleteTarget?.batchLabel }}</strong>
                  ({{ deleteTarget?.quantity }} {{ deleteTarget?.rawproduct?.unit ?? batchDetailItem?.unit }})? Stock total will decrease by this amount.
                </span>
                <span v-else>
                  Remove <strong>{{ deleteTarget?.name }}</strong> and ALL its batches? This cannot be undone.
                </span>
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

    </template>

    <Teleport to="body">
      <div v-if="toast.show" :class="['toast-wrap', toast.type]">{{ toast.message }}</div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Plus, Package, AlertCircle, Search, Trash2, TrendingUp, Layers,
  ChevronDown, CalendarX, XCircle, RefreshCw, Info
} from 'lucide-vue-next'
import { supabase } from '@/supabase.js'

const route = useRoute()

// ─── BRANCH LOCK ──────────────────────────────────────────────────────────────
// Manager's branch is read from localStorage and NEVER changeable.
// All fetches are hard-filtered to this branchId.
const assignedBranchId   = ref(null)
const assignedBranchName = ref('')
const loadingBranch      = ref(true)

// ─── STATE ────────────────────────────────────────────────────────────────────
const isLoading          = ref(false)
const loadingBatches     = ref(false)
const loadingItemBatches = ref(false)
const savingNewItem      = ref(false)
const savingRestock      = ref(false)
const deleting           = ref(false)
const fetchBatchError    = ref('')

const allRawItems = ref([])
const allBatches  = ref([])

const activeTab         = ref('items')
const searchQuery       = ref('')
const filterCategory    = ref('')
const filterStatus      = ref('')
const batchSearch       = ref('')
const batchFilterExpiry = ref('')

const showNewItemModal = ref(false)
const newItemErrors    = ref({})
const newItemForm      = ref({
  name: '', category: '', unit: 'g',
  stockquantity: 0, reorderlevel: 0,
  expirationdate: '', leadtimedays: 2,
  hasexpiry: true
})

const showRestockModal  = ref(false)
const restockTarget     = ref(null)
const restockSelectedId = ref(null)
const restockErrors     = ref({})
const restockForm       = ref({ quantity: 0, expirationdate: '' })

const showDeleteConfirm = ref(false)
const deleteTarget      = ref(null)
const deleteType        = ref('item')

const showBatchDetail    = ref(false)
const batchDetailItem    = ref(null)
const itemBatches        = ref([])

const toast = ref({ show: false, message: '', type: 'success' })

// ─── RESOLVE ASSIGNED BRANCH ──────────────────────────────────────────────────
const resolveAssignedBranch = async () => {
  loadingBranch.value = true
  const slug = localStorage.getItem('branch')

  if (!slug || slug === 'all') {
    // No branch set — manager should always have one, show guard
    loadingBranch.value = false
    return
  }

  const { data, error } = await supabase
    .from('branch')
    .select('BranchId, BranchName')
    .ilike('BranchName', `%${slug}%`)
    .limit(1)
    .single()

  if (error || !data) {
    console.error('resolveAssignedBranch error:', error)
    loadingBranch.value = false
    return
  }

  assignedBranchId.value   = data.BranchId
  assignedBranchName.value = data.BranchName
  loadingBranch.value      = false
}

// ─── BATCH LABELLING ──────────────────────────────────────────────────────────
const buildBatchLabels = (batches) => {
  const groups = {}
  const sorted = [...batches].sort((a, b) => a.rawtransactionid - b.rawtransactionid)
  for (const b of sorted) {
    if (!groups[b.rawproductid]) groups[b.rawproductid] = []
    groups[b.rawproductid].push(b)
  }
  const labelMap = {}
  for (const [rid, rows] of Object.entries(groups)) {
    rows.forEach((b, i) => {
      labelMap[b.rawtransactionid] = i === 0 ? `B${rid}` : `B${rid}-${i + 1}`
    })
  }
  return labelMap
}

const batchLabelMap = computed(() => buildBatchLabels(allBatches.value))
const attachLabels = (batches, labelMap) =>
  batches.map(b => ({ ...b, batchLabel: labelMap[b.rawtransactionid] ?? `#${b.rawtransactionid}` }))

// ─── EOQ ─────────────────────────────────────────────────────────────────────
const calculateEOQ = (item) => {
  if (!item.reorderlevel) return 0
  const dailyUsage = item._dailyUsage > 0 ? item._dailyUsage : (item.reorderlevel / 14)
  const leadTime = item.leadtimedays ?? 2
  return Math.ceil(dailyUsage * leadTime * 1.5 + dailyUsage * leadTime)
}

// ─── DAILY USAGE FROM SALES ───────────────────────────────────────────────────
const fetchDailyUsageFromSales = async () => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString()

  const { data: orderItems, error: oi_err } = await supabase
    .from('orderitem')
    .select(`ProductId, Quantity, orders!inner ( OrderId, CreatedAt, Status, BranchId )`)
    .gte('orders.CreatedAt', since)
    .neq('orders.Status', 'cancelled')
    .eq('orders.BranchId', assignedBranchId.value)   // ← scoped to this branch's sales

  if (oi_err) { console.error('fetchDailyUsage error:', oi_err); return {} }

  const unitsSold = {}
  for (const row of (orderItems ?? [])) {
    unitsSold[row.ProductId] = (unitsSold[row.ProductId] ?? 0) + (row.Quantity ?? 0)
  }

  const { data: recipes, error: r_err } = await supabase
    .from('recipe')
    .select('rawproductid, finishedproductid, quantityneeded')

  if (r_err) { console.error('fetchDailyUsage recipe error:', r_err); return {} }

  const usageMap = {}
  for (const recipe of (recipes ?? [])) {
    const sold = unitsSold[recipe.finishedproductid] ?? 0
    const totalUsed = sold * (recipe.quantityneeded ?? 0)
    usageMap[recipe.rawproductid] = (usageMap[recipe.rawproductid] ?? 0) + totalUsed
  }

  const dailyMap = {}
  for (const [rid, total] of Object.entries(usageMap)) {
    dailyMap[rid] = total / 30
  }
  return dailyMap
}

// ─── COMPUTED ─────────────────────────────────────────────────────────────────
const filteredItems = computed(() => {
  let list = allRawItems.value
  if (searchQuery.value)    list = list.filter(i => i.name?.toLowerCase().includes(searchQuery.value.toLowerCase()))
  if (filterCategory.value) list = list.filter(i => i.category === filterCategory.value)
  if (filterStatus.value)   list = list.filter(i => getStatus(i) === filterStatus.value)
  return list
})

// Batches are already branch-scoped from the DB query — just sort FEFO
const sortedBatches = computed(() => {
  const labelled = attachLabels(allBatches.value, batchLabelMap.value)
  return [...labelled].sort((a, b) => {
    if (!a.expirationdate && !b.expirationdate) return 0
    if (!a.expirationdate) return 1
    if (!b.expirationdate) return -1
    return new Date(a.expirationdate) - new Date(b.expirationdate)
  })
})

const filteredBatches = computed(() => {
  let list = sortedBatches.value
  if (batchSearch.value) {
    const q = batchSearch.value.toLowerCase()
    list = list.filter(b =>
      b.rawproduct?.name?.toLowerCase().includes(q) ||
      b.batchLabel?.toLowerCase().includes(q) ||
      String(b.rawtransactionid).includes(q)
    )
  }
  if (batchFilterExpiry.value) {
    list = list.filter(b => getBatchExpiryClass(b.expirationdate) === batchFilterExpiry.value)
  }
  return list
})

const expiringBatches = computed(() =>
  sortedBatches.value.filter(b => b.expirationdate && getDaysUntilExpiry(b.expirationdate) <= 7)
)

const categories = computed(() =>
  [...new Set(allRawItems.value.map(i => i.category).filter(Boolean))].sort()
)

const eoqItems = computed(() =>
  allRawItems.value.filter(i => i.reorderlevel && (i.stockquantity ?? 0) <= i.reorderlevel)
)

const branchStats = computed(() => ({
  total:    allRawItems.value.length,
  low:      allRawItems.value.filter(i => i.reorderlevel && i.stockquantity > 0 && i.stockquantity <= i.reorderlevel).length,
  out:      allRawItems.value.filter(i => (i.stockquantity ?? 0) <= 0).length,
  expiring: expiringBatches.value.length,
}))

const restockPreviewItem = computed(() => {
  if (restockTarget.value) return restockTarget.value
  if (restockSelectedId.value) return allRawItems.value.find(i => i.rawproductid === restockSelectedId.value) ?? null
  return null
})

// ─── BATCH COUNT HELPERS ──────────────────────────────────────────────────────
// allBatches is already branch-scoped, so no extra filter needed
const getBatchCountForItem = (id) =>
  allBatches.value.filter(b => b.rawproductid === id).length

const getExpiringBatchCount = (id) =>
  allBatches.value.filter(b =>
    b.rawproductid === id && b.expirationdate && getDaysUntilExpiry(b.expirationdate) <= 7
  ).length

// ─── FETCH FUNCTIONS ──────────────────────────────────────────────────────────
const fetchBatches = async () => {
  if (!assignedBranchId.value) return
  loadingBatches.value = true
  fetchBatchError.value = ''

  // Hard-filter to this branch only
  const { data, error } = await supabase
    .from('rawproducttransaction')
    .select(`
      rawtransactionid,
      rawproductid,
      branchid,
      transactiontype,
      quantity,
      expirationdate,
      createdat,
      rawproduct ( name, unit, category )
    `)
    .eq('transactiontype', 'in')
    .eq('branchid', assignedBranchId.value)       // ← branch lock
    .gt('quantity', 0)
    .order('rawtransactionid', { ascending: true })

  if (error) {
    fetchBatchError.value = 'Failed to load batches: ' + error.message
    loadingBatches.value = false
    return
  }

  allBatches.value = data ?? []
  loadingBatches.value = false
}

const fetchRawMaterials = async () => {
  if (!assignedBranchId.value) return
  isLoading.value = true
  const dailyUsageMap = await fetchDailyUsageFromSales()

  const { data, error } = await supabase
    .from('rawproduct')
    .select('rawproductid, name, category, unit, reorderlevel, leadtimedays, expirationdate, createdat, updatedat, hasexpiry')
    .order('name')

  if (error) {
    showToast('Failed to load inventory: ' + error.message, 'error')
    isLoading.value = false
    return
  }

  const items = data ?? []

  // Stock quantity = sum of THIS BRANCH's batches only
  items.forEach(item => {
    const branchBatches = allBatches.value.filter(b => b.rawproductid === item.rawproductid)
    item.stockquantity = branchBatches.reduce((sum, b) => sum + (b.quantity ?? 0), 0)
  })

  // Only show items that actually have stock or batches in this branch
  // (filter out items that exist globally but have never been stocked here)
  const itemsWithPresence = items.filter(item => {
    const hasBatches = allBatches.value.some(b => b.rawproductid === item.rawproductid)
    return hasBatches || item.stockquantity > 0
  })

  allRawItems.value = itemsWithPresence.map(item => ({
    ...item,
    hasexpiry: item.hasexpiry ?? true,
    _dailyUsage: dailyUsageMap[item.rawproductid] ?? 0
  }))

  isLoading.value = false
}

const handleBatchTab = async () => {
  activeTab.value = 'batches'
  await fetchBatches()
}

// ─── NEW ITEM ─────────────────────────────────────────────────────────────────
const openNewItemModal = () => {
  newItemErrors.value = {}
  newItemForm.value = {
    name: '', category: '', unit: 'g',
    stockquantity: 0, reorderlevel: 0,
    expirationdate: '', leadtimedays: 2,
    hasexpiry: true
  }
  showNewItemModal.value = true
}
const closeNewItemModal = () => { showNewItemModal.value = false; newItemErrors.value = {} }

const saveNewItem = async () => {
  const e = {}
  if (!newItemForm.value.name.trim()) e.name = 'Name is required.'
  if (!newItemForm.value.unit)        e.unit = 'Unit is required.'
  if (newItemForm.value.hasexpiry && newItemForm.value.stockquantity > 0 && !newItemForm.value.expirationdate) {
    e.expirationdate = 'Expiration date is required for perishable items.'
  }
  newItemErrors.value = e
  if (Object.keys(e).length > 0) return

  savingNewItem.value = true

  const { data: newItem, error: itemErr } = await supabase
    .from('rawproduct')
    .insert([{
      name:           newItemForm.value.name.trim(),
      category:       newItemForm.value.category || null,
      unit:           newItemForm.value.unit,
      stockquantity:  newItemForm.value.stockquantity || 0,
      reorderlevel:   newItemForm.value.reorderlevel || null,
      leadtimedays:   newItemForm.value.leadtimedays || 2,
      expirationdate: newItemForm.value.expirationdate || null,
      hasexpiry:      newItemForm.value.hasexpiry,
    }])
    .select()
    .single()

  if (itemErr) {
    showToast('Failed to add item: ' + itemErr.message, 'error')
    savingNewItem.value = false
    return
  }

  if (newItemForm.value.stockquantity > 0 && newItem) {
    const { error: txErr } = await supabase
      .from('rawproducttransaction')
      .insert([{
        rawproductid:    newItem.rawproductid,
        branchid:        assignedBranchId.value,      // ← always this branch
        transactiontype: 'in',
        quantity:        newItemForm.value.stockquantity,
        expirationdate:  newItemForm.value.expirationdate || null,
      }])
    if (txErr) console.error('Initial batch insert error:', txErr)
  }

  showToast(`"${newItem.name}" added — SKU-${String(newItem.rawproductid).padStart(4,'0')}`, 'success')
  await Promise.all([fetchBatches(), fetchRawMaterials()])
  closeNewItemModal()
  savingNewItem.value = false
}

// ─── RESTOCK ──────────────────────────────────────────────────────────────────
const openRestockModal = (item) => {
  restockErrors.value = {}
  restockForm.value   = { quantity: 0, expirationdate: '' }
  restockTarget.value     = item
  restockSelectedId.value = item?.rawproductid ?? null
  showRestockModal.value  = true
}
const openRestockWithEOQ = (item) => {
  openRestockModal(item)
  restockForm.value.quantity = calculateEOQ(item)
}
const closeRestockModal = () => {
  showRestockModal.value  = false
  restockTarget.value     = null
  restockSelectedId.value = null
  restockErrors.value     = {}
}

const saveRestock = async () => {
  const e = {}
  if (!restockPreviewItem.value) {
    e.item = 'Please select an item.'
  } else {
    if (!restockForm.value.quantity || restockForm.value.quantity <= 0)
      e.quantity = 'Enter a valid quantity.'
    if (restockPreviewItem.value.hasexpiry !== false && !restockForm.value.expirationdate)
      e.expiry = 'Expiration date is required for this item.'
  }
  restockErrors.value = e
  if (Object.keys(e).length > 0) return

  savingRestock.value = true
  const item = restockPreviewItem.value

  // Fetch TRUE global stockquantity (all branches combined) to keep it in sync
  const { data: fresh } = await supabase
    .from('rawproduct')
    .select('stockquantity')
    .eq('rawproductid', item.rawproductid)
    .single()

  const newTotal = (fresh?.stockquantity ?? 0) + restockForm.value.quantity

  const { error: upErr } = await supabase
    .from('rawproduct')
    .update({ stockquantity: newTotal })
    .eq('rawproductid', item.rawproductid)

  if (upErr) {
    showToast('Failed to update stock: ' + upErr.message, 'error')
    savingRestock.value = false
    return
  }

  const { error: txErr } = await supabase
    .from('rawproducttransaction')
    .insert([{
      rawproductid:    item.rawproductid,
      branchid:        assignedBranchId.value,        // ← always this branch
      transactiontype: 'in',
      quantity:        restockForm.value.quantity,
      expirationdate:  restockForm.value.expirationdate || null,
    }])

  if (txErr) {
    showToast(`Stock updated but batch log failed: ${txErr.message}`, 'error')
    savingRestock.value = false
    await Promise.all([fetchBatches(), fetchRawMaterials()])
    closeRestockModal()
    return
  }

  showToast(`✓ Added ${restockForm.value.quantity} ${item.unit} of ${item.name}.`, 'success')
  await Promise.all([fetchBatches(), fetchRawMaterials()])
  if (showBatchDetail.value && batchDetailItem.value?.rawproductid === item.rawproductid) {
    await openBatchDetail(batchDetailItem.value)
  }
  closeRestockModal()
  savingRestock.value = false
}

// ─── BATCH DETAIL ─────────────────────────────────────────────────────────────
const openBatchDetail = async (item) => {
  batchDetailItem.value    = item
  showBatchDetail.value    = true
  loadingItemBatches.value = true
  itemBatches.value        = []

  const { data, error } = await supabase
    .from('rawproducttransaction')
    .select('rawtransactionid, rawproductid, branchid, quantity, expirationdate, createdat')
    .eq('rawproductid', item.rawproductid)
    .eq('transactiontype', 'in')
    .eq('branchid', assignedBranchId.value)           // ← branch lock
    .gt('quantity', 0)
    .order('rawtransactionid', { ascending: true })

  if (error) {
    showToast('Could not load batches: ' + error.message, 'error')
    loadingItemBatches.value = false
    return
  }

  const rows = data ?? []
  const labelled = rows.map((b, i) => ({
    ...b,
    rawproduct: { name: item.name, unit: item.unit },
    batchLabel: i === 0 ? `B${item.rawproductid}` : `B${item.rawproductid}-${i + 1}`
  }))

  itemBatches.value = labelled.sort((a, b) => {
    if (!a.expirationdate && !b.expirationdate) return 0
    if (!a.expirationdate) return 1
    if (!b.expirationdate) return -1
    return new Date(a.expirationdate) - new Date(b.expirationdate)
  })

  loadingItemBatches.value = false
}

const markBatchExpired = (batch) => confirmDeleteBatch(batch)

// ─── DELETE ───────────────────────────────────────────────────────────────────
const confirmDelete      = (item)  => { deleteTarget.value = item;  deleteType.value = 'item';  showDeleteConfirm.value = true }
const confirmDeleteBatch = (batch) => { deleteTarget.value = batch; deleteType.value = 'batch'; showDeleteConfirm.value = true }

const doDelete = async () => {
  deleting.value = true

  if (deleteType.value === 'batch') {
    const batch = deleteTarget.value
    const { data: fresh } = await supabase
      .from('rawproduct').select('stockquantity').eq('rawproductid', batch.rawproductid).single()
    const newQty = Math.max(0, (fresh?.stockquantity ?? 0) - (batch.quantity ?? 0))
    await supabase.from('rawproduct').update({ stockquantity: newQty }).eq('rawproductid', batch.rawproductid)
    const { error } = await supabase.from('rawproducttransaction').delete().eq('rawtransactionid', batch.rawtransactionid)
    if (error) {
      showToast('Failed to remove batch: ' + error.message, 'error')
    } else {
      showToast('Batch removed — stock total adjusted.', 'success')
      await Promise.all([fetchBatches(), fetchRawMaterials()])
      if (showBatchDetail.value && batchDetailItem.value) await openBatchDetail(batchDetailItem.value)
    }
  } else {
    // Only delete this branch's batches — don't touch other branches' stock
    const branchBatches = allBatches.value.filter(b => b.rawproductid === deleteTarget.value.rawproductid)
    const removedQty = branchBatches.reduce((s, b) => s + (b.quantity ?? 0), 0)
    const { data: fresh } = await supabase
      .from('rawproduct').select('stockquantity').eq('rawproductid', deleteTarget.value.rawproductid).single()
    const newQty = Math.max(0, (fresh?.stockquantity ?? 0) - removedQty)
    await supabase.from('rawproduct').update({ stockquantity: newQty }).eq('rawproductid', deleteTarget.value.rawproductid)
    // Delete only this branch's transaction rows — not the global product row
    await supabase.from('rawproducttransaction')
      .delete()
      .eq('rawproductid', deleteTarget.value.rawproductid)
      .eq('branchid', assignedBranchId.value)
    showToast('Item removed from this branch.', 'success')
    if (showBatchDetail.value) showBatchDetail.value = false
    await Promise.all([fetchBatches(), fetchRawMaterials()])
  }

  deleting.value = false
  showDeleteConfirm.value = false
}

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
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
const getStatusAfterRestock = (item, qty) => {
  const n = (item.stockquantity ?? 0) + qty
  if (n <= 0) return 'out'
  if (item.reorderlevel && n <= item.reorderlevel) return 'low'
  return 'good'
}
const getStatusTextAfterRestock = (item, qty) => {
  const s = getStatusAfterRestock(item, qty)
  return s === 'good' ? 'In Stock' : s === 'low' ? 'Low Stock' : 'Out of Stock'
}

// ─── EXPIRY HELPERS ───────────────────────────────────────────────────────────
const getDaysUntilExpiry = (date) => {
  if (!date) return 9999
  return Math.floor((new Date(date) - new Date()) / (1000 * 60 * 60 * 24))
}
const getBatchExpiryClass = (date) => {
  if (!date) return 'ok'
  const d = getDaysUntilExpiry(date)
  if (d < 0)  return 'expired'
  if (d <= 3) return 'critical'
  if (d <= 7) return 'warning'
  return 'ok'
}
const getDaysLabel = (date) => {
  if (!date) return '—'
  const d = getDaysUntilExpiry(date)
  if (d < 0)   return 'Expired'
  if (d === 0) return 'Today'
  return `${d}d left`
}
const getFEFOLabel = (date) => {
  if (!date) return 'No Expiry'
  const d = getDaysUntilExpiry(date)
  if (d < 0)  return 'Discard'
  if (d <= 3) return 'Use Now'
  if (d <= 7) return 'Use Soon'
  return 'OK'
}
const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const showToast = (msg, type = 'success') => {
  toast.value = { show: true, message: msg, type }
  setTimeout(() => { toast.value.show = false }, 4000)
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await resolveAssignedBranch()
  if (assignedBranchId.value) {
    await fetchBatches()
    await fetchRawMaterials()
  }
  const editId = route.query.edit
  if (editId) {
    const item = allRawItems.value.find(r => String(r.rawproductid) === editId)
    if (item) openRestockModal(item)
  }
})
</script>

<style scoped>
/* ─── BASE ─────────────────────────────────────────────── */
.inventory-content { padding: 24px 32px; font-family: 'Inter', sans-serif; background: #fafafa; min-height: 100vh; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.ph-left h1 { font-size: 26px; font-weight: 800; color: #31201D; margin: 0 0 6px; }
.ph-left p  { margin: 0; }

.branch-pill { display: inline-flex; align-items: center; gap: 7px; background: #f0ebe4; border: 1px solid #e0d0c0; border-radius: 20px; padding: 4px 12px 4px 8px; font-size: 13px; font-weight: 600; color: #5c3317; }
.branch-dot  { width: 8px; height: 8px; background: #8B4513; border-radius: 50%; flex-shrink: 0; }
.no-branch-warn { font-size: 13px; color: #dc2626; }

/* ─── NO BRANCH GUARD ──────────────────────────────────── */
.no-branch-card { background: white; border: 1px solid #E9ECEF; border-radius: 14px; padding: 48px 32px; text-align: center; margin-top: 20px; }
.nbc-icon { color: #dc2626; margin-bottom: 14px; }
.no-branch-card h2 { font-size: 18px; font-weight: 700; color: #212529; margin: 0 0 8px; }
.no-branch-card p  { font-size: 14px; color: #6C757D; margin: 0; }

/* ─── STATS ────────────────────────────────────────────── */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: white; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 14px; border: 1px solid #E9ECEF; }
.stat-card.warning       { border-left: 3px solid #f59e0b; }
.stat-card.danger        { border-left: 3px solid #ef4444; }
.stat-card.expiring-card { border-left: 3px solid #8b5cf6; }
.stat-icon               { color: #8B4513; }
.stat-icon.warn          { color: #f59e0b; }
.stat-icon.danger-icon   { color: #ef4444; }
.stat-icon.expiry-icon   { color: #8b5cf6; }
.stat-info h3  { font-size: 12px; color: #6C757D; font-weight: 600; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value    { font-size: 26px; font-weight: 800; color: #212529; margin: 0 0 2px; }
.stat-label    { font-size: 11px; color: #ADB5BD; }

/* ─── FEFO ALERT ───────────────────────────────────────── */
.fefo-alert { background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; }
.fefo-header { margin-bottom: 14px; }
.fefo-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.fefo-title-row h3 { font-size: 15px; font-weight: 700; color: #581c87; margin: 0; }
.fefo-badge { background: #7c3aed; color: white; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.fefo-sub   { font-size: 13px; color: #6b21a8; margin: 0; opacity: 0.8; }
.fefo-list  { display: flex; flex-direction: column; gap: 8px; }
.fefo-row   { display: flex; align-items: center; gap: 16px; background: white; border-radius: 8px; padding: 10px 14px; border: 1px solid #e9d5ff; flex-wrap: wrap; }
.fefo-item-info { flex: 1; min-width: 140px; }
.fefo-name  { display: block; font-weight: 700; font-size: 14px; color: #212529; }
.fefo-batch { display: block; font-size: 12px; color: #888; }
.fefo-expiry-info { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
.fefo-days.expired  { color: #dc2626; font-size: 13px; font-weight: 800; }
.fefo-days.critical { color: #dc2626; font-size: 13px; font-weight: 800; }
.fefo-days.warning  { color: #d97706; font-size: 13px; font-weight: 800; }
.fefo-date  { font-size: 11px; color: #888; }
.expire-btn { background: #dc2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.more-alerts{ font-size: 12px; color: #92400e; margin: 5px 0 0; }

/* ─── EOQ PANEL ────────────────────────────────────────── */
.eoq-panel { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
.eoq-header { margin-bottom: 12px; }
.eoq-title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.eoq-title-row h3 { font-size: 14px; font-weight: 700; color: #0c4a6e; margin: 0; }
.eoq-badge { background: #0369a1; color: white; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
.eoq-sub   { font-size: 12px; color: #0369a1; margin: 0; opacity: 0.8; }
.eoq-list  { display: flex; flex-direction: column; gap: 7px; }
.eoq-row   { display: flex; align-items: center; gap: 14px; background: white; border-radius: 8px; padding: 9px 14px; border: 1px solid #e0f2fe; flex-wrap: wrap; }
.eoq-item-info { flex: 1; min-width: 120px; }
.eoq-name  { display: block; font-weight: 700; font-size: 13px; color: #212529; }
.eoq-stock { display: block; font-size: 11px; color: #888; }
.usage-hint { color: #0369a1; font-weight: 600; }
.eoq-suggestion { display: flex; align-items: center; gap: 5px; }
.eoq-label { color: #888; font-size: 12px; }
.eoq-qty   { font-weight: 800; color: #0369a1; font-size: 14px; }
.eoq-restock-btn { background: #0369a1; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }

/* ─── TABS ─────────────────────────────────────────────── */
.tabs-row { display: flex; gap: 4px; margin-bottom: 16px; background: white; border: 1px solid #eee; border-radius: 10px; padding: 4px; width: fit-content; }
.tab-btn  { display: flex; align-items: center; gap: 7px; padding: 8px 18px; border: none; border-radius: 7px; background: none; font-size: 14px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s; }
.tab-btn.active             { background: #8B4513; color: white; }
.tab-btn:not(.active):hover { background: #f5f5f5; color: #8B4513; }
.tab-alert-dot { background: #ef4444; color: white; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 20px; margin-left: 2px; }

/* ─── INVENTORY SECTION ────────────────────────────────── */
.inventory-section { background: white; border-radius: 12px; border: 1px solid #E9ECEF; overflow: hidden; }
.section-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #E9ECEF; }
.section-header h2 { font-size: 17px; font-weight: 700; color: #212529; margin: 0 0 3px; }
.section-subtitle  { font-size: 13px; color: #6C757D; margin: 0; }
.header-actions    { display: flex; gap: 10px; }
.btn-primary { display: flex; align-items: center; gap: 7px; background: #8B4513; color: white; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; white-space: nowrap; }
.btn-primary:hover    { background: #A0522D; }
.btn-primary:disabled { opacity: .65; cursor: not-allowed; }
.btn-secondary-outline { display: flex; align-items: center; gap: 7px; background: white; color: #8B4513; border: 1px solid #8B4513; padding: 9px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; white-space: nowrap; }
.btn-secondary-outline:hover { background: #FFF4E6; }

.fefo-legend { display: flex; gap: 14px; align-items: center; }
.fl-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #555; }
.fl-dot  { width: 10px; height: 10px; border-radius: 50%; }
.fl-dot.expired  { background: #dc2626; }
.fl-dot.critical { background: #f97316; }
.fl-dot.warning  { background: #d97706; }
.fl-dot.ok       { background: #16a34a; }

.filters-bar { display: flex; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #F1F3F5; flex-wrap: wrap; align-items: center; }
.search-box  { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; border: 1px solid #E9ECEF; border-radius: 8px; padding: 8px 12px; }
.search-box input { flex: 1; border: none; outline: none; font-size: 14px; }
.select-wrap { position: relative; }
.select-wrap.sm { max-width: 170px; }
.filter-select { width: 100%; appearance: none; padding: 9px 32px 9px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; background: white; outline: none; cursor: pointer; box-sizing: border-box; }
.filter-select:focus { border-color: #8B4513; }
.sel-icon { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none; }

.loading-state { display: flex; align-items: center; gap: 12px; justify-content: center; padding: 50px; color: #999; font-size: 14px; }
.error-state   { display: flex; align-items: center; gap: 10px; justify-content: center; padding: 40px; color: #dc2626; font-size: 14px; }
.retry-btn     { background: #dc2626; color: white; border: none; padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; margin-left: 8px; }
.spinner { width: 18px; height: 18px; border: 2px solid #eee; border-top-color: #8B4513; border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ─── TABLE ────────────────────────────────────────────── */
.table-container { overflow-x: auto; }
.inventory-table { width: 100%; border-collapse: collapse; }
.inventory-table th { text-align: left; padding: 10px 16px; background: #F8F9FA; color: #495057; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #E9ECEF; white-space: nowrap; }
.inventory-table td { padding: 14px 16px; border-bottom: 1px solid #F1F3F5; vertical-align: middle; }
.inventory-table tr:hover td { background: #fafafa; }
.inventory-table tr.row-alert td { background: #fffbf0; }
.inventory-table tr.batch-row.expired td  { background: #fff5f5; }
.inventory-table tr.batch-row.critical td { background: #fff7ed; }
.inventory-table tr.batch-row.warning td  { background: #fffbeb; }

.product-info { display: flex; align-items: center; gap: 8px; }
.product-icon { color: #8B4513; flex-shrink: 0; }
.item-name-text { font-size: 17px; font-weight: 700; color: #212529; }
.td-text        { color: #555; font-size: 15px; }
.sku-label      { display: block; font-size: 12px; color: #bbb; font-family: monospace; margin-top: 3px; }
.empty-row      { text-align: center; color: #bbb; padding: 40px !important; font-size: 14px; }

.stock-cell { display: flex; flex-direction: column; gap: 4px; }
.qty-val { font-weight: 800; font-size: 18px; }
.qty-val.good     { color: #2E7D32; }
.qty-val.low      { color: #F57C00; }
.qty-val.out      { color: #C62828; }
.qty-val.expired  { color: #dc2626; }
.qty-val.warning  { color: #d97706; }
.qty-val.critical { color: #dc2626; }
.qty-val.ok       { color: #2E7D32; }
.stock-bar-wrap { width: 64px; height: 5px; background: #eee; border-radius: 3px; overflow: hidden; }
.stock-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }
.stock-bar.good { background: #4ade80; }
.stock-bar.low  { background: #fb923c; }
.stock-bar.out  { background: #f87171; }

.eoq-chip { background: #e0f2fe; color: #0369a1; font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 6px; white-space: nowrap; }

.batch-summary { cursor: pointer; }
.batch-summary:hover .batch-count { text-decoration: underline; }
.batch-count         { font-size: 15px; font-weight: 600; color: #555; display: block; }
.batch-expiring-warn { font-size: 12px; color: #d97706; font-weight: 700; display: block; }

.status-badge { display: inline-block; padding: 5px 13px; border-radius: 20px; font-size: 14px; font-weight: 600; }
.status-badge.good { background: #E8F5E9; color: #2E7D32; }
.status-badge.low  { background: #FFF3E0; color: #F57C00; }
.status-badge.out  { background: #FFEBEE; color: #C62828; }

.batch-id-tag { background: #f0ebe4; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-weight: 700; font-size: 13px; color: #5c3317; }

.expiry-val { font-size: 15px; font-weight: 700; }
.expiry-val.ok       { color: #2E7D32; }
.expiry-val.warning  { color: #d97706; }
.expiry-val.critical { color: #dc2626; }
.expiry-val.expired  { color: #dc2626; }

.days-chip { font-size: 13px; font-weight: 700; padding: 4px 11px; border-radius: 6px; }
.days-chip.ok       { background: #E8F5E9; color: #2E7D32; }
.days-chip.warning  { background: #FFF3E0; color: #d97706; }
.days-chip.critical { background: #FEF0E8; color: #dc2626; }
.days-chip.expired  { background: #FFEBEE; color: #dc2626; }

.fefo-status-badge { font-size: 13px; font-weight: 700; padding: 4px 11px; border-radius: 20px; }
.fefo-status-badge.ok       { background: #E8F5E9; color: #2E7D32; }
.fefo-status-badge.warning  { background: #FFF3E0; color: #d97706; }
.fefo-status-badge.critical { background: #FEF0E8; color: #dc2626; }
.fefo-status-badge.expired  { background: #FFEBEE; color: #dc2626; }

.actions-cell { display: flex; gap: 6px; }
.icon-btn { background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px; transition: 0.2s; display: flex; }
.icon-btn.restock       { color: #2E7D32; }
.icon-btn.restock:hover { background: #E8F5E9; }
.icon-btn.batches       { color: #7c3aed; }
.icon-btn.batches:hover { background: #f3e8ff; }
.icon-btn.delete        { color: #DC3545; }
.icon-btn.delete:hover  { background: #FFEBEE; }

/* ─── MODAL ────────────────────────────────────────────── */
.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px); }
.modal-content { background: white; border-radius: 14px; width: 90%; max-width: 580px; max-height: 92vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 22px; border-bottom: 1px solid #E9ECEF; }
.modal-header h2 { font-size: 17px; font-weight: 700; color: #212529; margin: 0 0 2px; }
.modal-sub { font-size: 13px; color: #888; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6C757D; line-height: 1; flex-shrink: 0; }
.close-btn:hover { color: #212529; }
.modal-body { padding: 22px; }

/* ─── FORMS ────────────────────────────────────────────── */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #495057; }
.label-hint { font-size: 11px; color: #0369a1; font-weight: 400; }
.form-group input,
.form-group select { width: 100%; padding: 10px 12px; border: 1px solid #E9ECEF; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; transition: 0.2s; }
.form-group input:focus, .form-group select:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.08); }
.form-row    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-error { font-size: 12px; color: #dc3545; margin-top: 4px; display: block; }
.divider-label { font-size: 12px; font-weight: 700; color: #8B4513; text-transform: uppercase; letter-spacing: 0.06em; margin: 20px 0 14px; padding-bottom: 6px; border-bottom: 1px solid #f0ebe4; }

/* ─── HASEXPIRY TOGGLE ─────────────────────────────────── */
.hasexpiry-toggle-row { display: flex; align-items: center; gap: 10px; background: #f8f9fa; border: 1px solid #E9ECEF; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; }
.hasexpiry-toggle-row input[type="checkbox"] { width: 17px; height: 17px; accent-color: #8B4513; cursor: pointer; flex-shrink: 0; }
.hasexpiry-toggle-row label { font-size: 14px; font-weight: 600; color: #212529; cursor: pointer; margin: 0; flex: 1; }
.hasexpiry-hint { font-size: 12px; color: #888; font-style: italic; white-space: nowrap; }

.no-expiry-note { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #0369a1; margin-top: 2px; }

/* ─── STEP PICKER ──────────────────────────────────────── */
.step-block { margin-bottom: 4px; }
.step-label { font-size: 13px; font-weight: 700; color: #495057; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
.step-num   { background: #8B4513; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; }

.item-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto; padding: 2px; margin-bottom: 12px; }
.item-picker-card { background: white; border: 2px solid #E9ECEF; border-radius: 10px; padding: 12px; cursor: pointer; transition: 0.2s; text-align: left; display: flex; flex-direction: column; gap: 4px; }
.item-picker-card:hover    { border-color: #8B4513; background: #FFF4E6; }
.item-picker-card.selected { border-color: #8B4513; background: #FFF4E6; box-shadow: 0 0 0 3px rgba(139,69,19,.1); }
.item-picker-card.alert    { border-color: #fbbf24; background: #fffbeb; }
.ipc-top    { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.ipc-sku    { font-size: 10px; color: #bbb; font-family: monospace; }
.ipc-status { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
.ipc-status.good { background: #E8F5E9; color: #2E7D32; }
.ipc-status.low  { background: #FFF3E0; color: #F57C00; }
.ipc-status.out  { background: #FFEBEE; color: #C62828; }
.ipc-name  { font-size: 13px; font-weight: 700; color: #212529; line-height: 1.3; }
.ipc-stock { font-size: 11px; color: #888; }

/* ─── RESTOCK CARD ─────────────────────────────────────── */
.restock-target-card { background: #f9f4ef; border: 1px solid #e8d5c4; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.rtc-top  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.rtc-name { display: flex; align-items: center; gap: 8px; font-size: 15px; color: #31201D; }
.rtc-sku  { font-size: 11px; color: #bbb; font-family: monospace; }
.rtc-stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 10px; margin-bottom: 10px; }
.rtc-stat  { background: white; border-radius: 8px; padding: 8px 10px; border: 1px solid #e8d5c4; }
.rtcs-label{ display: block; font-size: 10px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
.rtcs-val  { font-size: 14px; font-weight: 800; }
.rtcs-val.good    { color: #2E7D32; }
.rtcs-val.low     { color: #F57C00; }
.rtcs-val.out     { color: #C62828; }
.rtcs-val.neutral { color: #495057; }
.rtcs-val.blue    { color: #0369a1; }
.change-item-btn { background: none; border: none; color: #8B4513; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; text-decoration: underline; }

.branch-assigned-note { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 13px; color: #0369a1; }
.branch-assigned-note strong { color: #0c4a6e; }

/* ─── BATCH FORM ───────────────────────────────────────── */
.batch-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.bfg-card  { background: #f8f9fa; border: 1px solid #E9ECEF; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.bfg-label { font-size: 13px; font-weight: 600; color: #495057; margin: 0; }
.bfg-qty-row { display: flex; align-items: stretch; gap: 8px; }
.bfg-qty-input { flex: 1; min-width: 0; padding: 10px 12px; border: 1.5px solid #ddd; border-radius: 8px; font-size: 22px; font-weight: 800; color: #212529; outline: none; transition: border-color 0.2s; width: 0; }
.bfg-qty-input:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.08); }
.bfg-unit-badge { background: #e9ecef; color: #495057; font-size: 13px; font-weight: 700; padding: 0 12px; border-radius: 8px; display: flex; align-items: center; white-space: nowrap; flex-shrink: 0; }
.bfg-date-input { width: 100%; padding: 10px 12px; border: 1.5px solid #ddd; border-radius: 8px; font-size: 15px; font-weight: 600; color: #212529; outline: none; box-sizing: border-box; transition: border-color 0.2s; }
.bfg-date-input:focus { border-color: #8B4513; box-shadow: 0 0 0 3px rgba(139,69,19,.08); }
.eoq-fill-btn { display: flex; align-items: center; gap: 5px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; width: fit-content; }
.eoq-fill-btn:hover { background: #bae6fd; }

/* ─── RESTOCK PREVIEW ──────────────────────────────────── */
.restock-preview { background: #f9f9f9; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; }
.rp-row { display: flex; justify-content: space-between; font-size: 14px; color: #555; }
.rp-row.add   { color: #2E7D32; font-weight: 600; }
.rp-row.total { font-size: 16px; font-weight: 800; color: #212529; padding-top: 8px; border-top: 1px solid #eee; margin-top: 3px; }

.fefo-note { display: flex; align-items: flex-start; gap: 8px; background: #fdf4ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 10px 13px; font-size: 12px; color: #6b21a8; }
.fefo-note strong { color: #581c87; }

.info-box { display: flex; align-items: flex-start; gap: 10px; background: #f0f7ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin: 16px 0; font-size: 13px; color: #1e40af; }
.info-box strong { color: #1d4ed8; }

.batch-total-row { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8f9fa; border-top: 2px solid #E9ECEF; font-size: 14px; color: #555; }
.batch-total-row strong { color: #212529; font-size: 16px; }

/* ─── MODAL ACTIONS ────────────────────────────────────── */
.modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #E9ECEF; }
.btn-secondary { background: #F8F9FA; border: 1px solid #E9ECEF; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: 0.2s; }
.btn-secondary:hover { background: #E9ECEF; }
.btn-danger { background: #dc3545; color: white; border: none; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s; }
.btn-danger:hover:not(:disabled) { background: #b02a37; }
.btn-danger:disabled { opacity: .65; cursor: not-allowed; }

/* ─── TOAST ────────────────────────────────────────────── */
.toast-wrap { position: fixed; bottom: 24px; right: 24px; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,.12); z-index: 9999; animation: slideUp .2s ease; max-width: 420px; }
.toast-wrap.success { background: #d1e7dd; color: #0a3622; }
.toast-wrap.error   { background: #f8d7da; color: #58151c; }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* ─── RESPONSIVE ───────────────────────────────────────── */
@media (max-width: 768px) {
  .inventory-content { padding: 16px; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .form-row, .batch-form-grid { grid-template-columns: 1fr; }
  .rtc-stat-grid { grid-template-columns: 1fr 1fr; }
  .filters-bar, .header-actions { flex-direction: column; }
  .fefo-row, .eoq-row { flex-direction: column; align-items: flex-start; }
  .fefo-legend { flex-wrap: wrap; gap: 8px; }
  .hasexpiry-toggle-row { flex-wrap: wrap; }
  .hasexpiry-hint { width: 100%; }
}
</style>