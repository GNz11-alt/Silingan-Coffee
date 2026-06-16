<template>
  <div class="schedule-page">
    <!-- -- PAGE HEADER --------------------------------------- -->
    <div class="d-flex align-items-start justify-content-between mb-4">
      <div>
        <h4 class="page-title mb-1">Shift Management</h4>
        <p class="page-sub mb-0">Manage staff, availability, and schedules</p>
      </div>
      <div class="d-flex gap-2">
        <button
          class="btn btn-outline-brand"
          @click="openOperatingHours"
        >
          <i class="bi bi-clock me-1"></i> Hours
        </button>
        <button
          class="btn btn-primary-brand"
          @click="openCreateModal"
          :disabled="employeesLoading"
        >
          <i class="bi bi-plus-lg me-1"></i> Create Schedule
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-secondary" role="status"></div>
      <p class="mt-2 text-muted">Loading...</p>
    </div>

    <template v-else>
      <div class="split-layout">
        <!-- ------------------------------------------
             LEFT PANEL
        ------------------------------------------- -->
        <div class="left-panel">
          <!-- Staff mini-tab strip -->
          <div class="left-tab-bar mb-3">
            <button
              v-for="tab in leftTabs"
              :key="tab.key"
              class="left-tab-btn"
              :class="{ active: activeTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
              <span
                v-if="tab.key === 'availability' && pendingCount"
                class="tab-badge"
                >{{ pendingCount }}</span
              >
              <span
                v-if="
                  tab.key === 'change' &&
                  inquiryPendingCount + resetPendingCount
                "
                class="tab-badge"
                >{{ inquiryPendingCount + resetPendingCount }}</span
              >
            </button>
          </div>

          <!-- -- STAFF ------------------------------ -->
          <div v-if="activeTab === 'staff'" class="left-scroll-area">
            <div class="left-section-title mb-2">Staff</div>
            <div class="row g-2 mb-3">
              <div class="col-6" v-for="stat in staffStats" :key="stat.label">
                <div class="mini-stat-card">
                  <div class="mini-stat-icon"><i :class="stat.icon"></i></div>
                  <div>
                    <div class="mini-stat-value">{{ stat.value }}</div>
                    <div class="mini-stat-label">{{ stat.label }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mb-2">
              <div class="search-wrap">
                <i class="bi bi-search search-icon"></i>
                <input
                  v-model="staffSearch"
                  type="text"
                  class="form-control search-input"
                  placeholder="Search staff..."
                />
              </div>
            </div>
            <div class="d-flex gap-1 mb-2 flex-wrap">
              <select
                v-model="staffFilterStatus"
                class="form-select fc-brand"
                style="font-size: 0.76rem"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
              <!-- MANAGER: no "Add" button - view/edit only -->
            </div>
            <div v-if="staffLoading" class="text-center py-3">
              <div
                class="spinner-border spinner-border-sm text-secondary"
              ></div>
            </div>
            <div v-else-if="filteredStaff.length" class="staff-list">
              <div class="emp-row" v-for="emp in filteredStaff" :key="emp.id">
                <div
                  class="emp-avatar-sm"
                  :style="{ background: staffAvatarColor(emp) }"
                >
                  {{ staffInitials(emp) }}
                </div>
                <div class="emp-row-info">
                  <div class="emp-row-name">
                    {{ emp.firstName }} {{ emp.lastName }}
                  </div>
                  <div class="emp-row-pos">
                    <span
                      class="branch-dot"
                      :style="{ background: branchColor(emp.branchAssigned || emp.id) }"
                    ></span>
                    {{ emp.position }} · {{ emp.branchName }}
                  </div>
                </div>
                <span
                  class="badge-status"
                  :class="staffStatusClass(emp.status)"
                  >{{ emp.status }}</span
                >
                <div class="emp-row-actions">
                  <button class="icon-btn" @click="openEditStaffModal(emp)">
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button class="icon-btn" @click="openArchiveStaffModal(emp)">
                    <i class="bi bi-archive"></i>
                  </button>
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-muted text-center py-3"
              style="font-size: 0.82rem"
            >
              No staff found.
            </div>
          </div>

          <!-- -- AVAILABILITY ----------------------- -->
          <div v-if="activeTab === 'availability'" class="left-scroll-area">
            <div class="left-section-title mb-2">Availability Requests</div>
            <div v-if="pendingOrFading.length" class="avail-list">
              <TransitionGroup name="fade-slide">
                <div
                  v-for="avail in pendingOrFading"
                  :key="avail.id"
                  class="avail-card"
                  :class="{ 'is-fading': fadingIds.has(avail.id) }"
                >
                  <div class="avail-card-top">
                    <div
                      class="emp-avatar-sm"
                      :style="{ background: avatarColor(avail.employeeId) }"
                    >
                      {{ avail.initials }}
                    </div>
                    <div class="avail-card-info">
                      <div class="avail-name">
                        {{ avail.employeeName }}
                        <span class="avail-role">{{ avail.role }}</span>
                      </div>
                      <div class="avail-meta">
                        <i class="bi bi-calendar3"></i>
                        {{ formatDate(avail.availableDate) }} &nbsp;<i
                          class="bi bi-clock"
                        ></i>
                        {{ avail.startTime }}–{{ avail.endTime }}
                        <span v-if="avail.branchId" class="ms-1">
                          <span
                            class="branch-dot"
                            :style="{ background: branchColor(avail.branchId) }"
                          ></span>
                          {{ branchName(avail.branchId) }}
                        </span>
                      </div>
                      <div v-if="avail.notes" class="avail-notes">
                        {{ avail.notes }}
                      </div>
                    </div>
                  </div>
                  <div class="avail-card-actions">
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
                        &#10003;
                      </button>
                      <button
                        class="btn-action reject"
                        @click="updateAvailStatus(avail, 'Cancelled')"
                      >
                        &#10007;
                      </button>
                    </template>
                    <span v-else class="badge-status badge-inactive"
                      >rejected</span
                    >
                  </div>
                </div>
              </TransitionGroup>
            </div>
            <div v-else class="empty-left">
              <i class="bi bi-calendar-x"></i>
              <p>No pending requests</p>
            </div>
          </div>

          <!-- -- HISTORY ---------------------------- -->
          <div v-if="activeTab === 'history'" class="left-scroll-area">
            <div class="left-section-title mb-2">Availability History</div>
            <div v-if="resolvedAvail.length" class="avail-list">
              <div
                v-for="avail in resolvedAvail"
                :key="avail.id"
                class="avail-card"
              >
                <div class="avail-card-top">
                  <div
                    class="emp-avatar-sm"
                    :style="{ background: avatarColor(avail.employeeId) }"
                  >
                    {{ avail.initials }}
                  </div>
                  <div class="avail-card-info">
                    <div class="avail-name">
                      {{ avail.employeeName }}
                      <span class="avail-role">{{ avail.role }}</span>
                    </div>
                    <div class="avail-meta">
                      <i class="bi bi-calendar3"></i>
                      {{ formatDate(avail.availableDate) }} &nbsp;<i
                        class="bi bi-clock"
                      ></i>
                      {{ avail.startTime }}–{{ avail.endTime }}
                      <span v-if="avail.branchId" class="ms-1">
                        <span
                          class="branch-dot"
                          :style="{ background: branchColor(avail.branchId) }"
                        ></span>
                        {{ branchName(avail.branchId) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="avail-card-actions">
                  <span
                    v-if="avail.status === 'Confirmed'"
                    class="badge-status badge-active"
                    >approved</span
                  >
                  <span v-else class="badge-status badge-inactive"
                    >rejected</span
                  >
                </div>
              </div>
            </div>
            <div v-else class="empty-left">
              <i class="bi bi-clock-history"></i>
              <p>No history yet</p>
            </div>
          </div>

          <!-- -- CHANGE INQUIRIES ------------------- -->
          <div v-if="activeTab === 'change'" class="left-scroll-area">
            <div class="left-section-title mb-2">Change Inquiries</div>
            <div v-if="changeInquiries.length" class="avail-list">
              <div
                v-for="inq in changeInquiries"
                :key="inq.id"
                class="avail-card"
              >
                <div class="avail-card-top">
                  <div
                    class="emp-avatar-sm"
                    :style="{ background: avatarColor(inq.employeeId) }"
                  >
                    {{ inq.initials }}
                  </div>
                  <div class="avail-card-info">
                    <div class="avail-name">
                      {{ inq.employeeName }}
                      <span class="avail-role">{{ inq.role }}</span>
                    </div>
                    <div class="avail-meta">
                      <strong>{{ inq.requestType }}</strong> ·
                      {{ formatDate(inq.requestDate) }}
                      <span v-if="inq.branchId" class="ms-1">
                        <span class="branch-dot" :style="{ background: branchColor(inq.branchId) }"></span>
                        {{ branchName(inq.branchId) }}
                      </span>
                    </div>
                    <div class="avail-notes">{{ inq.reason }}</div>
                    <div
                      v-if="inq.managerNote"
                      class="avail-notes"
                      style="color: #5d4037"
                    >
                      <strong>Mgr:</strong> {{ inq.managerNote }}
                    </div>
                  </div>
                </div>
                <div class="avail-card-actions">
                  <template v-if="inq.status === 'Pending'">
                    <span class="badge-status badge-pending">pending</span>
                    <button
                      class="btn-action approve"
                      @click="updateInquiryStatus(inq, 'Approved')"
                    >
                      &#10003;
                    </button>
                    <button
                      class="btn-action reject"
                      @click="updateInquiryStatus(inq, 'Denied')"
                    >
                      &#10007;
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
            <div v-else class="empty-left">
              <i class="bi bi-arrow-left-right"></i>
              <p>No inquiries</p>
            </div>

            <!-- Divider -->
            <div class="reset-section-divider">
              <i class="bi bi-key-fill"></i>
              Password Reset Requests
              <span v-if="resetPendingCount" class="tab-badge ms-1">{{
                resetPendingCount
              }}</span>
            </div>

            <!-- Section 2: Password Resets -->
            <div v-if="resetRequests.length" class="avail-list">
              <div
                v-for="req in resetRequests"
                :key="req.id"
                class="avail-card reset-card"
              >
                <div class="avail-card-top">
                  <div
                    class="emp-avatar-sm"
                    :style="{ background: avatarColor(req.employeeId) }"
                  >
                    {{ req.initials }}
                  </div>
                  <div class="avail-card-info">
                    <div class="avail-name">
                      {{ req.username
                      }}<span class="avail-role">{{ req.role }}</span>
                    </div>
                    <div class="avail-meta">
                      <i class="bi bi-clock"></i> Requested
                      {{ formatDate(req.requestedAt) }}
                      <span v-if="req.branchId" class="ms-1">
                        <span class="branch-dot" :style="{ background: branchColor(req.branchId) }"></span>
                        {{ branchName(req.branchId) }}
                      </span>
                    </div>
                  </div>
                </div>
                <div class="avail-card-actions">
                  <template v-if="req.status === 'Pending'">
                    <span class="badge-status badge-pending">pending</span>
                    <button
                      class="btn-action approve"
                      @click="openResetConfirm(req)"
                    >
                      Reset
                    </button>
                    <button
                      class="btn-action reject"
                      @click="dismissResetRequest(req)"
                    >
                      &#10007;
                    </button>
                  </template>
                  <span
                    v-else-if="req.status === 'Resolved'"
                    class="badge-status badge-active"
                    >resolved</span
                  >
                  <span v-else class="badge-status badge-inactive"
                    >dismissed</span
                  >
                </div>
              </div>
            </div>
            <div v-else style="padding-top: 1rem" class="empty-left">
              <i class="bi bi-key"></i>
              <p>No password reset requests</p>
            </div>
          </div>

          <!-- -- SCHEDULE TABLE (left overflow) ---- -->
          <!-- MANAGER: no schedBranchFilter select, only Clear button -->
          <div v-if="activeTab === 'schedule'" class="left-scroll-area">
            <!-- Date mode pill group -->
            <div class="date-mode-pills mb-2">
              <button
                class="date-pill"
                :class="{ active: schedDateMode === 'all' }"
                @click="schedDateMode = 'all'"
              >
                All Dates
              </button>
              <button
                class="date-pill"
                :class="{ active: schedDateMode === 'today' }"
                @click="setTodayFilter"
              >
                Today
              </button>
              <button
                class="date-pill"
                :class="{ active: schedDateMode === 'single' }"
                @click="schedDateMode = 'single'"
              >
                Single
              </button>
              <button
                class="date-pill"
                :class="{ active: schedDateMode === 'range' }"
                @click="schedDateMode = 'range'"
              >
                Range
              </button>
            </div>

            <!-- Single date input -->
            <input
              v-show="schedDateMode === 'single'"
              v-model="schedDateFilter"
              type="date"
              class="form-control fc-brand mb-2"
              style="font-size: 0.82rem"
            />

            <!-- Range inputs with validation -->
            <div v-show="schedDateMode === 'range'" class="d-flex gap-1 mb-2">
              <input
                v-model="schedRangeStart"
                type="date"
                class="form-control fc-brand"
                style="font-size: 0.82rem"
              />
              <span class="range-sep">→</span>
              <input
                v-model="schedRangeEnd"
                type="date"
                class="form-control fc-brand"
                style="font-size: 0.82rem"
              />
            </div>
            <div
              v-if="
                schedDateMode === 'range' &&
                schedRangeStart &&
                schedRangeEnd &&
                schedRangeStart > schedRangeEnd
              "
              class="range-validation-error"
            >
              Start date must be before end date
            </div>

            <div class="d-flex align-items-center justify-content-between mb-2">
              <div class="left-section-title">Scheduled Shifts</div>
              <button class="btn btn-ghost btn-sm" @click="clearSchedFilters">
                Clear
              </button>
            </div>
            <input
              v-model="schedSearchInput"
              type="text"
              class="form-control fc-brand mb-2"
              placeholder="Search staff"
              style="font-size: 0.82rem"
            />

            <!-- Result count label -->
            <div class="result-count-label mb-1">
              {{ filteredSchedules.length }} schedule{{
                filteredSchedules.length !== 1 ? "s" : ""
              }}
            </div>

            <div class="sched-card-list">
              <div
                v-for="sched in filteredSchedules"
                :key="sched.id"
                class="sched-list-card"
              >
                <div
                  class="sched-list-avatar"
                  :style="{ background: avatarColor(sched.employeeId) }"
                >
                  {{ sched.initials }}
                </div>
                <div class="sched-list-info">
                  <div class="sched-list-name">{{ sched.employeeName }}</div>
                  <div class="sched-list-meta">
                    {{ formatDate(sched.shiftDate) }} · {{ sched.startTime }}–{{
                      sched.endTime
                    }}
                  </div>
                  <div class="sched-list-meta">
                    <span
                      class="branch-dot"
                      :style="{ background: branchColor(sched.branchId) }"
                    ></span>
                    {{ sched.role }} · {{ branchName(sched.branchId) }}
                  </div>
                </div>
                <div class="d-flex flex-column align-items-end gap-1">
                  <span
                    class="badge-status"
                    :class="schedStatusClass(sched.status)"
                    >{{ sched.status }}</span
                  >
                  <div class="d-flex gap-1">
                    <button class="icon-btn" @click="openEditModal(sched)">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button
                      class="icon-btn danger"
                      @click="confirmDelete(sched)"
                    >
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="!filteredSchedules.length" class="empty-left">
                <i class="bi bi-calendar2-x"></i>
                <p>No schedules found</p>
              </div>
            </div>
          </div>
        </div>
        <!-- end left-panel -->

        <!-- ------------------------------------------
             RIGHT PANEL � Calendar always visible
        ------------------------------------------- -->
        <div class="right-panel">
          <!-- Month nav -->
          <div class="cal-nav mb-3">
            <button class="btn btn-ghost btn-sm" @click="monthOffset -= 1">
              <i class="bi bi-chevron-left"></i>
            </button>
            <span class="cal-month-label">{{ monthYearLabel }}</span>
            <button class="btn btn-ghost btn-sm" @click="monthOffset = 0">
              Today
            </button>
            <button class="btn btn-ghost btn-sm" @click="monthOffset += 1">
              <i class="bi bi-chevron-right"></i>
            </button>
            <!-- View toggle -->
            <div class="ms-auto d-flex gap-1">
            </div>
          </div>

          <!-- Calendar grid -->
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
                @click="openDayDetail(day)"
              >
                <div class="day-number">
                  {{ day.dayOfMonth }}
                  <span v-if="day.isToday" class="today-badge">Today</span>
                </div>
                <div class="day-shifts">
                  <div
                    v-for="shift in day.shifts.slice(0, overflowThreshold)"
                    :key="shift.id"
                    class="shift-badge"
                    :style="{
                      background: avatarColor(shift.employeeId),
                      borderLeft: '3px solid ' + branchColor(shift.branchId),
                    }"
                    @click.stop="showShiftDetail = shift"
                    :title="`${shift.employeeName} — ${shift.startTime}-${shift.endTime}`"
                  >
                    <div class="shift-badge-time">{{ shift.startTime }}</div>
                    <div class="shift-badge-name">{{ shift.employeeName }}</div>
                  </div>
                  <div
                    v-if="day.shifts.length > overflowThreshold"
                    class="overflow-pill"
                    @click.stop="openDayDetail(day)"
                  >
                    <span class="overflow-pill-label"
                      >View all {{ day.shifts.length }} shifts</span
                    >
                    <span class="overflow-pill-avatars">
                      <span
                        v-for="s in day.shifts.slice(
                          overflowThreshold,
                          overflowThreshold + 3,
                        )"
                        :key="s.id"
                        class="overflow-pill-avatar"
                        :style="{ background: avatarColor(s.employeeId) }"
                        :title="s.employeeName"
                      >
                        {{ s.initials }}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- end split-layout -->
    </template>

    <!-- -- All modals unchanged ------------------------------- -->
    <!-- CREATE / EDIT MODAL -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="closeModal"
        ></div>
        <div
          class="modal-panel"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">
                {{ isEditing ? "Edit Schedule" : "Create Schedule" }}
              </h5>
              <p class="modal-sub mb-0" style="margin-top: 2px">
                Branch:
                <strong>{{
                  userBranchName || branchName(form.branchId) || "—"
                }}</strong>
              </p>
            </div>
            <button class="btn-close-panel" @click="closeModal">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <div
              v-if="isPastEdit"
              class="alert alert-warning py-2 px-3 mb-3"
              style="font-size: 0.85rem"
            >
              <i class="bi bi-clock-history me-1"></i>
              This shift is in the past. Only the status can be changed.
            </div>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label-sm">Staff</label>
                <div class="staff-search-wrap" style="position: relative">
                  <input
                    ref="staffSearchInputRef"
                    v-model="staffSearchText"
                    type="text"
                    class="form-control fc-brand"
                    :placeholder="
                      employeesLoading ? 'Loading staff…' : 'Search staff...'
                    "
                    :disabled="employeesLoading || isPastEdit"
                    @focus="onStaffSearchFocus"
                    @blur="onStaffSearchBlur"
                    @input="onStaffSearchInput"
                    @keydown="onStaffSearchKeydown"
                  />
                  <ul
                    v-if="staffDropdownOpen && filteredEmployeeList.length"
                    class="staff-dropdown"
                  >
                    <li
                      v-for="(e, i) in filteredEmployeeList"
                      :key="e.id"
                      :class="{ active: i === staffHighlightIndex }"
                      @mousedown.prevent="selectStaff(e)"
                      @mouseenter="staffHighlightIndex = i"
                    >
                      {{ e.name }}
                    </li>
                  </ul>
                  <ul
                    v-else-if="
                      staffDropdownOpen &&
                      staffSearchText &&
                      !filteredEmployeeList.length
                    "
                    class="staff-dropdown"
                  >
                    <li class="no-match">No staff found</li>
                  </ul>
                </div>
                <div v-if="errors.employeeId" class="text-danger small mt-1">
                  {{ errors.employeeId }}
                </div>
                <div
                  v-if="employeeConflictMsg && !errors.employeeId"
                  class="text-warning small mt-1 d-flex align-items-center gap-1"
                >
                  <i class="bi bi-exclamation-triangle"></i>
                  {{ employeeConflictMsg }}
                </div>
              </div>
              <div class="col-12">
                <label class="form-label-sm">Role</label>
                <div v-if="form.employeeId && !showRoleOverride" class="d-flex align-items-center gap-2">
                  <span class="badge" style="background:#31201d;font-size:0.85rem;padding:6px 14px">{{ form.role || '—' }}</span>
                  <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="isPastEdit" @click="showRoleOverride = true">Change</button>
                </div>
                <select v-show="!form.employeeId || showRoleOverride" v-model="form.role" class="form-select fc-brand" :disabled="!form.employeeId || isPastEdit">
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
                    :disabled="!form.employeeId || isPastEdit"
                    :min="todayStr"
                    :max="maxDateStr"
                  />
                <div v-if="errors.shiftDate" class="text-danger small mt-1">
                  {{ errors.shiftDate }}
                </div>
              </div>
              <div v-if="formQuickPeriods.length" class="col-12 mb-2">
                <label class="form-label-sm">Quick Select</label>
                <div class="d-flex gap-2 flex-wrap">
                  <button
                    v-for="p in formQuickPeriods"
                    :key="p.id ?? p.periodname"
                    type="button"
                    class="btn btn-sm"
                    :class="form.startTime === (p.starttime?.slice(0,5) || '') && form.endTime === (p.endtime?.slice(0,5) || '') ? 'btn-brand' : 'btn-outline-brand'"
                    :disabled="isPastEdit"
                    @click="selectPeriod(p)"
                  >
                    {{ p.periodname }}
                  </button>
                </div>
              </div>
              <div class="col-6">
                <label class="form-label-sm">Start Time</label>
                <input
                  v-model="form.startTime"
                  type="time"
                  class="form-control fc-brand"
                  :disabled="!form.employeeId || isPastEdit"
                  :min="formOperatingHours?.openTime"
                  :max="formOperatingHours?.closeTime"
                />
                <div v-if="formOperatingHours && !formOperatingHours.isOpen" class="text-warning small mt-1">
                  Branch is closed on this day
                </div>
                <div v-else-if="formOperatingHours" class="text-muted small mt-1">
                  Hours: {{ formOperatingHours.openTime }}–{{ formOperatingHours.closeTime }}
                </div>
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
                  :disabled="!form.employeeId || isPastEdit"
                  :min="form.startTime || formOperatingHours?.openTime"
                  :max="formOperatingHours?.closeTime"
                />
                <div v-if="errors.endTime" class="text-danger small mt-1">
                  {{ errors.endTime }}
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

    <!-- CONFLICT CONFIRM -->
    <Teleport to="body">
      <div v-if="showConflictConfirm" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
        ></div>
        <div
          class="modal-panel modal-panel--sm"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5 class="mb-0">Schedule Conflict</h5>
            <button
              class="btn-close-panel"
              @click="showConflictConfirm = false"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p v-if="conflictInfo">
              This staff already has a shift on
              <strong>{{ formatDate(form.shiftDate) }}</strong> from
              <strong
                >{{ conflictInfo.existingStart }}–{{
                  conflictInfo.existingEnd
                }}</strong
              >
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

    <!-- ROLE CAPACITY REACHED -->
    <Teleport to="body">
      <div v-if="showRoleCapModal" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
        ></div>
        <div
          class="modal-panel modal-panel--sm"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5 class="mb-0">Role Capacity Reached</h5>
            <button
              class="btn-close-panel"
              @click="showRoleCapModal = false"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p v-if="roleCapInfo">
              The role <strong>{{ roleCapInfo.role }}</strong> already has
              <strong>{{ roleCapInfo.count }}</strong> staff scheduled for this
              time slot (max {{ roleCapInfo.cap }} per role).
            </p>
            <p v-if="roleCapInfo?.staff?.length" class="mb-2">
              <strong>Scheduled staff:</strong>
            </p>
            <ul v-if="roleCapInfo?.staff?.length" class="role-cap-staff-list">
              <li v-for="(s, i) in roleCapInfo.staff" :key="i">
                {{ s.name }} — {{ s.startTime }}–{{ s.endTime }}
              </li>
            </ul>
            <p class="mb-0">Please choose a different shift or role.</p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showRoleCapModal = false">
              Cancel
            </button>
            <button class="btn btn-primary-brand" @click="changeShift">
              Change Shift
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- DELETE CONFIRM -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
        ></div>
        <div
          class="modal-panel modal-panel--sm"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5 class="mb-0">Archive Schedule</h5>
            <button class="btn-close-panel" @click="showDeleteConfirm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p>
              Archive the schedule for
              <strong>{{ deleteTarget?.employeeName }}</strong> on
              <strong>{{ formatDate(deleteTarget?.shiftDate) }}</strong
              >?
            </p>
            <p
              v-if="deleteTarget && isPastDate(deleteTarget.shiftDate)"
              class="text-warning"
            >
              <i class="bi bi-exclamation-triangle me-1"></i>
              This schedule has already passed. Archiving will send it to Backup
              & Restore.
            </p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showDeleteConfirm = false">
              Cancel
            </button>
            <button class="btn btn-danger-brand" @click="deleteSchedule">
              Archive
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- SHIFT DETAIL -->
    <Teleport to="body">
      <div v-if="showShiftDetail" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="showShiftDetail = null"
        ></div>
        <div
          class="modal-panel modal-panel--sm"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5 class="mb-0">Shift Details</h5>
            <button class="btn-close-panel" @click="showShiftDetail = null">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <div class="shift-detail-content">
              <div class="shift-detail-employee">
                <div
                  class="emp-avatar lg"
                  :style="{
                    background: avatarColor(showShiftDetail.employeeId),
                  }"
                >
                  {{ showShiftDetail.initials }}
                </div>
                <div>
                  <div class="shift-detail-name">
                    {{ showShiftDetail.employeeName }}
                  </div>
                  <div class="shift-detail-role">
                    {{ showShiftDetail.role }}
                  </div>
                </div>
              </div>
              <div class="shift-detail-info">
                <div class="shift-detail-row">
                  <span class="label">Date:</span
                  ><span class="value">{{
                    formatDate(showShiftDetail.shiftDate)
                  }}</span>
                </div>
                <div class="shift-detail-row">
                  <span class="label">Time:</span
                  ><span class="value"
                    >{{ showShiftDetail.startTime }} –
                    {{ showShiftDetail.endTime }}</span
                  >
                </div>
                <div class="shift-detail-row">
                  <span class="label">Branch:</span
                  ><span class="value">
                    <span
                      class="branch-dot"
                      :style="{
                        background: branchColor(showShiftDetail.branchId),
                      }"
                    ></span>
                    {{ branchName(showShiftDetail.branchId) }}</span
                  >
                </div>
                <div class="shift-detail-row">
                  <span class="label">Status:</span
                  ><span class="value"
                    ><span
                      class="badge-status"
                      :class="schedStatusClass(showShiftDetail.status)"
                      >{{ showShiftDetail.status }}</span
                    ></span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- DAY DETAIL -->
    <Teleport to="body">
      <div v-if="showDayDetail" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="closeDayDetail"
        ></div>
        <div
          class="modal-panel modal-panel--day-detail"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <div class="day-detail-header-left">
              <h5 class="mb-0">
                {{ dayDetailDateLabel }}
              </h5>
              <span class="day-detail-count-badge">{{
                showDayDetail.shifts.length
              }}</span>
            </div>
            <div class="day-detail-header-actions">
              <span v-if="isPastDate(showDayDetail.dateStr)" class="badge-status badge-inactive" style="font-size:0.75rem;padding:0.3rem 0.7rem;">
                <i class="bi bi-lock-fill me-1"></i> Past — View only
              </span>
              <button
                v-else
                class="btn btn-sm btn-primary-brand"
                @click="
                  openCreateModal(showDayDetail.dateStr);
                  closeDayDetail();
                "
              >
                <i class="bi bi-plus-lg me-1"></i> Schedule
              </button>
              <button class="btn-close-panel" @click="closeDayDetail">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
          <div class="modal-panel-body modal-panel-body--day-detail">
            <template v-if="showDayDetail.shifts.length">
              <div class="dtd-period-tab-bar mb-3">
                <button
                  v-for="pt in dayDetailPeriodTabs"
                  :key="pt.key"
                  class="dtd-period-tab"
                  :class="{ active: activeDayDetailPeriod === pt.key }"
                  @click="activeDayDetailPeriod = pt.key"
                >
            {{ pt.label }}
                  <span class="dtd-tab-count">{{ pt.count }}</span>
                </button>
              </div>
              <div class="dtd-grid-scroll">
                <table class="dtd-grid">
                  <thead>
                    <tr>
                      <th class="dtd-th-role">Role</th>
                      <th
                        v-for="b in dayDetailBranches"
                        :key="b.id"
                        class="dtd-th-branch"
                        :style="{ borderTopColor: b.color }"
                      >
                        <span class="branch-dot" :style="{ background: b.color }"></span>
                        {{ b.name }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in dayDetailGridForPeriod" :key="row.role">
                      <td class="dtd-td-role">{{ row.role }}</td>
                      <td
                        v-for="b in dayDetailBranches"
                        :key="b.id"
                        class="dtd-td-cell"
                      >
                        <div v-if="getCellCap(row.role)" class="dtd-cap-badge" :class="{ 'cap-full': (row.cells[b.id]?.length || 0) >= getCellCap(row.role) }">
                          <span>{{ row.cells[b.id]?.length || 0 }}/{{ getCellCap(row.role) }}</span>
                          <span v-if="(row.cells[b.id]?.length || 0) >= getCellCap(row.role)" class="cap-full-label">Full</span>
                        </div>
                        <template v-if="row.cells[b.id]?.length">
                          <div
                            v-for="shift in row.cells[b.id]"
                            :key="shift.id"
                            class="dtd-cell-card"
                            @click.stop="showShiftDetail = shift; closeDayDetail()"
                          >
                            <div class="dtd-cell-name">{{ shift.employeeName }}</div>
                            <div class="dtd-cell-time">{{ shift.startTime }}&#8211;{{ shift.endTime }}</div>
                            <div v-if="!isPastDate(showDayDetail.dateStr)" class="dtd-cell-actions">
                              <button @click.stop="openEditModal(shift); closeDayDetail()">
                                <i class="bi bi-pencil"></i>
                              </button>
                              <button @click.stop="confirmDelete(shift); closeDayDetail()">
                                <i class="bi bi-trash3"></i>
                              </button>
                              <button
                                v-if="!getCellCap(row.role) || (row.cells[b.id]?.length || 0) < getCellCap(row.role)"
                                class="dtd-cell-add-btn"
                                title="Add shift"
                                @click.stop="openCreateFromGrid(b.id, row.role)"
                              >
                                <i class="bi bi-plus-lg"></i>
                              </button>
                            </div>
                          </div>
                        </template>
                        <span
                          v-else-if="!isPastDate(showDayDetail.dateStr)"
                        >
                          <span
                            v-if="!getCellCap(row.role) || (row.cells[b.id]?.length || 0) < getCellCap(row.role)"
                            class="dtd-cell-empty"
                            title="Add shift"
                            @click.stop="openCreateFromGrid(b.id, row.role)"
                          >
                            <span class="dtd-cell-empty-icon">+</span>
                          </span>
                          <span v-else class="dtd-cell-full-label">Full</span>
                        </span>
                        <span v-else class="dtd-cell-empty-past">&mdash;</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template v-else>
              <div class="day-detail-empty">
                <i class="bi bi-calendar2-x"></i>
                <p v-if="isPastDate(showDayDetail.dateStr)">No shifts were scheduled for this day.</p>
                <p v-else>No shifts scheduled for this day.</p>
                <button
                  v-if="!isPastDate(showDayDetail.dateStr)"
                  class="btn btn-primary-brand btn-sm"
                  @click="
                    openCreateModal(showDayDetail.dateStr);
                    closeDayDetail();
                  "
                >
                  <i class="bi bi-plus-lg me-1"></i> Create Schedule
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- OPERATING HOURS / PERIODS MODAL -->
    <Teleport to="body">
      <div v-if="showOperatingHoursModal" class="modal-overlay">
        <div style="position: absolute; inset: 0; z-index: 0" @click="closeOperatingHours"></div>
        <div class="modal-panel" style="max-width: 620px; position: relative; z-index: 1" @click.stop>
          <div class="modal-panel-header">
            <div>
              <h5 class="mb-0">Operating Hours &amp; Periods</h5>
              <p class="text-muted small mb-0 mt-1">Set hours and shift periods for your branch</p>
            </div>
            <button class="btn-close-panel" @click="closeOperatingHours">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="oh-tab-bar">
            <button class="oh-tab-btn" :class="{ active: showOhTab === 'hours' }" @click="showOhTab = 'hours'">
              <i class="bi bi-clock me-1"></i> Hours
            </button>
            <button class="oh-tab-btn" :class="{ active: showOhTab === 'periods' }" @click="openPeriodsTab">
              <i class="bi bi-layers me-1"></i> Periods
            </button>
          </div>
          <div class="modal-panel-body" style="max-height: 70vh; overflow-y: auto">
            <!-- Hours tab -->
            <template v-if="showOhTab === 'hours'">
              <table class="oh-table" v-if="ohDays.length">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Open</th>
                    <th>Close</th>
                    <th class="text-center">Open?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="day in ohDays" :key="day.dayOfWeek">
                    <td class="oh-day-label">{{ dayLabels[day.dayOfWeek] }}</td>
                    <td>
                      <input v-model="day.openTime" type="time" class="form-control fc-brand" :disabled="!day.isOpen" />
                    </td>
                    <td>
                      <input v-model="day.closeTime" type="time" class="form-control fc-brand" :disabled="!day.isOpen" />
                    </td>
                    <td class="text-center">
                      <input type="checkbox" v-model="day.isOpen" class="form-check-input" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
            <!-- Periods tab -->
            <template v-if="showOhTab === 'periods'">
              <div class="mb-2 d-flex justify-content-between align-items-center">
                <small class="text-muted">Define shift periods for your branch</small>
                <button class="btn btn-sm btn-outline-brand" @click="autoSuggestPeriods">
                  <i class="bi bi-magic me-1"></i> Suggest
                </button>
              </div>
              <table class="oh-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Start</th>
                    <th>End</th>
                    <th style="width:60px">Max/Role</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(p, i) in branchPeriods" :key="i">
                    <td>
                      <input v-model="p.periodName" class="form-control fc-brand" placeholder="e.g. Morning" />
                    </td>
                    <td>
                      <input v-model="p.startTime" type="time" class="form-control fc-brand" />
                    </td>
                    <td>
                      <input v-model="p.endTime" type="time" class="form-control fc-brand" />
                    </td>
                    <td>
                      <input v-model.number="p.maxPerRole" type="number" min="1" max="10" class="form-control fc-brand" style="width:60px" />
                    </td>
                    <td class="text-center">
                      <button class="btn btn-sm btn-ghost text-danger p-0" @click="removePeriod(i)" title="Remove">
                        <i class="bi bi-x-lg"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button class="btn btn-sm btn-ghost mt-2" @click="addPeriod">
                <i class="bi bi-plus-lg me-1"></i> Add Period
              </button>
            </template>
          </div>
          <div class="modal-panel-footer d-flex justify-content-end gap-2">
            <button class="btn btn-ghost" @click="closeOperatingHours">Cancel</button>
            <button
              class="btn btn-primary-brand"
              @click="showOhTab === 'hours' ? saveOperatingHoursAction() : savePeriods(managerBranchId)"
              :disabled="ohSaving || periodsSaving"
            >
              <span v-if="ohSaving || periodsSaving" class="spinner-border spinner-border-sm me-1"></span>
              {{ showOhTab === 'hours' ? 'Save Hours' : 'Save Periods' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- STAFF MODAL (MANAGER: Edit only, no branch field) -->
    <Teleport to="body">
      <div v-if="showStaffModal" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="showStaffModal = false"
        ></div>
        <div
          class="modal-panel"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <div>
              <h5>Edit Staff</h5>
              <div class="modal-sub">Update staff details</div>
            </div>
            <button class="btn-close-panel" @click="showStaffModal = false">
              &times;
            </button>
          </div>
          <div class="modal-panel-body">
            <div class="row g-3">
              <div class="col-6">
                <label class="form-label-sm">First Name</label
                ><input
                  v-model="staffForm.firstName"
                  type="text"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Last Name</label
                ><input
                  v-model="staffForm.lastName"
                  type="text"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Email</label
                ><input
                  v-model="staffForm.email"
                  type="email"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Phone</label
                ><input
                  v-model="staffForm.phone"
                  type="text"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Position</label
                ><input
                  v-model="staffForm.position"
                  type="text"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Department</label
                ><input
                  v-model="staffForm.department"
                  type="text"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Hourly Rate (&#8369;)</label
                ><input
                  v-model="staffForm.hourlyRate"
                  type="number"
                  step="0.01"
                  class="form-control fc-brand"
                />
              </div>
              <div class="col-6">
                <label class="form-label-sm">Status</label>
                <select v-model="staffForm.status" class="form-select fc-brand">
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showStaffModal = false">
              Cancel
            </button>
            <button
              class="btn btn-primary-brand"
              @click="saveStaff"
              :disabled="staffSaving"
            >
              <span
                v-if="staffSaving"
                class="spinner-border spinner-border-sm me-2"
              ></span>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ARCHIVE STAFF -->
    <Teleport to="body">
      <div v-if="showArchiveStaffModal" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="showArchiveStaffModal = false"
        ></div>
        <div
          class="modal-panel"
          style="position: relative; z-index: 1; max-width: 420px"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5>Archive Staff</h5>
            <button
              class="btn-close-panel"
              @click="showArchiveStaffModal = false"
            >
              &times;
            </button>
          </div>
          <div class="modal-panel-body">
            <p>
              Are you sure you want to archive
              <strong
                >{{ staffArchiveTarget?.firstName }}
                {{ staffArchiveTarget?.lastName }}</strong
              >?
            </p>
            <p class="text-muted" style="font-size: 0.82rem">
              Archived staff cannot log in or be assigned to schedules.
            </p>
          </div>
          <div class="modal-panel-footer">
            <button
              class="btn btn-ghost"
              @click="showArchiveStaffModal = false"
            >
              Cancel
            </button>
            <button class="btn btn-danger-brand" @click="confirmArchiveStaff">
              Archive
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- PASSWORD RESET CONFIRM MODAL -->
    <Teleport to="body">
      <div v-if="showResetConfirm" class="modal-overlay">
        <div
          style="position: absolute; inset: 0; z-index: 0"
          @click="showResetConfirm = false"
        ></div>
        <div
          class="modal-panel modal-panel--sm"
          style="position: relative; z-index: 1"
          @click.stop
        >
          <div class="modal-panel-header">
            <h5 class="mb-0">Reset Password</h5>
            <button class="btn-close-panel" @click="showResetConfirm = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-panel-body">
            <p>
              You are about to reset the password for
              <strong>{{ resetTarget?.username }}</strong>
              to the default password for their role (<strong>{{
                resetTarget?.role === "staff" ? "Staff@1234" : "Manager@1234"
              }}</strong
              >).
            </p>
            <p class="text-muted mb-3" style="font-size: 0.82rem">
              Please enter your manager password to confirm.
            </p>
            <div class="input-group-modal">
              <input
                :type="showResetAdminPw ? 'text' : 'password'"
                v-model="resetAdminPassword"
                class="form-control fc-brand"
                placeholder="Your password"
                @keydown.enter="confirmReset"
              />
              <button
                type="button"
                class="pw-toggle-btn"
                @click="showResetAdminPw = !showResetAdminPw"
              >
                <i
                  :class="showResetAdminPw ? 'bi bi-eye-slash' : 'bi bi-eye'"
                ></i>
              </button>
            </div>
            <p v-if="resetConfirmError" class="text-danger small mt-2">
              {{ resetConfirmError }}
            </p>
          </div>
          <div class="modal-panel-footer">
            <button class="btn btn-ghost" @click="showResetConfirm = false">
              Cancel
            </button>
            <button
              class="btn btn-primary-brand"
              @click="confirmReset"
              :disabled="resetSaving"
            >
              <span
                v-if="resetSaving"
                class="spinner-border spinner-border-sm me-1"
              ></span>
              Confirm Reset
            </button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- TOAST -->
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
defineOptions({ name: "ManagerSchedule" });
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from "vue";
import { supabase } from "@/supabase.js";
import { useUserBranch } from "@/composables/useUserBranch.js";
import { useOperatingHours } from "@/composables/useOperatingHours.js";
import {
  getMonthStart,
  toLocalDateKey,
  normalizeDateKey,
  normalizeTime,
  timesOverlap,
  buildSchedulesByDate,
  availabilitySinceDate,
} from "@/composables/useScheduleHelpers.js";

const SHIFT_OVERFLOW = 3;
const windowWidth = ref(window.innerWidth);
let resizeCleanup = null;
let resizeDebounce = null;
onMounted(() => {
  const onResize = () => {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      windowWidth.value = window.innerWidth;
    }, 100);
  };
  window.addEventListener("resize", onResize);
  resizeCleanup = () => {
    window.removeEventListener("resize", onResize);
  };
  document.addEventListener("click", onDocumentClick);
});
onUnmounted(() => {
  resizeCleanup?.();
  document.removeEventListener("click", onDocumentClick);
  clearTimeout(schedSearchDebounce);
});
const overflowThreshold = computed(() =>
  windowWidth.value < 600 ? 2 : SHIFT_OVERFLOW,
);

const isLoading = ref(true);
const activeTab = ref("availability");
const tabs = [
  { key: "staff", label: "Staff" },
  { key: "availability", label: "Availability Requests" },
  { key: "history", label: "History" },
  { key: "schedule", label: "Current Schedule" },
  { key: "change", label: "Change Inquiries" },
];
const leftTabs = [
  { key: "staff", label: "Staff" },
  { key: "availability", label: "Requests" },
  { key: "history", label: "History" },
  { key: "schedule", label: "Schedules" },
  { key: "change", label: "Inquiries" },
];

const { isAdmin, userBranchId, userBranchName, resolveBranch } =
  useUserBranch();
const managerBranchId = ref(null);

const schedSearchInput = ref("");
const schedSearch = ref("");
let schedSearchDebounce = null;
const schedDateMode = ref(sessionStorage.getItem("schedDateMode") || "all");
const schedRangeStart = ref("");
const schedRangeEnd = ref("");
const schedDateFilter = ref("");
const schedStatusFilter = ref("");
const schedViewMode = ref("table");
const monthOffset = ref(0); // 0 = current month, -1 = last month, +1 = next month
const showModal = ref(false);
const showShiftDetail = ref(null);
const showConflictConfirm = ref(false);
const showDayDetail = ref(null);
const dayDetailBackup = ref(null);
const activeDayDetailPeriod = ref('all');
const conflictInfo = ref(null);
const employeesLoading = ref(true);
const showDeleteConfirm = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const deleteTarget = ref(null);
const toast = ref({ show: false, message: "", type: "success" });
const errors = ref({});

// ── Operating Hours ─────────────────────────────────────────
const showOperatingHoursModal = ref(false);
const ohDays = ref([]);
const ohSaving = ref(false);
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const {
  hoursByBranch,
  fetchOperatingHours,
  saveOperatingHours,
  getHoursForDay,
} = useOperatingHours();

const openOperatingHours = async () => {
  showOperatingHoursModal.value = true;
  await nextTick();
  const days = await fetchOperatingHours(managerBranchId.value);
  ohDays.value = days || [];
};

const saveOperatingHoursAction = async () => {
  ohSaving.value = true;
  try {
    const success = await saveOperatingHours(managerBranchId.value, ohDays.value);
    if (success) showToast("Operating hours saved.", "success");
    closeOperatingHours();
  } catch (e) {
    showToast("Failed to save operating hours.", "error");
  } finally {
    ohSaving.value = false;
  }
};

const closeOperatingHours = () => {
  showOperatingHoursModal.value = false;
};

// ── Shift Periods ─────────────────────────────────────────
const showOhTab = ref("hours");
const allPeriods = ref([]);
const branchPeriods = ref([]);
const periodsSaving = ref(false);

async function fetchPeriods(branchId) {
  try {
    const { data, error } = await supabase
      .from("branch_shift_periods")
      .select("*")
      .eq("branchid", branchId)
      .order("starttime");
    if (error) throw error;
    const list = data || [];
    allPeriods.value = allPeriods.value.filter((p) => p.branchid !== branchId).concat(list);
    return list;
  } catch (e) {
    console.warn("fetchPeriods error:", e);
    return [];
  }
}

async function savePeriods(branchId) {
  if (!hoursByBranch.value[branchId]) {
    await fetchOperatingHours(branchId);
  }
  const days = hoursByBranch.value[branchId];
  let effectiveOpen = "00:00";
  let effectiveClose = "23:59";
  if (days?.length) {
    const openDays = days.filter((d) => d.isOpen);
    if (openDays.length) {
      effectiveOpen = openDays[0].openTime;
      effectiveClose = openDays[0].closeTime;
      for (const d of openDays) {
        if (d.openTime < effectiveOpen) effectiveOpen = d.openTime;
        if (d.closeTime > effectiveClose) effectiveClose = d.closeTime;
      }
    }
  }
  for (const p of branchPeriods.value) {
    if (!p.periodName?.trim()) {
      showToast("Each period must have a name.", "error");
      return;
    }
    if (!p.startTime || !p.endTime) {
      showToast(`Period "${p.periodName}" is missing start or end time.`, "error");
      return;
    }
    if (p.startTime >= p.endTime) {
      showToast(`Period "${p.periodName}" start time must be before end time.`, "error");
      return;
    }
    if (p.startTime < effectiveOpen) {
      showToast(`Period "${p.periodName}" start time (${p.startTime}) is before branch opening time (${effectiveOpen}).`, "error");
      return;
    }
    if (p.endTime > effectiveClose) {
      showToast(`Period "${p.periodName}" end time (${p.endTime}) is after branch closing time (${effectiveClose}).`, "error");
      return;
    }
  }
  periodsSaving.value = true;
  try {
    const { data: existing } = await supabase
      .from("branch_shift_periods")
      .select("id")
      .eq("branchid", branchId);
    const existingIds = new Set((existing || []).map((r) => r.id));
    const keepIds = new Set();
    for (const p of branchPeriods.value) {
      if (p.id) {
        keepIds.add(p.id);
        const { error } = await supabase
          .from("branch_shift_periods")
          .update({ periodname: p.periodName, starttime: p.startTime, endtime: p.endTime, maxperrole: p.maxPerRole })
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("branch_shift_periods")
          .insert({ branchid: branchId, periodname: p.periodName, starttime: p.startTime, endtime: p.endTime, maxperrole: p.maxPerRole })
          .select();
        if (error) throw error;
        if (data) keepIds.add(data[0].id);
      }
    }
    for (const id of existingIds) {
      if (!keepIds.has(id)) {
        await supabase.from("branch_shift_periods").delete().eq("id", id);
      }
    }
    await fetchPeriods(branchId);
    showToast("Shift periods saved.", "success");
  } catch (e) {
    showToast("Failed to save periods.", "error");
  } finally {
    periodsSaving.value = false;
  }
}

async function openPeriodsTab() {
  showOhTab.value = "periods";
  const bid = managerBranchId.value;
  if (!bid) return;
  const list = await fetchPeriods(bid);
  branchPeriods.value = list.map((p) => ({
    id: p.id,
    periodName: p.periodname,
    startTime: p.starttime.slice(0, 5),
    endTime: p.endtime.slice(0, 5),
    maxPerRole: p.maxperrole,
  }));
  if (!branchPeriods.value.length) autoSuggestPeriods();
}

function autoSuggestPeriods() {
  branchPeriods.value = [
    { id: null, periodName: "Morning", startTime: "06:00", endTime: "12:00", maxPerRole: 2 },
    { id: null, periodName: "Afternoon", startTime: "12:00", endTime: "18:00", maxPerRole: 2 },
    { id: null, periodName: "Evening", startTime: "18:00", endTime: "22:00", maxPerRole: 2 },
  ];
}

function addPeriod() {
  branchPeriods.value.push({ id: null, periodName: "", startTime: "08:00", endTime: "17:00", maxPerRole: 2 });
}

function removePeriod(index) {
  branchPeriods.value.splice(index, 1);
}

const periodsByBranch = computed(() => {
  const groups = {};
  for (const p of allPeriods.value) {
    if (!groups[p.branchid]) groups[p.branchid] = [];
    groups[p.branchid].push(p);
  }
  return groups;
});

function getShiftsForPeriod(shifts, period) {
  if (!shifts?.length) return [];
  if (!period?.starttime) return shifts;
  return shifts.filter((s) => timesOverlap(s.startTime, s.endTime, period.starttime.slice(0, 5), period.endtime.slice(0, 5)));
}

function getCellCap(role) {
  const tabs = dayDetailPeriodTabs.value;
  const activeKey = activeDayDetailPeriod.value;
  const activePt = tabs.find(t => t.key === activeKey);
  if (!activePt || activeKey === 'all' || !activePt.periodObj?.maxperrole) return null;
  return role === 'Manager' ? 1 : activePt.periodObj.maxperrole;
}

const staffLoading = ref(false);
const staffSearch = ref("");
const staffFilterDept = ref("");
const staffFilterStatus = ref("");
const staffFilterBranch = ref("");
const staffMembers = ref([]);
const staffDepartments = ref([]);

const staffStats = computed(() => {
  const total = staffMembers.value.length;
  const active = staffMembers.value.filter((e) => e.status === "Active").length;
  const onLeave = staffMembers.value.filter(
    (e) => e.status === "On Leave",
  ).length;
  const managers = staffMembers.value.filter(
    (e) => e.position === "Manager",
  ).length;
  return [
    {
      label: "Total Staff",
      value: total,
      icon: "bi bi-people",
      sub: "All branches",
    },
    {
      label: "Active",
      value: active,
      icon: "bi bi-check-circle",
      sub: "Currently working",
    },
    { label: "On Leave", value: onLeave, icon: "bi bi-clock", sub: "On leave" },
    {
      label: "Managers",
      value: managers,
      icon: "bi bi-person-badge",
      sub: "Management",
    },
  ];
});

const CACHE_KEY_RESET_REQUESTS = "cache_mgr_reset_requests";
const resetRequests = ref([]);
const showResetConfirm = ref(false);
const resetTarget = ref(null);
const resetAdminPassword = ref("");
const showResetAdminPw = ref(false);
const resetConfirmError = ref("");
const resetSaving = ref(false);

const resetPendingCount = computed(
  () => resetRequests.value.filter((r) => r.status === "Pending").length,
);

const filteredStaff = computed(() => {
  return staffMembers.value.filter((e) => {
    if (staffSearch.value) {
      const q = staffSearch.value.toLowerCase();
      const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
      if (!fullName.includes(q) && !(e.email || "").toLowerCase().includes(q))
        return false;
    }
    if (staffFilterDept.value && e.department !== staffFilterDept.value)
      return false;
    if (staffFilterStatus.value && e.status !== staffFilterStatus.value)
      return false;
    return true;
  });
});

const fetchStaff = async (force = false) => {
  staffLoading.value = true;
  await fetchEmployees(force);
};

const staffAvatarColor = (emp) => {
  const colors = [
    "#7b1d1d",
    "#2d6a4f",
    "#1d4ed8",
    "#9333ea",
    "#b45309",
    "#0369a1",
  ];
  let hash = 0;
  for (let i = 0; i < (emp.firstName || "").length; i++)
    hash = emp.firstName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};
const staffInitials = (emp) =>
  ((emp.firstName || "")[0] || "") + ((emp.lastName || "")[0] || "");
const staffStatusClass = (status) => {
  if (status === "Active") return "badge-active";
  if (status === "On Leave") return "badge-leave";
  return "badge-inactive";
};

const clearStaffFilters = () => {
  staffSearch.value = "";
  staffFilterDept.value = "";
  staffFilterStatus.value = "";
};

// ── Staff CRUD (manager: view/edit only) ──────────────────
const showStaffModal = ref(false);
const showArchiveStaffModal = ref(false);
const staffForm = ref({
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
  department: "",
  hourlyRate: 0,
  branchId: "",
  status: "Active",
});
const staffArchiveTarget = ref(null);
const staffSaving = ref(false);

const openEditStaffModal = (emp) => {
  staffForm.value = {
    id: emp.id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    phone: emp.phone,
    position: emp.position,
    department: emp.department,
    hourlyRate: emp.hourlyRate,
    branchId: emp.branchId,
    status: emp.status,
  };
  showStaffModal.value = true;
};
const openArchiveStaffModal = (emp) => {
  staffArchiveTarget.value = emp;
  showArchiveStaffModal.value = true;
};
const saveStaff = async () => {
  staffSaving.value = true;
  try {
    const payload = {
      FirstName: staffForm.value.firstName,
      LastName: staffForm.value.lastName,
      Email: staffForm.value.email,
      Phone: staffForm.value.phone,
      Position: staffForm.value.position,
      Department: staffForm.value.department,
      HourlyRate: Number(staffForm.value.hourlyRate),
      BranchAssigned: staffForm.value.branchId || null,
      Status: staffForm.value.status,
    };
    const { error } = await supabase
      .from("employee")
      .update(payload)
      .eq("EmployeeId", staffForm.value.id);
    if (error) throw error;
    showToast("Staff updated successfully.", "success");
    showStaffModal.value = false;
    await fetchStaff();
  } catch (err) {
    showToast(err.message || "Failed to save staff.", "error");
  } finally {
    staffSaving.value = false;
  }
};
const confirmArchiveStaff = async () => {
  if (!staffArchiveTarget.value) return;
  try {
    const { error } = await supabase
      .from("employee")
      .update({ Status: "Inactive" })
      .eq("EmployeeId", staffArchiveTarget.value.id);
    if (error) throw error;
    showToast(
      `${staffArchiveTarget.value.firstName} ${staffArchiveTarget.value.lastName} has been archived.`,
      "success",
    );
    showArchiveStaffModal.value = false;
    staffArchiveTarget.value = null;
    await fetchStaff();
  } catch (err) {
    showToast(err.message || "Failed to archive staff.", "error");
  }
};

const branches = ref([]);
const employeeList = ref([]);
const availability = ref([]);
const schedules = ref([]);
const changeInquiries = ref([]);
// Cache constants
const CACHE_KEY_SCHEDULES = "cache_mgr_schedules";
const CACHE_KEY_AVAILABILITY = "cache_mgr_availability";
const CACHE_KEY_BRANCHES = "cache_mgr_branches";
const CACHE_KEY_EMPLOYEES = "cache_mgr_employees";
const CACHE_KEY_STAFF = "cache_mgr_staff";
const CACHE_KEY_INQUIRIES = "cache_mgr_inquiries";
const CACHE_TTL = 30 * 60 * 1000;

const saveCache = (key, data) => {
  sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const loadCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    console.log(`[Cache] loadCache(${key}):`, raw ? "found" : "missing");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      console.log(`[Cache] ${key} expired`);
      return null;
    }
    console.log(`[Cache] ${key} hit, items:`, parsed.data?.length);
    return parsed.data;
  } catch {
    return null;
  }
};

