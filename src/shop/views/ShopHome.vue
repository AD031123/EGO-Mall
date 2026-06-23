<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getShopProducts, searchShopProducts } from '@/api/shop.js'
import { trackProductClick } from '@/utils/analytics.js'
import Carousel3D from '@/shop/components/Carousel3D.vue'
import SearchBar from '@/components/SearchBar.vue'

const router = useRouter()
const route = useRoute()

const products = ref([])
const page = ref(1)
const total = ref(0)
const loading = ref(false)
const noMore = ref(false)

// 搜索状态
const searchQuery = ref('')
const isSearchMode = ref(false)

// ===== 3D 轮播：图片 + 对应商品 ID =====
const banners = [
  { src: '/images/banner1.jpg', productId: 'P_BANNER_1' },
  { src: '/images/banner2.jpg', productId: 'P_BANNER_2' },
  { src: '/images/banner3.jpg', productId: 'P_BANNER_3' },
  { src: '/images/banner4.jpg', productId: 'P_BANNER_4' },
  { src: '/images/banner5.jpg', productId: 'P_BANNER_5' },
]

// 监听路由变化，处理搜索参数
watch(() => route.query.search, (newVal) => {
  if (newVal) {
    searchQuery.value = newVal
    isSearchMode.value = true
    resetAndSearch(newVal)
  } else if (newVal === undefined && isSearchMode.value) {
    // 搜索被清除
    searchQuery.value = ''
    isSearchMode.value = false
    resetAndLoad()
  }
}, { immediate: true })

onMounted(() => {
  if (!isSearchMode.value) {
    loadMore()
  }
  window.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

function resetAndLoad() {
  products.value = []
  page.value = 1
  total.value = 0
  noMore.value = false
  loadMore()
}

function resetAndSearch(q) {
  products.value = []
  page.value = 1
  total.value = 0
  noMore.value = false
  searchLoadMore(q)
}

async function loadMore() {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const res = await getShopProducts(page.value, 24)
    products.value.push(...res.data.list)
    total.value = res.data.total
    page.value++
    if (products.value.length >= total.value) {
      noMore.value = true
    }
  } catch (e) {
    console.error('加载商品失败:', e)
  } finally {
    loading.value = false
  }
}

async function searchLoadMore(q) {
  if (loading.value || noMore.value) return
  loading.value = true
  try {
    const res = await searchShopProducts(q, page.value, 24)
    if (res.code === 0) {
      products.value.push(...res.data.list)
      total.value = res.data.total
      page.value++
      if (products.value.length >= total.value) {
        noMore.value = true
      }
    }
  } catch (e) {
    console.error('搜索失败:', e)
  } finally {
    loading.value = false
  }
}

function onScroll() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const fullHeight = document.documentElement.scrollHeight
  if (scrollTop + windowHeight >= fullHeight - 200) {
    if (isSearchMode.value) {
      searchLoadMore(searchQuery.value)
    } else {
      loadMore()
    }
  }
}

// 搜索栏提交
function onSearchSubmit(q) {
  if (q) {
    router.push({ path: '/', query: { search: q } })
  }
}

// 轮播图点击 → 跳转商品详情
function onBannerClick(banner) {
  if (banner && banner.productId) {
    router.push(`/product/${banner.productId}`)
  }
}

// 清除搜索
function clearSearch() {
  router.push({ path: '/' })
}

function formatPrice(p) {
  if (!p.min_price && !p.max_price) return '-'
  if (p.min_price === p.max_price) return '¥' + Number(p.min_price).toFixed(2)
  return '¥' + Number(p.min_price).toFixed(2) + ' 起'
}
</script>

<template>
  <div>
    <!-- 3D 封面流转轮播（非搜索模式） -->
    <div v-if="!isSearchMode" class="container mt-4 mb-4">
      <Carousel3D :banners="banners" :auto-play-interval="4000" :height="480" @slide-click="onBannerClick" />
    </div>

    <!-- 搜索栏 -->
    <div class="container mt-4 mb-3">
      <div class="d-flex align-items-center gap-2">
        <SearchBar ref="searchBarRef" @search="onSearchSubmit" style="flex:1;" />
        <button
          v-if="isSearchMode"
          class="btn btn-outline-secondary btn-sm"
          style="border-radius:20px; white-space:nowrap;"
          @click="clearSearch"
        >
          取消搜索
        </button>
      </div>
    </div>

    <!-- 搜索结果标题 -->
    <div v-if="isSearchMode" class="container">
      <h5 class="fw-bold mb-3" style="color: #333;">
        搜索 "{{ searchQuery }}" 的结果
        <span class="text-muted" style="font-size:0.85rem;font-weight:400;">（共 {{ total }} 件）</span>
      </h5>
    </div>

    <!-- 产品区域标题 -->
    <div v-else class="container py-2">
      <h4 class="fw-bold mb-4" style="color: #333;">为你推荐</h4>
    </div>

    <!-- 商品列表 -->
    <div class="container">
      <div v-if="!loading && products.length === 0" class="text-center py-5 text-muted">
        <p style="font-size:1.2rem;">😕 没有找到相关商品</p>
        <p class="small">试试其他关键词吧</p>
      </div>

      <div v-else class="row g-3">
        <div v-for="p in products" :key="p.id" class="col-6 col-md-4 col-lg-3">
          <div class="card h-100 border-0 shadow-sm product-card" style="cursor: pointer;" @click="trackProductClick(p.product_id); router.push(`/product/${p.id}`)">
            <div
              class="card-img-top"
              :style="{
                height: '200px',
                background: p.main_image ? `url(${p.main_image}) center/cover no-repeat` : '#f0f0f0',
              }"
            >
              <div v-if="!p.main_image" class="d-flex align-items-center justify-content-center h-100 text-muted">
                📦 暂无图片
              </div>
            </div>
            <div class="card-body d-flex flex-column">
              <h6 class="fw-medium mb-1" style="color: #333; line-height: 1.4;">{{ p.name }}</h6>
              <p class="text-muted small mb-2 product-subtitle">{{ p.subtitle || '&nbsp;' }}</p>
              <!-- 优惠券标签 -->
              <div v-if="p.coupons && p.coupons.length" class="mb-1">
                <span v-for="c in p.coupons.slice(0,2)" :key="c.id"
                  class="badge me-1" style="background:#fff;color:#ff4d4f;border:1px solid #ff4d4f;font-size:0.65rem;font-weight:500;">
                  满{{ Number(c.min_amount) }}减{{ Number(c.discount) }}
                </span>
              </div>
              <div class="mt-auto">
                <span class="fw-bold" style="color: #ff4d4f; font-size: 1.05rem;">{{ formatPrice(p) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm" role="status" style="color: #52CDFF;"></div>
        <span class="ms-2">加载中...</span>
      </div>
      <div v-else-if="noMore && products.length > 0" class="text-center py-4 text-muted small">
        — 已经到底了 —
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-subtitle {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card {
  transition: transform 0.2s, box-shadow 0.2s;
}
.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
}
</style>
