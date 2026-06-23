<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  banners: {
    type: Array,
    required: true,
    default: () => []
  },
  autoPlayInterval: {
    type: Number,
    default: 4000
  },
  height: {
    type: [Number, String],
    default: 480
  }
})

const emit = defineEmits(['slideChange', 'slideClick'])

const activeIndex = ref(0)
const isTransitioning = ref(false)
const touchStartX = ref(0)
const touchDeltaX = ref(0)
const isDragging = ref(false)
const containerRef = ref(null)
let autoplayTimer = null

// 可见卡片数量（奇数，确保左右对称）
const visibleCount = 5
const halfVisible = Math.floor(visibleCount / 2)

// 计算每张卡片的视觉属性
const cards = computed(() => {
  const n = props.banners.length
  if (n === 0) return []

  return props.banners.map((banner, i) => {
    const src = typeof banner === 'string' ? banner : banner.src
    const productId = typeof banner === 'string' ? null : banner.productId
    // 计算相对偏移（-2, -1, 0, 1, 2）
    let offset = ((i - activeIndex.value) % n + n) % n
    if (offset > Math.floor(n / 2)) offset -= n

    const absOffset = Math.abs(offset)
    const sign = offset === 0 ? 0 : offset > 0 ? 1 : -1

    // 可见范围
    const isVisible = absOffset <= halfVisible

    // 3D transform 参数 —— 加大间距
    const translateX = sign * absOffset * 80   // 水平偏移百分比（55→80）
    const translateZ = -absOffset * 260         // Z轴深度（180→260）
    const rotateY = sign * absOffset * 48       // Y轴旋转角度（35→48）
    const scale = 1 - absOffset * 0.16          // 缩放（0.13→0.16）
    const opacity = 1 - absOffset * 0.55        // 透明度（0.45→0.55）
    const zIndex = visibleCount - absOffset
    const brightness = 1 - absOffset * 0.25     // 亮度（0.2→0.25）

    return {
      src,
      productId,
      index: i,
      offset,
      isActive: offset === 0,
      isVisible,
      style: {
        transform: isVisible
          ? `translateX(${translateX}%) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`
          : 'translateX(0) translateZ(-1200px) rotateY(0) scale(0.2)',
        opacity: isVisible ? opacity : 0,
        zIndex,
        filter: `brightness(${brightness})`,
        pointerEvents: absOffset <= 1 ? 'auto' : 'none'
      }
    }
  })
})

// 导航
function goTo(index) {
  if (isTransitioning.value || index === activeIndex.value) return
  isTransitioning.value = true
  activeIndex.value = index
  emit('slideChange', index)
  setTimeout(() => { isTransitioning.value = false }, 550)
}

function goNext() {
  if (isTransitioning.value) return
  const n = props.banners.length
  goTo((activeIndex.value + 1) % n)
}

function goPrev() {
  if (isTransitioning.value) return
  const n = props.banners.length
  goTo((activeIndex.value - 1 + n) % n)
}

// 自动播放
function startAutoplay() {
  stopAutoplay()
  if (props.banners.length <= 1) return
  autoplayTimer = setInterval(goNext, props.autoPlayInterval)
}

function stopAutoplay() {
  if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null }
}

// 触摸支持
function onTouchStart(e) {
  stopAutoplay()
  touchStartX.value = e.touches[0].clientX
  touchDeltaX.value = 0
  isDragging.value = true
}

function onTouchMove(e) {
  if (!isDragging.value) return
  touchDeltaX.value = e.touches[0].clientX - touchStartX.value
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false

  const threshold = 60
  if (touchDeltaX.value > threshold) {
    goPrev()
  } else if (touchDeltaX.value < -threshold) {
    goNext()
  }
  touchDeltaX.value = 0
  startAutoplay()
}

// 键盘导航
function onKeyDown(e) {
  if (e.key === 'ArrowLeft') { goPrev(); stopAutoplay(); startAutoplay() }
  if (e.key === 'ArrowRight') { goNext(); stopAutoplay(); startAutoplay() }
}

onMounted(() => {
  startAutoplay()
  if (containerRef.value) {
    containerRef.value.addEventListener('keydown', onKeyDown)
  }
})

onBeforeUnmount(() => {
  stopAutoplay()
  if (containerRef.value) {
    containerRef.value.removeEventListener('keydown', onKeyDown)
  }
})

// 暴露方法给父组件
defineExpose({ goNext, goPrev, goTo, activeIndex })
</script>