const roles = [
  "Barista",
  "Cashier",
  "Delivery Staff",
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
  branchLocked: false,
  startTime: "",
  endTime: "",
  branchId: "",
  status: "Scheduled",
});
const form = ref(emptyForm());

const formOperatingHours = computed(() => {
  if (!form.value.branchId || !form.value.shiftDate) return null;
  const d = new Date(form.value.shiftDate + "T12:00:00");
  const dayOfWeek = d.getDay();
  return getHoursForDay(form.value.branchId, dayOfWeek);
});

const formQuickPeriods = computed(() => {
  const bid = form.value.branchId;
  if (!bid) return [];
  const defined = periodsByBranch.value[bid];
  if (defined?.length) return defined;
  const days = hoursByBranch.value[bid];
  if (!days?.length) return [];
  // Use the first open day's hours to generate fallback periods
  const firstOpen = days.find(d => d.isOpen);
  if (!firstOpen) return [];
  const o = firstOpen.openTime;
  const c = firstOpen.closeTime;
  const morningEnd = "12:00" > c ? c : "12:00";
  const afternoonStart = "12:00" < o ? o : "12:00";
  const afternoonEnd = "18:00" > c ? c : "18:00";
  const eveningStart = "18:00" < o ? o : "18:00";
  return [
    { id: null, periodname: "Morning", starttime: o, endtime: morningEnd },
    { id: null, periodname: "Afternoon", starttime: afternoonStart, endtime: afternoonEnd },
    { id: null, periodname: "Evening", starttime: eveningStart, endtime: c },
  ].filter((p) => p.starttime < p.endtime);
});

