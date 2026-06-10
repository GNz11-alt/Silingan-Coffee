<template>
  <Teleport to="body">
    <div v-if="show" class="srm-overlay" @click.self="$emit('close')">
      <div class="srm-modal">
        <div class="srm-header">
          <div>
            <h2>Reduce Stock</h2>
            <p class="srm-sub">Log a non-sale reduction — spoilage, spillage, sampling, etc.</p>
          </div>
          <button class="srm-close" @click="$emit('close')">×</button>
        </div>

        <div class="srm-body">
          <!-- Item selector -->
          <div v-if="!selectedItem" class="srm-step">
            <p class="srm-step-label">Which item?</p>
            <div class="srm-search-wrap">
              <Search :size="14" />
              <input v-model="search" type="text" placeholder="Search items..." class="srm-search" />
            </div>
            <div class="srm-item-grid">
              <button
                v-for="item in filteredItems"
                :key="item.rawproductid"
                class="srm-item-card"
                @click="selectItem(item)"
              >
                <div class="srm-ic-top">
                  <span class="srm-ic-sku">SKU-{{ String(item.rawproductid).padStart(4,'0') }}</span>
                  <span :class="['srm-ic-badge', getStatus(item)]">{{ getStatusText(item) }}</span>
                </div>
                <span class="srm-ic-name">{{ item.name }}</span>
                <span class="srm-ic-stock">{{ item.stockquantity ?? 0 }} {{ item.unit }}</span>
              </button>
            </div>
            <p v-if="filteredItems.length === 0" class="srm-empty">No items found.</p>
          </div>

          <!-- Form step -->
          <div v-else class="srm-step">
            <!-- Selected item card -->
            <div class="srm-selected-card">
              <div class="srm-sc-left">
                <Package :size="16" />
                <div>
                  <strong>{{ selectedItem.name }}</strong>
                  <span class="srm-sc-sku">SKU-{{ String(selectedItem.rawproductid).padStart(4,'0') }}</span>
                </div>
              </div>
              <div class="srm-sc-stock">
                <span :class="['srm-sc-qty', getStatus(selectedItem)]">
                  {{ selectedItem.stockquantity ?? 0 }}
                </span>
                <span class="srm-sc-unit">{{ selectedItem.unit }} in stock</span>
              </div>
              <button class="srm-change-btn" @click="selectedItem = null; form.quantity = 0">← Change</button>
            </div>

            <!-- Reason selector -->
            <div class="srm-section-label">Reason for reduction *</div>
            <div class="srm-reasons-grid">
              <button
                v-for="r in reasons"
                :key="r.value"
                :class="['srm-reason-btn', form.reason === r.value ? 'active' : '']"
                @click="form.reason = r.value"
              >
                <span class="srm-reason-icon">{{ r.icon }}</span>
                <span class="srm-reason-label">{{ r.label }}</span>
              </button>
            </div>
            <span v-if="errors.reason" class="srm-err">{{ errors.reason }}</span>

            <!-- Custom reason (if "Other") -->
            <div v-if="form.reason === 'other'" class="srm-form-group">
              <label>Specify reason *</label>
              <input v-model="form.customReason" type="text" placeholder="Describe the reason..." class="srm-input" />
              <span v-if="errors.customReason" class="srm-err">{{ errors.customReason }}</span>
            </div>

            <!-- Quantity -->
            <div class="srm-form-row">
              <div class="srm-form-group">
                <label>Quantity to reduce *</label>
                <div class="srm-qty-row">
                  <input
                    v-model.number="form.quantity"
                    type="number"
                    min="1"
                    :max="selectedItem.stockquantity"
                    class="srm-qty-input"
                    placeholder="0"
                  />
                  <span class="srm-unit-badge">{{ selectedItem.unit }}</span>
                </div>
                <span v-if="errors.quantity" class="srm-err">{{ errors.quantity }}</span>
              </div>
              <div class="srm-form-group">
                <label>Date of reduction</label>
                <input v-model="form.date" type="date" class="srm-input" />
              </div>
            </div>

            <!-- Notes -->
            <div class="srm-form-group">
              <label>Additional notes <span class="srm-opt">(optional)</span></label>
              <textarea v-model="form.notes" rows="2" placeholder="" class="srm-textarea"></textarea>
            </div>

            <!-- Live preview -->
            <div class="srm-preview" v-if="form.quantity > 0">
              <div class="srm-prev-row">
                <span>Current stock</span>
                <span>{{ selectedItem.stockquantity }} {{ selectedItem.unit }}</span>
              </div>
              <div class="srm-prev-row srm-prev-deduct">
                <span>− This reduction</span>
                <span>−{{ form.quantity }} {{ selectedItem.unit }}</span>
              </div>
              <div class="srm-prev-row srm-prev-total">
                <span>Remaining stock</span>
                <span :class="getStatusAfter()">{{ Math.max(0, (selectedItem.stockquantity ?? 0) - form.quantity) }} {{ selectedItem.unit }}</span>
              </div>
            </div>

            <!-- Warning if stock will go below reorder -->
            <div
              v-if="form.quantity > 0 && willTriggerAlert"
              class="srm-alert-warn"
            >
              ⚠ After this reduction, stock will be {{ willGoOut ? 'OUT' : 'LOW' }}. Consider reordering.
            </div>
          </div>
        </div>

        <div class="srm-footer">
          <button class="srm-btn-cancel" @click="$emit('close')">Cancel</button>
          <button
            v-if="selectedItem"
            class="srm-btn-confirm"
            :disabled="saving"
            @click="confirm"
          >
            {{ saving ? 'Saving...' : 'Confirm Reduction' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Package, Search } from 'lucide-vue-next'
import { supabase } from '@/supabase.js'

const props = defineProps({
  show: Boolean,
  items: { type: Array, default: () => [] },
  selectedBranchId: { type: Number, default: null },
  preselectedItem: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])

watch(() => props.preselectedItem, (val) => {
  if (val) selectItem(val)
}, { immediate: true })

const search = ref('')
const selectedItem = ref(null)
const saving = ref(false)
const errors = ref({})

const today = new Date().toISOString().split('T')[0]
const form = ref({
  reason: '',
  customReason: '',
  quantity: 0,
  notes: '',
  date: today,
})

const reasons = [
  { value: 'spoilage', icon: '🦠', label: 'Spoilage' },
  { value: 'spillage', icon: '💧', label: 'Spillage / Spill' },
  { value: 'sampling', icon: '🧪', label: 'Sampling / Testing' },
  { value: 'expired', icon: '📅', label: 'Expired Stock' },
  { value: 'damaged', icon: '📦', label: 'Damaged Goods' },
  { value: 'theft', icon: '🚨', label: 'Theft / Loss' },
  { value: 'staff_meal', icon: '🍽️', label: 'Staff Meal / Consumed' },
  { value: 'correction', icon: '✏️', label: 'Stock Correction' },
  { value: 'other', icon: '📝', label: 'Other' },
]

const filteredItems = computed(() => {
  if (!search.value) return props.items
  return props.items.filter(i => i.name?.toLowerCase().includes(search.value.toLowerCase()))
})

const getStatus = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'out'
  if (item.reorderlevel != null && item.stockquantity <= item.reorderlevel) return 'low'
  return 'good'
}
const getStatusText = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return 'Out of Stock'
  if (item.reorderlevel != null && item.stockquantity <= item.reorderlevel) return 'Low Stock'
  return 'In Stock'
}

