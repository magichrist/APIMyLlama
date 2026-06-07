import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcut(key, handler) {
  function onKeyDown(e) {
    if (e.key.toLowerCase() !== key.toLowerCase()) return
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    handler(e)
  }
  onMounted(() => document.addEventListener('keydown', onKeyDown))
  onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
}
