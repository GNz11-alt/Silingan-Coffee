<template>
  <div class="schedule-content">
    <!-- Header -->
    <div class="header-section">
      <div>
        <h1>My Schedule</h1>
        <p class="header-subtitle">{{ currentEmployee?.Name || 'Employee' }} • {{ currentEmployee?.Branch || 'Branch' }} • {{ currentEmployee?.Position || 'Cashier' }}</p>
      </div>
      <div class="header-meta">
        <Calendar :size="18" />
        <span>{{ todayLabel }}</span>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="tabs-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'my-schedule' }"
        @click="activeTab = 'my-schedule'"
      >
        <Calendar :size="16" />
        My Schedule
      </button>
      <!-- Set Availability moved to button + modal -->
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'inquiries' }"
        @click="activeTab = 'inquiries'"
      >
        <MessageSquare :size="16" />
        Change Inquiries
        <span v-if="pendingInquiryCount" class="tab-badge warning">{{ pendingInquiryCount }}</span>
      </button>
    </div>

    <div class="tab-toolbar">
      <div></div>
      <button class="btn-avail" @click="showAvailModal = true">
        <Clock :size="16" />
        Set Availability
      </button>
    </div>

    <!-- ── TAB: MY SCHEDULE ─────────────────────────────────────── -->
    <div v-if="activeTab === 'my-schedule'" class="tab-content">
      <!-- Month Navigator -->
      <div class="month-navigator">
        <button class="nav-btn" @click="shiftMonth(-1)" title="Previous month">
          <ChevronLeft :size="22" />
        </button>
        <span class="month-label">{{ monthYearLabel }}</span>
        <button class="today-btn" @click="shiftMonth(0)">Today</button>
        <button class="nav-btn" @click="shiftMonth(1)" title="Next month">
          <ChevronRight :size="22" />
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
          <!-- Day Headers -->
          <div class="calendar-header">
            <div class="calendar-day-header" v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day">
              {{ day }}
            </div>
          </div>

          <!-- Calendar Grid -->
          <div class="calendar-grid">
            <div 
              v-for="day in monthDays" 
              :key="day.dateStr" 
              class="calendar-day" 
              :class="{ 
                'is-today': day.isToday, 
                'is-other-month': day.isOtherMonth,
                'has-shift': day.hasShift
              }"
            >
              <div class="day-number">
                {{ day.dayOfMonth }}
                <span v-if="day.isToday" class="today-badge">Today</span>
              </div>
              
              <div class="day-events">
                <!-- Your Shift -->
                <div v-if="day.myShift" class="event my-shift">
                  <div class="event-time">{{ day.myShift.TimeIn }}</div>
                  <div class="event-label">{{ day.myShift.Position }}</div>
                </div>

                <!-- Other Employees (summary) -->
                <div v-if="day.otherShifts && day.otherShifts.length > 0" class="event-summary">
                  <div v-if="day.otherShifts.length === 1" class="event other-shift">
                    <div class="event-name">{{ day.otherShifts[0].Name }}</div>
                  </div>
                  <div v-else class="event-count">
                    +{{ day.otherShifts.length }} more
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

        <!-- Upcoming Shifts -->
        <div class="section">
          <div class="section-header">
            <div>
              <h3>Upcoming Shifts</h3>
              <p class="section-subtitle">Next 10 scheduled shifts</p>
            </div>
          </div>
          <div v-if="upcomingShifts.length === 0" class="empty-state">
            <Calendar :size="32" />
            <p>No upcoming shifts found.</p>
          </div>
          <div v-else class="shifts-list">
            <div v-for="(shift, i) in upcomingShifts" :key="i" class="shift-item">
              <div class="shift-item-dot" :class="shift.Status === 'Active' ? 'active' : 'inactive'"></div>
              <div class="shift-item-info">
                <div class="shift-item-date">{{ formatShiftDate(shift.WorkDate) }}</div>
                <div class="shift-item-meta">{{ shift.TimeIn }} – {{ shift.TimeOut }} • {{ shift.Branch }}</div>
              </div>
              <span class="shift-status-badge" :class="shiftStatusClass(shift.Status)">{{ shift.Status }}</span>
            </div>
          </div>
        </div>

        <!-- My Availability Requests -->
        <div class="section">
          <div class="section-header">
            <div>
              <h3>My Availability Requests</h3>
              <p class="section-subtitle">Your submitted availability</p>
            </div>
            <select v-model="availFilter" class="filter-select">
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div v-if="loadingAvail" class="loading-state">
            <div class="spinner"></div>
          </div>
          <div v-else-if="filteredAvailability.length === 0" class="empty-state">
            <Inbox :size="32" />
            <p>No requests yet.</p>
          </div>
          <div v-else class="requests-list">
            <div v-for="req in filteredAvailability" :key="req.AvailabilityId" class="request-item">
              <div class="request-header">
                <div>
                  <div class="request-date">{{ formatShiftDate(req.Date) }}</div>
                  <div class="request-time">{{ req.TimeIn }} – {{ req.TimeOut }} • <span :class="availTypeClass(req.Type)">{{ req.Type }}</span></div>
                </div>
                <span class="status-badge" :class="statusClass(req.Status)">{{ req.Status }}</span>
              </div>
              <p v-if="req.Notes" class="request-notes">{{ req.Notes }}</p>
              <div class="request-date-small">{{ formatDate(req.CreatedAt) }}</div>
            </div>
          </div>
      </div>
    </div>

    <!-- ── SET AVAILABILITY MODAL ────────────────────────────────── -->
    <div v-if="showAvailModal" class="modal-backdrop" @click.self="showAvailModal = false">
      <div class="modal-dialog">
          <div class="modal-header">
            <h3><Clock :size="20" /> Set Availability</h3>
            <button class="modal-close" @click="showAvailModal = false">
              <X :size="20" />
            </button>
          </div>
          <div class="modal-body">
            <p class="modal-subtitle">Let your manager know when you're available</p>
            <form class="availability-form">
              <div class="form-group">
                <label>Date</label>
                <input type="date" v-model="availForm.Date" :min="todayISO" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Available Time In</label>
                  <input type="time" v-model="availForm.TimeIn" />
                </div>
                <div class="form-group">
                  <label>Available Time Out</label>
                  <input type="time" v-model="availForm.TimeOut" />
                </div>
              </div>
              <div class="form-group">
                <label>Type</label>
                <select v-model="availForm.Type">
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Preferred">Preferred</option>
                </select>
              </div>
              <div class="form-group">
                <label>Notes <span class="optional">(optional)</span></label>
                <textarea rows="3" v-model="availForm.Notes" placeholder="Any notes for the manager…"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showAvailModal = false">Cancel</button>
            <button class="btn-primary" @click="submitAvailability" :disabled="savingAvail">
              <span v-if="savingAvail">
                <div class="spinner-small"></div>
              </span>
              <Send v-else :size="16" />
              Submit Availability
            </button>
          </div>
      </div>
    </div>

    <!-- ── TAB: CHANGE INQUIRIES ────────────────────────────────── -->
    <div v-if="activeTab === 'inquiries'" class="tab-content">
      <div class="two-column-layout">
        <!-- Submit new inquiry -->
        <div class="column">
          <div class="section">
            <div class="section-header">
              <h3>New Change Inquiry</h3>
              <p class="section-subtitle">Request a shift change</p>
            </div>
            <form class="inquiry-form">
              <div class="form-group">
                <label>Shift Date to Change</label>
                <input type="date" v-model="inquiryForm.ShiftDate" />
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
                <textarea rows="4" v-model="inquiryForm.Reason" placeholder="Explain your request in detail…"></textarea>
              </div>
              <div class="form-group">
                <label>Preferred Replacement Date <span class="optional">(if applicable)</span></label>
                <input type="date" v-model="inquiryForm.PreferredDate" />
              </div>
              <button type="button" class="btn-primary w-full" @click="submitInquiry" :disabled="savingInquiry">
                <span v-if="savingInquiry">
                  <div class="spinner-small"></div>
                </span>
            <Send v-else :size="16" />
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>

        <!-- My inquiries -->
        <div class="column">
          <div class="section">
            <div class="section-header">
              <div>
                <h3>My Inquiries</h3>
                <p class="section-subtitle">Your submitted requests</p>
              </div>
              <select v-model="inquiryFilter" class="filter-select">
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
            <div v-else-if="filteredInquiries.length === 0" class="empty-state">
              <MessageSquare :size="32" />
              <p>No inquiries submitted yet.</p>
            </div>
            <div v-else class="inquiries-list">
              <div v-for="inq in filteredInquiries" :key="inq.InquiryId" class="inquiry-item">
                <div class="inquiry-header">
                  <div>
                    <span class="inquiry-type">{{ inq.RequestType }}</span>
                    <span class="inquiry-date">{{ formatShiftDate(inq.ShiftDate) }}</span>
                  </div>
                  <span class="status-badge" :class="statusClass(inq.Status)">{{ inq.Status }}</span>
                </div>
                <p class="inquiry-reason">{{ inq.Reason }}</p>
                <div v-if="inq.ManagerNote" class="manager-note">
                  <Briefcase :size="14" />
                  <span><strong>Manager:</strong> {{ inq.ManagerNote }}</span>
                </div>
                <div class="inquiry-date-small">Submitted {{ formatDate(inq.CreatedAt) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div class="toast-container" :class="{ show: toast.message }">
      <div class="toast-notification" :class="toast.type">
        <component :is="toast.type === 'success' ? CheckCircle : AlertCircle" :size="18" />
        <span>{{ toast.message }}</span>
        <button class="toast-close" @click="hideToast">
          <X :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '@/supabase'
import {
  Calendar,
  Clock,
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
  X
} from 'lucide-vue-next'

export default {
  name: 'StaffSchedule',

  components: {
    Calendar,
    Clock,
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
    X
  },

  props: {},

  data() {
    return {
      activeTab: 'my-schedule',

      // Modal
      showAvailModal: false,

      // Employee info
      employeeId: null,
      currentEmployee: null,

      // Schedule tab
      loadingSchedule: false,
      mySchedules: [],
      allEmployeeSchedules: [],  // All schedules for the month to show other employees
      monthOffset: 0,             // 0 = current month, -1 = last month, +1 = next month

      // Availability tab
      loadingAvail: false,
      myAvailability: [],
      availFilter: 'all',
      savingAvail: false,
      availForm: {
        Date: '',
        TimeIn: '08:00',
        TimeOut: '17:00',
        Type: 'Available',
        Notes: ''
      },

      // Inquiries tab
      loadingInquiries: false,
      myInquiries: [],
      inquiryFilter: 'all',
      savingInquiry: false,
      inquiryForm: {
        ShiftDate: '',
        RequestType: 'Shift Swap',
        Reason: '',
        PreferredDate: ''
      },

      // Toast
      toast: { message: '', type: 'success' },
      toastInstance: null
    }
  },

  computed: {
    todayISO() {
      return new Date().toISOString().slice(0, 10)
    },

    todayLabel() {
      return new Date().toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    },

    // Current month start
    monthStart() {
      const now = new Date()
      const month = now.getMonth() + this.monthOffset
      const year = now.getFullYear() + Math.floor(month / 12)
      return new Date(year, month % 12, 1)
    },

    monthYearLabel() {
      return this.monthStart.toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long'
      })
    },

    // Calendar grid: 42 days (6 weeks)
    monthDays() {
      const days = []
      const monthStart = this.monthStart
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // Start from Monday of the week containing the 1st of the month
      const startDate = new Date(monthStart)
      const dayOfWeek = startDate.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
      startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

      for (let i = 0; i < 42; i++) {
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + i)
        const dateStr = d.toISOString().slice(0, 10)
        const isToday = d.getTime() === today.getTime()
        const isOtherMonth = d.getMonth() !== monthStart.getMonth()

        // Find my shift for this day
        const myShift = this.mySchedules.find(s => s.WorkDate === dateStr)
        
        // Find other employees' shifts for this day
        const allShiftsForDay = this.allEmployeeSchedules.filter(s => s.WorkDate === dateStr)
        const otherShifts = allShiftsForDay.filter(s => s.EmployeeId !== this.employeeId)

        days.push({
          dateStr,
          dayOfMonth: d.getDate(),
          isToday,
          isOtherMonth,
          myShift,
          otherShifts,
          hasShift: !!myShift || otherShifts.length > 0
        })
      }
      return days
    },

    upcomingShifts() {
      const today = this.todayISO
      return this.mySchedules
        .filter(s => s.WorkDate >= today)
        .sort((a, b) => a.WorkDate.localeCompare(b.WorkDate))
        .slice(0, 10)
    },

    filteredAvailability() {
      if (this.availFilter === 'all') return this.myAvailability
      return this.myAvailability.filter(a => a.Status === this.availFilter)
    },

    filteredInquiries() {
      if (this.inquiryFilter === 'all') return this.myInquiries
      return this.myInquiries.filter(i => i.Status === this.inquiryFilter)
    },

    pendingAvailabilityCount() {
      return this.myAvailability.filter(a => a.Status === 'Pending').length
    },

    pendingInquiryCount() {
      return this.myInquiries.filter(i => i.Status === 'Pending' || i.Status === 'Under Review').length
    }
  },

  async mounted() {
    const resolved = await this.resolveEmployeeId()
    if (!resolved) {
      this.showToast('Unable to identify your employee record. Contact your manager.', 'error')
      this.loadingSchedule = false
      return
    }
    await this.loadEmployee()
    await Promise.all([
      this.loadSchedule(),
      this.loadAllSchedules(),
      this.loadAvailability(),
      this.loadInquiries()
    ])
  },

  methods: {
    async resolveEmployeeId() {
      const username = localStorage.getItem('username')
      const branchShort = localStorage.getItem('branch')
      if (!branchShort) return false

      try {
        const { data: branchData } = await supabase
          .from('branch')
          .select('BranchId')
          .eq('Location', branchShort)
          .single()

        if (!branchData) return false

        const { data: employees } = await supabase
          .from('employee')
          .select('EmployeeId, FirstName, LastName, Email')
          .eq('BranchAssigned', branchData.BranchId)
          .eq('Status', 'Active')

        if (!employees || employees.length === 0) return false

        if (username) {
          const normalized = username.replace(/_/g, '.').toLowerCase()
          const byEmail = employees.find(e =>
            e.Email && e.Email.toLowerCase().startsWith(normalized)
          )
          if (byEmail) { this.employeeId = byEmail.EmployeeId; return true }

          const parts = username.split(/[_\-. ]+/).filter(p => p.length > 2)
          const byName = employees.find(e => {
            const full = `${e.FirstName} ${e.LastName}`.toLowerCase()
            return parts.some(p => full.includes(p))
          })
          if (byName) { this.employeeId = byName.EmployeeId; return true }
        }

        this.employeeId = employees[0].EmployeeId
        return true
      } catch (err) {
        console.error('resolveEmployeeId:', err)
        return false
      }
    },

    async loadEmployee() {
      if (!this.employeeId) return
      const { data, error } = await supabase
        .from('employee')
        .select('*, branch("BranchName")')
        .eq('EmployeeId', this.employeeId)
        .single()
      if (!error && data) {
        this.currentEmployee = {
          ...data,
          Branch: data.branch?.BranchName || '—'
        }
      }
    },

    async loadSchedule() {
      if (!this.employeeId) return
      this.loadingSchedule = true
      try {
        const { data, error } = await supabase
          .from('schedule')
          .select('*, branch!inner("BranchName"), employee!inner(EmployeeId, FirstName, LastName)')
          .eq('EmployeeId', this.employeeId)
          .order('ShiftDate', { ascending: false })
        if (error) throw error
        this.mySchedules = (data || []).map(s => ({
          EmployeeId: s.EmployeeId,
          WorkDate: s.ShiftDate,
          TimeIn: s.StartTime ? s.StartTime.slice(0, 5) : '',
          TimeOut: s.EndTime ? s.EndTime.slice(0, 5) : '',
          Branch: s.branch?.BranchName || '',
          Position: s.Role || '',
          Status: s.Status || 'Scheduled'
        }))
      } catch (err) {
        console.error('loadSchedule:', err)
        this.showToast('Failed to load schedule.', 'error')
      } finally {
        this.loadingSchedule = false
      }
    },

    async loadAllSchedules() {
      try {
        const { data, error } = await supabase
          .from('schedule')
          .select('*, branch!inner("BranchName"), employee!inner(EmployeeId, FirstName, LastName)')
          .order('ShiftDate', { ascending: true })
        if (error) throw error
        this.allEmployeeSchedules = (data || []).map(s => ({
          EmployeeId: s.EmployeeId,
          Name: `${s.employee?.FirstName || ''} ${s.employee?.LastName || ''}`.trim() || 'Employee',
          WorkDate: s.ShiftDate,
          TimeIn: s.StartTime ? s.StartTime.slice(0, 5) : '',
          TimeOut: s.EndTime ? s.EndTime.slice(0, 5) : '',
          Branch: s.branch?.BranchName || '',
          Position: s.Role || '',
          Status: s.Status || 'Scheduled'
        }))
      } catch (err) {
        console.error('loadAllSchedules:', err)
      }
    },

    async loadAvailability() {
      if (!this.employeeId) return
      this.loadingAvail = true
      try {
        const { data, error } = await supabase
          .from('availability')
          .select('*')
          .eq('employeeid', this.employeeId)
          .order('availabledate', { ascending: false })
        if (error) throw error
        this.myAvailability = data || []
      } catch (err) {
        console.error('loadAvailability:', err)
      } finally {
        this.loadingAvail = false
      }
    },

    async loadInquiries() {
      if (!this.employeeId) return
      this.loadingInquiries = true
      try {
        const { data, error } = await supabase
          .from('changeinquiry')
          .select('*')
          .eq('employeeid', this.employeeId)
          .order('inquiryid', { ascending: false })
        if (error) throw error
        this.myInquiries = data || []
      } catch (err) {
        console.error('loadInquiries:', err)
      } finally {
        this.loadingInquiries = false
      }
    },

    async submitAvailability() {
      if (!this.availForm.Date) {
        this.showToast('Please select a date.', 'error')
        return
      }
      if (!this.availForm.TimeIn || !this.availForm.TimeOut) {
        this.showToast('Please set time in and time out.', 'error')
        return
      }
      this.savingAvail = true
      try {
        const { error } = await supabase
          .from('availability')
          .insert({
            EmployeeId: this.employeeId,
            Date: this.availForm.Date,
            TimeIn: this.availForm.TimeIn,
            TimeOut: this.availForm.TimeOut,
            Type: this.availForm.Type,
            Notes: this.availForm.Notes,
            Status: 'Pending'
          })
        if (error) throw error
        this.showToast('Availability submitted successfully!', 'success')
        this.availForm = { Date: '', TimeIn: '08:00', TimeOut: '17:00', Type: 'Available', Notes: '' }
        this.showAvailModal = false
        await this.loadAvailability()
      } catch (err) {
        console.error('submitAvailability:', err)
        this.showToast('Failed to submit availability.', 'error')
      } finally {
        this.savingAvail = false
      }
    },

    async submitInquiry() {
      if (!this.inquiryForm.ShiftDate) {
        this.showToast('Please select the shift date.', 'error')
        return
      }
      if (!this.inquiryForm.Reason.trim()) {
        this.showToast('Please provide a reason.', 'error')
        return
      }
      this.savingInquiry = true
      try {
        const { error } = await supabase
          .from('changeinquiry')
          .insert({
            employeeid: this.employeeId,
            requestdate: this.inquiryForm.ShiftDate,
            reason: this.inquiryForm.Reason,
            status: 'Pending'
          })
        if (error) throw error
        this.showToast('Inquiry submitted successfully!', 'success')
        this.inquiryForm = { ShiftDate: '', RequestType: 'Shift Swap', Reason: '', PreferredDate: '' }
        await this.loadInquiries()
      } catch (err) {
        console.error('submitInquiry:', err)
        this.showToast('Failed to submit inquiry.', 'error')
      } finally {
        this.savingInquiry = false
      }
    },

    shiftMonth(offset) {
      if (offset === 0) {
        // Reset to current month
        this.monthOffset = 0
      } else {
        this.monthOffset += offset
      }
    },

    formatShiftDate(dateStr) {
      if (!dateStr) return '—'
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      })
    },

    formatDate(ts) {
      if (!ts) return '—'
      return new Date(ts).toLocaleDateString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric'
      })
    },

    shiftStatusClass(status) {
      const map = {
        Active: 'status-active',
        Inactive: 'status-inactive',
        Cancelled: 'status-cancelled',
        Completed: 'status-completed'
      }
      return map[status] || 'status-inactive'
    },

    statusClass(status) {
      const map = {
        Pending: 'status-pending',
        Approved: 'status-approved',
        Rejected: 'status-rejected',
        'Under Review': 'status-review'
      }
      return map[status] || 'status-inactive'
    },

    availTypeClass(type) {
      const map = {
        Available: 'available-type',
        Unavailable: 'unavailable-type',
        Preferred: 'preferred-type'
      }
      return map[type] || ''
    },

    showToast(message, type = 'success') {
      this.toast = { message, type }
      setTimeout(() => {
        this.toast.message = ''
      }, 3500)
    },

    hideToast() {
      this.toast.message = ''
    }
  }
}
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────────── */
.schedule-content {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
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
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.header-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
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

/* ── Week Navigator ────────────────────────────────────────────── */
.month-navigator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: white;
  border: 2px solid #5d4037;
  border-radius: 8px;
  cursor: pointer;
  color: #5d4037;
  transition: all 0.2s;
  font-weight: 600;
}

