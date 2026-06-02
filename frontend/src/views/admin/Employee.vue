<template>
  <div class="employee-page">
    <!-- ── PAGE HEADER ─────────────────────────────────────── -->
    <div class="d-flex align-items-start justify-content-between mb-4">
      <div>
        <h4 class="page-title mb-1">Employee Management</h4>
        <p class="page-sub mb-0">
          Manage hourly employees and availability ·
          {{ employees.length }} total employees across all branches
        </p>
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
          <div class="stat-info">
            <h3>{{ stat.label }}</h3>
            <p class="stat-value">{{ stat.value }}</p>
            <span class="stat-trend">{{ stat.sub }}</span>
          </div>
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
      </select>
      <select v-model="filterBranch" class="form-select filter-select" :class="{ 'is-invalid': branchLoadError }">
        <option value="">{{ branchLoadError ? 'Error loading branches' : 'All Branches' }}</option>
        <option v-for="b in branches" :key="b.id" :value="b.id">
          {{ b.name }}
        </option>
      </select>
      <button v-if="branchLoadError" class="btn btn-outline-danger btn-sm" @click="fetchBranches" title="Retry loading branches" type="button">
        <i class="bi bi-arrow-clockwise"></i> Retry
      </button>
      <button class="btn btn-outline-secondary btn-sm" @click="clearFilters">
        Clear Filters
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-secondary" role="status"></div>
      <p class="mt-2 text-muted">Loading employees...</p>
    </div>

    <!-- ── EMPLOYEE CARDS GRID ─────────────────────────────── -->
    <div v-else-if="filteredEmployees.length" class="row g-3">
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
              <span class="badge-status" :class="statusClass(emp.status)">{{
                emp.status
              }}</span>
            </div>
            <div class="emp-actions ms-auto">
              <button class="icon-btn" title="Edit" @click="openEditModal(emp)">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button
                class="icon-btn danger"
                title="Archive"
                @click="confirmDelete(emp)"
              >
                <i class="bi bi-archive"></i>
              </button>
            </div>
          </div>
          <div class="emp-details">
            <div class="detail-row">
              <i class="bi bi-envelope"></i> {{ emp.email || "—" }}
            </div>
            <div class="detail-row">
              <i class="bi bi-telephone"></i> {{ emp.phone || "—" }}
            </div>
            <div class="detail-row">
              <i class="bi bi-geo-alt"></i> {{ emp.address || "—" }}
            </div>
            <div class="detail-row">
              <i class="bi bi-currency-dollar"></i> ₱{{ emp.hourlyRate }}/hour ·
              {{ emp.position }}
            </div>
            <div class="detail-row">
              <i class="bi bi-person-badge"></i> Role:
              <span
                class="role-pill"
                :class="
                  employeeRole(emp.position) === 'Manager'
                    ? 'role-manager'
                    : 'role-staff'
                "
                >{{ employeeRole(emp.position) }}</span
              >
            </div>
            <div class="detail-row">
              <i class="bi bi-calendar3"></i> Hired:
              {{ formatDate(emp.dateHired) }}
            </div>
            <div class="detail-row">
              <i class="bi bi-building"></i> {{ branchName(emp.branchId) }}
            </div>
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
              <h5 class="mb-0">
                {{ isEditing ? "Edit Employee" : "Add New Employee" }}
              </h5>
              <p class="modal-sub mb-0">
                {{
                  isEditing
                    ? "Update employee information"
                    : "Add a new hourly employee to the system"
                }}
              </p>
            </div>
            <button class="btn-close-panel" @click="closeModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="modal-panel-body">
            <div class="row g-3">
              <div class="col-12 col-md-7">
                <label class="form-label-sm">Full Name</label>
                <div class="input-group">
                  <input
                    v-model="form.firstName"
                    type="text"
                    class="form-control fc-brand"
                    placeholder="First name"
                  />
                  <span class="input-group-text">↕</span>
                  <input
                    v-model="form.lastName"
                    type="text"
                    class="form-control fc-brand"
                    placeholder="Last name"
                  />
                </div>
                <div v-if="errors.name" class="text-danger small mt-1">
                  {{ errors.name }}
                </div>
              </div>

              <div class="col-12 col-md-5">
                <label class="form-label-sm">Position</label>
                <select v-model="form.position" class="form-select fc-brand">
                  <option value="" disabled>Select position</option>
                  <option v-for="p in positions" :key="p" :value="p">
                    {{ p }}
                  </option>
                </select>
                <div v-if="errors.position" class="text-danger small mt-1">
                  {{ errors.position }}
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-sm">Department</label>
                <select v-model="form.department" class="form-select fc-brand">
                  <option value="" disabled>Select department</option>
                  <option v-for="d in departments" :key="d" :value="d">
                    {{ d }}
                  </option>
                </select>
                <div v-if="errors.department" class="text-danger small mt-1">
                  {{ errors.department }}
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-sm">Branch</label>
                <div class="d-flex gap-1">
                  <select v-model="form.branchId" class="form-select fc-brand" :class="{ 'is-invalid': branchLoadError }">
                    <option value="" disabled>{{ branchLoadError ? 'Error loading branches' : 'Select branch' }}</option>
                    <option v-for="b in branches" :key="b.id" :value="b.id">
                      {{ b.name }}
                    </option>
                  </select>
                  <button v-if="branchLoadError" class="btn btn-outline-danger btn-sm" @click="fetchBranches" type="button" title="Retry loading branches">
                    <i class="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
                <div v-if="errors.branch" class="text-danger small mt-1">
                  {{ errors.branch }}
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-sm">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  class="form-control fc-brand"
                  placeholder="employee@silingancoffee.ph"
                />
                <div v-if="errors.email" class="text-danger small mt-1">
                  {{ errors.email }}
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-sm">Phone</label>
                <input
                  v-model="form.phone"
                  type="text"
                  class="form-control fc-brand"
                  placeholder="+63 917 XXX XXXX"
                />
                <div v-if="errors.phone" class="text-danger small mt-1">
                  {{ errors.phone }}
                </div>
              </div>

              <div class="col-12">
                <label class="form-label-sm">Address</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="form-control fc-brand"
                  placeholder="City, Province"
                />
              </div>

              <div class="col-6">
                <label class="form-label-sm">Hourly Rate (₱)</label>
                <input
                  v-model.number="form.hourlyRate"
                  type="number"
                  class="form-control fc-brand"
                  placeholder="76"
                  min="0"
                />
                <div v-if="errors.hourlyRate" class="text-danger small mt-1">
                  {{ errors.hourlyRate }}
                </div>
                <!-- Soft warning: below minimum wage floor -->
                <div
                  v-if="!errors.hourlyRate && form.hourlyRate > 0 && form.hourlyRate < 71"
                  class="text-warning small mt-1"
                >
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  Below minimum wage (₱71/hr). Confirm this is intentional.
                </div>
              </div>

              <div class="col-6">
                <label class="form-label-sm">Hire Date</label>
                <input
                  v-model="form.dateHired"
                  type="date"
                  class="form-control fc-brand"
                  :max="todayISO"
                />
                <div v-if="errors.dateHired" class="text-danger small mt-1">
                  {{ errors.dateHired }}
                </div>
              </div>

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
            <button
              class="btn btn-brown"
              @click="saveEmployee"
              :disabled="saving"
            >
              <span
                v-if="saving"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              {{ isEditing ? "Save Changes" : "Add Employee" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── ARCHIVE CONFIRM ──────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="modal-overlay"
        @click.self="showDeleteConfirm = false"
      >
        <div class="modal-panel modal-panel--sm">
          <div class="modal-panel-header">
            <h5 class="mb-0">Archive Employee?</h5>
            <button class="btn-close-panel" @click="showDeleteConfirm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p class="mb-0">
              This will archive
              <strong>{{ deleteTarget?.firstName }} {{ deleteTarget?.lastName }}</strong>.
              They will no longer appear in the system but their records will be preserved.
            </p>
          </div>
          <div class="modal-panel-footer modal-panel-footer--start">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">
              Cancel
            </button>
            <button class="btn btn-delete-brand" @click="deleteEmployee" :disabled="archiving">
              <span v-if="archiving" class="spinner-border spinner-border-sm me-1"></span>
              Archive Employee
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
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "@/supabase.js";

const route = useRoute();

const isLoading = ref(true);
const search = ref("");
const filterDept = ref("");
const filterStatus = ref("");
const filterBranch = ref("");
const showModal = ref(false);
const showDeleteConfirm = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const archiving = ref(false);
const deleteTarget = ref(null);
const toast = ref({ show: false, message: "", type: "success" });
const errors = ref({});
const employees = ref([]);

const branches = ref([]);
const branchLoadError = ref(false);
const departments = ["Kitchen", "Service", "Management", "Maintenance"];
const positions = [
  "Store Manager",
  "Barista",
  "Cashier",
  "Kitchen Staff",
  "Cleaning Staff",
  "Supervisor",
  "Delivery Staff",
  "Server",
];

const emptyForm = () => ({
  id: null,
  firstName: "",
  lastName: "",
  position: "",
  department: "",
  branchId: "",
  email: "",
  phone: "",
  address: "",
  hourlyRate: "",
  dateHired: "",
  status: "Active",
});

const form = ref(emptyForm());

// Fetch branches from Supabase
const fetchBranches = async () => {
  branchLoadError.value = false;
  try {
    const { data, error } = await supabase.from("branch").select("BranchId, BranchName");
    if (error) throw error;
    if (data) {
      branches.value = data.map((b) => ({
        id: String(b.BranchId),
        name: b.BranchName,
      }));
    }
  } catch (err) {
    console.error("[Employee] Failed to load branches:", err);
    branchLoadError.value = true;
    showToast(`Failed to load branches: ${err.message || err}`, "error");
  }
};

// Fetch employees from Supabase
const fetchEmployees = async () => {
  isLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("employee")
      .select(
        "EmployeeId, FirstName, LastName, Email, Phone, Position, Department, HourlyRate, Address, ContactInfo, DateHired, BranchAssigned, Status",
      )
      .neq("Status", "Archived")
      .order("EmployeeId", { ascending: true });

    if (error) throw error;

    if (data) {
      employees.value = data.map((e) => ({
        id: e.EmployeeId,
        firstName: e.FirstName,
        lastName: e.LastName,
        email: e.Email,
        phone: e.Phone,
        position: e.Position,
        department: e.Department,
        hourlyRate: e.HourlyRate,
        address: e.Address,
        dateHired: e.DateHired,
        branchId: String(e.BranchAssigned),
        status: e.Status,
      }));
    }
  } catch (err) {
    console.error("[Employee] Failed to fetch employees:", err);
    showToast(`Failed to load employees: ${err.message || err}`, "error");
  } finally {
    isLoading.value = false;
  }
};

const filteredEmployees = computed(() => {
  return employees.value.filter((e) => {
    const q = search.value.toLowerCase();
    const matchSearch =
      !q ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q);
    const matchDept = !filterDept.value || e.department === filterDept.value;
    const matchStatus = !filterStatus.value || e.status === filterStatus.value;
    const matchBranch =
      !filterBranch.value || e.branchId === filterBranch.value;
    return matchSearch && matchDept && matchStatus && matchBranch;
  });
});

