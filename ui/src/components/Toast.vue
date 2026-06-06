<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    <div v-for="t in toasts" :key="t.id"
      class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm transition-all animate-slide-in max-w-sm"
      :class="bgClass(t.type)">
      <component :is="iconComponent(t.type)" class="w-5 h-5 mt-0.5 shrink-0" :class="iconColor(t.type)" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white">{{ t.title }}</p>
        <p v-if="t.message" class="text-xs text-gray-300 mt-0.5">{{ t.message }}</p>
      </div>
      <button @click="remove(t.id)" class="text-gray-400 hover:text-white shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { h } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ toasts: { type: Array, default: () => [] } })
const emit = defineEmits(['remove'])

function bgClass(type) {
  return {
    success: 'bg-emerald-900/90 border-emerald-700/50',
    error: 'bg-red-900/90 border-red-700/50',
    info: 'bg-indigo-900/90 border-indigo-700/50',
    warning: 'bg-amber-900/90 border-amber-700/50',
  }[type] || 'bg-gray-900/90 border-gray-700/50'
}

function iconColor(type) {
  return {
    success: 'text-emerald-400',
    error: 'text-red-400',
    info: 'text-indigo-400',
    warning: 'text-amber-400',
  }[type] || 'text-gray-400'
}

function iconComponent(type) {
  const name = { success: 'check', error: 'close', info: 'info', warning: 'warning' }[type] || 'info'
  return {
    render() { return h(Icon, { name }) }
  }
}

function remove(id) { emit('remove', id) }
</script>

<style scoped>
@keyframes slide-in {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-slide-in { animation: slide-in 0.25s ease-out; }
</style>
