<template>
  <div class="flex-1 flex items-center justify-center bg-gray-950">
    <div class="w-full max-w-md mx-4">
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div class="text-center mb-8">
          <div class="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-xl font-semibold text-white">Admin Login</h1>
          <p class="text-sm text-gray-400 mt-1">Enter the admin token shown in the server console</p>
        </div>
        <form @submit.prevent="login">
          <input
            v-model="token"
            type="text"
            placeholder="Admin token"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
            autocomplete="off"
          />
          <button
            type="submit"
            class="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
            :disabled="!token || loading"
          >
            {{ loading ? 'Verifying...' : 'Sign In' }}
          </button>
        </form>
        <p v-if="error" class="text-red-400 text-sm text-center mt-4">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setToken } from '../api.js'

const router = useRouter()
const token = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  if (!token.value) return
  loading.value = true
  error.value = ''
  setToken(token.value)
  try {
    const res = await fetch('/v1/admin/config', {
      headers: { 'x-admin-token': token.value }
    })
    if (!res.ok) {
      setToken(null)
      error.value = 'Invalid token. Check the server console for the correct token.'
      return
    }
    router.push('/')
  } catch {
    setToken(null)
    error.value = 'Could not connect to server. Is it running?'
  } finally {
    loading.value = false
  }
}
</script>
