<script setup>
import { ref } from 'vue'
import { useToast } from '@/composables/useToast.js'

const props = defineProps({ visible: { type: Boolean, default: false }, address: { type: Object, default: null } })
const emit = defineEmits(['close', 'save'])

const toast = useToast()
const form = ref({
  receiver_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false
})

// 初始化（编辑模式）
import { watch } from 'vue'
watch(() => props.visible, (v) => {
  if (v && props.address) {
    form.value = {
      receiver_name: props.address.receiver_name || '',
      phone: props.address.phone || '',
      province: props.address.province || '',
      city: props.address.city || '',
      district: props.address.district || '',
      detail: props.address.detail || '',
      is_default: !!props.address.is_default
    }
  } else if (v && !props.address) {
    form.value = { receiver_name: '', phone: '', province: '', city: '', district: '', detail: '', is_default: false }
  }
})

function doSave() {
  const f = form.value
  if (!f.province || !f.city || !f.district || !f.detail || !f.phone) {
    toast.warn('请将地址信息填写完整')
    return
  }
  emit('save', { ...f })
}

function onCancel() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="position-fixed d-flex align-items-center justify-content-center"
    style="inset:0;background:rgba(0,0,0,0.6);z-index:20000;" @click.self="onCancel">
    <div class="bg-white rounded-3 p-4" style="width:420px;max-height:90vh;overflow-y:auto;box-shadow:0 12px 50px rgba(0,0,0,0.3);">
      <h5 class="fw-bold mb-3">{{ address ? '编辑地址' : '新增送货地址' }}</h5>

      <div class="row g-2 mb-2">
        <div class="col-6">
          <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">收件人</label>
          <input v-model="form.receiver_name" class="form-control form-control-sm" placeholder="姓名" />
        </div>
        <div class="col-6">
          <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">电话 <span style="color:#ff4d4f;">*</span></label>
          <input v-model="form.phone" class="form-control form-control-sm" placeholder="手机号" />
        </div>
      </div>
      <div class="row g-2 mb-2">
        <div class="col-4">
          <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">省 <span style="color:#ff4d4f;">*</span></label>
          <input v-model="form.province" class="form-control form-control-sm" placeholder="省" />
        </div>
        <div class="col-4">
          <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">市 <span style="color:#ff4d4f;">*</span></label>
          <input v-model="form.city" class="form-control form-control-sm" placeholder="市" />
        </div>
        <div class="col-4">
          <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">区 <span style="color:#ff4d4f;">*</span></label>
          <input v-model="form.district" class="form-control form-control-sm" placeholder="区/县" />
        </div>
      </div>
      <div class="mb-2">
        <label class="form-label small fw-semibold" style="font-size:0.75rem;color:#999;">详细地址 <span style="color:#ff4d4f;">*</span></label>
        <input v-model="form.detail" class="form-control form-control-sm" placeholder="街道/门牌号" />
      </div>
      <div class="mb-3">
        <label class="form-check-label small">
          <input v-model="form.is_default" type="checkbox" class="form-check-input" /> 设为默认地址
        </label>
      </div>

      <div class="d-flex justify-content-end gap-3">
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-4" @click="onCancel">取消</button>
        <button class="btn btn-sm rounded-pill px-4" style="background:#52CDFF;color:#fff;" @click="doSave">保存</button>
      </div>
    </div>
  </div>
</template>
