<template>
  <header class="h-16 flex items-center justify-between px-4 sm:px-6 relative bg-gray-950">
    <!-- Gradient bottom border -->
    <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-transparent" />

    <div class="flex items-center gap-4">
      <!-- Hamburger menu button: visible only on mobile/tablet -->
      <button
        class="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.06] transition-all"
        @click="emit('toggle-sidebar')"
        aria-label="Toggle navigation menu"
      >
        <Icon name="menu" class="w-5 h-5" />
      </button>
      <h1 class="text-lg font-semibold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Health dot + status (hidden on xs screens) -->
      <div class="hidden sm:flex items-center gap-2">
        <div class="relative w-2 h-2">
          <div :class="['w-2 h-2 rounded-full transition-all duration-500',
            health.health.value.ollama === 'reachable' ? 'bg-emerald-400' : 'bg-amber-400']" />
          <div v-if="health.health.value.ollama === 'reachable' && health.autoRefresh.value"
            class="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
        </div>
        <span class="text-xs text-gray-500 whitespace-nowrap">
          Server {{ health.health.value.status }} —
          Ollama {{ health.health.value.ollama === 'reachable' ? 'connected' : 'disconnected' }}
        </span>
        <span v-if="health.fetchLatency.value !== null"
          class="text-[11px] text-gray-600 font-mono">{{ health.fetchLatency.value }}ms</span>
      </div>

      <!-- Last updated (hidden on xs/sm) -->
      <span class="hidden md:block text-xs text-gray-600">Updated: {{ health.lastUpdated.value }}</span>

      <!-- Manual Refresh button -->
      <button @click="health.refresh()" :disabled="health.refreshing.value || health.onCooldown.value"
        class="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/[0.06] hover:border-indigo-500/30 rounded-lg transition-all duration-200 disabled:opacity-50">
        <Icon :class="['w-3.5 h-3.5', (health.refreshing.value || health.onCooldown.value) && 'animate-spin']" name="refresh" />
        {{ health.refreshing.value ? '' : health.onCooldown.value ? 'Wait...' : 'Refresh' }}
        <span class="text-[10px] text-gray-600 ml-0.5 hidden sm:inline">(R)</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'
import { useServerHealth } from '../composables/useServerHealth.js'

const props = defineProps({ title: { type: String, default: 'Dashboard' } })
const emit = defineEmits(['toggle-sidebar'])
const health = useServerHealth()
</script>
