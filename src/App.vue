<script setup>
import { useToast } from '@/composables/useToast.js'

const { toasts, remove } = useToast()
</script>

<template>
  <router-view />

  <!-- 全局 Toast 容器 -->
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['toast-item', 'toast-' + t.type]"
        @click="remove(t.id)"
      >
        <span class="toast-icon">
          <template v-if="t.type === 'success'">✓</template>
          <template v-else-if="t.type === 'error'">✕</template>
          <template v-else-if="t.type === 'warn'">!</template>
          <template v-else>i</template>
        </span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style>
html, body {
  overflow-x: hidden;
}

/* Toast 容器：固定在右下角 */
.toast-container {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  pointer-events: none;
}

/* 单条 Toast */
.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 400px;
  padding: 12px 18px;
  border-radius: 8px;
  font-size: 0.88rem;
  color: #333;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  cursor: pointer;
  pointer-events: auto;
}

.toast-icon {
  flex-shrink: 0;
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700;
  color: #fff;
}

.toast-success .toast-icon { background: #52c41a; }
.toast-error   .toast-icon { background: #ff4d4f; }
.toast-warn    .toast-icon { background: #faad14; }
.toast-info    .toast-icon { background: #52CDFF; }

.toast-success { border-left: 4px solid #52c41a; }
.toast-error   { border-left: 4px solid #ff4d4f; }
.toast-warn    { border-left: 4px solid #faad14; }
.toast-info    { border-left: 4px solid #52CDFF; }

.toast-msg { flex: 1; line-height: 1.4; }

/* 动画 */
.toast-enter-active { transition: all 0.3s ease; }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateY(20px); }
.toast-leave-to   { opacity: 0; transform: translateY(-10px); }
</style>

