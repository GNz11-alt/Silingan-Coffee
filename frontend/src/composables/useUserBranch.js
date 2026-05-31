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

    const parsed = parseInt(rawBranch, 10)
    if (!isNaN(parsed)) {
      // Stored as numeric BranchId — keep as string for consistency
      userBranchId.value = String(parsed)
      const { data } = await supabase
        .from('branch')
        .select('BranchName')
        .eq('BranchId', parsed)
        .maybeSingle()
      userBranchName.value = data?.BranchName || rawBranch
      return
    }

    // Stored as branch name/location — look up by BranchName then Location
    const { data } = await supabase
      .from('branch')
      .select('BranchId, BranchName')
      .or(`BranchName.eq.${rawBranch},Location.eq.${rawBranch}`)
      .maybeSingle()

    if (data) {
      userBranchId.value = data.BranchId
      userBranchName.value = data.BranchName
    } else {
      userBranchId.value = null
      userBranchName.value = rawBranch || 'Unknown'
    }
  }

  return { role, rawBranch, isAdmin, userBranchId, userBranchName, resolveBranch }
}
