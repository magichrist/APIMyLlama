import { ref } from 'vue'
import { api } from '../api.js'

const health = ref({ status: 'degraded', ollama: 'unreachable', serverStart: '' })
const lastUpdated = ref('')
const refreshing = ref(false)
const autoRefresh = ref(true)
const fetchLatency = ref(null)

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
  }
}

export function useServerHealth() {
  return { health, lastUpdated, refreshing, autoRefresh, fetchLatency, setHealthData, setLatency, toggleAutoRefresh, refresh }
}
