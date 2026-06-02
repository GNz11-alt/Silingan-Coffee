<template>
  <div class="schedule-page">
    <!-- ── PAGE HEADER ─────────────────────────────────────── -->
    <div class="d-flex align-items-start justify-content-between mb-4">
      <div>
        <h4 class="page-title mb-1">Schedule Management</h4>
        <p class="page-sub mb-0">Manage employee availability and schedules</p>
      </div>
      <button
        class="btn btn-primary-brand"
        @click="openCreateModal"
        :disabled="employeesLoading"
      >
        <i class="bi bi-plus-lg me-1"></i> Create Schedule
      </button>
    </div>

    <!-- ── TABS ────────────────────────────────────────────── -->
    <div class="tab-bar mb-4">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'availability'" class="tab-badge">{{
          pendingCount
        }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-secondary" role="status"></div>
      <p class="mt-2 text-muted">Loading...</p>
    </div>

    <template v-else>
      <!-- ── TAB 1: AVAILABILITY ─────────────────────────────── -->
      <div v-if="activeTab === 'availability'">
        <div class="section-title mb-3">Employee Availability</div>
        <div v-if="pendingOrFading.length" class="avail-list">
          <TransitionGroup name="fade-slide">
            <div
              v-for="avail in pendingOrFading"
              :key="avail.id"
              class="avail-row"
              :class="{ 'is-fading': fadingIds.has(avail.id) }"
            >
              <div class="avail-left">
                <div
                  class="emp-avatar"
                  :style="{ background: avatarColor(avail.employeeId) }"
                >
                  {{ avail.initials }}
                </div>
                <div>
                  <div class="avail-name">
                    {{ avail.employeeName }}
                    <span class="avail-role">{{ avail.role }}</span>
                  </div>
                  <div class="avail-meta">
                    <i class="bi bi-calendar3"></i>
                    {{ formatDate(avail.availableDate) }} &nbsp;<i
                      class="bi bi-clock"
                    ></i>
                    {{ avail.startTime }} – {{ avail.endTime }}
                  </div>
                  <div v-if="avail.notes" class="avail-notes">
                    {{ avail.notes }}
                  </div>
                </div>
              </div>
              <div class="avail-right">
                <span
                  v-if="avail.status === 'Confirmed'"
                  class="badge-status badge-active"
                  >approved</span
                >
                <template v-else-if="avail.status === 'Pending'">
                  <span class="badge-status badge-pending">pending</span>
                  <button
                    class="btn-action approve"
                    @click="updateAvailStatus(avail, 'Confirmed')"
                  >
                    Approve
                  </button>
                  <button
                    class="btn-action reject"
                    @click="updateAvailStatus(avail, 'Cancelled')"
                  >
                    Reject
                  </button>
                </template>
                <span v-else class="badge-status badge-inactive">rejected</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
        <div v-else class="empty-state text-center py-5">
          <i class="bi bi-calendar-x fs-1 text-muted"></i>
          <p class="mt-3 text-muted">No pending availability requests.</p>
        </div>
      </div>

      <!-- ── TAB 2: HISTORY ──────────────────────────────────── -->
      <div v-if="activeTab === 'history'">
        <div class="section-title mb-3">Availability History</div>
        <div v-if="resolvedAvail.length" class="avail-list">
          <div v-for="avail in resolvedAvail" :key="avail.id" class="avail-row">
            <div class="avail-left">
              <div
                class="emp-avatar"
                :style="{ background: avatarColor(avail.employeeId) }"
              >
                {{ avail.initials }}
              </div>
              <div>
                <div class="avail-name">
                  {{ avail.employeeName }}
                  <span class="avail-role">{{ avail.role }}</span>
                </div>
                <div class="avail-meta">
                  <i class="bi bi-calendar3"></i>
                  {{ formatDate(avail.availableDate) }} &nbsp;<i
                    class="bi bi-clock"
                  ></i>
                  {{ avail.startTime }} – {{ avail.endTime }}
                </div>
                <div v-if="avail.notes" class="avail-notes">
                  {{ avail.notes }}
                </div>
              </div>
            </div>
            <div class="avail-right">
              <span
                v-if="avail.status === 'Confirmed'"
                class="badge-status badge-active"
                >approved</span
              >
              <span v-else class="badge-status badge-inactive">rejected</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state text-center py-5">
          <i class="bi bi-clock-history fs-1 text-muted"></i>
          <p class="mt-3 text-muted">No resolved availability requests yet.</p>
        </div>
      </div>

      <!-- ── TAB 2: CURRENT SCHEDULE ─────────────────────────── -->
      <div v-if="activeTab === 'schedule'">
        <div class="filter-bar d-flex flex-wrap gap-2 align-items-center mb-3">
          <select
            v-model="schedViewMode"
            class="form-select fc-brand"
            style="width: 150px"
          >
            <option value="table">Table View</option>
            <option value="calendar">Calendar View</option>
          </select>
          <input
            v-model="schedSearchInput"
            type="text"
            class="form-control fc-brand"
            style="width: 200px"
            placeholder="Search employee…"
          />
          <input
            v-model="schedDateFilter"
            type="date"
            class="form-control fc-brand"
            style="width: 180px"
          />
          <select
            v-model="schedStatusFilter"
            class="form-select fc-brand"
            style="width: 150px"
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button class="btn btn-ghost btn-sm" @click="clearSchedFilters">
            Clear
          </button>
        </div>

        <!-- TABLE VIEW -->
        <div v-if="schedViewMode === 'table'" class="table-wrap">
          <table class="sched-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Shift Date</th>
                <th>Time</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sched in filteredSchedules" :key="sched.id">
                <td>
                  <div class="td-emp">
                    <div
                      class="emp-avatar-sm"
                      :style="{ background: avatarColor(sched.employeeId) }"
                    >
                      {{ sched.initials }}
                    </div>
                    {{ sched.employeeName }}
                  </div>
                </td>
                <td>{{ sched.role }}</td>
                <td>{{ formatDate(sched.shiftDate) }}</td>
                <td>{{ sched.startTime }} – {{ sched.endTime }}</td>
                <td>{{ branchName(sched.branchId) }}</td>
                <td>
                  <span
                    class="badge-status"
                    :class="schedStatusClass(sched.status)"
                    >{{ sched.status }}</span
                  >
                </td>
                <td>
                  <div class="d-flex gap-1">
                    <button
                      class="icon-btn"
                      title="Edit"
                      @click="openEditModal(sched)"
                    >
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button
                      class="icon-btn danger"
                      title="Delete"
                      @click="confirmDelete(sched)"
                    >
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredSchedules.length">
                <td colspan="7" class="text-center text-muted py-4">
                  No schedules found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- CALENDAR VIEW -->
        <div v-if="schedViewMode === 'calendar'">
          <div
            class="d-flex justify-content-center align-items-center gap-3 mb-4"
          >
            <button class="btn btn-ghost btn-sm" @click="monthOffset -= 1">
              <i class="bi bi-chevron-left"></i> Previous
            </button>
            <span
              style="
                min-width: 200px;
                text-align: center;
                font-weight: 600;
                font-size: 1.1rem;
              "
            >
              {{ monthYearLabel }}
            </span>
            <button class="btn btn-ghost btn-sm" @click="monthOffset = 0">
              Today
            </button>
            <button class="btn btn-ghost btn-sm" @click="monthOffset += 1">
              Next <i class="bi bi-chevron-right"></i>
            </button>
          </div>

          <div class="calendar-container">
            <div class="calendar-header">
              <div
                class="calendar-day-header"
                v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
                :key="day"
              >
                {{ day }}
              </div>
            </div>
            <div class="calendar-grid">
              <div
                v-for="day in monthDays"
                :key="day.dateStr"
                class="calendar-day"
                :class="{
                  'is-today': day.isToday,
                  'is-other-month': day.isOtherMonth,
                }"
              >
                <div class="day-number">
                  {{ day.dayOfMonth }}
                  <span v-if="day.isToday" class="today-badge">Today</span>
                </div>
                <div class="day-shifts">
                  <div
                    v-for="shift in day.shifts"
                    :key="shift.id"
                    class="shift-badge"
                    :style="{ background: avatarColor(shift.employeeId) }"
                  >
                    <div class="shift-badge-time">{{ shift.startTime }}</div>
                    <div class="shift-badge-name">{{ shift.initials }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── TAB 3: CHANGE INQUIRIES ─────────────────────────── -->
      <div v-if="activeTab === 'change'">
        <div v-if="changeInquiries.length" class="avail-list">
          <div v-for="inq in changeInquiries" :key="inq.id" class="avail-row">
            <div class="avail-left">
              <div
                class="emp-avatar"
                :style="{ background: avatarColor(inq.employeeId) }"
              >
                {{ inq.initials }}
              </div>
              <div>
                <div class="avail-name">
                  {{ inq.employeeName }}
                  <span class="avail-role">{{ inq.role }}</span>
                </div>
                <div class="avail-meta">
                  Requesting shift change for
                  <strong>{{ formatDate(inq.requestDate) }}</strong>
                </div>
                <div class="avail-notes">{{ inq.reason }}</div>
              </div>
            </div>
            <div class="avail-right">
              <template v-if="inq.status === 'Pending'">
                <span class="badge-status badge-pending">pending</span>
                <button
                  class="btn-action approve"
                  @click="updateInquiryStatus(inq, 'Approved')"
                >
                  Approve
                </button>
                <button
                  class="btn-action reject"
                  @click="updateInquiryStatus(inq, 'Denied')"
                >
                  Deny
                </button>
              </template>
              <span
                v-else-if="inq.status === 'Approved'"
                class="badge-status badge-active"
                >approved</span
              >
              <span v-else class="badge-status badge-inactive">denied</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-state text-center py-5">
          <i class="bi bi-arrow-left-right fs-1 text-muted"></i>
          <p class="mt-3 text-muted">No change inquiries at the moment.</p>
        </div>
      </div>
    </template>

    <!-- ── CREATE / EDIT MODAL ─────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">
                {{ isEditing ? "Edit Schedule" : "Create Schedule" }}
              </h5>
              <p class="modal-sub mb-0">
                {{
                  isEditing
                    ? "Update this shift"
                    : "Create a new schedule for an employee"
                }}
              </p>
            </div>
            <button class="btn-close-panel" @click="closeModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-sm">Employee</label>
                <select
                  v-model="form.employeeId"
                  class="form-select fc-brand"
                  :disabled="employeesLoading"
                  @change="onEmployeeSelected"
                >
                  <option value="" disabled>
                    {{ employeesLoading ? 'Loading employees…' : 'Select employee' }}
                  </option>
                  <option v-for="e in employeeList" :key="e.id" :value="e.id">
                    {{ e.name }}
                  </option>
                </select>
                <div v-if="errors.employeeId" class="text-danger small mt-1">
                  {{ errors.employeeId }}
                </div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Role</label>
                <select v-model="form.role" class="form-select fc-brand">
                  <option value="" disabled>Select role</option>
                  <option v-for="r in roles" :key="r" :value="r">
                    {{ r }}
                  </option>
                </select>
                <div v-if="errors.role" class="text-danger small mt-1">
                  {{ errors.role }}
                </div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Shift Date</label>
                <input
                  v-model="form.shiftDate"
                  type="date"
                  class="form-control fc-brand"
                />
                <div v-if="errors.shiftDate" class="text-danger small mt-1">
                  {{ errors.shiftDate }}
                </div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">Start Time</label>
                <input
                  v-model="form.startTime"
                  type="time"
                  class="form-control fc-brand"
                />
                <div v-if="errors.startTime" class="text-danger small mt-1">
                  {{ errors.startTime }}
                </div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">End Time</label>
                <input
                  v-model="form.endTime"
                  type="time"
                  class="form-control fc-brand"
                />
                <div v-if="errors.endTime" class="text-danger small mt-1">
                  {{ errors.endTime }}
                </div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Branch</label>
                <select
                  v-model="form.branchId"
                  class="form-select fc-brand"
                  disabled
                >
                  <option
                    v-for="b in branches"
                    :key="b.id"
                    :value="b.id"
                    :selected="b.id === managerBranchId"
                  >
                    {{ b.name }}
                  </option>
                </select>
                <div v-if="errors.branchId" class="text-danger small mt-1">
                  {{ errors.branchId }}
                </div>
              </div>
              <div v-if="isEditing" class="col-12">
                <label class="form-label-sm">Status</label>
                <select v-model="form.status" class="form-select fc-brand">
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="closeModal">Cancel</button>
            <button
              class="btn btn-primary-brand"
              @click="saveSchedule()"
              :disabled="saving || employeesLoading"
            >
              <span
                v-if="saving"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              {{ isEditing ? "Save Changes" : "Create Schedule" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── CONFLICT CONFIRM ───────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showConflictConfirm"
        class="modal-overlay"
        @click.self="showConflictConfirm = false"
      >
        <div class="modal-panel modal-panel--sm">
          <div class="modal-panel-header">
            <h5 class="mb-0">Schedule Conflict</h5>
            <button class="btn-close-panel" @click="showConflictConfirm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p v-if="conflictInfo">
              This employee already has a shift on
              <strong>{{ formatDate(form.shiftDate) }}</strong> from
              <strong>{{ conflictInfo.existingStart }}–{{ conflictInfo.existingEnd }}</strong>
              ({{ conflictInfo.existingRole }}).
            </p>
            <p class="mb-0">Save anyway and allow double-booking?</p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showConflictConfirm = false">
              Cancel
            </button>
            <button class="btn btn-danger-brand" @click="confirmConflictSave">
              Save Anyway
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── DELETE CONFIRM ──────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="modal-overlay"
        @click.self="showDeleteConfirm = false"
      >
        <div class="modal-panel modal-panel--sm">
          <div class="modal-panel-header">
            <h5 class="mb-0">Delete Schedule</h5>
            <button class="btn-close-panel" @click="showDeleteConfirm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p>
              Delete the schedule for
              <strong>{{ deleteTarget?.employeeName }}</strong> on
              <strong>{{ formatDate(deleteTarget?.shiftDate) }}</strong
              >? This cannot be undone.
            </p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">
              Cancel
            </button>
            <button class="btn btn-danger-brand" @click="deleteSchedule">
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i
          class="bi"
          :class="
            toast.type === 'success'
              ? 'bi-check-circle'
              : 'bi-exclamation-circle'
          "
        ></i>
        {{ toast.message }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from "vue";
import { supabase } from "@/supabase.js";
import { useUserBranch } from "@/composables/useUserBranch.js";
import {
  getMonthStart,
  toLocalDateKey,
  normalizeDateKey,
  normalizeTime,
  timesOverlap,
  buildSchedulesByDate,
  availabilitySinceDate,
} from "@/composables/useScheduleHelpers.js";

const isLoading = ref(true);
const activeTab = ref("availability");
const tabs = [
  { key: "availability", label: "Availability Requests" },
  { key: "history", label: "History" },
  { key: "schedule", label: "Current Schedule" },
  { key: "change", label: "Change Inquiries" },
];

const { isAdmin, userBranchId, userBranchName, resolveBranch } =
  useUserBranch();
const managerBranchId = ref(null);

const schedSearchInput = ref("");
const schedSearch = ref("");
let schedSearchDebounce = null;
const schedDateFilter = ref("");
const schedStatusFilter = ref("");
const schedViewMode = ref("table"); // "table" or "calendar"
const monthOffset = ref(0); // 0 = current month, -1 = last month, +1 = next month
const showModal = ref(false);
const showConflictConfirm = ref(false);
const conflictInfo = ref(null);
const employeesLoading = ref(true);
const showDeleteConfirm = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleteTarget = ref(null);
const toast = ref({ show: false, message: "", type: "success" });
const errors = ref({});

const branches = ref([]);
const employeeList = ref([]);
const availability = ref([]);
const schedules = ref([]);
const changeInquiries = ref([]);

const roles = [
  "Barista",
  "Cashier",
  "Kitchen Staff",
  "Cleaning Staff",
  "Server",
  "Supervisor",
];

const emptyForm = () => ({
  id: null,
  employeeId: "",
  role: "",
  shiftDate: "",
  startTime: "",
  endTime: "",
  branchId: "",
  status: "Scheduled",
});
const form = ref(emptyForm());

const pendingCount = computed(
  () => availability.value.filter((a) => a.status === "Pending").length,
);

const resolvedAvail = computed(() =>
  availability.value.filter(
    (a) => a.status === "Confirmed" || a.status === "Cancelled",
  ),
);

const fadingIds = ref(new Set());

const pendingOrFading = computed(() =>
  availability.value.filter(
    (a) => a.status === "Pending" || fadingIds.value.has(a.id),
  ),
);

const filteredSchedules = computed(() => {
  return schedules.value.filter((s) => {
    const q = schedSearch.value.toLowerCase();
    const matchSearch =
      !q ||
      s.employeeName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q);
    const matchDate =
      !schedDateFilter.value || s.shiftDate === schedDateFilter.value;
    const matchStatus =
      !schedStatusFilter.value || s.status === schedStatusFilter.value;
    return matchSearch && matchDate && matchStatus;
  });
});

const schedulesByDate = computed(() =>
  buildSchedulesByDate(filteredSchedules.value),
);

const monthStart = computed(() => getMonthStart(monthOffset.value));

const monthYearLabel = computed(() => {
  return monthStart.value.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
  });
});

const monthDays = computed(() => {
  const days = [];
  const start = monthStart.value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from Monday of the week containing the 1st
  const startDate = new Date(start);
  const dayOfWeek = startDate.getDay();
  startDate.setDate(
    startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
  );

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = toLocalDateKey(d);
    const isToday = d.getTime() === today.getTime();
    const isOtherMonth = d.getMonth() !== start.getMonth();

    const shiftsForDay = schedulesByDate.value.get(dateStr) || [];

    days.push({
      dateStr,
      dayOfMonth: d.getDate(),
      isToday,
      isOtherMonth,
      shifts: shiftsForDay,
    });
  }
  return days;
});