<template>
  <div
    ref="containerRef"
    class="carousel-3d-coverflow"
    :style="{ height: typeof height === 'number' ? height + 'px' : height }"
    tabindex="0"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay()"
    @touchstart.passive="onTouchStart"
    @touchmove.passive="onTouchMove"
    @touchend="onTouchEnd"
  >
    <!-- 3D 舞台 -->
    <div class="carousel-stage" :style="{ perspective: '1200px' }">
      <!-- 左侧点击热区 -->
      <div class="click-zone click-zone-left" @click.stop="goPrev(); stopAutoplay(); startAutoplay()"></div>
      <!-- 右侧点击热区 -->
      <div class="click-zone click-zone-right" @click.stop="goNext(); stopAutoplay(); startAutoplay()"></div>

      <div
        v-for="card in cards"
        :key="card.index"
        class="carousel-card"
        :class="{
          'is-active': card.isActive,
          'is-adjacent': Math.abs(card.offset) === 1,
          'is-transitioning': isTransitioning
        }"
        :style="card.style"
        @click.stop="card.isActive && card.productId ? (emit('slideClick', {src: card.src, productId: card.productId})) : goTo(card.index)"
      >
        <div
          class="carousel-card-image"
          :style="{ backgroundImage: `url(${card.src})` }"
        >
          <!-- 光泽覆盖层 -->
          <div class="carousel-card-shine"></div>
        </div>

      </div>
    </div>

    <!-- 底部指示器 -->
    <div v-if="banners.length > 1" class="carousel-indicators">
      <button
        v-for="(_, i) in banners"
        :key="i"
        class="indicator-dot"
        :class="{ active: i === activeIndex }"
        @click="goTo(i)"
        :aria-label="`切换到第 ${i + 1} 张`"
      >
        <span class="indicator-dot-inner"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.carousel-3d-coverflow {
  position: relative;
  width: 100%;
  overflow: hidden;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}

.carousel-3d-coverflow:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(82, 205, 255, 0.6);
}

/* ===== 3D 舞台 ===== */
.carousel-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

/* ===== 左右点击热区 ===== */
.click-zone {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 18%;
  height: 75%;
  z-index: 20;
  cursor: pointer;
}
.click-zone-left  { left: 0; }
.click-zone-right { right: 0; }

/* ===== 卡片 ===== */
.carousel-card {
  position: absolute;
  width: 55%;
  max-width: 650px;
  aspect-ratio: 16 / 9;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.45s ease,
              filter 0.45s ease;
  will-change: transform, opacity;
  cursor: pointer;
  border-radius: 18px;
}

/* 活动卡片不展示手型 */
.carousel-card.is-active {
  cursor: pointer;
}

.carousel-card.is-transitioning {
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.45s ease,
              filter 0.45s ease;
}

/* 悬停提示：侧面卡片可点击 */
.carousel-card:not(.is-active):hover .carousel-card-image {
  filter: brightness(1.1);
}

.carousel-card:not(.is-active):active .carousel-card-image {
  transform: scale(0.97);
}

.carousel-card-image {
  width: 100%;
  height: 100%;
  border-radius: 18px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  overflow: hidden;
  transition: transform 0.35s ease;
}

.carousel-card.is-active:hover .carousel-card-image {
  transform: scale(1.04);
}

.carousel-card.is-adjacent .carousel-card-image {
  /* 无阴影 */
}

/* 光泽覆盖层 */
.carousel-card-shine {
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.06) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.02) 100%
  );
  pointer-events: none;
}

.carousel-card.is-active .carousel-card-shine {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 45%,
    rgba(255, 255, 255, 0.03) 100%
  );
}

/* ===== 指示器 ===== */
.carousel-indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 10;
}

.indicator-dot {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.25s ease;
}

.indicator-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.indicator-dot:hover .indicator-dot-inner {
  background: rgba(0, 0, 0, 0.4);
  transform: scale(1.3);
}

.indicator-dot.active .indicator-dot-inner {
  width: 10px;
  height: 10px;
  background: #52CDFF;
  box-shadow: 0 0 10px rgba(82, 205, 255, 0.5);
  transform: scale(1.2);
}

/* ===== 响应式 ===== */
@media (max-width: 992px) {
  .carousel-card {
    width: 65%;
    max-width: 550px;
  }

  .click-zone {
    width: 15%;
  }
}

@media (max-width: 768px) {
  .carousel-3d-coverflow {
    height: 260px !important;
  }

  .carousel-card {
    width: 75%;
    max-width: 400px;
  }

  .click-zone {
    width: 14%;
  }

  .carousel-indicators {
    bottom: 8px;
    gap: 6px;
  }

  .indicator-dot {
    width: 22px;
    height: 22px;
  }

  .indicator-dot-inner {
    width: 6px;
    height: 6px;
  }
}

@media (max-width: 480px) {
  .carousel-3d-coverflow {
    height: 200px !important;
  }

  .carousel-card {
    width: 82%;
  }
}
</style>
