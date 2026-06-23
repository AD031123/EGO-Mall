<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { login, register, autoLogin } from '@/api/shop.js'
import { useToast } from '@/composables/useToast.js'
import CropDialog from '@/components/CropDialog.vue'

const toast = useToast()
const router = useRouter()
const isLoginActive = ref(true)

// 尝试 cookie 自动登录
onMounted(async () => {
  const cookieToken = localStorage.getItem('ego_cookie')
  if (!cookieToken) return
  try {
    const r = await autoLogin(cookieToken)
    if (r.code === 0) {
      localStorage.setItem('ego_token', r.data.token)
      localStorage.setItem('ego_cookie', r.data.cookie_token)
      localStorage.setItem('ego_user', JSON.stringify(r.data.user))
      toast.success('欢迎回来，' + r.data.user.username)
      router.push('/')
    }
  } catch {}
})

function togglePanel() {
  isLoginActive.value = !isLoginActive.value
  coverImage.value = isLoginActive.value ? '/images/login.png' : '/images/register.png'
}

const coverImage = ref('/images/login.png')
const coverRef = ref(null)
const mouseX = ref(0)
const mouseY = ref(0)
const hover = ref(false)

function onCoverMouseMove(e) {
  if (!coverRef.value) return
  const r = coverRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - r.left - r.width / 2
  mouseY.value = e.clientY - r.top - r.height / 2
}
function onCoverMouseLeave() { hover.value = false; mouseX.value = 0; mouseY.value = 0 }

// 登录
const lf = ref({ account: '', password: '' }); const ll = ref(false)
async function doLogin() {
  const acc = lf.value.account?.trim()
  if (!acc || !lf.value.password) { toast.warn('请填写手机号/邮箱和密码'); return }
  ll.value = true
  try {
    const r = await login({ account: acc, password: lf.value.password })
    if (r.code === 0) { localStorage.setItem('ego_token', r.data.token); localStorage.setItem('ego_cookie', r.data.cookie_token); localStorage.setItem('ego_user', JSON.stringify(r.data.user)); toast.success('登录成功'); router.push('/profile') }
    else if (r.code === 2) toast.error(r.message || '登录失败')
  } catch (e) {
    // 解析服务器返回的错误消息（账号不存在 / 密码错误等）
    const msg = e.message || '登录失败，请重试'
    if (msg.includes('尚未注册') || msg.includes('不存在')) {
      toast.warn(msg, 5000)
    } else {
      toast.error(msg)
    }
  }
  finally { ll.value = false }
}

// 注册
const rf = ref({ username: '', email: '', phone: '', password: '', confirmPassword: '', birthday: '', gender: '' }); const rl = ref(false)

// 注册时的头像裁剪
const registerAvatar = ref('')       // 裁剪后的 base64
const registerAvatarPreview = ref('') // 预览小图
const cropVisible = ref(false)
const cropSrc = ref('')