const fetchBranches = async () => {
  const { data } = await supabase.from("branch").select("BranchId, BranchName");
  if (data)
    branches.value = data.map((b) => ({ id: b.BranchId, name: b.BranchName }));
};

const updateInquiryStatus = async (inq, status) => {
  const { error } = await supabase
    .from("changeinquiry")
    .update({ status: status })
    .eq("inquiryid", inq.id);

  if (error) showToast("Failed to update inquiry.", "error");
  else {
    inq.status = status;
    showToast(
      `Inquiry ${status === "Approved" ? "approved" : "denied"}.`,
      "success",
    );
  }
};

const fetchEmployees = async () => {
  employeesLoading.value = true;
  const { data, error } = await supabase
    .from("employee")
    .select("EmployeeId, FirstName, LastName, BranchAssigned, Position, Status")
    .eq("BranchAssigned", managerBranchId.value)
    .eq("Status", "Active")
    .order("FirstName");

  if (error) {
    console.error("[Schedule] fetchEmployees failed:", error);
    employeeList.value = [];
  } else if (data) {
    employeeList.value = data.map((e) => ({
      id: e.EmployeeId,
      name: `${e.FirstName} ${e.LastName}`,
      branchAssigned: e.BranchAssigned,
      position: e.Position,
    }));
  }
  employeesLoading.value = false;
};

