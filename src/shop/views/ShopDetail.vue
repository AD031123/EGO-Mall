<script setup>
import { ref, onMounted, onBeforeUnmount, computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getShopProductDetail, addToCart, checkClaimedCoupons } from '@/api/shop.js'
import { marked } from 'marked'
import { useToast } from '@/composables/useToast.js'
import CouponPanel from '@/shop/components/CouponPanel.vue'

marked.use({ gfm: true })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const openCart = inject('openCart')   // layout 层 provide 的打开购物车方法
const product = ref(null)
const activeImage = ref('')
const quantity = ref(1)
const selectedSku = ref(null)
const buyPanelFixed = ref(false)
const buyPanel = ref(null)
let buyPanelTop = 0
let buyPanelLeft = ''
let buyPanelWidth = ''

// 优惠券相关
const couponPanelVisible = ref(false)
const claimedCouponIds = ref([])
const appliedCoupon = ref(null)  // 当前已应用的优惠券

onMounted(async () => {
  try {
    const id = route.params.id
    const res = await getShopProductDetail(id)
    product.value = res.data
    if (res.data.main_image) activeImage.value = res.data.main_image
    else if (res.data.images && res.data.images.length) activeImage.value = res.data.images[0]
    // 默认选中第一个 sku
    if (res.data.skus && res.data.skus.length) selectedSku.value = res.data.skus[0]
    // 检查已领优惠券，并自动应用第一张
    if (res.data.coupons && res.data.coupons.length) {
      const token = localStorage.getItem('ego_cookie')
      if (token) {
        try {
          const cr = await checkClaimedCoupons(res.data.product_id)
          if (cr.code === 0 && cr.data.length) {
            claimedCouponIds.value = cr.data
            // 优先应用 discount 最大的已领券
            const best = res.data.coupons
              .filter(c => cr.data.includes(c.id))
              .sort((a, b) => Number(b.discount) - Number(a.discount))
            appliedCoupon.value = best[0] || null
          }
        } catch {}
      }
    }
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', updatePosition)
    onScroll()
  } catch (e) { console.error('加载详情失败:', e) }
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', updatePosition)
})

function updatePosition() {
  if (!buyPanel.value) return
  const wrapper = buyPanel.value.parentElement
  buyPanelTop = wrapper.getBoundingClientRect().top + window.scrollY
  buyPanelLeft = wrapper.getBoundingClientRect().left + 'px'
  buyPanelWidth = wrapper.offsetWidth + 'px'
}

function onScroll() {
  if (!buyPanel.value) return
  const rect = buyPanel.value.getBoundingClientRect()
  if (rect.top <= 80) {
    if (!buyPanelFixed.value) {
      updatePosition()
      buyPanelFixed.value = true
    }
  } else {
    buyPanelFixed.value = false
  }
}

const allImages = computed(() => {
  if (!product.value) return []
  const list = []
  if (product.value.main_image) list.push(product.value.main_image)
  if (product.value.images && Array.isArray(product.value.images)) {
    product.value.images.forEach(u => list.push(u))
  }
  return list
})

const displayPrice = computed(() => {
  if (!product.value) return 0
  const base = selectedSku.value ? Number(selectedSku.value.price || 0) : (product.value.skus && product.value.skus.length ? Number(product.value.skus[0].price || 0) : 0)
  return base
})
const discountPrice = computed(() => {
  if (!appliedCoupon.value) return null
  const base = displayPrice.value
  if (base >= Number(appliedCoupon.value.min_amount)) {
    return base - Number(appliedCoupon.value.discount)
  }
  return null
})
function onCouponClaimed(couponId) {
  claimedCouponIds.value.push(couponId)
  const coupon = product.value?.coupons?.find(c => c.id === couponId)
  if (coupon) appliedCoupon.value = coupon
}

const AllClaimed = computed(() => {
  if (!product.value?.coupons?.length) return false
  return product.value.coupons.every(c => claimedCouponIds.value.includes(c.id))
})

async function addToCartFn() {
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { toast.warn('请先登录'); router.push('/login'); return }
  const sku = selectedSku.value
  try {
    const r = await addToCart({
      product_id: product.value ? (product.value.product_id || product.value.id) : null,
      product_name: product.value.name,
      main_image: product.value.main_image,
      price: sku ? sku.price : 0,
      quantity: quantity.value,
      sku_id: sku ? sku.id : null,
      sku_name: sku ? sku.spec_name : null
    })
    if (r.code === 0) {
      toast.success(r.message || '已加入购物车')
      if (openCart) openCart()
    } else if (r.code === 1 && r.message?.includes('登录')) {
      toast.warn('请先登录')
      router.push('/login')
    } else {
      toast.error(r.message || '添加失败')
    }
  } catch { toast.error('添加到购物车失败') }
}

