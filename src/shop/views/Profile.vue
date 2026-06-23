<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast.js'
import { uploadAvatarFile, logout as apiLogout, getAddresses, createAddress, updateAddress, deleteAddress, getMyOrders, returnOrder } from '@/api/shop.js'
import { updateUser } from '@/api/products.js'
import CropDialog from '@/components/CropDialog.vue'
import AddressModal from '@/shop/components/AddressModal.vue'

const toast = useToast()
const router = useRouter()
const userInfo = ref(null)
const showAvatarModal = ref(false)

// 管理员开关
const adminToggling = ref(false)
const isAdmin = computed(() => userInfo.value?.role === 'admin')

// 裁剪弹窗
const cropVisible = ref(false)
const cropSrc = ref('')

// 编辑模式
const editMode = ref(false)
const editForm = ref({ username: '', birthday: '', gender: '' })
const editSaving = ref(false)

// ===== 地址管理 =====
const addresses = ref([])
const addrLoading = ref(false)
const addrModalVisible = ref(false)
const editingAddress = ref(null)

// ===== 订单管理 =====
const orders = ref([])
const orderLoading = ref(false)
const returnDialogVisible = ref(false)
const returnTarget = ref(null)
const returnReason = ref('')

async function loadOrders() {
  orderLoading.value = true
  try {
    const r = await getMyOrders({ user_id: userInfo.value.id })
    if (r.code === 0) orders.value = r.data.list || []
  } catch { orders.value = [] }
  finally { orderLoading.value = false }
}

async function onReturnOrder(order) {
  if (order.status !== 1) return
  returnReason.value = ''
  returnTarget.value = order
  returnDialogVisible.value = true
}

async function confirmReturn() {
  if (!returnReason.value.trim()) { toast.warn('请填写退货理由'); return }
  try {
    const r = await returnOrder(returnTarget.value.id, returnReason.value.trim())
    if (r.code === 0) {
      returnTarget.value.return_status = 1
      returnDialogVisible.value = false
      toast.success('退货申请已提交')
    } else {
      toast.error(r.message || '退货失败')
    }
  } catch { toast.error('退货失败') }
}

function orderStatusText(status) {
  if (status === 1) return '已完成'
  if (status === 2) return '已取消'
  if (status === 3) return '已退货'
  return '未知'
}

function orderStatusClass(status) {
  if (status === 1) return 'bg-success'
  if (status === 2) return 'bg-secondary'
  if (status === 3) return 'bg-warning text-dark'
  return 'bg-secondary'
}

async function loadAddresses() {
  addrLoading.value = true
  try {
    const r = await getAddresses()
    if (r.code === 0) addresses.value = r.data
  } catch { addresses.value = [] }
  finally { addrLoading.value = false }
}

function onAddAddress() {
  editingAddress.value = null
  addrModalVisible.value = true
}

function onEditAddress(addr) {
  editingAddress.value = addr
  addrModalVisible.value = true
}

async function onSaveAddress(data) {
  try {
    if (editingAddress.value) {
      await updateAddress(editingAddress.value.id, data)
    } else {
      await createAddress(data)
    }
    addrModalVisible.value = false
    await loadAddresses()
    toast.success('地址已保存')
  } catch { toast.error('保存地址失败') }
}

async function onDeleteAddress(addr) {
  if (!confirm('确认删除地址？')) return
  try {
    await deleteAddress(addr.id)
    addresses.value = addresses.value.filter(a => a.id !== addr.id)
    toast.success('已删除')
  } catch { toast.error('删除失败') }
}

onMounted(async () => {
  const stored = localStorage.getItem('ego_user')
  if (stored) {
    try { userInfo.value = JSON.parse(stored) } catch {}
  }
  if (!userInfo.value) { router.push('/login'); return }
  await Promise.all([loadAddresses(), loadOrders()])
})

const avatarUrl = computed(() => {
  const avatar = userInfo.value?.avatar
  if (!avatar) return ''
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar
  return avatar
})

const initial = computed(() => {
  return (userInfo.value?.username || 'U').charAt(0).toUpperCase()
})

