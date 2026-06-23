<script setup>
import { ref, provide } from 'vue'
import ShopNavbar from '@/shop/ShopNavbar.vue'
import CartPanel from './components/CartPanel.vue'
import { getCart } from '@/api/shop.js'

// 购物车全局共享状态
const cartPanelVisible = ref(false)
const cartCount = ref(0)

async function refreshCartCount() {
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { cartCount.value = 0; return }
  try {
    const r = await getCart()
    if (r.code === 0) cartCount.value = r.data.length
    else cartCount.value = 0
  } catch { cartCount.value = 0 }
}

function onCartCountChange(n) { cartCount.value = n }

function openCart() {
  cartPanelVisible.value = true
  refreshCartCount()
}

function toggleCart() {
  cartPanelVisible.value = !cartPanelVisible.value
  if (cartPanelVisible.value) refreshCartCount()
}

provide('openCart', openCart)
provide('refreshCartCount', refreshCartCount)
provide('cartCount', cartCount)

// 暴露给 ShopNavbar 通过 inject 使用
provide('cartPanelVisible', cartPanelVisible)
provide('toggleCart', toggleCart)
</script>

<template>
  <div class="shop-layout">
    <ShopNavbar />
    <div class="shop-main">
      <router-view />
    </div>
    <!-- 购物车面板（提升到 layout 层，可被任意子页面打开） -->
    <CartPanel :visible="cartPanelVisible" @close="cartPanelVisible = false" @countChange="onCartCountChange" />
  </div>
</template>
