<template>
  <div class="search-module">
    <header class="module-header">
      <div class="header-titles">
        <h1>Search</h1>
        <p class="search-context">
          Search data for: <span class="active-context">{{ selectedBranchName }}</span>
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
            <span v-if="selectedBranchId === 'overall'" class="overall-tag">Overall</span>
            <span class="selected-text">{{ selectedBranchName }}</span>
            <ChevronDown :size="16" :class="{ 'rotate': isDropdownOpen }" />
          </button>

          <div v-if="isDropdownOpen" class="dropdown-menu">
            <div 
              class="dropdown-item" 
              :class="{ 'selected': selectedBranchId === 'overall' }"
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
              :class="{ 'selected': selectedBranchId === branch.id }"
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
        <div class="input-container">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Type to search across all data..." 
          />
        </div>
        <button class="filter-btn">
          <SlidersHorizontal :size="16" />
          Filters
        </button>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-list">
        <button 
          v-for="tab in ['all', 'product', 'employee', 'sale']" 
          :key="tab"
          @click="activeTab = tab"
          class="tab-button"
          :class="{ 'active': activeTab === tab }"
        >
          {{ tab === 'all' ? 'All Results' : tab.charAt(0).toUpperCase() + tab.slice(1) + 's' }}
        </button>
      </div>
    </div>

    <div class="results-list">
      <div v-for="result in filteredResults" :key="result.id" class="result-card">
        <div class="result-main">
          <div class="icon-box">
            <component :is="getResultIcon(result.type)" :size="20" />
          </div>
          <div class="result-info">
            <div class="title-row">
              <h4>{{ result.title }}</h4>
              <span class="type-badge">{{ result.type }}</span>
            </div>
            <p class="res-description">{{ result.description }}</p>
            <p class="res-details">{{ result.details }}</p>
          </div>
        </div>
        <div class="result-status">
          <span class="status-pill" :class="getStatusClass(result.status)">
            {{ result.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { 
  Search as SearchIcon, MapPin, ChevronDown, Check,
  SlidersHorizontal, Package, Users, Receipt 
} from 'lucide-vue-next';

// --- REFERENCES & STATE ---
const containerRef = ref(null); 
const isDropdownOpen = ref(false);
const selectedBranchId = ref('overall');
const searchQuery = ref('');
const activeTab = ref('all');

// --- BRANCH DATA ---
const branches = [
  { id: 'dlsu', name: 'Silingan DLSU', address: 'De La Salle University, Taft Ave, Manila' },
  { id: 'ateneo', name: 'Silingan Ateneo', address: 'Ateneo de Manila University, Katipunan Ave, QC' },
  { id: 'batangas', name: 'Silingan Batangas', address: 'Batangas City, Batangas Province' },
  { id: 'lipa', name: 'Silingan Lipa', address: 'Lipa City, Batangas Province' },
  { id: 'cubao', name: 'Silingan Cubao Expo', address: 'Cubao Expo, Quezon City (Original Branch)' }
];

// --- MOCK DATA ---
const allResults = [
  { id: '1', type: 'product', title: 'Americano', description: 'Coffee beverage', details: '₱150 - 50 units in stock', status: 'In Stock', branch: 'overall' },
  { id: '2', type: 'product', title: 'Cappuccino', description: 'Espresso with steamed milk', details: '₱180 - 45 units in stock', status: 'In Stock', branch: 'overall' },
  { id: '3', type: 'product', title: 'Croissant', description: 'Pastry item', details: '₱120 - 8 units in stock', status: 'Low Stock', branch: 'overall' },
  { id: '4', type: 'employee', title: 'Maria Xie', description: 'Store Manager', details: 'Management Department - Active · Silingan DLSU', status: 'Active', branch: 'dlsu' }
];

// --- COMPUTED ---
const selectedBranchName = computed(() => {
  if (selectedBranchId.value === 'overall') return 'All Branches';
  return branches.find(b => b.id === selectedBranchId.value)?.name || 'Unknown';
});

const filteredResults = computed(() => {
  return allResults.filter(r => {
    const matchesQuery = searchQuery.value === '' || r.title.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesTab = activeTab.value === 'all' || r.type === activeTab.value;
    const matchesBranch = selectedBranchId.value === 'overall' || r.branch === 'overall' || r.branch === selectedBranchId.value;
    return matchesQuery && matchesTab && matchesBranch;
  });
});

// --- METHODS ---
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const selectBranch = (id) => {
  selectedBranchId.value = id;
  isDropdownOpen.value = false;
};

const getResultIcon = (type) => ({ product: Package, employee: Users, sale: Receipt }[type] || SearchIcon);

const getStatusClass = (status) => status.toLowerCase().replace(/\s+/g, '-');


const closeOnOutsideClick = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closeOnOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', closeOnOutsideClick);
});
</script>

