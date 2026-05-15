<template>
  <div class="backup-content">
    <div class="backup-header">
      <h1>Backup & Restore</h1>
      <p class="backup-message">
        View and restore archived items - Nothing is permanently deleted,
        everything is safely backed up
      </p>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Database" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Total Archived</h3>
          <p class="stat-value">{{ totalArchived }}</p>
          <span class="stat-trend positive">All backed up items</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Package" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Inventory</h3>
          <p class="stat-value">{{ archivedInventory.length }}</p>
          <span class="stat-trend positive">Products</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Users" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Employees</h3>
          <p class="stat-value">{{ archivedEmployees.length }}</p>
          <span class="stat-trend positive">Staff records</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="File" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Sales</h3>
          <p class="stat-value">{{ archivedSales.length }}</p>
          <span class="stat-trend positive">Transactions</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <component :is="Calendar" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Schedule</h3>
          <p class="stat-value">{{ archivedSchedules.length }}</p>
          <span class="stat-trend positive">Old schedules</span>
        </div>
      </div>
    </div>

    <!-- ── ARCHIVED ITEMS ──────────────────────────────────── -->
    <div class="archived-items">
      <div class="archived-card">
        <div class="archived-card-header">
          <div>
            <h5>Archived Items</h5>
            <p>
              All archived items are safely stored and can be restored by
              managers and administrators
            </p>
          </div>
          <div class="archived-filters">
            <div class="search-wrap">
              <i class="bi bi-search search-icon"></i>
              <input
                v-model="search"
                type="text"
                class="search-input"
                placeholder="Search archived items..."
              />
            </div>
            <div class="type-select-wrap">
              <select v-model="filterType" class="type-select">
                <option value="">All Types</option>
                <option value="Inventory">Inventory</option>
                <option value="Employee">Employee</option>
                <option value="Sale">Sale</option>
                <option value="Schedule">Schedule</option>
              </select>
              <i class="bi bi-chevron-down select-chevron"></i>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="text-center py-5">
          <div
            class="spinner-border spinner-border-sm text-secondary"
            role="status"
          ></div>
          <p class="mt-2 text-muted small">Loading archived records...</p>
        </div>

        <!-- Table -->
        <div v-else-if="filteredItems.length" class="table-wrap">
          <table class="backup-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Name</th>
                <th>Details</th>
                <th>Archived Date</th>
                <th>Archived By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.archiveId">
                <td class="col-id">{{ item.archiveId }}</td>
                <td>
                  <span class="type-badge" :class="typeBadgeClass(item.type)">
                    <i :class="typeIcon(item.type)" class="me-1"></i
                    >{{ item.type }}
                  </span>
                </td>
                <td class="col-name">{{ item.name }}</td>
                <td class="col-details">{{ item.details }}</td>
                <td class="col-date">{{ formatDate(item.archivedDate) }}</td>
                <td class="col-by">{{ item.archivedBy }}</td>
                <td>
                  <button class="btn-restore" @click="confirmRestore(item)">
                    <i class="bi bi-arrow-counterclockwise me-1"></i>Restore
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty -->
        <div v-else class="empty-state">
          <component
            :is="Database"
            :size="36"
            stroke-width="1.5"
            class="empty-icon"
          />
          <p>No archived items found.</p>
        </div>
      </div>
    </div>

    <!-- ── INFO ────────────────────────────────────────────── -->
    <div class="backup-info">
      <div class="backup-info-card">
        <div class="stat-icon">
          <component :is="Database" :size="28" stroke-width="1.5" />
        </div>
        <div class="backup-info-title">
          <h4>Backup & Restore Information</h4>
        </div>
      </div>
      <div class="backup-infos">
        <p>
          • <strong>Data retention</strong> - Archived items are kept
          indefinitely for record-keeping and compliance<br />
          • <strong>Audit trail</strong> - All archive and restore actions are
          logged with user and timestamp<br />
          • <strong>Restore access</strong> - You have permission to restore
          archived items<br />
          • <strong>Search & Filter</strong> - Use the search bar and type
          filter to quickly find specific archived items<br />
          • <strong>All users can view</strong> - Everyone has read access to
          archived items for transparency<br />
        </p>
      </div>
    </div>

    <!-- ── RESTORE CONFIRM MODAL ───────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showRestoreModal"
        class="modal-overlay"
        @click.self="showRestoreModal = false"
      >
        <div class="modal-box">
          <div class="modal-header-row">
            <h6 class="mb-0">Confirm Restore</h6>
            <button class="btn-close-x" @click="showRestoreModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <p class="mt-3 mb-1 small">
            Are you sure you want to restore
            <strong>{{ restoreTarget?.name }}</strong
            >?
          </p>
          <p class="text-muted" style="font-size: 12px">
            This will set the record back to its active status.
          </p>
          <div class="d-flex gap-2 justify-content-end mt-4">
            <button
              class="btn btn-outline-secondary btn-sm"
              @click="showRestoreModal = false"
            >
              Cancel
            </button>
            <button
              class="btn-restore-confirm"
              :disabled="restoring"
              @click="doRestore"
            >
              <span
                v-if="restoring"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              <i v-else class="bi bi-arrow-counterclockwise me-1"></i>Restore
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ───────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i
          :class="
            toast.type === 'success'
              ? 'bi bi-check-circle'
              : 'bi bi-exclamation-circle'
          "
          class="me-2"
        ></i>
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Database, Package, Users, File, Calendar } from "lucide-vue-next";
import { supabase } from "@/supabase.js";

