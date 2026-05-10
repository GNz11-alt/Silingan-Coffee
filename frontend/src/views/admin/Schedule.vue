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
      <button v-for="tab in tabs" :key="tab.key" class="tab-btn" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        {{ tab.label }}
        <span v-if="tab.key === 'availability'" class="tab-badge">{{ pendingCount }}</span>
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
        <div v-if="availability.length" class="avail-list">
          <div v-for="avail in availability" :key="avail.id" class="avail-row">
            <div class="avail-left">
              <div class="emp-avatar" :style="{ background: avatarColor(avail.employeeId) }">{{ avail.initials }}</div>
              <div>
                <div class="avail-name">{{ avail.employeeName }} <span class="avail-role">{{ avail.role }}</span></div>
                <div class="avail-meta">
                  <i class="bi bi-calendar3"></i> {{ formatDate(avail.availableDate) }}
                  &nbsp;<i class="bi bi-clock"></i> {{ avail.startTime }} – {{ avail.endTime }}
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

      <!-- ── TAB 2: CURRENT SCHEDULE ─────────────────────────── -->
      <div v-if="activeTab === 'schedule'">
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
                    <div class="emp-avatar-sm" :style="{ background: avatarColor(sched.employeeId) }">{{ sched.initials }}</div>
                    {{ sched.employeeName }}
                  </div>
                </td>
                <td>{{ sched.role }}</td>
                <td>{{ formatDate(sched.shiftDate) }}</td>
                <td>{{ sched.startTime }} – {{ sched.endTime }}</td>
                <td>{{ branchName(sched.branchId) }}</td>
                <td><span class="badge-status" :class="schedStatusClass(sched.status)">{{ sched.status }}</span></td>
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

      <!-- ── TAB 3: CHANGE INQUIRIES ─────────────────────────── -->
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

    </template>

    <!-- ── CREATE / EDIT MODAL ─────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">{{ isEditing ? 'Edit Schedule' : 'Create Schedule' }}</h5>
              <p class="modal-sub mb-0">{{ isEditing ? 'Update this shift' : 'Create a new schedule for an employee' }}</p>
            </div>
            <button class="btn-close-panel" @click="closeModal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-panel-body">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-sm">Employee</label>
                <select v-model="form.employeeId" class="form-select fc-brand">
                  <option value="" disabled>Select employee</option>
                  <option v-for="e in employeeList" :key="e.id" :value="e.id">{{ e.name }}</option>
                </select>
                <div v-if="errors.employeeId" class="text-danger small mt-1">{{ errors.employeeId }}</div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Role</label>
                <select v-model="form.role" class="form-select fc-brand">
                  <option value="" disabled>Select role</option>
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
                <div v-if="errors.role" class="text-danger small mt-1">{{ errors.role }}</div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Shift Date</label>
                <input v-model="form.shiftDate" type="date" class="form-control fc-brand" />
                <div v-if="errors.shiftDate" class="text-danger small mt-1">{{ errors.shiftDate }}</div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">Start Time</label>
                <input v-model="form.startTime" type="time" class="form-control fc-brand" />
                <div v-if="errors.startTime" class="text-danger small mt-1">{{ errors.startTime }}</div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">End Time</label>
                <input v-model="form.endTime" type="time" class="form-control fc-brand" />
                <div v-if="errors.endTime" class="text-danger small mt-1">{{ errors.endTime }}</div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Branch</label>
                <select v-model="form.branchId" class="form-select fc-brand">
                  <option value="" disabled>Select branch</option>
                  <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
                <div v-if="errors.branchId" class="text-danger small mt-1">{{ errors.branchId }}</div>
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
            <p>Delete the schedule for <strong>{{ deleteTarget?.employeeName }}</strong> on <strong>{{ formatDate(deleteTarget?.shiftDate) }}</strong>? This cannot be undone.</p>
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

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase.js'

const isLoading = ref(true)
const activeTab = ref('availability')
const tabs = [
  { key: 'availability', label: 'Availability Requests' },
  { key: 'schedule',     label: 'Current Schedule' },
  { key: 'change',       label: 'Change Inquiries' },
]

const schedSearch = ref('')
const schedDateFilter = ref('')
const schedBranchFilter = ref('')
const schedStatusFilter = ref('')
const showModal = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleteTarget = ref(null)
const toast = ref({ show: false, message: '', type: 'success' })
const errors = ref({})

const branches = ref([])
const employeeList = ref([])
const availability = ref([])
const schedules = ref([])
const changeInquiries = ref([])

const roles = ['Barista', 'Cashier', 'Kitchen Staff', 'Cleaning Staff', 'Server', 'Supervisor']

const emptyForm = () => ({
  id: null, employeeId: '', role: '', shiftDate: '',
  startTime: '', endTime: '', branchId: '', status: 'Scheduled'
})
const form = ref(emptyForm())

const pendingCount = computed(() => availability.value.filter(a => a.status === 'Pending').length)

