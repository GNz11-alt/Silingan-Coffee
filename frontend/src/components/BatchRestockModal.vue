<template>
  <Teleport to="body">
    <div v-if="show" class="brm-overlay" @click.self="$emit('close')">
      <div class="brm-modal">
        <div class="brm-header">
          <div>
            <h2>Batch Restock</h2>
            <p class="brm-sub">Add multiple items in one session</p>
          </div>
          <button class="brm-close" @click="$emit('close')">×</button>
        </div>

        <div class="brm-body">
          <!-- Branch selector if in All Branches mode -->
          <div v-if="!selectedBranchId" class="brm-branch-block">
            <label class="brm-label">Destination Branch *</label>
            <div class="brm-select-wrap">
              <select v-model="batchBranchId" class="brm-select">
                <option :value="null">Select branch...</option>
                <option v-for="b in branches" :key="b.BranchId" :value="b.BranchId">
                  {{ b.BranchName }}
                </option>
              </select>
              <ChevronDown :size="13" class="brm-sel-icon" />
            </div>
            <span v-if="branchError" class="brm-err">{{ branchError }}</span>
          </div>
          <div v-else class="brm-branch-note">
            Restocking for <strong>{{ branchName }}</strong>
          </div>

          <!-- Rows table -->
          <div class="brm-table-wrap">
            <table class="brm-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                  <th>Notes</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in rows" :key="idx" class="brm-row">
                  <!-- Item picker -->
                  <td class="brm-td-item">
                    <div class="brm-select-wrap brm-item-select">
                      <select
                        v-model="row.rawproductid"
                        class="brm-select brm-item-sel"
                        @change="onItemSelect(row)"
                      >
                        <option :value="null">— select item —</option>
                        <option
                          v-for="item in sortedItems"
                          :key="item.rawproductid"
                          :value="item.rawproductid"
                        >
                          {{ item.name }}
                          ({{ item.stockquantity ?? 0 }} {{ item.unit }})
                        </option>
                      </select>
                      <ChevronDown :size="12" class="brm-sel-icon" />
                    </div>
                    <div v-if="row.rawproductid" class="brm-row-meta">
                      <span class="brm-row-sku">SKU-{{ String(row.rawproductid).padStart(4,'0') }}</span>
                      <span :class="['brm-row-status', getItemStatus(row.rawproductid)]">
                        {{ getItemStatusText(row.rawproductid) }}
                      </span>
                      <span v-if="getItemEOQ(row.rawproductid)" class="brm-eoq-hint">
                        EOQ: {{ getItemEOQ(row.rawproductid) }} {{ getItemUnit(row.rawproductid) }}
                        <button class="brm-eoq-fill" @click="row.quantity = getItemEOQ(row.rawproductid)">Fill</button>
                      </span>
                    </div>
                    <span v-if="row.errors?.item" class="brm-err">{{ row.errors.item }}</span>
                  </td>

                  <!-- Quantity -->
                  <td class="brm-td-qty">
                    <div class="brm-qty-wrap">
                      <input
                        v-model.number="row.quantity"
                        type="number"
                        min="1"
                        class="brm-qty-input"
                        placeholder="0"
                      />
                      <span class="brm-unit">{{ getItemUnit(row.rawproductid) }}</span>
                    </div>
                    <span v-if="row.errors?.quantity" class="brm-err">{{ row.errors.quantity }}</span>
                  </td>

                  <!-- Expiry -->
                  <td class="brm-td-expiry">
                    <template v-if="getItemHasExpiry(row.rawproductid)">
                      <input
                        v-model="row.expirationdate"
                        type="date"
                        class="brm-date-input"
                      />
                      <span v-if="row.errors?.expiry" class="brm-err">{{ row.errors.expiry }}</span>
                    </template>
                    <span v-else class="brm-no-expiry">Non-perishable</span>
                  </td>

                  <!-- Notes -->
                  <td class="brm-td-notes">
                    <input
                      v-model="row.notes"
                      type="text"
                      class="brm-notes-input"
                      placeholder="optional note..."
                    />
                  </td>

                  <!-- Remove -->
                  <td class="brm-td-remove">
                    <button
                      v-if="rows.length > 1"
                      class="brm-remove-btn"
                      @click="removeRow(idx)"
                      title="Remove row"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add row -->
          <button class="brm-add-row-btn" @click="addRow">
            <Plus :size="14" /> Add Another Item
          </button>

          <!-- Summary -->
          <div v-if="filledRows.length > 0" class="brm-summary">
            <div class="brm-sum-title">Batch Summary</div>
            <div class="brm-sum-row" v-for="row in filledRows" :key="row.rawproductid + '-sum'">
              <span class="brm-sum-name">{{ getItemName(row.rawproductid) }}</span>
              <span class="brm-sum-qty">+{{ row.quantity }} {{ getItemUnit(row.rawproductid) }}</span>
              <span v-if="row.expirationdate" class="brm-sum-expiry">exp {{ formatDate(row.expirationdate) }}</span>
              <span v-else class="brm-sum-expiry">no expiry</span>
            </div>
            <div class="brm-sum-total">
              {{ filledRows.length }} item type{{ filledRows.length !== 1 ? 's' : '' }} to restock
            </div>
          </div>

          <!-- Global error -->
          <div v-if="globalError" class="brm-global-err">{{ globalError }}</div>
        </div>

        <div class="brm-footer">
          <button class="brm-btn-cancel" @click="$emit('close')">Cancel</button>
          <button
            class="brm-btn-confirm"
            :disabled="saving || filledRows.length === 0"
            @click="confirmBatch"
          >
            {{ saving ? `Saving ${saveProgress}/${filledRows.length}...` : `Confirm ${filledRows.length || ''} Restock${filledRows.length !== 1 ? 's' : ''}` }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Plus, Trash2, ChevronDown } from 'lucide-vue-next'
