import { ref, computed } from 'vue'
import { api } from '../api.js'

const health = ref({ status: 'degraded', ollama: 'unreachable', serverStart: '' })
const lastUpdated = ref('')
const refreshing = ref(false)
const autoRefresh = ref(true)
const fetchLatency = ref(null)
const cooldown = ref(false)

const onCooldown = computed(() => cooldown.value)

function setHealthData(data) {
  health.value = data
  lastUpdated.value = new Date().toLocaleTimeString()
}

function setLatency(ms) {
  fetchLatency.value = Math.round(ms * 10) / 10
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
}

async function refresh() {
  if (cooldown.value) return
  refreshing.value = true
  try {
    const t0 = performance.now()
    const data = await api.getHealth()
    const t1 = performance.now()
    setHealthData(data)
    setLatency(t1 - t0)
  } catch (e) {
    health.value = { status: 'unreachable', ollama: 'unreachable', serverStart: '' }
  } finally {
    refreshing.value = false
    cooldown.value = true
    setTimeout(() => { cooldown.value = false }, 5000)
  }
}

export function useServerHealth() {
  return { health, lastUpdated, refreshing, autoRefresh, fetchLatency, onCooldown, setHealthData, setLatency, toggleAutoRefresh, refresh }
}
