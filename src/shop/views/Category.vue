<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCategories } from '@/api/products.js'
import { getShopProducts } from '@/api/shop.js'

const router = useRouter()
const route = useRoute()
const categoriesL1 = ref([])
const allCategories = ref([])
const activeL1 = ref(null)
const activeL2 = ref(null)
const products = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 40
const total = ref(0)
const noMore = ref(false)

onMounted(async () => {
  // 读取 URL 参数
  if (route.query.l1) activeL1.value = Number(route.query.l1)
  if (route.query.l2) activeL2.value = Number(route.query.l2)
  try {
    const [l1Res, allRes] = await Promise.all([
      getCategories({ parent_id: 0 }),
      getCategories()
    ])
    categoriesL1.value = l1Res.data
    allCategories.value = allRes.data
  } catch {}
  loadProducts()
  window.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

function onScroll() {
  if (noMore.value || loading.value) return
  const h = document.documentElement
  if (h.scrollTop + h.clientHeight >= h.scrollHeight - 300) {
    loadMore()
  }
}

function catChildren(l1Id) {
  return allCategories.value.filter(c => c.parent_id === l1Id)
}

async function loadProducts() {
  loading.value = true; page.value = 1; noMore.value = false; products.value = []
  try {
    // 将分类筛选参数传给服务端，由服务端做 SQL 过滤
    const params = { page: page.value, pageSize }
    if (activeL1.value) params.category_l1 = activeL1.value
    if (activeL2.value) params.category_l2 = activeL2.value
    const r = await getShopProducts(page.value, pageSize, params)
    if (r.code === 0) {
      products.value = r.data.list
      total.value = r.data.total
      if (r.data.list.length < pageSize) noMore.value = true
    }
  } catch {}
  finally { loading.value = false }
}

async function loadMore() {
  if (noMore.value || loading.value) return
  page.value++
  try {
    const params = { page: page.value, pageSize }
    if (activeL1.value) params.category_l1 = activeL1.value
    if (activeL2.value) params.category_l2 = activeL2.value
    const r = await getShopProducts(page.value, pageSize, params)
    if (r.code === 0) {
      products.value.push(...r.data.list)
      if (r.data.list.length < pageSize) noMore.value = true
    }
  } catch {}

function selectL2(l1Id, l2Id) {
  if (activeL2.value === l2Id) {
    // 再次点击 → 取消，恢复全部
    activeL1.value = null
    activeL2.value = null
  } else {
    activeL1.value = l1Id
    activeL2.value = l2Id
  }
  loadProducts()
}

function goDetail(id) {
  router.push(`/product/${id}`)
}

const btnStyle = (active) => ({
  background: active ? '#52CDFF' : '#f0f0f0',
  color: active ? '#fff' : '#666',
  border: 'none',
  fontWeight: active ? 600 : 400,
  fontSize: '0.8rem'
})
</script>

<template>
  <div style="max-width:1200px;margin:0 auto;padding:24px;">
    <h5 class="fw-bold mb-3">📂 分类浏览</h5>

    <!-- 分类容器 -->
    <div class="card border-0 shadow-sm p-3 mb-4" style="border-radius:12px;">
      <!-- 每一行：一级分类 → 二级分类 二级分类 二级分类... -->
      <div v-for="l1 in categoriesL1" :key="l1.id" class="d-flex align-items-center gap-2 mt-1 flex-wrap">
        <button class="btn btn-sm rounded-pill px-3 fw-bold"
          :style="{background: activeL1===l1.id && !activeL2 ? '#52CDFF' : '#e8f4fd', color: activeL1===l1.id && !activeL2 ? '#fff' : '#333', border:'none', fontSize:'0.82rem'}"
          @click="activeL1 = activeL1===l1.id ? null : l1.id; activeL2=null; loadProducts()">
          {{ l1.name }}
        </button>
        <button v-for="l2 in catChildren(l1.id)" :key="l2.id" class="btn btn-sm rounded-pill px-3"
          :style="btnStyle(activeL2===l2.id)"
          @click="selectL2(l1.id, l2.id)">
          {{ l2.name }}
        </button>
      </div>
    </div>

    <!-- 商品列表 -->
    <div v-if="loading && !products.length" class="text-center text-muted py-5">加载中...</div>
    <div v-else-if="!loading && !products.length" class="text-center text-muted py-5">暂无商品</div>
    <div v-else class="row g-3">
      <div v-for="p in products" :key="p.id" class="col-6 col-md-4 col-lg-3">
        <div class="card border-0 shadow-sm h-100"
          style="border-radius:10px;overflow:hidden;cursor:pointer;transition:transform 0.2s;"
          @mouseenter="$event.currentTarget.style.transform='translateY(-4px)'"
          @mouseleave="$event.currentTarget.style.transform='translateY(0)'"
          @click="goDetail(p.id)">
          <div style="height:180px;background:#f5f5f5;overflow:hidden;">
            <img v-if="p.main_image" :src="p.main_image" style="width:100%;height:100%;object-fit:cover;" />
            <div v-else class="d-flex align-items-center justify-content-center text-muted" style="width:100%;height:100%;font-size:2rem;">📦</div>
          </div>
          <div class="card-body">
            <div class="fw-medium text-truncate" style="font-size:0.88rem;">{{ p.name }}</div>
            <div v-if="p.subtitle" class="text-muted small text-truncate">{{ p.subtitle }}</div>
            <div class="mt-1 fw-bold" style="color:#ff4d4f;">{{ p.min_price === p.max_price ? '¥'+Number(p.min_price).toFixed(2) : '¥'+Number(p.min_price).toFixed(2)+' 起' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多 / 已到底 -->
    <div v-if="products.length && !loading" class="text-center py-4 text-muted" style="font-size:0.85rem;">
      {{ noMore ? '— 已经到底了 —' : '加载中...' }}
    </div>
  </div>
</template>
