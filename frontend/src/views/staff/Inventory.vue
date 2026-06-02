<template>
  <div class="inventory-content">
    <div class="page-header">
      <h1>Inventory Management</h1>
      <p class="branch-label">
        Managing inventory for: <strong>{{ assignedBranchName || "Loading..." }}</strong>
      </p>
    </div>

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
        <div class="stat-icon"><component :is="Layers" :size="28" /></div>
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
        <div
          v-for="item in lowStockItems"
          :key="item.rawproductid"
          class="low-stock-item"
        >
          <div class="item-details">
            <span class="item-name">{{ item.name }}</span>
            <span class="item-stock"
              >{{ item.stockquantity }} {{ item.unit }} remaining</span
            >
          </div>
          <span class="low-stock-badge">Low Stock</span>
        </div>
      </div>
    </div>

    <div class="inventory-section">
      <div class="section-header">
        <div>
          <h2>Product Inventory</h2>
          <p class="section-subtitle">
            Product inventory for {{ assignedBranchName }}
          </p>
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
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        Loading inventory...
      </div>

      <div v-else class="table-container">
        <table class="inventory-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Reorder Point</th>
              <th>Status</th>
              <th>Unit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.rawproductid">
              <td class="product-name">
                <div class="product-info">
                  <component :is="Coffee" :size="16" class="product-icon" />
                  <strong>{{ item.name }}</strong>
                </div>
              </td>
              <td>{{ item.category ?? "—" }}</td>
              <td>{{ item.stockquantity ?? 0 }}</td>
              <td>{{ item.reorderlevel ?? "—" }}</td>
              <td>
                <span :class="['status-badge', getStockStatus(item)]">
                  {{ getStockStatusText(item) }}
                </span>
              </td>
              <td>{{ item.unit }}</td>
              <td class="actions-cell">
                <button
                  class="icon-btn edit"
                  @click="editItem(item)"
                  title="Edit"
                >
                  <component :is="Edit2" :size="16" />
                </button>
                <button
                  class="icon-btn delete"
                  @click="deleteItem(item)"
                  title="Archive"
                >
                  <component :is="Trash2" :size="16" />
                </button>
              </td>
            </tr>
            <tr v-if="!filteredItems.length">
              <td colspan="7" class="empty-row">No inventory items found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ADD / EDIT MODAL -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ isEditing ? "Edit Product" : "Add New Product" }}</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        <form @submit.prevent="saveItem">
          <div class="form-group">
            <label>Product Name *</label>
            <input type="text" v-model="formData.name" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category *</label>
              <select v-model="formData.category" required>
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
              <select v-model="formData.unit" required>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="pcs">pcs</option>
                <option value="oz">oz</option>
                <option value="bags">bags</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Stock Quantity *</label>
              <input
                type="number"
                v-model.number="formData.stockquantity"
                required
                min="0"
              />
            </div>
            <div class="form-group">
              <label>Reorder Point</label>
              <input
                type="number"
                v-model.number="formData.reorderlevel"
                min="0"
                placeholder="e.g. 10"
              />
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closeModal">
              Cancel
            </button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? "Saving..." : isEditing ? "Update" : "Add" }} Product
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- TOAST -->
    <Teleport to="body">
      <div v-if="toast.show" :class="['toast-wrap', toast.type]">
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  Plus,
  Package,
  AlertCircle,
  Layers,
  Search,
  Coffee,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-vue-next";
import { supabase } from "@/supabase.js";

// ── Branch lock ────────────────────────────────────────────
const assignedBranchId = ref(null);
const assignedBranchName = ref("");
const isLoading = ref(false);
const saving = ref(false);

const searchQuery = ref("");
const selectedCategory = ref("");
const inventoryItems = ref([]);

const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const formData = ref({
  name: "",
  category: "",
  unit: "g",
  stockquantity: 0,
  reorderlevel: 0,
});

const toast = ref({ show: false, message: "", type: "success" });

// ── Resolve branch ─────────────────────────────────────────
const resolveAssignedBranch = async () => {
  const slug = localStorage.getItem("branch");
  if (!slug || slug === "all") return;
  const { data } = await supabase
    .from("branch")
    .select("BranchId, BranchName")
    .eq("Location", slug)
    .maybeSingle();
  if (data) {
    assignedBranchId.value = data.BranchId;
    assignedBranchName.value = data.BranchName;
  }
};