async function buyNow() {
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { toast.warn('请先登录'); router.push('/login'); return }
  try {
    const sku = selectedSku.value
    const r = await addToCart({
      product_id: product.value ? (product.value.product_id || product.value.id) : null,
      product_name: product.value.name,
      main_image: product.value.main_image,
      price: sku ? sku.price : 0,
      quantity: quantity.value,
      sku_id: sku ? sku.id : null,
      sku_name: sku ? sku.spec_name : null
    })
    if (r.code === 0) {
      toast.success(r.message || '已加入购物车')
      // 打开购物车面板
      if (openCart) openCart()
    } else if (r.code === 1 && r.message?.includes('登录')) {
      toast.warn('请先登录')
      router.push('/login')
    } else {
      toast.error(r.message || '添加失败')
    }
  } catch { toast.error('添加到购物车失败') }
}
</script>

<style scoped>
.coupon-tag {
  display: inline-block;
  border: 1.5px solid;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.72rem;
  font-weight: 500;
}
.coupon-claimed {
  border-color: #ccc !important;
  color: #999 !important;
}
.overflow-auto::-webkit-scrollbar { width: 4px; }
.overflow-auto::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
</style>

<template>
  <div v-if="product" class="px-4 py-4" style="max-width:1400px;margin:0 auto;">
    <!-- 面包屑 -->
    <nav class="small mb-3" style="color:#999;">
      <router-link to="/" class="text-decoration-none" style="color:#999;">首页</router-link>
      <span class="mx-1">/</span>
      <span v-if="product.category_l1_name || product.category_l2_name" class="mx-1">
        <router-link :to="'/category?l1=' + product.category_l1" class="text-decoration-none" style="color:#999;">
          {{ product.category_l1_name || '' }}
        </router-link>
        <span v-if="product.category_l2_name" class="mx-1">/</span>
        <router-link v-if="product.category_l2_name" :to="'/category?l1=' + product.category_l1 + '&l2=' + product.category_l2" class="text-decoration-none" style="color:#999;">
          {{ product.category_l2_name }}
        </router-link>
        <span class="mx-1">/</span>
      </span>
      <span style="color:#333;">{{ product.name }}</span>
    </nav>

    <div class="row g-4">
      <!-- 左侧图片 -->
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm p-3">
          <div class="d-flex gap-3" style="height:480px;">
            <div class="overflow-auto flex-shrink-0" style="width:72px;max-height:480px;">
              <div v-for="(img, i) in allImages" :key="i" class="rounded mb-2 overflow-hidden border"
                :class="{'border-primary':activeImage===img}"
                :style="{width:'64px',height:'64px',cursor:'pointer',borderColor:activeImage===img?'#52CDFF':'#eee',borderWidth:activeImage===img?'2px':'1px'}"
                @mouseenter="activeImage=img">
                <div :style="{width:'100%',height:'100%',background:`url(${img}) center/cover no-repeat`}"></div>
              </div>
            </div>
            <div class="flex-grow-1 rounded d-flex align-items-center justify-content-center" style="height:480px;background:#fafafa;">
              <div v-if="activeImage" :style="{width:'100%',height:'100%',background:`url(${activeImage}) center/contain no-repeat`}"></div>
              <div v-else class="text-muted">暂无图片</div>
            </div>
          </div>
        </div>
        <!-- 描述 -->
        <div class="card border-0 shadow-sm mt-4 p-4 detail-content">
          <h6 class="fw-bold mb-3">商品详情</h6>
          <div v-if="product.description" v-html="marked.parse(product.description)" class="markdown-body"></div>
          <div v-else class="text-muted">暂无详细描述。</div>
        </div>
      </div>

      <!-- 右侧购买面板 -->
      <div class="col-lg-5">
        <div ref="buyPanel" class="card border-0 shadow-sm" :style="buyPanelFixed ? { position:'fixed', top:'80px', left: buyPanelLeft, width: buyPanelWidth, zIndex: 100 } : {}">
          <div class="card-body p-4">
            <h5 class="fw-bold mb-2">{{ product.name }}</h5>
            <p v-if="product.subtitle" class="text-muted small mb-3">{{ product.subtitle }}</p>
            <div class="mb-3">
              <template v-if="discountPrice">
                <span class="text-muted text-decoration-line-through me-2" style="font-size:0.9rem;">¥{{ displayPrice.toFixed(2) }}</span>
                <span class="fw-bold fs-4" style="color:#ff4d4f;">¥{{ discountPrice.toFixed(2) }}</span>
                <span class="badge ms-2" style="background:#ff4d4f;font-size:0.7rem;">已优惠¥{{ appliedCoupon.discount }}</span>
              </template>
              <template v-else>
                <span class="fw-bold fs-4" style="color:#ff4d4f;">¥{{ displayPrice.toFixed(2) }}</span>
              </template>
            </div>

            <!-- 优惠券 -->
            <div v-if="product.coupons && product.coupons.length" class="mb-3">
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <div v-for="c in product.coupons" :key="c.id" class="coupon-tag"
                  :class="{ 'coupon-claimed': claimedCouponIds.includes(c.id) }"
                  :style="claimedCouponIds.includes(c.id) ? {} : {borderColor: '#ff4d4f', color: '#ff4d4f', cursor: 'pointer'}">
                  <span>满{{ Number(c.min_amount) }}减{{ Number(c.discount) }}</span>
                </div>
                <button v-if="AllClaimed" class="btn btn-sm rounded-pill px-3" disabled style="background:#f5f5f5;color:#999;border:1px solid #ddd;font-size:0.75rem;font-weight:600;">
                  已领取
                </button>
                <button v-else class="btn btn-sm rounded-pill px-3" style="background:#ff4d4f;color:#fff;font-size:0.75rem;font-weight:600;border:none;"
                  @click="couponPanelVisible = true">领</button>
              </div>
            </div>
            <hr />
            <!-- SKU 选择 -->
            <div v-if="product.skus && product.skus.length > 1" class="mb-3">
              <label class="form-label small fw-semibold">规格</label>
              <div class="d-flex flex-wrap gap-2">
                <button v-for="sku in product.skus" :key="sku.id" class="btn btn-sm rounded-pill px-3"
                  :style="{background: selectedSku?.id === sku.id ? '#52CDFF' : '#f0f0f0', color: selectedSku?.id === sku.id ? '#fff' : '#666', border: 'none', fontSize: '0.82rem'}"
                  @click="selectedSku = sku">
                  {{ sku.spec_name }}
                </button>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">数量</label>
              <div class="d-flex align-items-center" style="width:120px;">
                <button class="btn btn-sm border-0 bg-transparent" style="font-size:1.2rem;color:#333;padding:0 8px;" @click="quantity>1&&quantity--">−</button>
                <input v-model.number="quantity" type="text" class="form-control form-control-sm border-0 text-center" style="background:transparent;font-weight:600;color:#333;" readonly />
                <button class="btn btn-sm border-0 bg-transparent" style="font-size:1.2rem;color:#333;padding:0 8px;" @click="quantity++">+</button>
              </div>
            </div>
            <div class="d-grid gap-2">
              <button class="btn btn-lg" style="background:#52CDFF;color:#fff;font-weight:600;" @click="addToCartFn">加入购物车</button>
              <button class="btn btn-lg" style="background:#ff4d4f;color:#fff;font-weight:600;" @click="buyNow">立即购买</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="text-center py-5 text-muted">加载中...</div>

  <!-- 优惠券侧边栏 -->
  <CouponPanel
    :visible="couponPanelVisible"
    :coupons="product?.coupons || []"
    :claimedIds="claimedCouponIds"
    @close="couponPanelVisible = false"
    @claimed="onCouponClaimed"
  />
</template>

<!-- v-html 渲染的 markdown 内容不会被 scoped 样式命中，必须用非 scoped 块 -->
<style>
.markdown-body img { max-width: 100%; height: auto; }
.markdown-body h1,.markdown-body h2,.markdown-body h3 { margin-top: 1em; margin-bottom: 0.5em; }
.markdown-body p { margin-bottom: 0.8em; line-height: 1.7; }
.markdown-body code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.88em; }
.markdown-body pre { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; overflow-x: auto; }
.markdown-body pre code { background: none; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #52CDFF; padding-left: 12px; color: #666; margin: 1em 0; }
.markdown-body table { border-collapse: collapse; width: 100%; }
.markdown-body th, .markdown-body td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.markdown-body th { background: #f5f5f5; }
</style>
