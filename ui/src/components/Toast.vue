<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
    <div v-for="t in toasts" :key="t.id"
      class="pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-toast-in max-w-sm"
      :class="bgClass(t.type)">
      <Icon :name="{success:'check',error:'close',info:'info',warning:'warning'}[t.type]||'info'" class="w-5 h-5 mt-0.5 shrink-0" :class="iconColor(t.type)" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-white/90">{{ t.title }}</p>
        <p v-if="t.message" class="text-xs text-gray-400/80 mt-0.5">{{ t.message }}</p>
      </div>
      <button @click="remove(t.id)" class="text-gray-400/70 hover:text-white/90 shrink-0 transition-all hover:scale-110 active:scale-90">
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
    success: 'bg-emerald-900/80 backdrop-blur-xl border-emerald-500/30 shadow-lg shadow-emerald-500/10',
    error: 'bg-red-900/80 backdrop-blur-xl border-red-500/30 shadow-lg shadow-red-500/10',
    info: 'bg-indigo-900/80 backdrop-blur-xl border-indigo-500/30 shadow-lg shadow-indigo-500/10',
    warning: 'bg-amber-900/80 backdrop-blur-xl border-amber-500/30 shadow-lg shadow-amber-500/10',
  }[type] || 'bg-gray-900/80 backdrop-blur-xl border-gray-500/30'
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
@keyframes toast-in {
  from { opacity: 0; transform: translateX(100%) scale(0.95); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
.animate-toast-in { animation: toast-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
</style>