const stats = computed(() => {
  const active = employees.value.filter((e) => e.status === "Active").length;
  const managers = employees.value.filter(
    (e) => e.position === "Store Manager",
  ).length;
  return [
    {
      label: "Total Employees",
      value: employees.value.length,
      sub: "All branches",
      icon: "bi bi-people",
    },
    {
      label: "Active",
      value: active,
      sub: "Currently working",
      icon: "bi bi-person-check",
    },
    {
      label: "Part-Time",
      value: employees.value.filter((e) => e.hourlyRate < 80).length,
      sub: "Hourly workers",
      icon: "bi bi-clock",
    },
    {
      label: "Store Managers",
      value: managers,
      sub: "One per branch",
      icon: "bi bi-person-badge",
    },
  ];
});

const openAddModal = () => {
  form.value = emptyForm();
  errors.value = {};
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (emp) => {
  form.value = { ...emp };
  errors.value = {};
  isEditing.value = true;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

// Today's date in YYYY-MM-DD for the hire date max attribute
const todayISO = new Date().toISOString().split("T")[0];

const validate = () => {
  const e = {};

  // Name
  if (!form.value.firstName.trim() || !form.value.lastName.trim())
    e.name = "Full name is required.";

  // Position & department
  if (!form.value.position) e.position = "Position is required.";
  if (!form.value.department) e.department = "Department is required.";
  if (!form.value.branchId) e.branch = "Branch is required.";

  // Email
  if (!form.value.email || !/\S+@\S+\.\S+/.test(form.value.email))
    e.email = "Valid email is required.";

  // VAL-1: Phone — optional but must be valid PH format if provided
  if (form.value.phone && !/^(\+63|0)\d{9,10}$/.test(form.value.phone.replace(/\s|-/g, "")))
    e.phone = "Enter a valid PH number (e.g. +63 917 123 4567 or 0917 123 4567).";

  // Hourly rate — must be > 0 (warning for <71 is shown inline, not a hard block)
  if (!form.value.hourlyRate || form.value.hourlyRate <= 0)
    e.hourlyRate = "Hourly rate must be greater than 0.";

  // VAL-2: Hire date — required and must not be in the future
  if (!form.value.dateHired) {
    e.dateHired = "Hire date is required.";
  } else if (form.value.dateHired > todayISO) {
    e.dateHired = "Hire date cannot be in the future.";
  }

  errors.value = e;
  return Object.keys(e).length === 0;
};

const saveEmployee = async () => {
  if (!validate()) return;
  saving.value = true;

  const payload = {
    FirstName: form.value.firstName,
    LastName: form.value.lastName,
    Email: form.value.email,
    Phone: form.value.phone,
    Position: form.value.position,
    Department: form.value.department,
    HourlyRate: form.value.hourlyRate,
    Address: form.value.address,
    ContactInfo: form.value.phone || "—",
    DateHired: form.value.dateHired,
    BranchAssigned: form.value.branchId,
    Status: form.value.status,
  };

  try {
    if (isEditing.value) {
      const { error } = await supabase
        .from("employee")
        .update(payload)
        .eq("EmployeeId", form.value.id);

      if (error) {
        throw new Error(`Failed to update employee details: ${error.message}`);
      }

      // Update corresponding user record if branch changed
      const originalEmployee = employees.value.find(
        (e) => e.id === form.value.id,
      );
      if (
        originalEmployee &&
        originalEmployee.branchId !== form.value.branchId
      ) {
        const generatedUsername =
          `${form.value.firstName.toLowerCase()}.${form.value.lastName.toLowerCase()}`.replace(
            /\s+/g,
            "",
          );
        const { data: userRecord, error: userSelectError } = await supabase
          .from("users")
          .select("id")
          .eq("username", generatedUsername)
          .maybeSingle();

        if (userSelectError) {
          throw new Error(`Failed to find linked user: ${userSelectError.message}`);
        }

        if (userRecord) {
          const { error: userUpdateError } = await supabase
            .from("users")
            .update({ branch: form.value.branchId })
            .eq("id", userRecord.id);

          if (userUpdateError) {
            throw new Error(`Employee updated, but user branch update failed: ${userUpdateError.message}`);
          }
        }
      }
      showToast("Employee updated successfully.", "success");
      await fetchEmployees();
      closeModal();
    } else {
      // Step 0: Pre-check duplicate username to avoid silent collision (ERR-4)
      const generatedUsername =
        `${form.value.firstName.toLowerCase()}.${form.value.lastName.toLowerCase()}`.replace(
          /\s+/g,
          "",
        );

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", generatedUsername)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check username availability: ${checkError.message}`);
      }
      if (existingUser) {
        throw new Error(`An account with the username "${generatedUsername}" already exists.`);
      }

      // Step 1: Insert employee first to get the EmployeeId back
      const { data: empData, error: empError } = await supabase
        .from("employee")
        .insert([payload])
        .select("EmployeeId")
        .single();

      if (empError || !empData) {
        throw new Error(`Failed to add employee: ${empError?.message || "No data returned"}`);
      }

      const newEmployeeId = empData.EmployeeId;

      // Determine role based on position
      const roleMap = {
        "Store Manager": "manager",
        Supervisor: "manager",
      };
      const userRole = roleMap[form.value.position] || "staff";

      // Fixed default passwords per role (pre-hashed SHA-256)
      const rolePasswordMap = {
        admin:
          "bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24", // Admin@1234
        manager:
          "dd255c2053c4dfb3fa704699ab45ee3feb592b8988484a90a04c224b8350bf55", // Manager@1234
        staff:
          "6910cceb81feaf028f8cead7f8347aba32227a459811908f758ac38ae157144e", // Staff@1234
      };
      const hashedPassword = rolePasswordMap[userRole];

      const userPayload = {
        username: generatedUsername,
        password: hashedPassword,
        role: userRole,
        branch: form.value.branchId,
        last_active: new Date().toISOString(),
        employee_id: newEmployeeId,
      };

      // Step 2: Create user account linked to the new employee
      const { error: userError } = await supabase
        .from("users")
        .insert([userPayload]);

      if (userError) {
        // Rollback: delete the created employee record since user account creation failed (ERR-3)
        console.error("[Employee] User creation failed, rolling back employee insert...");
        const { error: rollbackError } = await supabase
          .from("employee")
          .delete()
          .eq("EmployeeId", newEmployeeId);

        if (rollbackError) {
          console.error("[Employee] Rollback failed! Orphan employee record left:", newEmployeeId, rollbackError);
        }

        throw new Error(`Employee record created, but user account creation failed: ${userError.message}. Changes rolled back.`);
      }

      const roleDefaultPlaintext = {
        admin: "Admin@1234",
        manager: "Manager@1234",
        staff: "Staff@1234",
      };
      showToast(
        `Employee added. Login: ${generatedUsername} / Default password: ${roleDefaultPlaintext[userRole]}`,
        "success",
      );
      await fetchEmployees();
      closeModal();
    }
  } catch (err) {
    console.error("[Employee] Save failed:", err);
    showToast(err.message || "An unexpected error occurred while saving.", "error");
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (emp) => {
  deleteTarget.value = emp;
  showDeleteConfirm.value = true;
};

const deleteEmployee = async () => {
  archiving.value = true;
  try {
    const currentUser = localStorage.getItem("username") || "Unknown";
    const now = new Date().toISOString();

    // Archive employee record (soft-delete)
    const { error } = await supabase
      .from("employee")
      .update({ Status: "Archived", ArchivedAt: now, ArchivedBy: currentUser })
      .eq("EmployeeId", deleteTarget.value.id);

    if (error) {
      showToast(`Failed to archive employee: ${error.message}`, "error");
      return;
    }

    // Archive linked user account
    const { error: userError } = await supabase
      .from("users")
      .update({ status: "archived" })
      .eq("employee_id", deleteTarget.value.id);

    if (userError) {
      // Employee was archived but user account failed — log and warn
      console.error("[Employee] Failed to archive linked user:", userError.message);
      showToast("Employee archived, but user account deactivation failed.", "error");
    } else {
      showToast(
        `${deleteTarget.value.firstName} ${deleteTarget.value.lastName} has been archived.`,
        "success"
      );
    }

    await fetchEmployees();
    showDeleteConfirm.value = false;
  } catch (err) {
    console.error("[Employee] Unexpected archive error:", err);
    showToast("An unexpected error occurred. Please try again.", "error");
  } finally {
    archiving.value = false;
  }
};

const clearFilters = () => {
  search.value = "";
  filterDept.value = "";
  filterStatus.value = "";
  filterBranch.value = "";
};

const branchName = (id) => branches.value.find((b) => b.id === id)?.name || "—";

const employeeRole = (position) => {
  const managerRoles = ["Store Manager", "Supervisor"];
  return managerRoles.includes(position) ? "Manager" : "Staff";
};

const initials = (emp) => {
  const f = emp.firstName?.[0] || "";
  const l = emp.lastName?.[0] || "";
  return `${f}${l}`.toUpperCase();
};

const avatarColor = (emp) => {
  const colors = [
    "#7B2D2D",
    "#2D5A7B",
    "#2D7B4F",
    "#7B6B2D",
    "#5A2D7B",
    "#7B2D5A",
  ];
  return colors[emp.id % colors.length];
};

const statusClass = (status) =>
  ({
    Active: "badge-active",
    "On Leave": "badge-leave",
    Inactive: "badge-inactive",
    Archived: "badge-archived",
  })[status] || "";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const showToast = (message, type = "success") => {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
};

onMounted(async () => {
  await fetchBranches();
  await fetchEmployees();
  const editId = route.query.edit;
  if (editId) {
    // FIX: use mapped 'id' field, not raw DB column 'EmployeeId'
    const emp = employees.value.find((e) => String(e.id) === editId);
    if (emp) openEditModal(emp);
  }
});
</script>

<style scoped>
:root {
  --brand-primary: #7b1d1d;
  --brand-dark: #2c1810;
  --brand-hover: #9b2d2d;
  --brand-light: #f9f4f2;
  --text-main: #1a1a1a;
  --text-muted: #6b6b6b;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}

.emp-name {
  text-transform: capitalize;
}

.employee-page {
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

.btn-brown {
  background: #5d4037;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.18s;
}
.btn-brown:hover:not(:disabled) {
  background: #4e342e;
}
.btn-brown:disabled {
  opacity: 0.65;
}

.btn-delete-brand {
  background: #c0392b;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.btn-delete-brand:hover {
  background: #5d4037;
  color: #fff;
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
  color: #7b1d1d;
  font-size: 28px;
  flex-shrink: 0;
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
.stat-trend {
  font-size: 11px;
  color: #adb5bd;
}

.filter-bar {
  background: #fff;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.search-wrap {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  font-size: 0.85rem;
}
.search-input {
  padding-left: 2rem;
  width: 220px;
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
}
.search-input:focus {
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 2px rgba(123, 29, 29, 0.15);
}
.filter-select {
  width: 160px;
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
}

.emp-card {
  background: #fff;
  border-radius: 12px;
  padding: 1rem 1.15rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  position: relative;
}
.emp-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.11);
  transform: translateY(-2px);
}
.emp-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.emp-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.emp-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}
.emp-position {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}

.badge-status {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  margin-top: 0.25rem;
}
.badge-active {
  background: #d4edda;
  color: #155724;
}
.badge-leave {
  background: #fff3cd;
  color: #856404;
}
.badge-inactive {
  background: #f8d7da;
  color: #721c24;
}
.badge-archived {
  background: #e2e3e5;
  color: #495057;
}

.icon-btn {
  background: none;
  border: none;
  padding: 0.25rem 0.35rem;
  border-radius: 5px;
  color: var(--text-muted);
  font-size: 0.9rem;
  transition:
    color 0.15s,
    background 0.15s;
}
.icon-btn:hover {
  background: #f0e8e6;
  color: var(--brand-primary);
}
.icon-btn.danger:hover {
  background: #fde8e8;
  color: #c0392b;
}

.emp-details {
  font-size: 0.78rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.detail-row i {
  color: var(--brand-primary);
  font-size: 0.78rem;
  flex-shrink: 0;
}

.emp-dept-badge {
  display: inline-block;
  margin-top: 0.75rem;
  background: #f5ede8;
  color: var(--brand-primary);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.role-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}
.role-manager {
  background: #e8d5f5;
  color: #6b2d7b;
}
.role-staff {
  background: #d5e8f5;
  color: #2d5a7b;
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
  max-width: 640px;
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
.btn-close-panel {
  background: none;
  border: none;
  font-size: 0.9rem;
  color: var(--text-muted);
  padding: 0.25rem;
  border-radius: 5px;
  transition: color 0.15s;
}
.btn-close-panel:hover {
  color: var(--text-main);
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
.modal-panel-footer--start {
  justify-content: flex-start;
}
.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.25rem;
  display: block;
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
</style>