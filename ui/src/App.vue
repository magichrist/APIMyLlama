<template>
  <div class="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
    <!-- Subtle ambient background -->
    <div class="fixed inset-0 bg-grid pointer-events-none"></div>
    <div class="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] pointer-events-none"></div>
    <Sidebar v-if="showSidebar" :isOpen="sidebarOpen" @close="sidebarOpen = false" />
    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
    <LoadingBar :visible="loadingVisible" />
    <ShortcutsHelp v-model="showShortcuts" />
    <Toast :toasts="toasts" @remove="remove" />

    <!-- Scroll to top FAB -->
    <Transition name="fade">
      <button
        v-if="showScrollTop"
        @click="scrollToTop"
        class="fixed bottom-6 right-6 z-50 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500/80 to-violet-500/80 backdrop-blur-xl border border-white/[0.10] text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Scroll to top"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { provide, computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import LoadingBar from './components/LoadingBar.vue'
import ShortcutsHelp from './components/ShortcutsHelp.vue'
import { useToast } from './composables/useToast.js'
import { useLoadingBar } from './composables/useLoadingBar.js'

const route = useRoute()
const router = useRouter()
const showSidebar = computed(() => route.name !== 'Login')
const sidebarOpen = ref(false)

// Provide sidebar toggle to child views (for Header hamburger button)
provide('toggleSidebar', () => { sidebarOpen.value = !sidebarOpen.value })

const { toasts, remove, success, error, info, warning } = useToast()
provide('toast', { success, error, info, warning })

// Loading bar
const { visible: loadingVisible, start: startLoading, stop: stopLoading } = useLoadingBar()
provide('loadingBar', { start: startLoading, stop: stopLoading })

// Scroll to top FAB
const showScrollTop = ref(false)
let scrollContainer = null

// Shortcuts help
const showShortcuts = ref(false)

// Global keyboard shortcuts
const globalShortcutKeys = {
  '?': () => { if (route.name !== 'Login') showShortcuts.value = !showShortcuts.value },
  'd': () => { if (route.name !== 'Login') router.push('/') },
  'e': () => { if (route.name !== 'Login') router.push('/keys') },
  's': () => { if (route.name !== 'Login') router.push('/settings') },
}

function onGlobalKeydown(e) {
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const key = e.key.toLowerCase()
  if (globalShortcutKeys[key]) {
    e.preventDefault()
    globalShortcutKeys[key]()
  }
}

function onScroll() {
  showScrollTop.value = (scrollContainer?.scrollTop || 0) > 200
}

function scrollToTop() {
  scrollContainer?.scrollTo({ top: 0, behavior: 'smooth' })
}

function attachScrollListener() {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScroll)
  }
  setTimeout(() => {
    scrollContainer = document.querySelector('main.flex-1')
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true })
    }
  }, 50)
}

// Watch route to trigger loading bar on navigation
watch(() => route.path, () => {
  startLoading()
  setTimeout(() => stopLoading(), 500)
})

watch(() => route.path, attachScrollListener)
onMounted(() => {
  attachScrollListener()
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', onScroll)
  }
  document.removeEventListener('keydown', onGlobalKeydown)
})
</script>
