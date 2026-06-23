<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getShowcase, getAllShowcases } from '@/data/showcase.js'
import { marked } from 'marked'
import { useToast } from '@/composables/useToast.js'

marked.use({ gfm: true })

const toast = useToast()
const route = useRoute()
const router = useRouter()
const openCart = inject('openCart', null)
const item = ref(null)
const activeImage = ref('')
const notFound = ref(false)
const quantity = ref(1)

// 模拟 SKU 选择（本地演示数据，无 API）
const specOptions = ['原画集', '限定版（含特典）', '典藏版（含特典+签名卡）']
const selectedSpec = ref('原画集')

// 购买面板浮动（与 ShopDetail 同款逻辑）
const buyPanel = ref(null)
const buyPanelFixed = ref(false)
let buyPanelTop = 0
let buyPanelLeft = ''
let buyPanelWidth = ''

const allShowcases = getAllShowcases()

function loadItem(id) {
  const found = getShowcase(id)
  if (!found) {
    notFound.value = true
    item.value = null
    return
  }
  item.value = found
  activeImage.value = found.cover
  notFound.value = false
  quantity.value = 1
  selectedSpec.value = '原画集'
}

onMounted(() => {
  loadItem(route.params.id)
  window.addEventListener('scroll', onScroll)
  window.addEventListener('resize', updatePosition)
})

// 路由参数变化重新加载
watch(() => route.params.id, (newId) => {
  loadItem(newId)
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

const renderedDesc = computed(() => {
  if (!item.value?.desc) return ''
  return marked.parse(item.value.desc)
})

// 模拟规格影响价格
const displayPrice = computed(() => {
  if (!item.value) return 0
  const base = Number(item.value.price)
  if (selectedSpec.value === '限定版（含特典）') return base + 40
  if (selectedSpec.value === '典藏版（含特典+签名卡）') return base + 98
  return base
})

// ===== 购买面板浮动 =====
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
    if (!buyPanelFixed.value) { updatePosition(); buyPanelFixed.value = true }
  } else {
    buyPanelFixed.value = false
  }
}

function goTo(id) {
  router.push(`/showcase/${id}`)
}

// ===== 演示：加入购物车 / 立即购买 =====
function addToCartFn() {
  toast.success(`已将「${item.value.title} × ${quantity.value}」加入购物车 (演示)`)
  if (openCart) openCart()
}

function buyNow() {
  toast.success(`已下单「${item.value.title} × ${quantity.value}」，¥${(displayPrice.value * quantity.value).toFixed(2)} (演示)`)
}
</script>

