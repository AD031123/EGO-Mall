<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getDealsCoupons, claimCoupon, checkClaimedCoupons, getMyCoupons } from '@/api/shop.js'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()
const router = useRouter()
const deals = ref([])
const loading = ref(false)
const claimedIds = ref([])
const claimingId = ref(null)

onMounted(async () => {
  await loadDeals()
})

async function loadDeals() {
  loading.value = true
  try {
    const r = await getDealsCoupons()
    if (r.code === 0) deals.value = r.data
  } catch (e) {
    console.error('加载优惠专区失败:', e)
  } finally {
    loading.value = false
  }
  // 加载已领取的优惠券 ID
  loadClaimed()
}

async function loadClaimed() {
  const token = localStorage.getItem('ego_cookie')
  if (!token) return
  try {
    const r = await getMyCoupons()
    if (r.code === 0) {
      claimedIds.value = r.data.map(item => item.coupon_id)
    }
  } catch {}
}

async function onClaim(coupon) {
  if (claimingId.value) return
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { toast.warn('请先登录'); router.push('/login'); return }

  claimingId.value = coupon.id
  try {
    const r = await claimCoupon(coupon.id)
    if (r.code === 0) {
      claimedIds.value.push(coupon.id)
      toast.success('领取成功！')
    } else {
      toast.error(r.message || '领取失败')
    }
  } catch { toast.error('领取失败，请重试') }
  finally { claimingId.value = null }
}

function isClaimed(id) {
  return claimedIds.value.includes(id)
}

function formatPrice(p) {
  if (!p.min_price && !p.max_price) return '-'
  const lo = Number(p.min_price || 0)
  const hi = Number(p.max_price || 0)
  if (lo === hi) return '¥' + lo.toFixed(2)
  return '¥' + lo.toFixed(2) + ' 起'
}

// 领取后估价
function afterDiscount(p) {
  const base = Number(p.min_price || 0)
  const d = Number(p.discount || 0)
  if (base >= Number(p.min_amount)) return base - d
  return null
}
</script>

<template>
  <div class="deals-page">
    <!-- 页面头图 -->
    <div class="deals-hero">
      <div class="deals-hero-content">
        <h2 class="fw-bold mb-2">🎫 优惠专区</h2>
        <p class="mb-0 opacity-75">超值优惠券限时领取，好物不等人</p>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="container py-4" style="max-width: 1200px;">
      <!-- 加载 -->
      <div v-if="loading" class="text-center py-5 text-muted">
        <div class="spinner-border" style="color:#52CDFF;width:2rem;height:2rem;" role="status"></div>
        <p class="mt-2">正在加载优惠券...</p>
      </div>

      <!-- 空 -->
      <div v-else-if="!deals.length" class="text-center py-5 text-muted">
        <div style="font-size:3rem;">🎫</div>
        <p class="mt-3">暂无可领取的优惠券，敬请期待～</p>
      </div>

      <!-- 卡片列表 -->
      <div v-else class="row g-4">
        <div v-for="item in deals" :key="item.id" class="col-md-6 col-lg-4">
          <!-- 单个优惠商品卡片 -->
          <div class="deal-card card border-0 shadow-sm h-100">
            <!-- 顶部：商品图 + 优惠角标 -->
            <div class="deal-card-img-wrapper" @click="router.push(`/product/${item.product_id}`)" style="cursor:pointer;">
              <div
                class="deal-card-img"
                :style="{ background: item.main_image ? `url(${item.main_image}) center/cover no-repeat` : '#f0f0f0' }"
              >
                <div v-if="!item.main_image" class="d-flex align-items-center justify-content-center h-100 text-muted" style="font-size:2rem;">📦</div>
              </div>
              <!-- 折扣角标 -->
              <div class="deal-badge">
                <span class="fw-bold" style="font-size:1.3rem;">¥{{ Number(item.discount) }}</span>
              </div>
            </div>

            <!-- 底部：信息 -->
            <div class="card-body d-flex flex-column">
              <h6 class="fw-bold mb-1" style="color:#333;">{{ item.product_name }}</h6>
              <p v-if="item.subtitle" class="text-muted small mb-2 text-truncate">{{ item.subtitle }}</p>

              <!-- 优惠券信息栏 -->
              <div class="deal-info-bar d-flex align-items-center gap-3 mb-2">
                <div>
                  <span class="text-muted" style="font-size:0.7rem;">原价</span>
                  <span class="fw-semibold" style="color:#333;font-size:0.9rem;">{{ formatPrice(item) }}</span>
                </div>
                <div v-if="afterDiscount(item) !== null" class="ms-auto">
                  <span class="text-muted" style="font-size:0.7rem;">领券后</span>
                  <span class="fw-bold" style="color:#ff4d4f;font-size:0.95rem;">¥{{ afterDiscount(item).toFixed(2) }}</span>
                </div>
              </div>

              <!-- 券标签 -->
              <div class="deal-coupon-tag mb-3">
                <span class="coupon-chip">满{{ Number(item.min_amount) }}减{{ Number(item.discount) }}</span>
              </div>

              <!-- 领取按钮 -->
              <button
                v-if="isClaimed(item.id)"
                class="btn w-100 rounded-pill" disabled
                style="background:#f5f5f5;color:#999;border:1px solid #ddd;font-weight:600;"
              >
                {{ claimingId === item.id ? '领取中...' : '已领取' }}
              </button>
              <button
                v-else
                class="btn w-100 rounded-pill fw-bold"
                style="background:#ff4d4f;color:#fff;"
                @click="onClaim(item)"
                :disabled="claimingId === item.id"
              >
                {{ claimingId === item.id ? '领取中...' : '立即领取' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hero 头图 */
.deals-hero {
  background: linear-gradient(135deg, #52CDFF 0%, #3aa8e0 100%);
  color: #fff;
  padding: 48px 0 40px;
  text-align: center;
}
.deals-hero-content p {
  font-size: 0.95rem;
  opacity: 0.85;
}

/* 商品卡片 */
.deal-card {
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.deal-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
}

.deal-card-img-wrapper {
  position: relative;
  overflow: hidden;
}
.deal-card-img {
  height: 200px;
  background-color: #f5f5f5;
}

/* 折扣角标 */
.deal-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff4d4f;
  color: #fff;
  padding: 6px 16px 8px 20px;
  border-radius: 0 0 0 16px;
  font-size: 0.75rem;
  line-height: 1.2;
  font-weight: 600;
}

/* 领券信息栏 */
.deal-info-bar {
  background: #fafafa;
  border-radius: 8px;
  padding: 6px 12px;
}

/* 券标签 */
.coupon-chip {
  display: inline-block;
  color: #ff4d4f;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 500;
}
</style>
