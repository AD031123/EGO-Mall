import { ref } from 'vue'

// 全局共享的 toasts 数组
const toasts = ref([])
let _id = 0

export function useToast() {
  function add(message, type = 'info', duration = 3000) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }

  function remove(id) {
    const i = toasts.value.findIndex(t => t.id === id)
    if (i >= 0) toasts.value.splice(i, 1)
  }

  return {
    toasts,
    success(msg, duration) { add(msg, 'success', duration ?? 3000) },
    error(msg, duration) { add(msg, 'error', duration ?? 5000) },
    warn(msg, duration) { add(msg, 'warn', duration ?? 4000) },
    info(msg, duration) { add(msg, 'info', duration ?? 3000) },
    remove
  }
}
