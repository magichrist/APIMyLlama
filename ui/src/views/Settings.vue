<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <Header title="Settings" />
    <main class="flex-1 overflow-y-auto p-6">
      <div class="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-0.5 mb-6 inline-flex">
        <button v-for="tab in tabs" :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
            activeTab === tab.id ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-500 hover:text-gray-300'
          ]">
          <Icon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
      </div>

      <template v-else>
        <!-- Server Tab -->
        <div v-if="activeTab === 'server'" class="max-w-2xl">
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 class="text-sm font-semibold text-white mb-4">Server Configuration</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1.5">Ollama URL</label>
                <div class="flex gap-2">
                  <input :value="config.ollamaUrl" type="text" readonly
                    class="flex-1 bg-gray-800 text-gray-300 text-sm rounded-lg px-4 py-2.5 border border-gray-700" />
                  <button @click="copyText(config.ollamaUrl)" class="px-3 py-2.5 text-gray-400 hover:text-gray-200 bg-gray-800 rounded-lg border border-gray-700 transition-colors" title="Copy URL">
                    <Icon name="copy" class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1.5">Server Port</label>
                <input :value="config.port" type="text" readonly
                  class="w-full bg-gray-800 text-gray-300 text-sm rounded-lg px-4 py-2.5 border border-gray-700" />
              </div>
            </div>
          </div>
        </div>

        <!-- Webhooks Tab -->
        <div v-if="activeTab === 'webhooks'" class="max-w-2xl">
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 class="text-sm font-semibold text-white mb-4">Webhook Endpoints</h2>
            <p class="text-xs text-gray-500 mb-4">Webhooks are called when API requests are made to the proxy.</p>
            <div class="flex gap-2 mb-4">
              <input v-model="newWebhookUrl" type="url" placeholder="https://example.com/webhook"
                class="flex-1 bg-gray-800 text-gray-200 text-sm rounded-lg px-4 py-2.5 border border-gray-700 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                @keyup.enter="handleAddWebhook" />
              <button @click="handleAddWebhook" :disabled="addingWebhook"
                class="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-2">
                <Icon v-if="!addingWebhook" name="plus" class="w-4 h-4" />
                <div v-else class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                {{ addingWebhook ? 'Adding...' : 'Add Webhook' }}
              </button>
            </div>
            <div v-if="webhooks.length === 0" class="text-center py-8">
              <Icon name="webhook" class="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p class="text-xs text-gray-500">No webhooks configured</p>
            </div>
            <div v-else class="space-y-2">
              <div v-for="wh in webhooks" :key="wh.id"
                class="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 group hover:bg-gray-800 transition-colors">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <div class="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Icon name="webhook" class="w-4 h-4 text-indigo-400" />
                  </div>
                  <code class="text-xs text-gray-300 font-mono truncate">{{ wh.url }}</code>
                </div>
                <button @click="confirmDeleteWebhook(wh)"
                  class="ml-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100">
                  Remove
                </button>
              </div>
            </div>
          </div>

          <div v-if="showDeleteWebhookConfirm" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showDeleteWebhookConfirm = false">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div class="relative bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 class="text-lg font-semibold text-white mb-2">Remove Webhook</h3>
              <p class="text-sm text-gray-400 mb-4">Are you sure you want to remove this webhook?</p>
              <code class="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded font-mono block mb-4 break-all">{{ toDeleteWebhook?.url }}</code>
              <div class="flex items-center justify-end gap-3">
                <button @click="showDeleteWebhookConfirm = false" class="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
                <button @click="handleDeleteWebhook" :disabled="deletingWebhook"
                  class="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {{ deletingWebhook ? 'Removing...' : 'Remove' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Admin Tab -->
        <div v-if="activeTab === 'admin'" class="max-w-2xl">
          <div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Icon name="shield" class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 class="text-sm font-semibold text-white">Admin Access</h2>
                <p class="text-xs text-gray-500">Use this token to authenticate API calls to admin endpoints.</p>
              </div>
            </div>
            <div class="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
              <code class="text-sm text-indigo-300 font-mono flex-1">admin</code>
              <button @click="copyText('admin')" class="text-gray-400 hover:text-gray-200 transition-colors" title="Copy token">
                <Icon name="copy" class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-gray-600 mt-2">Set <code class="text-gray-500 bg-gray-800 px-1 rounded">ADMIN_TOKEN</code> env var to change.</p>
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
const webhooks = ref([])
const newWebhookUrl = ref('')
const addingWebhook = ref(false)
const showDeleteWebhookConfirm = ref(false)
const toDeleteWebhook = ref(null)
const deletingWebhook = ref(false)

async function loadSettings() {
  try {
    const [configData, webhookData] = await Promise.all([
      api.getConfig(),
      api.getWebhooks()
    ])
    config.value = configData
    webhooks.value = webhookData
  } catch (e) {
    toast?.error('Load failed', e.message || 'Could not load settings')
    console.error('Failed to load settings:', e)
  } finally {
    loading.value = false
  }
}

async function handleAddWebhook() {
  if (!newWebhookUrl.value) return
  addingWebhook.value = true
  try {
    await api.addWebhook(newWebhookUrl.value)
    toast?.success('Webhook added', newWebhookUrl.value)
    newWebhookUrl.value = ''
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
