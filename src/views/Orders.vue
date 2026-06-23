<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Modal } from 'bootstrap'
import { getOrders, updateOrder, deleteOrder } from '@/api/products.js'
import { getMyOrderDetail } from '@/api/shop.js'
import { useToast } from '@/composables/useToast.js'

const toast = useToast()

/* ===== 分组列表 ===== */
const groupedOrders = ref([])  // [{order_id, username, status, total, created_at, address_snapshot, items:[...]}]
const allOrders = ref([])      // 原始数据
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const filters = reactive({ keyword: '', status: '' })

/* ===== 模态框 ===== */
const viewModalRef = ref(null)
let viewModalInst = null
const viewingGroup = ref(null)   // 当前查看的订单组
const viewingItems = ref([])
const form = reactive({ status: 1 })
const submitting = ref(false)

onMounted(() => { loadOrders() })

function groupOrders(rows) {
  const map = new Map()
  for (const o of rows) {
    if (!map.has(o.order_id)) {
      map.set(o.order_id, {
        _id: o.id,
        order_id: o.order_id,
        user_id: o.user_id,
        username: o.username,
        status: o.status,
        created_at: o.created_at,
        address_snapshot: o.address_snapshot,
        total: 0,
        itemCount: 0,
        items: []
      })
    }
    const g = map.get(o.order_id)
    g.items.push(o)
    g.itemCount++
    g.total += Number(o.total_amount || 0)
    // 取最新的 id（用于删除等操作）
    if (o.id > g._id) g._id = o.id
  }
  return [...map.values()]
}

async function loadOrders() {
  try {
    const p = { page: page.value, pageSize: 500 }  // 一次取足够多
    if (filters.keyword) p.keyword = filters.keyword
    if (filters.status !== '') p.status = filters.status
    const res = await getOrders(p)
    allOrders.value = res.data.list
    total.value = res.data.total
    const grouped = groupOrders(res.data.list)
    // 按页分片——分页按订单号数计算
    const start = (page.value - 1) * pageSize.value
    groupedOrders.value = grouped.slice(start, start + pageSize.value)
    total.value = grouped.length  // 总数改为订单号数
  } catch (e) { toast.error('加载失败：' + e.message) }
}
function onSearch() { page.value = 1; loadOrders() }
function goPage(pg) { page.value = pg; loadOrders() }
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

function statusText(s) {
  return s === 1 ? '待发货' : s === 2 ? '已发货' : s === 3 ? '已完成' : s === 4 ? '已取消' : '-'
}
function statusClass(s) {
  return s === 1 ? 'on' : s === 3 ? 'completed' : s === 4 ? 'off' : 'warn'
}

/* ===== 查看订单 ===== */
async function showView(group) {
  try {
    viewingGroup.value = group
    viewingItems.value = group.items
    form.status = group.status

    // 尝试获取完整详情（含地址）
    try {
      const r = await getMyOrderDetail(group.order_id)
      if (r.code === 0) {
        viewingGroup.value = r.data
        viewingItems.value = r.data.items
        form.status = r.data.status
      }
    } catch {}

    if (!viewModalInst) viewModalInst = new Modal(viewModalRef.value)
    viewModalInst.show()
  } catch (e) { toast.error('加载订单详情失败') }
}

async function onSaveStatus() {
  // 更新该 order_id 下所有行的状态
  submitting.value = true
  try {
    for (const item of viewingItems.value) {
      await updateOrder(item.id, { status: Number(form.status) })
    }
    viewingGroup.value.status = Number(form.status)
    loadOrders()
    toast.success('状态已更新')
    viewModalInst.hide()
  } catch (e) { toast.error('更新失败：' + e.message) }
  finally { submitting.value = false }
}

/* ===== 删除 ===== */
async function onDeleteGroup(orderId) {
  if (!confirm('确定删除该订单（' + orderId + '）及其中所有商品？')) return
  try {
    // 找到该 order_id 下所有行的 id
    const items = allOrders.value.filter(o => o.order_id === orderId)
    for (const item of items) {
      await deleteOrder(item.id)
    }
    loadOrders()
    toast.success('已删除')
  } catch (e) { toast.error('删除失败：' + e.message) }
}

/* ===== 复制 ===== */
function onCopy(text) {
  navigator.clipboard.writeText(text).then(() => toast.success('已复制'))
    .catch(() => toast.error('复制失败'))
}

/* ===== 时间/地址 ===== */
function fmtDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
}