// ── State ──────────────────────────────────────────────────
const isLoading = ref(false);
const search = ref("");
const filterType = ref("");
const branches = ref([]);

const archivedEmployees = ref([]);
const archivedSchedules = ref([]);
// Inventory and Sales use local data in this project — add Supabase fetch calls here once connected
const archivedInventory = ref([]);
const archivedSales = ref([]);

const showRestoreModal = ref(false);
const restoring = ref(false);
const restoreTarget = ref(null);
const toast = ref({ show: false, message: "", type: "success" });

// ── Archive ID (A001, A002…) ───────────────────────────────
const buildArchiveId = (i) => `A${String(i + 1).padStart(3, "0")}`;

// ── Unified list ───────────────────────────────────────────
const allItems = computed(() => {
  const items = [];

  archivedEmployees.value.forEach((e) => {
    items.push({
      type: "Employee",
      name: `${e.firstName} ${e.lastName}`,
      details:
        [e.position, e.department].filter(Boolean).join(" - ") ||
        "Archived employee",
      archivedDate: e.dateHired,
      archivedBy: "Admin",
      _raw: e,
      _table: "employee",
    });
  });

  archivedSchedules.value.forEach((s) => {
    items.push({
      type: "Schedule",
      name: s.employeeName ? `${s.employeeName} Schedule` : `Schedule #${s.id}`,
      details:
        [s.role, s.shiftDate ? formatDate(s.shiftDate) : ""]
          .filter(Boolean)
          .join(" · ") || "Archived schedule",
      archivedDate: s.shiftDate,
      archivedBy: "Manager",
      _raw: s,
      _table: "schedule",
    });
  });

  archivedInventory.value.forEach((i) => {
    items.push({
      type: "Inventory",
      name: i.name,
      details: i.details || "Archived product",
      archivedDate: i.archivedDate,
      archivedBy: i.archivedBy || "Admin",
      _raw: i,
      _table: "inventory",
    });
  });

  archivedSales.value.forEach((s) => {
    items.push({
      type: "Sale",
      name: s.name || `Sale Transaction #${s.id}`,
      details: s.details || "Archived transaction",
      archivedDate: s.archivedDate,
      archivedBy: s.archivedBy || "Cashier",
      _raw: s,
      _table: "sales",
    });
  });

  return items.map((item, idx) => ({
    ...item,
    archiveId: buildArchiveId(idx),
  }));
});

const fetchArchivedInventory = async () => {
  const { data } = await supabase
    .from("inventory")
    .select(
      "InventoryId, Status, UpdatedAt, product(ProductName, Category, Price, BranchId, branch(BranchName))",
    )
    .eq("Status", "Archived")
    .order("InventoryId", { ascending: true });

  if (data) {
    archivedInventory.value = data.map((i) => ({
      id: i.InventoryId,
      name: i.product?.ProductName ?? "—",
      details: `${i.product?.Category ?? "—"} · ₱${i.product?.Price ?? 0} · ${i.product?.branch?.BranchName ?? "—"}`,
      archivedDate: i.UpdatedAt,
      archivedBy: "Admin",
      _raw: { id: i.InventoryId },
      _table: "inventory",
    }));
  }
};

const totalArchived = computed(() => allItems.value.length);

const filteredItems = computed(() =>
  allItems.value.filter((item) => {
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      item.archiveId.toLowerCase().includes(q) ||
      item.archivedBy.toLowerCase().includes(q);
    const matchType = !filterType.value || item.type === filterType.value;
    return matchSearch && matchType;
  }),
);

// ── Fetch ──────────────────────────────────────────────────
const fetchBranches = async () => {
  const { data } = await supabase.from("branch").select("BranchId, BranchName");
  if (data)
    branches.value = data.map((b) => ({ id: b.BranchId, name: b.BranchName }));
};