// ── Fetch inventory scoped to branch ──────────────────────
const fetchInventory = async () => {
  if (!assignedBranchId.value) return;
  isLoading.value = true;

  const { data: batches } = await supabase
    .from("rawproducttransaction")
    .select("rawproductid, quantity")
    .eq("transactiontype", "in")
    .eq("branchid", assignedBranchId.value)
    .gt("quantity", 0);

  const stockMap = {};
  (batches ?? []).forEach((b) => {
    stockMap[b.rawproductid] = (stockMap[b.rawproductid] ?? 0) + b.quantity;
  });

  const branchProductIds = Object.keys(stockMap).map(Number);
  if (branchProductIds.length === 0) {
    inventoryItems.value = [];
    isLoading.value = false;
    return;
  }

  const { data } = await supabase
    .from("rawproduct")
    .select("rawproductid, name, category, unit, reorderlevel, stockquantity")
    .in("rawproductid", branchProductIds)
    .or("status.is.null,status.neq.Archived")
    .order("name");

  inventoryItems.value = (data ?? []).map((item) => ({
    ...item,
    stockquantity: stockMap[item.rawproductid] ?? 0,
  }));

  isLoading.value = false;
};

// ── Computed ───────────────────────────────────────────────
const filteredItems = computed(() => {
  let items = inventoryItems.value;
  if (searchQuery.value)
    items = items.filter((i) =>
      i.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
    );
  if (selectedCategory.value)
    items = items.filter((i) => i.category === selectedCategory.value);
  return items;
});

const categories = computed(() =>
  [
    ...new Set(inventoryItems.value.map((i) => i.category).filter(Boolean)),
  ].sort(),
);

const lowStockItems = computed(() =>
  inventoryItems.value.filter(
    (i) => i.reorderlevel && (i.stockquantity ?? 0) <= i.reorderlevel,
  ),
);

const lowStockCount = computed(() => lowStockItems.value.length);

// ── Status helpers ─────────────────────────────────────────
const getStockStatus = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return "out";
  if (item.reorderlevel && item.stockquantity <= item.reorderlevel)
    return "low";
  return "good";
};

const getStockStatusText = (item) => {
  if ((item.stockquantity ?? 0) <= 0) return "Out of Stock";
  if (item.reorderlevel && item.stockquantity <= item.reorderlevel)
    return "Low Stock";
  return "In Stock";
};

// ── Add / Edit ─────────────────────────────────────────────
const openAddModal = () => {
  isEditing.value = false;
  editingId.value = null;
  formData.value = {
    name: "",
    category: "",
    unit: "g",
    stockquantity: 0,
    reorderlevel: 0,
  };
  showModal.value = true;
};

const editItem = (item) => {
  isEditing.value = true;
  editingId.value = item.rawproductid;
  formData.value = {
    name: item.name,
    category: item.category ?? "",
    unit: item.unit,
    stockquantity: item.stockquantity ?? 0,
    reorderlevel: item.reorderlevel ?? 0,
  };
  showModal.value = true;
};

const saveItem = async () => {
  if (!formData.value.name || !formData.value.unit) {
    showToast("Name and unit are required.", "error");
    return;
  }
  saving.value = true;

  const payload = {
    name: formData.value.name.trim(),
    category: formData.value.category || null,
    unit: formData.value.unit,
    stockquantity: formData.value.stockquantity ?? 0,
    reorderlevel: formData.value.reorderlevel || null,
  };

  if (isEditing.value) {
    const { error } = await supabase
      .from("rawproduct")
      .update(payload)
      .eq("rawproductid", editingId.value);
    if (error) showToast("Failed to update: " + error.message, "error");
    else {
      showToast("Product updated successfully.", "success");
      await fetchInventory();
      closeModal();
    }
  } else {
    const { data: newItem, error } = await supabase
      .from("rawproduct")
      .insert([payload])
      .select()
      .single();
    if (error) showToast("Failed to add: " + error.message, "error");
    else {
      // Log initial stock as a transaction for this branch
      if (formData.value.stockquantity > 0) {
        await supabase.from("rawproducttransaction").insert([
          {
            rawproductid: newItem.rawproductid,
            branchid: assignedBranchId.value,
            transactiontype: "in",
            quantity: formData.value.stockquantity,
          },
        ]);
      }
      showToast("Product added successfully.", "success");
      await fetchInventory();
      closeModal();
    }
  }
  saving.value = false;
};

