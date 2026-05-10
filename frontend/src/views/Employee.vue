<template>
  <div class="employee-page">

    <!-- ── PAGE HEADER ─────────────────────────────────────── -->
    <div class="d-flex align-items-start justify-content-between mb-4">
      <div>
        <h4 class="page-title mb-1">Employee Management</h4>
        <p class="page-sub mb-0">Manage hourly employees and availability · {{ employees.length }} total employees across all branches</p>
      </div>
      <button class="btn btn-brown" @click="openAddModal">
        <i class="bi bi-plus-lg me-1"></i> Add Employee
      </button>
    </div>

    <!-- ── STATS CARDS ─────────────────────────────────────── -->
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3" v-for="stat in stats" :key="stat.label">
        <div class="stat-card">
          <div class="stat-icon"><i :class="stat.icon"></i></div>
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-sub">{{ stat.sub }}</div>
        </div>
      </div>
    </div>

    <!-- ── FILTERS ─────────────────────────────────────────── -->
    <div class="filter-bar d-flex flex-wrap gap-2 align-items-center mb-4">
      <div class="search-wrap">
        <i class="bi bi-search search-icon"></i>
        <input
          v-model="search"
          type="text"
          class="form-control search-input"
          placeholder="Search employees..."
        />
      </div>
      <select v-model="filterDept" class="form-select filter-select">
        <option value="">All Departments</option>
        <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
      </select>
      <select v-model="filterStatus" class="form-select filter-select">
        <option value="">All Statuses</option>
        <option value="Active">Active</option>
        <option value="On Leave">On Leave</option>
        <option value="Inactive">Inactive</option>
        <option value="Archived">Archived</option>
      </select>
      <select v-model="filterBranch" class="form-select filter-select">
        <option value="">All Branches</option>
        <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>
      <button class="btn btn-outline-secondary btn-sm" @click="clearFilters">Clear Filters</button>
    </div>

    <!-- ── EMPLOYEE CARDS GRID ─────────────────────────────── -->
    <div v-if="filteredEmployees.length" class="row g-3">
      <div
        class="col-12 col-md-6 col-lg-4"
        v-for="emp in filteredEmployees"
        :key="emp.id"
      >
        <div class="emp-card">
          <div class="emp-card-header">
            <div class="emp-avatar" :style="{ background: avatarColor(emp) }">
              {{ initials(emp) }}
            </div>
            <div class="emp-info">
              <div class="emp-name">{{ emp.firstName }} {{ emp.lastName }}</div>
              <div class="emp-position">{{ emp.position }}</div>
              <span class="badge-status" :class="statusClass(emp.status)">{{ emp.status }}</span>
            </div>
            <div class="emp-actions ms-auto">
              <button class="icon-btn" title="Edit" @click="openEditModal(emp)">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="icon-btn danger" title="Delete" @click="confirmDelete(emp)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
          <div class="emp-details">
            <div class="detail-row"><i class="bi bi-envelope"></i> {{ emp.email }}</div>
            <div class="detail-row"><i class="bi bi-telephone"></i> {{ emp.phone }}</div>
            <div class="detail-row"><i class="bi bi-geo-alt"></i> {{ emp.address }}</div>
            <div class="detail-row"><i class="bi bi-currency-dollar"></i> ₱{{ emp.hourlyRate }}/hour · {{ emp.position }}</div>
            <div class="detail-row"><i class="bi bi-calendar3"></i> Hired: {{ formatDate(emp.dateHired) }}</div>
          </div>
          <div class="emp-dept-badge">{{ emp.department }}</div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state text-center py-5">
      <i class="bi bi-people fs-1 text-muted"></i>
      <p class="mt-3 text-muted">No employees match your filters.</p>
    </div>

    <!-- ── ADD / EDIT MODAL ────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-panel">
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">{{ isEditing ? 'Edit Employee' : 'Add New Employee' }}</h5>
              <p class="modal-sub mb-0">{{ isEditing ? 'Update employee information' : 'Add a new hourly employee to the system' }}</p>
            </div>
            <button class="btn-close-panel" @click="closeModal"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="modal-panel-body">
            <div class="row g-3">
              <!-- Full Name -->
              <div class="col-12 col-md-7">
                <label class="form-label-sm">Full Name</label>
                <div class="input-group">
                  <input v-model="form.firstName" type="text" class="form-control fc-brand" placeholder="First name" />
                  <span class="input-group-text">↕</span>
                  <input v-model="form.lastName" type="text" class="form-control fc-brand" placeholder="Last name" />
                </div>
                <div v-if="errors.name" class="text-danger small mt-1">{{ errors.name }}</div>
              </div>

              <!-- Position -->
              <div class="col-12 col-md-5">
                <label class="form-label-sm">Position</label>
                <select v-model="form.position" class="form-select fc-brand">
                  <option value="" disabled>Select position</option>
                  <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
                </select>
                <div v-if="errors.position" class="text-danger small mt-1">{{ errors.position }}</div>
              </div>

              <!-- Department -->
              <div class="col-6">
                <label class="form-label-sm">Department</label>
                <select v-model="form.department" class="form-select fc-brand">
                  <option value="" disabled>Select department</option>
                  <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
                </select>
                <div v-if="errors.department" class="text-danger small mt-1">{{ errors.department }}</div>
              </div>

              <!-- Branch -->
              <div class="col-6">
                <label class="form-label-sm">Branch</label>
                <select v-model="form.branchId" class="form-select fc-brand">
                  <option value="" disabled>Select branch</option>
                  <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
                </select>
                <div v-if="errors.branch" class="text-danger small mt-1">{{ errors.branch }}</div>
              </div>

              <!-- Email -->
              <div class="col-6">
                <label class="form-label-sm">Email</label>
                <input v-model="form.email" type="email" class="form-control fc-brand" placeholder="employee@silingancoffee.ph" />
                <div v-if="errors.email" class="text-danger small mt-1">{{ errors.email }}</div>
              </div>

              <!-- Phone -->
              <div class="col-6">
                <label class="form-label-sm">Phone</label>
                <input v-model="form.phone" type="text" class="form-control fc-brand" placeholder="+63 917 XXX XXXX" />
              </div>

              <!-- Address -->
              <div class="col-12">
                <label class="form-label-sm">Address</label>
                <input v-model="form.address" type="text" class="form-control fc-brand" placeholder="City, Province" />
              </div>

              <!-- Hourly Rate -->
              <div class="col-6">
                <label class="form-label-sm">Hourly Rate (₱)</label>
                <input v-model.number="form.hourlyRate" type="number" class="form-control fc-brand" placeholder="76" min="0" />
                <div v-if="errors.hourlyRate" class="text-danger small mt-1">{{ errors.hourlyRate }}</div>
              </div>

              <!-- Hire Date -->
              <div class="col-6">
                <label class="form-label-sm">Hire Date</label>
                <input v-model="form.dateHired" type="date" class="form-control fc-brand" />
                <div v-if="errors.dateHired" class="text-danger small mt-1">{{ errors.dateHired }}</div>
              </div>

              <!-- Status (edit only) -->
              <div v-if="isEditing" class="col-6">
                <label class="form-label-sm">Status</label>
                <select v-model="form.status" class="form-select fc-brand">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="closeModal">Cancel</button>
            <button class="btn btn-brown" @click="saveEmployee" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ isEditing ? 'Save Changes' : 'Add Employee' }}
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
            <h5 class="mb-0">Are you sure?</h5>
            <button class="btn-close-panel" @click="showDeleteConfirm = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-panel-body">
            <p class="mb-0">This will permanently delete this employee from the system. This action cannot be undone</p>
          </div>
          <div class="modal-panel-footer modal-panel-footer--start">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">Cancel</button>
            <button class="btn btn-delete-brand" @click="deleteEmployee">Delete</button>
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
  name: 'EmployeeManagement',

  data() {
    return {
      search: '',
      filterDept: '',
      filterStatus: '',
      filterBranch: '',
      showModal: false,
      showDeleteConfirm: false,
      isEditing: false,
      saving: false,
      deleteTarget: null,
      toast: { show: false, message: '', type: 'success' },

      form: this.emptyForm(),

      errors: {},

      branches: [
        { id: 1, name: 'Silingan DLSU' },
        { id: 2, name: 'Silingan Ateneo' },
        { id: 3, name: 'Silingan Batangas' },
        { id: 4, name: 'Silingan Lipa' },
        { id: 5, name: 'Silingan Cubao Expo' },
      ],

      departments: ['Kitchen', 'Service', 'Management', 'Maintenance'],

      positions: [
        'Store Manager', 'Barista', 'Cashier', 'Kitchen Staff',
        'Cleaning Staff', 'Supervisor', 'Delivery Staff', 'Server',
      ],

      // Mock data — replace with API calls (e.g. axios.get('/api/employees'))
      employees: [
        {
          id: 1, firstName: 'Maria', lastName: 'Xie', position: 'Store Manager',
          department: 'Management', email: 'maria.santos@silingancoffee.ph',
          phone: '+63 917 102 1002', address: 'DLSU, Philippines',
          hourlyRate: 150, dateHired: '2020-01-15', status: 'Active', branchId: 1,
        },
        {
          id: 2, firstName: 'Jose', lastName: 'Flores', position: 'Barista',
          department: 'Service', email: 'jose.flores@silingancoffee.ph',
          phone: '+63 917 103 1003', address: 'DLSU, Philippines',
          hourlyRate: 75, dateHired: '2021-03-22', status: 'Active', branchId: 1,
        },
        {
          id: 3, firstName: 'Maria', lastName: 'Rivera', position: 'Cashier',
          department: 'Service', email: 'maria.rivera@silingancoffee.ph',
          phone: '+63 917 104 1004', address: 'DLSU, Philippines',
          hourlyRate: 70, dateHired: '2021-10-01', status: 'Active', branchId: 1,
        },
        {
          id: 4, firstName: 'Antonio', lastName: 'Ramos', position: 'Kitchen Staff',
          department: 'Kitchen', email: 'antonio.ramos@silingancoffee.ph',
          phone: '+63 917 201 3045', address: 'QC, Philippines',
          hourlyRate: 65, dateHired: '2023-08-15', status: 'Active', branchId: 1,
        },
        {
          id: 5, firstName: 'Rosa', lastName: 'Gonzales', position: 'Server',
          department: 'Service', email: 'rosa.gonzales@silingancoffee.ph',
          phone: '+63 917 312 4021', address: 'Manila, Philippines',
          hourlyRate: 68, dateHired: '2023-11-20', status: 'Active', branchId: 2,
        },
        {
          id: 6, firstName: 'Pedro', lastName: 'Fernandez', position: 'Cleaning Staff',
          department: 'Maintenance', email: 'pedro.fernandez@silingancoffee.ph',
          phone: '+63 917 415 5099', address: 'Makati, Philippines',
          hourlyRate: 60, dateHired: '2024-03-01', status: 'Active', branchId: 3,
        },
      ],
    };
  },

  computed: {
    filteredEmployees() {
      return this.employees.filter(e => {
        const q = this.search.toLowerCase();
        const matchSearch = !q ||
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q);
        const matchDept = !this.filterDept || e.department === this.filterDept;
        const matchStatus = !this.filterStatus || e.status === this.filterStatus;
        const matchBranch = !this.filterBranch || e.branchId === this.filterBranch;
        return matchSearch && matchDept && matchStatus && matchBranch;
      });
    },

    stats() {
      const active = this.employees.filter(e => e.status === 'Active').length;
      const managers = this.employees.filter(e => e.position === 'Store Manager').length;
      return [
        { label: 'Total Employees', value: this.employees.length, sub: 'All branches', icon: 'bi bi-people' },
        { label: 'Active', value: active, sub: 'Currently working', icon: 'bi bi-person-check' },
        { label: 'Part-Time', value: this.employees.filter(e => e.hourlyRate < 80).length, sub: 'Hourly workers', icon: 'bi bi-clock' },
        { label: 'Store Managers', value: managers, sub: 'One per branch', icon: 'bi bi-person-badge' },
      ];
    },
  },

  methods: {
    emptyForm() {
      return {
        id: null, firstName: '', lastName: '', position: '', department: '',
        branchId: '', email: '', phone: '', address: '',
        hourlyRate: '', dateHired: '', status: 'Active',
      };
    },

    openAddModal() {
      this.form = this.emptyForm();
      this.errors = {};
      this.isEditing = false;
      this.showModal = true;
    },

    openEditModal(emp) {
      this.form = { ...emp };
      this.errors = {};
      this.isEditing = true;
      this.showModal = true;
    },

    closeModal() {
      this.showModal = false;
    },

    validate() {
      const e = {};
      if (!this.form.firstName.trim() || !this.form.lastName.trim()) e.name = 'Full name is required.';
      if (!this.form.position) e.position = 'Position is required.';
      if (!this.form.department) e.department = 'Department is required.';
      if (!this.form.branchId) e.branch = 'Branch is required.';
      if (!this.form.email || !/\S+@\S+\.\S+/.test(this.form.email)) e.email = 'Valid email is required.';
      if (!this.form.hourlyRate || this.form.hourlyRate <= 0) e.hourlyRate = 'Hourly rate must be greater than 0.';
      if (!this.form.dateHired) e.dateHired = 'Hire date is required.';
      this.errors = e;
      return Object.keys(e).length === 0;
    },

    async saveEmployee() {
      if (!this.validate()) return;
      this.saving = true;

      // Simulate API call — replace with:
      // await axios.post('/api/employees', this.form)  or
      // await axios.put(`/api/employees/${this.form.id}`, this.form)
      await new Promise(r => setTimeout(r, 600));

      if (this.isEditing) {
        const idx = this.employees.findIndex(e => e.id === this.form.id);
        if (idx !== -1) this.employees.splice(idx, 1, { ...this.form });
        this.showToast('Employee updated successfully.', 'success');
      } else {
        this.employees.push({ ...this.form, id: Date.now() });
        this.showToast('Employee added successfully.', 'success');
      }

      this.saving = false;
      this.closeModal();
    },

    confirmDelete(emp) {
      this.deleteTarget = emp;
      this.showDeleteConfirm = true;
    },

    async deleteEmployee() {
      // Replace with: await axios.delete(`/api/employees/${this.deleteTarget.id}`)
      const idx = this.employees.findIndex(e => e.id === this.deleteTarget.id);
      if (idx !== -1) this.employees.splice(idx, 1);
      this.showDeleteConfirm = false;
      this.showToast('Employee deleted.', 'success');
    },

    clearFilters() {
      this.search = '';
      this.filterDept = '';
      this.filterStatus = '';
      this.filterBranch = '';
    },

    initials(emp) {
      return `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
    },

    avatarColor(emp) {
      const colors = ['#7B2D2D', '#2D5A7B', '#2D7B4F', '#7B6B2D', '#5A2D7B', '#7B2D5A'];
      return colors[emp.id % colors.length];
    },

    statusClass(status) {
      return {
        'Active': 'badge-active',
        'On Leave': 'badge-leave',
        'Inactive': 'badge-inactive',
        'Archived': 'badge-archived',
      }[status] || '';
    },

    formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    showToast(message, type = 'success') {
      this.toast = { show: true, message, type };
      setTimeout(() => { this.toast.show = false; }, 3000);
    },
  },
};
</script>

<style scoped>
/* ── BRAND TOKENS ──────────────────────────────────────── */
:root {
  --brand-primary: #7B1D1D;
  --brand-dark: #2C1810;
  --brand-hover: #9B2D2D;
  --brand-light: #f9f4f2;
  --text-main: #1a1a1a;
  --text-muted: #6b6b6b;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0,0,0,.07);
}

/* ── PAGE ─────────────────────────────────────────────── */
.employee-page {
  padding: 1.5rem;
  background: #f4f1ef;
  min-height: 100vh;
}

.page-title { font-size: 1.35rem; font-weight: 700; color: var(--text-main); }
.page-sub   { font-size: .82rem; color: var(--text-muted); }

/* ── BUTTONS ──────────────────────────────────────────── */
.btn-primary-brand {
  background: var(--brand-primary); color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
  transition: background .18s;
}
.btn-primary-brand:hover:not(:disabled) { background: var(--brand-hover); }
.btn-primary-brand:disabled { opacity: .65; }

.btn-brown {
  background: #5D4037; color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
  transition: background .18s;
}
.btn-brown:hover:not(:disabled) { background: #4E342E; }
.btn-brown:disabled { opacity: .65; }

.btn-delete-brand {
  background: #c0392b; color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
  transition: background .18s;
}
.btn-delete-brand:hover { background: #5D4037; color: #fff; }

.btn-danger-brand {
  background: #c0392b; color: #fff; border: none;
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem; font-weight: 600;
}
.btn-danger-brand:hover { background: #a93226; }

.btn-ghost {
  background: transparent; border: 1px solid var(--border); color: var(--text-main);
  padding: .45rem .9rem; border-radius: 6px; font-size: .85rem;
}
.btn-ghost:hover { background: #f0ebe8; }

/* ── STAT CARDS ───────────────────────────────────────── */
.stat-card {
  background: #fff; border-radius: 10px; padding: 1.1rem 1.25rem;
  box-shadow: var(--shadow); border: 1px solid var(--border);
}
.stat-icon { color: var(--brand-primary); font-size: 1.1rem; margin-bottom: .4rem; }
.stat-value { font-size: 1.75rem; font-weight: 800; color: var(--text-main); line-height: 1; }
.stat-label { font-size: .78rem; font-weight: 600; color: var(--text-main); margin-top: .2rem; }
.stat-sub   { font-size: .73rem; color: var(--text-muted); }

/* ── FILTERS ──────────────────────────────────────────── */
.filter-bar { background: #fff; border-radius: 10px; padding: .75rem 1rem; box-shadow: var(--shadow); border: 1px solid var(--border); }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: .7rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: .85rem; }
.search-input { padding-left: 2rem; width: 220px; font-size: .84rem; border-color: var(--border); border-radius: 6px; }
.search-input:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 2px rgba(123,29,29,.15); }
.filter-select { width: 160px; font-size: .84rem; border-color: var(--border); border-radius: 6px; }
.filter-select:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 2px rgba(123,29,29,.15); }

/* ── EMPLOYEE CARDS ───────────────────────────────────── */
.emp-card {
  background: #fff; border-radius: 12px; padding: 1rem 1.15rem 1rem;
  box-shadow: var(--shadow); border: 1px solid var(--border);
  transition: box-shadow .2s, transform .2s;
  position: relative;
}
.emp-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.11); transform: translateY(-2px); }

.emp-card-header { display: flex; align-items: flex-start; gap: .75rem; margin-bottom: .75rem; }

.emp-avatar {
  width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; color: #fff; font-weight: 700; font-size: .9rem; flex-shrink: 0;
}

.emp-name     { font-size: .9rem; font-weight: 700; color: var(--text-main); }
.emp-position { font-size: .78rem; color: var(--text-muted); margin-top: .1rem; }

.badge-status {
  display: inline-block; font-size: .68rem; font-weight: 600;
  padding: .15rem .5rem; border-radius: 999px; margin-top: .25rem;
}
.badge-active   { background: #d4edda; color: #155724; }
.badge-leave    { background: #fff3cd; color: #856404; }
.badge-inactive { background: #f8d7da; color: #721c24; }
.badge-archived { background: #e2e3e5; color: #495057; }

.icon-btn {
  background: none; border: none; padding: .25rem .35rem; border-radius: 5px;
  color: var(--text-muted); font-size: .9rem; transition: color .15s, background .15s;
}
.icon-btn:hover       { background: #f0e8e6; color: var(--brand-primary); }
.icon-btn.danger:hover{ background: #fde8e8; color: #c0392b; }

.emp-details { font-size: .78rem; color: var(--text-muted); display: flex; flex-direction: column; gap: .35rem; }
.detail-row  { display: flex; align-items: center; gap: .4rem; }
.detail-row i{ color: var(--brand-primary); font-size: .78rem; flex-shrink: 0; }

.emp-dept-badge {
  display: inline-block; margin-top: .75rem; background: #f5ede8;
  color: var(--brand-primary); font-size: .7rem; font-weight: 600;
  padding: .2rem .6rem; border-radius: 4px;
}

.empty-state { padding: 3rem 0; }

/* ── MODAL ────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1050; padding: 1rem;
}
.modal-panel {
  background: #fff; border-radius: 14px; width: 100%; max-width: 640px;
  max-height: 90vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,.2);
  animation: slideUp .22s ease;
}
.modal-panel--sm { max-width: 420px; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.modal-panel-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
}
.modal-panel-header h5 { font-size: 1rem; font-weight: 700; }
.modal-sub { font-size: .78rem; color: var(--text-muted); }

.btn-close-panel {
  background: none; border: none; font-size: .9rem; color: var(--text-muted);
  padding: .25rem; border-radius: 5px; transition: color .15s;
}
.btn-close-panel:hover { color: var(--text-main); }

.modal-panel-body   { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; }
.modal-panel-footer {
  display: flex; justify-content: flex-end; gap: .6rem;
  padding: 1rem 1.5rem; border-top: 1px solid var(--border);
}
.modal-panel-footer--start { justify-content: flex-start; }

.form-label-sm { font-size: .78rem; font-weight: 600; color: var(--text-main); margin-bottom: .25rem; display: block; }

.fc-brand { font-size: .84rem; border-color: var(--border); border-radius: 6px; }
.fc-brand:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 2px rgba(123,29,29,.15); }

/* ── TOAST ────────────────────────────────────────────── */
.toast-wrap {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 2000;
  background: #1a1a1a; color: #fff; padding: .75rem 1.2rem;
  border-radius: 8px; font-size: .84rem; display: flex; align-items: center; gap: .5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,.25);
  animation: fadeIn .2s ease;
}
.toast-wrap.success { border-left: 4px solid #28a745; }
.toast-wrap.error   { border-left: 4px solid #dc3545; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
</style>