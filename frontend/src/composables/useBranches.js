import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase.js'

export function useBranches() {
  const branches = ref([])
  const isLoading = ref(true)

  const fetchBranches = async () => {
    isLoading.value = true
    const { data, error } = await supabase
      .from('branch')
      .select('BranchId, BranchName, Location')
      .order('BranchName')

    if (error) {
      console.error('Failed to fetch branches:', error.message)
      branches.value = []
    } else if (data) {
      branches.value = data.map(b => ({
        id: String(b.BranchId),
        name: b.BranchName,
        address: b.Location || '',
      }))
    }
    isLoading.value = false
  }

  onMounted(fetchBranches)

  return { branches, isLoading, refetch: fetchBranches }
}
