<template>
  <div class="schedule-content">
    <!-- Header -->
    <div class="header-section">
      <div>
        <h1>My Schedule</h1>
        <p class="header-subtitle">
          {{ currentEmployee?.Name || "Staff" }} •
          {{ currentEmployee?.Branch || "Branch" }} •
          {{ currentEmployee?.Position || "Cashier" }}
        </p>
      </div>
      <div class="header-meta">
        <Calendar :size="18" />
        <span>{{ todayLabel }}</span>
      </div>
    </div>

    <div class="split-layout">

      <!-- ══════════════════════════════════════════
           LEFT PANEL
      ═══════════════════════════════════════════ -->
      <div class="left-panel">

        <!-- left-tab strip -->
        <div class="left-tab-bar mb-3">
          <button
            v-for="tab in leftTabs"
            :key="tab.key"
            class="left-tab-btn"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'inquiries' && pendingInquiryCount" class="tab-badge">{{ pendingInquiryCount }}</span>
          </button>
        </div>

        <div class="left-scroll-area">

          <!-- ── SET AVAILABILITY ───────────────── -->
          <div v-if="activeTab === 'availability'" ref="availFormSection">
            <div class="left-section-title mb-2">Set Availability</div>
            <div class="section-subtitle mb-3" style="font-size:0.78rem;color:#6b7280;">
              Let your manager know when you're available
            </div>
            <form class="availability-form" @submit.prevent>
              <div class="form-group">
                <label>Date</label>
                <input type="date" v-model="availForm.Date" :min="todayISO" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Time In</label>
                  <input type="time" v-model="availForm.TimeIn" />
                </div>
                <div class="form-group">
                  <label>Time Out</label>
                  <input type="time" v-model="availForm.TimeOut" />
                </div>
              </div>
              <div class="form-group">
                <label>Notes <span class="optional">(optional)</span></label>
                <textarea
                  rows="2"
                  v-model="availForm.Notes"
                  placeholder="Any notes for the manager…"
                ></textarea>
              </div>
              <button
                type="button"
                class="btn-primary w-full"
                @click="submitAvailability"
                :disabled="savingAvail"
              >
                <span v-if="savingAvail">
                  <div class="spinner-small"></div>
                </span>
                <Send v-else :size="16" />
                Submit Availability
              </button>
            </form>

            <hr class="my-3" />

            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="left-section-title">My Requests</span>
              <select v-model="availFilter" class="filter-select" style="font-size:0.76rem;width:auto">
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Approved</option>
                <option value="Cancelled">Rejected</option>
              </select>
            </div>
            <div v-if="loadingAvail" class="loading-state">
              <div class="spinner"></div>
            </div>
            <div v-else-if="filteredAvailability.length === 0" class="empty-left">
              <i class="bi bi-inbox"></i>
              <p>No requests yet.</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;gap:0.5rem;">
              <div
                v-for="req in filteredAvailability"
                :key="req.AvailabilityId"
                style="background:#fafafa;border:1px solid #f0ebe8;border-radius:8px;padding:0.65rem 0.75rem;"
              >
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <div style="font-size:0.82rem;font-weight:600;color:#1a1a1a;">
                      {{ formatShiftDate(req.Date) }}
                    </div>
                    <div style="font-size:0.75rem;color:#6b7280;">
                      {{ req.startTime }} – {{ req.endTime }}
                    </div>
                  </div>
                  <span class="status-badge" :class="statusClass(req.Status)" style="font-size:0.72rem;">{{ req.Status }}</span>
                </div>
                <p v-if="req.Notes" style="font-size:0.78rem;color:#4b5563;margin:0 0 0.25rem;">{{ req.Notes }}</p>
                <div style="font-size:0.7rem;color:#9ca3af;">{{ formatDate(req.CreatedAt) }}</div>
              </div>
            </div>
          </div>

          <!-- ── HISTORY ─────────────────────────── -->
          <div v-if="activeTab === 'history'">
            <div class="left-section-title mb-2">Availability History</div>
            <div class="section-subtitle mb-3" style="font-size:0.78rem;color:#6b7280;">
              Your past approved and rejected availability requests
            </div>
            <div v-if="loadingAvail" class="loading-state">
              <div class="spinner"></div>
            </div>
            <div v-else-if="resolvedAvailability.length === 0" class="empty-left">
              <i class="bi bi-inbox"></i>
              <p>No resolved requests yet.</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;gap:0.5rem;">
              <div
                v-for="req in resolvedAvailability"
                :key="req.AvailabilityId"
                style="background:#fafafa;border:1px solid #f0ebe8;border-radius:8px;padding:0.65rem 0.75rem;"
              >
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <div style="font-size:0.82rem;font-weight:600;color:#1a1a1a;">
                      {{ formatShiftDate(req.Date) }}
                    </div>
                    <div style="font-size:0.75rem;color:#6b7280;">
                      {{ req.startTime }} – {{ req.endTime }}
                    </div>
                  </div>
                  <span class="status-badge" :class="statusClass(req.Status)" style="font-size:0.72rem;">{{ displayStatus(req.Status) }}</span>
                </div>
                <p v-if="req.Notes" style="font-size:0.78rem;color:#4b5563;margin:0 0 0.25rem;">{{ req.Notes }}</p>
                <div style="font-size:0.7rem;color:#9ca3af;">{{ formatDate(req.CreatedAt) }}</div>
              </div>
            </div>
          </div>

          <!-- ── CHANGE INQUIRIES ────────────────── -->
          <div v-if="activeTab === 'inquiries'" ref="inquiryFormSection">
            <div class="left-section-title mb-2">New Change Inquiry</div>
            <div class="section-subtitle mb-3" style="font-size:0.78rem;color:#6b7280;">
              Request a shift change
            </div>
            <form class="inquiry-form">
              <div class="form-group">
                <label>Shift Date to Change</label>
                <select v-model="inquiryForm.ShiftDate" class="inquiry-date-select">
                  <option value="" disabled>Select a scheduled date</option>
                  <option v-for="d in scheduledDates" :key="d" :value="d">
                    {{ formatShiftDate(d) }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>Request Type</label>
                <select v-model="inquiryForm.RequestType">
                  <option value="Shift Swap">Shift Swap</option>
                  <option value="Time Change">Time Change</option>
                  <option value="Day Off">Day Off Request</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Reason</label>
                <textarea
                  rows="3"
                  v-model="inquiryForm.Reason"
                  placeholder="Explain your request in detail…"
                ></textarea>
              </div>
              <div class="form-group">
                <label>Preferred Replacement Date <span class="optional">(if applicable)</span></label>
                <input type="date" v-model="inquiryForm.PreferredDate" />
              </div>
              <button
                type="button"
                class="btn-primary w-full"
                @click="submitInquiry"
                :disabled="savingInquiry"
              >
                <span v-if="savingInquiry">
                  <div class="spinner-small"></div>
                </span>
                <Send v-else :size="16" />
                Submit Inquiry
              </button>
            </form>

            <hr class="my-3" />

            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="left-section-title">My Inquiries</span>
              <select v-model="inquiryFilter" class="filter-select" style="font-size:0.76rem;width:auto">
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>
            <div v-if="loadingInquiries" class="loading-state">
              <div class="spinner"></div>
            </div>
            <div v-else-if="filteredInquiries.length === 0" class="empty-left">
              <i class="bi bi-inbox"></i>
              <p>No inquiries submitted yet.</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;gap:0.5rem;">
              <div
                v-for="inq in filteredInquiries"
                :key="inq.InquiryId"
                style="background:#fafafa;border:1px solid #f0ebe8;border-radius:8px;padding:0.65rem 0.75rem;"
              >
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <div>
                    <span style="font-size:0.82rem;font-weight:600;color:#1a1a1a;">{{ inq.RequestType }}</span>
                    <span style="font-size:0.75rem;color:#6b7280;margin-left:0.4rem;">{{ formatShiftDate(inq.ShiftDate) }}</span>
                  </div>
                  <span class="status-badge" :class="statusClass(inq.Status)" style="font-size:0.72rem;">{{ inq.Status }}</span>
                </div>
                <p style="font-size:0.78rem;color:#4b5563;margin:0 0 0.25rem;">{{ inq.Reason }}</p>
                <div v-if="inq.PreferredDate" style="font-size:0.75rem;color:#6b7280;margin-bottom:0.25rem;">
                  Preferred: {{ formatShiftDate(inq.PreferredDate) }}
                </div>
                <div v-if="inq.ManagerNote" class="manager-note" style="padding:0.5rem;font-size:0.75rem;margin-top:0.25rem;">
                  <Briefcase :size="12" />
                  <span><strong>Manager:</strong> {{ inq.ManagerNote }}</span>
                </div>
                <div style="font-size:0.7rem;color:#9ca3af;">Submitted {{ formatDate(inq.CreatedAt) }}</div>
              </div>
            </div>
          </div>

        </div><!-- end left-scroll-area -->
      </div><!-- end left-panel -->

      <!-- ══════════════════════════════════════════
           RIGHT PANEL — My Schedule
      ═══════════════════════════════════════════ -->
      <div class="right-panel">

        <!-- Month Navigator -->
        <div class="d-flex justify-content-center align-items-center gap-3 mb-4">
          <button class="btn btn-ghost btn-sm" @click="monthOffset -= 1" title="Previous month">
            <ChevronLeft :size="18" />
          </button>
          <span
            style="min-width:200px;text-align:center;font-weight:600;font-size:1.1rem;"
          >
            {{ monthYearLabel }}
          </span>
          <button class="btn btn-ghost btn-sm" @click="monthOffset = 0">
            Today
          </button>
          <button class="btn btn-ghost btn-sm" @click="monthOffset += 1" title="Next month">
            <ChevronRight :size="18" />
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loadingSchedule" class="loading-state">
          <div class="spinner"></div>
          <p>Loading your schedule…</p>
        </div>

        <div v-else>
          <!-- Calendar Grid -->
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
                  'clickable-day': true,
                }"
                @click.stop="openAvailForm(day.dateStr)"
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
                    style="background: #5d4037"
                    @click.stop="selectedShift = shift"
                    title="View shift details"
                  >
                  <div class="shift-badge-role">{{ shift.employeeName }}</div>
                    <div class="shift-badge-time">{{ shift.startTime }}–{{ shift.endTime }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Upcoming Shifts -->
        <div class="section mt-4">
          <div class="section-header">
            <div class="d-flex align-items-center gap-2">
              <h3>Upcoming Shifts</h3>
              <span class="shift-count-pill">{{ filteredUpcomingShifts.length }}</span>
            </div>
          </div>

          <!-- Date filter strip -->
          <div class="date-filter-strip mb-3">
            <button
              v-for="opt in dateFilterOptions"
              :key="opt.key"
              class="date-filter-btn"
              :class="{ active: dateFilter === opt.key }"
              @click="dateFilter = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>

          <div v-if="filteredUpcomingShifts.length === 0" class="empty-state">
            <i class="bi bi-calendar3" style="font-size:2rem;display:block;margin-bottom:0.75rem;opacity:0.5;"></i>
            <p>{{ emptyFilterMessage }}</p>
            <button class="btn-avail btn-sm mt-2" @click="setAvailabilityShortcut">
              <i class="bi bi-clock"></i> Set availability
            </button>
          </div>
          <div v-else class="shifts-list">
            <div v-for="(shift, i) in filteredUpcomingShifts" :key="i" class="sched-list-card">
              <div class="sched-list-status-dot" :class="statusDotClass(shift.Status)"></div>
              <div class="sched-list-info">
                <div class="sched-list-name">
                  {{ formatShiftDate(shift.WorkDate) }}
                </div>
                <div class="sched-list-meta">
                  {{ shift.TimeIn }} – {{ shift.TimeOut }} • {{ shift.Branch }}
                </div>
              </div>
              <span class="shift-status-badge" :class="shiftStatusClass(shift.Status)">{{ shift.Status }}</span>
              <button
                class="sched-list-action-btn"
                title="Request change"
                @click="requestChangeForShiftFromCard(shift)"
              >
                <i class="bi bi-arrow-left-right"></i>
              </button>
            </div>
          </div>
        </div>

      </div><!-- end right-panel -->

    </div><!-- end split-layout -->

    <!-- Toast Notification -->
    <div class="toast-container" :class="{ show: toast.message }">
      <div class="toast-notification" :class="toast.type">
        <CheckCircle v-if="toast.type === 'success'" :size="18" />
        <AlertCircle v-else :size="18" />
        <span>{{ toast.message }}</span>
        <button class="toast-close" @click="hideToast">
          <X :size="16" />
        </button>
      </div>
    </div>

    <!-- ── SHIFT DETAIL MODAL ─────────────────────────────── -->
    <Teleport to="body">
      <div v-if="selectedShift" class="modal-backdrop">
        <div style="position:absolute;inset:0;z-index:0;" @click="selectedShift = null"></div>
        <div class="modal-dialog" style="max-width:380px;position:relative;z-index:1;" @click.stop>
          <div class="modal-header">
            <h3>Shift Details</h3>
            <button class="modal-close" @click="selectedShift = null">
              <X :size="18" />
            </button>
          </div>
          <div class="modal-body">
            <div class="shift-detail-grid">
              <div class="shift-detail-item">
                <span class="shift-detail-label">Date</span>
                <span class="shift-detail-value">{{ formatShiftDate(selectedShift.shiftDate) }}</span>
              </div>
              <div class="shift-detail-item">
                <span class="shift-detail-label">Time In</span>
                <span class="shift-detail-value">{{ selectedShift.startTime }}</span>
              </div>
              <div class="shift-detail-item">
                <span class="shift-detail-label">Time Out</span>
                <span class="shift-detail-value">{{ selectedShift.endTime }}</span>
              </div>
              <div class="shift-detail-item">
                <span class="shift-detail-label">Role</span>
                <span class="shift-detail-value">{{ selectedShift.role || '—' }}</span>
              </div>
              <div class="shift-detail-item">
                <span class="shift-detail-label">Branch</span>
                <span class="shift-detail-value">{{ selectedShift.branch || '—' }}</span>
              </div>
              <div class="shift-detail-item">
                <span class="shift-detail-label">Status</span>
                <span class="shift-detail-value">
                  <span class="status-badge" :class="statusClass(selectedShift.status)">
                    {{ selectedShift.status }}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="requestChangeForShift(selectedShift)">Request Change</button>
            <button class="btn-primary" @click="selectedShift = null">Close</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { supabase } from "@/supabase";
import {
  Calendar,
  MapPin,
  Briefcase,
  Moon,
  ChevronLeft,
  ChevronRight,
  Send,
  Inbox,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-vue-next";
// Cache constants — add above export default
const CACHE_KEY_SCHEDULE = "cache_staff_schedule";
const CACHE_KEY_AVAILABILITY = "cache_staff_availability";
const CACHE_KEY_INQUIRIES = "cache_staff_inquiries";
const CACHE_TTL = 30 * 60 * 1000;

const saveCache = (key, data) => {
  sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
};

const loadCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

window.addEventListener("beforeunload", () => {
  sessionStorage.setItem("page_refreshed", "1");
});

export default {
  name: "StaffSchedule",

  components: {
    Calendar,
    MapPin,
    Briefcase,
    Moon,
    ChevronLeft,
    ChevronRight,
    Send,
    Inbox,
    MessageSquare,
    CheckCircle,
    AlertCircle,
    X,
  },

  props: {},

  data() {
    return {
      activeTab: "availability",
      leftTabs: [
        { key: "availability", label: "Set Availability" },
        { key: "history",      label: "History" },
        { key: "inquiries",    label: "Change Inquiries" },
      ],

      // Employee info
      employeeId: null,
      currentEmployee: null,

      // Schedule tab
      loadingSchedule: false,
      mySchedules: [],
      monthOffset: 0, // 0 = current month, -1 = last month, +1 = next month

      // Availability tab
      loadingAvail: false,
      myAvailability: [],
      availFilter: "all",
      savingAvail: false,
      availForm: {
        Date: "",
        TimeIn: "08:00",
        TimeOut: "17:00",
        Notes: "",
      },

      // Inquiries tab
      loadingInquiries: false,
      myInquiries: [],
      inquiryFilter: "all",
      savingInquiry: false,
      inquiryForm: {
        ShiftDate: "",
        RequestType: "Shift Swap",
        Reason: "",
        PreferredDate: "",
      },

      // Shift detail modal
      selectedShift: null,

      // Toast
      toast: { message: "", type: "success" },
      toastInstance: null,

      // Date filter for Upcoming Shifts
      dateFilter: "today",
      dateFilterOptions: [
        { key: "today", label: "Today" },
        { key: "week",  label: "This week" },
        { key: "month", label: "This month" },
        { key: "range", label: "Range" },
      ],
    };
  },

  computed: {
    todayISO() {
      return new Date().toISOString().slice(0, 10);
    },

    todayLabel() {
      return new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },

    // Current month start
    monthStart() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + this.monthOffset, 1);
    },

    monthYearLabel() {
      return this.monthStart.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
      });
    },

    // Calendar grid: 42 days (6 weeks)
    monthDays() {
      const days = [];
      const monthStart = this.monthStart;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Start from Monday of the week containing the 1st of the month
      const startDate = new Date(monthStart);
      const dayOfWeek = startDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      startDate.setDate(
        startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
      );

      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${day}`;
        const isToday = d.getTime() === today.getTime();
        const isOtherMonth = d.getMonth() !== monthStart.getMonth();

        // Collect own shifts for this day
        const myShiftsForDay = this.mySchedules.filter(
          (s) => s.WorkDate === dateStr,
        );
        const shifts = myShiftsForDay.map((s) => {
          return {
            id: "my-" + dateStr + "-" + (s.TimeIn || "00:00"),
            employeeId: this.employeeId,
            employeeName: this.currentEmployee?.Name || "",
            startTime: s.TimeIn,
            endTime: s.TimeOut,
            label: s.Position || "My shift",
            isMine: true,
            color: "#5d4037",
            shiftDate: s.WorkDate,
            role: s.Position,
            branch: s.Branch,
            status: s.Status,
          };
        });

        days.push({
          dateStr,
          dayOfMonth: d.getDate(),
          isToday,
          isOtherMonth,
          shifts,
        });
      }
      return days;
    },

    scheduledDates() {
      const seen = {};
      return this.mySchedules
        .filter((s) => {
          if (seen[s.WorkDate]) return false;
          seen[s.WorkDate] = true;
          return true;
        })
        .map((s) => s.WorkDate)
        .sort();
    },

    // Date range helpers for filter
    weekStart() {
      const d = new Date();
      const day = d.getDay(); // 0=Sun
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().slice(0, 10);
    },
    weekEnd() {
      const d = new Date(this.weekStart + "T00:00:00");
      d.setDate(d.getDate() + 6);
      return d.toISOString().slice(0, 10);
    },
    monthStartStr() {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    },
    monthEndStr() {
      const d = new Date();
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
    },

    filteredUpcomingShifts() {
      const today = this.todayISO;
      let startDate = today;
      let endDate = today;

      switch (this.dateFilter) {
        case "today":
          startDate = today;
          endDate = today;
          break;
        case "week":
          startDate = this.weekStart;
          endDate = this.weekEnd;
          break;
        case "month":
          startDate = this.monthStartStr;
          endDate = this.monthEndStr;
          break;
        case "range":
        default:
          startDate = today;
          endDate = this.monthEndStr;
          break;
      }

      return this.mySchedules
        .filter((s) => s.WorkDate >= startDate && s.WorkDate <= endDate)
        .sort((a, b) => a.WorkDate.localeCompare(b.WorkDate));
    },

    emptyFilterMessage() {
      const labels = {
        today: "today",
        week: "this week",
        month: "this month",
        range: "this range",
      };
      return `No shifts ${labels[this.dateFilter] || "found"}.`;
    },

    filteredAvailability() {
      if (this.availFilter === "all") return this.myAvailability;
      return this.myAvailability.filter((a) => a.Status === this.availFilter);
    },

    resolvedAvailability() {
      return this.myAvailability.filter(
        (a) => a.Status === "Confirmed" || a.Status === "Cancelled",
      );
    },

    filteredInquiries() {
      if (this.inquiryFilter === "all") return this.myInquiries;
      return this.myInquiries.filter((i) => i.Status === this.inquiryFilter);
    },

    pendingAvailabilityCount() {
      return this.myAvailability.filter((a) => a.Status === "Pending").length;
    },

    pendingInquiryCount() {
      return this.myInquiries.filter(
        (i) => i.Status === "Pending" || i.Status === "Under Review",
      ).length;
    },
  },

  async mounted() {
    if (sessionStorage.getItem("page_refreshed")) {
      sessionStorage.removeItem("page_refreshed");
      [
        CACHE_KEY_SCHEDULE,
        CACHE_KEY_AVAILABILITY,
        CACHE_KEY_INQUIRIES,
      ].forEach((k) => sessionStorage.removeItem(k));
    }

    const resolved = await this.resolveEmployeeId();
    if (!resolved) {
      this.showToast(
        "Unable to identify your staff record. Contact your manager.",
        "error",
      );
      this.loadingSchedule = false;
      return;
    }
    await this.loadEmployee();
    await Promise.all([
      this.loadSchedule(),
      this.loadAvailability(),
      this.loadInquiries(),
    ]);
  },

  methods: {
    async resolveBranchId() {
      const slug = localStorage.getItem("branch");
      if (!slug || slug === "all") return null;

      const parsed = parseInt(slug, 10);
      if (!isNaN(parsed) && String(parsed) === slug.trim()) {
        const { data } = await supabase
          .from("branch")
          .select("BranchId")
          .eq("BranchId", parsed)
          .maybeSingle();
        if (data) return data.BranchId;
      }

      const { data: exact } = await supabase
        .from("branch")
        .select("BranchId")
        .or(`BranchName.ilike.${slug},Location.ilike.${slug}`)
        .maybeSingle();
      if (exact) return exact.BranchId;

      const { data: fuzzy } = await supabase
        .from("branch")
        .select("BranchId")
        .or(`BranchName.ilike.%${slug}%,Location.ilike.%${slug}%`)
        .order("BranchId")
        .limit(1)
        .maybeSingle();
      return fuzzy?.BranchId ?? null;
    },

    async resolveEmployeeId() {
      const username = localStorage.getItem("username");
      const branchId = await this.resolveBranchId();
      if (!branchId) return false;

      try {

        const { data: employees } = await supabase
          .from("employee")
          .select("EmployeeId, FirstName, LastName, Email")
          .eq("BranchAssigned", branchId)
          .eq("Status", "Active");

        if (!employees || employees.length === 0) return false;

        if (username) {
          const normalized = username.replace(/_/g, ".").toLowerCase();
          const byEmail = employees.find(
            (e) => e.Email && e.Email.toLowerCase().startsWith(normalized),
          );
          if (byEmail) {
            this.employeeId = byEmail.EmployeeId;
            return true;
          }

          const parts = username.split(/[_\-. ]+/).filter((p) => p.length > 2);
          const byName = employees.find((e) => {
            const full = `${e.FirstName} ${e.LastName}`.toLowerCase();
            return parts.some((p) => full.includes(p));
          });
          if (byName) {
            this.employeeId = byName.EmployeeId;
            return true;
          }
        }

        this.employeeId = employees[0].EmployeeId;
        return true;
      } catch (err) {
        console.error("resolveEmployeeId:", err);
        return false;
      }
    },

    async loadEmployee() {
      if (!this.employeeId) return;
      const { data, error } = await supabase
        .from("employee")
        .select('*, branch("BranchName")')
        .eq("EmployeeId", this.employeeId)
        .single();
      if (!error && data) {
        this.currentEmployee = {
          ...data,
          Branch: data.branch?.BranchName || "—",
        };
      }
    },

    async loadSchedule() {
      if (!this.employeeId) return;
      const cached = loadCache(CACHE_KEY_SCHEDULE);
      if (cached) {
        this.mySchedules = cached;
        return;
      }
      this.loadingSchedule = true;
      try {
        const { data, error } = await supabase
          .from("schedule")
          .select(
            '*, branch!inner("BranchName"), employee!inner(EmployeeId, FirstName, LastName)',
          )
          .eq("EmployeeId", this.employeeId)
          .neq("Status", "Cancelled")
          .neq("Status", "Archived")
          .order("ShiftDate", { ascending: false });
        if (error) throw error;
        this.mySchedules = (data || []).map((s) => ({
          EmployeeId: s.EmployeeId,
          WorkDate: String(s.ShiftDate || "").slice(0, 10),
          TimeIn: s.StartTime ? s.StartTime.slice(0, 5) : "",
          TimeOut: s.EndTime ? s.EndTime.slice(0, 5) : "",
          Branch: s.branch?.BranchName || "",
          Position: s.Role || "",
          Status: s.Status || "Scheduled",
        }));
        saveCache(CACHE_KEY_SCHEDULE, this.mySchedules);
      } catch (err) {
        console.error("loadSchedule:", err);
        this.showToast("Failed to load schedule.", "error");
      } finally {
        this.loadingSchedule = false;
      }
    },

    async loadAvailability() {
      if (!this.employeeId) return;
      const cached = loadCache(CACHE_KEY_AVAILABILITY);
      if (cached) {
        this.myAvailability = cached;
        this.loadingAvail = false;
        return;
      }
      this.loadingAvail = true;
      try {
        const { data, error } = await supabase
          .from("availability")
          .select("*")
          .eq("employeeid", this.employeeId)
          .order("availabledate", { ascending: false });
        if (error) throw error;
        this.myAvailability = (data || []).map((a) => ({
          AvailabilityId: a.availabilityid,
          Date: a.availabledate,
          startTime: a.starttime?.slice(0, 5),
          endTime: a.endtime?.slice(0, 5),
          Notes: a.notes,
          Status: a.status,
          CreatedAt: a.createdat,
        }));
        saveCache(CACHE_KEY_AVAILABILITY, this.myAvailability);
      } catch (err) {
        console.error("loadAvailability:", err);
      } finally {
        this.loadingAvail = false;
      }
    },

    async loadInquiries() {
      if (!this.employeeId) return;
      const cached = loadCache(CACHE_KEY_INQUIRIES);
      if (cached) {
        this.myInquiries = cached;
        this.loadingInquiries = false;
        return;
      }
      this.loadingInquiries = true;
      try {
        const { data, error } = await supabase
          .from("changeinquiry")
          .select("*")
          .eq("employeeid", this.employeeId)
          .order("inquiryid", { ascending: false });
        if (error) throw error;
        this.myInquiries = (data || []).map((c) => ({
          InquiryId: c.inquiryid,
          RequestType: c.requesttype || "Shift Change",
          ShiftDate: c.requestdate,
          PreferredDate: c.preferreddate,
          Reason: c.reason,
          Status: c.status,
          ManagerNote: c.managernote,
          CreatedAt: c.createdat,
        }));
        saveCache(CACHE_KEY_INQUIRIES, this.myInquiries);
      } catch (err) {
        console.error("loadInquiries:", err);
      } finally {
        this.loadingInquiries = false;
      }
    },

    async submitAvailability() {
      if (!this.availForm.Date) {
        this.showToast("Please select a date.", "error");
        return;
      }
      if (!this.availForm.TimeIn || !this.availForm.TimeOut) {
        this.showToast("Please set time in and time out.", "error");
        return;
      }
      this.savingAvail = true;
      try {
        const { error } = await supabase.from("availability").insert({
          employeeid: this.employeeId,
          availabledate: this.availForm.Date,
          starttime: this.availForm.TimeIn,
          endtime: this.availForm.TimeOut,
          notes: this.availForm.Notes,
          status: "Pending",
        });
        if (error) throw error;
        this.showToast("Availability submitted successfully!", "success");
        this.availForm = {
          Date: "",
          TimeIn: "08:00",
          TimeOut: "17:00",
          Notes: "",
        };
        sessionStorage.removeItem(CACHE_KEY_AVAILABILITY);
        await this.loadAvailability();
      } catch (err) {
        console.error("submitAvailability:", err);
        this.showToast("Failed to submit availability.", "error");
      } finally {
        this.savingAvail = false;
      }
    },

    async submitInquiry() {
      if (!this.inquiryForm.ShiftDate) {
        this.showToast("Please select the shift date.", "error");
        return;
      }
      if (!this.inquiryForm.Reason.trim()) {
        this.showToast("Please provide a reason.", "error");
        return;
      }
      this.savingInquiry = true;
      try {
        const { error } = await supabase.from("changeinquiry").insert({
          employeeid: this.employeeId,
          requestdate: this.inquiryForm.ShiftDate,
          requesttype: this.inquiryForm.RequestType,
          preferreddate: this.inquiryForm.PreferredDate || null,
          reason: this.inquiryForm.Reason,
          status: "Pending",
        });
        if (error) throw error;
        this.showToast("Inquiry submitted successfully!", "success");
        this.inquiryForm = {
          ShiftDate: "",
          RequestType: "Shift Swap",
          Reason: "",
          PreferredDate: "",
        };
        sessionStorage.removeItem(CACHE_KEY_INQUIRIES);
        await this.loadInquiries();
      } catch (err) {
        console.error("submitInquiry:", err);
        this.showToast("Failed to submit inquiry.", "error");
      } finally {
        this.savingInquiry = false;
      }
    },

    formatShiftDate(dateStr) {
      if (!dateStr) return "—";
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-PH", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    },

    formatDate(ts) {
      if (!ts) return "—";
      return new Date(ts).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },

    shiftStatusClass(status) {
      const map = {
        Active: "status-active",
        Inactive: "status-inactive",
        Cancelled: "status-cancelled",
        Completed: "status-completed",
      };
      return map[status] || "status-inactive";
    },

    statusClass(status) {
      const map = {
        Pending: "status-pending",
        Confirmed: "status-approved",
        Approved: "status-approved",
        Cancelled: "status-rejected",
        Rejected: "status-rejected",
        "Under Review": "status-review",
      };
      return map[status] || "status-inactive";
    },

    statusDotClass(status) {
      const map = {
        Scheduled: "dot-scheduled",
        Completed: "dot-completed",
        Cancelled: "dot-cancelled",
      };
      return map[status] || "dot-scheduled";
    },

    displayStatus(status) {
      const map = {
        Pending: "Pending",
        Confirmed: "Approved",
        Cancelled: "Rejected",
      };
      return map[status] || status;
    },

    openAvailForm(dateStr) {
      this.availForm.Date = dateStr;
      this.activeTab = "availability";
      this.$nextTick(() => {
        const el = this.$refs.availFormSection;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        this.showToast("Fill in your availability details and submit.", "success");
      });
    },

    requestChangeForShift(shift) {
      this.inquiryForm.ShiftDate = shift.shiftDate;
      this.selectedShift = null;
      this.activeTab = "inquiries";
      this.$nextTick(() => {
        const el = this.$refs.inquiryFormSection;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        this.showToast("Fill in the change request form and submit.", "success");
      });
    },

    requestChangeForShiftFromCard(shift) {
      this.inquiryForm.ShiftDate = shift.WorkDate;
      this.activeTab = "inquiries";
      this.$nextTick(() => {
        const el = this.$refs.inquiryFormSection;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        this.showToast("Fill in the change request form and submit.", "success");
      });
    },

    setAvailabilityShortcut() {
      this.availForm.Date = this.todayISO;
      this.activeTab = "availability";
      this.$nextTick(() => {
        const el = this.$refs.availFormSection;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },

    showToast(message, type = "success") {
      if (this.toastInstance) {
        clearTimeout(this.toastInstance);
      }
      this.toast = { message, type };
      this.toastInstance = setTimeout(() => {
        this.toast.message = "";
        this.toastInstance = null;
      }, 3500);
    },

    hideToast() {
      if (this.toastInstance) {
        clearTimeout(this.toastInstance);
        this.toastInstance = null;
      }
      this.toast.message = "";
    },
  },
};
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────────── */
.schedule-content {
  padding: 24px 32px;
  background: #fafafa;
  min-height: 100vh;
  font-family: "Inter", sans-serif;
}

/* ── Header ────────────────────────────────────────────────────── */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-section h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 4px;
}

.header-subtitle {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #4b5563;
  white-space: nowrap;
}

/* ── Tabs ──────────────────────────────────────────────────────── */
.tabs-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #6b7280;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s;
  position: relative;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #1f2937;
}

.tab-btn.active {
  color: #5d4037;
  border-bottom-color: #5d4037;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: #5d4037;
  color: white;
  border-radius: 11px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.25rem;
}

.tab-badge.warning {
  background: #f59e0b;
}

/* ── Tab Content ───────────────────────────────────────────────── */
.tab-content {
  animation: fadeIn 0.15s ease-in;
}

/* ── Tab Toolbar ──────────────────────────────────────────────── */
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  min-height: 40px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ── Calendar Grid ────────────────────────────────────────────── */
.calendar-container {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f9f5f3;
  border-bottom: 2px solid #e5e7eb;
}

.calendar-day-header {
  padding: 0.75rem;
  text-align: center;
  font-weight: 700;
  color: #1f2937;
  font-size: 0.9rem;
  border-right: 1px solid #e5e7eb;
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
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
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
.clickable-day {
  cursor: pointer;
}

.calendar-day.is-today {
  background: #f5f0eb;
  border: 2px solid #5d4037;
  position: relative;
}

.calendar-day.is-other-month {
  background: #fafbfc;
  opacity: 0.5;
}

.day-number {
  font-weight: 700;
  color: #1f2937;
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
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
  color: #fff;
  font-weight: 600;
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  line-height: 1.2;
}

.shift-badge-role {
  font-weight: 700;
  font-size: 0.7rem;
}

.shift-badge-time {
  font-size: 0.62rem;
  opacity: 0.9;
}

.btn-avail {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #5d4037;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-avail:hover {
  background: #4e342e;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.3);
}

/* ── Days Grid (removed for calendar grid) ────────────────────────────────── */

/* ── Section ───────────────────────────────────────────────────── */
.section {
  margin-bottom: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.section-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0.25rem 0 0 0;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #4b5563;
  font-size: 0.9rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #5d4037;
  box-shadow: 0 0 0 3px rgba(93, 64, 55, 0.1);
}

/* ── Empty State ───────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.empty-state svg {
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 0.95rem;
}

/* ── Loading State ─────────────────────────────────────────────── */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top-color: #5d4037;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* ── Lists ────────────────────────────────────────────────────── */
.shifts-list,
.requests-list,
.inquiries-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.shift-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.shift-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.shift-item-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.shift-item-dot.active {
  background: #10b981;
}

.shift-item-dot.inactive {
  background: #d1d5db;
}

.shift-item-info {
  flex: 1;
  min-width: 0;
}

.shift-item-date {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.shift-item-meta {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.shift-status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.shift-status-badge.status-active {
  background: #d1fae5;
  color: #065f46;
}

.shift-status-badge.status-completed {
  background: #dbeafe;
  color: #0c4a6e;
}

.shift-status-badge.status-cancelled {
  background: #fee2e2;
  color: #7f1d1d;
}

.shift-status-badge.status-inactive {
  background: #f3f4f6;
  color: #4b5563;
}

/* ── Request Item ──────────────────────────────────────────────── */
.request-item,
.inquiry-item {
  padding: 1rem;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.request-item:hover,
.inquiry-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.request-header,
.inquiry-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.request-date,
.inquiry-date {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
}

.request-time,
.inquiry-date {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.request-notes,
.inquiry-reason {
  font-size: 0.9rem;
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

.status-badge {
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-rejected {
  background: #fee2e2;
  color: #7f1d1d;
}

.status-badge.status-review {
  background: #dbeafe;
  color: #0c4a6e;
}

.request-date-small,
.inquiry-date-small {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 0.75rem;
}

.manager-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f5f0eb;
  border-left: 3px solid #5d4037;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #1f2937;
  margin-top: 0.75rem;
  line-height: 1.4;
}

.inquiry-type {
  font-weight: 600;
  color: #1f2937;
}

.inquiry-date {
  color: #6b7280;
  font-size: 0.85rem;
  margin-left: 0.5rem;
}

/* ── Two Column Layout ─────────────────────────────────────────── */
.two-column-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .two-column-layout {
    grid-template-columns: 1fr;
  }
}

.column {
  min-width: 0;
}

/* ── Forms ────────────────────────────────────────────────────── */
.availability-form,
.inquiry-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.optional {
  font-weight: 400;
  color: #9ca3af;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
  color: #1f2937;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #5d4037;
  box-shadow: 0 0 0 3px rgba(93, 64, 55, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

/* ── Buttons ───────────────────────────────────────────────────– */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #5d4037;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #4e342e;
  box-shadow: 0 4px 12px rgba(93, 64, 55, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #1f2937;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
}
.btn-ghost:hover {
  background: #f0ebe8;
}

.w-full {
  width: 100%;
}

.btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: white;
  color: #4b5563;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f3f4f6;
}



/* ── Toast ────────────────────────────────────────────────────── */
.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.toast-container.show {
  opacity: 1;
  pointer-events: auto;
}

.toast-notification {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  font-size: 0.9rem;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

.toast-notification.success {
  color: #065f46;
  border-left: 4px solid #10b981;
}

.toast-notification.error {
  color: #7f1d1d;
  border-left: 4px solid #ef4444;
}

.toast-notification svg {
  flex-shrink: 0;
}

.toast-close {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* ── Responsive ────────────────────────────────────────────────– */
@media (max-width: 768px) {
  .schedule-content {
    padding: 1rem;
  }

  .header-section {
    flex-direction: column;
    gap: 1rem;
  }

  .header-section h1 {
    font-size: 1.5rem;
  }

  .tabs-bar {
    gap: 0;
    margin-bottom: 1.5rem;
    overflow-x: auto;
  }

  .tab-btn {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .calendar-day {
    min-height: 100px;
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .day-number {
    font-size: 0.85rem;
    margin-bottom: 0.3rem;
  }

  .shift-badge {
    padding: 0.3rem 0.4rem;
    font-size: 0.65rem;
  }

  .calendar-day-header {
    padding: 0.75rem 0.5rem;
    font-size: 0.8rem;
  }

  .two-column-layout {
    gap: 1.5rem;
  }

  .toast-notification {
    padding: 0.85rem 1rem;
    font-size: 0.85rem;
  }
}

/* ── SPLIT LAYOUT ───────────────────────────────────────── */
.split-layout {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  min-height: calc(100vh - 140px);
}

.left-panel {
  width: 35%;
  min-width: 280px;
  max-width: 420px;
  background: #fff;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
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
  border-bottom: 1px solid #e5e7eb;
  background: #fafafa;
}

.left-tab-btn {
  background: none;
  border: none;
  border-radius: 6px 6px 0 0;
  padding: 0.4rem 0.7rem;
  font-size: 0.76rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.left-tab-btn:hover { color: #5d4037; }
.left-tab-btn.active {
  color: #5d4037;
  border-bottom-color: #5d4037;
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

.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.empty-left {
  text-align: center;
  padding: 2rem 1rem;
  color: #9ca3af;
}
.empty-left i { font-size: 1.8rem; display: block; margin-bottom: 0.5rem; }
.empty-left p { font-size: 0.8rem; margin: 0; }

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

/* ── Date Filter Strip ─────────────────────────────────────────── */
.date-filter-strip {
  display: flex;
  gap: 0.35rem;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.25rem;
}
.date-filter-btn {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.date-filter-btn:hover {
  color: #1f2937;
}
.date-filter-btn.active {
  background: #fff;
  color: #5d4037;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* ── Shift Count Pill ─────────────────────────────────────────── */
.shift-count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 0.5rem;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 999px;
  line-height: 1;
}

/* ── Schedule List Card (admin style) ─────────────────────────── */
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

/* ── Status Dot ───────────────────────────────────────────────── */
.sched-list-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sched-list-status-dot.dot-scheduled {
  background: #f59e0b;
}
.sched-list-status-dot.dot-completed {
  background: #10b981;
}
.sched-list-status-dot.dot-cancelled {
  background: #ef4444;
}

/* ── Action Button ────────────────────────────────────────────── */
.sched-list-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.sched-list-action-btn:hover {
  background: #e5e7eb;
  color: #5d4037;
}

</style>

<!-- Global styles for teleported modals — scoped doesn't reach body-level elements -->
<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-dialog {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 1001;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modalSlideUp 0.25s ease;
}

@keyframes modalSlideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.modal-dialog .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-dialog .modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-dialog .modal-body {
  padding: 1.5rem;
}

.modal-dialog .modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-dialog .modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer !important;
  padding: 0.4rem;
  border-radius: 4px;
  transition: all 0.2s;
  pointer-events: auto !important;
}
.modal-dialog .modal-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-dialog .btn-ghost {
  background: transparent;
  border: 1px solid #d1d5db;
  color: #1f2937;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer !important;
  pointer-events: auto !important;
  transition: background 0.2s;
}
.modal-dialog .btn-ghost:hover {
  background: #f0ebe8;
}

.modal-dialog .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  background: #5d4037;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer !important;
  pointer-events: auto !important;
  transition: all 0.2s;
}
.modal-dialog .btn-primary:hover:not(:disabled) {
  background: #4e342e;
}
.modal-dialog .btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
}

.modal-dialog .shift-detail-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.modal-dialog .shift-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #f0ebe8;
}
.modal-dialog .shift-detail-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.modal-dialog .shift-detail-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
}
.modal-dialog .shift-detail-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a1a1a;
}
.modal-dialog .status-badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}
.modal-dialog .status-badge.status-pending  { background: #fef3c7; color: #92400e; }
.modal-dialog .status-badge.status-approved { background: #d1fae5; color: #065f46; }
.modal-dialog .status-badge.status-rejected { background: #fee2e2; color: #7f1d1d; }
.modal-dialog .status-badge.status-review   { background: #dbeafe; color: #0c4a6e; }
</style>