<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast.js'
import { getMyOrders, getMyOrderDetail } from '@/api/shop.js'

const toast = useToast()
const router = useRouter()
const orders = ref([])
const loading = ref(false)
const expandedOrderId = ref(null) // 当前展开的 order_id

onMounted(async () => {
  const userStr = localStorage.getItem('ego_user')
  if (!userStr) { router.push('/login'); return }
  try {
    const user = JSON.parse(userStr)
    loading.value = true
    const r = await getMyOrders({ user_id: user.id, pageSize: 50 })
    if (r.code === 0) {
      // 按 order_id 分组
      const grouped = new Map()
      for (const o of r.data.list) {
        if (!grouped.has(o.order_id)) {
          grouped.set(o.order_id, {
            order_id: o.order_id,
            created_at: o.created_at,
            status: o.status,
            address_snapshot: o.address_snapshot,
            items: [],
            total: 0
          })
        }
        const g = grouped.get(o.order_id)
        g.items.push(o)
        g.total += Number(o.total_amount || 0)
      }
      orders.value = [...grouped.values()]
    }
  } catch (e) { toast.error('加载订单失败') }
  finally { loading.value = false }
})

function toggleExpand(orderId) {
  expandedOrderId.value = expandedOrderId.value === orderId ? null : orderId
}

function parseAddress(addr) {
  if (!addr) return null
  if (typeof addr === 'string') {
    try { return JSON.parse(addr) } catch { return addr }
  }
  return addr
}

function statusText(s) {
  return s === 1 ? '待发货' : s === 2 ? '已发货' : s === 3 ? '已完成' : s === 4 ? '已取消' : '处理中'
}

function fmtDate(d) {
  if (!d) return '-'
  const dt = new Date(d)
  return dt.toLocaleDateString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
}
</script>

<template>
  <div class="container py-4" style="max-width: 900px; margin: 0 auto;">
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h5 class="fw-bold mb-0">📋 我的订单</h5>
      <router-link to="/" class="btn btn-sm btn-outline-secondary rounded-pill">继续购物</router-link>
    </div>

    <!-- 空态 -->
    <div v-if="!loading && !orders.length" class="text-center text-muted py-5">
      <div style="font-size:4rem;">📦</div>
      <p class="mt-2">暂无订单</p>
      <router-link to="/" class="btn btn-sm rounded-pill px-4" style="background:#52CDFF;color:#fff;">去逛逛</router-link>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-5 text-muted">加载中...</div>

    <!-- 订单列表 -->
    <div v-for="order in orders" :key="order.order_id" class="card border-0 shadow-sm mb-3" style="border-radius:12px;overflow:hidden;">
      <!-- 订单头部 -->
      <div class="d-flex align-items-center justify-content-between px-4 py-3" style="background:#fafafa;cursor:pointer;" @click="toggleExpand(order.order_id)">
        <div class="d-flex align-items-center gap-3">
          <span class="small text-muted">{{ fmtDate(order.created_at) }}</span>
          <span class="small text-muted">订单号: {{ order.order_id }}</span>
          <span class="badge rounded-pill" :style="{background: order.status===1?'#52CDFF':order.status===3?'#52c41a':order.status===4?'#999':'#ff9800',color:'#fff',fontWeight:400}">
            {{ statusText(order.status) }}
          </span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="fw-bold" style="color:#ff4d4f;">¥{{ order.total.toFixed(2) }}</span>
          <span style="font-size:0.8rem;color:#999;transition:transform 0.2s;" :style="{transform: expandedOrderId===order.order_id?'rotate(180deg)':'rotate(0)'}">▼</span>
        </div>
      </div>

      <!-- 展开详情 -->
      <div v-if="expandedOrderId === order.order_id" class="px-4 py-3" style="background:#fff;">
        <!-- 商品列表 -->
        <div v-for="item in order.items" :key="item.id" class="d-flex align-items-center gap-3 py-2" style="border-bottom:1px solid #f5f5f5;">
          <div class="fw-medium flex-grow-1" style="font-size:0.85rem;">{{ item.product_name }}</div>
          <div class="text-muted" style="font-size:0.8rem;">¥{{ Number(item.unit_price).toFixed(2) }} × {{ item.quantity }}</div>
          <div class="fw-bold" style="color:#ff4d4f;font-size:0.85rem;">¥{{ Number(item.total_amount).toFixed(2) }}</div>
        </div>

        <!-- 地址信息 -->
        <div v-if="parseAddress(order.address_snapshot)" class="mt-3 p-2 rounded" style="background:#f8f9fa;font-size:0.82rem;">
          <span class="text-muted">📍 收货地址：</span>
          <span>{{ parseAddress(order.address_snapshot).receiver_name || '' }}
            {{ parseAddress(order.address_snapshot).phone || '' }}&nbsp;
            {{ [parseAddress(order.address_snapshot).province, parseAddress(order.address_snapshot).city, parseAddress(order.address_snapshot).district, parseAddress(order.address_snapshot).detail].join(' ') }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