const staffSearchText = ref("");
const staffDropdownOpen = ref(false);
const staffHighlightIndex = ref(-1);
const staffSearchInputRef = ref(null);
const showRoleOverride = ref(false);
const employeeConflictMsg = ref("");

const todayStr = computed(() => toLocalDateKey(new Date()));
const maxDateStr = computed(() => {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return toLocalDateKey(d);
});
const isPastEdit = computed(() => {
  if (!isEditing.value || !form.value.shiftDate) return false;
  return form.value.shiftDate < todayStr.value;
});

const pendingCount = computed(
  () => availability.value.filter((a) => a.status === "Pending").length,
);

const inquiryPendingCount = computed(
  () => changeInquiries.value.filter((c) => c.status === "Pending").length,
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

const dateFilterRange = computed(() => {
  const mode = schedDateMode.value;
  if (mode === "all") return { start: null, end: null };
  if (mode === "today") {
    const d = new Date().toISOString().slice(0, 10);
    return { start: d, end: d };
  }
  if (mode === "single" && schedDateFilter.value) {
    const d = schedDateFilter.value;
    return { start: d, end: d };
  }
  if (mode === "range") {
    const s = schedRangeStart.value;
    const e = schedRangeEnd.value;
    if (s && e && s <= e) return { start: s, end: e };
  }
  return { start: null, end: null };
});

watch(schedDateMode, (val) => {
  sessionStorage.setItem("schedDateMode", val);
});

const filteredSchedules = computed(() => {
  const dateRange = dateFilterRange.value;
  return schedules.value.filter((s) => {
    const q = schedSearch.value.toLowerCase();
    const matchSearch =
      !q ||
      s.employeeName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q);
    let matchDate = true;
    if (dateRange.start && dateRange.end) {
      matchDate =
        s.shiftDate >= dateRange.start && s.shiftDate <= dateRange.end;
    }
    const matchStatus =
      !schedStatusFilter.value || s.status === schedStatusFilter.value;
    return matchSearch && matchDate && matchStatus;
  });
});

