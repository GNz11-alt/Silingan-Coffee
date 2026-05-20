<template>
  <div v-if="suggestions.length > 0" class="autocomplete-dropdown" ref="dropdownRef">
    <div
      v-for="(suggestion, index) in suggestions"
      :key="index"
      class="autocomplete-item"
      :class="{ highlighted: index === activeIndex }"
      @mousedown.prevent="select(suggestion)"
      @mouseenter="activeIndex = index"
    >
      <div class="autocomplete-icon-box">
        <component :is="getIcon(suggestion.item.type)" :size="16" />
      </div>
      <div class="autocomplete-info">
        <span class="autocomplete-title" v-html="highlightMatch(suggestion.item.title)"></span>
        <span class="autocomplete-sub">{{ suggestion.item.description }}</span>
      </div>
      <span class="autocomplete-type-badge">{{ suggestion.item.type }}</span>
    </div>
    <div class="autocomplete-footer">
      <span class="footer-hint"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
      <span class="footer-hint"><kbd>Enter</kbd> select</span>
      <span class="footer-hint"><kbd>Esc</kbd> close</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Search, Package, Users, Receipt, Box } from 'lucide-vue-next'

const props = defineProps({
  getSuggestions: { type: Function, required: true },
  query: { type: String, default: '' },
})

const emit = defineEmits(['select', 'close'])

const suggestions = ref([])
const activeIndex = ref(-1)
const dropdownRef = ref(null)

const getIcon = (type) => ({ product: Package, employee: Users, sale: Receipt, rawmaterial: Box }[type] || Search)

const highlightMatch = (text) => {
  if (!props.query) return text
  const regex = new RegExp(`(${props.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

watch(() => props.query, async (val) => {
  if (!val.trim()) {
    suggestions.value = []
    return
  }
  await nextTick()
  suggestions.value = props.getSuggestions(8)
  activeIndex.value = -1
})

const select = (suggestion) => {
  emit('select', suggestion.item)
  suggestions.value = []
}

const navigateDown = () => {
  if (suggestions.value.length === 0) return
  activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
}

const navigateUp = () => {
  if (suggestions.value.length === 0) return
  activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
}

const selectActive = () => {
  if (activeIndex.value >= 0 && activeIndex.value < suggestions.value.length) {
    select(suggestions.value[activeIndex.value])
  }
}

const close = () => {
  suggestions.value = []
  emit('close')
}

defineExpose({ navigateDown, navigateUp, selectActive, close })
</script>

<style scoped>
.autocomplete-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #F1E6D2;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(49, 32, 29, 0.12);
  z-index: 2000;
  overflow: hidden;
}

.autocomplete-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.autocomplete-item:hover,
.autocomplete-item.highlighted {
  background: #FFF9F0;
}

.autocomplete-icon-box {
  width: 32px;
  height: 32px;
  background: #FFF9F0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #C49A6C;
  flex-shrink: 0;
}

.autocomplete-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.autocomplete-title {
  font-size: 13px;
  font-weight: 600;
  color: #31201D;
  line-height: 1.3;
}

.autocomplete-title :deep(mark) {
  background: #FFF4E5;
  color: #C49A6C;
  padding: 0 2px;
  border-radius: 2px;
}

.autocomplete-sub {
  font-size: 11px;
  color: #888;
  line-height: 1.2;
}

.autocomplete-type-badge {
  font-size: 9px;
  background: #FFF4E5;
  color: #C49A6C;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.autocomplete-footer {
  display: flex;
  gap: 12px;
  padding: 6px 14px;
  border-top: 1px solid #F1E6D2;
  background: #FAFAFA;
}

.footer-hint {
  font-size: 10px;
  color: #999;
}

.footer-hint kbd {
  background: #F1E6D2;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-family: inherit;
  margin: 0 1px;
}
</style>
