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

      <div class="branch-selector-wrapper">
        <div class="selector-label">
          <MapPin class="pin-icon" :size="16" />
          <span>Branch:</span>
        </div>

        <div class="custom-select-container" ref="containerRef">
          <button
            type="button"
            class="selector-button"
            @click.stop="toggleDropdown"
          >
            <span v-if="selectedBranchId === 'overall'" class="overall-tag"
              >Overall</span
            >
            <span class="selected-text">{{ selectedBranchName }}</span>
            <ChevronDown :size="16" :class="{ rotate: isDropdownOpen }" />
          </button>

          <div v-if="isDropdownOpen" class="dropdown-menu">
            <div
              class="dropdown-item"
              :class="{ selected: selectedBranchId === 'overall' }"
              @click="selectBranch('overall')"
            >
              <div class="item-content">
                <span class="overall-tag">Overall</span>
                <span class="branch-name">All Branches</span>
              </div>
              <Check v-if="selectedBranchId === 'overall'" :size="16" />
            </div>

            <div
              v-for="branch in branches"
              :key="branch.id"
              class="dropdown-item"
              :class="{ selected: selectedBranchId === branch.id }"
              @click="selectBranch(branch.id)"
            >
              <div class="item-content">
                <div class="branch-info">
                  <span class="branch-name">{{ branch.name }}</span>
                  <span class="branch-location">{{ branch.address }}</span>
                </div>
                <span class="status-pill-small">Active</span>
              </div>
              <Check v-if="selectedBranchId === branch.id" :size="16" />
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="universal-search-card">
      <div class="card-header">
        <SearchIcon class="search-icon-tan" :size="20" />
        <div>
          <h3>Universal Search</h3>
          <p>Search for products, employees, sales, and more</p>
        </div>
      </div>
      <div class="search-input-row">
        <div class="input-container" ref="inputContainerRef">
          <input
            ref="searchInputRef"
            v-model="search.query.value"
            type="text"
            placeholder="Type to search across all data... (Ctrl+K)"
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

      <!-- Filter chips -->
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

    <!-- Result count -->
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

    <!-- Loading state -->
    <div v-if="dataLoading" class="loading-state">
      <div class="spinner"></div>
      Loading data...
    </div>

    <!-- No results -->
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

    <!-- Results -->
    <SearchResults
      v-else-if="search.results.value.length > 0"
      :results="search.results.value"
      :query="search.query.value"
      @select="onResultSelect"
    />

    <!-- Initial state -->
    <div v-else class="empty-state">
      <SearchIcon :size="40" class="empty-icon" />
      <p class="empty-title">Search across all data</p>
      <p class="empty-hint">
        Type a query above to search products, employees, sales, and raw
        materials.
      </p>
    </div>

    <SearchFilters
      :is-open="showFilters"
      :scopes="search.scopes.value"
      @close="showFilters = false"
      @apply="onApplyFilters"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Search as SearchIcon,
  MapPin,
  ChevronDown,
  Check,
  SlidersHorizontal,
} from "lucide-vue-next";
import { useSearch } from "@/composables/useSearch.js";
import { useBranches } from "@/composables/useBranches.js";
import { useSearchData } from "@/composables/useSearchData.js";
import SearchAutocomplete from "@/components/SearchAutocomplete.vue";
import SearchFilters from "@/components/SearchFilters.vue";
import SearchResults from "@/components/SearchResults.vue";

const { allItems, isLoading: dataLoading } = useSearchData();
const { branches } = useBranches();
const router = useRouter();

const search = useSearch(allItems);

// --- BRANCH SELECTOR ---
const containerRef = ref(null);
const isDropdownOpen = ref(false);
const selectedBranchId = ref("overall");

const selectedBranchName = computed(() => {
  if (selectedBranchId.value === "overall") return "All Branches";
  return (
    branches.value.find((b) => b.id === selectedBranchId.value)?.name ||
    "Unknown"
  );
});

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const selectBranch = (id) => {
  selectedBranchId.value = id;
  isDropdownOpen.value = false;
  if (id === "overall") {
    search.setScopes({ branches: [] });
  } else {
    search.setScopes({ branches: [id] });
  }
};

const closeOnOutsideClick = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isDropdownOpen.value = false;
  }
};

const ROUTE_MAP = {
  product: { path: "/admin/menu-pricing" },
  rawmaterial: { path: "/admin/inventory" },
  employee: { path: "/admin/employees" },
  sale: { path: "/admin/sales" },
};

function onResultSelect(result) {
  const route = ROUTE_MAP[result.type];
  if (!route) return;
  const entityId = result.id.split("-")[1];
  router.push({ path: route.path, query: { edit: entityId } });
}

// --- AUTOCOMPLETE ---
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

// --- FILTERS ---
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

// --- KEYBOARD SHORTCUT ---
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
};

onMounted(() => {
  window.addEventListener("click", closeOnOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener("click", closeOnOutsideClick);
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

.branch-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}
.selector-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #31201d;
  font-size: 14px;
  font-weight: 500;
}
.pin-icon {
  color: #c49a6c;
}
.custom-select-container {
  position: relative;
  width: 240px;
  z-index: 1001;
}
.selector-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border: 1px solid #f1e6d2;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #31201d;
  transition: border-color 0.2s;
}
.selector-button:hover {
  border-color: #c49a6c;
}
.rotate {
  transform: rotate(180deg);
  transition: transform 0.2s;
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(49, 32, 29, 0.15);
  border: 1px solid #f1e6d2;
  padding: 8px;
  z-index: 1002;
}
.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
}
.dropdown-item:hover {
  background: #fffaf5;
}
.dropdown-item.selected {
  background: #fff9f0;
}
.item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.branch-info {
  display: flex;
  flex-direction: column;
}
.branch-name {
  font-weight: 600;
  color: #31201d;
  font-size: 14px;
}
.branch-location {
  font-size: 11px;
  color: #888;
  line-height: 1.2;
}
.overall-tag {
  background: #fff4e5;
  color: #c49a6c;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 11px;
  border: 1px solid #f1e6d2;
  margin-right: 6px;
}
.status-pill-small {
  background: #31201d;
  color: white;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
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
</style>