const dayDetailBranches = computed(() => {
  if (!showDayDetail.value) return [];
  const seen = new Set();
  const list = [];
  for (const s of showDayDetail.value.shifts) {
    if (!seen.has(s.branchId)) {
      seen.add(s.branchId);
      list.push({ id: s.branchId, name: branchName(s.branchId), color: branchColor(s.branchId) });
    }
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
});

const dayDetailPeriodTabs = computed(() => {
  if (!showDayDetail.value) return [];
  const shifts = showDayDetail.value.shifts;
  const seenPeriods = new Map();
  for (const bid of dayDetailBranches.value.map(b => b.id)) {
    const periods = periodsByBranch.value[bid] || [];
    if (!periods.length) {
      if (!seenPeriods.has('all')) seenPeriods.set('all', { key: 'all', label: 'All Day', startTime: null, endTime: null });
    } else {
      for (const p of periods) {
        const key = p.periodname?.toLowerCase().replace(/\s+/g, '_') || 'all';
        if (!seenPeriods.has(key)) {
          seenPeriods.set(key, {
            key,
            label: p.periodname,
            startTime: p.starttime?.slice(0, 5) || null,
            endTime: p.endtime?.slice(0, 5) || null,
            periodObj: p,
          });
        }
      }
    }
  }
  const tabs = [{ key: 'all', label: 'All', startTime: null, endTime: null, count: shifts.length }];
  for (const [, pt] of seenPeriods) {
    if (pt.key === 'all') continue;
    const count = pt.startTime
      ? shifts.filter(s => timesOverlap(s.startTime, s.endTime, pt.startTime, pt.endTime)).length
      : shifts.length;
    tabs.push({ ...pt, count });
  }
  return tabs;
});

const dayDetailGridForPeriod = computed(() => {
  if (!showDayDetail.value) return [];
  const activePt = dayDetailPeriodTabs.value.find(t => t.key === activeDayDetailPeriod.value);
  const filteredShifts = !activePt || activePt.key === 'all' || !activePt.startTime
    ? showDayDetail.value.shifts
    : showDayDetail.value.shifts.filter(s =>
        timesOverlap(s.startTime, s.endTime, activePt.startTime, activePt.endTime)
      );
  const orderedRoles = [...roles, 'Unassigned'];
  const gridMap = {};
  for (const role of orderedRoles) gridMap[role] = {};
  for (const s of filteredShifts) {
    const role = s.role || 'Unassigned';
    if (!gridMap[role]) gridMap[role] = {};
    if (!gridMap[role][s.branchId]) gridMap[role][s.branchId] = [];
    gridMap[role][s.branchId].push(s);
  }
  for (const role of Object.keys(gridMap)) {
    for (const bid of Object.keys(gridMap[role])) {
      gridMap[role][bid]?.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
  }
  return orderedRoles
    .map(role => ({ role, cells: gridMap[role] }))
    .filter(row => row.role !== 'Unassigned' || Object.keys(row.cells).some(bid => row.cells[bid]?.length));
});

const dayDetailDateLabel = computed(() => {
  if (!showDayDetail.value) return "";
  const d = new Date(showDayDetail.value.dateStr);
  return d.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
  const cached = loadCache(CACHE_KEY_BRANCHES);
  if (cached) {
    branches.value = cached;
    return;
  }
  const { data } = await supabase.from("branch").select("BranchId, BranchName");
  if (data) {
    branches.value = data.map((b) => ({ id: b.BranchId, name: b.BranchName }));
    saveCache(CACHE_KEY_BRANCHES, branches.value);
  }
};

const updateInquiryStatus = async (inq, status) => {
  const { error } = await supabase
    .from("changeinquiry")
    .update({ status: status })
    .eq("inquiryid", inq.id);

  if (error) {
    showToast("Failed to update inquiry.", "error");
    console.error("[Schedule] updateInquiryStatus failed:", error);
    return;
  }

  if (status === "Approved") {
    if (
      inq.requestType === "Day Off Request" ||
      inq.requestType === "Emergency Leave"
    ) {
      const { error: schedErr } = await supabase
        .from("schedule")
        .update({ Status: "Cancelled" })
        .eq("EmployeeId", inq.employeeId)
        .eq("ShiftDate", inq.requestDate);
      if (schedErr)
        console.error("[Schedule] Failed to cancel schedule:", schedErr);
    } else if (inq.requestType === "Shift Swap" && inq.preferredDate) {
      const { error: schedErr } = await supabase
        .from("schedule")
        .update({ ShiftDate: inq.preferredDate })
        .eq("EmployeeId", inq.employeeId)
        .eq("ShiftDate", inq.requestDate);
      if (schedErr) console.error("[Schedule] Failed to swap shift:", schedErr);
    }
  }

  showToast(
    `Inquiry ${status === "Approved" ? "approved" : "denied"}.`,
    "success",
  );
  await fetchChangeInquiries();
};

const fetchEmployees = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_EMPLOYEES);
    if (cached) {
      employeeList.value = cached;
      const staffCached = loadCache(CACHE_KEY_STAFF);
      if (staffCached) {
        staffMembers.value = staffCached;
        employeesLoading.value = false;
        staffLoading.value = false;
        return;
      }
    }
  }
  employeesLoading.value = true;
  staffLoading.value = true;
  let query = supabase
    .from("employee")
    .select("EmployeeId, FirstName, LastName, Email, Phone, Position, Department, HourlyRate, Address, ContactInfo, DateHired, BranchAssigned, Status");
  if (managerBranchId.value) {
    query = query.eq("BranchAssigned", managerBranchId.value);
  }
  const { data, error } = await query.order("FirstName");
  if (error) {
    console.error("[Schedule] fetchEmployees failed:", error);
    employeeList.value = [];
    staffMembers.value = [];
    employeesLoading.value = false;
    staffLoading.value = false;
    return;
  }
  if (data) {
    const branchIds = [...new Set(data.filter(e => e.BranchAssigned).map(e => e.BranchAssigned))];
    let branchMap = {};
    if (branchIds.length) {
      const { data: bData } = await supabase.from("branch").select("BranchId, BranchName").in("BranchId", branchIds);
      if (bData) bData.forEach(b => { branchMap[b.BranchId] = b.BranchName; });
    }
    employeeList.value = data.map((e) => ({
      id: e.EmployeeId,
      name: `${e.FirstName} ${e.LastName}`,
      branchAssigned: e.BranchAssigned,
      position: e.Position,
      status: e.Status,
    }));
    staffMembers.value = data.map((e) => ({
      id: e.EmployeeId,
      firstName: e.FirstName || "",
      lastName: e.LastName || "",
      email: e.Email || "",
      phone: e.Phone || e.ContactInfo || "",
      position: e.Position || "",
      department: e.Department || "",
      hourlyRate: e.HourlyRate || 0,
      address: e.Address || "",
      dateHired: e.DateHired || "",
      branchId: e.BranchAssigned || null,
      branchName: branchMap[e.BranchAssigned] || "—",
      status: e.Status || "Active",
    }));
    const depts = [...new Set(staffMembers.value.map(e => e.department).filter(Boolean))];
    staffDepartments.value = depts.sort();
    saveCache(CACHE_KEY_EMPLOYEES, employeeList.value);
    saveCache(CACHE_KEY_STAFF, staffMembers.value);
  }
  employeesLoading.value = false;
  staffLoading.value = false;
};

