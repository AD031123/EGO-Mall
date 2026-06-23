<script setup>
import { ref, watch } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { claimCoupon } from '@/api/shop.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  coupons: { type: Array, default: () => [] },
  claimedIds: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'claimed'])

const toast = useToast()
const claiming = ref(false)

async function onClaim(coupon) {
  if (claiming.value) return
  claiming.value = true
  try {
    const r = await claimCoupon(coupon.id)
    if (r.code === 0) {
      toast.success('领取成功！')
      emit('claimed', coupon.id)
    } else {
      toast.error(r.message || '领取失败')
    }
  } catch { toast.error('领取失败，请重试') }
  finally { claiming.value = false }
}

function isClaimed(id) {
  return props.claimedIds.includes(id)
}
</script>

<template>
  <div v-if="visible" class="coupon-overlay" @click.self="emit('close')" />
  <div class="coupon-panel" :class="{ 'coupon-panel-visible': visible }">
    <div class="d-flex align-items-center justify-content-between px-3 py-3" style="border-bottom:1px solid #eee;">
      <h6 class="fw-bold mb-0">🎫 领优惠券</h6>
      <button class="btn btn-sm border-0" style="font-size:1.3rem;color:#999;line-height:1;" @click="emit('close')">✕</button>
    </div>

    <div class="coupon-items-area">
      <div v-if="!coupons.length" class="text-center text-muted py-5">
        <div style="font-size:2rem;">🎫</div>
        <p class="mt-2">暂无可用优惠券</p>
      </div>
      <!-- 电影票风格优惠券 -->
      <div v-for="coupon in coupons" :key="coupon.id" class="coupon-ticket mx-3 mt-3">
        <div class="ticket-body">
          <div class="ticket-left">
            <div class="ticket-price">
              <span style="font-size:0.7rem;font-weight:400;">¥</span>
              <span style="font-size:1.4rem;font-weight:700;">{{ Number(coupon.discount) }}</span>
            </div>
            <div class="ticket-condition">满{{ Number(coupon.min_amount) }}可用</div>
          </div>
          <div class="ticket-divider"></div>
          <div class="ticket-right">
            <div class="ticket-name">{{ coupon.name }}</div>
            <button v-if="isClaimed(coupon.id)" class="btn btn-sm btn-secondary rounded-pill px-3" disabled style="font-size:0.75rem;">
              已领取
            </button>
            <button v-else class="btn btn-sm btn-danger rounded-pill px-3" style="font-size:0.75rem;font-weight:600;" @click="onClaim(coupon)">
              立即领取
            </button>
          </div>
        </div>
        <!-- 左侧半圆切口 -->
        <div class="ticket-notch ticket-notch-top"></div>
        <div class="ticket-notch ticket-notch-bottom"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.coupon-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10500;
}
.coupon-panel {
  position: fixed; top: 0; right: -400px; width: 400px; height: 100vh;
  background: #fff; z-index: 10501;
  display: flex; flex-direction: column;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -4px 0 30px rgba(0,0,0,0.15);
}
.coupon-panel-visible { right: 0; }
.coupon-items-area {
  flex: 1; overflow-y: auto; padding-bottom: 20px;
}

/* 电影票风格 */
.coupon-ticket {
  position: relative;
  background: #fff;
  border-radius: 8px;
  overflow: visible;
}
.ticket-body {
  display: flex;
  border: 2px solid #ff4d4f;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.ticket-left {
  width: 80px;
  background: #ff4d4f;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  flex-shrink: 0;
}
.ticket-price { text-align: center; line-height: 1.2; }
.ticket-condition { font-size: 0.65rem; opacity: 0.85; margin-top: 2px; white-space: nowrap; }
.ticket-divider {
  width: 0;
  border-left: 1px dashed #ff4d4f;
  margin: 4px 0;
}
.ticket-right {
  flex: 1;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}
.ticket-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #333;
}
/* 半圆切口 */
.ticket-notch {
  position: absolute;
  left: 78px;
  width: 14px;
  height: 14px;
  background: #f4f5f7;
  border-radius: 50%;
  border: 2px solid #ff4d4f;
  border-top-color: transparent;
  border-right-color: transparent;
}
.ticket-notch-top {
  top: -9px;
  transform: rotate(45deg);
}
.ticket-notch-bottom {
  bottom: -9px;
  transform: rotate(225deg);
}

@media (max-width: 440px) {
  .coupon-panel { width: 100vw; right: -100vw; }
}
</style>