const fetchArchivedEmployees = async () => {
  const { data } = await supabase
    .from("employee")
    .select(
      "EmployeeId, FirstName, LastName, Email, Position, Department, HourlyRate, DateHired, BranchAssigned, Status",
    )
    .eq("Status", "Archived")
    .order("EmployeeId", { ascending: true });
  if (data) {
    archivedEmployees.value = data.map((e) => ({
      id: e.EmployeeId,
      firstName: e.FirstName,
      lastName: e.LastName,
      email: e.Email,
      position: e.Position,
      department: e.Department,
      hourlyRate: e.HourlyRate,
      dateHired: e.DateHired,
      branchId: e.BranchAssigned,
      status: e.Status,
    }));
  }
};

const fetchArchivedSchedules = async () => {
  const { data } = await supabase
    .from('schedule')
    .select('ScheduleId, EmployeeId, Role, ShiftDate, StartTime, EndTime, Status, BranchId, employee(FirstName, LastName)')
    .eq('Status', 'Cancelled')
    .order('ShiftDate', { ascending: false })

  if (data) {
    archivedSchedules.value = data.map(s => ({
      id: s.ScheduleId,
      employeeId: s.EmployeeId,
      employeeName: `${s.employee?.FirstName ?? ''} ${s.employee?.LastName ?? ''}`.trim(),
      role: s.Role,
      shiftDate: s.ShiftDate,
      startTime: s.StartTime,
      endTime: s.EndTime,
      branchId: s.BranchId,
      status: s.Status,
    }))
  }
}

const fetchArchivedSales = async () => {
  const { data } = await supabase
    .from("orders")
    .select(
      "OrderId, FinalAmount, Status, ArchivedAt, ArchivedBy, CreatedAt, branch(BranchName)",
    )
    .eq("Status", "void")
    .order("OrderId", { ascending: true });

  if (data) {
    archivedSales.value = data.map((s) => ({
      id: s.OrderId,
      name: `Order #${s.OrderId}`,
      details: `₱${s.FinalAmount} · ${s.branch?.BranchName ?? "—"}`,
      archivedDate: s.ArchivedAt || s.CreatedAt,
      archivedBy: s.ArchivedBy || "Cashier",
      _raw: { id: s.OrderId },
      _table: "sales",
    }));
  }
};

const loadAll = async () => {
  isLoading.value = true;
  await Promise.all([
    fetchBranches(),
    fetchArchivedEmployees(),
    fetchArchivedSchedules(),
    fetchArchivedInventory(),
    fetchArchivedSales(),
  ]);
  isLoading.value = false;
};

// ── Restore ────────────────────────────────────────────────
const confirmRestore = (item) => {
  restoreTarget.value = item;
  showRestoreModal.value = true;
};

const doRestore = async () => {
  restoring.value = true;
  const item = restoreTarget.value;

  if (item._table === "employee") {
    const { error } = await supabase
      .from("employee")
      .update({ Status: "Active" })
      .eq("EmployeeId", item._raw.id);
    if (error) showToast("Failed to restore employee.", "error");
    else {
      showToast(`${item.name} restored successfully.`, "success");
      await fetchArchivedEmployees();
    }
  } else if (item._table === "schedule") {
    const { error } = await supabase
      .from("schedule")
      .update({ Status: "Scheduled" })
      .eq("ScheduleId", item._raw.id);
    if (error) showToast("Failed to restore schedule.", "error");
    else {
      showToast("Schedule restored successfully.", "success");
      await fetchArchivedSchedules();
    }
  } else if (item._table === "inventory") {
    const { error } = await supabase
      .from("inventory")
      .update({ Status: "Active" })
      .eq("InventoryId", item._raw.id);

    if (error) showToast("Failed to restore inventory item.", "error");
    else {
      showToast(`${item.name} restored successfully.`, "success");
      await fetchArchivedInventory();
    }
  } else if (item._table === "sales") {
    const { error } = await supabase
      .from("orders")
      .update({ Status: "completed", ArchivedAt: null, ArchivedBy: null })
      .eq("OrderId", item._raw.id);

    if (error) showToast("Failed to restore sale.", "error");
    else {
      showToast(`${item.name} restored successfully.`, "success");
      await fetchArchivedSales();
    }
  } else {
    showToast(
      `${item.name} noted (table not yet connected to Supabase).`,
      "success",
    );
  }

  restoring.value = false;
  showRestoreModal.value = false;
};

// ── Helpers ────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
};

const typeBadgeClass = (type) => ({
  "badge-inventory": type === "Inventory",
  "badge-employee": type === "Employee",
  "badge-sale": type === "Sale",
  "badge-schedule": type === "Schedule",
});

const typeIcon = (type) =>
  ({
    Inventory: "bi bi-box-seam",
    Employee: "bi bi-person",
    Sale: "bi bi-file-earmark-text",
    Schedule: "bi bi-calendar3",
  })[type] || "bi bi-archive";

const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

onMounted(loadAll);
</script>