const fetchAvailability = async () => {
  const { data: branchEmps } = await supabase
    .from("employee")
    .select("EmployeeId, FirstName, LastName")
    .eq("BranchAssigned", managerBranchId.value);

  const empMap = {};
  const empIds = [];
  if (branchEmps) {
    branchEmps.forEach((e) => {
      empIds.push(e.EmployeeId);
      empMap[e.EmployeeId] = {
        name: `${e.FirstName || ""} ${e.LastName || ""}`.trim() || "Unknown",
        initials:
          `${e.FirstName?.[0] || ""}${e.LastName?.[0] || ""}`.toUpperCase() ||
          "?",
      };
    });
  }

  if (!empIds.length) {
    availability.value = [];
    return;
  }

  const since = availabilitySinceDate(30);
  const { data } = await supabase
    .from("availability")
    .select("*")
    .in("employeeid", empIds)
    .gte("availabledate", since)
    .order("availabilityid", { ascending: false })
    .limit(200);

  if (data) {
    availability.value = data.map((a) => {
      const emp = empMap[a.employeeid];
      return {
        id: a.availabilityid,
        employeeId: a.employeeid,
        employeeName: emp?.name || "Unknown",
        initials: emp?.initials || "?",
        role: "—",
        availableDate: normalizeDateKey(a.availabledate),
        startTime: normalizeTime(a.starttime),
        endTime: normalizeTime(a.endtime),
        notes: a.notes,
        status: a.status || "Pending",
      };
    });
  }
};

