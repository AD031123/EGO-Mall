<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast.js'
import { getPendingReturns, approveReturn, rejectReturn } from '@/api/products.js'

const toast = useToast()
const returns = ref([])
const loading = ref(false)
const rejectDialogVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')

async function loadReturns() {
  loading.value = true
  try {
    const r = await getPendingReturns()
    if (r.code === 0) returns.value = r.data
  } catch (e) { console.error('加载退货列表失败:', e) }
  finally { loading.value = false }
}

async function onApprove(item) {
  if (!confirm('确认同意该退货申请？')) return
  try {
    const r = await approveReturn(item.id)
    if (r.code === 0) {
      toast.success('已同意退货')
      await loadReturns()
    } else {
      toast.error(r.message || '操作失败')
    }
  } catch { toast.error('操作失败') }
}

function openRejectDialog(item) {
  rejectTarget.value = item
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function onReject() {
  if (!rejectReason.value.trim()) { toast.warn('请输入拒绝理由'); return }
  try {
    const r = await rejectReturn(rejectTarget.value.id, rejectReason.value.trim())
    if (r.code === 0) {
      toast.success('已拒绝退货')
      rejectDialogVisible.value = false
      await loadReturns()
    } else {
      toast.error(r.message || '操作失败')
    }
  } catch { toast.error('操作失败') }
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(loadReturns)
defineExpose({ loadReturns })
</script>

<template>
  <div>
    <h5 class="fw-bold mb-4" style="color: #333;">🔔 退货管理</h5>

    <!-- 加载中 -->
    <div v-if="loading" class="text-center py-5 text-muted">
      <div class="spinner-border" style="color:#52CDFF;"></div>
      <p class="mt-2">加载中...</p>
    </div>

    <!-- 空态 -->
    <div v-else-if="!returns.length" class="text-center py-5 text-muted">
      <div style="font-size:3rem;">🔔</div>
      <p class="mt-2">暂无待处理退货</p>
    </div>

    <!-- 列表 -->
    <div v-else class="return-list">
      <div v-for="item in returns" :key="item.id" class="card border-0 shadow-sm mb-3">
        <div class="card-body p-4">
          <div class="d-flex align-items-start justify-content-between mb-3">
            <div>
              <h6 class="fw-bold mb-1">{{ item.product_name }}</h6>
              <div class="text-muted" style="font-size:0.82rem;">
                订单号: {{ item.order_id }} | 用户: {{ item.username }}
              </div>
              <div class="mt-1">
                <span class="badge" style="background:#fff3cd;color:#856404;font-size:0.72rem;">
                  申请时间: {{ formatDate(item.return_processed_at) }}
                </span>
              </div>
            </div>
            <span class="fw-bold" style="color:#ff4d4f;">¥{{ Number(item.total_amount || 0).toFixed(2) }}</span>
          </div>

          <!-- 退货理由 -->
          <div class="p-3 rounded-3 mb-3" style="background:#f8f9fa;">
            <div class="fw-semibold mb-1" style="font-size:0.82rem;">📝 退货理由:</div>
            <div style="font-size:0.88rem;color:#555;">{{ item.return_reason || '未提供理由' }}</div>
          </div>

          <!-- 操作按钮 -->
          <div class="d-flex gap-2 justify-content-end">
            <button class="btn btn-sm rounded-pill px-4" style="background:#28a745;color:#fff;" @click="onApprove(item)">
              ✓ 同意
            </button>
            <button class="btn btn-sm rounded-pill px-4" style="background:#ff4d4f;color:#fff;" @click="openRejectDialog(item)">
              ✕ 拒绝
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 拒绝理由弹窗 -->
    <div v-if="rejectDialogVisible" class="position-fixed d-flex align-items-center justify-content-center"
      style="inset:0;background:rgba(0,0,0,0.6);z-index:20000;" @click.self="rejectDialogVisible = false">
      <div class="bg-white rounded-3 p-4" style="width:420px;box-shadow:0 12px 50px rgba(0,0,0,0.3);">
        <h5 class="fw-bold mb-3">拒绝退货</h5>
        <p class="text-muted small mb-2">商品: {{ rejectTarget?.product_name }}</p>
        <label class="form-label small fw-semibold">拒绝理由 <span style="color:#ff4d4f;">*</span></label>
        <textarea v-model="rejectReason" class="form-control mb-3" rows="3" placeholder="请输入拒绝理由..."></textarea>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" @click="rejectDialogVisible = false">取消</button>
          <button class="btn btn-sm rounded-pill px-4" style="background:#ff4d4f;color:#fff;" @click="onReject">确认拒绝</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.return-list {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}
.return-list::-webkit-scrollbar { width: 4px; }
.return-list::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
</style>