<template>
  <div class="container py-4" style="max-width: 1400px; margin: 0 auto;">

    <!-- 404 -->
    <div v-if="notFound" class="text-center py-5">
      <div style="font-size: 5rem;">🔍</div>
      <h3 class="fw-bold mt-3">演示页面不存在</h3>
      <p class="text-muted">请检查轮播图配置中的 showcase id</p>
      <button class="btn btn-primary mt-2" @click="router.push('/')">← 返回首页</button>
    </div>

    <template v-if="item">
      <!-- 面包屑 -->
      <nav class="mb-3" style="font-size:0.82rem; color:#999;">
        <router-link to="/" class="text-decoration-none" style="color:#52CDFF;">首页</router-link>
        <span class="mx-1">/</span>
        <span style="color:#333;">{{ item.title }}</span>
      </nav>

      <div class="row g-4">
        <!-- ===== 左侧：图片 + 描述 ===== -->
        <div class="col-lg-7">
          <!-- 图片预览 -->
          <div class="card border-0 shadow-sm p-3" style="border-radius: 16px;">
            <div class="d-flex gap-3" style="height: 480px;">
              <!-- 缩略图侧栏 -->
              <div class="overflow-auto flex-shrink-0" style="width:72px;max-height:480px;">
                <div
                  v-for="(img, i) in item.images" :key="i"
                  class="rounded mb-2 overflow-hidden"
                  :style="{
                    width:'64px', height:'64px', cursor:'pointer',
                    border: activeImage===img ? '2px solid #52CDFF' : '1px solid #eee'
                  }"
                  @mouseenter="activeImage = img"
                >
                  <div :style="{width:'100%',height:'100%',background:`url(${img}) center/cover no-repeat`}"></div>
                </div>
              </div>
              <!-- 主图 -->
              <div class="flex-grow-1 rounded d-flex align-items-center justify-content-center" style="height:480px;background:#fafafa;">
                <div
                  v-if="activeImage"
                  :style="{width:'100%',height:'100%',background:`url(${activeImage}) center/contain no-repeat`}"
                ></div>
                <div v-else class="text-muted">暂无图片</div>
              </div>
            </div>
          </div>

          <!-- 详细描述 (Markdown) -->
          <div class="card border-0 shadow-sm mt-4 p-4" style="border-radius: 16px;">
            <h6 class="fw-bold mb-3">📖 商品详情</h6>
            <div v-html="renderedDesc" class="markdown-body"></div>
          </div>

          <!-- 规格参数 -->
          <div class="card border-0 shadow-sm mt-4" style="border-radius: 16px; overflow: hidden;">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-3">📐 规格参数</h5>
              <table class="table table-borderless mb-0" style="font-size:0.9rem;">
                <tbody>
                  <tr v-for="(value, key) in item.spec" :key="key">
                    <td class="ps-0" style="width:120px; color:#999;">{{ key }}</td>
                    <td style="color:#333; font-weight:500;">{{ value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ===== 右侧：购买面板 ===== -->
        <div class="col-lg-5">
          <div ref="buyPanel" class="card border-0 shadow-sm"
            :style="buyPanelFixed ? { position:'fixed', top:'80px', left: buyPanelLeft, width: buyPanelWidth, zIndex: 100, borderRadius: '16px' } : { borderRadius: '16px' }">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-2">{{ item.title }}</h5>
              <p v-if="item.subtitle" class="text-muted small mb-3">{{ item.subtitle }}</p>

              <!-- 价格 -->
              <div class="mb-3">
                <span class="fw-bold fs-4" style="color:#ff4d4f;">¥{{ displayPrice.toFixed(2) }}</span>
                <span v-if="selectedSpec !== '原画集'" class="badge ms-2" style="background:#ff4d4f;font-size:0.65rem;">{{ selectedSpec }}</span>
              </div>

              <hr />

              <!-- 规格选择 -->
              <div class="mb-3">
                <label class="form-label small fw-semibold">规格</label>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-for="spec in specOptions" :key="spec"
                    class="btn btn-sm rounded-pill px-3"
                    :style="{
                      background: selectedSpec === spec ? '#52CDFF' : '#f0f0f0',
                      color: selectedSpec === spec ? '#fff' : '#666',
                      border: 'none',
                      fontSize: '0.82rem'
                    }"
                    @click="selectedSpec = spec"
                  >{{ spec }}</button>
                </div>
              </div>

              <!-- 数量 -->
              <div class="mb-3">
                <label class="form-label small fw-semibold">数量</label>
                <div class="d-flex align-items-center" style="width: 132px;">
                  <button
                    class="btn btn-sm border-0 bg-transparent"
                    style="font-size:1.3rem;color:#333;padding:0 10px;line-height:1;"
                    :disabled="quantity <= 1"
                    @click="quantity > 1 && quantity--"
                  >−</button>
                  <input
                    v-model.number="quantity"
                    type="text"
                    class="form-control form-control-sm border text-center"
                    style="font-weight:600;color:#333;width:48px;"
                    readonly
                  />
                  <button
                    class="btn btn-sm border-0 bg-transparent"
                    style="font-size:1.3rem;color:#333;padding:0 10px;line-height:1;"
                    @click="quantity++"
                  >+</button>
                  <span class="text-muted ms-2" style="font-size:0.7rem;">(演示)</span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="d-grid gap-2">
                <button
                  class="btn btn-lg"
                  style="background:#52CDFF;color:#fff;font-weight:600;border-radius:12px;"
                  @click="addToCartFn"
                >加入购物车</button>
                <button
                  class="btn btn-lg"
                  style="background:#ff4d4f;color:#fff;font-weight:600;border-radius:12px;"
                  @click="buyNow"
                >立即购买</button>
              </div>

              <p class="text-muted text-center mt-3 mb-0" style="font-size:0.7rem;">
                ⚠ 此为本地演示页面，不涉及真实交易
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部：导航到其它演示页（仅占左列宽度，不会被购买面板遮挡） -->
      <div class="row g-4 mt-4">
        <div class="col-lg-7">
          <div class="card border-0 shadow-sm" style="border-radius: 16px; overflow: hidden;">
            <div class="card-body p-4">
              <h5 class="fw-bold mb-3">🔗 其他演示页面 <span class="text-muted" style="font-weight:400;font-size:0.75rem;">（点击卡片跳转）</span></h5>
              <div class="row g-2">
                <div v-for="s in allShowcases" :key="s.id" class="col-6 col-md-3 col-lg">
                  <div
                    class="card border-0 h-100 showcase-nav-card"
                    :class="{ 'current-card': s.id === item.id }"
                    @click="goTo(s.id)"
                  >
                    <div class="showcase-nav-img" :style="{ backgroundImage: `url(${s.cover})` }">
                      <div v-if="s.id === item.id" class="current-badge">当前页</div>
                    </div>
                    <div class="p-2">
                      <div class="showcase-nav-title">{{ s.title }}</div>
                      <div class="showcase-nav-price">¥{{ s.price.toFixed(2) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
/* ===== Markdown 渲染 ===== */
.markdown-body :deep(h2) {
  font-size: 1.3rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem;
  color: #333; border-bottom: 2px solid #52CDFF; padding-bottom: 0.3rem;
}
.markdown-body :deep(h3) {
  font-size: 1.1rem; font-weight: 600; margin-top: 1.2rem; margin-bottom: 0.5rem;
}
.markdown-body :deep(p) { line-height: 1.8; color: #444; margin-bottom: 0.6rem; }
.markdown-body :deep(ul), .markdown-body :deep(ol) { padding-left: 1.5rem; margin-bottom: 0.8rem; }
.markdown-body :deep(li) { line-height: 1.7; color: #555; }
.markdown-body :deep(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; }
.markdown-body :deep(th), .markdown-body :deep(td) { border: 1px solid #e8e8e8; padding: 8px 12px; text-align: left; }
.markdown-body :deep(th) { background: #f5f5f5; font-weight: 600; }
.markdown-body :deep(blockquote) {
  border-left: 4px solid #52CDFF; padding: 8px 16px; margin: 1rem 0;
  background: #f8f9fa; color: #666; font-style: italic;
}
.markdown-body :deep(strong) { color: #333; }
.markdown-body :deep(hr) { margin: 1.5rem 0; border: none; border-top: 1px solid #eee; }

/* ===== 底部导航卡片 ===== */
.showcase-nav-card {
  cursor: pointer; border-radius: 12px; overflow: hidden;
  transition: all 0.25s ease; border: 2px solid transparent;
}
.showcase-nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(82,205,255,0.15);
  border-color: #52CDFF;
}
.showcase-nav-card.current-card {
  background: #f0faff; border-color: #52CDFF; cursor: default;
}
.showcase-nav-img {
  height: 100px; background-size: cover; background-position: center;
  background-repeat: no-repeat; position: relative;
}
.current-badge {
  position: absolute; top: 6px; right: 6px;
  background: #52CDFF; color: #fff; font-size: 0.6rem;
  padding: 2px 8px; border-radius: 10px; font-weight: 600;
}
.showcase-nav-title {
  font-size: 0.72rem; font-weight: 600; color: #333; line-height: 1.3; margin-bottom: 2px;
}
.showcase-nav-price {
  font-size: 0.75rem; color: #ff4d4f; font-weight: 700;
}
</style>