const fetchChangeInquiries = async () => {
  const { data: branchEmps } = await supabase
    .from("employee")
    .select("EmployeeId, FirstName, LastName")
    .eq("BranchAssigned", managerBranchId.value);

  const empMap = {};
  const empIds = [];
  if (branchEmps) {
    branchEmps.forEach((e) => {
      empIds.push(e.EmployeeId);
      empMap[e.EmployeeId] = {
        name: `${e.FirstName || ""} ${e.LastName || ""}`.trim() || "Unknown",
        initials:
          `${e.FirstName?.[0] || ""}${e.LastName?.[0] || ""}`.toUpperCase() ||
          "?",
      };
    });
  }

  if (!empIds.length) {
    changeInquiries.value = [];
    return;
  }

  const { data } = await supabase
    .from("changeinquiry")
    .select("*")
    .in("employeeid", empIds)
    .order("inquiryid", { ascending: false });

  if (data) {
    changeInquiries.value = data.map((c) => {
      const emp = empMap[c.employeeid];
      return {
        id: c.inquiryid,
        employeeId: c.employeeid,
        employeeName: emp?.name || "Unknown",
        initials: emp?.initials || "?",
        role: "—",
        requestDate: c.requestdate,
        reason: c.reason,
        status: c.status,
      };
    });
  }
};

