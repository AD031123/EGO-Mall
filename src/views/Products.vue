<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Modal } from 'bootstrap'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories, createCategory, updateCategory, deleteCategory, getCoupons, createCoupon, deleteCoupon } from '@/api/products.js'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()

/* ===== 分类数据 ===== */
const categoriesL1 = ref([])
const categoriesL2 = ref([])
const allCategories = ref([])

async function loadCategories() {
  try {
    const [r1, rAll] = await Promise.all([
      getCategories({ parent_id: 0 }),
      getCategories()
    ])
    categoriesL1.value = r1.data
    allCategories.value = rAll.data
  } catch {}
}

/* ===== 列表 ===== */
const products = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', category_l1: '', category_l2: '', status: '' })

/* ===== 商品表单 ===== */
const formModalRef = ref(null)
let modalInst = null
const confirmRef = ref(null)
const formTitle = ref('新增商品')
const isEdit = ref(false)
const editId = ref(null)
const submitting = ref(false)
const form = reactive({
  name: '', subtitle: '', category_l1: null, category_l2: null,
  main_image: '', images: [], description: '', status: 1
})
const imagePreviews = ref([])

/* ===== 规格管理 ===== */
const skus = ref([{ spec_name: '默认规格', price: 0, stock: 0 }])
function addSku() { skus.value.push({ spec_name: '', price: 0, stock: 0 }) }
function removeSku(i) { if (skus.value.length > 1) skus.value.splice(i, 1) }

/* ===== 优惠券管理 ===== */
const couponList = ref([])
function addCoupon() { couponList.value.push({ name: '', min_amount: 0, discount: 0 }) }


/** ===== Markdown 编辑器 ===== */
// 在新标签页打开 Markdown 编辑器
function openMdEditor() {
  const pid = editId.value || form.category_l1 || ''
  const url = `/md-edit?pid=${encodeURIComponent(pid)}&name=${encodeURIComponent(form.name)}&desc=${encodeURIComponent(form.description || '')}`
  const win = window.open(url, 'md-editor', 'width=1200,height=800')
  // 监听子窗口回传
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'md-save') {
      form.description = e.data.content
      toast.success('描述已保存')
    }
  })
}

/* ===== 状态倒计时 ===== */
const now = ref(Date.now())
setInterval(() => { now.value = Date.now() }, 60000)

onMounted(() => { loadCategories(); loadProducts() })

function onL1Change() {
  form.category_l2 = null
  categoriesL2.value = []
  if (form.category_l1) {
    categoriesL2.value = allCategories.value.filter(c => c.parent_id === form.category_l1)
  }
}

function onFilterL1Change() { filters.category_l2 = ''; onSearch() }

function catName(id) {
  const c = allCategories.value.find(x => x.id === id)
  return c ? c.name : '-'
}

function catDisplay(p) {
  const l1 = p.category_l1_name || catName(p.category_l1)
  const l2 = p.category_l2_name || catName(p.category_l2)
  if (l1 && l2) return l1 + ' > ' + l2
  if (l1) return l1
  return p.category_l2_name || p.category_l1_name || '-'
}

function priceDisplay(p) {
  if (!p.min_price && !p.max_price) return '-'
  if (p.min_price === p.max_price) return '¥' + Number(p.min_price).toFixed(2)
  return '¥' + Number(p.min_price).toFixed(2) + ' ~ ¥' + Number(p.max_price).toFixed(2)
}

async function loadProducts() {
  try {
    const p = { page: page.value, pageSize: pageSize.value }
    if (filters.keyword) p.keyword = filters.keyword
    if (filters.category_l1) p.category_l1 = filters.category_l1
    if (filters.category_l2) p.category_l2 = filters.category_l2
    if (filters.status !== '') p.status = filters.status
    const res = await getProducts(p)
    products.value = res.data.list
    total.value = res.data.total
  } catch (e) { toast.error('加载失败：' + e.message) }
}

