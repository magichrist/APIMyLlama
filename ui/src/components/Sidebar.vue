<template>
  <!-- Desktop sidebar: always visible on lg+ screens -->
  <aside class="hidden lg:flex w-64 h-screen bg-gray-950 text-gray-300 flex-col border-r border-white/[0.05] shrink-0">
    <!-- Logo area -->
    <router-link to="/" class="p-6 block relative group">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
          <Icon name="bolt" class="w-5 h-5 text-white" />
        </div>
        <div>
          <span class="font-bold text-white text-lg tracking-tight">APIMyLlama</span>
          <p class="text-[10px] text-gray-600 -mt-0.5">API Proxy Manager</p>
        </div>
      </div>
      <!-- Gradient divider -->
      <div class="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-transparent" />
    </router-link>

    <!-- Navigation -->
    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scrollbar">
      <router-link
        v-for="item in navItems"
        :key="item.label"
        :to="item.to"
        :class="[
          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden min-h-[44px]',
          isActive(item.to)
            ? 'bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]'
            : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
        ]"
      >
        <!-- Left border accent for active item -->
        <div
          v-if="isActive(item.to)"
          class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-r-full"
        />
        <Icon
          :name="item.icon"
          class="w-5 h-5 relative transition-all duration-200"
          :class="isActive(item.to) ? 'text-indigo-400' : 'opacity-70 group-hover:opacity-100'"
        />
        <span class="relative">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Gradient divider -->
    <div class="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

    <!-- Bottom profile card -->
    <div class="p-4">
      <div class="rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.05] p-3 transition-all duration-200 hover:bg-white/[0.05]">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0 shadow-sm">
            AT
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">Admin User</p>
            <p class="text-xs text-gray-500 truncate">admin@apimy.com</p>
          </div>
        </div>
        <!-- Subtle uptime indicator -->
        <div v-if="uptime" class="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04]">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
          <span class="text-[10px] text-gray-600 font-mono">Up {{ uptime }}</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Mobile sidebar: slide-out drawer -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 z-40 bg-black/50 lg:hidden" @click="emit('close')" />
    </Transition>
  </Teleport>

  <Transition name="sidebar-slide">
    <aside v-if="isOpen" class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 text-gray-300 flex flex-col border-r border-white/[0.05] shadow-2xl lg:hidden">
      <!-- Logo area -->
      <div class="p-6 block relative">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Icon name="bolt" class="w-5 h-5 text-white" />
          </div>
          <div>
            <span class="font-bold text-white text-lg tracking-tight">APIMyLlama</span>
            <p class="text-[10px] text-gray-600 -mt-0.5">API Proxy Manager</p>
          </div>
        </div>
        <div class="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-transparent" />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scrollbar">
        <router-link
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          :class="[
            'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden min-h-[44px]',
            isActive(item.to)
              ? 'bg-indigo-500/10 text-indigo-400 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
          ]"
          @click="emit('close')"
        >
          <div
            v-if="isActive(item.to)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-indigo-400 to-violet-500 rounded-r-full"
          />
          <Icon
            :name="item.icon"
            class="w-5 h-5 relative transition-all duration-200"
            :class="isActive(item.to) ? 'text-indigo-400' : 'opacity-70 group-hover:opacity-100'"
          />
          <span class="relative">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div class="p-4">
        <div class="rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.05] p-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-sm font-medium shrink-0 shadow-sm">
              AT
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">Admin User</p>
              <p class="text-xs text-gray-500 truncate">admin@apimy.com</p>
            </div>
          </div>
          <div v-if="uptime" class="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04]">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
            <span class="text-[10px] text-gray-600 font-mono">Up {{ uptime }}</span>
          </div>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Icon from './Icon.vue'
import { api } from '../api.js'

const props = defineProps({ isOpen: Boolean })
const emit = defineEmits(['close'])

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
