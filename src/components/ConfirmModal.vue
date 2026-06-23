<script setup>
import { ref, watch } from 'vue'
import { Modal } from 'bootstrap'

const props = defineProps({
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: { type: String, default: '确定' },
  variant: { type: String, default: 'danger' }
})

const emit = defineEmits(['confirm', 'cancel'])

const modalRef = ref(null)
let modalInstance = null

function show() {
  if (!modalInstance) {
    modalInstance = new Modal(modalRef.value)
  }
  modalInstance.show()
}

function hide() {
  modalInstance?.hide()
}

function onConfirm() {
  emit('confirm')
  hide()
}

function onCancel() {
  emit('cancel')
  hide()
}

defineExpose({ show, hide })
</script>

<template>
  <div class="modal fade" ref="modalRef" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ title }}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="mb-0">{{ message }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
          <button type="button" class="btn" :class="`btn-${variant}`" @click="onConfirm">{{ confirmText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
