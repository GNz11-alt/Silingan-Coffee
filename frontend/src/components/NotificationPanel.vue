<template>
  <div class="notif-overlay" @click.self="$emit('close')">
    <div class="notif-panel">
      <div class="notif-header">
        <span class="notif-title">Notifications</span>
        <div class="notif-header-actions">
          <button class="notif-refresh" @click="refreshNow" :disabled="loading">Refresh</button>
          <button v-if="tab === 'new' && unreadCount" class="notif-mark-all" @click="markAll">Mark all read</button>
        </div>
      </div>
      <div class="notif-last-updated">
        Last updated: {{ lastUpdatedLabel }}
      </div>

      <div class="notif-tabs">
        <button class="notif-tab" :class="{ active: tab === 'new' }" @click="switchTab('new')">
          New
          <span v-if="unreadCount" class="notif-tab-badge">{{ unreadCount }}</span>
        </button>
        <button class="notif-tab" :class="{ active: tab === 'history' }" @click="switchTab('history')">History</button>
      </div>

      <div v-if="loading" class="notif-loading">
        <div class="spinner-border spinner-border-sm text-muted"></div>
      </div>

      <div v-else-if="!notifications.length" class="notif-empty">
        <i class="bi" :class="tab === 'new' ? 'bi-bell-slash' : 'bi-clock-history'" fs-4></i>
        <p>{{ tab === 'new' ? 'No new notifications' : 'No notification history' }}</p>
      </div>

      <div v-else class="notif-list">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="notif-item"
          :class="{ 'notif-item--read': n.is_read }"
          @click="openDetail(n)"
        >
          <div class="notif-item-top">
            <span v-if="!n.is_read" class="notif-dot"></span>
            <span class="notif-severity" :class="'sev--' + n.severity">{{ n.severity }}</span>
            <span class="notif-category">{{ n.category }}</span>
          </div>
          <div class="notif-item-title">{{ n.title }}</div>
          <div class="notif-item-msg">{{ n.message }}</div>
          <div class="notif-item-time">{{ timeAgo(n.created_at) }}</div>
        </div>
      </div>
    </div>

    <!-- Detail popup -->
    <Teleport to="body">
      <div v-if="detail" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-modal">
          <div class="detail-header">
            <span class="detail-severity" :class="'sev--' + detail.severity">{{ detail.severity.toUpperCase() }}</span>
            <span class="detail-category">{{ detail.category }}</span>
            <button class="btn-close-panel" @click="closeDetail"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="detail-title">{{ detail.title }}</div>
          <div class="detail-body">{{ detail.message }}</div>
          <div class="detail-footer">
            <button class="btn btn-ghost" @click="closeDetail">Close</button>
            <button v-if="detail.link" class="btn btn-primary-brand" @click="goToLink">
              <i class="bi bi-box-arrow-up-right me-1"></i> Go to {{ linkLabel }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotifications } from '@/composables/useNotifications.js'
import { useRouter } from 'vue-router'

const props = defineProps({
  branchId: { type: Number, default: null },
})
const emit = defineEmits(['close', 'update-count'])

const router = useRouter()
const {
  fetchNotificationBundle,
  markAsRead,
  markAllAsRead,
} = useNotifications()
const notifications = ref([])
const loading = ref(true)
const tab = ref('new')
const unreadCount = ref(0)
const detail = ref(null)
const unread = ref([])
const history = ref([])
const lastUpdated = ref(0)

const linkLabel = computed(() => {
  if (!detail.value?.link) return ''
  const parts = detail.value.link.split('/')
  return parts[parts.length - 1] || 'Module'
})

onMounted(async () => {
  await loadNotifications({ force: false })
})