const fetchAvailability = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_AVAILABILITY);
    if (cached) {
      availability.value = cached;
      return;
    }
  }
  const since = availabilitySinceDate(30);
  const { data } = await supabase
    .from("availability")
    .select(
      "availabilityid, employeeid, availabledate, starttime, endtime, notes, status, employee!inner(FirstName, LastName, Position, BranchAssigned)",
    )
    .eq("employee.BranchAssigned", managerBranchId.value)
    .gte("availabledate", since)
    .order("availabilityid", { ascending: false })
    .limit(200);

  if (data) {
    availability.value = data.map((a) => {
      const emp = a.employee;
      return {
        id: a.availabilityid,
        employeeId: a.employeeid,
        employeeName: emp
          ? `${emp.FirstName || ""} ${emp.LastName || ""}`.trim() || "Unknown"
          : "Unknown",
        initials: emp
          ? `${(emp.FirstName || "")[0] || ""}${(emp.LastName || "")[0] || ""}`.toUpperCase() || "?"
          : "?",
        role: emp?.Position || "—",
        branchId: emp?.BranchAssigned || null,
        availableDate: normalizeDateKey(a.availabledate),
        startTime: normalizeTime(a.starttime),
        endTime: normalizeTime(a.endtime),
        notes: a.notes,
        status: a.status || "Pending",
      };
    });
    saveCache(CACHE_KEY_AVAILABILITY, availability.value);
  }
};