// 开设编辑资料
function startEdit() {
  editForm.value = {
    username: userInfo.value?.username || '',
    birthday: userInfo.value?.birthday ? (typeof userInfo.value.birthday === 'string' ? userInfo.value.birthday.substring(0, 10) : '') : '',
    gender: userInfo.value?.gender || ''
  }
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
}

async function saveEdit() {
  const f = editForm.value
  if (!f.username.trim()) { toast.warn('用户名不能为空'); return }
  editSaving.value = true
  try {
    const payload = { username: f.username, birthday: f.birthday || null, gender: f.gender || null }
    await updateUser(userInfo.value.id, payload)
    if (pendingAvatar.value) {
      const uid = userInfo.value.uid
      const r = await uploadAvatarFile(uid, pendingAvatar.value)
      if (r.code === 0) {
        userInfo.value.avatar = r.data.avatar
      }
    }
    userInfo.value.username = f.username
    userInfo.value.birthday = f.birthday || null
    userInfo.value.gender = f.gender || null
    localStorage.setItem('ego_user', JSON.stringify(userInfo.value))
    pendingAvatar.value = ''
    pendingAvatarPreview.value = ''
    editMode.value = false
    toast.success('资料已更新')
    setTimeout(() => location.reload(), 1000)
  } catch (e) { toast.error('保存失败：' + e.message) }
  finally { editSaving.value = false }
}

// 头像裁剪暂存
const pendingAvatar = ref('')
const pendingAvatarPreview = ref('')

function onPickFile(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.warn('图片不能超过 5MB'); e.target.value = ''; return }
  const reader = new FileReader()
  reader.onload = (ev) => { cropSrc.value = ev.target.result; cropVisible.value = true }
  reader.readAsDataURL(file)
  e.target.value = ''
}

function onCropSave(dataUrl) {
  cropVisible.value = false
  pendingAvatar.value = dataUrl
  pendingAvatarPreview.value = dataUrl
  toast.success('头像已暂存，保存资料时一并提交')
}

function onCropClose() { cropVisible.value = false }

async function onLogout() {
  const uid = userInfo.value?.uid
  localStorage.removeItem('ego_token')
  localStorage.removeItem('ego_cookie')
  localStorage.removeItem('ego_user')
  if (uid) { try { await apiLogout(uid) } catch {} }
  router.push('/')
}

