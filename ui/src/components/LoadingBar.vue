<template>
  <Transition name="fade">
    <div v-if="visible" class="fixed top-0 left-0 right-0 h-[2px] z-[100]">
      <div class="h-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-loading-bar" />
    </div>
  </Transition>
</template>

<script setup>
defineProps({ visible: Boolean })
</script>