import { supabase } from '@/supabase.js'

const props = defineProps({
  show: Boolean,
  items: { type: Array, default: () => [] },
  branches: { type: Array, default: () => [] },
  selectedBranchId: { type: Number, default: null },
  branchName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'done'])

const batchBranchId = ref(props.selectedBranchId)
const branchError = ref('')
const saving = ref(false)
const saveProgress = ref(0)
const globalError = ref('')

const makeRow = () => ({
  rawproductid: null,
  quantity: 0,
  expirationdate: '',
  notes: '',
  errors: {},
})

const rows = ref([makeRow()])

watch(() => props.show, (v) => {
  if (v) {
    rows.value = [makeRow()]
    batchBranchId.value = props.selectedBranchId
    globalError.value = ''
    branchError.value = ''
    saveProgress.value = 0
  }
})

const sortedItems = computed(() =>
  [...props.items].sort((a, b) => {
    const sa = getStatus(a)
    const sb = getStatus(b)
    const order = { out: 0, low: 1, good: 2 }
    return (order[sa] ?? 2) - (order[sb] ?? 2) || (a.name ?? '').localeCompare(b.name ?? '')
  })
)

const getItem = (id) => props.items.find(i => i.rawproductid === id)
const getItemUnit = (id) => getItem(id)?.unit ?? ''
const getItemName = (id) => getItem(id)?.name ?? '—'
const getItemHasExpiry = (id) => {
  const item = getItem(id)
  return item ? (item.hasexpiry !== false) : true
}
const getStatus = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'out'
  if (item.reorderlevel != null && item.stockquantity <= item.reorderlevel) return 'low'
  return 'good'
}
const getItemStatus = (id) => {
  const item = getItem(id)
  return item ? getStatus(item) : 'good'
}
const getItemStatusText = (id) => {
  const s = getItemStatus(id)
  return s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'In Stock'
}
const calcEOQ = (item) => {
  if (!item?.reorderlevel) return 0
  const daily = (item._dailyUsage > 0) ? item._dailyUsage : item.reorderlevel / 14
  const lead = item.leadtimedays ?? 2
  return Math.ceil(daily * lead * 1.5 + daily * lead)
}
const getItemEOQ = (id) => {
  const item = getItem(id)
  return item ? calcEOQ(item) : 0
}

const onItemSelect = (row) => {
  row.quantity = getItemEOQ(row.rawproductid) || 0
  row.expirationdate = ''
  row.errors = {}
}

