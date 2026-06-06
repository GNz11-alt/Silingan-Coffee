<template>
  <div class="backup-content">
    <div class="backup-header">
      <div class="backup-header-left">
        <h1>Backup & Restore</h1>
        <p class="backup-message">
          View and restore archived items - Nothing is permanently deleted,
          everything is safely backed up
        </p>
      </div>
      <!-- No Back Up Now button for staff -->
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
          <component :is="UtensilsCrossed" :size="28" stroke-width="1.5" />
        </div>
        <div class="stat-info">
          <h3>Menu</h3>
          <p class="stat-value">{{ archivedMenuItems.length }}</p>
          <span class="stat-trend positive">Menu items</span>
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
                <option value="Menu">Menu</option>
              </select>
              <i class="bi bi-chevron-down select-chevron"></i>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="text-center py-5">
          <div
            class="spinner-border spinner-border-sm text-secondary"
            role="status"
          ></div>
          <p class="mt-2 text-muted small">Loading archived records...</p>
        </div>

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
                <!-- No Actions column for staff -->
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
                <!-- No Restore button for staff -->
              </tr>
            </tbody>
          </table>
        </div>

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
          • <strong>Restore access</strong> - Only managers and administrators
          can restore items<br />
          • <strong>Search & Filter</strong> - Use the search bar and type
          filter to quickly find specific archived items<br />
          • <strong>All users can view</strong> - Everyone has read access to
          archived items for transparency<br />
        </p>
      </div>
    </div>

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
import {
  Database,
  Package,
  Users,
  File,
  Calendar,
  UtensilsCrossed,
} from "lucide-vue-next";
import { supabase } from "@/supabase.js";

// ── Current user ───────────────────────────────────────────
const currentUser = localStorage.getItem("username") || "Unknown";

// ── State ──────────────────────────────────────────────────
const isLoading = ref(false);
const search = ref("");
const filterType = ref("");
const managerBranchId = ref(null);

const archivedEmployees = ref([]);
const archivedSchedules = ref([]);
const archivedInventory = ref([]);
const archivedSales = ref([]);
const archivedMenuItems = ref([]);

const toast = ref({ show: false, message: "", type: "success" });

// ── Archive ID ─────────────────────────────────────────────
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
      archivedDate: e.archivedAt || e.dateHired,
      archivedBy: e.archivedBy || currentUser,
      _raw: { id: e.id },
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
      archivedDate: s.archivedAt || s.shiftDate,
      archivedBy: s.archivedBy || currentUser,
      _raw: { id: s.id },
      _table: "schedule",
    });
  });

  archivedInventory.value.forEach((i) => {
    items.push({
      type: "Inventory",
      name: i.name,
      details: i.details || "Archived product",
      archivedDate: i.archivedDate,
      archivedBy: i.archivedBy || currentUser,
      _raw: { id: i.id },
      _table: "inventory",
    });
  });

  archivedSales.value.forEach((s) => {
    items.push({
      type: "Sale",
      name: s.name || `Sale Transaction #${s.id}`,
      details: s.details || "Archived transaction",
      archivedDate: s.archivedDate,
      archivedBy: s.archivedBy || currentUser,
      _raw: { id: s.id },
      _table: "sales",
    });
  });

  archivedMenuItems.value.forEach((m) => {
    items.push({
      type: "Menu",
      name: m.name,
      details: m.details,
      archivedDate: m.archivedDate,
      archivedBy: m.archivedBy || currentUser,
      _raw: { id: m.id },
      _table: "menu",
    });
  });

  return items.map((item, idx) => ({
    ...item,
    archiveId: buildArchiveId(idx),
  }));
});

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

// ── Resolve branch (mirrors manager logic) ─────────────────
const resolveManagerBranch = async () => {
  const slug = localStorage.getItem("branch");
  if (!slug || slug === "all") return;
  const { data } = await supabase
    .from("branch")
    .select("BranchId")
    .eq("Location", slug)
    .maybeSingle();
  managerBranchId.value = data?.BranchId ?? null;
};

// ── Fetch ──────────────────────────────────────────────────
const fetchArchivedEmployees = async () => {
  let query = supabase
    .from("employee")
    .select(
      "EmployeeId, FirstName, LastName, Email, Position, Department, HourlyRate, DateHired, BranchAssigned, Status, ArchivedAt, ArchivedBy",
    )
    .eq("Status", "Archived")
    .order("EmployeeId", { ascending: true });
  if (managerBranchId.value)
    query = query.eq("BranchAssigned", managerBranchId.value);
  const { data } = await query;
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
      archivedAt: e.ArchivedAt,
      archivedBy: e.ArchivedBy,
    }));
  }
};

