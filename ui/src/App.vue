<template>
  <div class="flex h-screen bg-gray-950 text-gray-100">
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
