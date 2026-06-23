<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  imageSrc: { type: String, default: '' } // FileReader result or URL
})
const emit = defineEmits(['close', 'save'])

const toast = useToast()
const canvasRef = ref(null)
const wrapperRef = ref(null)

const cropSize = 300 // px — the crop square edge in display

// 原图在 canvas 上的绘制矩形
let img = null
let imgDrawX = 0, imgDrawY = 0, imgDrawW = 0, imgDrawH = 0

// 拖拽状态
let dragging = false
let dragStartX = 0
let dragStartY = 0
let dragStartDrawX = 0
let dragStartDrawY = 0

// 缩放 (wheel)
let scale = 1

onMounted(() => {
  if (props.imageSrc) loadImage(props.imageSrc)
})

// 监听 imageSrc 变化
import { watch } from 'vue'
watch(() => props.imageSrc, (val) => {
  if (val) loadImage(val)
})

function loadImage(src) {
  img = new Image()
  img.onload = () => {
    scale = 1
    fitImageToCrop()
    draw()
  }
  img.src = src
}

function fitImageToCrop() {
  if (!img) return
  const cw = cropSize, ch = cropSize
  const iw = img.width, ih = img.height
  // 按短边填充满 crop 区域
  const scaleToFit = Math.max(cw / iw, ch / ih)
  imgDrawW = iw * scaleToFit
  imgDrawH = ih * scaleToFit
  // 居中
  imgDrawX = (cw - imgDrawW) / 2
  imgDrawY = (ch - imgDrawH) / 2
  clampPosition()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const cw = cropSize, ch = cropSize
  canvas.width = cw
  canvas.height = ch
  ctx.clearRect(0, 0, cw, ch)
  if (!img) return
  // 遮罩
  ctx.save()
  // 绘制图片
  ctx.drawImage(img, imgDrawX, imgDrawY, imgDrawW, imgDrawH)
  // 半透明遮罩（四边）
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  // top
  ctx.fillRect(0, 0, cw, Math.max(0, imgDrawY))
  // bottom
  ctx.fillRect(0, Math.min(ch, imgDrawY + imgDrawH), cw, ch)
  // left of visible part
  ctx.fillRect(0, Math.max(0, imgDrawY), Math.max(0, imgDrawX), Math.min(ch, imgDrawY + imgDrawH) - Math.max(0, imgDrawY))
  // right of visible part
  const rightEdge = imgDrawX + imgDrawW
  ctx.fillRect(Math.min(cw, rightEdge), Math.max(0, imgDrawY), cw, ch)
  ctx.restore()
}

function clampPosition() {
  if (!img) return
  // 限制图片不能完全拖出 crop 区域
  const cw = cropSize, ch = cropSize
  const minX = cw - imgDrawW
  const maxX = 0
  const minY = ch - imgDrawH
  const maxY = 0
  imgDrawX = Math.min(maxX, Math.max(minX, imgDrawX))
  imgDrawY = Math.min(maxY, Math.max(minY, imgDrawY))
}

// 鼠标/触摸事件
function onPointerDown(e) {
  e.preventDefault()
  dragging = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragStartDrawX = imgDrawX
  dragStartDrawY = imgDrawY
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function onPointerMove(e) {
  if (!dragging) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  imgDrawX = dragStartDrawX + dx
  imgDrawY = dragStartDrawY + dy
  clampPosition()
  draw()
}

function onPointerUp() {
  dragging = false
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
}

function onWheel(e) {
  e.preventDefault()
  if (!img) return
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.min(3, Math.max(0.5, scale + delta))
  if (newScale === scale) return
  // 以鼠标位置为中心缩放
  const rect = wrapperRef.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const ratio = newScale / scale
  imgDrawX = mx - (mx - imgDrawX) * ratio
  imgDrawY = my - (my - imgDrawY) * ratio
  imgDrawW *= ratio
  imgDrawH *= ratio
  scale = newScale
  clampPosition()
  draw()
}

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
})

// 确认裁剪：将 300x300 画布可视区域映射回原图像素坐标
function onConfirm() {
  const outCanvas = document.createElement('canvas')
  const size = cropSize
  outCanvas.width = size
  outCanvas.height = size
  const ctx = outCanvas.getContext('2d')
  if (img) {
    // 画布坐标 → 原图像素坐标
    // canvas_x = imgDrawX + src_x * (imgDrawW / img.width)
    // 反推：src_x = (canvas_x - imgDrawX) * img.width / imgDrawW
    const scaleX = imgDrawW / img.width
    const scaleY = imgDrawH / img.height
    const sx = -imgDrawX / scaleX
    const sy = -imgDrawY / scaleY
    const sw = size / scaleX
    const sh = size / scaleY
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size)
  }
  const dataUrl = outCanvas.toDataURL('image/jpeg', 0.85)
  // 检查大小
  const byteSize = Math.round(dataUrl.length * 3 / 4)
  const kbSize = Math.round(byteSize / 1024)
  if (byteSize > 200 * 1024) {
    toast.warn(`图片过大 (${kbSize}KB)，请调整后重新裁剪（需 ≤200KB）`)
    return
  }
  emit('save', dataUrl)
}

function onCancel() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="crop-overlay" @click.self="onCancel">
    <div class="crop-dialog bg-white rounded-3 p-4">
      <h5 class="fw-bold mb-1 text-center">裁剪头像</h5>
      <p class="text-muted small text-center mb-3">拖拽或滚轮调整，裁剪为 1:1 比例</p>

      <div
        ref="wrapperRef"
        class="crop-wrapper"
        @pointerdown="onPointerDown"
        @wheel.prevent="onWheel"
      >
        <canvas ref="canvasRef" class="crop-canvas"></canvas>
      </div>

      <div class="d-flex justify-content-center gap-3 mt-3">
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" @click="onCancel">取消</button>
        <button class="btn btn-sm rounded-pill px-4" style="background:#52CDFF;color:#fff;" @click="onConfirm">确认裁剪</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.crop-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 10000;
  display: flex; align-items: center; justify-content: center;
}
.crop-dialog {
  width: 380px;
  box-shadow: 0 12px 50px rgba(0,0,0,0.3);
}
.crop-wrapper {
  width: 300px; height: 300px;
  margin: 0 auto;
  border-radius: 4px;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background: #333;
}
.crop-wrapper:active { cursor: grabbing; }
.crop-canvas {
  width: 300px; height: 300px;
  display: block;
}
</style>
