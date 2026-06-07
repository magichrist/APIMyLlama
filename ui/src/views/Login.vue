<template>
  <div class="flex-1 relative overflow-hidden bg-gray-950 flex items-center justify-center">
    <!-- Animated gradient orbs -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -left-40 w-[32rem] h-[32rem] bg-indigo-600/20 rounded-full blur-3xl animate-drift-slow" />
      <div class="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] bg-violet-600/20 rounded-full blur-3xl animate-drift-slower" />
      <div class="absolute top-1/3 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-drift" />
    </div>

    <!-- Glassmorphism login card -->
    <div class="relative z-10 w-full max-w-md mx-4 animate-fade-up">
      <div class="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl p-8 shadow-2xl shadow-indigo-500/5">
        <!-- Branding -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
            <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 class="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">APIMyLlama</h1>
          <p class="text-sm text-gray-500 mt-2">Enter the admin token to manage your API proxy</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="login" class="space-y-5">
          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <input
              v-model="token"
              type="text"
              placeholder="Paste your admin token"
              class="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              autocomplete="off"
            />
          </div>

          <button
            type="submit"
            :disabled="!token || loading"
            class="relative w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:from-indigo-500/50 disabled:to-violet-600/50 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <!-- Loading spinner -->
            <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>{{ loading ? 'Verifying...' : 'Sign In' }}</span>
          </button>
        </form>

        <!-- Error message with shake -->
        <div v-if="error" class="mt-5">
          <div class="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-shake">
            <svg class="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm text-red-300">{{ error }}</p>
          </div>
        </div>
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

<style scoped>
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes drift-slow {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(40px, -40px) scale(1.05); }
  66% { transform: translate(-20px, 30px) scale(0.95); }
}

@keyframes drift-slower {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-40px, 50px) scale(1.08); }
  66% { transform: translate(30px, -20px) scale(0.92); }
}

@keyframes drift {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(20px, -20px) rotate(180deg); }
}

.animate-fade-up {
  animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.animate-drift-slow {
  animation: drift-slow 20s ease-in-out infinite;
}

.animate-drift-slower {
  animation: drift-slower 25s ease-in-out infinite;
}

.animate-drift {
  animation: drift 30s ease-in-out infinite;
}
</style>