.nav-btn:hover {
  background: #5d4037;
  color: white;
  box-shadow: 0 2px 8px rgba(93, 64, 55, 0.2);
}

.month-label {
  font-weight: 600;
  color: #1f2937;
  min-width: 180px;
  text-align: center;
  font-size: 1.1rem;
}

.today-link {
  font-weight: 600;
  color: #5d4037;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.65rem 1.25rem;
  border: 2px solid #5d4037;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
}

.today-link:hover {
  background: #5d4037;
  color: white;
  box-shadow: 0 2px 8px rgba(93, 64, 55, 0.2);
}

.today-btn {
  font-weight: 600;
  color: #5d4037;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.65rem 1.25rem;
  border: 2px solid #5d4037;
  border-radius: 8px;
  background: white;
  transition: all 0.2s;
}

.today-btn:hover {
  background: #5d4037;
  color: white;
  box-shadow: 0 2px 8px rgba(93, 64, 55, 0.2);
}

/* ── Calendar Grid ────────────────────────────────────────────── */
.calendar-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}

.calendar-day-header {
  padding: 1rem;
  text-align: center;
  font-weight: 600;
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
  background: white;
}

.calendar-day {
  min-height: 120px;
  padding: 0.75rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  transition: all 0.2s;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day:nth-last-child(-n+7) {
  border-bottom: none;
}

.calendar-day:hover {
  background: #f9fafb;
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

.calendar-day.has-shift {
  background: #fffbf7;
}

.day-number {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.today-badge {
  display: inline-block;
  background: #5d4037;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 4px;
  letter-spacing: 0.3px;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8rem;
}

.event {
  padding: 0.4rem 0.5rem;
  border-radius: 4px;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-shift {
  background: #5d4037;
  color: white;
  font-weight: 600;
}

.event-time {
  font-size: 0.75rem;
  opacity: 0.9;
}

.event-label {
  font-size: 0.8rem;
  font-weight: 600;
}

.other-shift {
  background: #e8d4d0;
  color: #4e342e;
  font-weight: 500;
  font-size: 0.75rem;
}

.event-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-summary {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.event-count {
  padding: 0.3rem 0.5rem;
  background: #f3e5e0;
  color: #5d4037;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 600;
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

.available-type {
  color: #059669;
  font-weight: 600;
}

.unavailable-type {
  color: #dc2626;
  font-weight: 600;
}

.preferred-type {
  color: #5d4037;
  font-weight: 600;
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

/* ── Modal ─────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  animation: fadeIn 0.15s ease;
}

.modal-dialog {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.25s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-subtitle {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
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

  .month-navigator {
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .month-label {
    font-size: 1rem;
    min-width: 150px;
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

  .event {
    padding: 0.3rem 0.4rem;
    font-size: 0.7rem;
  }

  .event-time {
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
</style>