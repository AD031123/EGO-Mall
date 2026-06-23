<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
function goBack() {
  router.replace('/')
}
</script>

<template>
  <div class="error-page">
    <div class="error-card">
      <div class="error-icon">🚫</div>
      <h1 class="error-code">403</h1>
      <p class="error-title">访问被拒绝</p>
      <p class="error-desc">你没有权限访问此页面，如需帮助请联系管理员。</p>
      <button class="btn btn-primary rounded-pill px-4" @click="goBack">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%);
}
.error-card {
  text-align: center;
  padding: 48px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  max-width: 440px;
}
.error-icon {
  font-size: 64px;
  margin-bottom: 16px;
}
.error-code {
  font-size: 72px;
  font-weight: 800;
  color: #ff4d4f;
  margin-bottom: 4px;
  line-height: 1;
}
.error-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.error-desc {
  font-size: 14px;
  color: #888;
  margin-bottom: 32px;
  line-height: 1.6;
}
</style>
