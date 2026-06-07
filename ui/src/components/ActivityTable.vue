<template>
  <div class="relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-hidden">
    <!-- Glass header section -->
    <div class="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
      <h2 class="text-sm font-semibold text-white flex items-center gap-2">
        <span class="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-400 to-violet-400"></span>
        Recent Activity
      </h2>
      <button v-if="activities.length > 0"
        class="min-h-[44px] flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm border border-white/[0.04] hover:border-indigo-500/30 px-3 py-1.5 rounded-lg transition-all duration-200 group"
        @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
        <Icon :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" class="w-3.5 h-3.5 group-hover:text-indigo-400 transition-colors duration-200" />
        <span>{{ sortDir === 'asc' ? 'Oldest first' : 'Newest first' }}</span>
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
            <!-- API Key column: hidden on mobile -->
            <th class="text-left px-5 py-3 font-medium hidden sm:table-cell">API Key</th>
            <!-- Status column: hidden on mobile -->
            <th class="text-left px-5 py-3 font-medium hidden sm:table-cell">Status</th>
            <th class="text-right px-5 py-3 font-medium cursor-pointer select-none hover:text-gray-300 transition-colors duration-200" @click="sortDir = sortDir === 'asc' ? 'desc' : 'asc'">
              Time <Icon :name="sortDir === 'asc' ? 'arrowUp' : 'arrowDown'" class="w-3 h-3 inline -mt-0.5" />
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/[0.04]">
          <tr v-for="(row, i) in sorted" :key="i" class="transition-all duration-200 hover:bg-white/[0.06]">
            <td class="px-5 py-3.5">
              <div class="flex items-center gap-3">
                <!-- Icon container with gradient bg -->
                <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center ring-1 ring-white/[0.04] shrink-0">
                  <Icon name="message" class="w-4 h-4 text-indigo-300" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-200">{{ row.event }}</p>
                  <p class="text-xs text-gray-500">{{ row.detail }}</p>
                  <!-- Show status inline on mobile -->
                  <span class="sm:hidden inline-block mt-1" :class="['text-xs font-medium px-2 py-0.5 rounded-full', statusClass(row.status)]">{{ row.status }}</span>
                </div>
              </div>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <code class="text-xs text-gray-400 bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] px-2.5 py-1 rounded-lg">{{ row.key }}</code>
            </td>
            <td class="px-5 py-3.5 hidden sm:table-cell">
              <!-- Status badge with subtle glow -->
              <span :class="['text-xs font-medium px-3 py-1 rounded-full shadow-sm', statusClass(row.status)]">
                {{ row.status }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right text-sm text-gray-500 whitespace-nowrap">{{ row.time }}</td>
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
