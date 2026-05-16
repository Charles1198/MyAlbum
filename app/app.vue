<template>
  <div class="min-h-dvh bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <ThemeToggle />
  </div>
</template>

<script setup lang="ts">
import ThemeToggle from './components/ThemeToggle.vue'
</script>
