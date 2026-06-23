<script setup>
import { ref, reactive, onMounted, computed, nextTick } from 'vue'
import { Modal } from 'bootstrap'
import { getUsers, createUser, updateUser, deleteUser } from '@/api/products.js'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()

/* ===== 列表 ===== */
const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: '' })

/* ===== 模态框 ===== */
const formModalRef = ref(null)
const modalBodyRef = ref(null)
let modalInst = null
const confirmRef = ref(null)

const formTitle = ref('新增用户')
const isEdit = ref(false)
const editId = ref(null)
const submitting = ref(false)
const form = reactive({ username: '', email: '', phone: '', password: '', status: 1 })

const avatarPreview = ref('') // 编辑时显示的头像路径

const errors = reactive({ username: '', password: '' })

onMounted(() => { loadUsers() })

async function loadUsers() {
  try {
    const p = { page: page.value, pageSize: pageSize.value }
    if (filters.keyword) p.keyword = filters.keyword
    if (filters.status !== '') p.status = filters.status
    const res = await getUsers(p)
    users.value = res.data.list
    total.value = res.data.total
  } catch (e) { toast.error('加载失败：' + e.message) }
}

function onSearch() { page.value = 1; loadUsers() }
function goPage(p) { page.value = p; loadUsers() }
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
function statusBadge(s) { return s === 1 ? '激活' : '禁用' }
function statusClass(s) { return s === 1 ? 'on' : 'off' }
function clearErrors() { errors.username = ''; errors.password = '' }

/* ===== 新建/编辑 ===== */
function showCreate() {
  isEdit.value = false; editId.value = null; formTitle.value = '新增用户'
  Object.assign(form, { username: '', email: '', phone: '', password: '', status: 1 })
  avatarPreview.value = ''
  clearErrors()
  if (!modalInst) modalInst = new Modal(formModalRef.value)
  modalInst.show()
  nextTick(() => modalBodyRef.value?.scrollTo(0, 0))
}

function showEdit(u) {
  isEdit.value = true; editId.value = u.id; formTitle.value = '编辑用户 - ' + u.username
  Object.assign(form, { username: u.username, email: u.email || '', phone: u.phone || '', password: '', status: u.status ?? 1 })
  // 处理头像预览
  const av = u.avatar
  if (av && av.startsWith('http')) avatarPreview.value = av
  else if (av && av.startsWith('/')) avatarPreview.value = av
  else if (av && av.startsWith('data:')) avatarPreview.value = av
  else avatarPreview.value = ''
  clearErrors()
  if (!modalInst) modalInst = new Modal(formModalRef.value)
  modalInst.show()
  nextTick(() => modalBodyRef.value?.scrollTo(0, 0))
}

function validate() {
  clearErrors()
  let ok = true
  if (!form.username.trim()) { errors.username = '请输入用户名'; ok = false }
  if (!isEdit.value && !form.password) { errors.password = '请输入密码'; ok = false }
  else if (!isEdit.value && form.password.length < 6) { errors.password = '密码至少6位'; ok = false }
  return ok
}

async function onSubmit() {
  if (!validate()) return
  submitting.value = true
  try {
    const payload = { ...form }
    if (isEdit.value && !payload.password) delete payload.password
    if (isEdit.value) await updateUser(editId.value, payload)
    else await createUser(payload)
    modalInst.hide(); loadUsers()
    toast.success(isEdit.value ? '用户已更新' : '用户已创建')
  } catch (e) { toast.error('操作失败：' + e.message) }
  finally { submitting.value = false }
}