const getStatusAfter = () => {
  const newQty = (selectedItem.value?.stockquantity ?? 0) - form.value.quantity
  if (newQty <= 0) return 'srm-after-out'
  if (selectedItem.value?.reorderlevel && newQty <= selectedItem.value.reorderlevel) return 'srm-after-low'
  return 'srm-after-good'
}

const willGoOut = computed(() => {
  if (!selectedItem.value) return false
  return (selectedItem.value.stockquantity ?? 0) - form.value.quantity <= 0
})
const willTriggerAlert = computed(() => {
  if (!selectedItem.value || form.value.quantity <= 0) return false
  const newQty = (selectedItem.value.stockquantity ?? 0) - form.value.quantity
  return newQty <= 0 || (selectedItem.value.reorderlevel != null && newQty <= selectedItem.value.reorderlevel)
})

const selectItem = (item) => {
  selectedItem.value = item
  form.value = { reason: '', customReason: '', quantity: 0, notes: '', date: today }
  errors.value = {}
}

const confirm = async () => {
  const e = {}
  if (!form.value.reason) e.reason = 'Please select a reason.'
  if (form.value.reason === 'other' && !form.value.customReason.trim()) e.customReason = 'Please specify the reason.'
  if (!form.value.quantity || form.value.quantity <= 0) e.quantity = 'Enter a valid quantity.'
  if (form.value.quantity > (selectedItem.value?.stockquantity ?? 0)) e.quantity = 'Cannot reduce more than current stock.'
  errors.value = e
  if (Object.keys(e).length > 0) return

  saving.value = true
  const item = selectedItem.value
  const reasonLabel = form.value.reason === 'other' ? form.value.customReason : form.value.reason
  const targetBranchId = props.selectedBranchId

  // Insert an "out" transaction
  const { error: txErr } = await supabase
    .from('rawproducttransaction')
    .insert([{
      rawproductid: item.rawproductid,
      branchid: targetBranchId,
      transactiontype: 'out',
      quantity: form.value.quantity,
      notes: `[${reasonLabel}]${form.value.notes ? ' ' + form.value.notes : ''}`,
      expirationdate: null,
    }])

  if (txErr) {
    alert('Failed to log reduction: ' + txErr.message)
    saving.value = false
    return
  }

  // Update rawproduct stockquantity
  const newQty = Math.max(0, (item.stockquantity ?? 0) - form.value.quantity)
  await supabase
    .from('rawproduct')
    .update({ stockquantity: newQty })
    .eq('rawproductid', item.rawproductid)

  saving.value = false
  emit('done', { item, qty: form.value.quantity, reason: reasonLabel })
  emit('close')
}
</script>

