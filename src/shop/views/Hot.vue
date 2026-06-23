<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getShopProducts } from '@/api/shop.js'

const router = useRouter()
const products = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const r = await getShopProducts(1, 200)
    if (r.code === 0) {
      // 按销量从高到低排序
      products.value = r.data.list
        .filter(p => (p.sales_count || 0) > 0)
        .sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))
    }
  } catch {}
  loading.value = false
})

function formatSales(count) {
  const n = Number(count) || 0
  if (n >= 10000) {
    const w = n / 10000
    return w >= 1 ? w.toFixed(w % 1 === 0 ? 0 : 1) + '万' : w.toFixed(1) + '万'
  }
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function rankBadge(index) {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return index + 1
}

function goDetail(id) {
  router.push(`/product/${id}`)
}
</script>

<template>
  <div style="max-width:900px;margin:0 auto;padding:24px;">
    <h5 class="fw-bold mb-3">🔥 热销榜</h5>

    <div v-if="loading" class="text-center text-muted py-5">加载中...</div>
    <div v-else-if="!products.length" class="text-center text-muted py-5">暂无热销商品</div>
    <div v-else class="card border-0 shadow-sm" style="border-radius:12px;overflow:hidden;">
      <div v-for="(p, i) in products" :key="p.id"
        class="d-flex align-items-center gap-3 px-4 py-3"
        style="border-bottom:1px solid #f3f3f3;cursor:pointer;transition:background 0.15s;"
        @click="goDetail(p.id)"
        @mouseenter="$event.currentTarget.style.background='#fafafa'"
        @mouseleave="$event.currentTarget.style.background=''"
      >
        <!-- 排名 -->
        <div class="d-flex align-items-center justify-content-center flex-shrink-0"
          style="width:44px;height:44px;font-weight:700;font-size:1rem;">
          <template v-if="i < 3">
            <span style="font-size:1.6rem;">{{ rankBadge(i) }}</span>
          </template>
          <template v-else>
            <span style="color:#aaa;font-size:1.05rem;">{{ rankBadge(i) }}</span>
          </template>
        </div>

        <!-- 封面 -->
        <div class="rounded overflow-hidden flex-shrink-0" style="width:64px;height:64px;background:#f5f5f5;">
          <img v-if="p.main_image" :src="p.main_image" style="width:100%;height:100%;object-fit:cover;" />
          <div v-else class="d-flex align-items-center justify-content-center text-muted" style="width:100%;height:100%;">📦</div>
        </div>

        <!-- 商品信息 -->
        <div class="flex-grow-1 min-w-0">
          <div class="fw-medium text-truncate" style="font-size:0.9rem;">{{ p.name }}</div>
          <div v-if="p.subtitle" class="text-muted text-truncate" style="font-size:0.78rem;">{{ p.subtitle }}</div>
          <div class="mt-1 d-flex align-items-center gap-3">
            <span class="fw-bold" style="color:#ff4d4f;">¥{{ p.min_price === p.max_price ? Number(p.min_price).toFixed(2) : Number(p.min_price).toFixed(2)+' 起' }}</span>
          </div>
        </div>

        <!-- 销量 -->
        <div class="text-end flex-shrink-0" style="min-width:70px;">
          <div class="fw-bold" style="color:#ff9800;font-size:0.95rem;">{{ formatSales(p.sales_count) }}</div>
          <div class="text-muted" style="font-size:0.7rem;">已售</div>
        </div>
      </div>
    </div>
  </div>
</template>