const fetchChangeInquiries = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_INQUIRIES);
    if (cached) {
      changeInquiries.value = cached;
      return;
    }
  }
  const { data: branchEmps } = await supabase
    .from("employee")
    .select("EmployeeId, FirstName, LastName, Position")
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
        role: e.Position || "—",
        branchId: managerBranchId.value,
      };
    });
  }

  if (!empIds.length) {
    changeInquiries.value = [];
    return;
  }

  const { data, error } = await supabase
    .from("changeinquiry")
    .select("*")
    .in("employeeid", empIds)
    .order("inquiryid", { ascending: false });

  if (error) {
    console.error("[Schedule] fetchChangeInquiries failed:", error);
    showToast("Failed to load change inquiries.", "error");
    changeInquiries.value = [];
    return;
  }

  if (data) {
    changeInquiries.value = data.map((c) => {
      const emp = empMap[c.employeeid];
      return {
        id: c.inquiryid,
        employeeId: c.employeeid,
        employeeName: emp?.name || "Unknown",
        initials: emp?.initials || "?",
        role: emp?.role || "—",
        branchId: emp?.branchId || null,
        requestDate: c.requestdate,
        requestType: c.requesttype || "Shift Change",
        preferredDate: c.preferreddate,
        reason: c.reason,
        status: c.status,
        managerNote: c.managernote,
      };
    });
    saveCache(CACHE_KEY_INQUIRIES, changeInquiries.value);
  }
};

const fetchResetRequests = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_RESET_REQUESTS);
    if (cached) {
      resetRequests.value = cached;
      return;
    }
  }

  const { data: branchEmps } = await supabase
    .from("employee")
    .select("EmployeeId")
    .eq("BranchAssigned", managerBranchId.value);

  const empIds = (branchEmps || []).map((e) => e.EmployeeId);

  if (!empIds.length) {
    resetRequests.value = [];
    return;
  }

  const { data, error } = await supabase
    .from("passwordresetrequests")
    .select("*")
    .in("employee_id", empIds)
    .order("requested_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[ShiftManagement] fetchResetRequests failed:", error);
    return;
  }

  resetRequests.value = (data || []).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    username: r.username,
    role: r.role,
    branchId: managerBranchId.value,
    status: r.status,
    requestedAt: r.requested_at,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    initials:
      r.username
        .split(".")
        .map((p) => (p[0] || "").toUpperCase())
        .join("")
        .slice(0, 2) || "?",
  }));

  saveCache(CACHE_KEY_RESET_REQUESTS, resetRequests.value);
};

const openResetConfirm = (req) => {
  resetTarget.value = req;
  resetAdminPassword.value = "";
  resetConfirmError.value = "";
  showResetAdminPw.value = false;
  showResetConfirm.value = true;
};

const confirmReset = async () => {
  resetConfirmError.value = "";

  if (!resetAdminPassword.value) {
    resetConfirmError.value = "Please enter your password.";
    return;
  }

  resetSaving.value = true;

  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(resetAdminPassword.value),
    );
    const hashedInput = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const managerUsername = localStorage.getItem("username");
    const { data: managerUser, error: managerErr } = await supabase
      .from("users")
      .select("id, password, role")
      .eq("username", managerUsername)
      .maybeSingle();

    if (managerErr || !managerUser) {
      resetConfirmError.value = "Could not verify your account.";
      return;
    }

    if (!["admin", "manager"].includes(managerUser.role)) {
      resetConfirmError.value =
        "You do not have permission to reset passwords.";
      return;
    }

    if (managerUser.password !== hashedInput) {
      resetConfirmError.value = "Incorrect password. Please try again.";
      return;
    }

    const defaultPassword =
      resetTarget.value.role === "staff" ? "Staff@1234" : "Manager@1234";
    const defaultHashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(defaultPassword),
    );
    const hashedDefault = Array.from(new Uint8Array(defaultHashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: updateErr } = await supabase
      .from("users")
      .update({ password: hashedDefault })
      .eq("username", resetTarget.value.username);

    if (updateErr) throw updateErr;

    const now = new Date().toISOString();
    const { error: resolveErr } = await supabase
      .from("passwordresetrequests")
      .update({
        status: "Resolved",
        resolved_at: now,
        resolved_by: managerUsername,
      })
      .eq("id", resetTarget.value.id);

    if (resolveErr) throw resolveErr;

    sessionStorage.removeItem(CACHE_KEY_RESET_REQUESTS);
    showResetConfirm.value = false;
    showToast(`Password reset for ${resetTarget.value.username}.`, "success");
    resetTarget.value = null;
    await fetchResetRequests(true);
  } catch (err) {
    console.error("[ShiftManagement] confirmReset failed:", err);
    resetConfirmError.value = "Something went wrong. Please try again.";
  } finally {
    resetSaving.value = false;
  }
};

const dismissResetRequest = async (req) => {
  const { error } = await supabase
    .from("passwordresetrequests")
    .update({
      status: "Dismissed",
      resolved_at: new Date().toISOString(),
      resolved_by: localStorage.getItem("username") || "manager",
    })
    .eq("id", req.id);

  if (error) {
    showToast("Failed to dismiss request.", "error");
    return;
  }

  sessionStorage.removeItem(CACHE_KEY_RESET_REQUESTS);
  showToast("Request dismissed.", "success");
  await fetchResetRequests(true);
};

const fetchSchedules = async (force = false) => {
  if (!force) {
    const cached = loadCache(CACHE_KEY_SCHEDULES);
    if (cached) {
      schedules.value = cached;
      return;
    }
  }
  const { data } = await supabase
    .from("schedule")
    .select(
      "ScheduleId, EmployeeId, Role, ShiftDate, StartTime, EndTime, Status, BranchId, employee(FirstName, LastName)",
    )
    .eq("BranchId", managerBranchId.value)
    .neq("Status", "Cancelled")
    .neq("Status", "Archived")
    .gte("ShiftDate", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0])
    .lte("ShiftDate", new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString().split("T")[0])
    .order("ScheduleId", { ascending: false });

  if (data) {
    console.log("[Cache] saving schedules, count:", data.length);
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
    saveCache(CACHE_KEY_SCHEDULES, schedules.value);
  }
};

const onEmployeeSelected = () => {
  const emp = employeeList.value.find((e) => e.id === form.value.employeeId);
  if (!emp) return;
  form.value.branchId = emp.branchAssigned || managerBranchId.value;
  form.value.role = emp.position || "";
  showRoleOverride.value = false;
};

const filteredEmployeeList = computed(() => {
  const list = employeeList.value.filter((e) => e.status === "Active");
  const q = staffSearchText.value.toLowerCase().trim();
  if (!q) return list;
  return list.filter((e) => e.name.toLowerCase().includes(q));
});

const selectedEmployeeName = computed(() => {
  if (!form.value.employeeId) return "";
  const emp = employeeList.value.find((e) => e.id === form.value.employeeId);
  return emp ? emp.name : "";
});

const selectStaff = (emp) => {
  form.value.employeeId = emp.id;
  staffSearchText.value = emp.name;
  staffDropdownOpen.value = false;
  staffHighlightIndex.value = -1;
  onEmployeeSelected();
};

const onDocumentClick = (e) => {
  if (
    staffDropdownOpen.value &&
    staffSearchInputRef.value &&
    !staffSearchInputRef.value.contains(e.target)
  ) {
    staffDropdownOpen.value = false;
    if (form.value.employeeId) {
      staffSearchText.value = selectedEmployeeName.value;
    }
  }
};

const onStaffSearchFocus = () => {
  staffDropdownOpen.value = true;
};

const onStaffSearchBlur = () => {
  setTimeout(() => {
    staffDropdownOpen.value = false;
    if (form.value.employeeId) {
      staffSearchText.value = selectedEmployeeName.value;
    }
  }, 150);
};

const onStaffSearchInput = () => {
  staffDropdownOpen.value = true;
  staffHighlightIndex.value = -1;
  if (!staffSearchText.value && form.value.employeeId) {
    form.value.employeeId = "";
  }
};

const onStaffSearchKeydown = (e) => {
  const items = filteredEmployeeList.value;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    staffHighlightIndex.value =
      staffHighlightIndex.value < items.length - 1
        ? staffHighlightIndex.value + 1
        : 0;
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    staffHighlightIndex.value =
      staffHighlightIndex.value > 0
        ? staffHighlightIndex.value - 1
        : items.length - 1;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (
      staffHighlightIndex.value >= 0 &&
      staffHighlightIndex.value < items.length
    ) {
      selectStaff(items[staffHighlightIndex.value]);
    }
  } else if (e.key === "Escape") {
    staffDropdownOpen.value = false;
    staffHighlightIndex.value = -1;
  }
};

const switchTab = (key) => {
  if (activeTab.value !== key) fadingIds.value = new Set();
  activeTab.value = key;
  if (key === "change") {
    fetchChangeInquiries(true);
    fetchResetRequests(true);
  }
  if (key === "availability") fetchAvailability(true);
  if (key === "schedule") fetchSchedules(true);
};

const openDayDetail = (day) => {
  activeDayDetailPeriod.value = 'all';
  showDayDetail.value = day;
  nextTick(async () => {
    const bids = new Set((day.shifts || []).map((s) => s.branchId));
    for (const bid of bids) {
      if (!(bid in periodsByBranch.value) || !periodsByBranch.value[bid].length) {
        await fetchPeriods(bid);
      }
    }
  });
};

const selectPeriod = (p) => {
  form.value.startTime = p.starttime?.slice(0, 5) || "";
  form.value.endTime = p.endtime?.slice(0, 5) || "";
};

const closeDayDetail = () => {
  showDayDetail.value = null;
};

const openCreateFromGrid = async (branchId, role) => {
  if (isPastDate(showDayDetail.value?.dateStr)) return;
  const dateStr = showDayDetail.value?.dateStr;
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
  if (!hoursByBranch.value[branchId]) {
    await fetchOperatingHours(branchId);
  }
  const oh = getHoursForDay(branchId, dayOfWeek);
  if (oh && !oh.isOpen) {
    showToast("Branch is closed on this day.", "error");
    return;
  }
  dayDetailBackup.value = showDayDetail.value;
  closeDayDetail();
  openCreateModal(dateStr, branchId, role, true);
};