const filteredSchedules = computed(() => {
  return schedules.value.filter(s => {
    const q = schedSearch.value.toLowerCase()
    const matchSearch = !q || s.employeeName.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    const matchDate   = !schedDateFilter.value || s.shiftDate === schedDateFilter.value
    const matchBranch = !schedBranchFilter.value || s.branchId === schedBranchFilter.value
    const matchStatus = !schedStatusFilter.value || s.status === schedStatusFilter.value
    return matchSearch && matchDate && matchBranch && matchStatus
  })
})

const fetchBranches = async () => {
  const { data } = await supabase.from('branch').select('BranchId, BranchName')
  if (data) branches.value = data.map(b => ({ id: b.BranchId, name: b.BranchName }))
}

const fetchEmployees = async () => {
  const { data } = await supabase
    .from('employee')
    .select('EmployeeId, FirstName, LastName')
  if (data) {
    employeeList.value = data.map(e => ({
      id: e.EmployeeId,
      name: `${e.FirstName} ${e.LastName}`
    }))
  }
}

const fetchAvailability = async () => {
  const { data } = await supabase
    .from('availability')
    .select('AvailabilityId, EmployeeId, AvailableDate, StartTime, EndTime, Notes, employee(FirstName, LastName)')
    .order('AvailableDate', { ascending: false })

  if (data) {
    availability.value = data.map(a => ({
      id: a.AvailabilityId,
      employeeId: a.EmployeeId,
      employeeName: `${a.employee?.FirstName} ${a.employee?.LastName}`,
      initials: `${a.employee?.FirstName?.[0]}${a.employee?.LastName?.[0]}`.toUpperCase(),
      role: '—',
      availableDate: a.AvailableDate,
      startTime: a.StartTime,
      endTime: a.EndTime,
      notes: a.Notes,
      status: 'Pending',
    }))
  }
}

const fetchSchedules = async () => {
  const { data } = await supabase
    .from('schedule')
    .select('ScheduleId, EmployeeId, EmployeeRole, ShiftDate, StartTime, EndTime, EmployeeStatus, BranchId, employee(FirstName, LastName)')
    .order('ShiftDate', { ascending: false })

  if (data) {
    schedules.value = data.map(s => ({
      id: s.ScheduleId,
      employeeId: s.EmployeeId,
      employeeName: `${s.employee?.FirstName} ${s.employee?.LastName}`,
      initials: `${s.employee?.FirstName?.[0]}${s.employee?.LastName?.[0]}`.toUpperCase(),
      role: s.EmployeeRole,
      shiftDate: s.ShiftDate,
      startTime: s.StartTime,
      endTime: s.EndTime,
      branchId: s.BranchId,
      status: s.EmployeeStatus,
    }))
  }
}

const openCreateModal = () => {
  form.value = emptyForm()
  errors.value = {}
  isEditing.value = false
  showModal.value = true
}

