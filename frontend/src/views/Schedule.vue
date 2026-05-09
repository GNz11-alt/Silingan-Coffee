<template>
  <div class="schedule-page">

    <!-- ── PAGE HEADER ─────────────────────────────────────── -->
    <div class="d-flex align-items-start justify-content-between mb-4">
      <div>
        <h4 class="page-title mb-1">Schedule Management</h4>
        <p class="page-sub mb-0">Manage employee availability and schedules</p>
      </div>
      <button class="btn btn-primary-brand" @click="openCreateModal">
        <i class="bi bi-plus-lg me-1"></i> Create Schedule
      </button>
    </div>

    <!-- ── TABS ────────────────────────────────────────────── -->
    <div class="tab-bar mb-4">
      <button
        v-for="tab in tabs" :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'availability'" class="tab-badge">
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- ──────────────────────────────────────────────────────
         TAB 1 — AVAILABILITY REQUESTS
    ─────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'availability'">
      <div class="section-title mb-3">Employee Availability</div>

      <div v-if="availability.length" class="avail-list">
        <div
          v-for="avail in availability"
          :key="avail.id"
          class="avail-row"
        >
          <div class="avail-left">
            <div class="emp-avatar" :style="{ background: avatarColor(avail.employeeId) }">
              {{ avail.initials }}
            </div>
            <div>
              <div class="avail-name">
                {{ avail.employeeName }}
                <span class="avail-role">{{ avail.role }}</span>
              </div>
              <div class="avail-meta">
                <i class="bi bi-calendar3"></i> {{ formatDate(avail.availableDate) }}
                &nbsp;
                <i class="bi bi-clock"></i> {{ avail.startTime }} – {{ avail.endTime }}
              </div>
              <div v-if="avail.notes" class="avail-notes">{{ avail.notes }}</div>
            </div>
          </div>
          <div class="avail-right">
            <span v-if="avail.status === 'Confirmed'" class="badge-status badge-active">approved</span>
            <template v-else-if="avail.status === 'Pending'">
              <span class="badge-status badge-pending">pending</span>
              <button class="btn-action approve" @click="updateAvailStatus(avail, 'Confirmed')">Approve</button>
              <button class="btn-action reject"  @click="updateAvailStatus(avail, 'Cancelled')">Reject</button>
            </template>
            <span v-else class="badge-status badge-inactive">rejected</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state text-center py-5">
        <i class="bi bi-calendar-x fs-1 text-muted"></i>
        <p class="mt-3 text-muted">No availability submissions yet.</p>
      </div>
    </div>

    <!-- ──────────────────────────────────────────────────────
         TAB 2 — CURRENT SCHEDULE
    ─────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'schedule'">

      <!-- Sub-filters -->
      <div class="filter-bar d-flex flex-wrap gap-2 align-items-center mb-3">
        <input v-model="schedSearch" type="text" class="form-control fc-brand" style="width:200px" placeholder="Search employee…" />
        <input v-model="schedDateFilter" type="date" class="form-control fc-brand" style="width:180px" />
        <select v-model="schedBranchFilter" class="form-select fc-brand" style="width:200px">
          <option value="">All Branches</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
        <select v-model="schedStatusFilter" class="form-select fc-brand" style="width:150px">
          <option value="">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button class="btn btn-ghost btn-sm" @click="clearSchedFilters">Clear</button>
      </div>

      <!-- Schedule table -->
      <div class="table-wrap">
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
                  <div class="emp-avatar-sm" :style="{ background: avatarColor(sched.employeeId) }">
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
                <span class="badge-status" :class="schedStatusClass(sched.status)">{{ sched.status }}</span>
              </td>
              <td>
                <div class="d-flex gap-1">
                  <button class="icon-btn" title="Edit" @click="openEditModal(sched)"><i class="bi bi-pencil-square"></i></button>
                  <button class="icon-btn danger" title="Delete" @click="confirmDelete(sched)"><i class="bi bi-trash3"></i></button>
                </div>
              </td>
            </tr>
            <tr v-if="!filteredSchedules.length">
              <td colspan="7" class="text-center text-muted py-4">No schedules found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ──────────────────────────────────────────────────────
         TAB 3 — CHANGE INQUIRIES
    ─────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'change'">
      <div v-if="changeInquiries.length" class="avail-list">
        <div v-for="inq in changeInquiries" :key="inq.id" class="avail-row">
          <div class="avail-left">
            <div class="emp-avatar" :style="{ background: avatarColor(inq.employeeId) }">{{ inq.initials }}</div>
            <div>
              <div class="avail-name">{{ inq.employeeName }} <span class="avail-role">{{ inq.role }}</span></div>
              <div class="avail-meta">Requesting shift change for <strong>{{ formatDate(inq.requestDate) }}</strong></div>
              <div class="avail-notes">{{ inq.reason }}</div>
            </div>
          </div>
          <div class="avail-right">
            <template v-if="inq.status === 'Pending'">
              <span class="badge-status badge-pending">pending</span>
              <button class="btn-action approve" @click="inq.status = 'Approved'">Approve</button>
              <button class="btn-action reject"  @click="inq.status = 'Denied'">Deny</button>
            </template>
            <span v-else-if="inq.status === 'Approved'" class="badge-status badge-active">approved</span>
            <span v-else class="badge-status badge-inactive">denied</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-state text-center py-5">
        <i class="bi bi-arrow-left-right fs-1 text-muted"></i>
        <p class="mt-3 text-muted">No change inquiries at the moment.</p>
      </div>
    </div>

    <!-- ── CREATE / EDIT SCHEDULE MODAL ───────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">{{ isEditing ? 'Edit Schedule' : 'Create Schedule' }}</h5>
              <p class="modal-sub mb-0">{{ isEditing ? 'Update this shift' : 'Create a new 15-day schedule for an employee' }}</p>
            </div>
            <button class="btn-close-panel" @click="closeModal"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="modal-panel-body">
            <div class="row g-3">
              <!-- Employee -->
              <div class="col-12">
                <label class="form-label-sm">Employee Name</label>
                <select v-model="form.employeeId" class="form-select fc-brand" @change="onEmployeeChange">
                  <option value="" disabled>Select employee</option>
                  <option v-for="e in employeeList" :key="e.id" :value="e.id">{{ e.name }}</option>
                </select>
                <div v-if="errors.employeeId" class="text-danger small mt-1">{{ errors.employeeId }}</div>
              </div>

              <!-- Role -->
              <div class="col-12">
                <label class="form-label-sm">Role</label>
                <select v-model="form.role" class="form-select fc-brand">
                  <option value="" disabled>Select role</option>
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
                <div v-if="errors.role" class="text-danger small mt-1">{{ errors.role }}</div>
              </div>

              <!-- Work Date -->
              <div class="col-12">
                <label class="form-label-sm">Work Date</label>
                <input v-model="form.shiftDate" type="date" class="form-control fc-brand" />
                <div v-if="errors.shiftDate" class="text-danger small mt-1">{{ errors.shiftDate }}</div>
              </div>

              <!-- From / To -->
              <div class="col-6">
                <label class="form-label-sm">From</label>
                <input v-model="form.startTime" type="time" class="form-control fc-brand" />
                <div v-if="errors.startTime" class="text-danger small mt-1">{{ errors.startTime }}</div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">To</label>
                <input v-model="form.endTime" type="time" class="form-control fc-brand" />
                <div v-if="errors.endTime" class="text-danger small mt-1">{{ errors.endTime }}</div>
              </div>

              <!-- Branch -->
              <div class="col-12">
                <label class="form-label-sm">Branch</label>
                <select v-model="form.branchId" class="form-select fc-brand">
                  <option value="" disabled>Select branch</option>
                  <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
                <div v-if="errors.branchId" class="text-danger small mt-1">{{ errors.branchId }}</div>
              </div>

              <!-- Based on Availability -->
              <div class="col-12">
                <label class="form-label-sm">Schedule Valid From</label>
                <input v-model="form.validFrom" type="date" class="form-control fc-brand" />
                <p class="helper-text mt-1">Schedule will be valid for 15 days</p>
              </div>

              <!-- Status (edit only) -->
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
            <button class="btn btn-primary-brand" @click="saveSchedule" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEditing ? 'Save Changes' : 'Create Schedule' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── DELETE CONFIRM ──────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="modal-panel modal-panel--sm">
          <div class="modal-panel-header">
            <h5 class="mb-0">Delete Schedule</h5>
            <button class="btn-close-panel" @click="showDeleteConfirm = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-panel-body">
            <p>Delete the schedule for <strong>{{ deleteTarget?.employeeName }}</strong> on
            <strong>{{ formatDate(deleteTarget?.shiftDate) }}</strong>? This cannot be undone.</p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn btn-danger-brand" @click="deleteSchedule">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── TOAST ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="toast.show" class="toast-wrap" :class="toast.type">
        <i class="bi" :class="toast.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'"></i>
        {{ toast.message }}
      </div>
    </Teleport>

  </div>
