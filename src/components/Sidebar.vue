<script setup>
import { inject } from 'vue'
import { useRoute } from 'vue-router'

const collapsed = inject('collapsed')
const toggleSidebar = inject('toggleSidebar')
const route = useRoute()

function isActive(path) {
  if (path === '/admin') return route.path === '/admin'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside :class="['sidebar', { collapsed }]">
    <div class="sidebar-logo">
      <button class="hamburger-btn" @click="toggleSidebar" title="菜单">
        ☰
      </button>
      <router-link to="/admin" class="text-decoration-none text-primary fw-bold">
        EGO Manager
      </router-link>
    </div>
    <div class="sidebar-menu">
      <ul class="nav flex-column">
        <li class="nav-item">
          <router-link to="/admin" class="nav-link" :class="{ active: isActive('/admin') }">
            <span class="sidebar-icon">🏠</span>
            <span>主页</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/admin/products" class="nav-link" :class="{ active: isActive('/admin/products') }">
            <span class="sidebar-icon">📦</span>
            <span>商品</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/admin/users" class="nav-link" :class="{ active: isActive('/admin/users') }">
            <span class="sidebar-icon">👥</span>
            <span>用户</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/admin/orders" class="nav-link" :class="{ active: isActive('/admin/orders') }">
            <span class="sidebar-icon">📋</span>
            <span>订单</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/admin/returns" class="nav-link" :class="{ active: isActive('/admin/returns') }">
            <span class="sidebar-icon">🔔</span>
            <span>退货管理</span>
          </router-link>
        </li>
      </ul>
    </div>
  </aside>
</template>