const openEditModal = (sched) => {
  form.value = { ...sched }
  errors.value = {}
  isEditing.value = true
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const validate = () => {
  const e = {}
  if (!form.value.employeeId) e.employeeId = 'Employee is required.'
  if (!form.value.role)       e.role       = 'Role is required.'
  if (!form.value.shiftDate)  e.shiftDate  = 'Shift date is required.'
  if (!form.value.startTime)  e.startTime  = 'Start time is required.'
  if (!form.value.endTime)    e.endTime    = 'End time is required.'
  if (!form.value.branchId)   e.branchId   = 'Branch is required.'
  if (form.value.startTime && form.value.endTime && form.value.startTime >= form.value.endTime)
    e.endTime = 'End time must be after start time.'
  errors.value = e
  return Object.keys(e).length === 0
}

const saveSchedule = async () => {
  if (!validate()) return
  saving.value = true

  const payload = {
    EmployeeId: form.value.employeeId,
    EmployeeRole: form.value.role,
    ShiftDate: form.value.shiftDate,
    StartTime: form.value.startTime,
    EndTime: form.value.endTime,
    BranchId: form.value.branchId,
    EmployeeStatus: form.value.status || 'Scheduled',
    BasedOnAvailability: false,
  }

  if (isEditing.value) {
    const { error } = await supabase
      .from('schedule')
      .update(payload)
      .eq('ScheduleId', form.value.id)

    if (error) showToast('Failed to update schedule.', 'error')
    else { showToast('Schedule updated.', 'success'); await fetchSchedules() }
  } else {
    const { error } = await supabase
      .from('schedule')
      .insert([payload])

    if (error) showToast('Failed to create schedule.', 'error')
    else { showToast('Schedule created.', 'success'); await fetchSchedules() }
  }

  saving.value = false
  closeModal()
  activeTab.value = 'schedule'
}

const confirmDelete = (sched) => {
  deleteTarget.value = sched
  showDeleteConfirm.value = true
}

const deleteSchedule = async () => {
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('ScheduleId', deleteTarget.value.id)

  if (error) showToast('Failed to delete schedule.', 'error')
  else { showToast('Schedule deleted.', 'success'); await fetchSchedules() }
  showDeleteConfirm.value = false
}

const updateAvailStatus = (avail, status) => {
  avail.status = status
  showToast(`Availability ${status === 'Confirmed' ? 'approved' : 'rejected'}.`, 'success')
}

const clearSchedFilters = () => {
  schedSearch.value = ''
  schedDateFilter.value = ''
  schedBranchFilter.value = ''
  schedStatusFilter.value = ''
}

const branchName = (id) => branches.value.find(b => b.id === id)?.name || '—'

const avatarColor = (id) => {
  const colors = ['#7B2D2D', '#2D5A7B', '#2D7B4F', '#7B6B2D', '#5A2D7B', '#7B2D5A']
  return colors[id % colors.length]
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const schedStatusClass = (s) => ({
  Scheduled: 'badge-pending', Completed: 'badge-active', Cancelled: 'badge-inactive'
}[s] || '')

const showToast = (message, type = 'success') => {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

onMounted(async () => {
  await Promise.all([fetchBranches(), fetchEmployees(), fetchAvailability(), fetchSchedules()])
  isLoading.value = false
})
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

.tab-bar { display: flex; gap: .25rem; border-bottom: 2px solid var(--border); }
.tab-btn {
  background: none; border: none; padding: .6rem 1rem; font-size: .84rem;
  font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: color .15s, border-color .15s;
  display: flex; align-items: center; gap: .4rem; cursor: pointer;
}
.tab-btn:hover  { color: var(--brand-primary); }
.tab-btn.active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); }
.tab-badge {
  background: var(--brand-primary); color: #fff;
  font-size: .65rem; padding: .1rem .4rem; border-radius: 999px; font-weight: 700;
  min-width: 18px; text-align: center;
}

.section-title { font-size: .9rem; font-weight: 700; color: var(--text-main); }

.avail-list { display: flex; flex-direction: column; gap: .75rem; }
.avail-row {
  background: #fff; border-radius: 10px; padding: 1rem 1.25rem;
  border: 1px solid var(--border); box-shadow: var(--shadow);
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
}
.avail-row:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.avail-left  { display: flex; align-items: center; gap: .85rem; }
.avail-right { display: flex; align-items: center; gap: .5rem; flex-shrink: 0; }
.avail-name  { font-size: .9rem; font-weight: 700; color: var(--text-main); }
.avail-role  { font-size: .75rem; color: var(--text-muted); font-weight: 400; margin-left: .35rem; }
.avail-meta  { font-size: .78rem; color: var(--text-muted); margin-top: .2rem; }
.avail-notes { font-size: .76rem; color: #888; margin-top: .15rem; font-style: italic; }

.badge-status {
  display: inline-block; font-size: .68rem; font-weight: 700;
  padding: .2rem .55rem; border-radius: 999px; text-transform: lowercase;
}
.badge-active   { background: #d4edda; color: #155724; }
.badge-pending  { background: #fff3cd; color: #856404; }
.badge-inactive { background: #f8d7da; color: #721c24; }

.btn-action {
  border: none; border-radius: 6px; padding: .3rem .7rem;
  font-size: .78rem; font-weight: 600; cursor: pointer;
}
.btn-action.approve { background: #28a745; color: #fff; }
.btn-action.reject  { background: #dc3545; color: #fff; }

.table-wrap { background: #fff; border-radius: 10px; border: 1px solid var(--border); box-shadow: var(--shadow); overflow: hidden; }
.sched-table { width: 100%; border-collapse: collapse; }
.sched-table thead tr { background: #f9f5f3; }
.sched-table th {
  padding: .75rem 1rem; text-align: left; font-size: .75rem;
  font-weight: 700; color: var(--text-muted); text-transform: uppercase;
  letter-spacing: .04em; border-bottom: 1px solid var(--border);
}
.sched-table td { padding: .75rem 1rem; font-size: .83rem; color: var(--text-main); border-bottom: 1px solid #f0ebe8; }
.sched-table tr:last-child td { border-bottom: none; }
.sched-table tbody tr:hover { background: #faf7f5; }
.td-emp { display: flex; align-items: center; gap: .6rem; }

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

.btn-primary-brand {
  background: var(--brand-primary); color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
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
  border-radius: 5px; color: var(--text-muted); font-size: .9rem; cursor: pointer;
}
.icon-btn:hover        { background: #f0e8e6; color: var(--brand-primary); }
.icon-btn.danger:hover { background: #fde8e8; color: #c0392b; }

.filter-bar { background: #fff; border-radius: 10px; padding: .75rem 1rem; box-shadow: var(--shadow); border: 1px solid var(--border); }
.fc-brand { font-size: .84rem; border-color: var(--border); border-radius: 6px; }
.fc-brand:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 2px rgba(123,29,29,.15); }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center; z-index: 1050; padding: 1rem;
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
.modal-sub { font-size: .78rem; color: var(--text-muted); }
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

.toast-wrap {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 2000;
  background: #1a1a1a; color: #fff; padding: .75rem 1.2rem;
  border-radius: 8px; font-size: .84rem; display: flex; align-items: center; gap: .5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,.25); animation: fadeIn .2s ease;
}
.toast-wrap.success { border-left: 4px solid #28a745; }
.toast-wrap.error   { border-left: 4px solid #dc3545; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>