// ── Archive (delete) ───────────────────────────────────────
const deleteItem = async (item) => {
  if (
    !confirm(
      "Archive this product? It can be restored from the Backup & Restore page.",
    )
  )
    return;
  const archivedBy = localStorage.getItem("username") || "Unknown";
  const { error } = await supabase
    .from("rawproduct")
    .update({
      status: "Archived",
      archivedDate: new Date().toISOString(),
      archivedBy: archivedBy,
    })
    .eq("rawproductid", item.rawproductid);
  if (error) showToast("Failed to archive: " + error.message, "error");
  else {
    showToast(
      `${item.name} archived. Restore it from Backup & Restore.`,
      "success",
    );
    await fetchInventory();
  }
};

// ── Helpers ────────────────────────────────────────────────
const closeModal = () => {
  showModal.value = false;
  isEditing.value = false;
  editingId.value = null;
};

const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

// ── Init ───────────────────────────────────────────────────
onMounted(async () => {
  await resolveAssignedBranch();
  await fetchInventory();
});
</script>

<style scoped>
.inventory-content {
  padding: 24px 32px;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.page-header strong {
  color: #31201d;
}
.branch-label {
  font-size: 14px;
  color: #888;
  margin: 0;
}
/* Branch Selector */
.branch-selector {
  background: white;
  padding: 16px 20px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.branch-selector label {
  font-size: 14px;
  font-weight: 500;
  color: #495057;
}

.branch-dropdown {
  flex: 1;
  max-width: 400px;
  padding: 8px 12px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  color: #212529;
  background: white;
  cursor: pointer;
}

.branch-dropdown:focus {
  outline: none;
  border-color: #8b4513;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-card.warning {
  border-left: 4px solid #ffc107;
}

.stat-icon {
  color: #8b4513;
}

.stat-info h3 {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #adb5bd;
}

/* Alert Section */
.alert-section {
  background: #fff8e7;
  border: 1px solid #ffe4b5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 28px;
}

.alert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  color: #f57c00;
}

.alert-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f57c00;
  margin: 0;
}

.alert-subtitle {
  font-size: 13px;
  color: #856404;
  margin-bottom: 16px;
}

.low-stock-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.low-stock-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid #ffc107;
}

.item-details {
  display: flex;
  gap: 16px;
  align-items: center;
}

.item-name {
  font-weight: 600;
  color: #212529;
  font-size: 14px;
}

.item-stock {
  font-size: 13px;
  color: #6c757d;
}

.low-stock-badge {
  background: #fff3e0;
  color: #f57c00;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

/* Inventory Section */
.inventory-section {
  background: white;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e9ecef;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}

.section-subtitle {
  font-size: 13px;
  color: #6c757d;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #8b4513;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: #a0522d;
  transform: translateY(-2px);
}

/* Filters */
.filters-bar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f3f5;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 8px 12px;
}

.search-box input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
}

.inventory-table th {
  text-align: left;
  padding: 14px 16px;
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e9ecef;
}

.inventory-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f3f5;
  font-size: 14px;
}

.product-name {
  font-weight: 500;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-icon {
  color: #8b4513;
}

.value-cell {
  font-weight: 500;
  color: #28a745;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.low {
  background: #fff3e0;
  color: #f57c00;
}

.status-badge.out {
  background: #ffebee;
  color: #c62828;
}

.actions-cell {
  display: flex;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.icon-btn.edit {
  color: #8b4513;
}

.icon-btn.edit:hover {
  background: #fff4e6;
}

.icon-btn.delete {
  color: #dc3545;
}

.icon-btn.delete:hover {
  background: #ffebee;
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #212529;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
}

.close-btn:hover {
  color: #212529;
}

form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #495057;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #8b4513;
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.btn-secondary {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e9ecef;
}

/* Responsive */
@media (max-width: 768px) {
  .inventory-content {
    padding: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .branch-selector {
    flex-direction: column;
    align-items: flex-start;
  }

  .branch-dropdown {
    max-width: 100%;
    width: 100%;
  }

  .filters-bar {
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