async function switchTab(t) {
  tab.value = t
  notifications.value = t === 'new' ? unread.value : history.value
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function openDetail(n) {
  detail.value = n
  if (!n.is_read) {
    markAsRead(n.id)
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    if (tab.value === 'new') {
      notifications.value = notifications.value.filter(x => x.id !== n.id)
    }
    emit('update-count', unreadCount.value)
  }
}

function closeDetail() {
  detail.value = null
}

function goToLink() {
  if (detail.value?.link) {
    router.push(detail.value.link)
  }
  detail.value = null
}

async function markAll() {
  await markAllAsRead(props.branchId)
  unreadCount.value = 0
  unread.value = []
  notifications.value = tab.value === 'new' ? [] : history.value
  emit('update-count', 0)
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'Never'
  return new Date(lastUpdated.value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function loadNotifications({ force }) {
  loading.value = true
  const bundle = await fetchNotificationBundle(props.branchId, { force })
  unread.value = bundle.unread || []
  history.value = bundle.all || []
  unreadCount.value = unread.value.length
  notifications.value = tab.value === 'new' ? unread.value : history.value
  lastUpdated.value = bundle.lastRefresh || Date.now()
  loading.value = false
  emit('update-count', unreadCount.value)
}

async function refreshNow() {
  await loadNotifications({ force: true })
}
</script>

<style scoped>
.notif-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: transparent;
}
.notif-panel {
  position: absolute;
  top: 60px;
  right: 20px;
  width: 380px;
  max-height: 500px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.18);
  border: 1px solid #e5e0dd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0ebe8;
}
.notif-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.notif-refresh {
  background: none;
  border: 1px solid #e5e0dd;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #374151;
  padding: 3px 8px;
  cursor: pointer;
}
.notif-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.notif-last-updated {
  padding: 8px 16px;
  border-bottom: 1px solid #f0ebe8;
  font-size: 0.7rem;
  color: #6b7280;
}
.notif-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a1a;
}
.notif-mark-all {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7B1D1D;
  cursor: pointer;
}
.notif-mark-all:hover {
  text-decoration: underline;
}
.notif-tabs {
  display: flex;
  border-bottom: 1px solid #f0ebe8;
}
.notif-tab {
  flex: 1;
  background: none;
  border: none;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: color 0.15s, border-color 0.15s;
}
.notif-tab:hover {
  color: #7B1D1D;
}
.notif-tab.active {
  color: #7B1D1D;
  border-bottom-color: #7B1D1D;
}
.notif-tab-badge {
  background: #7B1D1D;
  color: #fff;
  font-size: 0.62rem;
  min-width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 700;
  padding: 0 4px;
}
.notif-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #6b7280;
}
.notif-empty p {
  margin-top: 0.5rem;
  font-size: 0.84rem;
}
.notif-list {
  overflow-y: auto;
  flex: 1;
}
.notif-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0ebe8;
  cursor: pointer;
  transition: background 0.12s;
}
.notif-item:hover {
  background: #faf7f5;
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-item--read {
  opacity: 0.55;
}
.notif-item--read:hover {
  background: transparent;
  cursor: default;
}
.notif-item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.notif-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7B1D1D;
  flex-shrink: 0;
}
.notif-severity {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  border-radius: 4px;
}
.sev--high {
  background: #F5EDE8;
  color: #7B1D1D;
}
.sev--medium {
  background: #F0EBE3;
  color: #8D6E63;
}
.sev--low {
  background: #f3f4f6;
  color: #6b7280;
}
.notif-category {
  font-size: 0.62rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
}
.notif-item-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.3;
}
.notif-item-msg {
  font-size: 0.78rem;
  color: #374151;
  line-height: 1.4;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-item-time {
  font-size: 0.68rem;
  color: #9ca3af;
  margin-top: 4px;
}

/* Detail popup */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}
.detail-modal {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
  animation: slideUp 0.22s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0ebe8;
}
.detail-severity {
  font-size: 0.64rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 3px 8px;
  border-radius: 4px;
}
.detail-category {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: capitalize;
}
.btn-close-panel {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
}
.detail-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
  padding: 16px 20px 8px;
  line-height: 1.3;
}
.detail-body {
  font-size: 0.85rem;
  color: #374151;
  line-height: 1.6;
  padding: 0 20px 16px;
  overflow-y: auto;
  flex: 1;
}
.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #f0ebe8;
}
.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.18s;
}
.btn-ghost {
  background: transparent;
  border: 1px solid #e5e0dd;
  color: #1a1a1a;
}
.btn-ghost:hover {
  background: #f0ebe8;
}
.btn-primary-brand {
  background: #7B1D1D;
  color: #fff;
}
.btn-primary-brand:hover {
  background: #A83232;
}
</style>