const filledRows = computed(() =>
  rows.value.filter(r => r.rawproductid && r.quantity > 0)
)

const addRow = () => rows.value.push(makeRow())
const removeRow = (idx) => rows.value.splice(idx, 1)

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const confirmBatch = async () => {
  globalError.value = ''
  branchError.value = ''

  const targetBranch = props.selectedBranchId ?? batchBranchId.value
  if (!targetBranch) {
    branchError.value = 'Please select a destination branch.'
    return
  }

  // Validate rows
  let hasErrors = false
  rows.value.forEach(row => {
    row.errors = {}
    if (!row.rawproductid) { row.errors.item = 'Select an item.'; hasErrors = true }
    if (!row.quantity || row.quantity <= 0) { row.errors.quantity = 'Enter quantity.'; hasErrors = true }
    if (row.rawproductid && getItemHasExpiry(row.rawproductid) && !row.expirationdate) {
      row.errors.expiry = 'Expiry required.'; hasErrors = true
    }
  })
  if (hasErrors) return

  saving.value = true
  saveProgress.value = 0

  const filled = filledRows.value
  let successCount = 0

  for (const row of filled) {
    saveProgress.value++
    const item = getItem(row.rawproductid)
    if (!item) continue

    const { error: txErr } = await supabase
      .from('rawproducttransaction')
      .insert([{
        rawproductid: row.rawproductid,
        branchid: targetBranch,
        transactiontype: 'in',
        quantity: row.quantity,
        expirationdate: row.expirationdate || null,
        notes: row.notes || null,
      }])

    if (txErr) {
      console.error(`Failed row ${row.rawproductid}:`, txErr)
      continue
    }

    const newQty = (item.stockquantity ?? 0) + row.quantity
    await supabase
      .from('rawproduct')
      .update({ stockquantity: newQty })
      .eq('rawproductid', row.rawproductid)

    successCount++
  }

  saving.value = false

  if (successCount === 0) {
    globalError.value = 'All rows failed to save. Please try again.'
    return
  }

  if (successCount < filled.length) {
    globalError.value = `${successCount}/${filled.length} rows saved. Some failed — check console.`
  }

  emit('done', { count: successCount })
  emit('close')
}
</script>

<style scoped>
.brm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  z-index: 1500; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px); padding: 20px;
}
.brm-modal {
  background: white; border-radius: 14px; width: 100%; max-width: 900px;
  max-height: 94vh; overflow: hidden; display: flex; flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}
.brm-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 24px; border-bottom: 1px solid #e9ecef; flex-shrink: 0;
}
.brm-header h2 { font-size: 17px; font-weight: 700; color: #212529; margin: 0 0 2px; }
.brm-sub { font-size: 13px; color: #888; margin: 0; }
.brm-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d; }
.brm-body { padding: 20px 24px; flex: 1; overflow-y: auto; }
.brm-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 24px; border-top: 1px solid #e9ecef; flex-shrink: 0;
}

