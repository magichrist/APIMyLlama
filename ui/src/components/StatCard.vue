<template>
  <div class="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-gray-400">{{ title }}</span>
      <div :class="['p-2 rounded-lg', iconBg]">
        <Icon :name="icon" class="w-5 h-5" :class="iconColor" />
      </div>
    </div>
    <div class="flex items-end justify-between">
      <div>
        <p class="text-2xl font-bold text-white">{{ value }}</p>
        <p class="text-xs text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <span v-if="change" :class="changeClass || [
        'text-xs font-medium px-2 py-1 rounded-full',
        change.startsWith('+') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
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
