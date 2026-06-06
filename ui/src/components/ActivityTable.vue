<template>
  <div class="bg-gray-900 border border-gray-800 rounded-xl">
    <div class="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-white">Recent Activity</h2>
      <button v-if="activities.length > 0" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'"
        class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        <Icon :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" class="w-3.5 h-3.5" />
        {{ sortDir === 'asc' ? 'Oldest first' : 'Newest first' }}
      </button>
    </div>
    <div v-if="sorted.length === 0" class="px-5 py-8 text-center text-sm text-gray-500">
      No recent activity
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="text-xs text-gray-500 uppercase tracking-wider">
            <th class="text-left px-5 py-3 font-medium">Event</th>
            <th class="text-left px-5 py-3 font-medium">API Key</th>
            <th class="text-left px-5 py-3 font-medium">Status</th>
            <th class="text-right px-5 py-3 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
              Time <Icon :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" class="w-3 h-3 inline -mt-0.5" />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-800">
          <tr v-for="(row, i) in sorted" :key="i" class="hover:bg-gray-800/30 transition-colors">
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Icon name="message" class="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-200">{{ row.event }}</p>
                  <p class="text-xs text-gray-500">{{ row.detail }}</p>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5">
              <code class="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">{{ row.key }}</code>
            </td>
            <td class="px-5 py-3.5">
              <span :class="['text-xs font-medium px-2.5 py-1 rounded-full', statusClass(row.status)]">
                {{ row.status }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right text-sm text-gray-500">{{ row.time }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  activities: { type: Array, default: () => [] }
})

const sortDir = ref('desc')

const sorted = computed(() => {
  const list = [...props.activities]
  list.sort((a, b) => {
    const aSecs = parseTimeAgo(a.time)
    const bSecs = parseTimeAgo(b.time)
    return sortDir.value === 'asc' ? aSecs - bSecs : bSecs - aSecs
  })
  return list
})

function parseTimeAgo(str) {
  if (!str) return 0
  if (str === 'just now') return 0
  const m = str.match(/(\d+)([smhd])/)
  if (!m) return 0
  const n = parseInt(m[1])
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[m[2]] || 1
  return n * unit
}

function statusClass(status) {
  return status === 'Success' || status === 'Healthy'
    ? 'text-emerald-400 bg-emerald-400/10'
    : 'text-rose-400 bg-rose-400/10'
}
</script>
