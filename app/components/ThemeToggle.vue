<template>
  <button
    class="fixed right-3 top-3 z-40 rounded-full border border-black/10 bg-white/70 p-2 text-neutral-900 backdrop-blur hover:bg-white/90 dark:border-white/10 dark:bg-black/50 dark:text-neutral-100 dark:hover:bg-black/70"
    type="button"
    aria-label="切换主题"
    title="切换主题"
    @click="toggle"
  >
    <svg
      v-if="isDark"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </svg>
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-5 w-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const { toggle } = useTheme()

const isDark = computed(() => {
  if (!import.meta.client) return false
  return document.documentElement.classList.contains('dark')
})
</script>
