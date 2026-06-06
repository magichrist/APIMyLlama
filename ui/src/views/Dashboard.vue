<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <Header title="Dashboard" @search="onSearch" />
    <main class="flex-1 overflow-y-auto p-6">
      <div v-if="initialLoading" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
            <div class="h-4 bg-gray-800 rounded w-24 mb-4"></div>
            <div class="h-8 bg-gray-800 rounded w-20 mb-2"></div>
            <div class="h-3 bg-gray-800 rounded w-32"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
            <div class="h-4 bg-gray-800 rounded w-32 mb-4"></div>
            <div class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-10 bg-gray-800 rounded"></div>
            </div>
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse">
            <div class="h-4 bg-gray-800 rounded w-28 mb-4"></div>
            <div class="space-y-4">
              <div v-for="i in 4" :key="i">
                <div class="h-3 bg-gray-800 rounded w-16 mb-2"></div>
                <div class="h-2 bg-gray-800 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <Icon name="warning" class="w-16 h-16 text-red-400/50 mx-auto mb-4" />
        <h2 class="text-lg font-semibold text-white mb-2">Server Unreachable</h2>
        <p class="text-sm text-gray-400 mb-6 max-w-md mx-auto">Could not connect to the APIMyLlama backend. Make sure the server is running on port 3000 and try again.</p>
        <button @click="loadData" class="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors">
          Retry Connection
        </button>
      </div>

      <template v-else>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div :class="['w-2 h-2 rounded-full', health.ollama === 'reachable' ? 'bg-emerald-400' : 'bg-amber-400']"></div>
            <span class="text-xs text-gray-500">
              Server {{ health.status }} —
              Ollama {{ health.ollama === 'reachable' ? 'connected' : 'disconnected' }}
              <span v-if="health.ollamaError" class="text-amber-400">({{ health.ollamaError }})</span>
            </span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-600">Last updated: {{ lastUpdated }}</span>
            <button @click="loadData" :disabled="refreshing"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
              <Icon :class="['w-3.5 h-3.5', refreshing && 'animate-spin']" name="refresh" />
              {{ refreshing ? 'Refreshing...' : 'Refresh' }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Requests"
            :value="formatNumber(stats.totalRequests)"
            subtitle="All time"
            :change="'+' + formatNumber(stats.recentRequests) + ' today'"
            icon="chart"
            icon-bg="bg-indigo-500/10"
            icon-color="text-indigo-400"
          />
          <StatCard
            title="Active Keys"
            :value="stats.activeKeys"
            :subtitle="'Of ' + stats.totalKeys + ' total'"
            :change="'+' + stats.uniqueKeysUsed + ' used today'"
            icon="key"
            icon-bg="bg-emerald-500/10"
            icon-color="text-emerald-400"
          />
          <StatCard
            title="Avg Latency"
            :value="stats.avgLatency + 'ms'"
            subtitle="Last 24 hours"
            change="—"
            icon="clock"
            icon-bg="bg-amber-500/10"
            icon-color="text-amber-400"
          />
          <StatCard
            title="Server Uptime"
            :value="uptime"
            subtitle="Since server start"
            :change="health.ollama === 'reachable' ? 'Ollama OK' : 'Ollama Down'"
            :changeClass="health.ollama === 'reachable' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'"
            :icon="health.ollama === 'reachable' ? 'shield' : 'warning'"
            icon-bg="bg-emerald-500/10"
            icon-color="text-emerald-400"
          />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div class="lg:col-span-2">
            <ActivityTable :activities="filteredActivities" />
          </div>
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 class="text-sm font-semibold text-white mb-4">Usage Overview</h2>
            <div class="space-y-4">
              <div v-for="model in modelUsage" :key="model.name">
                <div class="flex justify-between text-sm mb-1.5">
                  <span class="text-gray-400">{{ model.name }}</span>
                  <span class="text-gray-300 font-medium">{{ model.usage }}%<span class="text-gray-500 ml-1 font-normal">· {{ model.count }}</span></span>
                </div>
                <div class="w-full bg-gray-800 rounded-full h-2">
                  <div class="h-2 rounded-full transition-all" :style="{ width: model.usage + '%', background: model.color }"></div>
                </div>
              </div>
            </div>
            <div v-if="modelUsage.length === 0" class="text-gray-500 text-sm text-center py-8">No usage data yet — make an API request to see model usage.</div>
          </div>
        </div>

        <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-white">Quick Actions</h2>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button @click="$router.push('/keys')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700 transition-all text-center group">
              <Icon name="plus" class="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span class="text-xs text-gray-400 font-medium">Create API Key</span>
            </button>
            <button @click="$router.push('/keys')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700 transition-all text-center group">
              <Icon name="key" class="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span class="text-xs text-gray-400 font-medium">Manage Keys</span>
            </button>
            <button @click="$router.push('/settings')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700 transition-all text-center group">
              <Icon name="webhook" class="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
              <span class="text-xs text-gray-400 font-medium">Webhooks</span>
            </button>
            <button @click="$router.push('/settings')"
              class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 hover:border-gray-700 transition-all text-center group">
              <Icon name="settings" class="w-6 h-6 text-violet-400 group-hover:scale-110 transition-transform" />
              <span class="text-xs text-gray-400 font-medium">Settings</span>
            </button>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import Header from '../components/Header.vue'
import StatCard from '../components/StatCard.vue'
import ActivityTable from '../components/ActivityTable.vue'
import Icon from '../components/Icon.vue'

const initialLoading = ref(true)
const refreshing = ref(false)
const error = ref(false)
const stats = ref({})
const health = ref({ status: 'degraded', ollama: 'unreachable' })
const activities = ref([])
const uptime = ref('0s')
const lastUpdated = ref('')
const serverStartTime = ref(null)
const modelUsage = ref([])
const searchQuery = ref('')

let refreshTimer = null

const filteredActivities = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return activities.value
  return activities.value.filter(a =>
    a.detail?.toLowerCase().includes(q) ||
    a.key?.toLowerCase().includes(q) ||
    a.event?.toLowerCase().includes(q)
  )
})

