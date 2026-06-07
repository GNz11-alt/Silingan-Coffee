<template>
  <div class="search-module" @keydown="handleKeydown">
    <header class="module-header">
      <div class="header-titles">
        <h1>Search</h1>
        <p class="search-context">
          Search data for:
          <span class="active-context">{{ selectedBranchName }}</span>
        </p>
      </div>

      <div class="branch-indicator">
        <MapPin class="pin-icon" :size="16" />
        <span>{{ selectedBranchName }}</span>
      </div>
    </header>

    <div v-if="searchError" class="alert-error mb-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ searchError }}
    </div>

    <div class="universal-search-card">
      <div class="card-header">
        <SearchIcon class="search-icon-tan" :size="20" />
        <div>
          <h3>Search</h3>
          <p>Search for menu items, inventory, and more</p>
        </div>
      </div>
      <div class="search-input-row">
        <div class="input-container" ref="inputContainerRef">
          <input
            ref="searchInputRef"
            v-model="search.query.value"
            type="text"
            placeholder="Type to search... (Ctrl+K)"
            @focus="autocompleteOpen = true"
            @blur="onInputBlur"
            @keydown="onInputKeydown"
          />
          <SearchAutocomplete
            ref="autocompleteRef"
            :get-suggestions="search.getSuggestions"
            :query="search.query.value"
            @select="onAutocompleteSelect"
            @close="autocompleteOpen = false"
          />
        </div>
        <button class="filter-btn" @click="openFilters">
          <SlidersHorizontal :size="16" />
          Filters
          <span v-if="activeFilterCount > 0" class="filter-badge">{{
            activeFilterCount
          }}</span>
        </button>
      </div>

      <div v-if="activeFilterCount > 0" class="filter-chips">
        <span v-for="(chip, i) in filterChips" :key="i" class="filter-chip">
          {{ chip.label }}: {{ chip.value }}
          <button class="chip-remove" @click="chip.remove">&times;</button>
        </span>
        <button class="clear-chips-btn" @click="search.clearScopes()">
          Clear all
        </button>
      </div>
    </div>

    <div
      v-if="search.hasSearched.value && !search.isSearching.value"
      class="result-meta"
    >
      <span class="result-count">
        Showing <strong>{{ search.results.value.length }}</strong> of
        <strong>{{ search.totalCount.value }}</strong> results
      </span>
      <span v-if="search.query.value" class="result-query">
        for "{{ search.query.value }}"
      </span>
    </div>

    <div v-if="dataLoading" class="loading-state">
      <div class="spinner"></div>
      Loading data...
    </div>

    <div
      v-else-if="
        search.hasSearched.value &&
        search.results.value.length === 0 &&
        !search.isSearching.value
      "
      class="empty-state"
    >
      <SearchIcon :size="40" class="empty-icon" />
      <p class="empty-title">No results found</p>
      <p class="empty-hint">
        <template v-if="search.query.value">
          No matches for "<strong>{{ search.query.value }}</strong
          >".
        </template>
        Try adjusting your search query or filters.
      </p>
    </div>

    <SearchResults
      v-else-if="search.results.value.length > 0"
      :results="search.results.value"
      :query="search.query.value"
      @select="onResultSelect"
    />

    <div v-else class="empty-state">
      <SearchIcon :size="40" class="empty-icon" />
      <p class="empty-title">Search menu items and inventory</p>
      <p class="empty-hint">
        Type a query above to search products and raw materials.
      </p>
    </div>

    <SearchFilters
      :is-open="showFilters"
      :scopes="search.scopes.value"
      role="staff"
      @close="showFilters = false"
      @apply="onApplyFilters"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
} from "lucide-vue-next";
import { useSearch } from "@/composables/useSearch.js";
import { useBranches } from "@/composables/useBranches.js";
import { useSearchData } from "@/composables/useSearchData.js";
import { useUserBranch } from "@/composables/useUserBranch.js";
import SearchAutocomplete from "@/components/SearchAutocomplete.vue";
import SearchFilters from "@/components/SearchFilters.vue";
import SearchResults from "@/components/SearchResults.vue";

const { branches } = useBranches();
const { isAdmin, userBranchId, userBranchName, resolveBranch } =
  useUserBranch();
const router = useRouter();

const { allItems, isLoading: dataLoading, error: searchError } = useSearchData(userBranchId.value, ['product', 'rawmaterial']);

const search = useSearch(allItems);

const ROUTE_MAP = {
  product: { path: "/staff/menu" },
  rawmaterial: { path: "/staff/inventory" },
};

function onResultSelect(result) {
  const route = ROUTE_MAP[result.type];
  if (!route) return;
  const entityId = result.id.replace(/^[a-z]+-/, "");
  router.push({ path: route.path, query: { edit: entityId } });
}

const selectedBranchId = ref(userBranchId.value);

const selectedBranchName = computed(() => {
  if (!selectedBranchId.value) return "All Branches";
  return (
    userBranchName.value ||
    branches.value.find((b) => b.id === selectedBranchId.value)?.name ||
    "Unknown"
  );
});

