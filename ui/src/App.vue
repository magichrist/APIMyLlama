<template>
  <div class="flex h-screen bg-gray-950 text-gray-100">
    <!-- Subtle ambient background -->
    <div class="fixed inset-0 bg-grid pointer-events-none"></div>
    <div class="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)] pointer-events-none"></div>
    <Sidebar v-if="showSidebar" />
    <router-view />
    <Toast :toasts="toasts" @remove="remove" />
  </div>
</template>

<script setup>
import { provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import { useToast } from './composables/useToast.js'

const route = useRoute()
const showSidebar = computed(() => route.name !== 'Login')

const { toasts, remove, success, error, info, warning } = useToast()
provide('toast', { success, error, info, warning })
</script>
