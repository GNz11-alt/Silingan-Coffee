<template>
  <Teleport to="body">
    <div v-if="show" class="prf-overlay" @click.self="$emit('close')">
      <div class="prf-modal">
        <!-- Screen header -->
        <div class="prf-screen-header no-print">
          <div>
            <h2>Purchase Reorder Form</h2>
            <p>{{ outOfStock.length + lowStock.length }} items need attention</p>
          </div>
          <div class="prf-header-actions">
            <button class="prf-btn-outline" @click="$emit('close')">✕ Close</button>
            <button class="prf-btn-print" @click="doPrint" :disabled="isExporting">
              <Printer :size="15" /> {{ isExporting ? 'Generating...' : 'Export PDF' }}
            </button>
          </div>
        </div>

        <!-- PRINTABLE AREA -->
        <div class="prf-printable" id="prf-print-area">
          <!-- Print Header -->
          <div class="prf-doc-header">
            <div class="prf-doc-left">
              <div class="prf-doc-logo"></div>
              <div>
                <h1 class="prf-doc-title">Purchase Reorder Order</h1>
                <p class="prf-doc-meta">{{ branchName }} &nbsp;·&nbsp; Generated {{ today }}</p>
              </div>
            </div>
            <div class="prf-doc-right">
              <div class="prf-doc-field">
                <span class="prf-field-label">PO Number</span>
                <span class="prf-field-val prf-po">{{ poNumber }}</span>
              </div>
              <div class="prf-doc-field">
                <span class="prf-field-label">Prepared by</span>
                <span class="prf-field-val">{{ preparedBy }}</span>
              </div>
              <div class="prf-doc-field">
                <span class="prf-field-label">Supplier</span>
                <span class="prf-field-val">
                  <input
                    v-model="supplierName"
                    type="text"
                    class="prf-inline-input no-print"
                    placeholder="Supplier name"
                  />
                  <span class="print-only">{{ supplierName || '_______________' }}</span>
                </span>
              </div>
              <div class="prf-doc-field">
                <span class="prf-field-label">Date needed</span>
                <span class="prf-field-val">
                  <input
                    v-model="dateNeeded"
                    type="date"
                    class="prf-inline-input no-print"
                  />
                  <span class="print-only">{{ dateNeeded || '_______________' }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Summary boxes -->
          <div class="prf-summary-row">
            <div class="prf-summary-box prf-s-red">
              <span class="prf-s-num">{{ outOfStock.length }}</span>
              <span class="prf-s-label">Out of Stock</span>
            </div>
            <div class="prf-summary-box prf-s-amber">
              <span class="prf-s-num">{{ lowStock.length }}</span>
              <span class="prf-s-label">Low Stock</span>
            </div>
            <div class="prf-summary-box prf-s-blue">
              <span class="prf-s-num">{{ outOfStock.length + lowStock.length }}</span>
              <span class="prf-s-label">Total Items</span>
            </div>
          </div>

          <!-- OUT OF STOCK -->
          <template v-if="outOfStock.length > 0">
            <div class="prf-section-label prf-label-red">
              ⚠ Out of Stock — Urgent
            </div>
            <table class="prf-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Reorder Point</th>
                  <th>EOQ Suggestion</th>
                  <th>Order Qty</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, i) in outOfStock"
                  :key="item.rawproductid"
                  class="prf-row-urgent"
                >
                  <td class="prf-td-num">{{ i + 1 }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td class="prf-mono">SKU-{{ String(item.rawproductid).padStart(4, '0') }}</td>
                  <td>{{ item.category || '—' }}</td>
                  <td>{{ item.unit }}</td>
                  <td class="prf-td-center prf-text-red"><strong>0</strong></td>
                  <td class="prf-td-center">{{ item.reorderlevel || '—' }}</td>
                  <td class="prf-td-center prf-text-blue">
                    <strong>{{ calcEOQ(item) }}</strong>
                  </td>
                  <td class="prf-td-input">
                    <input
                      v-model.number="orderQtys[item.rawproductid]"
                      type="number"
                      min="0"
                      class="prf-qty-input no-print"
                      :placeholder="calcEOQ(item)"
                    />
                    <span class="print-only prf-print-line">{{ orderQtys[item.rawproductid] || calcEOQ(item) }}</span>
                  </td>
                  <td class="prf-td-input">
                    <input
                      v-model="supplierNotes[item.rawproductid]"
                      type="text"
                      class="prf-notes-input no-print"
                      placeholder="notes"
                    />
                    <span class="print-only prf-print-line">{{ supplierNotes[item.rawproductid] || '' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- LOW STOCK -->
          <template v-if="lowStock.length > 0">
            <div class="prf-section-label prf-label-amber">
              ↓ Low Stock — Replenish Soon
            </div>
            <table class="prf-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>Item Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th>Current Stock</th>
                  <th>Reorder Point</th>
                  <th>EOQ Suggestion</th>
                  <th>Order Qty</th>
                  <th>Supplier / Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, i) in lowStock"
                  :key="item.rawproductid"
                  class="prf-row-low"
                >
                  <td class="prf-td-num">{{ i + 1 }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td class="prf-mono">SKU-{{ String(item.rawproductid).padStart(4, '0') }}</td>
                  <td>{{ item.category || '—' }}</td>
                  <td>{{ item.unit }}</td>
                  <td class="prf-td-center prf-text-amber">
                    <strong>{{ item.stockquantity }}</strong>
                  </td>
                  <td class="prf-td-center">{{ item.reorderlevel }}</td>
                  <td class="prf-td-center prf-text-blue">
                    <strong>{{ calcEOQ(item) }}</strong>
                  </td>
                  <td class="prf-td-input">
                    <input
                      v-model.number="orderQtys[item.rawproductid]"
                      type="number"
                      min="0"
                      class="prf-qty-input no-print"
                      :placeholder="calcEOQ(item)"
                    />
                    <span class="print-only prf-print-line">{{ orderQtys[item.rawproductid] || calcEOQ(item) }}</span>
                  </td>
                  <td class="prf-td-input">
                    <input
                      v-model="supplierNotes[item.rawproductid]"
                      type="text"
                      class="prf-notes-input no-print"
                      placeholder="Supplier / notes..."
                    />
                    <span class="print-only prf-print-line">{{ supplierNotes[item.rawproductid] || '' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Totals row -->
          <div class="prf-totals-row">
            <span class="prf-total-label">Total items to order:</span>
            <span class="prf-total-val">{{ totalOrderQty }} {{ 'units' }}</span>
          </div>

          <!-- Approval signatures -->
          <div class="prf-signatures">
            <div class="prf-sig-block">
              <div class="prf-sig-line"></div>
              <span>Prepared by</span>
            </div>
            <div class="prf-sig-block">
              <div class="prf-sig-line"></div>
              <span>Approved by (Manager)</span>
            </div>
            <div class="prf-sig-block">
              <div class="prf-sig-line"></div>
              <span>Received by (Supplier)</span>
            </div>
            <div class="prf-sig-block">
              <div class="prf-sig-line"></div>
              <span>Date Received</span>
            </div>
          </div>

          <div class="prf-footer-note">
            Auto-generated by Inventory Management System&nbsp;&nbsp; &nbsp;·&nbsp; PO {{ poNumber }}
          </div>
        </div>
        <!-- end printable -->

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Printer } from 'lucide-vue-next'
import { exportPurchaseOrderPdf } from '@/services/purchaseOrderService.js'

const props = defineProps({
  show: Boolean,
  items: { type: Array, default: () => [] },
  branchName: { type: String, default: 'All Branches' },
  preparedBy: { type: String, default: 'Staff' },
})
const emit = defineEmits(['close'])

const dateNeeded = ref('')
const orderQtys = ref({})
const supplierNotes = ref({})
const supplierName = ref('')
const isExporting = ref(false)

const today = computed(() =>
  new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
)

const poNumber = computed(() => {
  const d = new Date()
  return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}` //idk how to do this bruh
})

const outOfStock = computed(() =>
  props.items.filter(i => (i.stockquantity ?? 0) <= 0)
)
const lowStock = computed(() =>
  props.items.filter(i =>
    i.reorderlevel != null && i.stockquantity > 0 && i.stockquantity <= i.reorderlevel
  )
)

const calcEOQ = (item) => {
  if (!item.reorderlevel) return 0
  const daily = item._dailyUsage > 0 ? item._dailyUsage : item.reorderlevel / 14
  const lead = item.leadtimedays ?? 2
  return Math.ceil(daily * lead * 1.5 + daily * lead)
}

const totalOrderQty = computed(() => {
  const allItems = [...outOfStock.value, ...lowStock.value]
  return allItems.reduce((sum, item) => {
    return sum + (orderQtys.value[item.rawproductid] || calcEOQ(item) || 0)
  }, 0)
})

// Pre-fill EOQ when items change
watch(() => props.items, () => {
  const all = [...(outOfStock.value), ...(lowStock.value)]
  all.forEach(item => {
    if (!orderQtys.value[item.rawproductid]) {
      orderQtys.value[item.rawproductid] = calcEOQ(item)
    }
  })
}, { immediate: true, deep: true })

const buildOrderPayload = () => {
  const allItems = [...outOfStock.value, ...lowStock.value]
  return allItems.map(item => ({
    ...item,
    eoq: calcEOQ(item),
    orderQty: orderQtys.value[item.rawproductid] || calcEOQ(item) || 0,
    supplierNote: supplierNotes.value[item.rawproductid] || '',
  }))
}

const doPrint = async () => {
  if (isExporting.value) return

  isExporting.value = true
  try {
    await exportPurchaseOrderPdf({
      branchName: props.branchName,
      preparedBy: props.preparedBy,
      poNumber: poNumber.value,
      dateNeeded: dateNeeded.value,
      supplierName: supplierName.value || 'General Supplier',
      items: buildOrderPayload(),
      download: true,
      saveToSupabase: false,
    })
  } catch (error) {
    console.error('[PurchaseOrderPDF] Export failed:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped>
.prf-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 20px;
}
.prf-modal {
  background: #fff;
  width: 100%;
  max-width: 1100px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

/* Screen-only header */
.prf-screen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #31201d;
  color: white;
}
.prf-screen-header h2 {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 3px;
}
.prf-screen-header p {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
}
.prf-header-actions {
  display: flex;
  gap: 10px;
}
.prf-btn-outline {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.4);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}
.prf-btn-print {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #8b4513;
  border: none;
  color: white;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.prf-btn-print:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Printable content */
.prf-printable {
  padding: 28px 32px;
  font-family: "Inter", sans-serif;
  color: #1a1a1a;
}

.prf-doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #31201d;
  padding-bottom: 18px;
  margin-bottom: 20px;
}
.prf-doc-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.prf-doc-logo {
  font-size: 36px;
}
.prf-doc-title {
  font-size: 22px;
  font-weight: 700;
  color: #31201d;
  margin: 0 0 4px;
}
.prf-doc-meta {
  font-size: 13px;
  color: #666;
  margin: 0;
  font-family: 'Arial', sans-serif;
}
.prf-doc-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
.prf-doc-field {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: "Inter", sans-serif;
}
.prf-field-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
}
.prf-field-val {
  font-size: 13px;
  color: #1a1a1a;
  font-weight: 600;
}
.prf-po {
  font-family: monospace;
  color: #8b4513;
}
.prf-inline-input {
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 4px 8px;
  font-size: 13px;
  outline: none;
}

/* Summary boxes */
.prf-summary-row {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}
.prf-summary-box {
  flex: 1;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.prf-s-red {
  background: #fff5f5;
  border: 1px solid #fca5a5;
}
.prf-s-amber {
  background: #fffbeb;
  border: 1px solid #fcd34d;
}
.prf-s-blue {
  background: #eff6ff;
  border: 1px solid #93c5fd;
}
.prf-s-num {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  font-family: Arial, sans-serif;
}
.prf-s-red .prf-s-num { color: #dc2626; }
.prf-s-amber .prf-s-num { color: #d97706; }
.prf-s-blue .prf-s-num { color: #1d4ed8; }
.prf-s-label {
  font-size: 12px;
  color: #555;
  font-family: "Inter", sans-serif;
}

/* Section labels */
.prf-section-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 10px;
  margin-top: 16px;
  font-family: "Inter", sans-serif;
}
.prf-label-red {
  background: #fff5f5;
  color: #dc2626;
  border-left: 4px solid #dc2626;
}
.prf-label-amber {
  background: #fffbeb;
  color: #b45309;
  border-left: 4px solid #d97706;
}

/* Table */
.prf-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 14px;
  font-family: "Inter", sans-serif;
  font-size: 13px;
}
.prf-table th {
  background: #f5f0eb;
  color: #31201d;
  font-weight: 700;
  padding: 8px 10px;
  text-align: left;
  border: 1px solid #e0d6cc;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.prf-table td {
  padding: 9px 10px;
  border: 1px solid #ede8e3;
  vertical-align: middle;
}
.prf-row-urgent td {
  background: #fff8f8;
}
.prf-row-low td {
  background: #fefdf8;
}
.prf-td-num {
  color: #999;
  font-size: 12px;
  text-align: center;
}
.prf-td-center {
  text-align: center;
}
.prf-mono {
  font-family: monospace;
  font-size: 12px;
  color: #888;
}
.prf-text-red { color: #dc2626; }
.prf-text-amber { color: #d97706; }
.prf-text-blue { color: #1d4ed8; }

.prf-td-input {
  min-width: 100px;
}
.prf-qty-input {
  width: 80px;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  outline: none;
}
.prf-notes-input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.prf-print-line {
  display: none;
}

/* Totals */
.prf-totals-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  padding: 10px 14px;
  background: #f5f0eb;
  border-radius: 8px;
  font-family: Arial, sans-serif;
}
.prf-total-label {
  font-size: 14px;
  color: #555;
}
.prf-total-val {
  font-size: 18px;
  font-weight: 800;
  color: #31201d;
}

/* Signatures */
.prf-signatures {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-top: 40px;
  margin-bottom: 24px;
}
.prf-sig-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-family: "Inter", sans-serif;
}
.prf-sig-line {
  height: 1px;
  background: #333;
  width: 100%;
}
.prf-sig-block span {
  font-size: 11px;
  color: #666;
  text-align: center;
}
.prf-footer-note {
  font-size: 10px;
  color: #bbb;
  text-align: center;
  margin-top: 10px;
  font-family: "Inter", sans-serif;
  border-top: 1px solid #eee;
  padding-top: 10px;
}

/* Print media */
@media print {
  .prf-overlay {
    position: static;
    background: none;
    padding: 0;
  }
  .prf-modal {
    border-radius: 0;
    box-shadow: none;
  }
  .no-print {
    display: none !important;
  }
  .print-only {
    display: inline !important;
  }
  .prf-print-line {
    display: inline !important;
  }
  .prf-printable {
    padding: 16px;
  }
  .prf-table {
    page-break-inside: auto;
  }
  .prf-table tr {
    page-break-inside: avoid;
  }
  body * {
    visibility: hidden;
  }
  #prf-print-area, #prf-print-area * {
    visibility: visible;
  }
  #prf-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
}
</style>