<style scoped>
.srm-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  z-index: 1500; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.srm-modal {
  background: white; border-radius: 14px; width: 90%; max-width: 600px;
  max-height: 92vh; overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
  display: flex; flex-direction: column;
}
.srm-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 22px; border-bottom: 1px solid #e9ecef;
}
.srm-header h2 { font-size: 19px; font-weight: 700; color: #212529; margin: 0 0 2px; }
.srm-sub { font-size: 13px; color: #888; margin: 0; }
.srm-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d; }
.srm-body { padding: 20px 22px; flex: 1; overflow-y: auto; }
.srm-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 14px 22px; border-top: 1px solid #e9ecef;
}

/* Step label */
.srm-step-label {
  font-size: 18px; font-weight: 700; color: #1a1d1f;
  margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
}
.srm-step-num {
  background: #dc2626; color: white;
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; flex-shrink: 0;
}

/* Search + item grid */
.srm-search-wrap {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid #e9ecef; border-radius: 8px; padding: 8px 12px;
  margin-bottom: 12px; color: #888;
}
.srm-search { flex: 1; border: none; outline: none; font-size: 14px; }
.srm-item-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px; max-height: 260px; overflow-y: auto;
}
.srm-item-card {
  background: white; border: 1.5px solid #e9ecef; border-radius: 10px;
  padding: 11px 12px; cursor: pointer; text-align: left;
  display: flex; flex-direction: column; gap: 4px; transition: 0.2s;
}
.srm-item-card:hover { border-color: #dc2626; background: #fff5f5; }
.srm-ic-top { display: flex; justify-content: space-between; align-items: center; }
.srm-ic-sku { font-size: 10px; color: #bbb; font-family: monospace; }
.srm-ic-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
.srm-ic-badge.good { background: #e8f5e9; color: #2e7d32; }
.srm-ic-badge.low { background: #fff3e0; color: #f57c00; }
.srm-ic-badge.out { background: #ffebee; color: #c62828; }
.srm-ic-name { font-size: 13px; font-weight: 700; color: #212529; }
.srm-ic-stock { font-size: 11px; color: #888; }
.srm-empty { text-align: center; color: #bbb; font-size: 14px; padding: 20px; }

/* Selected card */
.srm-selected-card {
  display: flex; align-items: center; gap: 12px;
  background: #fdf4ef; border: 1px solid #e8d5c4; border-radius: 10px;
  padding: 12px 14px; margin-bottom: 16px; flex-wrap: wrap;
}
.srm-sc-left { display: flex; align-items: center; gap: 10px; flex: 1; }
.srm-sc-left strong { font-size: 15px; color: #31201d; display: block; }
.srm-sc-sku { font-size: 11px; color: #bbb; font-family: monospace; display: block; }
.srm-sc-stock { display: flex; flex-direction: column; align-items: flex-end; }
.srm-sc-qty { font-size: 22px; font-weight: 800; }
.srm-sc-qty.good { color: #2e7d32; }
.srm-sc-qty.low { color: #f57c00; }
.srm-sc-qty.out { color: #c62828; }
.srm-sc-unit { font-size: 12px; color: #888; }
.srm-change-btn { background: none; border: none; color: #8b4513; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: underline; }

/* Reasons */
.srm-section-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
  color: #dc2626; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #fde8e8;
}
.srm-reasons-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px; margin-bottom: 12px;
}
.srm-reason-btn {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  padding: 10px 8px; border: 1.5px solid #e9ecef; border-radius: 10px;
  background: white; cursor: pointer; transition: 0.15s;
}
.srm-reason-btn:hover { border-color: #dc2626; background: #fff5f5; }
.srm-reason-btn.active { border-color: #dc2626; background: #fff5f5; box-shadow: 0 0 0 2px rgba(220,38,38,0.12); }
.srm-reason-icon { font-size: 20px; }
.srm-reason-label { font-size: 12px; font-weight: 600; color: #212529; text-align: center; }

/* Form fields */
.srm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 12px; }
.srm-form-group { margin-bottom: 12px; }
.srm-form-group label { display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #495057; }
.srm-input {
  width: 100%; padding: 9px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-size: 14px; outline: none; box-sizing: border-box; transition: 0.2s;
}
.srm-input:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
.srm-textarea {
  width: 100%; padding: 9px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-size: 14px; outline: none; resize: vertical; box-sizing: border-box; font-family: inherit;
}
.srm-qty-row { display: flex; gap: 8px; align-items: stretch; }
.srm-qty-input {
  flex: 1; padding: 9px 12px; border: 1.5px solid #ddd; border-radius: 8px;
  font-size: 22px; font-weight: 800; text-align: center; outline: none; transition: 0.2s;
}
.srm-qty-input:focus { border-color: #dc2626; }
.srm-unit-badge {
  background: #f0ebe4; color: #555; font-size: 13px; font-weight: 700;
  padding: 0 12px; border-radius: 8px; display: flex; align-items: center;
}
.srm-opt { font-size: 11px; color: #bbb; font-weight: 400; }
.srm-err { font-size: 12px; color: #dc3545; display: block; margin-top: 4px; }

/* Preview */
.srm-preview {
  background: #f9f9f9; border-radius: 10px; padding: 12px 16px;
  display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px;
}
.srm-prev-row { display: flex; justify-content: space-between; font-size: 14px; color: #555; }
.srm-prev-deduct { color: #dc2626; font-weight: 600; }
.srm-prev-total { font-size: 16px; font-weight: 800; color: #212529; padding-top: 7px; border-top: 1px solid #eee; margin-top: 2px; }
.srm-after-good { color: #2e7d32; }
.srm-after-low { color: #f57c00; }
.srm-after-out { color: #dc2626; }

.srm-alert-warn {
  background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
  padding: 10px 14px; font-size: 13px; color: #92400e; font-weight: 600; margin-bottom: 10px;
}

/* Buttons */
.srm-btn-cancel {
  background: #f8f9fa; border: 1px solid #e9ecef; padding: 9px 18px;
  border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500;
}
.srm-btn-confirm {
  background: #dc2626; color: white; border: none; padding: 9px 20px;
  border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: 0.2s;
}
.srm-btn-confirm:disabled { opacity: 0.6; cursor: not-allowed; }
.srm-btn-confirm:not(:disabled):hover { background: #b91c1c; }
</style>