const fetchSchedules = async () => {
  const { data } = await supabase
    .from("schedule")
    .select(
      "ScheduleId, EmployeeId, Role, ShiftDate, StartTime, EndTime, Status, BranchId, employee(FirstName, LastName)",
    )
    .eq("BranchId", managerBranchId.value)
    .neq("Status", "Cancelled")
    .neq("Status", "Archived")
    .order("ScheduleId", { ascending: false });

  if (data) {
    schedules.value = data.map((s) => ({
      id: s.ScheduleId,
      employeeId: s.EmployeeId,
      employeeName: s.employee
        ? `${s.employee.FirstName || ""} ${s.employee.LastName || ""}`.trim()
        : "Unknown",
      initials: s.employee
        ? `${s.employee.FirstName?.[0] || ""}${s.employee.LastName?.[0] || ""}`.toUpperCase() ||
          "?"
        : "?",
      role: s.Role,
      shiftDate: normalizeDateKey(s.ShiftDate),
      startTime: normalizeTime(s.StartTime),
      endTime: normalizeTime(s.EndTime),
      branchId: s.BranchId,
      status: s.Status,
    }));
  }
};

const onEmployeeSelected = () => {
  const emp = employeeList.value.find((e) => e.id === form.value.employeeId);
  if (!emp) return;
  form.value.branchId = emp.branchAssigned || managerBranchId.value;
  if (emp.position && !form.value.role) form.value.role = emp.position;
};

