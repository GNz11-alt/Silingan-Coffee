/** Shared schedule utilities for admin/manager Schedule views */

export function getMonthStart(monthOffset = 0) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
}

/** Local YYYY-MM-DD (avoids UTC drift from toISOString) */
export function toLocalDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function normalizeDateKey(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function normalizeTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

export function timesOverlap(startA, endA, startB, endB) {
  const a = normalizeTime(startA)
  const b = normalizeTime(endA)
  const c = normalizeTime(startB)
  const d = normalizeTime(endB)
  if (!a || !b || !c || !d) return false
  return a < d && b > c
}

export function buildSchedulesByDate(schedules) {
  const map = new Map()
  for (const sched of schedules) {
    const key = normalizeDateKey(sched.shiftDate)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(sched)
  }
  return map
}

export function availabilitySinceDate(days = 30) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return toLocalDateKey(d)
}
