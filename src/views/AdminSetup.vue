<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { checkAdminSetup, createAdminAccount, adminLogin } from '@/api/shop.js'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()
const router = useRouter()

const loading = ref(true)
const needsSetup = ref(false)

const form = ref({ username: '', password: '', confirmPassword: '' })
const submitting = ref(false)
const loggingIn = ref(false)
const loginForm = ref({ username: '', password: '' })

// 存储管理员信息到独立的 ego_admin_* keys
function saveAdminAuth(data) {
  localStorage.setItem('ego_admin_token', data.token)
  localStorage.setItem('ego_admin_cookie', data.cookie_token)
  localStorage.setItem('ego_admin_user', JSON.stringify(data.user))
  localStorage.setItem('ego_admin_expiry', String(Date.now() + 7 * 24 * 3600 * 1000))
}

onMounted(async () => {
  // 检查是否已有管理员
  try {
    const r = await checkAdminSetup()
    if (r.code === 0) {
      needsSetup.value = !r.data.hasAdmin
    }
  } catch { needsSetup.value = true }
  finally { loading.value = false }
})

async function doSetup() {
  const f = form.value
  if (!f.username.trim()) { toast.warn('请输入管理员用户名'); return }
  if (f.password.length < 6) { toast.warn('密码至少6位'); return }
  if (f.password !== f.confirmPassword) { toast.warn('两次密码不一致'); return }

  submitting.value = true
  try {
    const r = await createAdminAccount({ username: f.username.trim(), password: f.password })
    if (r.code === 0) {
      saveAdminAuth(r.data)
      toast.success('管理员账号创建成功')
      needsSetup.value = false
      router.replace('/admin')
    } else {
      toast.error(r.message || '创建失败')
    }
  } catch (e) { toast.error(e.message || '创建失败，请重试') }
  finally { submitting.value = false }
}

async function doLogin() {
  const f = loginForm.value
  if (!f.username.trim() || !f.password) { toast.warn('请填写用户名和密码'); return }

  loggingIn.value = true
  try {
    const r = await adminLogin({ username: f.username.trim(), password: f.password })
    if (r.code === 0) {
      saveAdminAuth(r.data)
      toast.success('登录成功')
      router.replace('/admin')
    } else {
      toast.error(r.message || '登录失败')
    }
  } catch (e) { toast.error(e.message || '登录失败，请重试') }
  finally { loggingIn.value = false }
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height:100vh;background:#f4f5f7;">
    <div class="card border-0 shadow-sm p-5" style="width:420px;border-radius:14px;">
      <!-- 初始化引导 -->
      <template v-if="loading">
        <div class="text-center py-4">
          <div class="spinner-border" style="color:#52CDFF;"></div>
          <p class="mt-3 text-muted">检查系统状态...</p>
        </div>
      </template>

      <!-- 首次创建管理员 -->
      <template v-else-if="needsSetup">
        <h4 class="fw-bold mb-1 text-center">🎉 欢迎使用 EGO Mall</h4>
        <p class="text-muted small mb-4 text-center">首次使用，请创建管理员账号</p>

        <div class="mb-3">
          <label class="form-label small fw-semibold">管理员用户名</label>
          <input v-model="form.username" class="form-control" placeholder="请输入管理员用户名" />
        </div>
        <div class="mb-3">
          <label class="form-label small fw-semibold">密码</label>
          <input v-model="form.password" type="password" class="form-control" placeholder="至少6位密码" />
        </div>
        <div class="mb-4">
          <label class="form-label small fw-semibold">确认密码</label>
          <input v-model="form.confirmPassword" type="password" class="form-control" placeholder="再次输入密码" />
        </div>

        <button class="btn w-100 rounded-pill fw-bold" style="background:#52CDFF;color:#fff;" :disabled="submitting" @click="doSetup">
          {{ submitting ? '创建中...' : '创建管理员账号' }}
        </button>
      </template>

      <!-- 管理员登录 -->
      <template v-else>
        <h4 class="fw-bold mb-1 text-center">🔐 管理后台登录</h4>
        <p class="text-muted small mb-4 text-center">请使用管理员账号登录</p>

        <div class="mb-3">
          <label class="form-label small fw-semibold">管理员用户名</label>
          <input v-model="loginForm.username" class="form-control" placeholder="请输入管理员用户名" @keyup.enter="doLogin" />
        </div>
        <div class="mb-4">
          <label class="form-label small fw-semibold">密码</label>
          <input v-model="loginForm.password" type="password" class="form-control" placeholder="密码" @keyup.enter="doLogin" />
        </div>

        <button class="btn w-100 rounded-pill fw-bold" style="background:#52CDFF;color:#fff;" :disabled="loggingIn" @click="doLogin">
          {{ loggingIn ? '登录中...' : '登 录' }}
        </button>
      </template>
    </div>
  </div>
</template>
