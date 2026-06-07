import { ref } from 'vue'

const visible = ref(false)
let loadCount = 0
let hideTimer = null

function start() {
  loadCount++
  clearTimeout(hideTimer)
  visible.value = true
}

function stop() {
  loadCount = Math.max(0, loadCount - 1)
  if (loadCount === 0) {
    hideTimer = setTimeout(() => { visible.value = false }, 200)
  }
}

export function useLoadingBar() {
  return { visible, start, stop }
}
