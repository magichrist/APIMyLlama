<template>
  <header class="h-16 flex items-center justify-between px-6 relative bg-gray-950">
    <!-- Gradient bottom border -->
    <div class="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-transparent" />

    <div class="flex items-center gap-4">
      <h1 class="text-lg font-semibold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-4">
      <!-- Search bar with glass effect -->
      <div class="relative group">
        <Icon
          name="search"
          class="w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
        />
        <input
          v-model="query"
          type="text"
          placeholder="Search..."
          class="w-64 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] text-gray-300 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/15 transition-all duration-200 placeholder-gray-600"
        />
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, watch } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ title: { type: String, default: 'Dashboard' } })
const emit = defineEmits(['search'])
const query = ref('')

let debounceTimer = null
watch(query, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => emit('search', val), 300)
})
</script>
