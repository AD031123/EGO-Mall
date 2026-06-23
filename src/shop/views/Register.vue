<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/shop.js'

const router = useRouter()
const form = ref({
  username: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
})
const loading = ref(false)
const errorMsg = ref('')

async function handleRegister() {
  errorMsg.value = ''
  if (!form.value.username.trim()) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!form.value.email.trim() && !form.value.phone.trim()) {
    errorMsg.value = '邮箱和手机号至少填写一项'
    return
  }
  if (!form.value.password) {
    errorMsg.value = '请输入密码'
    return
  }
  if (form.value.password.length < 6) {
    errorMsg.value = '密码长度不能少于6位'
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    const res = await register({
      username: form.value.username.trim(),
      email: form.value.email.trim() || null,
      phone: form.value.phone.trim() || null,
      password: form.value.password
    })
    if (res.code === 0) {
      localStorage.setItem('ego_token', res.data.token)
      localStorage.setItem('ego_cookie', res.data.cookie_token || '')
      localStorage.setItem('ego_user', JSON.stringify(res.data.user))
      router.push('/')
    } else {
      errorMsg.value = res.message || '注册失败'
    }
  } catch (e) {
    errorMsg.value = e.message || '网络错误，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height: 70vh;">
    <div class="card border-0 shadow-sm" style="width: 400px;">
      <div class="card-body p-5">
        <h4 class="fw-bold text-center mb-4" style="color: #333;">注册</h4>

        <!-- 错误提示 -->
        <div v-if="errorMsg" class="alert alert-danger py-2 small mb-3" role="alert">
          {{ errorMsg }}
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">用户名 <span style="color: #ff4d4f;">*</span></label>
          <input
            v-model="form.username"
            type="text"
            class="form-control"
            placeholder="请输入用户名"
          />
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="form-control"
            placeholder="请输入邮箱"
          />
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">手机号</label>
          <input
            v-model="form.phone"
            type="tel"
            class="form-control"
            placeholder="请输入手机号"
          />
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">密码 <span style="color: #ff4d4f;">*</span></label>
          <input
            v-model="form.password"
            type="password"
            class="form-control"
            placeholder="至少6位密码"
          />
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">确认密码 <span style="color: #ff4d4f;">*</span></label>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="form-control"
            placeholder="再次输入密码"
          />
        </div>

        <button
          class="btn w-100 mb-3"
          style="background: #52CDFF; color: #fff; font-weight: 600;"
          :disabled="loading"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : '注册' }}
        </button>

        <p class="text-center small mb-0" style="color: #999;">
          已有账号？<router-link to="/login" style="color: #52CDFF;">去登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>
