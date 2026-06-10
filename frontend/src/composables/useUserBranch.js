import { ref } from 'vue'
import { supabase } from '@/supabase.js'

export function useUserBranch() {
  const role = localStorage.getItem('role') || ''
  const rawBranch = localStorage.getItem('branch') || ''
  const isAdmin = role === 'admin'
  const userBranchId = ref(null)
  const userBranchName = ref('')

  const resolveBranch = async () => {
    if (isAdmin) {
      userBranchId.value = null
      userBranchName.value = 'All Branches'
      return
    }

    if (!rawBranch || rawBranch === 'all') {
      userBranchId.value = null
      userBranchName.value = ''
      return
    }

    // Try matching by BranchId (if stored as numeric ID)
    const parsed = parseInt(rawBranch, 10)
    if (!isNaN(parsed) && String(parsed) === rawBranch.trim()) {
      const { data } = await supabase
        .from('branch')
        .select('BranchId, BranchName')
        .eq('BranchId', parsed)
        .maybeSingle()
      if (data) {
        userBranchId.value = data.BranchId
        userBranchName.value = data.BranchName
        return
      }
    }

    // Try exact match on BranchName or Location first
    const { data: exact } = await supabase
      .from('branch')
      .select('BranchId, BranchName')
      .or(`BranchName.ilike.${rawBranch},Location.ilike.${rawBranch}`)
      .maybeSingle()
    if (exact) {
      userBranchId.value = exact.BranchId
      userBranchName.value = exact.BranchName
      return
    }

    // Fallback: partial match (for cases where users.branch stores a substring)
    const { data: fuzzy } = await supabase
      .from('branch')
      .select('BranchId, BranchName')
      .or(`BranchName.ilike.%${rawBranch}%,Location.ilike.%${rawBranch}%`)
      .order('BranchId')
      .limit(1)
      .maybeSingle()
    if (fuzzy) {
      userBranchId.value = fuzzy.BranchId
      userBranchName.value = fuzzy.BranchName
      return
    }

    userBranchId.value = null
    userBranchName.value = rawBranch || 'Unknown'
  }

  return { role, rawBranch, isAdmin, userBranchId, userBranchName, resolveBranch }
}