function parseAddr(a) {
  if (!a) return null
  if (typeof a === 'string') { try { return JSON.parse(a) } catch { return a } }
  return a
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h5 class="fw-bold mb-0" style="color:#333;">📋 订单管理</h5>
      <small class="text-muted">共 {{ groupedOrders.length }} 组订单</small>
    </div>

    <!-- 搜索 -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="toolbar">
          <input v-model="filters.keyword" class="form-control" placeholder="搜索订单号/用户名/商品..." style="width:220px;" @keyup.enter="onSearch" />
          <select v-model="filters.status" class="form-select" @change="onSearch">
            <option value="">全部状态</option>
            <option :value="1">待发货</option><option :value="2">已发货</option><option :value="3">已完成</option><option :value="4">已取消</option>
          </select>
          <button class="btn btn-outline-secondary btn-sm" @click="filters.keyword='';filters.status='';onSearch()">重置</button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div class="card">
      <div class="table-responsive">
        <table class="table product-table mb-0">
          <thead><tr><th>订单号</th><th>用户</th><th>商品数</th><th>总金额</th><th>状态</th><th>时间</th><th style="width:150px;">操作</th></tr></thead>
          <tbody>
            <tr v-if="!groupedOrders.length"><td colspan="7" class="text-center text-muted py-4">暂无订单</td></tr>
            <tr v-for="g in groupedOrders" :key="g.order_id">
              <td><code class="small" style="font-size:0.75rem;">{{ g.order_id }}</code></td>
              <td>{{ g.username || '-' }}</td>
              <td>{{ g.itemCount }} 件</td>
              <td class="fw-bold" style="color:#ff4d4f;">¥{{ g.total.toFixed(2) }}</td>
              <td><span :class="['status-badge', statusClass(g.status)]">{{ statusText(g.status) }}</span></td>
              <td class="small text-muted">{{ fmtDate(g.created_at) }}</td>
              <td>
                <button class="btn btn-outline-primary btn-sm me-1" @click="showView(g)">查看</button>
                <button class="btn btn-outline-danger btn-sm" @click="onDeleteGroup(g.order_id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer d-flex align-items-center justify-content-between" v-if="total > 0">
        <small class="text-muted">共 {{ total }} 条记录，第 {{ page }}/{{ totalPages }} 页</small>
        <nav><ul class="pagination pagination-sm mb-0">
          <li class="page-item" :class="{disabled:page<=1}"><a class="page-link" href="#" @click.prevent="goPage(page-1)">上一页</a></li>
          <li v-for="p in totalPages" :key="p" class="page-item" :class="{active:p===page}"><a class="page-link" href="#" @click.prevent="goPage(p)">{{ p }}</a></li>
          <li class="page-item" :class="{disabled:page>=totalPages}"><a class="page-link" href="#" @click.prevent="goPage(page+1)">下一页</a></li>
        </ul></nav>
      </div>
    </div>

    <!-- 查看模态框 -->
    <div class="modal fade" ref="viewModalRef" tabindex="-1">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg" style="border-radius:12px;">
          <div class="modal-header border-0 px-4 pt-4 pb-2"><h5 class="modal-title fw-bold">📋 订单详情</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
          <div class="modal-body px-4 pb-3" style="max-height:60vh;overflow-y:auto;">

            <!-- 商品列表 -->
            <div v-for="item in viewingItems" :key="item.id" class="d-flex align-items-center gap-3 p-2 mb-2 rounded" style="background:#f9fafb;">
              <div class="rounded overflow-hidden flex-shrink-0" style="width:56px;height:56px;background:#eee;">
                <img v-if="item.main_image" :src="item.main_image" style="width:100%;height:100%;object-fit:cover;" />
                <div v-else class="d-flex align-items-center justify-content-center text-muted" style="width:100%;height:100%;font-size:1.3rem;">📦</div>
              </div>
              <div class="flex-grow-1 min-w-0">
                <div class="fw-medium text-truncate" style="font-size:0.9rem;">{{ item.product_name }}</div>
                <div class="d-flex gap-3 mt-1" style="font-size:0.82rem;color:#666;">
                  <span>数量: {{ item.quantity }}</span>
                  <span>单价: ¥{{ Number(item.unit_price).toFixed(2) }}</span>
                  <span>小计: <b style="color:#ff4d4f;">¥{{ Number(item.total_amount).toFixed(2) }}</b></span>
                </div>
              </div>
            </div>

            <hr />

            <!-- 订单号 + 复制 -->
            <div class="d-flex align-items-center gap-2 mb-3">
              <label class="form-label small fw-semibold mb-0">订单号:</label>
              <code>{{ viewingGroup?.order_id }}</code>
              <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" style="font-size:0.75rem;" @click="onCopy(viewingGroup?.order_id)">📋 复制</button>
            </div>

            <!-- 收货地址 -->
            <div class="mb-3">
              <label class="form-label small fw-semibold mb-1">收货地址</label>
              <div class="p-2 rounded small" style="background:#f8f9fa;">
                <template v-if="viewingGroup?.address_snapshot">
                  <span v-if="typeof viewingGroup.address_snapshot === 'string'">
                    {{ viewingGroup.address_snapshot }}
                  </span>
                  <span v-else>
                    {{ parseAddr(viewingGroup.address_snapshot)?.receiver_name || '' }}
                    {{ parseAddr(viewingGroup.address_snapshot)?.phone || '' }}&nbsp;
                    {{ [parseAddr(viewingGroup.address_snapshot)?.province, parseAddr(viewingGroup.address_snapshot)?.city, parseAddr(viewingGroup.address_snapshot)?.district, parseAddr(viewingGroup.address_snapshot)?.detail].join(' ') }}
                  </span>
                </template>
                <span v-else class="text-muted">暂无地址信息</span>
              </div>
            </div>

            <!-- 发货状态 -->
            <div class="d-flex align-items-center gap-3">
              <label class="form-label small fw-semibold mb-0">发货状态:</label>
              <select v-model="form.status" class="form-select form-select-sm" style="width:140px;">
                <option :value="1">待发货</option><option :value="2">已发货</option><option :value="3">已完成</option><option :value="4">已取消</option>
              </select>
              <button class="btn btn-sm btn-primary rounded-pill px-4" :disabled="submitting" @click="onSaveStatus">{{ submitting?'保存中...':'更新状态' }}</button>
            </div>

          </div>
          <div class="modal-footer border-0 px-4 pb-4 pt-2">
            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-badge.completed { background:#e6f7e6; color:#52c41a; }
.status-badge.warn { background:#fff7e6; color:#ff9800; }
</style>
