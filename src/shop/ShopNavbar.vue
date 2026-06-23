<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { logout as apiLogout } from '@/api/shop.js'
import MessagePanel from '@/shop/components/MessagePanel.vue'

const router = useRouter()
const route = useRoute()

// 使用 layout 层共享的购物车状态
const cartCount = inject('cartCount')
const toggleCart = inject('toggleCart')

const navLinks = [
  { path: '/', label: '主页' },
  { path: '/category', label: '分类' },
  { path: '/hot', label: '热销榜' },
  { path: '/deals', label: '优惠专区' }
]

// 用户登录状态
const userInfo = ref(null)

function readUserFromStorage() {
  const stored = localStorage.getItem('ego_user')
  if (stored) {
    try { userInfo.value = JSON.parse(stored) } catch { userInfo.value = null }
  } else {
    userInfo.value = null
  }
}

onMounted(() => { readUserFromStorage() })
watch(() => route.fullPath, () => { readUserFromStorage() })

const hideFloatingCart = computed(() => {
  return route.path === '/profile' || route.path === '/login' || route.path === '/orders'
})

const avatarUrl = computed(() => {
  const avatar = userInfo.value?.avatar
  if (!avatar) return ''
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar
  return avatar
})

async function logout() {
  const uid = userInfo.value?.uid
  localStorage.removeItem('ego_user')
  localStorage.removeItem('ego_token')
  localStorage.removeItem('ego_cookie')
  userInfo.value = null
  if (uid) { try { await apiLogout(uid) } catch {} }
  router.push('/')
}

// 跳转后台管理
function goAdmin() {
  window.open('/admin', '_blank')
}

// 消息面板
const msgPanelVisible = ref(false)
const msgPanelRef = ref(null)

function toggleMsgPanel() {
  msgPanelVisible.value = !msgPanelVisible.value
}

// 返回顶部
const showBackTop = ref(false)
function onPageScroll() {
  showBackTop.value = window.scrollY > 400
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => window.addEventListener('scroll', onPageScroll))
onBeforeUnmount(() => window.removeEventListener('scroll', onPageScroll))
</script>

<template>
  <nav class="shop-navbar" style="border-radius: 0; background: #F4F5F7;">
    <div class="px-4 py-2 d-flex align-items-center gap-3" style="height: 64px;">
      <router-link to="/" class="shop-logo text-decoration-none fw-bold fs-5" style="color: #52CDFF;">
        EGO Mall
      </router-link>

      <div class="d-flex align-items-center gap-1 ms-3">
        <router-link v-for="link in navLinks" :key="link.path" :to="link.path"
          class="shop-nav-link text-decoration-none px-3 py-1 rounded-pill"
          style="color: #555; font-size: 0.9rem; transition: all 0.2s;" exact-active-class="shop-nav-active">{{ link.label
          }}</router-link>
      </div>

      <div class="flex-grow-1"></div>

      <!-- 消息图标（已登录时） -->
      <button v-if="userInfo" class="btn btn-sm border-0 position-relative"
        style="background:transparent;font-size:1.2rem;"
        @click="toggleMsgPanel" title="消息">
        📨
      </button>

      <!-- 用户区域 -->
      <div class="ms-2 d-flex align-items-center">
        <template v-if="userInfo">
          <div class="dropdown">
            <button class="btn btn-sm d-flex align-items-center border-0 p-0"
              style="background: transparent; color: #333;" data-bs-toggle="dropdown"
              aria-expanded="false">
              <div v-if="userInfo.avatar" class="rounded-circle overflow-hidden"
                style="width: 32px; height: 32px; border: 2px solid #52CDFF;">
                <img :src="avatarUrl" style="width:100%;height:100%;object-fit:cover;" />
              </div>
              <div v-else class="rounded-circle d-flex align-items-center justify-content-center"
                style="width: 32px; height: 32px; background: #52CDFF; color: #fff; font-size: 0.85rem; font-weight: 600;">
                {{ (userInfo.username || 'U').charAt(0).toUpperCase() }}
              </div>
            </button>
            <ul class="dropdown-menu dropdown-menu-end user-dropdown" style="font-size: 0.9rem; padding:0; overflow: hidden; border-radius: 10px; margin-top: 0;">
              <li class="dropdown-header" style="background: #52CDFF; color: #fff; font-weight: 600; padding: 10px 16px; white-space: normal;">
                用户：{{ userInfo.username }}
              </li>
              <li><router-link to="/profile" class="dropdown-item">👤 个人中心</router-link></li>
              <li><router-link to="/orders" class="dropdown-item">📋 我的订单</router-link></li>
              <li><hr class="dropdown-divider" /></li>
              <li><a class="dropdown-item" href="#" @click.prevent="goAdmin">🔐 后台管理</a></li>
              <li><a class="dropdown-item" href="#" @click.prevent="logout">🚪 退出登录</a></li>
            </ul>
          </div>
        </template>
        <router-link v-else to="/login"
          class="rounded-circle d-flex align-items-center justify-content-center text-decoration-none"
          style="width: 32px; height: 32px; background: #52CDFF; color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer;"
          title="登录">👤</router-link>
      </div>
    </div>
  </nav>

  <!-- 消息面板 -->
  <MessagePanel ref="msgPanelRef" :open="msgPanelVisible" @close="msgPanelVisible = false" />

  <!-- 右下角悬浮购物车按钮 -->
  <button v-if="userInfo && !hideFloatingCart" class="floating-cart-btn" @click="toggleCart" title="购物车">
    🛍️
    <span v-if="cartCount > 0" class="floating-cart-badge">{{ cartCount }}</span>
  </button>

  <!-- 返回顶部按钮 -->
  <button v-if="showBackTop" class="floating-top-btn" @click="scrollToTop" title="返回顶部">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
  </button>
</template>

<style scoped>
.shop-navbar {
  position: sticky;
  top: 0;
  z-index: 1020;
}

.shop-nav-link:hover {
  background: #e0e0e0;
  color: #333 !important;
}

.shop-nav-active {
  background: #fff;
  color: #52CDFF !important;
  font-weight: 600;
}

/* 右下角悬浮购物车按钮 */
.floating-cart-btn {
  position: fixed;
  bottom: 32px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #52CDFF;
  color: #fff;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(82,205,255,0.4);
  z-index: 1040;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
}
.floating-cart-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 8px 28px rgba(82,205,255,0.55);
}
.floating-cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #ff4d4f;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid #fff;
  line-height: 1;
}

/* 右下角返回顶部 */
.floating-top-btn {
  position: fixed;
  bottom: 100px;
  right: 32px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(0,0,0,0.35);
  color: #fff;
  border: none;
  font-size: 0.75rem;
  cursor: pointer;
  z-index: 1040;
  transition: background 0.2s, transform 0.2s;
}
.floating-top-btn:hover {
  background: rgba(0,0,0,0.55);
  transform: scale(1.08);
}
</style>