// 切换管理员权限
async function toggleAdmin() {
  adminToggling.value = true
  try {
    const token = localStorage.getItem('ego_token') || ''
    const res = await fetch('/api/user/' + userInfo.value.id + '/toggle-admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    })
    const r = await res.json()
    if (r.code === 0) {
      toast.success(r.message)
      // 更新本地 userInfo 中的 role
      userInfo.value.role = r.data.role
      localStorage.setItem('ego_user', JSON.stringify(userInfo.value))
    } else {
      toast.error(r.message || '操作失败')
    }
  } catch { toast.error('操作失败') }
  finally { adminToggling.value = false }
}
</script>

<template>
  <div class="container py-4" style="max-width: 900px; margin: 0 auto;">
    <!-- ===== 个人资料卡片 ===== -->
    <div class="card border-0 shadow-sm mb-4" style="border-radius: 14px; overflow: hidden;">
      <div style="height: 140px; background: linear-gradient(135deg, #52CDFF, #2fa8d8); position: relative;">
        <div style="position: absolute; bottom: -50px; left: 40px;">
          <div v-if="avatarUrl"
            @click="showAvatarModal = true"
            style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.12); background: #fff; overflow: hidden;">
            <img :src="avatarUrl"
              style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: center;" />
          </div>
          <div v-else
            style="width: 100px; height: 100px; border-radius: 50%; border: 4px solid #fff; background: #52CDFF; display: flex; align-items: center; justify-content: center; font-size: 2.8rem; font-weight: 700; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.12); cursor: pointer;"
            @click="showAvatarModal = true">
            {{ initial }}
          </div>
        </div>
      </div>

      <div style="padding: 60px 40px 40px 40px;">
        <template v-if="editMode">
          <div class="row g-3 mb-3">
            <div class="col-12">
              <label class="form-label small fw-semibold">更换头像</label>
              <div class="d-flex align-items-center gap-3">
                <div v-if="pendingAvatarPreview || avatarUrl"
                  style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; border: 2px solid #52CDFF; cursor: pointer;"
                  @click="showAvatarModal = true">
                  <img :src="pendingAvatarPreview || avatarUrl" style="width:100%;height:100%;object-fit:cover;" />
                </div>
                <div v-else
                  class="rounded-circle d-flex align-items-center justify-content-center"
                  style="width: 64px; height: 64px; background: #52CDFF; color: #fff; font-size: 1.5rem; font-weight: 600;">
                  {{ initial }}
                </div>
                <label class="btn btn-sm btn-outline-primary" style="cursor: pointer;">
                  {{ (pendingAvatarPreview || avatarUrl) ? '更换图片' : '选择图片' }}
                  <input type="file" accept="image/*" hidden @change="onPickFile" />
                </label>
              </div>
            </div>
            <div class="col-sm-6">
              <label class="form-label small fw-semibold">用户名</label>
              <input v-model="editForm.username" class="form-control form-control-sm" placeholder="用户名" />
            </div>
            <div class="col-sm-6">
              <label class="form-label small fw-semibold">生日</label>
              <input v-model="editForm.birthday" type="date" class="form-control form-control-sm" />
            </div>
            <div class="col-sm-6">
              <label class="form-label small fw-semibold">性别</label>
              <div class="d-flex gap-3 mt-1">
                <label class="small"><input v-model="editForm.gender" type="radio" value="男" /> 男</label>
                <label class="small"><input v-model="editForm.gender" type="radio" value="女" /> 女</label>
              </div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-primary px-4" :disabled="editSaving" @click="saveEdit">{{ editSaving?'保存中...':'保存' }}</button>
            <button class="btn btn-sm btn-outline-secondary px-4" @click="cancelEdit">取消</button>
          </div>
        </template>

        <template v-else>
          <h3 class="fw-bold mb-1">{{ userInfo?.username }}</h3>
          <p class="text-muted small mb-4">UID: {{ userInfo?.uid }}</p>

          <div class="mb-4">
            <button class="btn btn-sm btn-outline-primary" @click="startEdit">编辑资料</button>
          </div>

          <div class="row g-3 mt-3">
            <div class="col-sm-6">
              <div class="profile-field">
                <label class="profile-label">邮箱</label>
                <div class="profile-value">{{ userInfo?.email || '未设置' }}</div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="profile-field">
                <label class="profile-label">手机号</label>
                <div class="profile-value">{{ userInfo?.phone || '未设置' }}</div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="profile-field">
                <label class="profile-label">生日</label>
                <div class="profile-value">{{ userInfo?.birthday ? (typeof userInfo.birthday === 'string' ? userInfo.birthday.substring(0,10) : new Date(userInfo.birthday).toLocaleDateString('zh-CN')) : '未设置' }}</div>
              </div>
            </div>
            <div class="col-sm-6">
              <div class="profile-field">
                <label class="profile-label">性别</label>
                <div class="profile-value">{{ userInfo?.gender || '未设置' }}</div>
              </div>
            </div>
          </div>

          <hr class="my-4" />

          <!-- 管理员权限开关（测试用） -->
          <div class="d-flex align-items-center justify-content-between p-3 mb-3 rounded-3" style="background:#fffbe6;border:1px solid #ffe58f;">
            <div>
              <div class="fw-semibold" style="font-size:0.9rem;">🛠️ 管理员权限</div>
              <div class="text-muted" style="font-size:0.75rem;">开启后将获得后台管理权限（测试用途）</div>
            </div>
            <div class="form-check form-switch mb-0">
              <input
                class="form-check-input"
                type="checkbox"
                :checked="isAdmin"
                :disabled="adminToggling"
                @change="toggleAdmin"
                style="cursor:pointer;width:44px;height:24px;"
              />
            </div>
          </div>

          <button class="btn btn-outline-danger btn-sm rounded-pill px-4" @click="onLogout">退出登录</button>
        </template>
      </div>
    </div>

    <!-- ===== 地址管理卡片 ===== -->
    <div class="card border-0 shadow-sm" style="border-radius: 14px; overflow: hidden;">
      <div class="card-body p-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">📍 收货地址</h5>
          <button class="btn btn-sm rounded-pill px-3" style="background:#52CDFF;color:#fff;" @click="onAddAddress">
            + 新增地址
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="addrLoading" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm" style="color:#52CDFF;"></div>
          <span class="ms-2">加载中...</span>
        </div>

        <!-- 空态 -->
        <div v-else-if="!addresses.length" class="text-center py-5 text-muted">
          <div style="font-size:3rem;">📍</div>
          <p class="mt-2">暂无收货地址</p>
          <button class="btn btn-sm rounded-pill px-4" style="background:#52CDFF;color:#fff;" @click="onAddAddress">
            添加第一个地址
          </button>
        </div>

        <!-- 地址列表 -->
        <div v-else class="address-list">
          <div v-for="addr in addresses" :key="addr.id"
            class="address-item d-flex align-items-start gap-3 p-3 mb-2 rounded-3"
            :class="{ 'is-default': addr.is_default }"
            :style="addr.is_default ? { background: '#f0faff', border: '1.5px solid #52CDFF' } : { background: '#f8f9fa', border: '1px solid transparent' }"
          >
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="fw-semibold" style="font-size:0.92rem;">{{ addr.receiver_name || '未命名' }}</span>
                <span style="font-size:0.82rem;color:#999;">{{ addr.phone }}</span>
                <span v-if="addr.is_default" class="badge rounded-pill" style="background:#52CDFF;color:#fff;font-size:0.65rem;font-weight:500;">
                  默认
                </span>
              </div>
              <div style="font-size:0.85rem;color:#666;">
                {{ addr.province }} {{ addr.city }} {{ addr.district }} {{ addr.detail }}
              </div>
            </div>
            <div class="d-flex gap-1 flex-shrink-0">
              <button class="btn btn-sm border-0" style="color:#52CDFF;font-size:0.8rem;" @click="onEditAddress(addr)" title="编辑">
                ✏️
              </button>
              <button class="btn btn-sm border-0" style="color:#ff4d4f;font-size:0.8rem;" @click="onDeleteAddress(addr)" title="删除">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 头像大图模态框 -->
    <div v-if="showAvatarModal" class="position-fixed d-flex align-items-center justify-content-center"
      style="inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; cursor: pointer;"
      @click="showAvatarModal = false">
      <div v-if="avatarUrl"
        style="width: 360px; height: 360px; border-radius: 50%; overflow: hidden; border: 6px solid #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.3); background: #fff;"
        @click.stop>
        <img :src="avatarUrl"
          style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: center;" />
      </div>
      <div v-else
        style="width: 360px; height: 360px; border-radius: 50%; background: #52CDFF; display: flex; align-items: center; justify-content: center; font-size: 10rem; font-weight: 700; color: #fff; border: 6px solid #fff; box-shadow: 0 8px 40px rgba(0,0,0,0.3);"
        @click.stop>
        {{ initial }}
      </div>
    </div>

    <!-- 裁剪弹窗 -->
    <CropDialog
      :visible="cropVisible"
      :imageSrc="cropSrc"
      @close="onCropClose"
      @save="onCropSave"
    />

    <!-- 地址弹窗 -->
    <AddressModal
      :visible="addrModalVisible"
      :address="editingAddress"
      @close="addrModalVisible = false"
      @save="onSaveAddress"
    />

    <!-- 退货原因弹窗 -->
    <div v-if="returnDialogVisible" class="position-fixed d-flex align-items-center justify-content-center"
      style="inset:0;background:rgba(0,0,0,0.6);z-index:20000;" @click.self="returnDialogVisible = false">
      <div class="bg-white rounded-3 p-4" style="width:420px;box-shadow:0 12px 50px rgba(0,0,0,0.3);">
        <h5 class="fw-bold mb-3">确认退货</h5>
        <p class="text-muted small mb-2">商品: {{ returnTarget?.product_name }}</p>
        <label class="form-label small fw-semibold">退货理由 <span style="color:#ff4d4f;">*</span></label>
        <textarea v-model="returnReason" class="form-control mb-3" rows="3" placeholder="请描述退货原因..."></textarea>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" @click="returnDialogVisible = false">取消</button>
          <button class="btn btn-sm rounded-pill px-4" style="background:#ff4d4f;color:#fff;" @click="confirmReturn">确认退货</button>
        </div>
      </div>
    </div>

    <!-- ===== 订单管理卡片 ===== -->
    <div class="card border-0 shadow-sm mt-4" style="border-radius: 14px; overflow: hidden;">
      <div class="card-body p-4">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <h5 class="fw-bold mb-0">📋 我的订单</h5>
        </div>

        <!-- 加载中 -->
        <div v-if="orderLoading" class="text-center py-4 text-muted">
          <div class="spinner-border spinner-border-sm" style="color:#52CDFF;"></div>
          <span class="ms-2">加载中...</span>
        </div>

        <!-- 空态 -->
        <div v-else-if="!orders.length" class="text-center py-5 text-muted">
          <div style="font-size:3rem;">📋</div>
          <p class="mt-2">暂无订单</p>
        </div>

        <!-- 订单列表 -->
        <div v-else class="order-list">
          <div v-for="order in orders" :key="order.id"
            class="order-item p-3 mb-2 rounded-3"
            style="background:#f8f9fa;border:1px solid transparent;"
          >
            <div class="d-flex align-items-start justify-content-between mb-2">
              <div>
                <span class="fw-semibold" style="font-size:0.88rem;">{{ order.product_name }}</span>
                <span v-if="order.sku_name" class="text-muted ms-1" style="font-size:0.78rem;">({{ order.sku_name }})</span>
              </div>
              <span class="badge rounded-pill" :class="orderStatusClass(order.status)" style="font-size:0.65rem;font-weight:500;">
                {{ orderStatusText(order.status) }}
              </span>
            </div>
            <div class="d-flex align-items-center justify-content-between" style="font-size:0.8rem;color:#999;">
              <div>
                <span>订单号: {{ order.order_id }}</span>
                <span class="mx-2">|</span>
                <span>x{{ order.quantity }}</span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="fw-bold" style="color:#ff4d4f;font-size:0.9rem;">¥{{ Number(order.total_amount || 0).toFixed(2) }}</span>
                <button
                  v-if="order.status === 1 && (!order.return_status || order.return_status === 0)"
                  class="btn btn-sm rounded-pill px-3"
                  style="background:#ff4d4f;color:#fff;font-size:0.7rem;"
                  @click="onReturnOrder(order)"
                >
                  退货
                </button>
                <button
                  v-else-if="order.return_status === 3"
                  class="btn btn-sm rounded-pill px-3"
                  style="background:#ccc;color:#fff;font-size:0.7rem;cursor:not-allowed;"
                  disabled
                  :title="order.return_reject_reason ? '退货被拒绝: ' + order.return_reject_reason : '退货申请被拒绝'"
                >
                  退货
                </button>
              </div>
            </div>
            <div v-if="order.return_status === 1" class="mt-1" style="font-size:0.72rem;color:#52CDFF;">
              ⏳ 退货审核中
            </div>
            <div v-else-if="order.return_status === 2" class="mt-1" style="font-size:0.72rem;color:#28a745;">
              ✓ 退货已通过
            </div>
            <div v-else-if="order.return_status === 3" class="mt-1" style="font-size:0.72rem;color:#ff4d4f;">
              ✕ 退货被拒绝<span v-if="order.return_reject_reason">：{{ order.return_reject_reason }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 退货原因弹窗（已在外部定义） -->
  </div>
</template>

<style scoped>
.profile-field {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 16px;
}
.profile-label {
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
  display: block;
}
.profile-value {
  font-size: 0.95rem;
  color: #333;
  font-weight: 500;
}

.address-item {
  transition: all 0.2s;
}
.address-item:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}

.order-item {
  transition: all 0.2s;
}
.order-item:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
</style>
