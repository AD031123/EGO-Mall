<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { getAnalyticsOverview, getAnalyticsTrend } from '@/api/products.js'

const overview = ref(null)
const trend = ref([])
const loading = ref(true)
const animReady = ref(false)

// 卡片数字递增动画
const animatedValues = ref({ page_views: 0, product_clicks: 0, deal_amount: 0, run_days: 0 })
const animTargets = ref({ page_views: 0, product_clicks: 0, deal_amount: 0, run_days: 0 })

function animateCountUp() {
  const keys = ['page_views', 'product_clicks', 'deal_amount', 'run_days']
  const duration = 1000
  const startTime = performance.now()

  function frame(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    for (const k of keys) {
      animatedValues.value[k] = Math.round(animTargets.value[k] * eased * 10) / 10
    }
    if (progress < 1) {
      requestAnimationFrame(frame)
    } else {
      for (const k of keys) {
        animatedValues.value[k] = animTargets.value[k]
      }
    }
  }
  requestAnimationFrame(frame)
}

const displayCards = computed(() => {
  if (!overview.value) return []
  const c = overview.value.compare
  return [
    { title: '页面浏览量', rawValue: animTargets.value.page_views, animValue: animatedValues.value.page_views, change: c.page_views_pct, icon: '👁️', color: '#52CDFF', format: (v) => Math.floor(v).toLocaleString() },
    { title: '商品点击率', rawValue: animTargets.value.product_clicks, animValue: animatedValues.value.product_clicks, change: c.product_clicks_pct, icon: '🖱️', color: '#ffc107', format: (v) => Math.floor(v).toLocaleString() },
    { title: '今日成交金额', rawValue: animTargets.value.deal_amount, animValue: animatedValues.value.deal_amount, change: c.deal_amount_pct, icon: '💰', color: '#28a745', format: (v) => '¥' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') },
    { title: '网站运行时间', rawValue: animTargets.value.run_days, animValue: animatedValues.value.run_days, change: null, icon: '⏱️', color: '#6f42c1', format: (v) => Math.floor(v) + ' 天' }
  ]
})

// 每个图表独立的 tooltip 状态
const tooltip = ref({ chartKey: null, index: -1, x: 0, y: 0, data: null })
const showTooltip = ref(false)
let hideTimer = null

function onPointEnter(chartKey, index, x, y, data) {
  clearTimeout(hideTimer)
  tooltip.value = { chartKey, index, x, y, data }
  showTooltip.value = true
}
function onPointLeave() {
  hideTimer = setTimeout(() => { showTooltip.value = false }, 200)
}
function onTooltipEnter() {
  clearTimeout(hideTimer)
}
onBeforeUnmount(() => { clearTimeout(hideTimer) })

onMounted(async () => {
  try {
    const [over, tr] = await Promise.all([
      getAnalyticsOverview(),
      getAnalyticsTrend()
    ])
    if (over.code === 0) overview.value = over.data
    if (tr.code === 0) trend.value = tr.data

    // 设置动画目标值
    if (overview.value) {
      animTargets.value = {
        page_views: overview.value.today.page_views,
        product_clicks: overview.value.today.product_clicks,
        deal_amount: overview.value.today.deal_amount,
        run_days: overview.value.run_days
      }
    }
  } catch (e) {
    console.error('加载仪表盘数据失败:', e)
  } finally {
    loading.value = false
    await nextTick()
    setTimeout(() => { animReady.value = true }, 50)
    animateCountUp()
  }
})

// 趋势图节点上升动画——每次 trend 数据变化从底部升起
const chartAnimOffsets = ref({})
watch(() => trend.value, (newVal) => {
  if (!newVal.length) return
  const keys = ['pv', 'clicks', 'amount']
  const realKeys = ['page_views', 'product_clicks', 'deal_amount']
  const offsets = {}
  for (let j = 0; j < keys.length; j++) {
    offsets[keys[j]] = newVal.map(() => 1)
  }
  chartAnimOffsets.value = offsets
  // 逐个节点延迟升起
  for (let j = 0; j < keys.length; j++) {
    const k = keys[j]
    for (let i = 0; i < newVal.length; i++) {
      setTimeout(() => {
        chartAnimOffsets.value = {
          ...chartAnimOffsets.value,
          [k]: chartAnimOffsets.value[k].map((v, idx) => idx === i ? 0 : v)
        }
      }, 300 + i * 120 + j * 100)
    }
  }
}, { immediate: false, deep: false })

function getPointCY(chartKey, pt) {
  if (!animReady.value) return 100
  const idx = pt._index
  const offset = (chartAnimOffsets.value[chartKey] || [])[idx] || 0
  return 100 - (100 - pt.y) * (1 - offset)
}

// 每个图表的可视化数据
function makeChartData(key, realKey) {
  if (!trend.value.length) return { areaPath: '', linePath: '', points: [] }
  const w = 600; const h = 80; const pad = 20
  const n = trend.value.length
  const vals = trend.value.map(d => d[realKey])
  const max = Math.max(...vals, 1)

  function smoothPath() {
    let d = ''
    for (let i = 0; i < n; i++) {
      const x = pad + (i / (n - 1)) * (w - pad * 2)
      const y = h - pad - (vals[i] / max) * (h - pad * 2)
      if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`
      else {
        const prevX = pad + ((i - 1) / (n - 1)) * (w - pad * 2)
        const cpx1 = (prevX + x) / 2
        d += ` C ${cpx1.toFixed(1)} ${h - pad - (vals[i-1]/max)*(h-pad*2)} ${cpx1.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
      }
    }
    return d
  }
  const linePath = smoothPath()

  const lastX = pad + (n - 1) * (w - pad * 2) / (n - 1)
  const lastY = h - pad - (vals[n-1] / max) * (h - pad * 2)
  const areaPath = linePath + ` L ${lastX.toFixed(1)} ${h} L ${pad} ${h} Z`

  const points = vals.map((v, i) => ({
    x: pad + (i / (n - 1)) * (w - pad * 2),
    y: h - pad - (v / max) * (h - pad * 2),
    value: v,
    _index: i
  }))

  return { areaPath, linePath, points }
}

const chartData = computed(() => ({
  pv: makeChartData('pv', 'page_views'),
  clicks: makeChartData('clicks', 'product_clicks'),
  amount: makeChartData('amount', 'deal_amount')
}))

const charts = [
  { key: 'pv', label: '页面浏览量', color: '#52CDFF', unit: '次' },
  { key: 'clicks', label: '商品点击率', color: '#ffc107', unit: '次' },
  { key: 'amount', label: '成交金额', color: '#28a745', unit: '元' }
]

function gradId(key) { return 'grad-' + key }

const dateLabels = computed(() => {
  return trend.value.map(d => {
    const parts = d.date.split('-')
    return parts[1] + '/' + parts[2]
  })
})

function formatTooltipVal(key, val) {
  if (key === 'amount') return '¥' + Number(val).toFixed(2)
  return String(val) + ' 次'
}

function chartLabel(key) {
  const ch = charts.find(c => c.key === key)
  return ch ? ch.label : ''
}
</script>

<template>
  <div>
    <h5 class="fw-bold mb-4" style="color: #333;">主页仪表盘</h5>

    <div v-if="loading" class="text-center py-5 text-muted">
      <div class="spinner-border" style="color:#52CDFF;" role="status"></div>
      <p class="mt-2">正在加载数据...</p>
    </div>

    <template v-else>
      <!-- 概览卡片 -->
      <div class="row g-3 mb-4">
        <div v-for="card in displayCards" :key="card.title" class="col-6 col-lg-3">
          <div class="stat-card card border-0 shadow-sm" :class="{ 'stat-card-enter': animReady }" :style="{ animationDelay: '0ms' }">
            <div class="card-body p-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="stat-icon" :style="{ background: card.color }">{{ card.icon }}</span>
                <span v-if="card.change !== null" class="fw-semibold" :style="{ color: card.change >= 0 ? '#28a745' : '#ff4d4f', fontSize: '0.8rem' }">
                  {{ card.change >= 0 ? '↑' : '↓' }} {{ Math.abs(card.change) }}%
                </span>
              </div>
              <div class="stat-value">{{ card.format(card.animValue) }}</div>
              <div class="stat-title">{{ card.title }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 近7天趋势图 -->
      <div class="card border-0 shadow-sm">
        <div class="card-body p-4">
          <h6 class="fw-bold mb-3">📈 近7天数据趋势</h6>

          <div class="row g-3">
            <div v-for="chart in charts" :key="chart.key" class="col-lg-6">
              <div class="trend-card card border-0" style="background:#fafafa;overflow:visible;">
                <div class="card-body p-3" :class="{ 'trend-card-enter': animReady }">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span :style="{ width:'10px',height:'10px',borderRadius:'50%',background:chart.color,display:'inline-block' }"></span>
                    <span style="font-size:0.82rem;font-weight:600;color:#333;">{{ chart.label }}</span>
                    <span class="ms-auto" style="font-size:0.7rem;color:#999;">{{ chart.unit }}</span>
                  </div>
                  <svg width="100%" height="100" viewBox="0 0 600 100" preserveAspectRatio="none" style="display:block;overflow:visible;">
                    <defs>
                      <linearGradient v-for="c in charts" :key="c.key" :id="gradId(c.key)" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" :stop-color="c.color" stop-opacity="0.35" />
                        <stop offset="100%" :stop-color="c.color" stop-opacity="0.02" />
                      </linearGradient>
                    </defs>
                    <path
                      :d="chartData[chart.key].areaPath"
                      :fill="'url(#' + gradId(chart.key) + ')'"
                      stroke="none"
                    />
                    <path
                      :d="chartData[chart.key].linePath"
                      fill="none"
                      :stroke="chart.color"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <g v-for="(pt, i) in chartData[chart.key].points" :key="i">
                      <circle
                        :cx="pt.x" :cy="pt.y" r="10"
                        fill="transparent" stroke="none"
                        style="cursor:crosshair;"
                        @mouseenter="(e) => onPointEnter(chart.key, i, e.clientX, e.clientY, pt)"
                        @mouseleave="onPointLeave"
                      />
                      <circle
                        :cx="pt.x" :cy="pt.y" r="3.5"
                        :fill="chart.color" stroke="#fff" stroke-width="1.5"
                        style="pointer-events:none;"
                        :class="{ 'dot-rise': animReady }"
                        :style="{ animationDelay: (300 + i * 150) + 'ms' }"
                      />
                    </g>
                  </svg>
                  <div class="d-flex mt-2" style="padding-left:4px;padding-right:4px;">
                    <span
                      v-for="(label, i) in dateLabels" :key="i"
                      class="text-center text-muted"
                      :style="{ flex: 1, fontSize: '0.65rem' }"
                    >{{ label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 浮动 tooltip -->
      <Teleport to="body">
        <div
          v-if="showTooltip"
          class="chart-tooltip"
          :style="{
            position: 'fixed',
            left: tooltip.x + 'px',
            top: tooltip.y + 'px',
            transform: 'translate(-50%, -130%)',
            pointerEvents: 'auto'
          }"
          @mouseenter="onTooltipEnter"
          @mouseleave="onPointLeave"
        >
          <div class="tooltip-inner">
            <div style="font-size:0.7rem;color:rgba(255,255,255,0.6);margin-bottom:2px;">{{ trend[tooltip.index]?.date }}</div>
            <div style="font-weight:700;font-size:0.9rem;color:#fff;">
              {{ chartLabel(tooltip.chartKey) }}：{{ formatTooltipVal(tooltip.chartKey, tooltip.data?.value ?? 0) }}
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.stat-card { border-radius: 12px; transition: transform 0.2s; }
.stat-card:hover { transform: translateY(-2px); }
.stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; color: #fff;
}
.stat-value { font-size: 1.3rem; font-weight: 700; color: #333; line-height: 1.2; }
.stat-title { font-size: 0.75rem; color: #999; margin-top: 2px; }

/* 卡片渐入动画 */
.stat-card-enter {
  animation: fadeSlideUp 0.6s ease-out both;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 趋势图卡片渐入 */
.trend-card-enter {
  animation: fadeSlideUp 0.6s ease-out 0.2s both;
}

/* 圆点升起动画 */
.dot-rise {
  animation: dotRiseUp 0.5s ease-out both;
}

@keyframes dotRiseUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

<style>
.chart-tooltip {
  pointer-events: none;
  z-index: 9999;
  transition: opacity 0.15s;
}
.tooltip-inner {
  background: #333;
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
  text-align: center;
  white-space: nowrap;
}
</style>
