<template>
  <div class="results-list">
    <div v-for="result in results" :key="result.id" class="result-card">
      <div class="result-main">
        <div class="icon-box">
          <component :is="getIcon(result.type)" :size="20" />
        </div>
        <div class="result-info">
          <div class="title-row">
            <h4 v-html="highlight(result.title)"></h4>
            <span class="type-badge">{{ result.type }}</span>
          </div>
          <p class="res-description" v-html="highlight(result.description)"></p>
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
</template>

<script setup>
import { Search, Package, Users, Receipt, Box } from 'lucide-vue-next'

const props = defineProps({
  results: { type: Array, default: () => [] },
  query: { type: String, default: '' },
})

const getIcon = (type) => ({ product: Package, employee: Users, sale: Receipt, rawmaterial: Box }[type] || Search)

const getStatusClass = (status) => (status || '').toLowerCase().replace(/\s+/g, '-')

const highlight = (text) => {
  if (!props.query || !text) return text
  const regex = new RegExp(`(${props.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}
</script>

<style scoped>
.result-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border: 1px solid #F1E6D2;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: transform 0.1s;
}

.result-card:hover {
  border-color: #C49A6C;
}

.result-main {
  display: flex;
  gap: 16px;
  min-width: 0;
}

.icon-box {
  width: 44px;
  height: 44px;
  background: #FFF9F0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #C49A6C;
  flex-shrink: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-row h4 {
  margin: 0;
  color: #31201D;
  font-size: 16px;
  font-weight: 600;
}

.title-row h4 :deep(mark) {
  background: #FFF4E5;
  color: #C49A6C;
  padding: 0 2px;
  border-radius: 2px;
}

.type-badge {
  font-size: 10px;
  background: #FFF4E5;
  color: #C49A6C;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.res-description {
  margin: 2px 0;
  color: #8B4513;
  font-size: 13px;
}

.res-description :deep(mark) {
  background: #FFF4E5;
  color: #C49A6C;
  padding: 0 2px;
  border-radius: 2px;
}

.res-details {
  margin: 0;
  color: #C49A6C;
  font-size: 11px;
  font-weight: 500;
}

.result-status {
  flex-shrink: 0;
  margin-left: 12px;
}

.status-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 6px;
  color: white;
  background: #31201D;
}

.status-pill.low-stock {
  background: #EAEAEA;
  color: #666;
}

.status-pill.out-of-stock {
  background: #FDE8E8;
  color: #C0392B;
}

.status-pill.on-leave {
  background: #FFF4E5;
  color: #C49A6C;
}

.status-pill.inactive {
  background: #EAEAEA;
  color: #999;
}
</style>
