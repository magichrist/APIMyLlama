<template>
  <div class="group relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-xl p-5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5">
    <!-- Subtle gradient overlay on hover -->
    <div class="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    <div class="flex items-center justify-between mb-3 relative z-10">
      <span class="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{{ title }}</span>
      <div :class="['p-2.5 rounded-xl relative', iconBg]">
        <Icon :name="icon" class="w-5 h-5" :class="iconColor" />
      </div>
    </div>
    <div class="flex items-end justify-between relative z-10">
      <div>
        <p class="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{{ value }}</p>
        <p class="text-xs text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <span v-if="change" :class="changeClass || [
        'text-xs font-medium px-2.5 py-1 rounded-full',
        change.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
      ]">
        {{ change }}
      </span>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'

defineProps({
  title: String,
  value: [String, Number],
  subtitle: String,
  change: String,
  changeClass: String,
  icon: String,
  iconBg: String,
  iconColor: String
})
</script>