<style scoped>
.backup-content {
  padding: 24px 32px;
}

/* ── Header ─────────────────────────────────── */
.backup-header {
  margin-bottom: 28px;
}
.backup-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}
.backup-message {
  font-size: 14px;
  color: #6c757d;
}

/* ── Stat Grid ──────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}
.stat-card {
  background: #ffffff;
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
  font-size: 24px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 4px;
}
.stat-trend.positive {
  font-size: 12px;
  color: #6c757d;
}

/* ── Archived Items ─────────────────────────── */
.archived-items {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 24px;
  overflow: hidden;
}
.archived-card {
  padding: 20px;
}
.archived-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.archived-card-header h5 {
  font-size: 15px;
  font-weight: 600;
  color: #212529;
  margin-bottom: 3px;
}
.archived-card-header p {
  font-size: 12px;
  color: #6c757d;
  margin: 0;
}

/* ── Filters ────────────────────────────────── */
.archived-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #adb5bd;
  font-size: 13px;
  pointer-events: none;
}
.search-input {
  height: 34px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0 12px 0 30px;
  font-size: 13px;
  color: #495057;
  outline: none;
  width: 210px;
  transition: border-color 0.15s;
}
.search-input:focus {
  border-color: #8b4513;
  box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.08);
}
.search-input::placeholder {
  color: #adb5bd;
}

.type-select-wrap {
  position: relative;
}
.type-select {
  appearance: none;
  height: 34px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 0 28px 0 10px;
  font-size: 13px;
  color: #495057;
  background: #fff;
  min-width: 120px;
  outline: none;
  cursor: pointer;
}
.type-select:focus {
  border-color: #8b4513;
}
.select-chevron {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #6c757d;
  pointer-events: none;
}

/* ── Table ──────────────────────────────────── */
.table-wrap {
  overflow-x: auto;
  margin: 0 -20px;
  padding: 0 20px;
}
.backup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.backup-table th {
  background: #f8f9fa;
  color: #6c757d;
  font-weight: 600;
  font-size: 12px;
  padding: 10px 14px;
  text-align: left;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  white-space: nowrap;
}
.backup-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #f5f5f5;
  vertical-align: middle;
  color: #343a40;
}
.backup-table tr:last-child td {
  border-bottom: none;
}
.backup-table tr:hover td {
  background: #fafafa;
}

.col-id {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
  white-space: nowrap;
}
.col-name {
  font-weight: 500;
  min-width: 140px;
}
.col-details {
  color: #6c757d;
  min-width: 190px;
  font-size: 12px;
}
.col-date {
  white-space: nowrap;
  font-size: 12px;
}
.col-by {
  font-size: 12px;
  white-space: nowrap;
}

/* ── Type badges ────────────────────────────── */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-inventory {
  background: #e8f5e9;
  color: #2e7d32;
}
.badge-employee {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-sale {
  background: #fce4ec;
  color: #c62828;
}
.badge-schedule {
  background: #fff8e1;
  color: #e65100;
}

/* ── Restore button ─────────────────────────── */
.btn-restore {
  background: #fff;
  border: 1px solid #dee2e6;
  color: #495057;
  border-radius: 6px;
  padding: 4px 11px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-restore:hover {
  border-color: #8b4513;
  color: #8b4513;
  background: #fdf3ec;
}

/* ── Empty state ────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #adb5bd;
}
.empty-icon {
  margin-bottom: 10px;
}
.empty-state p {
  font-size: 13px;
  margin: 0;
}

/* ── Info panel ─────────────────────────────── */
.backup-info {
  background: #fdfbf3;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e9ecef;
}
.backup-info-card {
  display: flex;
  margin-bottom: 15px;
}
.backup-infos {
  padding-left: 30px;
}
.backup-info-title h4 {
  margin-bottom: 6px;
  padding-left: 10px;
  font-weight: 400;
}
.backup-infos p {
  font-size: 13px;
  color: #6c757d;
  line-height: 2;
  margin: 0;
}

/* ── Modal ──────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1060;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 92vw;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}
.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.btn-close-x {
  background: none;
  border: none;
  font-size: 14px;
  color: #6c757d;
  cursor: pointer;
}
.btn-close-x:hover {
  color: #212529;
}

.btn-restore-confirm {
  background: #8b4513;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: background 0.15s;
}
.btn-restore-confirm:hover:not(:disabled) {
  background: #6d3310;
}
.btn-restore-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Toast ──────────────────────────────────── */
.toast-wrap {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 11px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  animation: slideUp 0.2s ease;
}
.toast-wrap.success {
  background: #d1e7dd;
  color: #0a3622;
}
.toast-wrap.error {
  background: #f8d7da;
  color: #58151c;
}

@keyframes slideUp {
  from {
    transform: translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
