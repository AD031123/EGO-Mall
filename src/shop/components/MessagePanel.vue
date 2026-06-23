<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getReturnMessages } from '@/api/shop.js'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const messages = ref([])
const loading = ref(false)
const unreadCount = ref(0)

async function loadMessages() {
  // 未登录时跳过
  const egoCookie = localStorage.getItem('ego_cookie')
  if (!egoCookie) { messages.value = []; return }
  loading.value = true
  try {
    const r = await getReturnMessages()
    if (r.code === 0) {
      messages.value = r.data
      unreadCount.value = r.data.length
    }
  } catch { messages.value = [] }
  finally { loading.value = false }
}

function messageText(msg) {
  if (msg.return_status === 2) return `退货申请【${msg.product_name}】已通过 ✓`
  if (msg.return_status === 3) {
    const reason = msg.return_reject_reason ? ` 原因: ${msg.return_reject_reason}` : ''
    return `退货申请【${msg.product_name}】已拒绝 ✕` + reason
  }
  return `退货申请【${msg.product_name}】已提交，等待审核...`
}

function messageClass(msg) {
  if (msg.return_status === 2) return 'msg-success'
  if (msg.return_status === 3) return 'msg-error'
  return 'msg-pending'
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

onMounted(loadMessages)

watch(() => props.open, (v) => { if (v) loadMessages() })

defineExpose({ unreadCount, loadMessages })
</script>

<template>
  <!-- 触发器由父组件渲染 -->
  <div v-if="open" class="position-fixed d-flex align-items-start justify-content-center"
    style="inset:0;z-index:21000;padding-top:80px;"
    @click.self="emit('close')">
    <div class="bg-white rounded-3 shadow-lg" style="width:420px;max-height:70vh;overflow:hidden;display:flex;flex-direction:column;">
      <div class="d-flex align-items-center justify-content-between px-4 py-3" style="border-bottom:1px solid #eee;">
        <span class="fw-bold">📨 消息 ({{ messages.length }})</span>
        <button class="btn btn-sm border-0" style="font-size:1.2rem;color:#999;" @click="emit('close')">✕</button>
      </div>

      <div class="overflow-auto" style="flex:1;">
        <div v-if="loading" class="text-center py-4 text-muted">加载中...</div>
        <div v-else-if="!messages.length" class="text-center py-5 text-muted">
          <div style="font-size:2.5rem;">📨</div>
          <p class="mt-2">暂无消息</p>
        </div>
        <div v-else>
          <div v-for="msg in messages" :key="msg.id" class="px-4 py-3" style="border-bottom:1px solid #f5f5f5;">
            <div class="d-flex align-items-start gap-2">
              <span :class="['msg-dot', messageClass(msg)]"></span>
              <div>
                <div style="font-size:0.88rem;color:#333;line-height:1.5;">{{ messageText(msg) }}</div>
                <div style="font-size:0.72rem;color:#999;margin-top:4px;">{{ formatDate(msg.return_processed_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.msg-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
}
.msg-success { background: #28a745; }
.msg-error { background: #ff4d4f; }
.msg-pending { background: #ffc107; }
</style>
