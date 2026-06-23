<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast.js'
import { getCart, updateCartItem, removeCartItem, clearCart, getAddresses, createAddress, updateAddress, placeOrder } from '@/api/shop.js'
import AddressModal from './AddressModal.vue'

const props = defineProps({ visible: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'countChange'])

const toast = useToast()
const router = useRouter()
const items = ref([])
const loading = ref(false)
const addresses = ref([])
const selectedAddressId = ref(null)
const placingOrder = ref(false)
const addrWarning = ref(false)

// 地址弹窗
const addrModalVisible = ref(false)
const editingAddress = ref(null)

watch(() => props.visible, async (v) => {
  if (v) {
    await loadCart()
    await loadAddresses()
  }
})

async function loadCart() {
  try {
    const r = await getCart()
    if (r.code === 0) {
      items.value = r.data
      emit('countChange', items.value.length)
    } else if (r.code === 1 && r.message?.includes('登录')) {
      toast.warn('请先登录后再查看购物车')
    }
  } catch { items.value = [] }
}

async function loadAddresses() {
  try {
    const r = await getAddresses()
    if (r.code === 0) {
      addresses.value = r.data
      // 不自动选中，让用户手动选择
    }
  } catch { addresses.value = [] }
}

const totalAmount = computed(() => {
  return items.value.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0)
})

async function onChangeQty(item, delta) {
  const newQty = Math.max(1, item.quantity + delta)
  if (newQty === item.quantity) return
  try {
    await updateCartItem(item.id, { quantity: newQty })
    item.quantity = newQty
  } catch { toast.error('更新失败') }
}

async function onRemove(item) {
  try {
    await removeCartItem(item.id)
    items.value = items.value.filter(i => i.id !== item.id)
    emit('countChange', items.value.length)
    toast.success('已移除')
  } catch { toast.error('移除失败') }
}

// 送货地址
function onAddAddress() {
  editingAddress.value = null
  addrModalVisible.value = true
}

function onEditAddress(addr) {
  editingAddress.value = addr
  addrModalVisible.value = true
}

async function onSaveAddress(data) {
  try {
    if (editingAddress.value) {
      await updateAddress(editingAddress.value.id, data)
    } else {
      await createAddress(data)
    }
    addrModalVisible.value = false
    await loadAddresses()
    toast.success('地址已保存')
  } catch { toast.error('保存地址失败') }
}

// 立即下单
async function onPlaceOrder() {
  if (!items.value.length) { toast.warn('购物车为空'); return }
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { toast.warn('请先登录'); return }
  const user = JSON.parse(userStr)

  // 获取选中地址快照
  const addr = addresses.value.find(a => a.id === selectedAddressId.value)
  if (!addr) {
    // 面板内提示
    addrWarning.value = true
    return
  }

  placingOrder.value = true
  try {
    const orderItems = items.value.map(i => ({
      product_id: i.product_id,
      product_name: i.product_name,
      price: i.price,
      quantity: i.quantity,
      sku_name: i.sku_name || null
    }))
    const r = await placeOrder({
      user_id: user.id,
      username: user.username,
      items: orderItems,
      address_id: addr.id,
      address_snapshot: JSON.stringify({
        receiver_name: addr.receiver_name || user.username,
        phone: addr.phone,
        province: addr.province,
        city: addr.city,
        district: addr.district,
        detail: addr.detail
      })
    })
    if (r.code === 0) {
      await clearCart()
      items.value = []
      emit('countChange', 0)
      toast.success('下单成功！')
      emit('close')
      router.push('/orders')
    } else {
      toast.error(r.message || '下单失败')
    }
  } catch { toast.error('下单失败，请重试') }
  finally { placingOrder.value = false }
}
</script>