function onPickRegisterAvatar(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.warn('图片不能超过 5MB')
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (ev) => {
    cropSrc.value = ev.target.result
    cropVisible.value = true
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function onCropSave(dataUrl) {
  cropVisible.value = false
  registerAvatar.value = dataUrl
  registerAvatarPreview.value = dataUrl
}

function onCropClose() {
  cropVisible.value = false
}

async function doRegister() {
  const f = rf.value
  if (!f.username) { toast.warn('请输入用户名'); return }
  if (!f.email && !f.phone) { toast.warn('邮箱或手机号至少填写一项'); return }
  if (!f.password || f.password.length < 6) { toast.warn('密码至少6位'); return }
  if (f.password !== f.confirmPassword) { toast.warn('两次密码不一致'); return }
  rl.value = true
  try {
    const r = await register({
      username: f.username,
      email: f.email || null,
      phone: f.phone || null,
      birthday: f.birthday || null,
      gender: f.gender || null,
      password: f.password,
      avatar_image: registerAvatar.value || null  // 裁剪后的头像 base64
    })
    if (r.code === 0) {
      localStorage.setItem('ego_token', r.data.token)
      localStorage.setItem('ego_cookie', r.data.cookie_token || '')
      localStorage.setItem('ego_user', JSON.stringify(r.data.user))
      toast.success('注册成功，请登录')
      // 切回登录面板
      isLoginActive.value = true
      coverImage.value = '/images/login.png'
      // 清空注册表单
      rf.value = { username: '', email: '', phone: '', password: '', confirmPassword: '', birthday: '', gender: '' }
      registerAvatar.value = ''
      registerAvatarPreview.value = ''
    } else {
      toast.error(r.message || '注册失败')
    }
  } catch { toast.error('注册失败，请重试') }
  finally { rl.value = false }
}
</script>

<template>
  <div class="d-flex align-items-center justify-content-center" style="min-height: 80vh; padding: 40px 0;">
    <div class="auth-wrap">
      <!-- 登录面板 -->
      <div class="auth-panel" :class="{ 'auth-shrink': !isLoginActive }" style="left:0;">
        <h4 class="fw-bold mb-1">欢迎回来</h4>
        <p class="text-muted small mb-4">登录你的 EGO Mall 账户</p>

        <div class="float-input mb-3">
          <input v-model="lf.account" type="text" class="fi-control" placeholder=" " @keyup.enter="doLogin" />
          <label class="fi-label">手机号 / 邮箱</label>
          <span class="fi-bar"></span>
        </div>
        <div class="float-input mb-4">
          <input v-model="lf.password" type="password" class="fi-control" placeholder=" " @keyup.enter="doLogin" />
          <label class="fi-label">密码</label>
          <span class="fi-bar"></span>
        </div>

        <button class="btn btn-sm w-100" style="background:#52CDFF;color:#fff;font-weight:600;border-radius:6px;" :disabled="ll" @click="doLogin">{{ ll ? '...' : '登录' }}</button>
      </div>

      <!-- 注册面板 -->
      <div class="auth-panel" :class="{ 'auth-shrink': isLoginActive }" style="right:0;">
        <h4 class="fw-bold mb-1">创建账号</h4>
        <p class="text-muted small mb-3">加入 EGO Mall</p>

        <!-- 头像选择 -->
        <div class="mb-3 d-flex align-items-center gap-3">
          <div v-if="registerAvatarPreview" class="rounded-circle overflow-hidden flex-shrink-0"
            style="width: 48px; height: 48px; border: 2px solid #52CDFF; background: #f0f0f0;">
            <img :src="registerAvatarPreview" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div v-else class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style="width: 48px; height: 48px; background: #e8e8e8; color: #aaa; font-size: 1.3rem;">
            📷
          </div>
          <label class="btn btn-sm btn-outline-secondary" style="cursor: pointer; font-size: 0.78rem;">
            {{ registerAvatarPreview ? '更换头像' : '选择头像（可选）' }}
            <input type="file" accept="image/*" hidden @change="onPickRegisterAvatar" />
          </label>
        </div>

        <div class="float-input mb-2">
          <input v-model="rf.username" type="text" class="fi-control" placeholder=" " />
          <label class="fi-label">用户名 <span style="color:#ff4d4f;">*</span></label>
          <span class="fi-bar"></span>
        </div>
        <div class="row g-3 mb-2">
          <div class="col-6">
            <div class="float-input">
              <input v-model="rf.email" type="email" class="fi-control" placeholder=" " />
              <label class="fi-label">邮箱</label>
              <span class="fi-bar"></span>
            </div>
          </div>
          <div class="col-6">
            <div class="float-input">
              <input v-model="rf.phone" type="tel" class="fi-control" placeholder=" " />
              <label class="fi-label">手机号</label>
              <span class="fi-bar"></span>
            </div>
          </div>
        </div>
        <div class="row g-3 mb-2">
          <div class="col-6">
            <div class="float-input">
              <input v-model="rf.birthday" type="date" class="fi-control" placeholder=" " />
              <label class="fi-label">生日</label>
              <span class="fi-bar"></span>
            </div>
          </div>
          <div class="col-6">
            <label class="form-label small fw-semibold mb-1" style="font-size:0.72rem;color:#999;">性别</label>
            <div class="d-flex gap-3">
              <label class="small"><input v-model="rf.gender" type="radio" value="男" /> 男</label>
              <label class="small"><input v-model="rf.gender" type="radio" value="女" /> 女</label>
            </div>
          </div>
        </div>
        <div class="row g-3 mb-2">
          <div class="col-6">
            <div class="float-input">
              <input v-model="rf.password" type="password" class="fi-control" placeholder=" " />
              <label class="fi-label">密码 <span style="color:#ff4d4f;">*</span></label>
              <span class="fi-bar"></span>
            </div>
          </div>
          <div class="col-6">
            <div class="float-input">
              <input v-model="rf.confirmPassword" type="password" class="fi-control" placeholder=" " />
              <label class="fi-label">确认密码</label>
              <span class="fi-bar"></span>
            </div>
          </div>
        </div>

        <button class="btn btn-sm w-100 mt-2" style="background:#52CDFF;color:#fff;font-weight:600;border-radius:6px;" :disabled="rl" @click="doRegister">{{ rl ? '...' : '注册' }}</button>
      </div>

      <!-- 封面层 -->
      <div
        ref="coverRef"
        class="auth-cover"
        :class="{ 'cover-left': !isLoginActive }"
        @mousemove="onCoverMouseMove"
        @mouseenter="hover = true"
        @mouseleave="onCoverMouseLeave"
      >
        <img :src="coverImage" class="cover-img" :class="{ 'img-hover': hover }" :style="{ transform: `translate(${mouseX * 0.04}px, ${mouseY * 0.04}px) scale(${hover ? 1.15 : 1.02})` }" />

        <div class="cover-text" style="position:relative;z-index:3;">
          <template v-if="isLoginActive">
            <span v-for="(c, i) in '你好，朋友!'" :key="'l'+i" class="float-char" :style="{ animationDelay: i * 0.13 + 's' }">{{ c }}</span>
          </template>
          <template v-else>
            <span v-for="(c, i) in '欢迎回来!'" :key="'r'+i" class="float-char" :style="{ animationDelay: i * 0.15 + 's' }">{{ c }}</span>
          </template>
        </div>

        <p class="small mb-4" style="color:#666; position:relative; z-index:3;">
          {{ isLoginActive ? '还没有账号？点击注册' : '已有账号？点击登录' }}
        </p>
        <button class="btn rounded-pill px-4" style="border:2px solid #52CDFF;color:#52CDFF;font-weight:600; position:relative; z-index:3;" @click="togglePanel">
          {{ isLoginActive ? '注 册' : '登 录' }}
        </button>
      </div>
    </div>

    <!-- 裁剪弹窗 -->
    <CropDialog
      :visible="cropVisible"
      :imageSrc="cropSrc"
      @close="onCropClose"
      @save="onCropSave"
    />
  </div>
</template>

<style scoped>
.auth-wrap { position:relative;width:780px;height:520px;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.1);background:#fff; }
.auth-panel { position:absolute;top:0;height:100%;width:460px;padding:44px;display:flex;flex-direction:column;justify-content:center;transition:width .5s cubic-bezier(.4,0,.2,1),opacity .35s;z-index:1; }
.auth-shrink { width:280px;opacity:0;pointer-events:none; }
.auth-cover { position:absolute;top:0;height:100%;left:440px;width:340px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;transition:left .5s cubic-bezier(.4,0,.2,1);z-index:2;overflow:hidden; }
.cover-left { left:0; }
.cover-img { position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(8px) opacity(0.85);transition:filter 0.5s ease;animation:img-float 6s ease-in-out infinite; }
.img-hover { filter:blur(0) opacity(1); }
@keyframes img-float { 0%,100%{transform:translate(0,0) scale(1.02)} 25%{transform:translate(-3px,-4px) scale(1.03)} 50%{transform:translate(2px,-8px) scale(1.02)} 75%{transform:translate(4px,-3px) scale(1.04)} }
.float-char { display:inline-block;font-size:1.6rem;font-weight:bold;color:#333;text-shadow:0 2px 8px rgba(0,0,0,0.12);animation:float-char 2.4s ease-in-out infinite; }
@keyframes float-char { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
.float-input { position:relative;padding-top:10px; }
.fi-control::placeholder { color:transparent; }
.fi-control { width:100%;border:none;outline:none;background:transparent;font-size:0.9rem;padding:8px 0;color:#333;border-bottom:1px solid #ddd;border-radius:0;transition:border-color 0.25s; }
.fi-control:focus { border-bottom-color:#52CDFF; }
.fi-label { position:absolute;left:0;top:50%;transform:translateY(-50%);font-size:0.85rem;color:#aaa;pointer-events:none;transition:all 0.25s ease; }
.fi-control:focus+.fi-label,.fi-control:not(:placeholder-shown)+.fi-label { top:-8px;transform:translateY(0);font-size:0.72rem;color:#52CDFF; }
.fi-control:not(:placeholder-shown):not(:focus)+.fi-label { color:#999; }
.fi-bar { position:absolute;bottom:0;left:0;right:0;height:2px;background:#52CDFF;transform:scaleX(0);transition:transform 0.3s ease; }
.fi-control:focus~.fi-bar { transform:scaleX(1); }
</style>