const openCreateModal = async (dateStr, branchId, role, locked) => {
  if (employeesLoading.value) {
    showToast("Staff list is still loading. Please wait.", "error");
    return;
  }
  form.value = emptyForm();
  form.value.branchId = branchId || managerBranchId.value;
  if (locked) form.value.branchLocked = true;
  if (dateStr) form.value.shiftDate = dateStr;
  if (role) form.value.role = role;
  if (!employeeList.value.length) {
    showToast("No staff found in the system.", "error");
    return;
  }
  if (form.value.branchId) {
    if (!hoursByBranch.value[form.value.branchId]) {
      await fetchOperatingHours(form.value.branchId);
    }
    if (!periodsByBranch.value[form.value.branchId]?.length) {
      await fetchPeriods(form.value.branchId);
    }
  }
  errors.value = {};
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (sched) => {
  form.value = { ...sched };
  errors.value = {};
  isEditing.value = true;
  showModal.value = true;
  if (form.value.branchId && !periodsByBranch.value[form.value.branchId]?.length) {
    fetchPeriods(form.value.branchId);
  }
};

const closeModal = () => {
  showModal.value = false;
  if (dayDetailBackup.value) {
    showDayDetail.value = dayDetailBackup.value;
    dayDetailBackup.value = null;
  }
};

const validate = () => {
  const e = {};
  if (!form.value.employeeId) e.employeeId = "Staff is required.";
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
  if (form.value.shiftDate && form.value.shiftDate < today && !isPastEdit.value)
    e.shiftDate = "Shift date cannot be in the past.";
  if (!isPastEdit.value) {
    if (form.value.shiftDate && form.value.shiftDate > maxDateStr.value)
      e.shiftDate = "Shift date cannot be more than 60 days from today.";
    if (form.value.shiftDate === today && form.value.startTime) {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      if (form.value.startTime <= `${currentH}:${currentM}`)
        e.startTime = "Start time must be after the current time for today's shifts.";
    }
    const oh = formOperatingHours.value;
    if (oh) {
      if (!oh.isOpen) {
        e.shiftDate = "Branch is closed on this day.";
      } else {
        if (form.value.startTime && form.value.startTime < oh.openTime)
          e.startTime = `Start time must be at or after opening (${oh.openTime}).`;
        if (form.value.endTime && form.value.endTime > oh.closeTime)
          e.endTime = `End time must be at or before closing (${oh.closeTime}).`;
      }
    }
    if ((form.value.startTime || form.value.endTime) && form.value.branchId) {
      const periods = periodsByBranch.value[form.value.branchId];
      if (periods?.length && form.value.startTime) {
        const match = periods.find(p =>
          p.starttime && form.value.startTime >= p.starttime.slice(0, 5) && form.value.startTime < p.endtime.slice(0, 5)
        );
        if (!match && !e.startTime) {
          e.startTime = "Shift does not fall within any defined shift period.";
        } else if (match && form.value.endTime && form.value.endTime > match.endtime.slice(0, 5) && !e.endTime) {
          e.endTime = `End time must not exceed period end (${match.endtime.slice(0, 5)}).`;
        }
      }
    }
  }
  errors.value = e;
  return Object.keys(e).length === 0;
};

const showRoleCapModal = ref(false);
const roleCapInfo = ref(null);

const checkRoleCap = async (
  date,
  role,
  startTime,
  endTime,
  excludeId = null,
) => {
  const { data } = await supabase
    .from("schedule")
    .select("ScheduleId, StartTime, EndTime, EmployeeId, employee(FirstName, LastName)")
    .eq("ShiftDate", date)
    .eq("Role", role)
    .eq("BranchId", managerBranchId.value)
    .neq("Status", "Cancelled")
    .neq("Status", "Archived");

  if (!data) return { count: 0, staff: [] };
  let count = 0;
  const staff = [];
  for (const s of data) {
    if (excludeId && s.ScheduleId === excludeId) continue;
    if (timesOverlap(startTime, endTime, s.StartTime, s.EndTime)) {
      count++;
      const empName = s.employee
        ? `${s.employee.FirstName || ""} ${s.employee.LastName || ""}`.trim()
        : `Employee #${s.EmployeeId}`;
      staff.push({
        name: empName,
        startTime: normalizeTime(s.StartTime),
        endTime: normalizeTime(s.EndTime),
      });
    }
  }
  return { count, staff };
};

const checkEmployeeConflict = async () => {
  const eid = form.value.employeeId;
  const date = form.value.shiftDate;
  if (!eid || !date) {
    employeeConflictMsg.value = "";
    return;
  }
  const { data } = await supabase
    .from("schedule")
    .select("ScheduleId, StartTime, EndTime, Role")
    .eq("EmployeeId", eid)
    .eq("ShiftDate", date)
    .neq("Status", "Cancelled")
    .neq("Status", "Archived");
  if (!data || data.length === 0) {
    employeeConflictMsg.value = "";
    return;
  }
  const newStart = form.value.startTime;
  const newEnd = form.value.endTime;
  if (newStart && newEnd) {
    for (const existing of data) {
      if (isEditing.value && existing.ScheduleId === form.value.id) continue;
      if (timesOverlap(newStart, newEnd, normalizeTime(existing.StartTime), normalizeTime(existing.EndTime))) {
        employeeConflictMsg.value = `⚠ This staff already has a shift on this date from ${normalizeTime(existing.StartTime)}–${normalizeTime(existing.EndTime)} (${existing.Role}).`;
        return;
      }
    }
    employeeConflictMsg.value = "";
  } else {
    const names = data.map(s => `${normalizeTime(s.StartTime)}–${normalizeTime(s.EndTime)} (${s.Role})`).join(", ");
    employeeConflictMsg.value = `⚠ Already has ${data.length} shift(s) on this date: ${names}.`;
  }
};

watch([() => form.value.employeeId, () => form.value.shiftDate, () => form.value.startTime, () => form.value.endTime], () => {
  if (form.value.employeeId && form.value.shiftDate) checkEmployeeConflict();
  else employeeConflictMsg.value = "";
}, { immediate: false });

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
    // Duplicate guard — exact same shift already exists
    if (form.value.employeeId && form.value.shiftDate && form.value.startTime && form.value.endTime && form.value.role) {
      let dupQuery = supabase
        .from("schedule")
        .select("ScheduleId")
        .eq("EmployeeId", form.value.employeeId)
        .eq("ShiftDate", form.value.shiftDate)
        .eq("StartTime", form.value.startTime)
        .eq("EndTime", form.value.endTime)
        .eq("Role", form.value.role)
        .eq("BranchId", managerBranchId.value)
        .neq("Status", "Cancelled")
        .neq("Status", "Archived");
      if (isEditing.value) dupQuery = dupQuery.neq("ScheduleId", form.value.id);
      const { data: dupData } = await dupQuery.maybeSingle();
      if (dupData) {
        showToast("This shift is a duplicate of an existing schedule.", "error");
        return;
      }
    }

    const conflict = await checkScheduleConflict();
    if (conflict && !overrideConflict) {
      conflictInfo.value = conflict;
      showConflictConfirm.value = true;
      return;
    }

    const { count: roleCount, staff: roleStaff } = await checkRoleCap(
      form.value.shiftDate,
      form.value.role,
      form.value.startTime,
      form.value.endTime,
      isEditing.value ? form.value.id : null,
    );
    let cap = 2;
    if (form.value.startTime) {
      const periods = periodsByBranch.value[form.value.branchId];
      if (periods?.length) {
        const match = periods.find(p =>
          p.starttime && form.value.startTime >= p.starttime.slice(0, 5) && form.value.startTime < p.endtime.slice(0, 5)
        );
        if (match?.maxperrole) cap = form.value.role === 'Manager' ? 1 : match.maxperrole;
      }
    }
    if (form.value.role === 'Manager') cap = 1;
    if (roleCount >= cap) {
      roleCapInfo.value = {
        role: form.value.role,
        count: roleCount,
        cap,
        staff: roleStaff,
      };
      showRoleCapModal.value = true;
      return;
    }

    // Snapshot old values before updating (for notification)
    const oldValues = isEditing.value ? { ...form.value } : null;

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

      // Insert shift change notification for the affected employee
      if (oldValues) {
        const emp = employeeList.value.find(e => e.id === oldValues.employeeId);
        const empName = emp ? emp.name : `Employee #${oldValues.employeeId}`;
        const oldStart = oldValues.startTime;
        const oldEnd = oldValues.endTime;
        const oldDate = oldValues.shiftDate;
        const oldRole = oldValues.role;
        const newStart = form.value.startTime;
        const newEnd = form.value.endTime;
        const newDate = form.value.shiftDate;
        const newRole = form.value.role;
        const message = `Your shift changed from ${oldDate} ${oldStart}–${oldEnd} (${oldRole}) to ${newDate} ${newStart}–${newEnd} (${newRole}).`;
        await supabase.from("notifications").insert({
          role: 'staff',
          branch_id: managerBranchId.value,
          employee_id: form.value.employeeId,
          category: 'schedule_change',
          title: 'Schedule Updated',
          message,
          severity: 'medium',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      // Cancellation notification
      if (oldValues && oldValues.status !== 'Cancelled' && form.value.status === 'Cancelled') {
        const empName2 = employeeList.value.find(e => e.id === form.value.employeeId)?.name || `Employee #${form.value.employeeId}`;
        const cancelMsg = `Your shift on ${form.value.shiftDate} (${form.value.startTime}–${form.value.endTime}, ${form.value.role}) has been cancelled.`;
        await supabase.from("notifications").insert({
          role: 'staff',
          branch_id: managerBranchId.value,
          employee_id: form.value.employeeId,
          category: 'schedule_change',
          title: 'Schedule Cancelled',
          message: cancelMsg,
          severity: 'high',
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }

      showToast("Schedule updated and staff notified.", "success");
    } else {
      const { error } = await supabase.from("schedule").insert([payload]);
      if (error) throw error;
      showToast("Schedule created.", "success");
    }

    sessionStorage.removeItem(CACHE_KEY_SCHEDULES);
    await fetchSchedules(true);
    showConflictConfirm.value = false;
    conflictInfo.value = null;
    dayDetailBackup.value = null;
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

const changeShift = () => {
  showRoleCapModal.value = false;
  nextTick(() => {
    const dateInput = document.querySelector('.modal-panel input[type="date"]');
    if (dateInput) dateInput.focus();
  });
};

const isPastDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
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

  showDeleteConfirm.value = false;

  if (error) {
    showToast("Failed to archive schedule: " + error.message, "error");
    return;
  }
  sessionStorage.removeItem(CACHE_KEY_SCHEDULES);
  showToast("Schedule archived.", "success");
  await fetchSchedules();
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

      const dayOfWeek = new Date(avail.availableDate + "T12:00:00").getDay();
      if (!hoursByBranch.value[managerBranchId.value]) {
        await fetchOperatingHours(managerBranchId.value);
      }
      const availOh = getHoursForDay(managerBranchId.value, dayOfWeek);
      if (availOh) {
        if (!availOh.isOpen) {
          throw new Error("Cannot approve: branch is closed on this date.");
        }
        if (avail.startTime < availOh.openTime) {
          throw new Error(`Cannot approve: start time (${avail.startTime}) is before opening (${availOh.openTime}).`);
        }
        if (avail.endTime > availOh.closeTime) {
          throw new Error(`Cannot approve: end time (${avail.endTime}) is after closing (${availOh.closeTime}).`);
        }
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
              `Staff already has a shift from ${normalizeTime(existing.StartTime)}–${normalizeTime(existing.EndTime)} (${existing.Role}) on this date.`,
            );
          }
        }
      }

      const { data: emp } = await supabase
        .from("employee")
        .select("Position")
        .eq("EmployeeId", avail.employeeId)
        .maybeSingle();

      const roleToUse =
        avail.role !== "—" ? avail.role : emp?.Position || "Staff";
      const { count: roleCount } = await checkRoleCap(
        avail.availableDate,
        roleToUse,
        avail.startTime,
        avail.endTime,
      );
      let availCap = roleToUse === 'Manager' ? 1 : 2;
      if (avail.startTime) {
        const periods = periodsByBranch.value[managerBranchId.value];
        if (periods?.length) {
          const match = periods.find(p =>
            p.starttime && avail.startTime >= p.starttime.slice(0, 5) && avail.startTime < p.endtime.slice(0, 5)
          );
          if (match?.maxperrole) availCap = roleToUse === 'Manager' ? 1 : match.maxperrole;
        }
      }
      if (roleCount >= availCap) {
        throw new Error(
          `Role "${roleToUse}" already has ${roleCount} staff scheduled for this shift (max ${availCap} per role).`,
        );
      }

      const { error: schedErr } = await supabase.from("schedule").insert([
        {
          EmployeeId: avail.employeeId,
          Role: roleToUse,
          ShiftDate: avail.availableDate,
          StartTime: avail.startTime,
          EndTime: avail.endTime,
          Status: "Scheduled",
          BranchId: managerBranchId.value,
          BasedOnAvailabilityId: avail.id,
        },
      ]);

      if (schedErr) throw schedErr;
      sessionStorage.removeItem(CACHE_KEY_AVAILABILITY);
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

const setTodayFilter = () => {
  schedDateMode.value = "today";
};

const clearSchedFilters = () => {
  schedSearchInput.value = "";
  schedSearch.value = "";
  schedDateMode.value = "all";
  schedDateFilter.value = "";
  schedRangeStart.value = "";
  schedRangeEnd.value = "";
  schedStatusFilter.value = "";
};

const branchName = (id) => {
  if (id == null || id === "") return "—";
  const match = branches.value.find((b) => String(b.id) === String(id));
  return match?.name || `Branch #${id}`;
};

const branchColor = (branchId) => {
  const colors = [
    "#7B2D2D",
    "#0D6E6E",
    "#6B3FA0",
    "#B8860B",
    "#1E6B4F",
    "#A0522D",
  ];
  return colors[branchId % colors.length];
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

watch(showModal, (val) => {
  if (val) {
    nextTick(() => {
      if (form.value.employeeId) {
        const emp = employeeList.value.find(
          (e) => e.id === form.value.employeeId,
        );
        staffSearchText.value = emp ? emp.name : "";
      } else {
        staffSearchText.value = "";
      }
      staffDropdownOpen.value = false;
      staffHighlightIndex.value = -1;
    });
  }
});

onMounted(async () => {
  if (
    performance.getEntriesByType("navigation").length &&
    performance.getEntriesByType("navigation")[0].type === "reload"
  ) {
    [
      CACHE_KEY_SCHEDULES,
      CACHE_KEY_AVAILABILITY,
      CACHE_KEY_BRANCHES,
      CACHE_KEY_EMPLOYEES,
      CACHE_KEY_INQUIRIES,
      CACHE_KEY_RESET_REQUESTS,
    ].forEach((k) => sessionStorage.removeItem(k));
  }

  await resolveBranch();
  managerBranchId.value = userBranchId.value
    ? Number(userBranchId.value)
    : null;

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
    fetchResetRequests(),
  ]);
  isLoading.value = false;
});
</script>

<style scoped>
.schedule-page {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
  overflow-x: hidden;
  min-width: 0;
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
  background: var(--brand-primary);
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
.avail-branch {
  font-size: 0.76rem;
  color: var(--text-muted);
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

.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.25rem;
  display: block;
}

/* ── CALENDAR VIEW ───────────────────────────────────────── */
.calendar-container {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow-x: auto;
  box-shadow: var(--shadow);
}
.calendar-header,
.calendar-grid {
  min-width: 840px;
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
  cursor: pointer;
  min-height: 120px;
  min-width: 0;
  padding: 0.75rem;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70px;
}

/* Overflow pill */
.overflow-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: #5d4037;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  margin-top: 0.15rem;
}
.overflow-pill:hover {
  opacity: 0.85;
}
.overflow-pill-label {
  white-space: nowrap;
}
.overflow-pill-avatars {
  display: flex;
  align-items: center;
}
.overflow-pill-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 0.5rem;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #5d4037;
  margin-left: -4px;
}
.overflow-pill-avatar:first-child {
  margin-left: 0;
}

