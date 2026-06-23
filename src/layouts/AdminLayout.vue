<script setup>
import { ref, provide, computed } from 'vue'
import Navbar from '@/components/Navbar.vue'
import Sidebar from '@/components/Sidebar.vue'

const collapsed = ref(false)

provide('collapsed', collapsed)
provide('toggleSidebar', () => {
  collapsed.value = !collapsed.value
})
</script>

<template>
  <div class="admin-layout">
    <Sidebar />
    <div class="main-area">
      <Navbar />
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </div>
</template>
