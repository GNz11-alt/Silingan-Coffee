<template>
  <div class="pos-container">
    <header class="page-header">
      <div class="header-text">
        <h1>Point of Sale</h1>
        <p>Process customer transactions — Cash Only</p>
      </div>
      <button class="new-sale-btn" @click="openModal">
        <Plus :size="18" /> New Sale
      </button>
    </header>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-top"><span>Today's Revenue</span><DollarSign :size="16" /></div>
        <div class="stat-value">₱{{ totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span>Transactions</span><CheckCircle :size="16" /></div>
        <div class="stat-value">{{ transactions.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><span>Average Sale</span><TrendingUp :size="16" /></div>
        <div class="stat-value">₱{{ avgSale.toFixed(2) }}</div>
      </div>
    </div>

    <!-- Recent Transactions Table -->
    <div class="table-section">
      <div class="table-header-row">
        <h3>Recent Transactions</h3>
        <span class="table-subtitle">Today's completed orders</span>
      </div>
      <div v-if="loadingTransactions" class="loading-state">Loading transactions...</div>
      <table v-else class="main-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Date</th>
            <th>Items</th>
            <th>Discount</th>
            <th>Cash Paid</th>
            <th>Change</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="transactions.length === 0">
            <td colspan="8" class="empty-row">No transactions today.</td>
          </tr>
          <tr v-for="tr in transactions" :key="tr.OrderId">
            <td><span class="id-tag">#{{ tr.OrderId }}</span></td>
            <td>{{ formatDate(tr.CreatedAt) }}</td>
            <td>
              <div v-for="item in tr.orderitem" :key="item.OrderItemId" class="item-line">
                {{ item.Quantity }}x {{ item.product?.ProductName ?? 'Unknown' }}
              </div>
            </td>
            <td>
              <span v-if="tr.discount" class="discount-badge">
                {{ tr.discount.discountname }} ({{ tr.discount.discounttype === 'percentage' ? tr.discount.discountvalue + '%' : '₱' + tr.discount.discountvalue }})
              </span>
              <span v-else class="no-discount">—</span>
            </td>
            <td>₱{{ (tr.cashpaid ?? 0).toFixed(2) }}</td>
            <td class="change-cell">₱{{ (tr.changegiven ?? 0).toFixed(2) }}</td>
            <td class="total-cell">₱{{ (tr.FinalAmount ?? 0).toFixed(2) }}</td>
            <td><span :class="['status-badge', tr.Status]">{{ tr.Status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="isModalOpen" class="modal-backdrop">

      <!-- STEP 1: Process Sale -->
      <div class="process-sale-dialog" v-if="!showReceiptStep">
        <header class="dialog-header">
          <div class="dialog-title-area">
            <h2>Process Sale</h2>
            <p>Add items, apply discount, and collect cash</p>
          </div>
          <button class="close-dialog" @click="closeModal"><X :size="22" /></button>
        </header>

        <div class="dialog-body">
          <!-- LEFT: Product Selection + Cart -->
          <div class="pane selection-pane">
            <div class="form-group">
              <label>Select Product</label>
              <div class="custom-select-wrapper">
                <select v-model="selectedItem">
                  <option :value="null">Choose a menu item</option>
                  <option v-for="m in menu" :key="m.ProductId" :value="m">
                    {{ m.ProductName }} — ₱{{ m.Price }}
                  </option>
                </select>
                <ChevronDown class="select-icon" :size="16" />
              </div>
            </div>

            <div class="form-group">
              <label>Quantity</label>
              <input type="number" v-model.number="tempQty" min="1" />
            </div>

            <button class="add-to-cart-btn" @click="addToCart" :disabled="!selectedItem">
              <ShoppingCart :size="18" /> Add to Cart
            </button>

            <!-- Cart -->
            <div class="cart-box">
              <h3>Order Summary</h3>
              <div v-if="cart.length === 0" class="empty-cart-msg">No items in cart</div>
              <div v-else class="cart-items-list">
                <div v-for="(item, i) in cart" :key="i" class="cart-line">
                  <div class="cart-line-info">
                    <span class="line-name">{{ item.ProductName }}</span>
                    <span class="line-qty">{{ item.qty }} x ₱{{ item.Price }}</span>
                  </div>
                  <div class="cart-line-right">
                    <span class="line-subtotal">₱{{ (item.qty * item.Price).toFixed(2) }}</span>
                    <button @click="removeFromCart(i)" class="remove-line"><Trash2 :size="14" /></button>
                  </div>
                </div>
              </div>

              <!-- Discount row -->
              <div class="discount-row" v-if="selectedDiscount">
                <span class="discount-label">
                  <Tag :size="13" />
                  {{ selectedDiscount.discountname }}
                  ({{ selectedDiscount.discounttype === 'percentage' ? selectedDiscount.discountvalue + '%' : '₱' + selectedDiscount.discountvalue }} off)
                </span>
                <span class="discount-amount">-₱{{ discountAmount.toFixed(2) }}</span>
              </div>

              <div class="cart-total-row">
                <span>Total Amount:</span>
                <span class="cart-grand-total">₱{{ finalTotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- RIGHT: Discount + Payment -->
          <div class="pane payment-pane">

            <!-- Discount Section -->
            <div class="discount-card">
              <div class="card-title">
                <Tag :size="18" class="icon-green" />
                <span>Apply Discount</span>
              </div>
              <p class="card-desc">Optional — select an available discount</p>
              <div class="custom-select-wrapper" style="margin-top: 14px;">
                <select v-model="selectedDiscount">
                  <option :value="null">No discount</option>
                  <option v-for="d in discounts" :key="d.discountid" :value="d">
                    {{ d.discountname }} —
                    {{ d.discounttype === 'percentage' ? d.discountvalue + '% off' : '₱' + d.discountvalue + ' off' }}
                  </option>
                </select>
                <ChevronDown class="select-icon" :size="16" />
              </div>
            </div>

            <!-- Cash Payment -->
            <div class="cash-payment-card">
              <div class="card-title">
                <Banknote :size="20" class="icon-gold" />
                <span>Cash Payment</span>
              </div>
              <p class="card-desc">All transactions are cash only</p>

              <div class="form-group" style="margin-top: 20px;">
                <label>Amount Received (₱)</label>
                <input type="number" v-model.number="cashReceived" class="cash-input" placeholder="0.00" />
              </div>

              <div class="calc-box" v-if="finalTotal > 0">
                <div class="calc-row"><span>Subtotal:</span><span>₱{{ cartTotal.toFixed(2) }}</span></div>
                <div class="calc-row" v-if="selectedDiscount">
                  <span>Discount:</span><span class="discount-deduct">-₱{{ discountAmount.toFixed(2) }}</span>
                </div>
                <div class="calc-row total-due-row"><span>Total Due:</span><span>₱{{ finalTotal.toFixed(2) }}</span></div>
                <div class="calc-row result-row">
                  <span>Change:</span>
                  <span :class="changeAmount < 0 ? 'change-negative' : 'change-amount'">
                    ₱{{ Math.max(0, changeAmount).toFixed(2) }}
                  </span>
                </div>
              </div>

              <div class="quick-cash-area">
                <label>Quick Amount</label>
                <div class="quick-grid">
                  <button v-for="val in [50, 100, 200, 500, 1000, 2000]" :key="val" @click="cashReceived = val">
                    ₱{{ val }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="dialog-footer">
          <button class="cancel-action" @click="closeModal">Cancel</button>
          <button
            class="complete-action"
            :disabled="cart.length === 0 || cashReceived < finalTotal"
            @click="showReceiptStep = true"
          >
            <Check :size="18" /> Preview Receipt
          </button>
        </footer>
      </div>

      <!-- STEP 2: Receipt Preview -->
      <div v-else class="receipt-overlay">
        <div class="receipt-card">
          <div class="receipt-paper">
            <div class="receipt-header">
              <div class="coffee-icon-circle"><Coffee :size="24" /></div>
              <h2>Silingan Coffee</h2>
              <p>{{ branchAddress || branchRecord?.BranchName || 'Main Branch' }}</p>
            </div>

            <div class="r-details">
              <div class="r-row"><span>Date:</span><span>{{ currentDate }}</span></div>
              <div class="r-row"><span>Cashier:</span><span>{{ cashierName }}</span></div>
            </div>

            <div class="r-divider"></div>

            <div class="r-items-scroll">
              <div v-for="item in cart" :key="item.ProductId" class="r-item">
                <span>{{ item.qty }}x {{ item.ProductName }}</span>
                <span>₱{{ (item.qty * item.Price).toFixed(2) }}</span>
              </div>
            </div>

            <div class="r-divider"></div>

            <div class="r-totals">
              <div class="r-total-row"><span>Subtotal</span><span>₱{{ cartTotal.toFixed(2) }}</span></div>
              <div class="r-total-row" v-if="selectedDiscount">
                <span>Discount ({{ selectedDiscount.discountname }})</span>
                <span class="r-discount">-₱{{ discountAmount.toFixed(2) }}</span>
              </div>
              <div class="r-total-row big"><span>Total</span><span>₱{{ finalTotal.toFixed(2) }}</span></div>
              <div class="r-total-row"><span>Cash</span><span>₱{{ cashReceived.toFixed(2) }}</span></div>
              <div class="r-total-row change"><span>Change</span><span>₱{{ Math.max(0, changeAmount).toFixed(2) }}</span></div>
            </div>

            <div class="r-footer">Thank you for your visit!</div>
          </div>

          <div class="receipt-actions">
            <button class="back-btn" @click="showReceiptStep = false"><ArrowLeft :size="16" /> Edit Order</button>
            <button class="confirm-btn" :disabled="saving" @click="finishTransaction">
              <span v-if="saving">Saving...</span>
              <span v-else>Confirm &amp; Finalize Sale</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  Plus, DollarSign, CheckCircle, TrendingUp, X, ChevronDown,
  ShoppingCart, Trash2, Banknote, Check, Coffee, ArrowLeft, Tag
} from 'lucide-vue-next';
import { supabase } from '@/supabase';

// State 
const menu = ref([]);
const discounts = ref([]);
const transactions = ref([]);
const loadingTransactions = ref(false);

const isModalOpen = ref(false);
const showReceiptStep = ref(false);
const selectedItem = ref(null);
const tempQty = ref(1);
const cart = ref([]);
const cashReceived = ref(0);
const selectedDiscount = ref(null);
const saving = ref(false);

// Current user/branch info 
const currentUser = ref(null);
const branchRecord = ref(null);

const cashierName = computed(() => currentUser.value?.username ?? localStorage.getItem('username') ?? 'Staff');
const branchId = computed(() => branchRecord.value?.BranchId ?? null);
const branchAddress = computed(() => branchRecord.value?.Location ?? '');
const currentDate = new Date().toLocaleDateString('en-PH');

// Computed
const cartTotal = computed(() =>
  cart.value.reduce((s, i) => s + i.Price * i.qty, 0)
);

const discountAmount = computed(() => {
  if (!selectedDiscount.value || cartTotal.value === 0) return 0;
  const d = selectedDiscount.value;
  if (d.discounttype === 'percentage') {
    return parseFloat(((cartTotal.value * d.discountvalue) / 100).toFixed(2));
  }
  return Math.min(d.discountvalue, cartTotal.value);
});

const finalTotal = computed(() =>
  Math.max(0, cartTotal.value - discountAmount.value)
);

const changeAmount = computed(() => cashReceived.value - finalTotal.value);

const totalRevenue = computed(() =>
  transactions.value.reduce((s, t) => s + (t.FinalAmount ?? 0), 0)
);

const avgSale = computed(() =>
  transactions.value.length ? totalRevenue.value / transactions.value.length : 0
);

// Data Fetching
const fetchCurrentUser = async () => {
  // Login.vue stores user info in localStorage (no Supabase Auth used)
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  const branchSlug = localStorage.getItem('branch'); // e.g. "dlsu", "ateneo"

  if (!username) return;

  // Load user record from users table
  const { data: userData } = await supabase
    .from('users')
    .select('id, username, role, branch')
    .eq('username', username)
    .single();
  if (userData) currentUser.value = userData;

  // Look up the branch record using the branch text slug stored in users.branch
  if (branchSlug && branchSlug !== 'all') {
    const { data: branchData } = await supabase
      .from('branch')
      .select('BranchId, BranchName, Location')
      .eq('BranchName', branchSlug)
      .maybeSingle();

    // Try matching by Location if BranchName didn't match
    if (!branchData) {
      const { data: branchByLoc } = await supabase
        .from('branch')
        .select('BranchId, BranchName, Location')
        .ilike('Location', '%' + branchSlug + '%')
        .maybeSingle();
      if (branchByLoc) branchRecord.value = branchByLoc;
    } else {
      branchRecord.value = branchData;
    }
  }
};

const fetchMenu = async () => {
  const query = supabase
    .from('product')
    .select('ProductId, ProductName, ProductType, Category, Price, BranchId')
    .eq('ProductType', 'finished'); // only sellable products

  // Scope by branch if available
  if (branchId.value) query.eq('BranchId', branchId.value);

  const { data, error } = await query;
  if (error) console.error('Error fetching menu:', error.message);
  else menu.value = data ?? [];
};

const fetchDiscounts = async () => {
  const { data, error } = await supabase
    .from('discount')
    .select('discountid, discountname, discounttype, discountvalue')
    .order('discountname');
  if (error) console.error('Error fetching discounts:', error.message);
  else discounts.value = data ?? [];
};

const fetchTransactions = async () => {
  loadingTransactions.value = true;

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const query = supabase
    .from('orders')
    .select(`
      OrderId,
      TotalAmount,
      DiscountId,
      DiscountedAmount,
      FinalAmount,
      cashpaid,
      changegiven,
      PaymentMethod,
      Status,
      CreatedAt,
      discount ( discountid, discountname, discounttype, discountvalue ),
      orderitem (
        OrderItemId,
        Quantity,
        UnitPrice,
        Subtotal,
        ProductId,
        product ( ProductId, ProductName )
      )
    `)
    .gte('CreatedAt', today.toISOString())
    .lt('CreatedAt', tomorrow.toISOString())
    .order('CreatedAt', { ascending: false });

  if (branchId.value) query.eq('BranchId', branchId.value);

  const { data, error } = await query;
  if (error) console.error('Error fetching transactions:', error.message);
  else transactions.value = data ?? [];

  loadingTransactions.value = false;
};

// Modal Controls
const openModal = () => {
  cart.value = [];
  cashReceived.value = 0;
  selectedItem.value = null;
  tempQty.value = 1;
  selectedDiscount.value = null;
  showReceiptStep.value = false;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  showReceiptStep.value = false;
};

const addToCart = () => {
  if (!selectedItem.value) return;
  const existing = cart.value.find(i => i.ProductId === selectedItem.value.ProductId);
  if (existing) {
    existing.qty += tempQty.value;
  } else {
    cart.value.push({ ...selectedItem.value, qty: tempQty.value });
  }
  selectedItem.value = null;
  tempQty.value = 1;
};

const removeFromCart = (index) => cart.value.splice(index, 1);

// Save Transaction 
const finishTransaction = async () => {
  if (saving.value) return;
  saving.value = true;

  try {
    // 1. Insert order row
    const orderPayload = {
      PaymentMethod: 'cash',
      Status: 'completed',
      TotalAmount: cartTotal.value,
      DiscountId: selectedDiscount.value?.discountid ?? null,
      DiscountedAmount: discountAmount.value,
      FinalAmount: finalTotal.value,
      cashpaid: cashReceived.value,
      changegiven: Math.max(0, changeAmount.value),
    };

    // Add BranchId and CashierId if available
    if (branchId.value) orderPayload.BranchId = branchId.value;
    if (currentUser.value?.id) orderPayload.CashierId = currentUser.value.id;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    // 2. Insert order items
    const itemRows = cart.value.map(item => ({
      OrderId: order.OrderId,
      ProductId: item.ProductId,
      Quantity: item.qty,
      UnitPrice: item.Price,
      Subtotal: item.qty * item.Price,
    }));

    const { error: itemsError } = await supabase
      .from('orderitem')
      .insert(itemRows);

    if (itemsError) throw new Error(itemsError.message);

    // 3. Refresh transaction list
    await fetchTransactions();
    closeModal();

  } catch (err) {
    console.error('Transaction failed:', err.message);
    alert('Failed to save transaction: ' + err.message);
  } finally {
    saving.value = false;
  }
};

// Helpers 
const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

//  Init
onMounted(async () => {
  await fetchCurrentUser();
  await Promise.all([fetchMenu(), fetchDiscounts(), fetchTransactions()]);
});
</script>

<style scoped>
.pos-container { padding: 32px; background: #fafafa; min-height: 100vh; font-family: 'Inter', sans-serif; }

/* HEADER */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-text h1 { font-size: 26px; color: #31201D; margin: 0; }
.header-text p { color: #888; font-size: 14px; margin: 4px 0 0; }
.new-sale-btn { background: #31201D; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
.new-sale-btn:hover { background: #4a3330; }

/* STATS */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.stat-top { display: flex; justify-content: space-between; color: #666; font-size: 14px; font-weight: 600; }
.stat-value { font-size: 32px; font-weight: 800; color: #31201D; margin: 8px 0 0; }

/* TABLE */
.table-section { background: white; border-radius: 12px; border: 1px solid #eee; padding: 24px; }
.table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.table-header-row h3 { margin: 0; font-size: 18px; color: #31201D; }
.table-subtitle { font-size: 13px; color: #999; }
.main-table { width: 100%; border-collapse: collapse; }
.main-table th { text-align: left; padding: 12px; color: #666; font-size: 13px; font-weight: 600; border-bottom: 2px solid #f5f5f5; }
.main-table td { padding: 14px 12px; border-bottom: 1px solid #f9f9f9; font-size: 14px; vertical-align: top; }
.id-tag { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: 600; font-size: 12px; }
.item-line { font-size: 13px; line-height: 1.8; }
.change-cell { color: #16a34a; font-weight: 600; }
.total-cell { font-weight: 800; color: #31201D; }
.empty-row { text-align: center; color: #bbb; padding: 40px !important; }
.loading-state { text-align: center; color: #bbb; padding: 40px; }
.discount-badge { background: #dcfce7; color: #15803d; font-size: 12px; padding: 3px 8px; border-radius: 20px; font-weight: 600; white-space: nowrap; }
.no-discount { color: #ccc; }
.status-badge { font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
.status-badge.completed { background: #dcfce7; color: #15803d; }
.status-badge.pending { background: #fef9c3; color: #a16207; }
.status-badge.cancelled { background: #fee2e2; color: #dc2626; }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.process-sale-dialog { background: white; width: 1020px; max-width: 96vw; max-height: 92vh; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; }

.dialog-header { padding: 22px 32px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.dialog-title-area h2 { margin: 0; font-size: 22px; color: #31201D; }
.dialog-title-area p { margin: 4px 0 0; color: #888; font-size: 14px; }
.close-dialog { background: none; border: none; color: #ccc; cursor: pointer; transition: 0.2s; }
.close-dialog:hover { color: #31201D; }

.dialog-body { display: grid; grid-template-columns: 1fr 1fr; flex: 1; overflow: hidden; }
.pane { padding: 28px 32px; overflow-y: auto; }
.selection-pane { border-right: 1px solid #f0f0f0; }
.payment-pane { background: #fdfaf8; display: flex; flex-direction: column; gap: 20px; }

/* FORMS */
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 13px; font-weight: 700; color: #31201D; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.custom-select-wrapper { position: relative; }
.custom-select-wrapper select,
.form-group input[type="number"] {
  width: 100%; padding: 11px 16px; border: 1px solid #ddd; border-radius: 10px;
  background: white; font-size: 15px; outline: none; appearance: none;
  transition: border-color 0.2s; box-sizing: border-box;
}
.custom-select-wrapper select:focus,
.form-group input[type="number"]:focus { border-color: #31201D; }
.select-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none; }

.add-to-cart-btn {
  width: 100%; background: #a8a8a8; color: white; border: none; padding: 13px;
  border-radius: 10px; font-weight: 700; cursor: pointer; display: flex;
  align-items: center; justify-content: center; gap: 10px; transition: 0.2s; font-size: 15px;
}
.add-to-cart-btn:not(:disabled) { background: #31201D; }
.add-to-cart-btn:not(:disabled):hover { background: #4a3330; }

/* CART */
.cart-box { margin-top: 24px; background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; }
.cart-box h3 { font-size: 15px; margin: 0 0 14px; color: #31201D; }
.empty-cart-msg { color: #bbb; font-size: 14px; text-align: center; padding: 20px 0; }
.cart-items-list { max-height: 180px; overflow-y: auto; }
.cart-line { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dotted #eee; align-items: center; }
.line-name { display: block; font-weight: 600; font-size: 14px; }
.line-qty { font-size: 12px; color: #999; }
.cart-line-right { display: flex; align-items: center; gap: 10px; }
.line-subtotal { font-weight: 700; font-size: 14px; }
.remove-line { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
.discount-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dotted #eee; font-size: 13px; color: #15803d; }
.discount-label { display: flex; align-items: center; gap: 6px; }
.discount-amount { font-weight: 700; }
.cart-total-row { display: flex; justify-content: space-between; padding-top: 14px; margin-top: 4px; font-size: 17px; font-weight: 800; border-top: 1px solid #eee; }
.cart-grand-total { color: #31201D; }

/* DISCOUNT CARD */
.discount-card { background: white; border-radius: 14px; border: 1px solid #d1fae5; padding: 20px; }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #15803d; font-size: 15px; }
.icon-green { color: #16a34a; }
.card-desc { font-size: 13px; color: #6b7280; margin: 4px 0 0; }

/* PAYMENT CARD */
.cash-payment-card { background: white; border-radius: 14px; border: 1px solid #ffe4cc; padding: 20px; box-shadow: 0 4px 12px rgba(133, 77, 14, 0.05); }
.icon-gold { color: #d97706; }

.cash-input { font-size: 24px !important; font-weight: 700 !important; text-align: right; color: #31201D; }

.calc-box { margin-top: 20px; background: #f9f9f9; border-radius: 10px; padding: 18px; }
.calc-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; color: #666; }
.total-due-row { font-weight: 700; color: #31201D; }
.discount-deduct { color: #16a34a; font-weight: 600; }
.result-row { border-top: 1px solid #eee; padding-top: 12px; margin-top: 8px; font-size: 17px; font-weight: 800; color: #31201D; }
.change-amount { font-size: 22px; color: #16a34a; }
.change-negative { font-size: 22px; color: #ef4444; }

.quick-cash-area { margin-top: 20px; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
.quick-grid button { padding: 11px 8px; background: white; border: 1px solid #e5e5e5; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 13px; }
.quick-grid button:hover { border-color: #31201D; color: #31201D; background: #fdfaf8; }

/* FOOTER */
.dialog-footer { padding: 20px 32px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 16px; flex-shrink: 0; }
.cancel-action { background: #f5f5f5; border: none; padding: 13px 26px; border-radius: 10px; cursor: pointer; font-weight: 600; }
.complete-action { background: #31201D; color: white; border: none; padding: 13px 28px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.2s; }
.complete-action:disabled { opacity: 0.35; cursor: not-allowed; }
.complete-action:not(:disabled):hover { background: #4a3330; }

/* RECEIPT */
.receipt-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(4px); }
.receipt-card { background: white; width: 400px; padding: 28px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); }
.receipt-paper { background: #fffcf9; border: 1px solid #eee; padding: 24px; border-radius: 12px; font-family: 'Courier New', monospace; }
.receipt-header { text-align: center; margin-bottom: 18px; }
.receipt-header h2 { margin: 8px 0 2px; font-size: 18px; }
.receipt-header p { margin: 0; color: #888; font-size: 12px; }
.coffee-icon-circle { background: #31201D; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
.r-details { margin-bottom: 4px; }
.r-row, .r-item, .r-total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.r-divider { border-top: 1px dashed #ccc; margin: 14px 0; }
.r-items-scroll { max-height: 140px; overflow-y: auto; }
.r-total-row.big { font-weight: 800; font-size: 15px; color: #31201D; }
.r-total-row.change { color: #16a34a; font-weight: 800; padding-top: 12px; border-top: 1px solid #eee; }
.r-discount { color: #16a34a; }
.r-footer { text-align: center; margin-top: 16px; font-size: 12px; color: #aaa; }

.receipt-actions { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
.back-btn { background: #f5f5f5; border: none; padding: 13px; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
.confirm-btn { background: #31201D; color: white; border: none; padding: 14px; border-radius: 10px; font-weight: 800; cursor: pointer; text-align: center; transition: 0.2s; }
.confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.confirm-btn:not(:disabled):hover { background: #4a3330; }
</style>