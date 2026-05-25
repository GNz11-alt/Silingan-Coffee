import { supabase } from '@/supabase.js'

export function useNotifications() {
  const role = localStorage.getItem('role') || ''

  function baseQuery(branchId = null) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(100)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }
    return query
  }

  async function fetchNotifications(branchId = null) {
    const query = baseQuery(branchId).eq('is_read', false).limit(50)
    const { data, error } = await query
    if (error) {
      console.error('[Notifications] fetch failed:', error)
      return []
    }
    return data || []
  }

  async function fetchAllNotifications(branchId = null) {
    const { data, error } = await baseQuery(branchId)
    if (error) {
      console.error('[Notifications] fetchAll failed:', error)
      return []
    }
    return data || []
  }

  async function markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
    if (error) console.error('[Notifications] markAsRead failed:', error)
  }

  async function markAllAsRead(branchId = null) {
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('role', role)
      .eq('is_read', false)

    if (branchId) {
      query = query.eq('branch_id', branchId)
    }

    const { error } = await query
    if (error) console.error('[Notifications] markAllAsRead failed:', error)
  }

  async function addNotification({ branch_id, category, title, message, severity = 'medium', link = null }) {
    const record = {
      role,
      branch_id,
      category,
      title,
      message,
      severity,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    if (link) record.link = link

    const { error } = await supabase.from('notifications').insert(record)
    if (error) console.error('[Notifications] addNotification failed:', error)
  }

  return { role, fetchNotifications, fetchAllNotifications, markAsRead, markAllAsRead, addNotification }
}
