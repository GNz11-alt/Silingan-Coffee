import { ref, computed, watch } from 'vue'
import Fuse from 'fuse.js'

export function useSearch(items, options = {}) {
  const {
    keys = [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'category', weight: 0.2 },
      { name: 'details', weight: 0.1 },
    ],
    threshold = 0.4,
    debounceMs = 300,
  } = options

  const query = ref('')
  const debouncedQuery = ref('')
  const results = ref([])
  const isSearching = ref(false)
  const hasSearched = ref(false)
  const totalCount = ref(0)

  // Scopes
  const scopes = ref({
    branches: [],
    categories: [],
    statuses: [],
    departments: [],
    dateRange: { from: null, to: null },
    types: [],
  })

  let fuseInstance = null
  let debounceTimer = null

  const rebuildIndex = () => {
    const itemList = items.value || []
    fuseInstance = new Fuse(itemList, {
      keys,
      threshold,
      includeScore: true,
      shouldSort: true,
      minMatchCharLength: 2,
    })
    totalCount.value = itemList.length
  }

  const hasActiveScopes = () => {
    const s = scopes.value
    return s.branches.length > 0 ||
      s.categories.length > 0 ||
      s.statuses.length > 0 ||
      s.departments.length > 0 ||
      s.types.length > 0 ||
      s.dateRange.from ||
      s.dateRange.to
  }

  const runSearch = () => {
    const itemList = items.value || []
    const q = debouncedQuery.value.trim()

    if (!q && !hasActiveScopes()) {
      results.value = []
      isSearching.value = false
      return
    }

    let filtered = itemList

    // Apply branch scope — for items with branch='all', always include them unless a specific branch is selected
    if (scopes.value.branches.length > 0) {
      filtered = filtered.filter(item =>
        item.branch === 'all' || scopes.value.branches.includes(String(item.branch))
      )
    }
    if (scopes.value.categories.length > 0) {
      filtered = filtered.filter(item =>
        item.category && scopes.value.categories.some(c => c.toLowerCase() === item.category.toLowerCase())
      )
    }
    if (scopes.value.statuses.length > 0) {
      filtered = filtered.filter(item =>
        item.status && scopes.value.statuses.some(s => s.toLowerCase() === item.status.toLowerCase())
      )
    }
    if (scopes.value.departments.length > 0) {
      filtered = filtered.filter(item =>
        item.department && scopes.value.departments.some(d => d.toLowerCase() === item.department.toLowerCase())
      )
    }
    if (scopes.value.types.length > 0) {
      filtered = filtered.filter(item =>
        item.type && scopes.value.types.some(t => t.toLowerCase() === item.type.toLowerCase())
      )
    }
    if (scopes.value.dateRange.from || scopes.value.dateRange.to) {
      filtered = filtered.filter(item => {
        if (!item.date) return false
        const d = new Date(item.date)
        if (scopes.value.dateRange.from && d < new Date(scopes.value.dateRange.from)) return false
        if (scopes.value.dateRange.to && d > new Date(scopes.value.dateRange.to)) return false
        return true
      })
    }

    const scopeFiltered = filtered

    if (q && fuseInstance) {
      // Rebuild fuse on the scope-filtered subset for accurate results
      const subFuse = new Fuse(scopeFiltered, {
        keys,
        threshold,
        includeScore: true,
        shouldSort: true,
        minMatchCharLength: 2,
      })
      filtered = subFuse.search(q).map(r => r.item)
    }

    results.value = filtered
    isSearching.value = false
  }

  const debouncedUpdate = () => {
    isSearching.value = true
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedQuery.value = query.value
      runSearch()
    }, debounceMs)
  }

  watch(query, (val) => {
    if (val && val.length > 200) query.value = val.slice(0, 200)
    hasSearched.value = true
    debouncedUpdate()
  })

  watch(() => items.value, () => {
    rebuildIndex()
    runSearch()
  }, { immediate: true, deep: true })

  const setScopes = (newScopes) => {
    scopes.value = { ...scopes.value, ...newScopes }
    hasSearched.value = true
    runSearch()
  }

  const clearScopes = () => {
    scopes.value = {
      branches: [],
      categories: [],
      statuses: [],
      departments: [],
      dateRange: { from: null, to: null },
      types: [],
    }
    if (!query.value.trim()) hasSearched.value = false
    runSearch()
  }

  const clearQuery = () => {
    query.value = ''
    debouncedQuery.value = ''
    hasSearched.value = false
    results.value = []
  }

  return {
    query,
    results,
    isSearching,
    hasSearched,
    totalCount,
    scopes,
    setScopes,
    clearScopes,
    clearQuery,
    rebuildIndex,
  }
}