/* Day detail modal */
.modal-panel--day-detail {
  max-width: 900px;
  width: 92vw;
}
.modal-panel-body--day-detail {
  overflow: hidden;
}
.dtd-grid-scroll {
  overflow-x: auto;
  max-height: 520px;
  overflow-y: auto;
}
.dtd-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.dtd-grid th,
.dtd-grid td {
  padding: 0.4rem 0.6rem;
  border: 1px solid #f0ebe8;
  text-align: left;
  vertical-align: top;
}
.dtd-th-role {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #f9fafb;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  min-width: 90px;
}
.dtd-th-branch {
  min-width: 150px;
  font-weight: 600;
  color: #4a4a4a;
  background: #f9fafb;
  border-top: 3px solid transparent;
  white-space: nowrap;
}
.dtd-td-role {
  position: sticky;
  left: 0;
  z-index: 1;
  background: #fff;
  font-weight: 600;
  color: #5d4037;
  font-size: 0.78rem;
}
.dtd-td-cell {
  min-width: 150px;
}
.dtd-cell-card {
  padding: 0.3rem 0;
  cursor: pointer;
  position: relative;
  border-radius: 4px;
  transition: background 0.1s;
}
.dtd-cell-card:hover {
  background: #f5f0ed;
}
.dtd-cell-card + .dtd-cell-card {
  border-top: 1px solid #f0ebe8;
}
.dtd-cell-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a1a1a;
}
.dtd-cell-time {
  font-size: 0.72rem;
  color: #5d4037;
  font-weight: 600;
}
.dtd-cell-actions {
  display: none;
  gap: 3px;
  margin-top: 2px;
}
.dtd-cell-card:hover .dtd-cell-actions {
  display: flex;
}
.dtd-cell-actions button {
  background: #f5f0ed;
  border: none;
  color: #5d4037;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-size: 0.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.dtd-cell-actions button:hover {
  background: #5d4037;
  color: #fff;
}
.dtd-cell-add-btn {
  background: #e8f5e9 !important;
  color: #2e7d32 !important;
}
.dtd-cell-add-btn:hover {
  background: #2e7d32 !important;
  color: #fff !important;
}
.dtd-cell-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
  color: #bbb;
  font-size: 0.85rem;
}
.dtd-cell-empty:hover {
  background: #f5f5f5;
  color: #5d4037;
}
.dtd-cell-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px dashed #ccc;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  transition: all 0.15s;
}
.dtd-cell-empty:hover .dtd-cell-empty-icon {
  border-color: #5d4037;
  color: #5d4037;
}
.day-detail-empty {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #9ca3af;
}
.day-detail-empty i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}
.day-detail-empty p {
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.dtd-period-tab-bar {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0ebe8;
}
.dtd-period-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid #e0dbd8;
  background: #fafafa;
  font-size: 0.78rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}
.dtd-period-tab:hover {
  border-color: #5d4037;
  color: #5d4037;
}
.dtd-period-tab.active {
  background: #5d4037;
  border-color: #5d4037;
  color: #fff;
}
.dtd-tab-time {
  font-weight: 400;
  font-size: 0.7rem;
  opacity: 0.8;
}
.dtd-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(0,0,0,0.12);
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
}
.dtd-period-tab.active .dtd-tab-count {
  background: rgba(255,255,255,0.25);
}
.dtd-cell-empty-past {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  color: #d1d5db;
  font-size: 1rem;
}
.dtd-cap-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
  padding: 1px 6px;
  background: #f3f4f6;
  border-radius: 4px;
}
.dtd-cap-badge.cap-full {
  color: #b45309;
  background: #fffbeb;
}
.dtd-cap-badge .cap-full-label {
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 0.03em;
  color: #b45309;
}
.dtd-cell-full-label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  color: #d1d5db;
  font-size: 0.75rem;
  font-weight: 600;
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

/* (legend CSS removed) */

.branch-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  vertical-align: middle;
  margin-right: 4px;
  flex-shrink: 0;
}
/* ── Staff tab ──────────────────────────────────────────── */
.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #f5ede8;
  color: #7b1d1d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
}
.stat-info h3 {
  font-size: 0.73rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.1rem 0;
}
.stat-value {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
}
.stat-trend {
  font-size: 0.68rem;
  color: #6b7280;
}
.search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 0.85rem;
}
.search-input {
  padding-left: 30px;
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
}
.filter-select {
  font-size: 0.84rem;
  border-color: var(--border);
  border-radius: 6px;
  width: auto;
  min-width: 140px;
}
.emp-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.emp-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.emp-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid #f5f0ed;
}
.emp-info {
  flex: 1;
  min-width: 0;
}
.emp-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.emp-position {
  font-size: 0.73rem;
  color: #6b7280;
  margin-top: 0.1rem;
}
.emp-actions {
  display: flex;
  gap: 0.25rem;
}
.emp-card-body {
  padding: 0.75rem 1rem;
}
.emp-detail {
  font-size: 0.78rem;
  color: #6b7280;
  padding: 0.2rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.emp-detail i {
  width: 14px;
  font-size: 0.72rem;
}
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}
.empty-state-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: #f5f0ed;
  border-radius: 50%;
  font-size: 2.5rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}
.empty-state-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}
.empty-state-description {
  font-size: 0.85rem;
  color: #6b7280;
}

/* ── SPLIT LAYOUT ───────────────────────────────────────── */
.split-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  min-height: calc(100vh - 140px);
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

/* LEFT PANEL */
.left-panel {
  width: 35%;
  min-width: 280px;
  max-width: 420px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 140px);
}

.left-tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.75rem 0.75rem 0;
  border-bottom: 1px solid var(--border);
  background: #fafafa;
}

.left-tab-btn {
  background: none;
  border: none;
  border-radius: 6px 6px 0 0;
  padding: 0.4rem 0.7rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.left-tab-btn:hover {
  color: var(--brand-primary);
}
.left-tab-btn.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
}

.left-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem;
}

.left-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #1a1a1a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* RIGHT PANEL */
.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.cal-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  box-shadow: var(--shadow);
}
.cal-month-label {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
  min-width: 160px;
  text-align: center;
}

/* Staff list rows in left panel */
.staff-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.emp-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #f0ebe8;
  background: #fafafa;
  transition: background 0.15s;
}
.emp-row:hover {
  background: #f5f0ed;
}
.emp-row-info {
  flex: 1;
  min-width: 0;
}
.emp-row-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.emp-row-pos {
  font-size: 0.7rem;
  color: #6b7280;
}
.emp-row-actions {
  display: flex;
  gap: 0.2rem;
}

/* Avail cards in left panel */
.avail-card {
  background: #fafafa;
  border: 1px solid #f0ebe8;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  margin-bottom: 0.5rem;
}
.avail-card-top {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}
.avail-card-info {
  flex: 1;
  min-width: 0;
}
.avail-card-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

/* Schedule card list in left panel */
.sched-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.sched-list-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.7rem;
  background: #fafafa;
  border: 1px solid #f0ebe8;
  border-radius: 8px;
  transition: background 0.15s;
}
.sched-list-card:hover {
  background: #f5f0ed;
}
.sched-list-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.72rem;
  flex-shrink: 0;
}
.sched-list-info {
  flex: 1;
  min-width: 0;
}
.sched-list-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #1a1a1a;
}
.sched-list-meta {
  font-size: 0.72rem;
  color: #6b7280;
}

/* Mini stat cards */
.mini-stat-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.65rem;
  background: #fafafa;
  border: 1px solid #f0ebe8;
  border-radius: 8px;
}
.mini-stat-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #f5ede8;
  color: #7b1d1d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.mini-stat-value {
  font-size: 1rem;
  font-weight: 800;
  color: #1a1a1a;
}
.mini-stat-label {
  font-size: 0.68rem;
  color: #6b7280;
}

/* Empty state in left panel */
.empty-left {
  text-align: center;
  padding: 2rem 1rem;
  color: #9ca3af;
}
.empty-left i {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 0.5rem;
}
.empty-left p {
  font-size: 0.8rem;
  margin: 0;
}

/* Responsive */
.staff-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1060;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: var(--shadow);
  list-style: none;
  padding: 0.25rem 0;
  margin: 2px 0 0;
}
.staff-dropdown li {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-main);
}
.staff-dropdown li:hover,
.staff-dropdown li.active {
  background: #f5f0ed;
  color: var(--brand-primary);
}
.staff-dropdown li.no-match {
  cursor: default;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .split-layout {
    flex-direction: column;
  }
  .left-panel {
    width: 100%;
    max-width: 100%;
    position: static;
    max-height: 50vh;
  }
}

/* (timeline & matrix CSS removed) */

/* ── OH TAB BAR ─────────────────────────────────────────── */
.oh-tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid #f0ebe8;
  padding: 0 1rem;
  background: #fafafa;
}
.oh-tab-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #888;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.oh-tab-btn:hover {
  color: #5d4037;
}
.oh-tab-btn.active {
  color: #5d4037;
  border-bottom-color: #5d4037;
}

/* ── PERIOD COLUMNS ──────────────────────────────────────── */
.dtd-th-period {
  min-width: 120px;
  font-weight: 600;
  font-size: 0.72rem;
  color: #6b7280;
  background: #fdfdfd;
  text-align: center;
  white-space: nowrap;
  padding: 0.35rem 0.4rem !important;
}
.dtd-th-period .period-icon {
  font-size: 0.85rem;
  margin-right: 2px;
}
.dtd-period-time {
  font-weight: 400;
  color: #9ca3af;
  font-size: 0.65rem;
  display: block;
  margin-top: 1px;
}

.btn-outline-brand {
  background: #fff;
  border: 1px solid var(--brand-primary, #5d4037);
  color: var(--brand-primary, #5d4037);
  border-radius: 8px;
  font-size: 0.82rem;
  padding: 0.35rem 0.85rem;
  transition: all 0.15s;
}
.btn-outline-brand:hover {
  background: var(--brand-primary, #5d4037);
  color: #fff;
}
</style>

<style>
:root {
  --brand-primary: #5d4037;
  --brand-hover: #4e342e;
  --border: #e5e0dd;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
  --text-main: #1a1a1a;
  --text-muted: #6b6b6b;
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
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.22s ease;
  font-family: "Inter", sans-serif;
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

.btn-primary-brand {
  background: #5d4037;
  color: #fff;
  border: none;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
}
.btn-primary-brand:hover:not(:disabled) {
  background: #6d4c41;
  color: #fff;
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
.badge-leave {
  background: #fff3cd;
  color: #856404;
}
.badge-pending {
  background: #fff3cd;
  color: #856404;
}
.badge-inactive {
  background: #f8d7da;
  color: #721c24;
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

.shift-detail-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.shift-detail-employee {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}
.emp-avatar.lg {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
}
.shift-detail-name {
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}
.shift-detail-role {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.shift-detail-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.shift-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}
.shift-detail-row .label {
  font-weight: 600;
  color: var(--text-main);
  font-size: 0.84rem;
}
.shift-detail-row .value {
  color: var(--text-main);
  font-size: 0.84rem;
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
.input-group-modal {
  position: relative;
  display: flex;
  align-items: center;
}
.input-group-modal .form-control {
  padding-right: 40px;
}
.pw-toggle-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  display: flex;
  align-items: center;
}
.pw-toggle-btn:hover {
  color: #1a1a1a;
}
.reset-section-divider {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #5d4037;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 1rem 0 0.6rem;
  padding: 0.5rem 0.6rem;
  background: #f5ede8;
  border-radius: 6px;
  border-left: 3px solid #7b1d1d;
}
.date-mode-pills {
  display: flex;
  gap: 2px;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 2px;
}
.date-pill {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  text-align: center;
}
.date-pill:hover {
  color: #5d4037;
}
.date-pill.active {
  background: #fff;
  color: #5d4037;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.range-sep {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #9ca3af;
  padding: 0 0.25rem;
}
.range-validation-error {
  font-size: 0.72rem;
  color: #dc2626;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #fef2f2;
  border-radius: 4px;
}
.result-count-label {
  font-size: 0.72rem;
  color: #9ca3af;
  font-weight: 600;
}

.reset-card {
  border-left: 3px solid #7b4f3a;
  background: #fdf8f6;
}
.role-cap-staff-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
}
.role-cap-staff-list li {
  font-size: 0.84rem;
  padding: 0.25rem 0;
  color: var(--text-main);
  border-bottom: 1px solid #f0ebe8;
}
.role-cap-staff-list li:last-child {
  border-bottom: none;
}
</style>
