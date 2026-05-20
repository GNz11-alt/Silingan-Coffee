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

  watch(() => items.value, () => {
    rebuildIndex()
    runSearch()
  }, { deep: true })

  const debouncedUpdate = () => {
    isSearching.value = true
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedQuery.value = query.value
      runSearch()
    }, debounceMs)
  }

  watch(query, () => {
    hasSearched.value = true
    debouncedUpdate()
  })

  const runSearch = () => {
    const itemList = items.value || []
    const q = debouncedQuery.value.trim()

    if (!q && !hasActiveScopes()) {
      results.value = []
      isSearching.value = false
      return
    }

    let filtered = itemList

    // Apply scope filters first
    if (scopes.value.branches.length > 0) {
      filtered = filtered.filter(item => scopes.value.branches.includes(item.branch))
    }
    if (scopes.value.categories.length > 0) {
      filtered = filtered.filter(item => scopes.value.categories.includes(item.category))
    }
    if (scopes.value.statuses.length > 0) {
      filtered = filtered.filter(item => scopes.value.statuses.includes(item.status))
    }
    if (scopes.value.departments.length > 0) {
      filtered = filtered.filter(item => scopes.value.departments.includes(item.department))
    }
    if (scopes.value.types.length > 0) {
      filtered = filtered.filter(item => scopes.value.types.includes(item.type))
    }
    if (scopes.value.dateRange.from || scopes.value.dateRange.to) {
      filtered = filtered.filter(item => {
        if (!item.date) return true
        const d = new Date(item.date)
        if (scopes.value.dateRange.from && d < new Date(scopes.value.dateRange.from)) return false
        if (scopes.value.dateRange.to && d > new Date(scopes.value.dateRange.to)) return false
        return true
      })
    }

    // Apply fuzzy search
    if (q && fuseInstance) {
      filtered = fuseInstance.search(q).map(r => r.item)
      // Re-intersect with scope-filtered items
      const scopeSet = new Set(filtered)
      filtered = filtered.filter(item => scopeSet.has(item))
    }

    results.value = filtered
    isSearching.value = false
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

  const setScopes = (newScopes) => {
    scopes.value = { ...scopes.value, ...newScopes }
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
    runSearch()
  }

  const clearQuery = () => {
    query.value = ''
    debouncedQuery.value = ''
    hasSearched.value = false
    results.value = []
  }

  // For autocomplete: get top N suggestions
  const getSuggestions = (limit = 8) => {
    if (!debouncedQuery.value.trim() || !fuseInstance) return []
    return fuseInstance.search(debouncedQuery.value).slice(0, limit).map(r => ({
      item: r.item,
      score: r.score,
    }))
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
    getSuggestions,
    rebuildIndex,
  }
}