function onSearch() { page.value = 1; loadProducts() }
function goPage(pg) { page.value = pg; loadProducts() }
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)
function statusBadge(s) { return s === 1 ? '上架' : '下架' }
function statusClass(s) { return s === 1 ? 'on' : 'off' }
function timeAgo(d) {
  if (!d) return ''
  const s = Math.floor((now.value - new Date(d).getTime()) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前'
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前'
  return Math.floor(s / 86400) + ' 天前'
}

/* ===== 新建/编辑 ===== */
function showCreate() {
  isEdit.value = false; editId.value = null; formTitle.value = '新增商品'
  resetForm()
  if (!modalInst) modalInst = new Modal(formModalRef.value)
  modalInst.show()
}

async function showEdit(p) {
  try {
    const res = await getProduct(p.id)
    const d = res.data
    isEdit.value = true; editId.value = d.id; formTitle.value = '编辑 - ' + d.name
    Object.assign(form, {
      name: d.name || '', subtitle: d.subtitle || '',
      category_l1: d.category_l1, category_l2: d.category_l2,
      main_image: d.main_image || '',
      images: Array.isArray(d.images) ? [...d.images] : [],
      description: d.description || '', status: d.status
    })
    if (d.category_l1) categoriesL2.value = allCategories.value.filter(c => c.parent_id === d.category_l1)
    imagePreviews.value = form.images.filter(u => typeof u === 'string').map(u => u)
    // 加载 skus
    if (d.skus && d.skus.length) {
      skus.value = d.skus.map(s => ({ spec_name: s.spec_name, price: Number(s.price), stock: Number(s.stock) }))
    } else {
      skus.value = [{ spec_name: '默认规格', price: 0, stock: 0 }]
    }
    // 加载优惠券
    try {
      const cres = await getCoupons(d.product_id)
      if (cres.code === 0) couponList.value = cres.data.map(c => ({ id: c.id, name: c.name, min_amount: Number(c.min_amount), discount: Number(c.discount) }))
      else couponList.value = []
    } catch { couponList.value = [] }
    if (!modalInst) modalInst = new Modal(formModalRef.value)
    modalInst.show()
  } catch (e) { toast.error('加载详情失败：' + e.message) }
}

/* ===== 图片 ===== */
function onFileChange(e) {
  const files = Array.from(e.target.files)
  files.forEach(f => {
    if (imagePreviews.value.length >= 10) { toast.warn('最多 10 张副图'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { const url = ev.target.result; imagePreviews.value.push(url); form.images.push(url) }
    reader.readAsDataURL(f)
  })
  e.target.value = ''
}

function onMainFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => { form.main_image = ev.target.result }
  reader.readAsDataURL(file)
  e.target.value = ''
}
function removeImage(i) { imagePreviews.value.splice(i, 1); form.images.splice(i, 1) }

/* ===== 提交 ===== */
async function onSubmit() {
  if (!form.name.trim()) { toast.warn('请输入商品名称'); return }
  if (!skus.value.length) { toast.warn('请至少添加一个规格'); return }
  submitting.value = true
  try {
    const payload = {
      name: form.name, subtitle: form.subtitle,
      category_l1: form.category_l1, category_l2: form.category_l2,
      main_image: form.main_image, images: form.images,
      description: form.description, status: form.status,
      skus: skus.value.map(s => ({ spec_name: s.spec_name || '默认', price: Number(s.price) || 0, stock: Number(s.stock) || 0 }))
    }
    if (isEdit.value) {
      await updateProduct(editId.value, payload)
      // 编辑时查找 product_id 来保存优惠券（使用 API 层确保带认证）
      try {
        const detailRes = await getProduct(editId.value)
        const pid = detailRes?.data?.product_id
        if (pid) await saveCoupons(pid)
      } catch {}
    }
    else {
      const cr = await createProduct(payload)
      // 保存优惠券
      const pid = cr.data.product_id
      await saveCoupons(pid)
    }
    modalInst.hide(); loadProducts()
    toast.success(isEdit.value ? '已更新' : '已创建')
  } catch (e) { toast.error('操作失败：' + e.message) }
  finally { submitting.value = false }
}

async function saveCoupons(productId) {
  for (const cp of couponList.value) {
    if (cp.name && cp.min_amount && cp.discount) {
      if (cp.id) {
        // 已有的不处理（实际应该支持编辑，简化先跳过）
      } else {
        await createCoupon({ product_id: productId, name: cp.name, min_amount: Number(cp.min_amount), discount: Number(cp.discount) })
      }
    }
  }
}

async function onDeleteCoupon(cp, index) {
  if (cp.id) {
    try { await deleteCoupon(cp.id) } catch {}
  }
  couponList.value.splice(index, 1)
}

/* ===== 删除 ===== */
const delId = ref(null)
function showDelete(id) {
  delId.value = id; confirmRef.value.show()
}
async function onDel() {
  try { await deleteProduct(delId.value); delId.value = null; loadProducts(); toast.success('已删除') }
  catch (e) { toast.error('删除失败：' + e.message) }
}

function resetForm() {
  Object.assign(form, { name: '', subtitle: '', category_l1: null, category_l2: null, main_image: '', images: [], description: '', status: 1 })
  categoriesL2.value = []
  imagePreviews.value = []
  skus.value = [{ spec_name: '默认规格', price: 0, stock: 0 }]
  couponList.value = []
}

/* ===== 分类弹窗 ===== */
const catModalRef = ref(null)
let catModalInst = null
const catForm = reactive({ parent_id: 0, name: '', sort_order: 0 })
const catSubmitting = ref(false)

function showCatModal() {
  Object.assign(catForm, { parent_id: 0, name: '', sort_order: 0 })
  if (!catModalInst) catModalInst = new Modal(catModalRef.value)
  catModalInst.show()
}

async function onSaveCategory() {
  if (!catForm.name.trim()) { toast.warn('请输入分类名称'); return }
  catSubmitting.value = true
  try { await createCategory({ ...catForm, parent_id: Number(catForm.parent_id) || 0 }); catModalInst.hide(); await loadCategories(); toast.success('分类已创建') }
  catch (e) { toast.error('创建失败：' + e.message) }
  finally { catSubmitting.value = false }
}

const catManageRef = ref(null)
let catManageInst = null
const catTree = ref([])

function buildTree(all) {
  return all.filter(c => c.parent_id === 0).map(l1 => ({ ...l1, children: all.filter(c => c.parent_id === l1.id) }))
}

function showCatManage() {
  catTree.value = buildTree(allCategories.value)
  if (!catManageInst) catManageInst = new Modal(catManageRef.value)
  catManageInst.show()
}

async function onDeleteCategory(id) {
  if (!confirm('确定删除该分类？如有子分类也会一并删除。')) return
  try { await deleteCategory(id); await loadCategories(); catTree.value = buildTree(allCategories.value); toast.success('已删除') }
  catch (e) { toast.error('删除失败：' + e.message) }
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h5 class="fw-bold mb-0" style="color:#333;">商品管理</h5>
      <div class="d-flex gap-2">
        <button class="btn btn-primary" @click="showCreate">+ 新增商品</button>
        <button class="btn btn-outline-primary" @click="showCatModal">+ 新建分类</button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="toolbar">
          <input v-model="filters.keyword" class="form-control" placeholder="搜索商品..." style="width:200px;" @keyup.enter="onSearch" />
          <select v-model="filters.category_l1" class="form-select" style="width:140px;" @change="onFilterL1Change">
            <option value="">全部分类</option>
            <option v-for="c in categoriesL1" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <select v-model="filters.category_l2" class="form-select" style="width:140px;" @change="onSearch">
            <option value="">全部二级</option>
            <option v-for="c in (filters.category_l1 ? allCategories.filter(x => x.parent_id === +filters.category_l1) : allCategories.filter(x => x.parent_id !== 0))" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <select v-model="filters.status" class="form-select" @change="onSearch">
            <option value="">全部状态</option><option :value="1">上架</option><option :value="0">下架</option>
          </select>
          <button class="btn btn-outline-secondary btn-sm" @click="filters.keyword='';filters.category_l1='';filters.category_l2='';filters.status='';onSearch()">重置</button>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="card">
      <div class="table-responsive">
        <table class="table product-table mb-0">
          <thead><tr><th>ID</th><th style="width:80px;">主图</th><th>名称</th><th>分类</th><th>价格（规格）</th><th>状态</th><th>创建时间</th><th style="width:150px;">操作</th></tr></thead>
          <tbody>
            <tr v-if="!products.length"><td colspan="8" class="text-center text-muted py-4">暂无商品</td></tr>
            <tr v-for="p in products" :key="p.id">
              <td>{{ p.id }}</td>
              <td>
                <img v-if="p.main_image" :src="p.main_image" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" />
                <span v-else class="text-muted">-</span>
              </td>
              <td><div class="fw-medium">{{ p.name }}</div><div v-if="p.subtitle" class="text-muted small">{{ p.subtitle }}</div></td>
              <td>{{ catDisplay(p) }}</td>
              <td class="fw-bold" style="color:#ff4d4f;font-size:0.85rem;">{{ priceDisplay(p) }}<span v-if="p.sku_count" class="text-muted ms-1" style="font-weight:400;font-size:0.72rem;">({{ p.sku_count }}规格)</span></td>
              <td><span :class="['status-badge', statusClass(p.status)]">{{ statusBadge(p.status) }}</span></td>
              <td class="small text-muted">{{ timeAgo(p.created_at) }}</td>
              <td>
                <button class="btn btn-outline-primary btn-sm me-1" @click="showEdit(p)">编辑</button>
                <button class="btn btn-outline-danger btn-sm" @click="showDelete(p.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer d-flex align-items-center justify-content-between" v-if="total > 0">
        <small class="text-muted">共 {{ total }} 条，第 {{ page }}/{{ totalPages }} 页</small>
        <nav><ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{disabled:page<=1}"><a class="page-link" href="#" @click.prevent="goPage(page-1)">上一页</a></li>
          <li v-for="p in totalPages" :key="p" class="page-item" :class="{active:p===page}"><a class="page-link" href="#" @click.prevent="goPage(p)">{{ p }}</a></li>
          <li class="page-item" :class="{disabled:page>=totalPages}"><a class="page-link" href="#" @click.prevent="goPage(page+1)">下一页</a></li>
        </ul></nav>
      </div>
    </div>

    <!-- 商品表单模态框 -->
    <div class="modal fade" ref="formModalRef" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius:12px;">
          <div class="modal-header border-0 px-4 pt-4 pb-2"><h5 class="modal-title fw-bold">{{ formTitle }}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body px-4 pb-3" style="max-height:70vh;overflow-y:auto;">
            <div class="row g-3">
              <div class="col-md-8">
                <div class="float-input">
                  <input v-model="form.name" type="text" class="fi-control" placeholder=" " />
                  <label class="fi-label">商品名称 <span style="color:#ff4d4f;">*</span></label>
                  <span class="fi-bar"></span>
                </div>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold" style="font-size:0.75rem;color:#999;">一级分类</label>
                <select v-model="form.category_l1" class="form-select form-select-sm" @change="onL1Change">
                  <option :value="null">请选择</option>
                  <option v-for="c in categoriesL1" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold" style="font-size:0.75rem;color:#999;">二级分类</label>
                <select v-model="form.category_l2" class="form-select form-select-sm" :disabled="!form.category_l1">
                  <option :value="null">请选择</option>
                  <option v-for="c in categoriesL2" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <div class="float-input">
                  <input v-model="form.subtitle" type="text" class="fi-control" placeholder=" " />
                  <label class="fi-label">副标题</label>
                  <span class="fi-bar"></span>
                </div>
              </div>
            </div>

            <!-- 规格管理 -->
            <div class="mt-4">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label fw-semibold mb-0" style="font-size:0.85rem;">规格与价格 <span style="color:#ff4d4f;">*</span></label>
                <button class="btn btn-sm btn-outline-primary" @click="addSku" style="font-size:0.75rem;">+ 添加规格</button>
              </div>
              <div v-for="(sku, i) in skus" :key="i" class="d-flex gap-2 mb-2 align-items-center">
                <input v-model="sku.spec_name" class="form-control form-control-sm" placeholder="规格名（如：黑色/64GB）" style="flex:2;" />
                <input v-model.number="sku.price" type="number" step="0.01" class="form-control form-control-sm" placeholder="价格" style="flex:1;" />
                <button v-if="skus.length > 1" class="btn btn-sm btn-outline-danger" style="font-size:0.75rem;flex-shrink:0;" @click="removeSku(i)" title="删除">✕</button>
              </div>
            </div>

            <!-- 主图 -->
            <div class="mt-4">
              <label class="form-label fw-semibold" style="font-size:0.85rem;">商品主图</label>
              <div class="d-flex gap-3 align-items-start">
                <div v-if="form.main_image" style="width:120px;height:120px;border-radius:8px;overflow:hidden;border:1px solid #eee;">
                  <img :src="form.main_image" style="width:100%;height:100%;object-fit:cover;" />
                </div>
                <div v-else class="d-flex align-items-center justify-content-center text-muted" style="width:120px;height:120px;border:2px dashed #ddd;border-radius:8px;font-size:0.8rem;">暂无主图</div>
                <div>
                  <label class="btn btn-sm btn-outline-primary" style="cursor:pointer;">选择本地图片<input type="file" accept="image/*" hidden @change="onMainFileChange" /></label>
                  <div class="mt-1"><input v-model="form.main_image" class="form-control form-control-sm" placeholder="或粘贴图片 URL" style="width:260px;font-size:0.8rem;" /></div>
                </div>
              </div>
            </div>

            <!-- 副图 -->
            <div class="mt-3">
              <label class="form-label fw-semibold" style="font-size:0.85rem;">商品副图（至多 10 张）</label>
              <div class="d-flex flex-wrap gap-2 mb-2">
                <div v-for="(img, i) in imagePreviews" :key="i" style="position:relative;width:80px;height:80px;border-radius:6px;overflow:hidden;border:1px solid #eee;">
                  <img :src="img" style="width:100%;height:100%;object-fit:cover;" />
                  <button @click="removeImage(i)" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.5);color:#fff;border:none;font-size:12px;line-height:20px;cursor:pointer;">✕</button>
                </div>
                <label v-if="imagePreviews.length < 10" class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center" style="width:80px;height:80px;border:2px dashed #ddd;border-radius:6px;cursor:pointer;font-size:1.5rem;color:#ccc;">
                  +<input type="file" accept="image/*" multiple hidden @change="onFileChange" />
                </label>
              </div>
            </div>

            <!-- 描述 -->
            <div class="mt-3">
              <label class="form-label fw-semibold" style="font-size:0.85rem;">商品描述</label>
              <div class="d-flex align-items-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-primary" @click="openMdEditor">📝 编辑 Markdown 描述</button>
                <span v-if="form.description" class="text-muted small">已编辑（{{ form.description.length }} 字符）</span>
                <span v-else class="text-muted small">未设置</span>
              </div>
            </div>

            <!-- 优惠券管理 -->
            <div class="mt-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label fw-semibold mb-0" style="font-size:0.85rem;">优惠券</label>
                <button type="button" class="btn btn-sm btn-outline-danger" @click="addCoupon" style="font-size:0.75rem;">+ 添加优惠券</button>
              </div>
              <div v-if="!couponList.length" class="text-muted small mb-2">暂无优惠券</div>
              <div v-for="(cp, i) in couponList" :key="i" class="d-flex gap-2 mb-2 align-items-center">
                <input v-model="cp.name" class="form-control form-control-sm" placeholder="券名（如：满8000减500）" style="flex:2;" />
                <input v-model.number="cp.min_amount" type="number" step="0.01" class="form-control form-control-sm" placeholder="满" style="flex:1;" />
                <input v-model.number="cp.discount" type="number" step="0.01" class="form-control form-control-sm" placeholder="减" style="flex:1;" />
                <button type="button" class="btn btn-sm btn-outline-danger" style="font-size:0.75rem;" @click="couponList.splice(i,1)">✕</button>
              </div>
            </div>

            <!-- 状态 -->
            <div class="mt-3">
              <label class="form-label fw-semibold" style="font-size:0.85rem;">状态</label>
              <select v-model="form.status" class="form-select form-select-sm" style="width:140px;">
                <option :value="1">上架</option><option :value="0">下架</option>
              </select>
            </div>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2">
            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">取消</button>
            <button class="btn btn-sm btn-primary" :disabled="submitting" @click="onSubmit">{{ submitting?'保存中...':'保存' }}</button>
          </div>
        </div>
      </div>
    </div>


    <ConfirmModal ref="confirmRef" title="删除商品" message="确定删除该商品？" confirm-text="确认删除" variant="danger" @confirm="onDel" />



    <!-- 分类弹窗 -->
    <div class="modal fade" ref="catModalRef" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg" style="border-radius:12px;">
          <div class="modal-header border-0 px-4 pt-4 pb-2"><h6 class="modal-title fw-bold">新建分类</h6><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body px-4 pb-3">
            <div class="mb-3">
              <label class="form-label small fw-semibold">所属上级</label>
              <select v-model="catForm.parent_id" class="form-select form-select-sm">
                <option :value="0">一级分类（无上级）</option>
                <option v-for="c in categoriesL1" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <button class="btn btn-link btn-sm p-0 mt-1" style="font-size:0.75rem;color:#52CDFF;text-decoration:none;" @click="showCatManage">管理分类</button>
            </div>
            <div class="mb-3"><label class="form-label small fw-semibold">分类名称 <span class="text-danger">*</span></label><input v-model="catForm.name" class="form-control form-control-sm" placeholder="如：笔记本" /></div>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2"><button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">取消</button><button class="btn btn-sm btn-primary" :disabled="catSubmitting" @click="onSaveCategory">{{ catSubmitting?'保存中...':'保存' }}</button></div>
        </div>
      </div>
    </div>

    <div class="modal fade" ref="catManageRef" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius:12px;">
          <div class="modal-header border-0 px-4 pt-4 pb-2"><h6 class="modal-title fw-bold">管理分类</h6><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body px-4 pb-3" style="max-height:55vh;overflow-y:auto;">
            <div v-for="l1 in catTree" :key="l1.id" class="mb-3">
              <div class="d-flex align-items-center justify-content-between mb-1 px-2 py-1 rounded" style="background:#f0f7ff;"><span class="fw-bold" style="font-size:0.9rem;">📁 {{ l1.name }}</span><button class="btn btn-sm text-danger p-0" style="font-size:0.75rem;" @click="onDeleteCategory(l1.id)">✕</button></div>
              <div v-for="l2 in l1.children" :key="l2.id" class="d-flex align-items-center justify-content-between ms-3 mb-1 px-2 py-1 rounded" style="background:#f8f9fa;"><span style="font-size:0.85rem;">📄 {{ l2.name }}</span><button class="btn btn-sm text-muted p-0" style="font-size:0.7rem;" @click="onDeleteCategory(l2.id)">✕</button></div>
              <div v-if="!l1.children.length" class="text-muted ms-3 small">暂无二级分类</div>
            </div>
            <div v-if="!catTree.length" class="text-center text-muted py-3">暂无分类</div>
          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2"><button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">关闭</button></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.float-input { position: relative; padding-top: 12px; }
.fi-control { width: 100%; border: none; outline: none; background: transparent; font-size: 0.9rem; padding: 8px 0; color: #333; border-bottom: 1px solid #ddd; border-radius: 0; transition: border-color 0.25s; }
.fi-control:focus { border-bottom-color: #52CDFF; }
.fi-control::placeholder { color: transparent; }
.fi-label { position: absolute; left: 0; top: 50%; transform: translateY(-50%); font-size: 0.85rem; color: #aaa; pointer-events: none; transition: all 0.25s ease; white-space: nowrap; }
.fi-control:focus + .fi-label, .fi-control:not(:placeholder-shown) + .fi-label { top: -2px; transform: translateY(0); font-size: 0.7rem; color: #52CDFF; }
.fi-control:not(:placeholder-shown):not(:focus) + .fi-label { color: #999; }
.fi-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: #52CDFF; transform: scaleX(0); transition: transform 0.3s ease; }
.fi-control:focus ~ .fi-bar { transform: scaleX(1); }
</style>
