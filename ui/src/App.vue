<template>
  <div class="flex h-screen bg-gray-950 text-gray-100">
    <Sidebar />
    <router-view />
    <Toast :toasts="toasts" @remove="remove" />
  </div>
</template>

<script setup>
import { provide } from 'vue'
import Sidebar from './components/Sidebar.vue'
import Toast from './components/Toast.vue'
import { useToast } from './composables/useToast.js'

const { toasts, remove, success, error, info, warning } = useToast()
provide('toast', { success, error, info, warning })
</script>