const switchTab = (key) => {
  if (activeTab.value !== key) fadingIds.value = new Set();
  activeTab.value = key;
};

const openCreateModal = () => {
  if (employeesLoading.value) {
    showToast("Employee list is still loading. Please wait.", "error");
    return;
  }
  if (!employeeList.value.length) {
    showToast("No active employees available to schedule.", "error");
    return;
  }
  form.value = emptyForm();
  form.value.branchId = managerBranchId.value;
  errors.value = {};
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (sched) => {
  form.value = { ...sched };
  errors.value = {};
  isEditing.value = true;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const validate = () => {
  const e = {};
  if (!form.value.employeeId) e.employeeId = "Employee is required.";
  if (!form.value.role) e.role = "Role is required.";
  if (!form.value.shiftDate) e.shiftDate = "Shift date is required.";
  if (!form.value.startTime) e.startTime = "Start time is required.";
  if (!form.value.endTime) e.endTime = "End time is required.";
  if (!form.value.branchId) e.branchId = "Branch is required.";
  if (
    form.value.startTime &&
    form.value.endTime &&
    form.value.endTime <= form.value.startTime
  )
    e.endTime = "End time must be after start time.";
  const today = toLocalDateKey(new Date());
  if (form.value.shiftDate && form.value.shiftDate < today)
    e.shiftDate = "Shift date cannot be in the past.";
  errors.value = e;
  return Object.keys(e).length === 0;
};

const checkScheduleConflict = async () => {
  const { data } = await supabase
    .from("schedule")
    .select("ScheduleId, StartTime, EndTime, Role")
    .eq("EmployeeId", form.value.employeeId)
    .eq("ShiftDate", form.value.shiftDate)
    .eq("BranchId", managerBranchId.value)
    .neq("Status", "Cancelled")
    .neq("Status", "Archived");

  if (!data?.length) return null;

  const newStart = form.value.startTime;
  const newEnd = form.value.endTime;

  for (const existing of data) {
    if (isEditing.value && existing.ScheduleId === form.value.id) continue;

    const existingStart = normalizeTime(existing.StartTime);
    const existingEnd = normalizeTime(existing.EndTime);

    if (timesOverlap(newStart, newEnd, existingStart, existingEnd)) {
      return {
        existingStart,
        existingEnd,
        existingRole: existing.Role,
      };
    }
  }

  return null;
};

const saveSchedule = async (overrideConflict = false) => {
  if (!validate()) return;

  saving.value = true;
  try {
    const conflict = await checkScheduleConflict();
    if (conflict && !overrideConflict) {
      conflictInfo.value = conflict;
      showConflictConfirm.value = true;
      return;
    }

    const payload = {
      EmployeeId: form.value.employeeId,
      Role: form.value.role,
      ShiftDate: form.value.shiftDate,
      StartTime: form.value.startTime,
      EndTime: form.value.endTime,
      BranchId: managerBranchId.value,
      Status: form.value.status || "Scheduled",
      BasedOnAvailabilityId: null,
    };

    if (isEditing.value) {
      const { error } = await supabase
        .from("schedule")
        .update(payload)
        .eq("ScheduleId", form.value.id);

      if (error) throw error;
      showToast("Schedule updated.", "success");
      await fetchSchedules();
    } else {
      const { error } = await supabase.from("schedule").insert([payload]);
      if (error) throw error;
      showToast("Schedule created.", "success");
      await fetchSchedules();
    }

    showConflictConfirm.value = false;
    conflictInfo.value = null;
    closeModal();
    activeTab.value = "schedule";
  } catch (error) {
    console.error("[Schedule] saveSchedule failed:", error);
    showToast(error?.message || "Failed to save schedule.", "error");
  } finally {
    saving.value = false;
  }
};

const confirmConflictSave = () => {
  showConflictConfirm.value = false;
  saveSchedule(true);
};

const confirmDelete = (sched) => {
  deleteTarget.value = sched;
  showDeleteConfirm.value = true;
};

const deleteSchedule = async () => {
  const currentUser = localStorage.getItem("username") || "Unknown";
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("schedule")
    .update({ Status: "Archived", ArchivedAt: now, ArchivedBy: currentUser })
    .eq("ScheduleId", deleteTarget.value.id);

  if (error) showToast("Failed to archive schedule.", "error");
  else {
    showToast("Schedule archived.", "success");
    await fetchSchedules();
  }
  showDeleteConfirm.value = false;
};

const updateAvailStatus = async (avail, status) => {
  const previousStatus = avail.status;

  try {
    const { error } = await supabase
      .from("availability")
      .update({ status })
      .eq("availabilityid", avail.id);

    if (error) throw error;

    avail.status = status;

    if (status === "Confirmed") {
      if (avail.endTime <= avail.startTime) {
        throw new Error("Cannot approve: end time must be after start time.");
      }

      const { data: conflicts } = await supabase
        .from("schedule")
        .select("StartTime, EndTime, Role")
        .eq("EmployeeId", avail.employeeId)
        .eq("ShiftDate", avail.availableDate)
        .eq("BranchId", managerBranchId.value)
        .neq("Status", "Cancelled")
        .neq("Status", "Archived");

      if (conflicts?.length) {
        for (const existing of conflicts) {
          if (
            timesOverlap(
              avail.startTime,
              avail.endTime,
              existing.StartTime,
              existing.EndTime,
            )
          ) {
            throw new Error(
              `Employee already has a shift from ${normalizeTime(existing.StartTime)}–${normalizeTime(existing.EndTime)} (${existing.Role}) on this date.`,
            );
          }
        }
      }

      const { data: emp } = await supabase
        .from("employee")
        .select("Position")
        .eq("EmployeeId", avail.employeeId)
        .maybeSingle();

      const { error: schedErr } = await supabase.from("schedule").insert([
        {
          EmployeeId: avail.employeeId,
          Role: avail.role !== "—" ? avail.role : emp?.Position || "Staff",
          ShiftDate: avail.availableDate,
          StartTime: avail.startTime,
          EndTime: avail.endTime,
          Status: "Scheduled",
          BranchId: managerBranchId.value,
          BasedOnAvailabilityId: avail.id,
        },
      ]);

      if (schedErr) throw schedErr;

      await fetchSchedules();
      showToast("Availability approved and schedule created.", "success");
    } else {
      showToast("Availability rejected.", "success");
    }

    fadingIds.value = new Set([...fadingIds.value, avail.id]);
    setTimeout(() => {
      fadingIds.value = new Set(
        [...fadingIds.value].filter((id) => id !== avail.id),
      );
    }, 20000);
  } catch (error) {
    console.error("[Schedule] updateAvailStatus failed:", error);
    avail.status = previousStatus;
    await supabase
      .from("availability")
      .update({ status: previousStatus })
      .eq("availabilityid", avail.id);
    showToast(error?.message || "Failed to update availability.", "error");
  }
};

const clearSchedFilters = () => {
  schedSearchInput.value = "";
  schedSearch.value = "";
  schedDateFilter.value = "";
  schedStatusFilter.value = "";
};

const branchName = (id) => {
  if (id == null || id === "") return "—";
  const match = branches.value.find((b) => String(b.id) === String(id));
  return match?.name || `Branch #${id}`;
};

const avatarColor = (id) => {
  const colors = [
    "#7B2D2D",
    "#2D5A7B",
    "#2D7B4F",
    "#7B6B2D",
    "#5A2D7B",
    "#7B2D5A",
  ];
  return colors[id % colors.length];
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const schedStatusClass = (s) =>
  ({
    Scheduled: "badge-pending",
    Completed: "badge-active",
    Cancelled: "badge-inactive",
  })[s] || "";

const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

watch(schedSearchInput, (value) => {
  clearTimeout(schedSearchDebounce);
  schedSearchDebounce = setTimeout(() => {
    schedSearch.value = value;
  }, 200);
});

onUnmounted(() => {
  clearTimeout(schedSearchDebounce);
});

onMounted(async () => {
  await resolveBranch();
  managerBranchId.value = userBranchId.value;
  if (!managerBranchId.value) {
    showToast("Unable to determine your branch. Contact admin.", "error");
    isLoading.value = false;
    return;
  }

  await Promise.all([
    fetchBranches(),
    fetchEmployees(),
    fetchAvailability(),
    fetchSchedules(),
    fetchChangeInquiries(),
  ]);
  isLoading.value = false;
});
</script>

<style scoped>
:root {
  --brand-primary: #7b1d1d;
  --brand-hover: #9b2d2d;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  --text-main: #1a1a1a;
  --text-muted: #6b6b6b;
}

.schedule-page {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}
.page-title {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}
.page-sub {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.tab-bar {
  display: flex;
  gap: 0.25rem;
  border-bottom: 2px solid var(--border);
}
.tab-btn {
  background: none;
  border: none;
  padding: 0.6rem 1rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}
.tab-btn:hover {
  color: var(--brand-primary);
}
.tab-btn.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
}
.tab-badge {
  background: #7b1d1d;
  color: #fff;
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-weight: 700;
  min-width: 18px;
  text-align: center;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}

.avail-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.avail-row {
  background: #fff;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.avail-row:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
.avail-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.avail-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.avail-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}
.avail-role {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
  margin-left: 0.35rem;
}
.avail-meta {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
.avail-notes {
  font-size: 0.76rem;
  color: #888;
  margin-top: 0.15rem;
  font-style: italic;
}

.badge-status {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  text-transform: lowercase;
}
.badge-active {
  background: #d4edda;
  color: #155724;
}
.badge-pending {
  background: #fff3cd;
  color: #856404;
}
.badge-inactive {
  background: #f8d7da;
  color: #721c24;
}

.btn-action {
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-action.approve {
  background: #28a745;
  color: #fff;
}
.btn-action.reject {
  background: #dc3545;
  color: #fff;
}

.table-wrap {
  background: #fff;
  border-radius: 10px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.sched-table {
  width: 100%;
  border-collapse: collapse;
}
.sched-table thead tr {
  background: #f9f5f3;
}
.sched-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}
.sched-table td {
  padding: 0.75rem 1rem;
  font-size: 0.83rem;
  color: var(--text-main);
  border-bottom: 1px solid #f0ebe8;
}
.sched-table tr:last-child td {
  border-bottom: none;
}
.sched-table tbody tr:hover {
  background: #faf7f5;
}
.td-emp {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.emp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.emp-avatar-sm {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.btn-primary-brand {
  background: #8b4513;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.btn-primary-brand:hover:not(:disabled) {
  background: #a0522d;
}
.btn-primary-brand:disabled {
  opacity: 0.65;
}

.btn-danger-brand {
  background: #c0392b;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
}
.btn-ghost:hover {
  background: #f0ebe8;
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.35rem;
  border-radius: 5px;
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
}
.icon-btn:hover {
  background: #f0e8e6;
  color: var(--brand-primary);
}
.icon-btn.danger:hover {
  background: #fde8e8;
  color: #c0392b;
}

.filter-bar {
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.fc-brand {
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
}
.fc-brand:focus {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px rgba(123, 29, 29, 0.15);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}
.modal-panel {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.22s ease;
}
.modal-panel--sm {
  max-width: 420px;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
}
.modal-panel-header h5 {
  font-size: 1rem;
  font-weight: 700;
}
.modal-sub {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.modal-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
}
.modal-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}
.btn-close-panel {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: var(--text-muted);
  padding: 0.25rem;
  border-radius: 5px;
  cursor: pointer;
}
.btn-close-panel:hover {
  color: var(--text-main);
}
.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.25rem;
  display: block;
}

.toast-wrap {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 2000;
  background: #1a1a1a;
  color: #fff;
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  font-size: 0.84rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  animation: fadeIn 0.2s ease;
}
.toast-wrap.success {
  border-left: 4px solid #28a745;
}
.toast-wrap.error {
  border-left: 4px solid #dc3545;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── CALENDAR VIEW ───────────────────────────────────────── */
.calendar-container {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f9f5f3;
  border-bottom: 2px solid var(--border);
}

.calendar-day-header {
  padding: 0.75rem;
  text-align: center;
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.9rem;
  border-right: 1px solid var(--border);
}

.calendar-day-header:last-child {
  border-right: none;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  background: #fff;
}

.calendar-day {
  min-height: 120px;
  padding: 0.75rem;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: #fff;
  transition: all 0.2s;
  position: relative;
  display: flex;
  flex-direction: column;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day:nth-last-child(-n + 7) {
  border-bottom: none;
}

.calendar-day:hover {
  background: #f9fafb;
}

.calendar-day.is-today {
  background: #f5f0eb;
  border: 2px solid var(--brand-primary);
  position: relative;
}

.calendar-day.is-other-month {
  background: #fafbfc;
  opacity: 0.5;
}

.day-number {
  font-weight: 700;
  color: var(--text-main);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.today-badge {
  display: inline-block;
  background: #fff4e5;
  color: #8b4513;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: auto;
  border: 1px solid #f1e6d2;
}

.day-shifts {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
}

.shift-badge {
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.shift-badge-time {
  font-size: 0.65rem;
  opacity: 0.9;
}

.shift-badge-name {
  font-weight: 700;
  font-size: 0.7rem;
  margin-left: auto;
}

.is-fading {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.5s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.fade-slide-move {
  transition: transform 0.4s ease;
}
</style>