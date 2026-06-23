<script setup>
import { inject, computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const collapsed = inject('collapsed')
const toggleSidebar = inject('toggleSidebar')
const router = useRouter()

const adminName = ref('管理员')

onMounted(() => {
  // 读取管理员登录信息
  const stored = localStorage.getItem('ego_admin_user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      adminName.value = user.username || '管理员'
    } catch {}
  }
})

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

const greetingText = computed(() => greeting() + '，' + adminName.value)

function toShop() {
  router.push('/')
}
</script>

<template>
  <nav class="top-navbar">
    <button v-if="collapsed" class="hamburger-btn" @click="toggleSidebar" title="展开菜单">
      ☰
    </button>

    <span class="navbar-greeting">
      <span
        v-for="(ch, i) in greetingText.split('')"
        :key="i"
        class="greeting-char"
        :style="{ animationDelay: (i * 0.06) + 's' }"
      >{{ ch === ' ' ? ' ' : ch }}</span>
    </span>

    <div class="navbar-spacer"></div>

    <button class="btn btn-sm border-0 text-muted me-2" style="font-size:0.85rem;" @click="toShop" title="返回前台">
      🏠 商城
    </button>

    <div class="navbar-account" title="账户">
      <div class="navbar-avatar">{{ adminName.charAt(0).toUpperCase() }}</div>
      <span class="navbar-admin-name">{{ adminName }}</span>
    </div>
  </nav>
</template>
