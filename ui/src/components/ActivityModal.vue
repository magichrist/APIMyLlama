<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible && activity" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-md" />
        <div class="relative bg-gray-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-indigo-500/5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center border border-white/[0.06]">
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">Request Details</h3>
                <span class="text-xs text-gray-500">{{ activity.event }}</span>
              </div>
            </div>
            <button @click="$emit('close')" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span class="text-xs text-gray-500">API Key</span>
              <code class="text-xs text-gray-200 font-mono bg-white/[0.04] px-2 py-1 rounded border border-white/[0.04]">{{ activity._raw?.fullKey || activity.detail }}</code>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span class="text-xs text-gray-500">Timestamp</span>
              <span class="text-xs text-gray-300">{{ formattedTime }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span class="text-xs text-gray-500">Status</span>
              <span class="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">{{ activity.status }}</span>
            </div>
            <div v-if="activity._raw?.duration" class="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span class="text-xs text-gray-500">Duration</span>
              <span class="text-xs text-gray-300">{{ activity._raw.duration }}ms</span>
            </div>
            <div v-if="activity._raw?.model" class="flex justify-between items-center py-2 border-b border-white/[0.04]">
              <span class="text-xs text-gray-500">Model</span>
              <span class="text-xs text-gray-300 font-mono">{{ activity._raw.model }}</span>
            </div>
            <div v-if="activity._raw?.ip" class="flex justify-between items-center py-2">
              <span class="text-xs text-gray-500">IP Address</span>
              <span class="text-xs text-gray-300">{{ activity._raw.ip }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  activity: Object,
  visible: Boolean
})
defineEmits(['close'])

const formattedTime = computed(() => {
  if (!props.activity?._raw?.timestamp) return props.activity?.time || ''
  const d = new Date(props.activity._raw.timestamp + 'Z')
  return d.toLocaleString()
})
</script>