const inputContainerRef = ref(null);
const searchInputRef = ref(null);
const autocompleteRef = ref(null);
const autocompleteOpen = ref(false);

const onInputBlur = () => {
  setTimeout(() => {
    autocompleteOpen.value = false;
  }, 200);
};

const onInputKeydown = (e) => {
  if (!autocompleteRef.value) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    autocompleteRef.value.navigateDown();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    autocompleteRef.value.navigateUp();
  } else if (e.key === "Enter") {
    e.preventDefault();
    autocompleteRef.value.selectActive();
  } else if (e.key === "Escape") {
    autocompleteRef.value.close();
    e.target.blur();
  }
};

const onAutocompleteSelect = () => {
  autocompleteOpen.value = false;
};

const showFilters = ref(false);

const openFilters = () => {
  showFilters.value = true;
};

const onApplyFilters = (scopes) => {
  search.setScopes(scopes);
  showFilters.value = false;
};

const activeFilterCount = computed(() => {
  const s = search.scopes.value;
  let count = 0;
  if (s.branches.length > 0) count += s.branches.length;
  if (s.categories.length > 0) count += s.categories.length;
  if (s.statuses.length > 0) count += s.statuses.length;
  if (s.departments.length > 0) count += s.departments.length;
  if (s.types.length > 0) count += s.types.length;
  if (s.dateRange.from || s.dateRange.to) count += 1;
  return count;
});

const filterChips = computed(() => {
  const chips = [];
  const s = search.scopes.value;
  s.branches.forEach((b) => {
    const name = branches.value.find((br) => br.id === b)?.name || b;
    chips.push({
      label: "Branch",
      value: name,
      remove: () =>
        search.setScopes({ branches: s.branches.filter((x) => x !== b) }),
    });
  });
  s.categories.forEach((c) =>
    chips.push({
      label: "Category",
      value: c,
      remove: () =>
        search.setScopes({ categories: s.categories.filter((x) => x !== c) }),
    }),
  );
  s.statuses.forEach((st) =>
    chips.push({
      label: "Status",
      value: st,
      remove: () =>
        search.setScopes({ statuses: s.statuses.filter((x) => x !== st) }),
    }),
  );
  s.departments.forEach((d) =>
    chips.push({
      label: "Department",
      value: d,
      remove: () =>
        search.setScopes({ departments: s.departments.filter((x) => x !== d) }),
    }),
  );
  s.types.forEach((t) =>
    chips.push({
      label: "Type",
      value: t,
      remove: () => search.setScopes({ types: s.types.filter((x) => x !== t) }),
    }),
  );
  if (s.dateRange.from || s.dateRange.to) {
    const range = [s.dateRange.from || "...", s.dateRange.to || "..."].join(
      " - ",
    );
    chips.push({
      label: "Date",
      value: range,
      remove: () => search.setScopes({ dateRange: { from: null, to: null } }),
    });
  }
  return chips;
});

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
};

onMounted(async () => {
  await resolveBranch();
  selectedBranchId.value = userBranchId.value;
  if (selectedBranchId.value) {
    search.setScopes({ branches: [selectedBranchId.value] });
  }
});
</script>

<style scoped>
.search-module {
  padding: 24px 32px;
  font-family: "Inter", sans-serif;
  background: #fafafa;
  min-height: 100vh;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.header-titles h1 {
  font-size: 26px;
  font-weight: 800;
  color: #31201d;
  margin: 0 0 6px;
}
.search-context {
  font-size: 14px;
  color: #888;
  margin: 4px 0 0;
}
.active-context {
  color: #31201d;
}

.branch-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c49a6c;
  font-weight: 600;
  font-size: 14px;
}
.pin-icon {
  color: #c49a6c;
}

.universal-search-card {
  background: white;
  border: 1px solid #f1e6d2;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}
.card-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.search-icon-tan {
  color: #c49a6c;
}
.search-input-row {
  display: flex;
  gap: 12px;
}
.input-container {
  flex: 1;
  position: relative;
}
.input-container input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  background: #fafafa;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
}
.input-container input:focus {
  border-color: #c49a6c;
  background: white;
}
.filter-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: white;
  border: 1px solid #f1e6d2;
  color: #c49a6c;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  position: relative;
}
.filter-btn:hover {
  background: #fff9f0;
}
.filter-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #c49a6c;
  color: white;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fff4e5;
  color: #8b4513;
  border: 1px solid #f1e6d2;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
}
.chip-remove {
  background: none;
  border: none;
  color: #c49a6c;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
}
.clear-chips-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 4px;
}

.result-meta {
  margin-bottom: 16px;
  font-size: 13px;
  color: #888;
}
.result-count strong {
  color: #31201d;
}
.result-query {
  color: #c49a6c;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
  font-size: 14px;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f1e6d2;
  border-top-color: #c49a6c;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  color: #f1e6d2;
  margin-bottom: 12px;
}
.empty-title {
  color: #31201d;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}
.empty-hint {
  color: #888;
  font-size: 13px;
  margin: 0;
}

.alert-error {
  background: #f5ede8;
  border: 1px solid #d4b8b0;
  color: #7b1d1d;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.84rem;
}
</style>
