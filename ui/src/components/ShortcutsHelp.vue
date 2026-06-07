<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="close">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-md" />
        <div class="relative bg-gray-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl shadow-indigo-500/5">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              Keyboard Shortcuts
            </h2>
            <button @click="close" class="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div v-for="s in shortcuts" :key="s.key"
              class="flex items-center gap-3 bg-white/[0.03] rounded-xl px-3 py-2.5 border border-white/[0.04]">
              <kbd class="min-w-[32px] h-7 flex items-center justify-center bg-white/[0.08] rounded-lg text-xs font-mono text-indigo-300 border border-white/[0.06] px-2">{{ s.key }}</kbd>
              <span class="text-xs text-gray-400">{{ s.label }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-500/80 mt-4 text-center">Press <kbd class="bg-white/[0.06] px-1.5 py-0.5 rounded text-[10px] font-mono border border-white/[0.04]">?</kbd> to toggle this overlay</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch } from 'vue'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const shortcuts = [
  { key: 'R', label: 'Refresh current page' },
  { key: '?', label: 'Toggle shortcuts help' },
  { key: 'D', label: 'Go to Dashboard' },
  { key: 'E', label: 'Go to API Keys' },
  { key: 'S', label: 'Go to Settings' },
]

function close() { emit('update:modelValue', false) }

// Close on Escape
watch(() => props.modelValue, (val) => {
  if (val) {
    const handler = (e) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    const unwatch = watch(() => props.modelValue, (nv) => { if (!nv) { document.removeEventListener('keydown', handler); unwatch() } })
  }
})
</script>