.brm-branch-block {
  background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px;
  padding: 14px; margin-bottom: 16px;
}
.brm-branch-note {
  background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #0369a1;
}
.brm-label { font-size: 13px; font-weight: 600; color: #495057; display: block; margin-bottom: 8px; }
.brm-select-wrap { position: relative; }
.brm-sel-icon {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  color: #999; pointer-events: none;
}
.brm-select {
  width: 100%; appearance: none; padding: 9px 30px 9px 11px;
  border: 1px solid #ddd; border-radius: 8px; font-size: 14px;
  background: white; outline: none; cursor: pointer; box-sizing: border-box;
}

/* Table */
.brm-table-wrap { overflow-x: auto; margin-bottom: 12px; }
.brm-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.brm-table th {
  background: #f8f9fa; font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: #495057; padding: 8px 10px;
  border-bottom: 1px solid #e9ecef; text-align: left;
}
.brm-row td { padding: 10px; border-bottom: 1px solid #f1f3f5; vertical-align: top; }
.brm-row:hover td { background: #fafafa; }

.brm-td-item { min-width: 220px; }
.brm-item-select { max-width: 100%; }
.brm-item-sel { font-size: 14px; }
.brm-row-meta { display: flex; gap: 8px; align-items: center; margin-top: 5px; flex-wrap: wrap; }
.brm-row-sku { font-size: 10px; color: #bbb; font-family: monospace; }
.brm-row-status { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 10px; }
.brm-row-status.good { background: #e8f5e9; color: #2e7d32; }
.brm-row-status.low { background: #fff3e0; color: #f57c00; }
.brm-row-status.out { background: #ffebee; color: #c62828; }
.brm-eoq-hint { font-size: 11px; color: #0369a1; display: flex; align-items: center; gap: 5px; }
.brm-eoq-fill {
  background: #e0f2fe; border: none; color: #0369a1; font-size: 10px; font-weight: 700;
  padding: 1px 7px; border-radius: 5px; cursor: pointer;
}

.brm-td-qty { width: 130px; }
.brm-qty-wrap { display: flex; align-items: center; gap: 6px; }
.brm-qty-input {
  width: 80px; padding: 7px 8px; border: 1.5px solid #ddd; border-radius: 7px;
  font-size: 16px; font-weight: 700; text-align: center; outline: none;
}
.brm-qty-input:focus { border-color: #8b4513; }
.brm-unit { font-size: 12px; color: #888; white-space: nowrap; }

.brm-td-expiry { width: 150px; }
.brm-date-input {
  width: 100%; padding: 7px 10px; border: 1.5px solid #ddd; border-radius: 7px;
  font-size: 13px; outline: none; box-sizing: border-box;
}
.brm-date-input:focus { border-color: #8b4513; }
.brm-no-expiry {
  display: inline-block; background: #f0f9ff; border: 1px solid #bae6fd;
  color: #0369a1; font-size: 12px; padding: 4px 10px; border-radius: 6px;
}

.brm-td-notes { min-width: 150px; }
.brm-notes-input {
  width: 100%; padding: 7px 10px; border: 1px solid #ddd; border-radius: 7px;
  font-size: 13px; outline: none; box-sizing: border-box;
}

.brm-td-remove { width: 40px; text-align: center; }
.brm-remove-btn {
  background: none; border: none; cursor: pointer; padding: 6px; border-radius: 6px;
  color: #dc3545; display: flex;
}
.brm-remove-btn:hover { background: #ffebee; }

.brm-add-row-btn {
  display: flex; align-items: center; gap: 8px;
  background: #f8f9fa; border: 1.5px dashed #cbd5e1; border-radius: 9px;
  padding: 9px 18px; font-size: 14px; font-weight: 600; color: #555;
  cursor: pointer; width: 100%; justify-content: center; transition: 0.15s; margin-bottom: 14px;
}
.brm-add-row-btn:hover { background: #fff4e6; border-color: #8b4513; color: #8b4513; }

/* Summary */
.brm-summary {
  background: #f9f4ef; border: 1px solid #e8d5c4; border-radius: 10px;
  padding: 14px 16px;
}
.brm-sum-title { font-size: 12px; font-weight: 700; color: #8b4513; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
.brm-sum-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0; border-bottom: 1px solid #f0e8df; font-size: 13px; flex-wrap: wrap;
}
.brm-sum-row:last-of-type { border-bottom: none; }
.brm-sum-name { flex: 1; font-weight: 600; color: #31201d; }
.brm-sum-qty { font-weight: 800; color: #2e7d32; }
.brm-sum-expiry { font-size: 11px; color: #888; }
.brm-sum-total { margin-top: 10px; font-size: 14px; font-weight: 700; color: #31201d; text-align: right; }

.brm-err { font-size: 11px; color: #dc3545; display: block; margin-top: 3px; }
.brm-global-err {
  background: #fff5f5; border: 1px solid #fca5a5; border-radius: 8px;
  padding: 10px 14px; color: #dc2626; font-size: 13px; margin-top: 10px;
}

/* Buttons */
.brm-btn-cancel {
  background: #f8f9fa; border: 1px solid #e9ecef; padding: 9px 18px;
  border-radius: 8px; cursor: pointer; font-size: 14px;
}
.brm-btn-confirm {
  background: #2e7d32; color: white; border: none; padding: 9px 22px;
  border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 700; transition: 0.2s;
}
.brm-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.brm-btn-confirm:not(:disabled):hover { background: #1b5e20; }
</style>