<template>
  <!-- 覆盖层 -->
  <div v-if="visible" class="cart-overlay" @click.self="emit('close')" />

  <!-- 面板 -->
  <div class="cart-panel" :class="{ 'cart-panel-visible': visible }">
    <div class="d-flex align-items-center justify-content-between px-3 py-3" style="border-bottom:1px solid #eee;">
      <h6 class="fw-bold mb-0">🛍️ 购物车 ({{ items.length }})</h6>
      <button class="btn btn-sm border-0" style="font-size:1.3rem;color:#999;line-height:1;" @click="emit('close')">✕</button>
    </div>

    <!-- 空态 -->
    <div v-if="!items.length" class="text-center text-muted py-5">
      <div style="font-size:3rem;">🛍️</div>
      <p class="mt-2">购物车是空的</p>
      <button class="btn btn-sm rounded-pill px-4" style="background:#52CDFF;color:#fff;" @click="emit('close')">去逛逛</button>
    </div>

    <!-- 商品列表 -->
    <div v-else class="cart-items-area">
      <div v-for="item in items" :key="item.id" class="d-flex gap-3 px-3 py-2" style="border-bottom:1px solid #f5f5f5;">
        <div class="rounded overflow-hidden flex-shrink-0" style="width:64px;height:64px;background:#f0f0f0;">
          <img v-if="item.main_image" :src="item.main_image" style="width:100%;height:100%;object-fit:cover;" />
          <div v-else class="d-flex align-items-center justify-content-center text-muted" style="width:100%;height:100%;font-size:1.5rem;">📦</div>
        </div>
        <div class="flex-grow-1 min-w-0">
          <div class="fw-medium text-truncate" style="font-size:0.85rem;">{{ item.product_name }}</div>
          <div v-if="item.sku_name" class="text-muted" style="font-size:0.72rem;">{{ item.sku_name }}</div>
          <div class="mt-1 fw-bold" style="color:#ff4d4f;font-size:0.85rem;">¥{{ Number(item.price).toFixed(2) }}</div>
          <div class="d-flex align-items-center justify-content-between mt-1">
            <div class="d-flex align-items-center border rounded" style="overflow:hidden;">
              <button class="btn btn-sm border-0 rounded-0" style="font-size:0.8rem;padding:0 8px;line-height:1.6;" @click="onChangeQty(item, -1)">−</button>
              <span class="px-2" style="font-size:0.85rem;min-width:28px;text-align:center;">{{ item.quantity }}</span>
              <button class="btn btn-sm border-0 rounded-0" style="font-size:0.8rem;padding:0 8px;line-height:1.6;" @click="onChangeQty(item, 1)">+</button>
            </div>
            <div style="font-size:0.78rem;color:#999;">小计 ¥{{ (Number(item.price) * item.quantity).toFixed(2) }}</div>
          </div>
        </div>
        <button class="btn btn-sm border-0 align-self-start" style="color:#ccc;font-size:0.9rem;padding:0;" @click="onRemove(item)" title="删除">🗑</button>
      </div>
    </div>

    <!-- 底部 -->
    <div v-if="items.length" class="cart-footer px-3 py-3" style="border-top:1px solid #eee;">
      <!-- 地址选择 -->
      <div class="mb-2">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <label class="small fw-semibold" style="color:#666;">送货地址</label>
          <button class="btn btn-sm p-0" style="font-size:0.75rem;color:#52CDFF;" @click="onAddAddress">+ 新增地址</button>
        </div>
        <div v-if="addresses.length === 0" class="d-flex align-items-center justify-content-between bg-light rounded-3 p-2">
          <span class="text-muted small">暂未设置地址</span>
          <button class="btn btn-sm rounded-pill px-3" style="background:#ff4d4f;color:#fff;font-size:0.72rem;" @click="onAddAddress">+ 新增</button>
        </div>
        <select v-else v-model="selectedAddressId" class="form-select form-select-sm">
          <option :value="null" disabled>— 请选择收货地址 —</option>
          <option v-for="addr in addresses" :key="addr.id" :value="addr.id">
            {{ [addr.province, addr.city, addr.district, addr.detail].join(' ') }} ({{ addr.phone }})
          </option>
        </select>
      </div>

      <!-- 合计与下单 -->
      <div v-if="addrWarning" class="alert alert-warning py-2 px-3 mb-2 rounded-3" style="font-size:0.78rem;">
        ⚠️ 请选择收货地址
      </div>
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="fw-bold" style="font-size:0.9rem;">合计：<span style="color:#ff4d4f;font-size:1.15rem;">¥{{ totalAmount.toFixed(2) }}</span></span>
      </div>
      <button class="btn w-100 rounded-pill fw-bold" style="background:#ff4d4f;color:#fff;" :disabled="placingOrder" @click="onPlaceOrder">
        {{ placingOrder ? '下单中...' : '立即下单' }}
      </button>
    </div>

    <!-- 地址弹窗 -->
    <AddressModal :visible="addrModalVisible" :address="editingAddress" @close="addrModalVisible = false" @save="onSaveAddress" />
  </div>
</template>

<style scoped>
.cart-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 10500;
}
.cart-panel {
  position: fixed; top: 0; right: -400px; width: 400px; height: 100vh;
  background: #fff; z-index: 10501;
  display: flex; flex-direction: column;
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -4px 0 30px rgba(0,0,0,0.15);
}
.cart-panel-visible { right: 0; }
.cart-items-area {
  flex: 1; overflow-y: auto;
}
.cart-footer {
  background: #fafafa;
}
@media (max-width: 440px) {
  .cart-panel { width: 100vw; right: -100vw; }
}
</style>