/* ===== 删除 ===== */
const delId = ref(null)
function showDelete(id) { delId.value = id; confirmRef.value.show() }
async function onDel() {
  try { await deleteUser(delId.value); delId.value = null; loadUsers(); toast.success('用户已删除') }
  catch (e) { toast.error('删除失败：' + e.message) }
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h5 class="fw-bold mb-0" style="color:#333;">用户管理</h5>
      <button class="btn btn-primary" @click="showCreate">+ 新增用户</button>
    </div>

    <!-- 搜索筛选 -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="toolbar">
          <input v-model="filters.keyword" class="form-control" placeholder="搜索用户名/邮箱/手机..." style="width:240px;" @keyup.enter="onSearch" />
          <select v-model="filters.status" class="form-select" @change="onSearch">
            <option value="">全部状态</option>
            <option :value="1">激活</option>
            <option :value="0">禁用</option>
          </select>
          <button class="btn btn-outline-secondary btn-sm" @click="filters.keyword='';filters.status='';onSearch()">重置</button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="card">
      <div class="table-responsive">
        <table class="table product-table mb-0">
          <thead>
            <tr><th>ID</th><th>用户名</th><th>邮箱</th><th>手机号</th><th>注册时间</th><th>状态</th><th style="width:150px;">操作</th></tr>
          </thead>
          <tbody>
            <tr v-if="!users.length"><td colspan="7" class="text-center text-muted py-4">暂无用户数据</td></tr>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.id }}</td>
              <td><span class="fw-medium">{{ u.username }}</span></td>
              <td>{{ u.email || '-' }}</td>
              <td>{{ u.phone || '-' }}</td>
              <td class="small text-muted">{{ u.created_at ? new Date(u.created_at).toLocaleDateString() : '-' }}</td>
              <td><span :class="['status-badge', statusClass(u.status)]">{{ statusBadge(u.status) }}</span></td>
              <td>
                <button class="btn btn-outline-primary btn-sm me-1" @click="showEdit(u)">编辑</button>
                <button class="btn btn-outline-danger btn-sm" @click="showDelete(u.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer d-flex align-items-center justify-content-between" v-if="total > 0">
        <small class="text-muted">共 {{ total }} 条，第 {{ page }}/{{ totalPages }} 页</small>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{disabled:page<=1}"><a class="page-link" href="#" @click.prevent="goPage(page-1)">上一页</a></li>
            <li v-for="p in totalPages" :key="p" class="page-item" :class="{active:p===page}"><a class="page-link" href="#" @click.prevent="goPage(p)">{{ p }}</a></li>
            <li class="page-item" :class="{disabled:page>=totalPages}"><a class="page-link" href="#" @click.prevent="goPage(page+1)">下一页</a></li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- 表单模态框 -->
    <div class="modal fade" ref="formModalRef" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius:12px;">
          <div class="modal-header border-0 px-4 pt-4 pb-2"><h5 class="modal-title fw-bold">{{ formTitle }}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div ref="modalBodyRef" class="modal-body px-4 pb-3">
            <!-- 头像预览 -->
            <div v-if="avatarPreview" class="mb-3 d-flex align-items-center gap-3">
              <div class="rounded-circle overflow-hidden flex-shrink-0"
                style="width: 56px; height: 56px; border: 2px solid #52CDFF; background: #f0f0f0;">
                <img :src="avatarPreview" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;" />
              </div>
              <div class="small text-muted">当前头像</div>
            </div>
            <div v-else-if="isEdit" class="mb-3 d-flex align-items-center gap-3">
              <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style="width: 56px; height: 56px; background: #e0e0e0; color: #999; font-size: 1.4rem; font-weight: 600;">
                {{ form.username.charAt(0).toUpperCase() }}
              </div>
              <div class="small text-muted">未设置头像</div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">用户名 <span class="text-danger">*</span></label>
              <input v-model="form.username" class="form-control form-control-sm" :class="{ 'is-invalid': errors.username }" placeholder="用户名" @input="errors.username=''" />
              <div v-if="errors.username" class="invalid-feedback">{{ errors.username }}</div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6"><label class="form-label small fw-semibold">邮箱</label><input v-model="form.email" type="email" class="form-control form-control-sm" placeholder="选填" /></div>
              <div class="col-6"><label class="form-label small fw-semibold">手机号</label><input v-model="form.phone" class="form-control form-control-sm" placeholder="选填" /></div>
            </div>
            <div class="mb-3">
              <label class="form-label small fw-semibold">密码 {{ isEdit ? '(留空不修改)' : '' }}<span v-if="!isEdit" class="text-danger">*</span></label>
              <input v-model="form.password" type="password" class="form-control form-control-sm" :class="{ 'is-invalid': errors.password }" :placeholder="isEdit ? '留空则不修改密码' : '至少6位'" @input="errors.password=''" />
              <div v-if="errors.password" class="invalid-feedback">{{ errors.password }}</div>
            </div>
            <div class="mb-3"><label class="form-label small fw-semibold">状态</label><select v-model="form.status" class="form-select form-select-sm"><option :value="1">激活</option><option :value="0">禁用</option></select></div>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2"><button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">取消</button><button class="btn btn-sm btn-primary" :disabled="submitting" @click="onSubmit">{{ submitting?'保存中...':'保存' }}</button></div>
        </div>
      </div>
    </div>

    <ConfirmModal ref="confirmRef" title="删除用户" message="确定要删除该用户吗？此操作不可恢复。" confirm-text="确认删除" variant="danger" @confirm="onDel" />
  </div>
</template>
