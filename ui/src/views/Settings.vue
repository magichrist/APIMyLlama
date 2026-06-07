<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <Header title="Settings" />
    <main class="flex-1 overflow-y-auto p-6">
      <div class="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 mb-6 inline-flex backdrop-blur-xl">
        <button v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
            activeTab === tab.id ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-indigo-300 shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
          ]">
          <Icon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
      </div>

      <template v-else>
        <div v-if="activeTab === 'server'" class="max-w-2xl">
          <div class="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-6 shadow-lg">
            <h2 class="text-sm font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent mb-4">Server Configuration</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1.5 font-medium">Ollama URL</label>
                <div class="flex gap-2">
                  <input :value="config.ollamaUrl" type="text" readonly
                    class="flex-1 bg-white/[0.04] text-gray-300 text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] backdrop-blur-xl" />
                  <button @click="copyText(config.ollamaUrl)" class="px-3 py-2.5 text-gray-400 hover:text-indigo-400 bg-white/[0.04] rounded-xl border border-white/[0.08] backdrop-blur-xl transition-all hover:bg-white/[0.08] hover:border-indigo-500/30" title="Copy URL">
                    <Icon name="copy" class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1.5 font-medium">Server Port</label>
                <input :value="config.port" type="text" readonly
                  class="w-full bg-white/[0.04] text-gray-300 text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] backdrop-blur-xl" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'webhooks'" class="max-w-2xl">
          <div class="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-6 shadow-lg">
            <h2 class="text-sm font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent mb-4">Webhook Endpoints</h2>
            <p class="text-xs text-gray-500/80 mb-4">Each webhook is associated with a specific API key and fires when requests use that key.</p>
            <div class="flex flex-col sm:flex-row gap-2 mb-4">
              <div class="flex-1 min-w-0 space-y-2">
                <input v-model="newWebhookUrl" type="url" placeholder="https://example.com/webhook"
                  class="w-full bg-white/[0.04] text-gray-200 text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] backdrop-blur-xl placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  @keyup.enter="handleAddWebhook" />
                <select v-model="newWebhookKey"
                  class="w-full bg-white/[0.04] text-gray-200 text-sm rounded-xl px-4 py-2.5 border border-white/[0.08] backdrop-blur-xl focus:outline-none focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none">
                  <option value="" disabled>Select an API key...</option>
                  <option v-for="k in keys" :key="k.key" :value="k.key">
                    {{ k.description || k.key.substring(0, 16) + '...' }}
                  </option>
                </select>
              </div>
              <button @click="handleAddWebhook" :disabled="addingWebhook || !newWebhookKey"
                class="shrink-0 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2 self-start shadow-lg shadow-indigo-500/20">
                <Icon v-if="!addingWebhook" name="plus" class="w-4 h-4" />
                <div v-else class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                {{ addingWebhook ? 'Adding...' : 'Add Webhook' }}
              </button>
            </div>
            <div v-if="webhooks.length === 0" class="text-center py-8">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center mx-auto mb-3 border border-white/[0.06]">
                <Icon name="webhook" class="w-6 h-6 text-indigo-400/60" />
              </div>
              <p class="text-xs text-gray-500">No webhooks configured</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="wh in webhooks" :key="wh.id"
                class="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl rounded-xl px-4 py-3 group hover:bg-white/[0.06] transition-all border border-white/[0.04]">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 flex items-center justify-center shrink-0 border border-white/[0.06]">
                    <Icon name="webhook" class="w-4 h-4 text-indigo-400" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <code class="text-xs text-gray-300 font-mono truncate block">{{ wh.url }}</code>
                    <span class="text-xs text-gray-500/80 mt-0.5 block">
                      Key: {{ keyLabel(wh.api_key) }}
                      <span v-if="wh.last_triggered" class="ml-2">· Last fired: {{ timeAgo(wh.last_triggered) }}</span>
                      <span v-else class="ml-2">· Never fired</span>
                    </span>
                  </div>
                </div>
                <button @click="confirmDeleteWebhook(wh)"
                  class="ml-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div v-if="showDeleteWebhookConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showDeleteWebhookConfirm = false">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-md"></div>
            <div class="relative bg-gray-900/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-indigo-500/5">
              <h3 class="text-lg font-semibold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent mb-2">Remove Webhook</h3>
              <p class="text-sm text-gray-400 mb-4">Are you sure you want to remove this webhook?</p>
              <code class="text-xs text-gray-300 bg-white/[0.04] px-3 py-1.5 rounded-lg font-mono block mb-4 break-all border border-white/[0.06] backdrop-blur-xl">{{ toDeleteWebhook?.url }}</code>
              <div class="flex items-center justify-end gap-3">
                <button @click="showDeleteWebhookConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                <button @click="handleDeleteWebhook" :disabled="deletingWebhook"
                  class="px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-red-500/20">
                  {{ deletingWebhook ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'admin'" class="max-w-2xl">
          <div class="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-6 shadow-lg">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/10 shrink-0">
                <Icon name="shield" class="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 class="text-sm font-semibold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">Admin Access</h2>
                <p class="text-xs text-gray-500/80">Use this token to authenticate API calls to admin endpoints.</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-white/[0.04] backdrop-blur-xl rounded-xl px-4 py-3 border border-white/[0.08]">
              <code class="text-sm text-indigo-300 font-mono flex-1">••••••••</code>
            </div>
            <p class="text-xs text-gray-500/80 mt-3">The admin token is set via the <code class="text-gray-400 bg-white/[0.06] px-1.5 py-0.5 rounded-lg border border-white/[0.06] font-mono text-[11px] backdrop-blur-xl">ADMIN_TOKEN</code> env var. It is <strong class="text-gray-400">not exposed</strong> through the API for security. Check the server console to view or set it.</p>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, inject, onMounted } from 'vue'
import { api } from '../api.js'
import Header from '../components/Header.vue'
import Icon from '../components/Icon.vue'

const toast = inject('toast')
const loading = ref(true)
const activeTab = ref('server')
const tabs = [
  { id: 'server', label: 'Server', icon: 'server' },
  { id: 'webhooks', label: 'Webhooks', icon: 'webhook' },
  { id: 'admin', label: 'Admin', icon: 'shield' },
]
const config = ref({ port: 3000, ollamaUrl: 'http://localhost:11434' })
const keys = ref([])
const webhooks = ref([])
const newWebhookUrl = ref('')
const newWebhookKey = ref('')
const addingWebhook = ref(false)
const showDeleteWebhookConfirm = ref(false)
const toDeleteWebhook = ref(null)
const deletingWebhook = ref(false)

function keyLabel(apiKey) {
  if (!apiKey) return ''
  const found = keys.value.find(k => k.key === apiKey)
  return found?.description || apiKey.substring(0, 8) + '...'
}

function timeAgo(ts) {
  if (!ts) return ''
  const secs = Math.floor((Date.now() - new Date(ts + 'Z').getTime()) / 1000)
  if (secs < 5) return 'just now'
  if (secs < 60) return secs + 's ago'
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago'
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago'
  return Math.floor(secs / 86400) + 'd ago'
}

async function loadSettings() {
  try {
    const [configData, webhookData, keysData] = await Promise.all([
      api.getConfig(),
      api.getWebhooks(),
      api.getKeys()
    ])
    config.value = configData
    webhooks.value = webhookData
    keys.value = keysData
  } catch (e) {
    toast?.error('Load failed', e.message || 'Could not load settings')
  } finally {
    loading.value = false
  }
}

async function handleAddWebhook() {
  if (!newWebhookUrl.value || !newWebhookKey.value) return
  addingWebhook.value = true
  try {
    await api.addWebhook(newWebhookUrl.value, newWebhookKey.value)
    toast?.success('Webhook added', `for ${newWebhookKey.value.substring(0, 8)}...`)
    newWebhookUrl.value = ''
    newWebhookKey.value = ''
    webhooks.value = await api.getWebhooks()
  } catch (e) {
    toast?.error('Failed to add webhook', e.message)
  } finally {
    addingWebhook.value = false
  }
}

function confirmDeleteWebhook(wh) {
  toDeleteWebhook.value = wh
  showDeleteWebhookConfirm.value = true
}

async function handleDeleteWebhook() {
  if (!toDeleteWebhook.value) return
  deletingWebhook.value = true
  try {
    await api.deleteWebhook(toDeleteWebhook.value.id)
    showDeleteWebhookConfirm.value = false
    toDeleteWebhook.value = null
    toast?.success('Webhook removed')
    webhooks.value = await api.getWebhooks()
  } catch (e) {
    toast?.error('Failed to remove webhook', e.message)
  } finally {
    deletingWebhook.value = false
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast?.success('Copied to clipboard')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    toast?.success('Copied to clipboard')
  }
}

onMounted(loadSettings)
</script>