<style scoped>
/* Container & Layout */
.search-module { padding: 24px; background: #fdfdfd; min-height: 100vh; }

.module-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header-titles h1 { color: #31201D; font-size: 24px; margin: 0; }
.search-context { color: #8B4513; margin: 4px 0 0; font-size: 14px; }
.active-context { font-weight: 600; color: #C49A6C; }

/* Dropdown Elements */
.branch-selector-wrapper { display: flex; align-items: center; gap: 12px; }
.selector-label { display: flex; align-items: center; gap: 6px; color: #31201D; font-size: 14px; font-weight: 500; }
.pin-icon { color: #C49A6C; }

.custom-select-container { position: relative; width: 240px; z-index: 1001; }
.selector-button {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: white; border: 1px solid #F1E6D2; border-radius: 8px;
  cursor: pointer; font-size: 14px; color: #31201D; transition: border-color 0.2s;
}
.selector-button:hover { border-color: #C49A6C; }

.rotate { transform: rotate(180deg); transition: transform 0.2s; }

.dropdown-menu {
  position: absolute; top: calc(100% + 8px); right: 0; width: 320px; background: white;
  border-radius: 12px; box-shadow: 0 10px 30px rgba(49, 32, 29, 0.15); border: 1px solid #F1E6D2;
  padding: 8px; z-index: 1002;
}
.dropdown-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px; border-radius: 8px; cursor: pointer; margin-bottom: 2px;
}
.dropdown-item:hover { background: #FFFAF5; }
.dropdown-item.selected { background: #FFF9F0; }

.item-content { display: flex; align-items: center; gap: 12px; flex: 1; }
.branch-info { display: flex; flex-direction: column; }
.branch-name { font-weight: 600; color: #31201D; font-size: 14px; }
.branch-location { font-size: 11px; color: #888; line-height: 1.2; }

/* Badges & Pills */
.overall-tag { background: #FFF4E5; color: #C49A6C; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; border: 1px solid #F1E6D2; margin-right: 6px; }
.status-pill-small { background: #31201D; color: white; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }

/* Search Area Styles */
.universal-search-card { background: white; border: 1px solid #F1E6D2; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
.card-header { display: flex; gap: 12px; margin-bottom: 16px; }
.search-icon-tan { color: #C49A6C; }
.search-input-row { display: flex; gap: 12px; }
.input-container { flex: 1; }
.input-container input { width: 100%; padding: 10px 16px; border: 1px solid #EAEAEA; border-radius: 8px; background: #FAFAFA; outline: none; font-size: 14px; }
.input-container input:focus { border-color: #C49A6C; }
.filter-btn { display: flex; align-items: center; gap: 8px; padding: 0 16px; background: white; border: 1px solid #F1E6D2; color: #C49A6C; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; }

/* Tabs Layout */
.tabs-container { background: #F5F5F5; border-radius: 8px; padding: 4px; margin-bottom: 24px; }
.tabs-list { display: flex; width: 100%; gap: 4px; }
.tab-button { flex: 1; padding: 10px; border: none; background: none; color: #666; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 6px; transition: 0.2s; }
.tab-button.active { background: #31201D; color: white; }

/* Result Card Styles */
.result-card { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border: 1px solid #F1E6D2; border-radius: 12px; margin-bottom: 12px; transition: transform 0.1s; }
.result-card:hover { border-color: #C49A6C; }
.result-main { display: flex; gap: 16px; }
.icon-box { width: 44px; height: 44px; background: #FFF9F0; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #C49A6C; }
.title-row { display: flex; align-items: center; gap: 8px; }
.title-row h4 { margin: 0; color: #31201D; font-size: 16px; font-weight: 600; }
.type-badge { font-size: 10px; background: #FFF4E5; color: #C49A6C; padding: 1px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.res-description { margin: 2px 0; color: #8B4513; font-size: 13px; }
.res-details { margin: 0; color: #C49A6C; font-size: 11px; font-weight: 500; }

.status-pill { font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 6px; color: white; background: #31201D; }
.status-pill.low-stock { background: #EAEAEA; color: #666; }
</style>