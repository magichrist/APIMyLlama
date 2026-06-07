<template>
  <header class="h-16 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-semibold text-white">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-4">
      <div class="relative">
        <Icon name="search" class="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input v-model="query" type="text" placeholder="Search..."
          class="bg-gray-900 text-gray-300 text-sm rounded-lg pl-10 pr-4 py-2 w-64 border border-gray-800 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
           />
      </div>
      <button class="relative p-2 text-gray-400 hover:text-gray-200 transition-colors" title="Notifications">
        <Icon name="bell" class="w-5 h-5" />
      </button>
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
