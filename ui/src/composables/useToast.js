import { ref } from 'vue'

const toasts = ref([])
let nextId = 0

export function useToast() {
  function add(type, title, message, duration = 4000) {
    const id = ++nextId
    toasts.value.push({ id, type, title, message })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
  }

  function remove(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  function success(title, message) { add('success', title, message) }
  function error(title, message) { add('error', title, message) }
  function info(title, message) { add('info', title, message) }
  function warning(title, message) { add('warning', title, message) }

  return { toasts, add, remove, success, error, info, warning }
}
