<template>
  <aside class="w-64 h-screen bg-gray-950 text-gray-300 flex flex-col border-r border-gray-800">
    <router-link to="/" class="p-6 border-b border-gray-800 block">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
          <Icon name="bolt" class="w-5 h-5 text-white" />
        </div>
        <span class="font-semibold text-white text-lg">APIMyLlama</span>
      </div>
    </router-link>

    <nav class="flex-1 p-4 space-y-1">
      <router-link v-for="item in navItems" :key="item.label"
        :to="item.to"
        :class="[
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive(item.to)
            ? 'bg-indigo-500/10 text-indigo-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]">
        <Icon :name="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </router-link>
    </nav>

    <div class="p-4 border-t border-gray-800 space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          AT
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">Admin User</p>
          <p class="text-xs text-gray-500 truncate">admin@apimy.com</p>
        </div>
      </div>
      <div v-if="uptime" class="flex items-center gap-2 text-xs text-gray-600 pt-2 border-t border-gray-800">
        <span class="w-2 h-2 rounded-full bg-emerald-500" />
        <span>Up {{ uptime }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import { api } from '../api.js'

const route = useRoute()
const uptime = ref('')

function isActive(path) {
  return route.path === path
}

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'API Keys', icon: 'key', to: '/keys' },
  { label: 'Settings', icon: 'settings', to: '/settings' },
]

let interval

onMounted(async () => {
  try {
    const config = await api.getConfig()
    const start = new Date(config.serverStart)
    updateUptime(start)
    interval = setInterval(() => updateUptime(start), 30000)
  } catch {}
})

onUnmounted(() => clearInterval(interval))

function updateUptime(start) {
  const diff = Date.now() - start.getTime()
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hrs) parts.push(`${hrs}h`)
  if (mins) parts.push(`${mins}m`)
  uptime.value = parts.join(' ') || '0m'
}
</script>
