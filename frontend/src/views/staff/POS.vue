<template>
  <div class="pos-root">
    <!-- TOP BAR -->
    <header class="pos-topbar">
      <div class="topbar-left">
        <div class="brand-mark"><Coffee :size="20" /><span>Silingan POS</span></div>
        <div class="topbar-meta">
          <span class="meta-branch">{{ branchAddress || branchRecord?.BranchName || 'Main Branch' }}</span>
          <span class="meta-sep">·</span>
          <span class="meta-cashier">{{ cashierName }}</span>
          <span class="meta-sep">·</span>
          <span class="meta-date">{{ currentDate }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <button class="history-btn" @click="openHistory">
          <History :size="15" /> Today's Sales
          <span v-if="transactions.length > 0" class="history-count">{{ transactions.length }}</span>
        </button>
      </div>
    </header>

    <!-- MAIN POS LAYOUT -->
    <div class="pos-layout">
      <!-- LEFT: Category Sidebar -->
      <aside class="category-sidebar">
        <p class="sidebar-label">Category</p>
        <button
          v-for="cat in ['All', ...menuCategories]" :key="cat"
          :class="['cat-btn', activeCategory === cat ? 'active' : '']"
          @click="activeCategory = cat"
        >
          <component :is="getCatIcon(cat)" :size="14" />
          <span>{{ cat }}</span>
        </button>
      </aside>

      <!-- CENTER: Menu Grid -->
      <main class="menu-area">
        <div class="menu-search-row">
          <div class="menu-search">
            <Search :size="15" />
            <input v-model="menuSearch" placeholder="Search menu..." />
          </div>
          <!-- OOS filter toggle -->
          <button
            :class="['oos-filter-btn', hideOOS ? 'active' : '']"
            @click="hideOOS = !hideOOS"
            title="Hide out-of-stock items"
          >
            <Eye :size="14" /> {{ hideOOS ? 'Show All' : 'Hide OOS' }}
          </button>
        </div>

        <div v-if="loadingMenu" class="menu-loading"><div class="spin"></div> Loading menu...</div>
        <div v-else-if="filteredMenu.length === 0" class="menu-empty">No items found.</div>
        <div v-else class="menu-grid">
          <button
            v-for="item in filteredMenu" :key="item.ProductId"
            class="menu-card"
            :class="{
              'in-cart': isInCart(item.ProductId),
              'out-of-stock-card': isProductUnavailable(item),
              'low-stock-card': !isProductUnavailable(item) && isProductLow(item),
            }"
            @click="handleMenuCardClick(item)"
          >
            <div class="menu-card-img">
              <img v-if="item.image_url" :src="item.image_url" :alt="item.ProductName" class="menu-card-photo" />
              <component v-else :is="getCatIcon(item.Category)" :size="40" class="menu-card-icon" />
              <span v-if="isInCart(item.ProductId)" class="cart-qty-badge">{{ getCartTotalQty(item.ProductId) }}</span>
              <span v-if="getSizeType(item.Category) !== 'none'" class="size-chip">{{ getSizeLabels(item.Category).join(' / ') }}</span>
              <!-- OOS overlay with ingredient name -->
              <div v-if="isProductUnavailable(item)" class="oos-overlay">
                <AlertTriangle :size="16" />
                <span>Out of Stock</span>
                <span class="oos-overlay-detail">{{ getOOSShortLabel(item) }}</span>
              </div>
              <!-- Low stock warning badge -->
              <div v-else-if="isProductLow(item)" class="low-stock-badge">
                <AlertTriangle :size="10" /> Low Stock
              </div>
            </div>
            <div class="menu-card-info">
              <span class="menu-card-name">{{ item.ProductName }}</span>
              <span class="menu-card-cat">{{ item.Category }}</span>
              <span class="menu-card-price">
                <template v-if="getSizeType(item.Category) !== 'none'">from ₱{{ getBasePrice(item) }}</template>
                <template v-else>₱{{ item.Price?.toFixed(2) }}</template>
              </span>
            </div>
          </button>
        </div>
      </main>

      <!-- RIGHT: Cart Panel -->
      <aside class="cart-panel">
        <div class="cart-panel-header">
          <h2>Current Order</h2>
          <button v-if="cart.length > 0" class="clear-cart-btn" @click="cart = []"><X :size="13" /> Clear</button>
        </div>

        <div class="order-type-row">
          <button :class="['order-type-btn', orderType === 'dine_in' ? 'active-dine' : '']" @click="orderType = 'dine_in'"><UtensilsCrossed :size="13" /> Dine In</button>
          <button :class="['order-type-btn', orderType === 'take_out' ? 'active-take' : '']" @click="orderType = 'take_out'"><ShoppingBag :size="13" /> Take Out</button>
        </div>

        <div class="cart-items" v-if="cart.length > 0">
          <div v-for="(item, i) in cart" :key="i" class="cart-item">
            <div class="ci-info">
              <span class="ci-name">{{ item.ProductName }}</span>
              <span v-if="item.size" class="ci-size-tag">{{ item.size }}</span>
            </div>
            <div class="ci-price-row"><span class="ci-price">₱{{ item.effectivePrice?.toFixed(2) }} each</span></div>
            <div class="ci-controls">
              <button class="qty-btn" @click="decreaseQty(i)"><Minus :size="11" /></button>
              <span class="ci-qty">{{ item.qty }}</span>
              <button class="qty-btn" @click="increaseQty(i)"><Plus :size="11" /></button>
              <button class="ci-remove" @click="removeFromCart(i)"><Trash2 :size="13" /></button>
            </div>
            <div class="ci-subtotal">₱{{ (item.qty * item.effectivePrice).toFixed(2) }}</div>
          </div>
        </div>

        <div v-else class="cart-empty">
          <ShoppingCart :size="34" class="cart-empty-icon" />
          <p>No items yet</p>
          <span>Tap a menu item to add</span>
        </div>

        <!-- Discount -->
        <div v-if="cart.length > 0" class="cart-discount">
          <label class="discount-lbl"><Tag :size="12" /> Discount</label>
          <div class="sel-wrap">
            <select v-model="selectedDiscount" class="discount-sel" @change="onDiscountChange">
              <option :value="null">No discount</option>
              <option v-for="d in discounts" :key="d.discountid" :value="d">
                {{ d.discountname }} ({{ d.discounttype === 'percentage' ? d.discountvalue + '%' : '₱' + d.discountvalue }} off)
              </option>
            </select>
            <ChevronDown :size="12" class="sel-icon" />
          </div>
          <div v-if="selectedDiscount" class="discount-id-field">
            <label class="discount-id-label"><CreditCard :size="12" />{{ getDiscountIdLabel(selectedDiscount) }} *</label>
            <input v-model="discountIdNumber" type="text" class="discount-id-input" :placeholder="getDiscountIdPlaceholder(selectedDiscount)" maxlength="30" />
            <span v-if="discountIdError" class="discount-id-error">{{ discountIdError }}</span>
          </div>
        </div>

        <!-- Totals -->
        <div v-if="cart.length > 0" class="cart-totals">
          <div class="ct-row"><span>Subtotal</span><span>₱{{ cartSubtotal.toFixed(2) }}</span></div>
          <div class="ct-row disc-line" v-if="selectedDiscount"><span>Discount</span><span>-₱{{ discountAmount.toFixed(2) }}</span></div>
          <div class="ct-row"><span>VAT (12%)</span><span>₱{{ vatAmount.toFixed(2) }}</span></div>
          <div class="ct-row grand"><span>Total</span><span>₱{{ finalTotal.toFixed(2) }}</span></div>
        </div>

        <button class="checkout-btn" :disabled="cart.length === 0" @click="openPayment">
          <CreditCard :size="17" /> Proceed to Payment
        </button>
      </aside>
    </div>

    <!-- ── OOS ALERT MODAL (with ingredient detail) ── -->
    <div v-if="showOosAlert" class="overlay" @click.self="showOosAlert = false">
      <div class="oos-modal">
        <div class="oos-icon"><AlertTriangle :size="36" /></div>
        <h3>Cannot Add Item</h3>
        <p><strong>{{ oosProductName }}</strong> cannot be prepared — insufficient raw materials:</p>
        <div class="oos-list">
          <div v-for="item in oosIngredients" :key="item.rawproductid" class="oos-item">
            <span class="oos-dot"></span>
            <span class="oos-name">{{ item.name }}</span>
            <span class="oos-qty">
              Need {{ formatQtyDisplay(item.needed, item.unit) }},
              have {{ formatQtyDisplay(item.available, item.unit) }}
            </span>
          </div>
        </div>
        <p class="oos-footer-note">Please restock in Inventory Management.</p>
        <button class="oos-close-btn" @click="showOosAlert = false">OK, Got It</button>
      </div>
    </div>

    <!-- ── SIZE PICKER MODAL ── -->
    <div v-if="showSizePicker" class="overlay" @click.self="showSizePicker = false">
      <div class="size-modal">
        <div class="size-modal-header">
          <div><h2>{{ sizePickerItem?.ProductName }}</h2><p>{{ sizePickerItem?.Category }}</p></div>
          <button class="pv-close" @click="showSizePicker = false"><X :size="19" /></button>
        </div>
        <div class="size-options">
          <button v-for="opt in sizeOptions" :key="opt.label" class="size-option-btn" @click="addToCartWithSize(sizePickerItem, opt)">
            <div class="so-top"><span class="so-size">{{ opt.label }}</span><span class="so-oz">{{ opt.oz }}</span></div>
            <span class="so-price">₱{{ opt.price?.toFixed(2) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── PAYMENT MODAL ── -->
    <div v-if="showPayment" class="overlay" @click.self="showPayment = false">
      <div class="payment-modal">
        <!-- Invoice / Receipt -->
        <div v-if="showReceipt" class="receipt-view">
          <div id="print-receipt" class="receipt-paper">
            <div class="receipt-header">
              <div class="r-icon-circle"><Coffee :size="20" /></div>
              <h3>Silingan Coffee</h3>
              <p>{{ branchAddress || branchRecord?.BranchName || 'Main Branch' }}</p>
              <div class="r-invoice-title">SALES INVOICE</div>
            </div>
            <div class="r-meta">
              <div class="r-row"><span>Invoice No.</span><span class="r-txn-no">#{{ transactionNumber }}</span></div>
              <div class="r-row"><span>Date</span><span>{{ currentDate }}</span></div>
              <div class="r-row"><span>Cashier</span><span>{{ cashierName }}</span></div>
              <div class="r-row"><span>Order Type</span><span class="r-order-type">{{ orderType === 'dine_in' ? 'Dine In' : 'Take Out' }}</span></div>
              <div class="r-row"><span>Payment</span><span>{{ paymentMethod === 'gcash' ? 'GCash' : 'Cash' }}</span></div>
              <div v-if="selectedDiscount" class="r-row"><span>Discount ({{ selectedDiscount.discountname }})</span><span>{{ discountIdNumber || 'N/A' }}</span></div>
            </div>
            <div class="r-divider"></div>
            <div class="r-items-header"><span>Item</span><span>Qty</span><span>Price</span><span>Total</span></div>
            <div class="r-items">
              <div v-for="item in cart" :key="item.cartKey" class="r-item">
                <span class="r-item-name">{{ item.ProductName }}<span v-if="item.size"> ({{ item.size }})</span></span>
                <span>{{ item.qty }}</span>
                <span>₱{{ item.effectivePrice?.toFixed(2) }}</span>
                <span>₱{{ (item.qty * item.effectivePrice).toFixed(2) }}</span>
              </div>
            </div>
            <div class="r-divider"></div>
            <div class="r-totals">
              <div class="r-row"><span>Subtotal (VAT-incl.)</span><span>₱{{ cartSubtotal.toFixed(2) }}</span></div>
              <div class="r-row r-disc" v-if="selectedDiscount"><span>Discount ({{ selectedDiscount.discountname }})</span><span>-₱{{ discountAmount.toFixed(2) }}</span></div>
              <div class="r-row r-vat"><span>VAT (12%)</span><span>₱{{ vatAmount.toFixed(2) }}</span></div>
              <div class="r-row r-total"><span>TOTAL DUE</span><span>₱{{ finalTotal.toFixed(2) }}</span></div>
              <template v-if="paymentMethod === 'cash'">
                <div class="r-row"><span>Cash Received</span><span>₱{{ cashReceived.toFixed(2) }}</span></div>
                <div class="r-row r-change"><span>Change</span><span>₱{{ Math.max(0, changeAmount).toFixed(2) }}</span></div>
              </template>
              <div v-else class="r-row r-gcash"><span>GCash</span><span>✓ Paid</span></div>
            </div>
            <div class="r-footer">Thank you for your visit! ☕</div>
          </div>
          <div class="receipt-btns">
            <button class="rbtn-back" @click="showReceipt = false"><ArrowLeft :size="14" /> Edit</button>
            <button class="rbtn-print" @click="printReceipt"><Printer :size="14" /> Print Invoice</button>
            <button class="rbtn-confirm" :disabled="saving" @click="finishTransaction">{{ saving ? 'Saving...' : 'Confirm & Finalize' }}</button>
          </div>
        </div>

        <!-- Payment step -->
        <div v-else class="payment-view">
          <div class="pv-header">
            <div><h2>Payment</h2><p>Total: <strong>₱{{ finalTotal.toFixed(2) }}</strong></p></div>
            <button class="pv-close" @click="showPayment = false"><X :size="19" /></button>
          </div>
          <div class="pm-tabs">
            <button :class="['pm-tab', paymentMethod === 'cash' ? 'active' : '']" @click="paymentMethod = 'cash'"><Banknote :size="17" /> Cash</button>
            <button :class="['pm-tab', paymentMethod === 'gcash' ? 'active' : '']" @click="paymentMethod = 'gcash'"><Smartphone :size="17" /> GCash</button>
          </div>
          <div v-if="paymentMethod === 'cash'" class="cash-fields">
            <label>Amount Received (₱)</label>
            <input type="number" v-model.number="cashReceived" class="cash-input" placeholder="0.00" />
            <button class="qa-btn exact-btn" @click="cashReceived = finalTotal">₱{{ finalTotal.toFixed(2) }} <span class="exact-label">Exact Amount</span></button>
            <div class="cash-calc" v-if="cashReceived > 0">
              <div class="cc-row"><span>Total Due</span><span>₱{{ finalTotal.toFixed(2) }}</span></div>
              <div class="cc-row"><span>Cash</span><span>₱{{ cashReceived.toFixed(2) }}</span></div>
              <div class="cc-row change-row" :class="changeAmount < 0 ? 'insufficient' : 'sufficient'">
                <span>Change</span>
                <span>{{ changeAmount < 0 ? '-₱' + Math.abs(changeAmount).toFixed(2) : '₱' + changeAmount.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="gcash-fields">
            <div class="gcash-badge"><Smartphone :size="38" /><p>GCash Payment</p><span>No change required. Confirm to complete.</span></div>
          </div>
          <button class="pv-next" :disabled="paymentMethod === 'cash' && (cashReceived < finalTotal || cashReceived === 0)" @click="goToInvoicePreview">
            Preview Sales Invoice →
          </button>
        </div>
      </div>
    </div>

    <!-- ── HISTORY MODAL ── -->
    <div v-if="showHistory" class="overlay" @click.self="showHistory = false">
      <div class="history-modal">
        <div class="hm-header">
          <div><h2>Today's Sales</h2><p>{{ transactions.length }} transactions · ₱{{ totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} revenue</p></div>
          <button class="pv-close" @click="showHistory = false"><X :size="19" /></button>
        </div>
        <div class="hm-stats">
          <div class="hms-card"><span class="hms-label">Revenue</span><span class="hms-val">₱{{ totalRevenue.toFixed(2) }}</span></div>
          <div class="hms-card"><span class="hms-label">Orders</span><span class="hms-val">{{ transactions.length }}</span></div>
          <div class="hms-card"><span class="hms-label">Avg Sale</span><span class="hms-val">₱{{ avgSale.toFixed(2) }}</span></div>
        </div>
        <div v-if="loadingTransactions" class="hm-empty"><div class="spin"></div> Loading...</div>
        <div v-else-if="transactions.length === 0" class="hm-empty">No transactions today yet.</div>
        <div v-else class="hm-table-wrap">
          <table class="hm-table">
            <thead><tr><th>Invoice #</th><th>Time</th><th>Items</th><th>Type</th><th>Payment</th><th>Discount</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              <tr v-for="tr in transactions" :key="tr.OrderId" :class="{ 'cancelled-row': tr.Status === 'cancelled' }">
                <td><span class="id-tag">#{{ tr.transaction_number || tr.OrderId }}</span></td>
                <td class="muted">{{ formatTime(tr.CreatedAt) }}</td>
                <td><div v-for="it in tr.orderitem" :key="it.OrderItemId" class="h-item-line">{{ it.Quantity }}x {{ it.product?.ProductName ?? '—' }}</div></td>
                <td><span :class="['order-type-badge', tr.order_type]">{{ tr.order_type === 'take_out' ? 'Take Out' : 'Dine In' }}</span></td>
                <td><span :class="['pm-badge', tr.PaymentMethod]">{{ tr.PaymentMethod === 'gcash' ? 'GCash' : 'Cash' }}</span></td>
                <td>
                  <div v-if="tr.discount"><span class="disc-badge">{{ tr.discount.discountname }}</span><div v-if="tr.discount_id_number" class="disc-id-display">ID: {{ tr.discount_id_number }}</div></div>
                  <span v-else class="muted">—</span>
                </td>
                <td class="total-col">₱{{ (tr.FinalAmount ?? 0).toFixed(2) }}</td>
                <td>
                  <span :class="['st-badge', tr.Status]">{{ tr.Status }}</span>
                  <div v-if="tr.Status === 'cancelled' && tr.cancel_reason" class="cancel-reason-display">"{{ tr.cancel_reason }}"</div>
                </td>
                <td>
                  <button v-if="tr.Status === 'completed'" class="cancel-order-btn" :disabled="cancellingId === tr.OrderId" @click="confirmCancelOrder(tr)">
                    {{ cancellingId === tr.OrderId ? '...' : 'Cancel' }}
                  </button>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── CANCEL CONFIRM ── -->
    <div v-if="showCancelConfirm" class="overlay" @click.self="showCancelConfirm = false">
      <div class="confirm-modal">
        <div class="confirm-icon"><XCircle :size="32" /></div>
        <h3>Cancel Order #{{ cancelTarget?.transaction_number || cancelTarget?.OrderId }}?</h3>
        <p>This will mark the order as cancelled. Please provide a reason.</p>
        <div class="confirm-items">
          <div v-for="it in cancelTarget?.orderitem" :key="it.OrderItemId" class="confirm-item-line">{{ it.Quantity }}x {{ it.product?.ProductName ?? '—' }}</div>
        </div>
        <div class="confirm-total">Total: ₱{{ (cancelTarget?.FinalAmount ?? 0).toFixed(2) }}</div>
        <div class="cancel-reason-field">
          <label>Reason for Cancellation *</label>
          <div class="cancel-reason-presets">
            <button v-for="preset in cancelReasonPresets" :key="preset" :class="['preset-btn', cancelReason === preset ? 'selected' : '']" @click="cancelReason = preset">{{ preset }}</button>
          </div>
          <textarea v-model="cancelReason" class="cancel-reason-input" placeholder="Enter reason for cancellation..." rows="2"></textarea>
          <span v-if="cancelReasonError" class="cancel-reason-error">{{ cancelReasonError }}</span>
        </div>
        <div class="confirm-btns">
          <button class="conf-no" @click="closeCancelModal">Keep Order</button>
          <button class="conf-yes" :disabled="cancellingId !== null" @click="doCancelOrder">{{ cancellingId ? 'Cancelling...' : 'Yes, Cancel Order' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Coffee, History, Search, ShoppingCart, Plus, Minus, Trash2, X,
  Tag, ChevronDown, CreditCard, Banknote, Smartphone, ArrowLeft,
  Cookie, Layers, UtensilsCrossed, Sandwich, Leaf, Printer, XCircle,
  AlertTriangle, ShoppingBag, Eye,
} from 'lucide-vue-next'
import { supabase } from '@/supabase'
import {
  normaliseNeeded, checkStockForProduct, buildFEFODeductionRows,
  suggestRecipeUnit, formatQtyDisplay,
} from "@/composables/inventoryUtils.js";

// ─── Size configuration ───────────────────────────────────────────────────────
const getSizeType = (cat) => {
  if (!cat) return 'none'
  const c = cat.toLowerCase()
  if (c.includes('hot drink') || c.includes('hot coffee')) return 'hot'
  if (c.includes('iced coffee') || c.includes('iced') || c.includes('frap') || c.includes('smoothie')) return 'iced'
  if (c.includes('cream') && c.includes('frap')) return 'iced'
  return 'none'
}
const getSizeLabels = (cat) => {
  const t = getSizeType(cat)
  if (t === 'hot') return ['Small', 'Regular']
  if (t === 'iced') return ['Regular', 'Big']
  return []
}
const buildSizeOptions = (item) => {
  const t = getSizeType(item.Category)
  const sp = item.size_prices || {}
  if (t === 'hot') return [
    { label: 'Small',   oz: '8oz',  price: sp.Small   || item.Price },
    { label: 'Regular', oz: '12oz', price: sp.Regular || (item.Price + 10) },
  ]
  if (t === 'iced') return [
    { label: 'Regular', oz: '16oz', price: sp.Regular || item.Price },
    { label: 'Big',     oz: '22oz', price: sp.Big     || (item.Price + 20) },
  ]
  return []
}
const getBasePrice = (item) => {
  const t = getSizeType(item.Category)
  const sp = item.size_prices || {}
  if (t === 'hot')  return (sp.Small   || item.Price)?.toFixed(2) ?? '0.00'
  if (t === 'iced') return (sp.Regular || item.Price)?.toFixed(2) ?? '0.00'
  return item.Price?.toFixed(2) ?? '0.00'
}

// ─── State ────────────────────────────────────────────────────────────────────
const menu          = ref([])
const discounts     = ref([])
const transactions  = ref([])
const loadingMenu   = ref(false)
const loadingTransactions = ref(false)
const cart          = ref([])
const selectedDiscount  = ref(null)
const discountIdNumber  = ref('')
const discountIdError   = ref('')
const activeCategory    = ref('All')
const menuSearch        = ref('')
const hideOOS           = ref(false)
const showPayment       = ref(false)
const showReceipt       = ref(false)
const showHistory       = ref(false)
const paymentMethod     = ref('cash')
const cashReceived      = ref(0)
const saving            = ref(false)
const currentUser       = ref(null)
const branchRecord      = ref(null)
const employeeRecord    = ref(null)

// Stock & recipe state
const rawMaterialStock  = ref({})  // { rawproductid → net qty in inventory's own unit }
const inventoryUnitMap  = ref({})  // { rawproductid → unit string }
const productRecipes    = ref([])  // all recipe rows with rawproduct joined

// OOS alert
const showOosAlert   = ref(false)
const oosProductName = ref('')
const oosIngredients = ref([])

// Size picker
const showSizePicker  = ref(false)
const sizePickerItem  = ref(null)
const sizeOptions     = ref([])

// Cancel order
const showCancelConfirm  = ref(false)
const cancelTarget       = ref(null)
const cancellingId       = ref(null)
const cancelReason       = ref('')
const cancelReasonError  = ref('')
const cancelReasonPresets = ['Customer request', 'Wrong order entered', 'Item unavailable', 'Customer left', 'Duplicate order']

const transactionNumber = ref('')
const orderType = ref('dine_in')
const VAT_RATE  = 0.12

// ─── Computed ─────────────────────────────────────────────────────────────────
const cashierName   = computed(() => currentUser.value?.username ?? localStorage.getItem('username') ?? 'Staff')
const branchId      = computed(() => branchRecord.value?.BranchId ?? null)
const branchAddress = computed(() => branchRecord.value?.Location ?? '')
const currentDate   = new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const menuCategories = computed(() => [...new Set(menu.value.map(i => i.Category).filter(Boolean))].sort())

const filteredMenu = computed(() => {
  let list = menu.value
  if (activeCategory.value !== 'All') list = list.filter(i => i.Category === activeCategory.value)
  if (menuSearch.value) list = list.filter(i => i.ProductName?.toLowerCase().includes(menuSearch.value.toLowerCase()))
  if (hideOOS.value) list = list.filter(i => !isProductUnavailable(i))
  return list
})

const cartSubtotal  = computed(() => cart.value.reduce((s, i) => s + i.effectivePrice * i.qty, 0))
const discountAmount = computed(() => {
  if (!selectedDiscount.value || cartSubtotal.value === 0) return 0
  const d = selectedDiscount.value
  return d.discounttype === 'percentage'
    ? parseFloat(((cartSubtotal.value * d.discountvalue) / 100).toFixed(2))
    : Math.min(d.discountvalue, cartSubtotal.value)
})
const afterDiscountAmount = computed(() => Math.max(0, cartSubtotal.value - discountAmount.value))
const vatAmount   = computed(() => parseFloat(((afterDiscountAmount.value * VAT_RATE) / (1 + VAT_RATE)).toFixed(2)))
const finalTotal  = computed(() => afterDiscountAmount.value)
const changeAmount = computed(() => cashReceived.value - finalTotal.value)
const totalRevenue = computed(() => transactions.value.filter(t => t.Status !== 'cancelled').reduce((s, t) => s + (t.FinalAmount ?? 0), 0))
const avgSale = computed(() => {
  const completed = transactions.value.filter(t => t.Status !== 'cancelled')
  return completed.length ? totalRevenue.value / completed.length : 0
})

// ─── Stock helpers ────────────────────────────────────────────────────────────
/**
 * Returns shortages array for a product at qty=1.
 * Uses unit-aware conversion via inventoryUtils.
 */
function getShortages(productId, qty = 1) {
  return checkStockForProduct(productId, qty, productRecipes.value, rawMaterialStock.value, inventoryUnitMap.value)
}

function isProductUnavailable(item) {
  return getShortages(item.ProductId, 1).length > 0
}

function isProductLow(item) {
  // "Low" = can make 1 but not 3 more (arbitrary threshold for warning)
  if (isProductUnavailable(item)) return false
  return getShortages(item.ProductId, 3).length > 0
}

function getOOSShortLabel(item) {
  const shortages = getShortages(item.ProductId, 1)
  if (shortages.length === 0) return ''
  if (shortages.length === 1) return shortages[0].name
  return `${shortages[0].name} +${shortages.length - 1} more`
}

// ─── Cart helpers ─────────────────────────────────────────────────────────────
const makeCartKey    = (item, size) => `${item.ProductId}-${size ?? 'none'}`
const isInCart       = (id) => cart.value.some(i => i.ProductId === id)
const getCartTotalQty = (id) => cart.value.filter(i => i.ProductId === id).reduce((s, i) => s + i.qty, 0)

const handleMenuCardClick = (item) => {
  const shortages = getShortages(item.ProductId, 1)
  if (shortages.length > 0) {
    oosProductName.value = item.ProductName
    oosIngredients.value = shortages
    showOosAlert.value   = true
    return
  }
  const t = getSizeType(item.Category)
  if (t === 'none') { addToCartDirect(item) }
  else { sizePickerItem.value = item; sizeOptions.value = buildSizeOptions(item); showSizePicker.value = true }
}

const addToCartDirect = (item) => {
  const key = makeCartKey(item, null)
  const ex  = cart.value.find(i => i.cartKey === key)
  if (ex) { ex.qty++; return }
  cart.value.push({ ...item, qty: 1, size: null, effectivePrice: item.Price ?? 0, cartKey: key })
}

const addToCartWithSize = (item, sizeOpt) => {
  showSizePicker.value = false
  const key = makeCartKey(item, sizeOpt.label)
  const ex  = cart.value.find(i => i.cartKey === key)
  if (ex) { ex.qty++; return }
  cart.value.push({ ...item, qty: 1, size: `${sizeOpt.label} (${sizeOpt.oz})`, effectivePrice: sizeOpt.price, cartKey: key })
}

const increaseQty = (i) => {
  const item   = cart.value[i]
  const newQty = item.qty + 1
  const shortages = getShortages(item.ProductId, newQty)
  if (shortages.length > 0) {
    oosProductName.value = item.ProductName
    oosIngredients.value = shortages
    showOosAlert.value   = true
    return
  }
  item.qty++
}
const decreaseQty  = (i) => { if (cart.value[i].qty > 1) cart.value[i].qty--; else removeFromCart(i) }
const removeFromCart = (i) => cart.value.splice(i, 1)

// ─── Transaction number ───────────────────────────────────────────────────────
const generateTransactionNumber = () => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const seq = String(transactions.value.length + 1).padStart(4, '0')
  return `SI-${y}${m}${d}-${seq}`
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
const fetchCurrentUser = async () => {
  const username  = localStorage.getItem('username')
  const branchSlug = localStorage.getItem('branch')
  if (!username) return
  const { data: u } = await supabase.from('users').select('id, username, role, branch').eq('username', username).single()
  if (u) currentUser.value = u
  if (branchSlug && branchSlug !== 'all') {
    const { data: bd } = await supabase.from('branch').select('BranchId, BranchName, Location').eq('BranchName', branchSlug).maybeSingle()
    if (bd) { branchRecord.value = bd }
    else {
      const { data: bl } = await supabase.from('branch').select('BranchId, BranchName, Location').ilike('Location', '%' + branchSlug + '%').maybeSingle()
      if (bl) branchRecord.value = bl
    }
  }
  if (u?.employee_id) {
    const { data: emp } = await supabase.from('employee').select('EmployeeId').eq('EmployeeId', u.employee_id).maybeSingle()
    if (emp) { employeeRecord.value = emp; return }
  }
  if (username) {
    const { data: emp } = await supabase.from('employee').select('EmployeeId, FirstName, LastName').or(`FirstName.ilike.%${username}%,LastName.ilike.%${username}%`).maybeSingle()
    if (emp) employeeRecord.value = emp
  }
}

const fetchMenu = async () => {
  loadingMenu.value = true
  const { data: products, error } = await supabase.from('product').select('ProductId, ProductName, Category, Price, size_prices, image_url').neq('Status', 'Archived').order('Category').order('ProductName')
  if (error) { loadingMenu.value = false; return }
  menu.value = products ?? []

  // Fetch recipes (skip archived raw products)
  const { data: recipes } = await supabase.from('recipe').select(`
    recipeid, finishedproductid, rawproductid, quantityneeded, unit,
    rawproduct!inner ( rawproductid, name, unit, status )
  `).neq('rawproduct.status', 'Archived')
  productRecipes.value = (recipes ?? []).map(r => ({ ...r, rawproduct: r.rawproduct }))

  await fetchRawStock()
  loadingMenu.value = false
}

const fetchRawStock = async () => {
  const bid = branchId.value
  let query = supabase.from('rawproducttransaction').select('rawproductid, transactiontype, quantity').gt('quantity', 0)
  if (bid) query = query.eq('branchid', bid)
  const { data: txns } = await query
  if (!txns) return

  // Net stock map (in inventory units)
  const stock = {}
  for (const t of txns) {
    const delta = t.transactiontype === 'in' ? t.quantity : -t.quantity
    stock[t.rawproductid] = (stock[t.rawproductid] ?? 0) + delta
  }
  rawMaterialStock.value = stock

  // Unit map
  const { data: rps } = await supabase.from('rawproduct').select('rawproductid, unit').neq('status', 'Archived')
  const umap = {}
  ;(rps ?? []).forEach(r => { umap[r.rawproductid] = r.unit })
  inventoryUnitMap.value = umap
}

const fetchDiscounts = async () => {
  const { data } = await supabase.from('discount').select('discountid, discountname, discounttype, discountvalue').order('discountname')
  if (data) discounts.value = data
}

const fetchTransactions = async () => {
  loadingTransactions.value = true
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tom   = new Date(today); tom.setDate(tom.getDate() + 1)
  const { data } = await supabase.from('orders').select(`
    OrderId, TotalAmount, DiscountId, DiscountedAmount, FinalAmount,
    cashpaid, changegiven, PaymentMethod, Status, CreatedAt,
    transaction_number, cancel_reason, discount_id_number, order_type,
    discount ( discountid, discountname, discounttype, discountvalue ),
    orderitem ( OrderItemId, Quantity, UnitPrice, Subtotal, ProductId, product ( ProductId, ProductName ) )
  `).gte('CreatedAt', today.toISOString()).lt('CreatedAt', tom.toISOString()).order('CreatedAt', { ascending: false })
  if (data) transactions.value = data
  loadingTransactions.value = false
}

const openHistory = async () => { showHistory.value = true; await fetchTransactions() }

// ─── Discount helpers ─────────────────────────────────────────────────────────
const onDiscountChange = () => { discountIdNumber.value = ''; discountIdError.value = '' }
const getDiscountIdLabel = (d) => {
  const n = d?.discountname?.toLowerCase() ?? ''
  if (n.includes('pwd')) return 'PWD ID Number'
  if (n.includes('senior')) return 'Senior Citizen ID Number'
  return 'Discount ID Number'
}
const getDiscountIdPlaceholder = (d) => {
  const n = d?.discountname?.toLowerCase() ?? ''
  if (n.includes('pwd')) return 'e.g. PWD-2024-000001'
  if (n.includes('senior')) return 'e.g. SC-2024-000001'
  return 'Enter ID / card number'
}

// ─── Payment ──────────────────────────────────────────────────────────────────
const openPayment = () => {
  if (selectedDiscount.value && !discountIdNumber.value.trim()) {
    discountIdError.value = `${getDiscountIdLabel(selectedDiscount.value)} is required.`
    return
  }
  discountIdError.value = ''
  cashReceived.value = 0; paymentMethod.value = 'cash'; showReceipt.value = false; showPayment.value = true
}

const goToInvoicePreview = () => {
  // Re-check all cart items before invoice
  for (const item of cart.value) {
    const shortages = getShortages(item.ProductId, item.qty)
    if (shortages.length > 0) {
      showPayment.value = false
      oosProductName.value = item.ProductName
      oosIngredients.value = shortages
      showOosAlert.value   = true
      return
    }
  }
  transactionNumber.value = generateTransactionNumber()
  showReceipt.value = true
}

const finishTransaction = async () => {
  if (saving.value) return
  // Final stock check
  for (const item of cart.value) {
    const shortages = getShortages(item.ProductId, item.qty)
    if (shortages.length > 0) {
      showPayment.value = false; showReceipt.value = false
      oosProductName.value = item.ProductName; oosIngredients.value = shortages; showOosAlert.value = true
      return
    }
  }
  saving.value = true
  try {
    const payload = {
      PaymentMethod: paymentMethod.value, Status: 'completed',
      TotalAmount: cartSubtotal.value, DiscountId: selectedDiscount.value?.discountid ?? null,
      DiscountedAmount: discountAmount.value, FinalAmount: finalTotal.value,
      cashpaid: paymentMethod.value === 'cash' ? cashReceived.value : finalTotal.value,
      changegiven: paymentMethod.value === 'cash' ? Math.max(0, changeAmount.value) : 0,
      transaction_number: transactionNumber.value,
      discount_id_number: selectedDiscount.value ? (discountIdNumber.value.trim() || null) : null,
      vat_amount: vatAmount.value, order_type: orderType.value,
    }
    if (branchId.value)             payload.BranchId  = branchId.value
    if (employeeRecord.value?.EmployeeId) payload.CashierId = employeeRecord.value.EmployeeId

    const { data: order, error: oErr } = await supabase.from('orders').insert(payload).select().single()
    if (oErr) throw new Error(oErr.message)

    const { error: iErr } = await supabase.from('orderitem').insert(
      cart.value.map(i => ({ OrderId: order.OrderId, ProductId: i.ProductId, Quantity: i.qty, UnitPrice: i.effectivePrice, Subtotal: i.qty * i.effectivePrice }))
    )
    if (iErr) throw new Error(iErr.message)

    // ── FEFO-aware inventory deduction ──────────────────────────────────────
    await deductInventoryFEFO(cart.value, branchId.value)
    await fetchRawStock() // refresh stock cache

    await fetchTransactions()
    cart.value = []; selectedDiscount.value = null; discountIdNumber.value = ''
    orderType.value = 'dine_in'; showPayment.value = false; showReceipt.value = false
  } catch (err) {
    alert('Failed: ' + err.message)
  } finally {
    saving.value = false
  }
}

/**
 * FEFO inventory deduction:
 * Fetches the actual 'in' batches sorted by expiry, then deducts from
 * earliest-expiring first. Handles unit conversion (recipe g → inventory kg).
 */
const deductInventoryFEFO = async (cartItems, bid) => {
  try {
    // Helper to fetch batches for a raw product
    const getBatches = async (rawproductid, branchid) => {
      let q = supabase
        .from('rawproducttransaction')
        .select('rawtransactionid, rawproductid, branchid, quantity, expirationdate')
        .eq('rawproductid', rawproductid)
        .eq('transactiontype', 'in')
        .gt('quantity', 0)
      if (branchid) q = q.eq('branchid', branchid)
      const { data } = await q
      return data ?? []
    }

    const insertRows = await buildFEFODeductionRows(
      cartItems, productRecipes.value, inventoryUnitMap.value, getBatches, bid
    )

    if (insertRows.length === 0) return

    // For FEFO we insert 'out' transactions normally (full deduction qty)
    // The batch quantities are reduced logically through the net-stock computation.
    const { error } = await supabase.from('rawproducttransaction').insert(
      insertRows.map(({ source_batch_id, ...row }) => row) // strip internal field
    )
    if (error) console.error('FEFO deduction error (order saved):', error.message)
  } catch (err) {
    console.error('FEFO deduction error:', err.message)
  }
}

// ─── Print ────────────────────────────────────────────────────────────────────
const printReceipt = () => {
  const el = document.getElementById('print-receipt')
  if (!el) return
  const printWin = window.open('', '_blank', 'width=400,height=700')
  printWin.document.write(`<html><head><title>Sales Invoice #${transactionNumber.value} - Silingan Coffee</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;font-size:12px;color:#000;padding:12px;width:300px;}.receipt-header{text-align:center;margin-bottom:10px;}.receipt-header h3{font-size:15px;font-weight:bold;margin:6px 0 2px;}.receipt-header p{font-size:11px;color:#555;}.r-invoice-title{font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:2px;margin:8px 0 4px;border:1px solid #000;padding:3px 6px;display:inline-block;}.r-txn-no{font-weight:bold;}.r-row{display:flex;justify-content:space-between;margin-bottom:3px;font-size:12px;}.r-divider{border-top:1px dashed #999;margin:8px 0;}.r-items-header{display:grid;grid-template-columns:3fr 1fr 2fr 2fr;font-size:10px;font-weight:bold;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #000;}.r-item{display:grid;grid-template-columns:3fr 1fr 2fr 2fr;margin-bottom:3px;font-size:11px;}.r-total{font-weight:bold;font-size:13px;padding-top:4px;border-top:1px solid #000;margin-top:3px;}.r-change{font-weight:bold;}.r-vat{color:#555;}.r-footer{text-align:center;margin-top:10px;font-size:11px;color:#777;}@media print{body{padding:0;}}</style></head><body>${el.innerHTML}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`)
  printWin.document.close()
}

// ─── Cancel ───────────────────────────────────────────────────────────────────
const confirmCancelOrder = (order) => { cancelTarget.value = order; cancelReason.value = ''; cancelReasonError.value = ''; showCancelConfirm.value = true }
const closeCancelModal   = () => { showCancelConfirm.value = false; cancelTarget.value = null; cancelReason.value = ''; cancelReasonError.value = '' }
const doCancelOrder = async () => {
  if (!cancelTarget.value) return
  if (!cancelReason.value.trim()) { cancelReasonError.value = 'Please provide a reason for cancellation.'; return }
  cancellingId.value = cancelTarget.value.OrderId
  try {
    const { error } = await supabase.from('orders').update({ Status: 'cancelled', cancel_reason: cancelReason.value.trim() }).eq('OrderId', cancelTarget.value.OrderId)
    if (error) throw new Error(error.message)
    const tx = transactions.value.find(t => t.OrderId === cancelTarget.value.OrderId)
    if (tx) { tx.Status = 'cancelled'; tx.cancel_reason = cancelReason.value.trim() }
    closeCancelModal()
  } catch (err) { alert('Failed to cancel: ' + err.message) }
  finally { cancellingId.value = null }
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
const getCatIcon = (cat) => {
  if (!cat || cat === 'All') return Layers
  const c = cat.toLowerCase()
  if (c.includes('hot') || c.includes('iced') || c.includes('non') || c.includes('frap')) return Coffee
  if (c.includes('smoothie')) return Leaf
  if (c.includes('sandwich')) return Sandwich
  if (c.includes('pastry') || c.includes('rice') || c.includes('pika')) return Cookie
  return UtensilsCrossed
}
const formatTime = (iso) =>
  iso ? new Date(iso + 'Z').toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '—'

onMounted(async () => {
  await fetchCurrentUser()
  await Promise.all([fetchMenu(), fetchDiscounts(), fetchTransactions()])
})
</script>

<style scoped>
/* Inherit ALL original styles verbatim — only adding new selectors */
.pos-root{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#f5f0eb;font-family:'Inter',sans-serif;}
.pos-topbar{display:flex;justify-content:space-between;align-items:center;padding:0 24px;height:54px;background:#31201D;color:white;flex-shrink:0;}
.topbar-left{display:flex;align-items:center;gap:20px;}
.brand-mark{display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;}
.topbar-meta{font-size:12px;color:rgba(255,255,255,0.5);display:flex;align-items:center;gap:8px;}
.meta-branch{color:rgba(255,255,255,0.8);font-weight:600;}
.meta-sep{opacity:0.3;}
.history-btn{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:white;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:0.2s;}
.history-btn:hover{background:rgba(255,255,255,0.2);}
.history-count{background:#ef4444;color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px;}
.pos-layout{display:grid;grid-template-columns:152px 1fr 320px;flex:1;overflow:hidden;}
.category-sidebar{background:#2a1b18;padding:16px 8px;display:flex;flex-direction:column;gap:4px;overflow-y:auto;}
.sidebar-label{font-size:10px;color:rgba(255,255,255,0.28);text-transform:uppercase;letter-spacing:0.12em;margin:0 0 8px 4px;}
.cat-btn{display:flex;align-items:center;gap:7px;padding:9px 10px;background:transparent;border:none;border-radius:8px;color:rgba(255,255,255,0.5);font-size:12px;font-weight:600;cursor:pointer;text-align:left;font-family:inherit;transition:0.15s;width:100%;}
.cat-btn:hover{background:rgba(255,255,255,0.08);color:white;}
.cat-btn.active{background:#C49A6C;color:white;}
.menu-area{padding:16px;overflow-y:auto;background:#f5f0eb;display:flex;flex-direction:column;gap:12px;}
.menu-search-row{display:flex;align-items:center;gap:10px;}
.menu-search{display:flex;align-items:center;gap:9px;background:white;border:1px solid #e8e0d5;border-radius:10px;padding:9px 14px;flex:1;max-width:320px;}
.menu-search input{flex:1;border:none;outline:none;font-size:14px;background:transparent;font-family:inherit;}
.menu-search svg{color:#bbb;}
.oos-filter-btn{display:flex;align-items:center;gap:6px;background:white;border:1.5px solid #e8e0d5;color:#888;padding:8px 13px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:0.2s;}
.oos-filter-btn:hover{border-color:#31201d;color:#31201d;}
.oos-filter-btn.active{background:#31201d;color:white;border-color:#31201d;}
.menu-loading,.menu-empty{display:flex;align-items:center;gap:12px;justify-content:center;padding:60px;color:#bbb;font-size:14px;}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.menu-card{background:white;border:2px solid transparent;border-radius:12px;padding:0;cursor:pointer;font-family:inherit;transition:all 0.15s;overflow:hidden;text-align:left;box-shadow:0 1px 4px rgba(0,0,0,0.06);}
.menu-card:hover:not(.out-of-stock-card){transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.1);border-color:#C49A6C;}
.menu-card.in-cart{border-color:#31201D;background:#fdfaf7;}
.menu-card.out-of-stock-card{opacity:0.65;cursor:not-allowed;}
.menu-card.out-of-stock-card:hover{transform:none;box-shadow:none;border-color:transparent;}
.menu-card.low-stock-card{border-color:#fbbf24;}
.menu-card-img{background:#f9f4ef;height:120px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}
.menu-card-photo{width:100%;height:100%;object-fit:cover;display:block;}
.menu-card-icon{color:#C49A6C;opacity:0.65;}
.cart-qty-badge{position:absolute;top:7px;right:7px;background:#31201D;color:white;font-size:11px;font-weight:700;width:21px;height:21px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.size-chip{position:absolute;bottom:5px;left:6px;background:rgba(49,32,29,0.75);color:white;font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;letter-spacing:0.03em;white-space:nowrap;}
.oos-overlay{position:absolute;inset:0;background:rgba(220,38,38,0.82);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:white;font-size:12px;font-weight:700;}
.oos-overlay-detail{font-size:10px;font-weight:600;opacity:0.9;text-align:center;padding:0 6px;}
.low-stock-badge{position:absolute;top:6px;left:6px;display:flex;align-items:center;gap:3px;background:rgba(245,158,11,0.9);color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;}
.menu-card-info{padding:8px 10px 10px;}
.menu-card-name{display:block;font-size:15px;font-weight:700;color:#31201D;line-height:1.3;margin-bottom:2px;}
.menu-card-cat{display:block;font-size:10px;color:#bbb;margin-bottom:4px;}
.menu-card-price{display:block;font-size:14px;font-weight:800;color:#31201D;}
.cart-panel{background:white;border-left:1px solid #ede8e2;display:flex;flex-direction:column;overflow:hidden;}
.cart-panel-header{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #f0ebe4;flex-shrink:0;}
.cart-panel-header h2{font-size:15px;font-weight:700;color:#31201D;margin:0;}
.clear-cart-btn{display:flex;align-items:center;gap:5px;background:#fee2e2;border:none;color:#dc2626;font-size:11px;font-weight:600;padding:4px 9px;border-radius:6px;cursor:pointer;font-family:inherit;}
.cart-items{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
.cart-item{background:#fdfaf7;border:1px solid #ede8e2;border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;gap:4px;}
.ci-info{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.ci-name{font-size:12px;font-weight:700;color:#31201D;flex:1;}
.ci-size-tag{background:#31201D;color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap;}
.ci-price{font-size:11px;color:#bbb;}
.ci-controls{display:flex;align-items:center;gap:6px;}
.qty-btn{width:22px;height:22px;border-radius:5px;border:1px solid #e8e0d5;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#31201D;transition:0.15s;}
.qty-btn:hover{background:#31201D;color:white;border-color:#31201D;}
.ci-qty{font-size:13px;font-weight:700;color:#31201D;min-width:18px;text-align:center;}
.ci-remove{margin-left:auto;background:none;border:none;color:#dc2626;cursor:pointer;padding:3px;}
.ci-subtotal{font-size:13px;font-weight:800;color:#31201D;text-align:right;}
.cart-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ccc;gap:6px;padding:30px 20px;}
.cart-empty-icon{opacity:0.18;}
.cart-empty p{font-size:14px;font-weight:600;margin:0;color:#bbb;}
.cart-empty span{font-size:12px;color:#ddd;}
.cart-discount{padding:9px 12px;border-top:1px solid #f0ebe4;flex-shrink:0;display:flex;flex-direction:column;gap:8px;}
.discount-lbl{font-size:11px;font-weight:600;color:#888;display:flex;align-items:center;gap:5px;}
.sel-wrap{position:relative;}
.discount-sel{width:100%;appearance:none;padding:7px 28px 7px 10px;border:1px solid #e8e0d5;border-radius:8px;font-size:12px;background:white;outline:none;cursor:pointer;font-family:inherit;}
.sel-icon{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#999;pointer-events:none;}
.discount-id-field{display:flex;flex-direction:column;gap:4px;}
.discount-id-label{font-size:11px;font-weight:600;color:#0369a1;display:flex;align-items:center;gap:5px;}
.discount-id-input{width:100%;padding:7px 10px;border:1.5px solid #bae6fd;border-radius:7px;font-size:12px;font-family:inherit;outline:none;background:#f0f9ff;box-sizing:border-box;transition:border-color 0.2s;}
.discount-id-input:focus{border-color:#0369a1;}
.discount-id-error{font-size:11px;color:#dc2626;}
.cart-totals{padding:9px 12px;border-top:1px solid #f0ebe4;display:flex;flex-direction:column;gap:5px;flex-shrink:0;}
.ct-row{display:flex;justify-content:space-between;font-size:12px;color:#666;}
.ct-row.disc-line{color:#16a34a;}
.ct-row.grand{font-size:16px;font-weight:800;color:#31201D;padding-top:7px;border-top:2px solid #31201D;margin-top:3px;}
.checkout-btn{margin:9px 12px 12px;display:flex;align-items:center;justify-content:center;gap:9px;background:#31201D;color:white;border:none;padding:13px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:0.2s;flex-shrink:0;}
.checkout-btn:hover:not(:disabled){background:#4a3330;}
.checkout-btn:disabled{opacity:0.4;cursor:not-allowed;}
.order-type-row{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid #f0ebe4;flex-shrink:0;}
.order-type-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px;border:1.5px solid #e8e0d5;border-radius:8px;background:white;color:#999;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:0.15s;}
.order-type-btn:hover{border-color:#31201D;color:#31201D;}
.order-type-btn.active-dine{background:#31201D;color:white;border-color:#31201D;}
.order-type-btn.active-take{background:#C49A6C;color:white;border-color:#C49A6C;}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);}
.oos-modal{background:white;border-radius:16px;width:420px;max-width:95vw;padding:28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
.oos-icon{color:#dc2626;display:flex;justify-content:center;margin-bottom:14px;}
.oos-modal h3{font-size:18px;font-weight:700;color:#31201D;margin:0 0 8px;}
.oos-modal p{font-size:13px;color:#666;margin:0 0 16px;line-height:1.5;}
.oos-list{background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;text-align:left;margin-bottom:10px;display:flex;flex-direction:column;gap:7px;}
.oos-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;}
.oos-dot{width:6px;height:6px;border-radius:50%;background:#dc2626;flex-shrink:0;margin-top:4px;}
.oos-name{flex:1;font-weight:600;color:#31201D;}
.oos-qty{color:#dc2626;font-size:11px;white-space:nowrap;}
.oos-footer-note{font-size:12px;color:#888;margin-bottom:14px !important;}
.oos-close-btn{background:#31201D;color:white;border:none;padding:11px 28px;border-radius:9px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;}
.size-modal{background:white;border-radius:20px;width:400px;max-width:95vw;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.22);}
.size-modal-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;}
.size-modal-header h2{font-size:19px;font-weight:700;color:#31201D;margin:0 0 3px;}
.size-modal-header p{font-size:13px;color:#888;margin:0;}
.size-options{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.size-option-btn{background:#f9f4ef;border:2px solid #e8d5c4;border-radius:14px;padding:20px 16px;cursor:pointer;font-family:inherit;transition:0.2s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;}
.size-option-btn:hover{border-color:#31201D;background:#fdfaf7;transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.08);}
.so-top{display:flex;flex-direction:column;align-items:center;gap:2px;}
.so-size{font-size:16px;font-weight:800;color:#31201D;}
.so-oz{font-size:12px;color:#bbb;font-weight:600;}
.so-price{font-size:20px;font-weight:800;color:#C49A6C;}
.payment-modal{background:white;border-radius:20px;width:480px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.22);}
.payment-view,.receipt-view{padding:26px 30px;}
.pv-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px;}
.pv-header h2{font-size:21px;font-weight:700;color:#31201D;margin:0 0 3px;}
.pv-header p{font-size:13px;color:#888;margin:0;}
.pv-header strong{color:#31201D;}
.pv-close{background:none;border:none;color:#ccc;cursor:pointer;padding:4px;}
.pm-tabs{display:flex;gap:8px;margin-bottom:22px;background:#f5f0eb;padding:4px;border-radius:12px;}
.pm-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border:none;border-radius:9px;background:transparent;font-size:14px;font-weight:600;cursor:pointer;color:#888;font-family:inherit;transition:0.2s;}
.pm-tab.active{background:white;color:#31201D;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
.cash-fields{display:flex;flex-direction:column;gap:14px;}
.cash-fields label{font-size:13px;font-weight:600;color:#31201D;}
.cash-input{width:100%;padding:13px 15px;border:2px solid #e8e0d5;border-radius:11px;font-size:26px;font-weight:700;text-align:right;outline:none;color:#31201D;box-sizing:border-box;font-family:inherit;transition:border-color 0.2s;}
.cash-input:focus{border-color:#31201D;}
.qa-btn{padding:9px;background:white;border:1px solid #e8e0d5;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:0.15s;color:#31201D;}
.exact-btn{width:100%;background:#f0f9f0;border:1.5px solid #86efac;color:#15803d;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;padding:11px;border-radius:9px;cursor:pointer;font-family:inherit;transition:0.2s;}
.exact-btn:hover{background:#dcfce7;border-color:#4ade80;}
.exact-label{font-size:11px;background:#16a34a;color:white;padding:2px 7px;border-radius:4px;font-weight:700;}
.cash-calc{background:#f9f4ef;border-radius:11px;padding:14px;display:flex;flex-direction:column;gap:7px;}
.cc-row{display:flex;justify-content:space-between;font-size:13px;color:#555;}
.change-row{font-size:16px;font-weight:800;padding-top:9px;border-top:1px solid #e8e0d5;margin-top:3px;}
.change-row.sufficient{color:#16a34a;}
.change-row.insufficient{color:#ef4444;}
.gcash-badge{background:linear-gradient(135deg,#0064E0 0%,#00A3FF 100%);border-radius:14px;padding:30px;text-align:center;color:white;}
.gcash-badge svg{opacity:0.9;margin-bottom:10px;}
.gcash-badge p{font-size:17px;font-weight:700;margin:0 0 5px;}
.gcash-badge span{font-size:13px;opacity:0.8;}
.pv-next{width:100%;margin-top:18px;padding:14px;background:#31201D;color:white;border:none;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:0.2s;}
.pv-next:hover:not(:disabled){background:#4a3330;}
.pv-next:disabled{opacity:0.4;cursor:not-allowed;}
.receipt-paper{background:#fffcf9;border:1px solid #ede8e2;border-radius:12px;padding:22px;font-family:'Courier New',monospace;}
.receipt-header{text-align:center;margin-bottom:14px;}
.r-icon-circle{background:#31201D;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 9px;}
.receipt-header h3{margin:0 0 2px;font-size:15px;font-weight:bold;}
.receipt-header p{margin:0 0 6px;font-size:11px;color:#888;}
.r-invoice-title{font-size:12px;font-weight:bold;letter-spacing:2px;border:1px solid #31201D;padding:3px 10px;display:inline-block;margin-top:4px;}
.r-txn-no{font-weight:800;font-family:'Courier New',monospace;}
.r-meta{margin-bottom:4px;}
.r-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;}
.r-divider{border-top:1px dashed #ccc;margin:11px 0;}
.r-items-header{display:grid;grid-template-columns:3fr 1fr 2fr 2fr;font-size:10px;font-weight:bold;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #ddd;color:#666;}
.r-item{display:grid;grid-template-columns:3fr 1fr 2fr 2fr;font-size:11px;margin-bottom:3px;align-items:start;}
.r-item-name{font-weight:500;word-break:break-word;}
.r-totals{display:flex;flex-direction:column;gap:4px;}
.r-total{font-weight:800;font-size:13px;color:#31201D;padding-top:5px;border-top:2px solid #31201D;margin-top:3px;}
.r-change{color:#16a34a;font-weight:700;}
.r-gcash{color:#0064E0;font-weight:700;}
.r-disc{color:#16a34a;}
.r-vat{color:#555;font-size:11px;}
.r-footer{text-align:center;margin-top:10px;font-size:11px;color:#aaa;}
.receipt-btns{display:flex;gap:9px;margin-top:18px;}
.rbtn-back{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#f5f0eb;border:none;padding:11px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;font-size:14px;}
.rbtn-print{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;transition:0.2s;}
.rbtn-print:hover{background:#e0f2fe;}
.rbtn-confirm{flex:2;background:#31201D;color:white;border:none;padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;transition:0.2s;}
.rbtn-confirm:hover:not(:disabled){background:#4a3330;}
.rbtn-confirm:disabled{opacity:0.5;cursor:not-allowed;}
.history-modal{background:white;border-radius:20px;width:980px;max-width:95vw;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
.hm-header{display:flex;justify-content:space-between;align-items:flex-start;padding:22px 26px;border-bottom:1px solid #f0ebe4;flex-shrink:0;}
.hm-header h2{font-size:19px;font-weight:700;color:#31201D;margin:0 0 3px;}
.hm-header p{font-size:13px;color:#888;margin:0;}
.hm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#f0ebe4;flex-shrink:0;}
.hms-card{background:white;padding:14px 22px;}
.hms-label{display:block;font-size:11px;color:#888;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.04em;}
.hms-val{font-size:20px;font-weight:800;color:#31201D;}
.hm-empty{padding:50px;text-align:center;color:#bbb;font-size:14px;display:flex;align-items:center;gap:12px;justify-content:center;}
.hm-table-wrap{overflow-y:auto;flex:1;}
.hm-table{width:100%;border-collapse:collapse;}
.hm-table th{text-align:left;padding:10px 15px;background:#fdfaf7;color:#888;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #f0ebe4;position:sticky;top:0;}
.hm-table td{padding:11px 15px;border-bottom:1px solid #f9f4ef;font-size:13px;vertical-align:top;}
.hm-table tr:hover td{background:#fdfaf7;}
.cancelled-row td{opacity:0.5;}
.id-tag{background:#f0ebe4;padding:3px 7px;border-radius:4px;font-family:monospace;font-weight:700;font-size:12px;color:#31201D;}
.muted{color:#bbb;font-size:12px;}
.h-item-line{line-height:1.7;}
.pm-badge{font-size:12px;font-weight:700;padding:2px 8px;border-radius:20px;}
.pm-badge.cash{background:#fef9c3;color:#a16207;}
.pm-badge.gcash{background:#dbeafe;color:#1d4ed8;}
.order-type-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap;}
.order-type-badge.dine_in{background:#fef3c7;color:#92400e;}
.order-type-badge.take_out{background:#fce7f3;color:#9d174d;}
.disc-badge{font-size:11px;background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:20px;font-weight:600;}
.disc-id-display{font-size:10px;color:#888;margin-top:2px;font-family:monospace;}
.cancel-reason-display{font-size:10px;color:#dc2626;margin-top:3px;font-style:italic;}
.total-col{font-weight:800;color:#31201D;}
.st-badge{font-size:11px;font-weight:600;padding:2px 9px;border-radius:20px;}
.st-badge.completed{background:#dcfce7;color:#15803d;}
.st-badge.pending{background:#fef9c3;color:#a16207;}
.st-badge.cancelled{background:#fee2e2;color:#dc2626;}
.cancel-order-btn{background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:inherit;transition:0.15s;}
.cancel-order-btn:hover:not(:disabled){background:#fecaca;}
.cancel-order-btn:disabled{opacity:0.5;cursor:not-allowed;}
.confirm-modal{background:white;border-radius:20px;width:440px;max-width:95vw;padding:30px 28px;box-shadow:0 20px 60px rgba(0,0,0,0.22);max-height:92vh;overflow-y:auto;}
.confirm-icon{color:#dc2626;display:flex;justify-content:center;margin-bottom:14px;}
.confirm-modal h3{font-size:18px;font-weight:700;color:#31201D;margin:0 0 8px;text-align:center;}
.confirm-modal p{font-size:13px;color:#888;margin:0 0 16px;line-height:1.5;text-align:center;}
.confirm-items{background:#f9f4ef;border-radius:10px;padding:12px 14px;text-align:left;margin-bottom:10px;}
.confirm-item-line{font-size:13px;color:#31201D;line-height:1.8;}
.confirm-total{font-size:15px;font-weight:800;color:#31201D;margin-bottom:16px;text-align:center;}
.cancel-reason-field{margin-bottom:18px;display:flex;flex-direction:column;gap:8px;}
.cancel-reason-field label{font-size:12px;font-weight:700;color:#31201D;text-transform:uppercase;letter-spacing:0.04em;}
.cancel-reason-presets{display:flex;flex-wrap:wrap;gap:6px;}
.preset-btn{background:#f5f0eb;border:1px solid #e8d5c4;color:#5c3317;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;cursor:pointer;font-family:inherit;transition:0.15s;}
.preset-btn.selected,.preset-btn:hover{background:#31201D;color:white;border-color:#31201D;}
.cancel-reason-input{width:100%;padding:9px 12px;border:1.5px solid #e8e0d5;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box;transition:border-color 0.2s;}
.cancel-reason-input:focus{border-color:#31201D;}
.cancel-reason-error{font-size:11px;color:#dc2626;}
.confirm-btns{display:flex;gap:9px;}
.conf-no{flex:1;background:#f5f0eb;border:none;padding:12px;border-radius:10px;font-weight:600;cursor:pointer;font-family:inherit;font-size:14px;}
.conf-yes{flex:1;background:#dc2626;color:white;border:none;padding:12px;border-radius:10px;font-weight:700;cursor:pointer;font-family:inherit;font-size:14px;transition:0.2s;}
.conf-yes:hover:not(:disabled){background:#b91c1c;}
.conf-yes:disabled{opacity:0.5;cursor:not-allowed;}
.spin{width:17px;height:17px;border:2px solid #eee;border-top-color:#C49A6C;border-radius:50%;animation:spin 0.7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
</style>