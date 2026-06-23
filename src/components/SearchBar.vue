<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { searchShopProducts } from '@/api/shop.js'

const router = useRouter()

const query = ref('')
const results = ref([])
const loading = ref(false)
const showDropdown = ref(false)
const selectedIndex = ref(-1)
const inputRef = ref(null)
const dropdownRef = ref(null)
let debounceTimer = null

const hasResults = computed(() => results.value.length > 0)

function onInput() {
  clearTimeout(debounceTimer)
  selectedIndex.value = -1
  const q = query.value.trim()
  if (!q) {
    results.value = []
    showDropdown.value = false
    return
  }
  // 防抖搜索
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const res = await searchShopProducts(q, 1, 8)
      if (res.code === 0) {
        results.value = res.data.list || []
        showDropdown.value = results.value.length > 0
      } else {
        results.value = []
        showDropdown.value = false
      }
    } catch {
      results.value = []
      showDropdown.value = false
    } finally {
      loading.value = false
    }
  }, 300)
}

function onKeyDown(e) {
  if (!showDropdown.value) {
    if (e.key === 'Enter' && query.value.trim()) {
      doSearch(query.value.trim())
    }
    return
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (selectedIndex.value >= 0) {
      goToProduct(results.value[selectedIndex.value])
    } else if (query.value.trim()) {
      doSearch(query.value.trim())
    }
  } else if (e.key === 'Escape') {
    showDropdown.value = false
  }
}

function goToProduct(product) {
  showDropdown.value = false
  query.value = ''
  results.value = []
  router.push(`/product/${product.id}`)
}

function doSearch(q) {
  showDropdown.value = false
  router.push({ path: '/', query: { search: q } })
}

function formatPrice(p) {
  if (!p.min_price && !p.max_price) return '-'
  if (p.min_price === p.max_price) return '¥' + Number(p.min_price).toFixed(2)
  return '¥' + Number(p.min_price).toFixed(2) + ' 起'
}

function onClickOutside(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target) &&
      inputRef.value && !inputRef.value.contains(e.target)) {
    showDropdown.value = false
  }
}

// 暴露方法给父组件
defineExpose({ query, focus: () => inputRef.value?.focus() })

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="search-bar-wrap">
    <div class="search-input-group">
      <span class="search-icon">🔍</span>
      <input
        ref="inputRef"
        v-model="query"
        type="text"
        class="search-input"
        placeholder="搜索商品..."
        autocomplete="off"
        @input="onInput"
        @keydown="onKeyDown"
        @focus="query.trim() && results.length > 0 && (showDropdown = true)"
      />
      <button
        v-if="query"
        class="search-clear-btn"
        @click="query = ''; results = []; showDropdown = false"
        title="清除"
      >
        ✕
      </button>
    </div>

    <!-- 下拉建议 -->
    <div
      v-if="showDropdown"
      ref="dropdownRef"
      class="search-dropdown"
    >
      <!-- 加载中 -->
      <div v-if="loading" class="search-dropdown-status">
        <span class="spinner-border spinner-border-sm me-2" style="color:#52CDFF;"></span>
        搜索中...
      </div>

      <template v-else-if="hasResults">
        <div class="search-dropdown-header">搜索结果</div>
        <div
          v-for="(item, i) in results"
          :key="item.id"
          class="search-dropdown-item"
          :class="{ 'is-selected': i === selectedIndex }"
          @click="goToProduct(item)"
          @mouseenter="selectedIndex = i"
        >
          <div
            class="search-item-img"
            :style="{
              background: item.main_image
                ? `url(${item.main_image}) center/cover no-repeat`
                : '#f0f0f0'
            }"
          >
            <span v-if="!item.main_image" style="font-size:0.8rem;color:#ccc;">📦</span>
          </div>
          <div class="search-item-info">
            <div class="search-item-name">{{ item.name }}</div>
            <div class="search-item-subtitle" v-if="item.subtitle">{{ item.subtitle }}</div>
            <div class="search-item-price">{{ formatPrice(item) }}</div>
          </div>
          <div class="search-item-action">
            <span class="search-item-arrow">→</span>
          </div>
        </div>
      </template>

      <div v-else class="search-dropdown-status">未找到相关商品</div>

      <!-- 底部"查看全部" -->
      <div v-if="hasResults" class="search-dropdown-footer" @click="doSearch(query.trim())">
        查看全部结果 →
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.search-bar-wrap {
  position: relative;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

/* ===== 输入框组 ===== */
.search-input-group {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 28px;
  padding: 0 16px;
  height: 48px;
  transition: border-color 0.25s, box-shadow 0.25s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.search-input-group:focus-within {
  border-color: #52CDFF;
  box-shadow: 0 0 0 3px rgba(82,205,255,0.12), 0 4px 16px rgba(0,0,0,0.06);
}

.search-icon {
  font-size: 1.1rem;
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: #333;
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: #bbb;
}

.search-clear-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #eee;
  color: #999;
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
  margin-left: 8px;
}

.search-clear-btn:hover {
  background: #ff4d4f;
  color: #fff;
}

/* ===== 下拉面板 ===== */
.search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.12);
  overflow: hidden;
  z-index: 1050;
  max-height: 480px;
  overflow-y: auto;
}

.search-dropdown-header {
  padding: 10px 16px 6px;
  font-size: 0.75rem;
  color: #999;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.search-dropdown-status {
  padding: 20px 16px;
  text-align: center;
  color: #999;
  font-size: 0.88rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ===== 搜索项 ===== */
.search-dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.search-dropdown-item:hover,
.search-dropdown-item.is-selected {
  background: #f5faff;
}

.search-item-img {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.search-item-info {
  flex: 1;
  min-width: 0;
}

.search-item-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-subtitle {
  font-size: 0.75rem;
  color: #999;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-item-price {
  font-size: 0.85rem;
  font-weight: 700;
  color: #ff4d4f;
  margin-top: 2px;
}

.search-item-action {
  flex-shrink: 0;
  color: #ccc;
  font-size: 0.85rem;
}

.search-dropdown-item:hover .search-item-action {
  color: #52CDFF;
}

/* ===== 底部 ===== */
.search-dropdown-footer {
  padding: 12px 16px;
  text-align: center;
  font-size: 0.85rem;
  color: #52CDFF;
  font-weight: 600;
  cursor: pointer;
  border-top: 1px solid #f0f0f0;
  transition: background 0.15s;
}

.search-dropdown-footer:hover {
  background: #f5faff;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .search-bar-wrap {
    max-width: 100%;
  }

  .search-dropdown {
    max-height: 360px;
  }
}
</style>