const fetchArchivedSchedules = async () => {
  let query = supabase
    .from("schedule")
    .select(
      `ScheduleId, EmployeeId, Role, ShiftDate, StartTime, EndTime, Status, BranchId, ArchivedAt, ArchivedBy, employee(FirstName, LastName)`,
    )
    .eq("Status", "Archived")
    .order("ShiftDate", { ascending: false });
  if (managerBranchId.value)
    query = query.eq("BranchId", managerBranchId.value);
  const { data } = await query;
  if (data) {
    archivedSchedules.value = data.map((s) => ({
      id: s.ScheduleId,
      employeeId: s.EmployeeId,
      employeeName:
        `${s.employee?.FirstName ?? ""} ${s.employee?.LastName ?? ""}`.trim(),
      role: s.Role,
      shiftDate: s.ShiftDate,
      startTime: s.StartTime,
      endTime: s.EndTime,
      branchId: s.BranchId,
      status: s.Status,
      archivedAt: s.ArchivedAt,
      archivedBy: s.ArchivedBy,
    }));
  }
};

const fetchArchivedInventory = async () => {
  const { data } = await supabase
    .from("rawproduct")
    .select(
      "rawproductid, name, category, unit, status, archivedDate, archivedBy",
    )
    .eq("status", "Archived")
    .order("rawproductid", { ascending: true });
  if (data) {
    archivedInventory.value = data.map((i) => ({
      id: i.rawproductid,
      name: i.name ?? "—",
      details: `${i.category ?? "—"} · ${i.unit ?? "—"}`,
      archivedDate: i.archivedDate,
      archivedBy: i.archivedBy || currentUser,
    }));
  }
};

const fetchArchivedSales = async () => {
  let query = supabase
    .from("orders")
    .select(
      "OrderId, FinalAmount, Status, CreatedAt, BranchId, branch(BranchName)",
    )
    .eq("Status", "cancelled")
    .order("OrderId", { ascending: true });
  if (managerBranchId.value)
    query = query.eq("BranchId", managerBranchId.value);
  const { data } = await query;
  if (data) {
    archivedSales.value = data.map((s) => ({
      id: s.OrderId,
      name: `Order #${s.OrderId}`,
      details: `₱${s.FinalAmount ?? 0} · ${s.branch?.BranchName ?? "—"}`,
      archivedDate: s.CreatedAt,
      archivedBy: currentUser,
    }));
  }
};

const fetchArchivedMenuItems = async () => {
  const { data } = await supabase
    .from("product")
    .select("ProductId, ProductName, Category, Price, Status, ArchivedAt, ArchivedBy")
    .eq("Status", "Archived")
    .order("ProductId", { ascending: true });
  if (data) {
    archivedMenuItems.value = data.map((p) => ({
      id: p.ProductId,
      name: p.ProductName ?? "—",
      details: `${p.Category ?? "—"} · ₱${p.Price ?? 0}`,
      archivedDate: p.ArchivedAt,
      archivedBy: p.ArchivedBy || currentUser,
    }));
  }
};

const loadAll = async () => {
  isLoading.value = true;
  await resolveManagerBranch();
  await Promise.all([
    fetchArchivedEmployees(),
    fetchArchivedSchedules(),
    fetchArchivedInventory(),
    fetchArchivedSales(),
    fetchArchivedMenuItems(),
  ]);
  isLoading.value = false;
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
  "badge-menu": type === "Menu",
});

const typeIcon = (type) =>
  ({
    Inventory: "bi bi-box-seam",
    Employee: "bi bi-person",
    Sale: "bi bi-file-earmark-text",
    Schedule: "bi bi-calendar3",
    Menu: "bi bi-cup-straw",
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.backup-header-left h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.backup-message {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.btn-backup-now {
  background: #532f15;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  transition:
    background 0.15s,
    transform 0.1s;
  align-self: center;
}
.btn-backup-now:hover:not(:disabled) {
  background: #3d2210;
  transform: translateY(-1px);
}
.btn-backup-now:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Stat Grid ──────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
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

.btn-backup-confirm {
  background: #532f15;
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
.btn-backup-confirm:hover:not(:disabled) {
  background: #3d2210;
}
.btn-backup-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.badge-menu {
  background: #f3e8ff;
  color: #7e22ce;
}
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
