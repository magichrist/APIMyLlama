<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <Header title="API Keys" />
    <main class="flex-1 overflow-y-auto p-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <p class="text-sm text-gray-400">Manage your API keys for accessing the Ollama proxy.</p>
          <button @click="loadKeys" class="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors" title="Refresh">
            <Icon name="refresh" class="w-4 h-4" />
          </button>
        </div>
        <button @click="showCreateModal = true" class="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Icon name="plus" class="w-4 h-4" />
          Create Key
        </button>
      </div>

      <div class="flex items-center gap-2 mb-4">
        <div class="relative flex-1 max-w-xs">
          <Icon name="search" class="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input v-model="searchQuery" type="text" placeholder="Filter keys..."
            class="w-full bg-gray-900 text-gray-300 text-sm rounded-lg pl-9 pr-4 py-2 border border-gray-800 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20" />
        </div>
        <div class="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
          <button v-for="tab in statusFilters" :key="tab"
            @click="activeFilter = tab"
            :class="[
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeFilter === tab ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            ]">{{ tab }}</button>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
      </div>

      <div v-else-if="filteredKeys.length === 0" class="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
        <Icon name="key" class="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p v-if="searchQuery || activeFilter !== 'All'" class="text-gray-400 text-sm mb-4">No keys match your filter.</p>
        <p v-else class="text-gray-400 text-sm mb-4">No API keys yet. Create your first key to get started.</p>
        <button @click="showCreateModal = true" class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors">Create API Key</button>
      </div>

      <div v-else class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
              <th class="text-left px-5 py-3.5 font-medium">Key</th>
              <th class="text-left px-5 py-3.5 font-medium">Description</th>
              <th class="text-left px-5 py-3.5 font-medium">Status</th>
              <th class="text-left px-5 py-3.5 font-medium">Rate Limit</th>
              <th class="text-left px-5 py-3.5 font-medium">Created</th>
              <th class="text-right px-5 py-3.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr v-for="key in filteredKeys" :key="key.key" class="hover:bg-gray-800/30 transition-colors">
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <code class="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded font-mono">{{ maskKey(key.key) }}</code>
                  <button @click="copyFullKey(key.key)" class="text-gray-600 hover:text-gray-300 transition-colors" title="Copy full key">
                    <Icon name="copy" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-300">{{ key.description || '—' }}</span>
                  <button @click="startEditDesc(key)" class="text-gray-600 hover:text-gray-300 transition-colors" title="Edit description">
                    <Icon name="edit" class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
              <td class="px-5 py-4">
                <span :class="[
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  key.active ? 'text-emerald-400 bg-emerald-400/10' : 'text-gray-500 bg-gray-800'
                ]">{{ key.active ? 'Active' : 'Inactive' }}</span>
              </td>
              <td class="px-5 py-4">
                <span class="text-sm text-gray-300">{{ key.rate_limit }}/min</span>
              </td>
              <td class="px-5 py-4">
                <span class="text-sm text-gray-500">{{ formatDate(key.created_at) }}</span>
              </td>
              <td class="px-5 py-4 text-right relative">
                <div class="flex items-center justify-end gap-1.5">
                  <button @click="toggleKey(key)" :class="[
                    'text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors',
                    key.active ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20' : 'text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20'
                  ]">{{ key.active ? 'Deactivate' : 'Activate' }}</button>
                  <div class="relative">
                    <button @click.stop="openDropdown(key)" class="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
                      <Icon name="dots" class="w-4 h-4" />
                    </button>
                    <div v-if="openDropdownKey === key.key"
                      class="absolute right-0 top-full mt-1 z-40 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1">
                      <button @click="startEditDesc(key)" class="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 text-left">
                        <Icon name="edit" class="w-3.5 h-3.5 text-gray-500" /> Edit Description
                      </button>
                      <button @click="startEditRate(key)" class="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 text-left">
                        <Icon name="bolt" class="w-3.5 h-3.5 text-gray-500" /> Edit Rate Limit
                      </button>
                      <button @click="confirmRegenerate(key)" class="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 text-left">
                        <Icon name="refresh" class="w-3.5 h-3.5 text-gray-500" /> Regenerate
                      </button>
                      <button @click="confirmDelete(key)" class="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-gray-700 text-left">
                        <Icon name="trash" class="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 text-xs text-gray-600">
        Showing {{ filteredKeys.length }} key{{ filteredKeys.length !== 1 ? 's' : '' }}
      </div>
    </main>

    <teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showCreateModal = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-4">Create API Key</h3>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1.5">Description (optional)</label>
            <input v-model="newKeyDescription" type="text" placeholder="e.g. Development, Production..."
              class="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              @keyup.enter="handleCreateKey" />
          </div>
          <div class="flex items-center justify-end gap-3">
            <button @click="showCreateModal = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button @click="handleCreateKey" :disabled="creating"
              class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <div v-if="creating" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              {{ creating ? 'Creating...' : 'Generate' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showKeyCreated" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showKeyCreated = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Icon name="check" class="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">Key Generated</h3>
              <p class="text-xs text-gray-400">Copy this key now — you won't be able to see it again.</p>
            </div>
          </div>
          <div class="bg-gray-950 border border-gray-700 rounded-lg p-3 mb-4">
            <code class="text-sm text-indigo-300 font-mono break-all select-all">{{ createdKey }}</code>
          </div>
          <button @click="copyKey(createdKey)" class="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors mb-2">
            {{ copiedKey === createdKey ? 'Copied!' : 'Copy to Clipboard' }}
          </button>
          <button @click="showKeyCreated = false" class="w-full px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Done</button>
        </div>
      </div>

      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showDeleteConfirm = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-2">Delete API Key</h3>
          <p class="text-sm text-gray-400 mb-1">Are you sure you want to delete this key?</p>
          <code class="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded font-mono block mb-4 break-all">{{ toDelete?.key ? maskKey(toDelete.key) : '' }}</code>
          <p class="text-xs text-red-400/80 mb-4">This action cannot be undone.</p>
          <div class="flex items-center justify-end gap-3">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button @click="handleDelete" :disabled="deleting"
              class="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <div v-if="deleting" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showRegenerateConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showRegenerateConfirm = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-2">Regenerate API Key</h3>
          <p class="text-sm text-gray-400 mb-1">This will replace the current key with a new one.</p>
          <code class="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded font-mono block mb-2 break-all">{{ toRegenerate?.key ? maskKey(toRegenerate.key) : '' }}</code>
          <p class="text-xs text-amber-400/80 mb-4">Any services using the old key will need to be updated.</p>
          <div class="flex items-center justify-end gap-3">
            <button @click="showRegenerateConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button @click="handleRegenerate" :disabled="regenerating"
              class="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <div v-if="regenerating" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              {{ regenerating ? 'Regenerating...' : 'Regenerate' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showEditDesc" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showEditDesc = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-4">Edit Description</h3>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1.5">Description</label>
            <input v-model="editDescValue" type="text" placeholder="Add a description..."
              class="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              @keyup.enter="handleEditDesc" />
          </div>
          <div class="flex items-center justify-end gap-3">
            <button @click="showEditDesc = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button @click="handleEditDesc" :disabled="savingDesc"
              class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <div v-if="savingDesc" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              {{ savingDesc ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showEditRate" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showEditRate = false">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold text-white mb-4">Edit Rate Limit</h3>
          <div class="mb-4">
            <label class="block text-sm text-gray-400 mb-1.5">Requests per minute</label>
            <input v-model="editRateValue" type="number" min="1" max="10000"
              class="w-full bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              @keyup.enter="handleEditRate" />
          </div>
          <div class="flex items-center justify-end gap-3">
            <button @click="showEditRate = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
            <button @click="handleEditRate" :disabled="savingRate"
              class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              <div v-if="savingRate" class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
              {{ savingRate ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { api } from '../api.js'
import Header from '../components/Header.vue'
import Icon from '../components/Icon.vue'

const toast = inject('toast')
const loading = ref(true)
const keys = ref([])
const openDropdownKey = ref(null)
const searchQuery = ref('')
const activeFilter = ref('All')
const statusFilters = ['All', 'Active', 'Inactive']

const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const showKeyCreated = ref(false)
const showRegenerateConfirm = ref(false)
const showEditDesc = ref(false)
const showEditRate = ref(false)

const creating = ref(false)
const deleting = ref(false)
const regenerating = ref(false)
const savingDesc = ref(false)
const savingRate = ref(false)

const newKeyDescription = ref('')
const toDelete = ref(null)
const toRegenerate = ref(null)
const editDescTarget = ref(null)
const editDescValue = ref('')
const editRateTarget = ref(null)
const editRateValue = ref(10)
const createdKey = ref('')
const copiedKey = ref('')

const filteredKeys = computed(() => {
  let list = keys.value
  if (activeFilter.value === 'Active') list = list.filter(k => k.active)
  if (activeFilter.value === 'Inactive') list = list.filter(k => !k.active)
  const q = searchQuery.value.toLowerCase()
  if (q) list = list.filter(k =>
    k.key?.toLowerCase().includes(q) ||
    k.description?.toLowerCase().includes(q)
  )
  return list
})

function maskKey(key) {
  if (!key) return ''
  return key.substring(0, 8) + '••••' + key.substring(key.length - 4)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'Z')
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function loadKeys() {
  try {
    keys.value = await api.getKeys()
  } catch (e) {
    toast?.error('Load failed', e.message || 'Could not load API keys')
    console.error('Failed to load keys:', e)
  } finally {
    loading.value = false
  }
}

async function handleCreateKey() {
  creating.value = true
  try {
    const key = await api.createKey(newKeyDescription.value)
    showCreateModal.value = false
    newKeyDescription.value = ''
    createdKey.value = key.key
    showKeyCreated.value = true
    toast?.success('Key created', 'New API key has been generated')
    await loadKeys()
  } catch (e) {
    toast?.error('Creation failed', e.message || 'Could not create key')
  } finally {
    creating.value = false
  }
}

function confirmDelete(key) {
  toDelete.value = key
  showDeleteConfirm.value = true
  openDropdownKey.value = null
}

async function handleDelete() {
  if (!toDelete.value) return
  deleting.value = true
  try {
    await api.deleteKey(toDelete.value.key)
    showDeleteConfirm.value = false
    toDelete.value = null
    toast?.success('Key deleted', 'API key has been removed')
    await loadKeys()
  } catch (e) {
    toast?.error('Delete failed', e.message)
  } finally {
    deleting.value = false
  }
}

async function toggleKey(key) {
  try {
    if (key.active) {
      await api.deactivateKey(key.key)
      toast?.info('Key deactivated', key.description || key.key.substring(0, 8) + '...')
    } else {
      await api.activateKey(key.key)
      toast?.info('Key activated', key.description || key.key.substring(0, 8) + '...')
    }
    await loadKeys()
  } catch (e) {
    toast?.error('Toggle failed', e.message)
  }
}

function confirmRegenerate(key) {
  toRegenerate.value = key
  showRegenerateConfirm.value = true
  openDropdownKey.value = null
}

async function handleRegenerate() {
  if (!toRegenerate.value) return
  regenerating.value = true
  try {
    const result = await api.regenerateKey(toRegenerate.value.key)
    showRegenerateConfirm.value = false
    createdKey.value = result.key
    showKeyCreated.value = true
    toRegenerate.value = null
    toast?.success('Key regenerated', 'New key has been created')
    await loadKeys()
  } catch (e) {
    toast?.error('Regeneration failed', e.message)
  } finally {
    regenerating.value = false
  }
}

function startEditDesc(key) {
  editDescTarget.value = key
  editDescValue.value = key.description || ''
  showEditDesc.value = true
  openDropdownKey.value = null
}

async function handleEditDesc() {
  if (!editDescTarget.value) return
  savingDesc.value = true
  try {
    await api.setDescription(editDescTarget.value.key, editDescValue.value)
    showEditDesc.value = false
    editDescTarget.value = null
    toast?.success('Description updated')
    await loadKeys()
  } catch (e) {
    toast?.error('Update failed', e.message)
  } finally {
    savingDesc.value = false
  }
}

function startEditRate(key) {
  editRateTarget.value = key
  editRateValue.value = key.rate_limit
  showEditRate.value = true
  openDropdownKey.value = null
}

async function handleEditRate() {
  if (!editRateTarget.value) return
  savingRate.value = true
  try {
    await api.setRateLimit(editRateTarget.value.key, parseInt(editRateValue.value))
    showEditRate.value = false
    editRateTarget.value = null
    toast?.success('Rate limit updated')
    await loadKeys()
  } catch (e) {
    toast?.error('Update failed', e.message)
  } finally {
    savingRate.value = false
  }
}

async function copyFullKey(key) {
  await copyKey(key)
}

async function copyKey(text) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = text
    toast?.success('Copied!', 'Key copied to clipboard')
    setTimeout(() => { copiedKey.value = '' }, 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copiedKey.value = text
    toast?.success('Copied!', 'Key copied to clipboard')
    setTimeout(() => { copiedKey.value = '' }, 2000)
  }
}

function openDropdown(key) {
  openDropdownKey.value = openDropdownKey.value === key.key ? null : key.key
}

function handleClickOutside(e) {
  if (!e.target.closest('button')) {
    openDropdownKey.value = null
  }
}

onMounted(() => {
  loadKeys()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
