<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="filter-overlay" @click.self="close">
        <Transition name="slide">
          <div v-if="isOpen" class="filter-panel">
            <div class="filter-header">
              <h3>Filters</h3>
              <button class="close-btn" @click="close">&times;</button>
            </div>

            <div class="filter-body">
              <!-- Branch scope -->
              <div class="filter-section">
                <label class="filter-label">Branch</label>
                <div class="filter-options">
                  <label
                    v-for="b in branches"
                    :key="b.id"
                    class="filter-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="b.id"
                      :checked="localScopes.branches.includes(b.id)"
                      @change="toggleScope('branches', b.id)"
                    />
                    <span>{{ b.name }}</span>
                  </label>
                </div>
              </div>

              <!-- Type scope -->
              <div class="filter-section">
                <label class="filter-label">Type</label>
                <div class="filter-options">
                  <label
                    v-for="t in typeOptions"
                    :key="t.value"
                    class="filter-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="t.value"
                      :checked="localScopes.types.includes(t.value)"
                      @change="toggleScope('types', t.value)"
                    />
                    <span>{{ t.label }}</span>
                  </label>
                </div>
              </div>

              <!-- Category scope -->
              <div class="filter-section">
                <label class="filter-label">Category</label>
                <div class="filter-options">
                  <label
                    v-for="cat in categoryOptions"
                    :key="cat"
                    class="filter-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="cat"
                      :checked="localScopes.categories.includes(cat)"
                      @change="toggleScope('categories', cat)"
                    />
                    <span>{{ cat }}</span>
                  </label>
                </div>
              </div>

              <!-- Status scope -->
              <div class="filter-section">
                <label class="filter-label">Status</label>
                <div class="filter-options">
                  <label
                    v-for="st in statusOptions"
                    :key="st"
                    class="filter-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="st"
                      :checked="localScopes.statuses.includes(st)"
                      @change="toggleScope('statuses', st)"
                    />
                    <span>{{ st }}</span>
                  </label>
                </div>
              </div>

              <!-- Department scope -->
              <div class="filter-section">
                <label class="filter-label">Department</label>
                <div class="filter-options">
                  <label
                    v-for="d in departmentOptions"
                    :key="d"
                    class="filter-checkbox"
                  >
                    <input
                      type="checkbox"
                      :value="d"
                      :checked="localScopes.departments.includes(d)"
                      @change="toggleScope('departments', d)"
                    />
                    <span>{{ d }}</span>
                  </label>
                </div>
              </div>

              <!-- Date range scope -->
              <div class="filter-section">
                <label class="filter-label">Date Range</label>
                <div class="date-range-row">
                  <div class="date-field">
                    <span class="date-label">From</span>
                    <input
                      type="date"
                      :value="localScopes.dateRange.from"
                      @change="setDate('from', $event.target.value)"
                    />
                  </div>
                  <div class="date-field">
                    <span class="date-label">To</span>
                    <input
                      type="date"
                      :value="localScopes.dateRange.to"
                      @change="setDate('to', $event.target.value)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="filter-footer">
              <button class="clear-btn" @click="clearAll">Clear All</button>
              <button class="apply-btn" @click="apply">Apply Filters</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useBranches } from '@/composables/useBranches.js'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  scopes: { type: Object, default: () => ({
    branches: [], categories: [], statuses: [], departments: [],
    dateRange: { from: null, to: null }, types: [],
  })},
})

const emit = defineEmits(['close', 'apply'])

const { branches } = useBranches()

const typeOptions = [
  { value: 'product', label: 'Products' },
  { value: 'employee', label: 'Employees' },
  { value: 'sale', label: 'Sales' },
  { value: 'rawmaterial', label: 'Raw Materials' },
]

const categoryOptions = ['Beverages', 'Pastries', 'Food']
const statusOptions = ['In Stock', 'Low Stock', 'Out of Stock', 'Active', 'On Leave', 'Inactive']
const departmentOptions = ['Kitchen', 'Service', 'Management', 'Maintenance']

const localScopes = reactive({
  branches: [...(props.scopes.branches || [])],
  categories: [...(props.scopes.categories || [])],
  statuses: [...(props.scopes.statuses || [])],
  departments: [...(props.scopes.departments || [])],
  dateRange: { ...(props.scopes.dateRange || { from: null, to: null }) },
  types: [...(props.scopes.types || [])],
})

watch(() => props.isOpen, (val) => {
  if (val) {
    localScopes.branches = [...(props.scopes.branches || [])]
    localScopes.categories = [...(props.scopes.categories || [])]
    localScopes.statuses = [...(props.scopes.statuses || [])]
    localScopes.departments = [...(props.scopes.departments || [])]
    localScopes.dateRange = { ...(props.scopes.dateRange || { from: null, to: null }) }
    localScopes.types = [...(props.scopes.types || [])]
  }
})

const toggleScope = (key, value) => {
  const arr = localScopes[key]
  const idx = arr.indexOf(value)
  if (idx === -1) arr.push(value)
  else arr.splice(idx, 1)
}

const setDate = (key, value) => {
  localScopes.dateRange[key] = value || null
}

const clearAll = () => {
  localScopes.branches = []
  localScopes.categories = []
  localScopes.statuses = []
  localScopes.departments = []
  localScopes.dateRange = { from: null, to: null }
  localScopes.types = []
}

const apply = () => {
  emit('apply', {
    branches: [...localScopes.branches],
    categories: [...localScopes.categories],
    statuses: [...localScopes.statuses],
    departments: [...localScopes.departments],
    dateRange: { ...localScopes.dateRange },
    types: [...localScopes.types],
  })
}

const close = () => emit('close')
</script>

<style scoped>
.filter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(49, 32, 29, 0.3);
  z-index: 3000;
  display: flex;
  justify-content: flex-end;
}

.filter-panel {
  width: 340px;
  max-width: 90vw;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(49, 32, 29, 0.15);
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #F1E6D2;
}

.filter-header h3 {
  margin: 0;
  color: #31201D;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #888;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #31201D;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.filter-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  padding: 4px 0;
}

.filter-checkbox input {
  accent-color: #C49A6C;
}

.date-range-row {
  display: flex;
  gap: 10px;
}

.date-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  font-size: 11px;
  color: #888;
}

.date-field input {
  padding: 6px 10px;
  border: 1px solid #EAEAEA;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.date-field input:focus {
  border-color: #C49A6C;
}

.filter-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #F1E6D2;
}

.clear-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #F1E6D2;
  background: white;
  color: #888;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.apply-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: #31201D;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.apply-btn:hover {
  background: #4a2f2b;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