</template>

<script>
export default {
  name: 'ScheduleManagement',

  data() {
    return {
      activeTab: 'availability',

      tabs: [
        { key: 'availability', label: 'Availability Requests' },
        { key: 'schedule',     label: 'Current Schedule'      },
        { key: 'change',       label: 'Change Inquiries'      },
      ],

      // Schedule filters
      schedSearch: '',
      schedDateFilter: '',
      schedBranchFilter: '',
      schedStatusFilter: '',

      showModal: false,
      showDeleteConfirm: false,
      isEditing: false,
      saving: false,
      deleteTarget: null,
      toast: { show: false, message: '', type: 'success' },

      form: this.emptyForm(),
      errors: {},

      branches: [
        { id: 1, name: 'Main Branch – Quezon City' },
        { id: 2, name: 'Branch 2 – Manila' },
        { id: 3, name: 'Branch 3 – Makati' },
      ],

      roles: ['Barista', 'Cashier', 'Kitchen Staff', 'Cleaning Staff', 'Server', 'Supervisor'],

      employeeList: [
        { id: 1, name: 'Maria Santos' },
        { id: 2, name: 'Jose Flores' },
        { id: 3, name: 'Maria Rivera' },
        { id: 4, name: 'Antonio Ramos' },
        { id: 5, name: 'Rosa Gonzales' },
        { id: 6, name: 'Pedro Fernandez' },
      ],

      // Mock availability data — replace with API call
      availability: [
        {
          id: 1, employeeId: 2, employeeName: 'Juan Dela Cruz', initials: 'JD',
          role: 'Barista', availableDate: '2025-10-16',
          startTime: '08:00', endTime: '16:00', notes: '', status: 'Confirmed',
        },
        {
          id: 2, employeeId: 3, employeeName: 'Maria Santos', initials: 'MS',
          role: 'Cashier', availableDate: '2025-10-15',
          startTime: '09:00', endTime: '17:00', notes: 'Can cover morning shift', status: 'Pending',
        },
        {
          id: 3, employeeId: 6, employeeName: 'Ana Reyes', initials: 'AR',
          role: 'Cleaning', availableDate: '2025-10-16',
          startTime: '06:00', endTime: '14:00', notes: '', status: 'Confirmed',
        },
      ],

      // Mock schedules — replace with API call
      schedules: [
        {
          id: 1, employeeId: 1, employeeName: 'Maria Santos', initials: 'MS',
          role: 'Store Manager', shiftDate: '2025-10-16',
          startTime: '08:00', endTime: '17:00',
          branchId: 1, status: 'Scheduled',
        },
        {
          id: 2, employeeId: 2, employeeName: 'Jose Flores', initials: 'JF',
          role: 'Barista', shiftDate: '2025-10-16',
          startTime: '07:00', endTime: '15:00',
          branchId: 1, status: 'Scheduled',
        },
        {
          id: 3, employeeId: 3, employeeName: 'Maria Rivera', initials: 'MR',
          role: 'Cashier', shiftDate: '2025-10-15',
          startTime: '09:00', endTime: '17:00',
          branchId: 2, status: 'Completed',
        },
        {
          id: 4, employeeId: 4, employeeName: 'Antonio Ramos', initials: 'AR',
          role: 'Kitchen Staff', shiftDate: '2025-10-17',
          startTime: '06:00', endTime: '14:00',
          branchId: 1, status: 'Scheduled',
        },
      ],

      changeInquiries: [
        {
          id: 1, employeeId: 5, employeeName: 'Rosa Gonzales', initials: 'RG',
          role: 'Server', requestDate: '2025-10-18',
          reason: 'Medical appointment in the morning', status: 'Pending',
        },
      ],
    };
  },

  computed: {
    pendingCount() {
      return this.availability.filter(a => a.status === 'Pending').length;
    },

    filteredSchedules() {
      return this.schedules.filter(s => {
        const q = this.schedSearch.toLowerCase();
        const matchSearch = !q || s.employeeName.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
        const matchDate   = !this.schedDateFilter || s.shiftDate === this.schedDateFilter;
        const matchBranch = !this.schedBranchFilter || s.branchId === this.schedBranchFilter;
        const matchStatus = !this.schedStatusFilter || s.status === this.schedStatusFilter;
        return matchSearch && matchDate && matchBranch && matchStatus;
      });
    },
  },

  methods: {
    emptyForm() {
      return { id: null, employeeId: '', role: '', shiftDate: '', startTime: '', endTime: '', branchId: '', validFrom: '', status: 'Scheduled' };
    },

    openCreateModal() {
      this.form = this.emptyForm();
      this.errors = {};
      this.isEditing = false;
      this.showModal = true;
    },

    openEditModal(sched) {
      this.form = { ...sched, validFrom: sched.shiftDate };
      this.errors = {};
      this.isEditing = true;
      this.showModal = true;
    },

    closeModal() { this.showModal = false; },

    onEmployeeChange() {
      const emp = this.employeeList.find(e => e.id === this.form.employeeId);
      if (emp) {
        const [first, ...rest] = emp.name.split(' ');
        this.form.initials = `${first[0]}${rest[0]?.[0] || ''}`.toUpperCase();
        this.form.employeeName = emp.name;
      }
    },

    validate() {
      const e = {};
      if (!this.form.employeeId) e.employeeId = 'Employee is required.';
      if (!this.form.role)       e.role       = 'Role is required.';
      if (!this.form.shiftDate)  e.shiftDate  = 'Work date is required.';
      if (!this.form.startTime)  e.startTime  = 'Start time is required.';
      if (!this.form.endTime)    e.endTime    = 'End time is required.';
      if (!this.form.branchId)   e.branchId   = 'Branch is required.';
      if (this.form.startTime && this.form.endTime && this.form.startTime >= this.form.endTime)
        e.endTime = 'End time must be after start time.';
      this.errors = e;
      return Object.keys(e).length === 0;
    },

    async saveSchedule() {
      if (!this.validate()) return;
      this.saving = true;
      await new Promise(r => setTimeout(r, 500));
      // Replace with: await axios.post('/api/schedules', this.form) or PUT

      if (this.isEditing) {
        const idx = this.schedules.findIndex(s => s.id === this.form.id);
        if (idx !== -1) this.schedules.splice(idx, 1, { ...this.form });
        this.showToast('Schedule updated.', 'success');
      } else {
        this.schedules.push({ ...this.form, id: Date.now() });
        this.showToast('Schedule created.', 'success');
      }

      this.saving = false;
      this.closeModal();
      this.activeTab = 'schedule';
    },

    confirmDelete(sched) {
      this.deleteTarget = sched;
      this.showDeleteConfirm = true;
    },

    async deleteSchedule() {
      // Replace with: await axios.delete(`/api/schedules/${this.deleteTarget.id}`)
      this.schedules = this.schedules.filter(s => s.id !== this.deleteTarget.id);
      this.showDeleteConfirm = false;
      this.showToast('Schedule deleted.', 'success');
    },

    updateAvailStatus(avail, status) {
      avail.status = status;
      this.showToast(`Availability ${status === 'Confirmed' ? 'approved' : 'rejected'}.`, 'success');
    },

    clearSchedFilters() {
      this.schedSearch = '';
      this.schedDateFilter = '';
      this.schedBranchFilter = '';
      this.schedStatusFilter = '';
    },

    branchName(id) {
      return this.branches.find(b => b.id === id)?.name || '—';
    },

    avatarColor(id) {
      const colors = ['#7B2D2D', '#2D5A7B', '#2D7B4F', '#7B6B2D', '#5A2D7B', '#7B2D5A'];
      return colors[id % colors.length];
    },

    formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    schedStatusClass(s) {
      return { Scheduled: 'badge-pending', Completed: 'badge-active', Cancelled: 'badge-inactive' }[s] || '';
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
};
</script>

<style scoped>
:root {
  --brand-primary: #7B1D1D;
  --brand-hover: #9B2D2D;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0,0,0,.07);
  --text-main: #1a1a1a;
  --text-muted: #6b6b6b;
}

.schedule-page { padding: 1.5rem; background: #f4f1ef; min-height: 100vh; }

.page-title { font-size: 1.35rem; font-weight: 700; color: var(--text-main); }
.page-sub   { font-size: .82rem; color: var(--text-muted); }

/* ── TABS ─────────────────────────────────────────────── */
.tab-bar { display: flex; gap: .25rem; border-bottom: 2px solid var(--border); }
.tab-btn {
  background: none; border: none; padding: .6rem 1rem; font-size: .84rem;
  font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: .4rem;
}
.tab-btn:hover  { color: var(--brand-primary); }
.tab-btn.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }
.tab-badge {
  background: var(--brand-primary); color: #fff;
  font-size: .65rem; padding: .1rem .4rem; border-radius: 999px; font-weight: 700;
  min-width: 18px; text-align: center;
}

/* ── SECTION TITLE ────────────────────────────────────── */
.section-title { font-size: .9rem; font-weight: 700; color: var(--text-main); }

/* ── AVAILABILITY LIST ────────────────────────────────── */
.avail-list { display: flex; flex-direction: column; gap: .75rem; }
.avail-row {
  background: #fff; border-radius: 10px; padding: 1rem 1.25rem;
  border: 1px solid var(--border); box-shadow: var(--shadow);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  transition: box-shadow .2s;
}
.avail-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }

.avail-left  { display: flex; align-items: center; gap: .85rem; }
.avail-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }

