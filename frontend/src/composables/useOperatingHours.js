import { ref } from 'vue'
import { supabase } from '@/supabase.js'

export function useOperatingHours() {
  const hoursByBranch = ref({})
  const loading = ref(false)

  async function fetchOperatingHours(branchId) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('branch_operating_hours')
        .select('*')
        .eq('branchid', branchId)
        .order('dayofweek')

      if (error) throw error

      const days = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        openTime: '08:00',
        closeTime: '17:00',
        isOpen: true,
      }))

      if (data) {
        data.forEach((row) => {
          days[row.dayofweek] = {
            id: row.id,
            dayOfWeek: row.dayofweek,
            openTime: row.opentime ? row.opentime.slice(0, 5) : '08:00',
            closeTime: row.closetime ? row.closetime.slice(0, 5) : '17:00',
            isOpen: row.isopen,
          }
        })
      }

      hoursByBranch.value[branchId] = days
      return days
    } catch (e) {
      console.warn('fetchOperatingHours error:', e)
      const fallback = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isOpen: true,
      }))
      hoursByBranch.value[branchId] = fallback
      return fallback
    } finally {
      loading.value = false
    }
  }

  async function saveOperatingHours(branchId, days) {
    loading.value = true
    try {
      for (const day of days) {
        const existing = hoursByBranch.value[branchId]?.[day.dayOfWeek]
        if (existing?.id) {
          const { error } = await supabase
            .from('branch_operating_hours')
            .update({
              opentime: day.openTime,
              closetime: day.closeTime,
              isopen: day.isOpen,
            })
            .eq('id', existing.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('branch_operating_hours')
            .insert({
              branchid: branchId,
              dayofweek: day.dayOfWeek,
              opentime: day.openTime,
              closetime: day.closeTime,
              isopen: day.isOpen,
            })
          if (error) throw error
        }
      }
      hoursByBranch.value[branchId] = days
      return true
    } catch (e) {
      console.warn('saveOperatingHours error:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchOperatingHoursForAll(branches) {
    if (!branches?.length) return
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('branch_operating_hours')
        .select('*')
        .order('dayofweek')

      if (error) throw error

      branches.forEach((b) => {
        const days = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: '08:00',
          closeTime: '17:00',
          isOpen: true,
        }))
        const branchRows = (data || []).filter((r) => r.branchid === Number(b.id))
        branchRows.forEach((row) => {
          days[row.dayofweek] = {
            id: row.id,
            dayOfWeek: row.dayofweek,
            openTime: row.opentime ? row.opentime.slice(0, 5) : '08:00',
            closeTime: row.closetime ? row.closetime.slice(0, 5) : '17:00',
            isOpen: row.isopen,
          }
        })
        hoursByBranch.value[b.id] = days
      })
    } catch (e) {
      console.warn('fetchOperatingHoursForAll error:', e)
      branches.forEach((b) => {
        hoursByBranch.value[b.id] = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i, openTime: '08:00', closeTime: '17:00', isOpen: true,
        }))
      })
    } finally {
      loading.value = false
    }
  }

  function getHoursForDay(branchId, dayOfWeek) {
    const days = hoursByBranch.value[branchId]
    if (!days) return null
    return days[dayOfWeek] || null
  }

  return {
    hoursByBranch,
    loading,
    fetchOperatingHours,
    saveOperatingHours,
    fetchOperatingHoursForAll,
    getHoursForDay,
  }
}