function onSearch(q) { searchQuery.value = q }

function maskKey(key) {
  if (!key) return ''
  return key.substring(0, 8) + '••••' + key.substring(key.length - 4)
}

function formatNumber(n) {
  if (n === undefined || n === null) return '0'
  return Number(n).toLocaleString()
}

function timeAgo(ts) {
  if (!ts) return ''
  const secs = Math.floor((Date.now() - new Date(ts + 'Z').getTime()) / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return secs + 's ago'
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago'
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago'
  return Math.floor(secs / 86400) + 'd ago'
}

function formatUptime(ms) {
  const secs = Math.floor(ms / 1000)
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function updateUptime() {
  if (!serverStartTime.value) return
  uptime.value = formatUptime(Date.now() - serverStartTime.value)
}

async function loadData() {
  error.value = false
  if (!initialLoading.value) refreshing.value = true
  try {
    const [healthData, statsData, activityData] = await Promise.all([
      api.getHealth(),
      api.getStats(),
      api.getActivity()
    ])
    health.value = healthData
    stats.value = statsData
    modelUsage.value = statsData.modelUsage || []

    const serverStart = new Date(healthData.serverStart + 'Z').getTime()
    serverStartTime.value = serverStart

    activities.value = activityData.slice(0, 6).map(a => ({
      event: 'API Request',
      detail: a.keyLabel || maskKey(a.key),
      key: maskKey(a.key),
      status: 'Success',
      time: timeAgo(a.timestamp),
    }))

    lastUpdated.value = new Date().toLocaleTimeString()
  } catch (e) {
    console.error('Dashboard load failed:', e)
    error.value = true
  } finally {
    initialLoading.value = false
    refreshing.value = false
  }
}

onMounted(() => {
  loadData()
  updateUptime()
  refreshTimer = setInterval(loadData, 30000)
  setInterval(updateUptime, 1000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>