.avail-name  { font-size: .9rem; font-weight: 700; color: var(--text-main); }
.avail-role  { font-size: .75rem; color: var(--text-muted); font-weight: 400; margin-left: .35rem; }
.avail-meta  { font-size: .78rem; color: var(--text-muted); margin-top: .2rem; display: flex; align-items: center; gap: .25rem; }
.avail-notes { font-size: .76rem; color: #888; margin-top: .15rem; font-style: italic; }

/* ── BADGE ────────────────────────────────────────────── */
.badge-status {
  display: inline-block; font-size: .68rem; font-weight: 700;
  padding: .2rem .55rem; border-radius: 999px; text-transform: lowercase;
}
.badge-active   { background: #d4edda; color: #155724; }
.badge-pending  { background: #fff3cd; color: #856404; }
.badge-inactive { background: #f8d7da; color: #721c24; }

/* ── ACTION BUTTONS ───────────────────────────────────── */
.btn-action {
  border: none; border-radius: 6px; padding: .3rem .7rem;
  font-size: .78rem; font-weight: 600; cursor: pointer; transition: opacity .15s;
}
.btn-action.approve { background: #28a745; color: #fff; }
.btn-action.reject  { background: #dc3545; color: #fff; }
.btn-action:hover   { opacity: .85; }

/* ── TABLE ────────────────────────────────────────────── */
.table-wrap { background: #fff; border-radius: 10px; border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.sched-table { width: 100%; border-collapse: collapse; }
.sched-table thead tr { background: #f9f5f3; }
.sched-table th {
  padding: .75rem 1rem; text-align: left; font-size: .75rem;
  font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: .04em; border-bottom: 1px solid var(--border);
}
.sched-table td {
  padding: .75rem 1rem; font-size: .83rem; color: var(--text-main);
  border-bottom: 1px solid #f0ebe8;
}
.sched-table tr:last-child td { border-bottom: none; }
.sched-table tbody tr:hover   { background: #faf7f5; }

.td-emp { display: flex; align-items: center; gap: .6rem; }

/* ── AVATARS ──────────────────────────────────────────── */
.emp-avatar {
  width: 40px; height: 40px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff;
  font-weight: 700; font-size: .85rem; flex-shrink: 0;
}
.emp-avatar-sm {
  width: 28px; height: 28px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; color: #fff;
  font-weight: 700; font-size: .7rem; flex-shrink: 0;
}

/* ── BUTTONS ──────────────────────────────────────────── */
.btn-primary-brand {
  background: var(--brand-primary); color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
  transition: background .18s;
}
.btn-primary-brand:hover:not(:disabled) { background: var(--brand-hover); }
.btn-primary-brand:disabled { opacity: .65; }
.btn-danger-brand {
  background: #c0392b; color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
}
.btn-ghost {
  background: transparent; border: 1px solid var(--border); color: var(--text-main);
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem;
}
.btn-ghost:hover { background: #f0ebe8; }

.icon-btn {
  background: none; border: none; padding: .25rem .35rem;
  border-radius: 5px; color: var(--text-muted); font-size: .9rem;
  transition: color .15s, background .15s; cursor: pointer;
}
.icon-btn:hover       { background: #f0e8e6; color: var(--brand-primary); }
.icon-btn.danger:hover{ background: #fde8e8; color: #c0392b; }

/* ── FILTER BAR ───────────────────────────────────────── */
.filter-bar {
  background: #fff; border-radius: 10px; padding: .75rem 1rem;
  box-shadow: var(--shadow); border: 1px solid var(--border);
}
.fc-brand { font-size: .84rem; border-color: var(--border); border-radius: 6px; }
.fc-brand:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 2px rgba(123,29,29,.15); }

/* ── MODAL ────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1050; padding: 1rem;
}
.modal-panel {
  background: #fff; border-radius: 14px; width: 100%; max-width: 520px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.2); animation: slideUp .22s ease;
}
.modal-panel--sm { max-width: 420px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.modal-panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
}
.modal-panel-header h5 { font-size: 1rem; font-weight: 700; }
.modal-sub  { font-size: .78rem; color: var(--text-muted); }
.modal-panel-body   { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; }
.modal-panel-footer {
  display: flex; justify-content: flex-end; gap: .6rem;
  padding: 1rem 1.5rem; border-top: 1px solid var(--border);
}
.btn-close-panel {
  background: none; border: none; font-size: .9rem; color: var(--text-muted);
  padding: .25rem; border-radius: 5px; cursor: pointer;
}
.btn-close-panel:hover { color: var(--text-main); }

.form-label-sm { font-size: .78rem; font-weight: 600; color: var(--text-main); margin-bottom: .25rem; display: block; }
.helper-text   { font-size: .74rem; color: var(--text-muted); }

/* ── TOAST ────────────────────────────────────────────── */
.toast-wrap {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 2000;
  background: #1a1a1a; color: #fff; padding: .75rem 1.2rem;
  border-radius: 8px; font-size: .84rem; display: flex; align-items: center; gap: .5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,.25); animation: fadeIn .2s ease;
}
.toast-wrap.success { border-left: 4px solid #28a745; }
.toast-wrap.error   { border-left: 4px solid #dc3545; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.empty-state { color: var(--text-muted); }
</style>