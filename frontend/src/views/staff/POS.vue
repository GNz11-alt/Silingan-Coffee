<template>
  <div class="pos-container">
    <header class="page-header">
      <div class="header-text">
        <h1>Point of Sale</h1>
        <p>Process customer transactions - Cash Only</p>
      </div>
      <button class="new-sale-btn" @click="openModal">
        <Plus :size="18" /> New Sale
      </button>
    </header>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-top"><span>Today's Revenue</span><DollarSign :size="16" /></div>
        <div class="stat-value">₱{{ totalRevenue.toLocaleString() }}</div>
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

    <div class="table-section">
      <h3>Recent Transactions</h3>
      <table class="main-table">
        <thead>
          <tr>
            <th>ID</th><th>Date</th><th>Items</th><th>Paid</th><th>Change</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tr in transactions" :key="tr.id">
            <td><span class="id-tag">{{ tr.id }}</span></td>
            <td>{{ tr.date }} <small>{{ tr.time }}</small></td>
            <td><div v-for="item in tr.items" :key="item.name">{{ item.qty }}x {{ item.name }}</div></td>
            <td>₱{{ tr.paid.toFixed(2) }}</td>
            <td class="change-cell">₱{{ tr.change.toFixed(2) }}</td>
            <td class="total-cell">₱{{ tr.total.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="isModalOpen" class="modal-backdrop">
      
      <div class="process-sale-dialog" v-if="!showReceiptStep">
        <header class="dialog-header">
          <div class="dialog-title-area">
            <h2>Process Sale - Cash Payment Only</h2>
            <p>Add items to cart and complete the transaction</p>
          </div>
          <button class="close-dialog" @click="closeModal"><X :size="22" /></button>
        </header>

        <div class="dialog-body">
          <div class="pane selection-pane">
            <div class="form-group">
              <label>Select Product</label>
              <div class="custom-select-wrapper">
                <select v-model="selectedItem">
                  <option :value="null">Choose a menu item</option>
                  <option v-for="m in menu" :key="m.name" :value="m">{{ m.name }} — ₱{{ m.price }}</option>
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

            <div class="cart-box">
              <h3>Order Summary</h3>
              <div v-if="cart.length === 0" class="empty-cart-msg">No items in cart</div>
              <div v-else class="cart-items-list">
                <div v-for="(item, i) in cart" :key="i" class="cart-line">
                  <div class="cart-line-info">
                    <span class="line-name">{{ item.name }}</span>
                    <span class="line-qty">{{ item.qty }} x ₱{{ item.price }}</span>
                  </div>
                  <div class="cart-line-right">
                    <span class="line-subtotal">₱{{ (item.qty * item.price).toFixed(2) }}</span>
                    <button @click="removeFromCart(i)" class="remove-line"><Trash2 :size="14" /></button>
                  </div>
                </div>
              </div>
              <div class="cart-total-row">
                <span>Total Amount:</span>
                <span class="cart-grand-total">₱{{ cartTotal.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="pane payment-pane">
            <div class="cash-payment-card">
              <div class="card-title">
                <Banknote :size="20" class="icon-gold" />
                <span>Cash Payment</span>
              </div>
              <p class="card-desc">All transactions are cash only</p>

              <div class="form-group" style="margin-top: 24px;">
                <label>Amount Received (₱)</label>
                <input type="number" v-model.number="cashReceived" class="cash-input" placeholder="0.00" />
              </div>

              <div class="calc-box" v-if="cartTotal > 0">
                <div class="calc-row"><span>Total Due:</span> <span>₱{{ cartTotal.toFixed(2) }}</span></div>
                <div class="calc-row result-row">
                  <span>Change:</span>
                  <span class="change-amount">₱{{ changeAmount.toFixed(2) }}</span>
                </div>
              </div>

              <div class="quick-cash-area">
                <label>Quick Amount</label>
                <div class="quick-grid">
                  <button v-for="val in [100, 200, 500, 1000, 2000, 5000]" :key="val" @click="cashReceived = val">₱{{ val }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="dialog-footer">
          <button class="cancel-action" @click="closeModal">Cancel</button>
          <button class="complete-action" :disabled="cartTotal === 0 || cashReceived < cartTotal" @click="showReceiptStep = true">
            <Check :size="18" /> Complete Sale
          </button>
        </footer>
      </div>

      <div v-else class="receipt-overlay">
        <div class="receipt-card">
          <div class="receipt-paper">
            <div class="receipt-header">
              <div class="coffee-icon-circle"><Coffee :size="24" /></div>
              <h2>Silingan Coffee</h2>
              <p>Address</p>
            </div>

            <div class="r-details">
              <div class="r-row"><span>ID:</span> <strong>#{{ nextSaleId }}</strong></div>
              <div class="r-row"><span>Date:</span> <span>{{ currentDate }}</span></div>
              <div class="r-row"><span>Cashier:</span> <span>Ana Reyes</span></div>
            </div>

            <div class="r-divider"></div>

            <div class="r-items-scroll">
              <div v-for="item in cart" :key="item.name" class="r-item">
                <span>{{ item.qty }}x {{ item.name }}</span>
                <span>₱{{ (item.qty * item.price).toFixed(2) }}</span>
              </div>
            </div>

            <div class="r-divider"></div>

            <div class="r-totals">
              <div class="r-total-row big"><span>Total</span> <span>₱{{ cartTotal.toFixed(2) }}</span></div>
              <div class="r-total-row"><span>Cash</span> <span>₱{{ cashReceived.toFixed(2) }}</span></div>
              <div class="r-total-row change"><span>Change</span> <span>₱{{ changeAmount.toFixed(2) }}</span></div>
            </div>

            <div class="r-footer">Thank you for your support!</div>
          </div>

          <div class="receipt-actions">
            <button class="back-btn" @click="showReceiptStep = false"><ArrowLeft :size="16" /> Edit Order</button>
            <button class="confirm-btn" @click="finishTransaction">Confirm & Finalize Sale</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  Plus, DollarSign, CheckCircle, TrendingUp, X, ChevronDown, 
  ShoppingCart, Trash2, Banknote, Check, Coffee, ArrowLeft
} from 'lucide-vue-next';

const menu = [
  { name: 'Flat White', price: 155 }, { name: 'Iced Latte', price: 160 },
  { name: 'Mocha', price: 165 }, { name: 'Americano', price: 120 },
  { name: 'Cappuccino', price: 150 }, { name: 'Latte', price: 150 }
];

const transactions = ref([
  { id: 'S006', date: '5/12/2026', time: '16:06', items: [{name: 'Flat White', qty: 1}], cashier: 'Ana Reyes', paid: 500, change: 345, total: 155 },
]);

const isModalOpen = ref(false);
const showReceiptStep = ref(false);
const selectedItem = ref(null);
const tempQty = ref(1);
const cart = ref([]);
const cashReceived = ref(0);

const cartTotal = computed(() => cart.value.reduce((s, i) => s + (i.price * i.qty), 0));
const changeAmount = computed(() => Math.max(0, cashReceived.value - cartTotal.value));
const totalRevenue = computed(() => transactions.value.reduce((s, t) => s + t.total, 0));
const avgSale = computed(() => transactions.value.length ? totalRevenue.value / transactions.value.length : 0);
const nextSaleId = computed(() => 'S' + String(transactions.value.length + 1).padStart(3, '0'));
const currentDate = new Date().toLocaleDateString();

const openModal = () => {
  isModalOpen.value = true;
  showReceiptStep.value = false;
  cart.value = [];
  cashReceived.value = 0;
};

const closeModal = () => { isModalOpen.value = false; showReceiptStep.value = false; };

const addToCart = () => {
  if (selectedItem.value) {
    cart.value.push({ ...selectedItem.value, qty: tempQty.value });
    selectedItem.value = null; tempQty.value = 1;
  }
};

const removeFromCart = (index) => cart.value.splice(index, 1);

const finishTransaction = () => {
  transactions.value.unshift({
    id: nextSaleId.value,
    date: currentDate,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: [...cart.value],
    cashier: 'Ana Reyes',
    paid: cashReceived.value,
    change: changeAmount.value,
    total: cartTotal.value
  });
  closeModal();
};
</script>

<style scoped>
.pos-container { padding: 32px; background: #fafafa; min-height: 100vh; font-family: 'Inter', sans-serif; }

/* HEADER */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-text h1 { font-size: 26px; color: #31201D; margin: 0; }
.header-text p { color: #888; font-size: 14px; }
.new-sale-btn { background: #31201D; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }

/* METRICS */
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 32px; }
.stat-card { background: white; padding: 24px; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.stat-top { display: flex; justify-content: space-between; color: #666; font-size: 14px; font-weight: 600; }
.stat-value { font-size: 32px; font-weight: 800; color: #31201D; margin: 8px 0; }
.stat-label { font-size: 12px; color: #aaa; }

/* TABLE */
.table-section { background: white; border-radius: 12px; border: 1px solid #eee; padding: 24px; }
.table-subtitle { font-size: 14px; color: #999; margin-bottom: 20px; }
.main-table { width: 100%; border-collapse: collapse; }
.main-table th { text-align: left; padding: 12px; color: #666; font-size: 13px; border-bottom: 2px solid #f9f9f9; }
.main-table td { padding: 16px 12px; border-bottom: 1px solid #f9f9f9; font-size: 14px; }
.id-tag { background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-weight: 600; }
.change-cell { color: #16a34a; font-weight: 600; }
.total-cell { font-weight: 800; color: #31201D; }

/* Sale */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.process-sale-dialog { background: white; width: 1000px; max-width: 95vw; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); overflow: hidden; }

.dialog-header { padding: 24px 32px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
.dialog-title-area h2 { margin: 0; font-size: 22px; color: #31201D; }
.dialog-title-area p { margin: 4px 0 0; color: #888; font-size: 14px; }
.close-dialog { background: none; border: none; color: #ccc; cursor: pointer; transition: 0.2s; }
.close-dialog:hover { color: #31201D; }

.dialog-body { display: grid; grid-template-columns: 1fr 1fr; }
.pane { padding: 32px; }
.selection-pane { border-right: 1px solid #f0f0f0; }
.payment-pane { background: #fdfaf8; }

/* FORMS */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 700; color: #31201D; margin-bottom: 8px; }
.custom-select-wrapper { position: relative; }
.custom-select-wrapper select, .form-group input { width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 10px; background: white; font-size: 15px; outline: none; appearance: none; }
.select-icon { position: absolute; right: 12px; top: 14px; color: #999; }

.add-to-cart-btn { width: 100%; background: #a8a8a8; color: white; border: none; padding: 14px; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.2s; }
.add-to-cart-btn:not(:disabled) { background: #31201D; }

/* CART */
.cart-box { margin-top: 32px; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px; }
.cart-box h3 { font-size: 16px; margin: 0 0 16px; }
.cart-items-list { max-height: 200px; overflow-y: auto; }
.cart-line { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dotted #eee; }
.line-name { display: block; font-weight: 600; font-size: 14px; }
.line-qty { font-size: 12px; color: #999; }
.line-subtotal { font-weight: 700; font-size: 15px; margin-right: 12px; }
.remove-line { background: none; border: none; color: #ef4444; cursor: pointer; }
.cart-footer { display: flex; justify-content: space-between; padding-top: 16px; margin-top: 8px; font-size: 18px; font-weight: 800; border-top: 1px solid #eee; }

/* PAYMENT */
.cash-payment-card { background: white; border-radius: 16px; border: 1px solid #ffe4cc; padding: 24px; box-shadow: 0 4px 12px rgba(133, 77, 14, 0.05); }
.card-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #854d0e; }
.icon-gold { color: #d97706; }
.card-desc { font-size: 13px; color: #a16207; margin-top: 4px; }

.cash-input { font-size: 24px !important; font-weight: 700; text-align: right; color: #31201D; }

.calc-box { margin-top: 24px; background: #f9f9f9; border-radius: 10px; padding: 20px; }
.calc-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; color: #666; }
.result-row { border-top: 1px solid #eee; padding-top: 15px; margin-top: 10px; font-size: 18px; font-weight: 800; color: #31201D; }
.change-amount { font-size: 24px; color: #31201D; }

.quick-cash-area { margin-top: 32px; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.quick-grid button { padding: 12px; background: white; border: 1px solid #eee; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; }
.quick-grid button:hover { border-color: #31201D; color: #31201D; }

/* RECEIPT STYLES */
.receipt-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 10; backdrop-filter: blur(4px); }
.receipt-card { background: white; width: 400px; padding: 32px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
.receipt-paper { background: #fffcf9; border: 1px solid #eee; padding: 24px; border-radius: 12px; font-family: 'Courier New', Courier, monospace; }
.receipt-header { text-align: center; margin-bottom: 20px; }
.coffee-icon-circle { background: #31201D; color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
.r-row, .r-item, .r-total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.r-divider { border-top: 1px dashed #ccc; margin: 15px 0; }
.r-total-row.big { font-weight: 800; font-size: 16px; color: #31201D; }
.r-total-row.change { color: #16a34a; font-weight: 800; padding-top: 16px; border-top: 1px solid #eee; }
.receipt-actions { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }

/* FINAL BUTTONS */
.complete-action, .confirm-btn { background: #31201D; color: white; border: none; padding: 14px 28px; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; justify-content: center; }
.complete-action:disabled { opacity: 0.3; }
.cancel-action, .back-btn { background: #f5f5f5; border: none; padding: 14px 28px; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; justify-content: center; }
.dialog-footer { padding: 24px 32px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 16px; }
</style>