<template>
  <div>
    <header class="relative h-[40dvh] min-h-[300px] w-full overflow-hidden bg-gradient-to-b from-neutral-400 to-white dark:bg-none">
      <div v-if="cameraBgUrl" class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          class="h-[80%] w-[70%] bg-contain bg-center bg-no-repeat"
          :style="{ backgroundImage: `url(${cameraBgUrl})` }"
        />
      </div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.24),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,0.10),transparent_55%)]" />

      <div class="relative mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-4xl font-semibold text-white ring-1 ring-white/15">
          C
        </div>
        <h1 class="mt-5 text-2xl font-semibold tracking-tight text-white md:text-4xl">Charles 的相册</h1>
      </div>
    </header>

    <main class="p-1.5">
      <PhotoMasonry v-if="photos?.length" :photos="photos" @select="openById" />
      <div v-else class="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">暂无图片</div>
    </main>

    <PhotoModal
      v-if="selected"
      :photo="selected"
      :has-prev="hasPrev"
      :has-next="hasNext"
      @close="close"
      @prev="prev"
      @next="next"
    />
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '~~/shared/photo'
import PhotoMasonry from '~/components/PhotoMasonry.vue'
import PhotoModal from '~/components/PhotoModal.vue'

const route = useRoute()
const router = useRouter()

const { data: photos } = await useFetch<Photo[]>('/api/photos')

const cameraBgUrl = computed(() => {
  const images = import.meta.glob('~/assets/images/*', { eager: true, query: '?url', import: 'default' }) as Record<
    string,
    string
  >
  for (const [key, value] of Object.entries(images)) {
    if (key.endsWith('/myCamera.png')) return value
  }
  return ''
})

const selectedId = ref<string | null>(null)

const selectedIndex = computed(() => {
  if (!photos.value || !selectedId.value) return -1
  return photos.value.findIndex((p) => p.id === selectedId.value)
})

const selected = computed(() => {
  if (!photos.value) return null
  return photos.value.find((p) => p.id === selectedId.value) ?? null
})

const hasPrev = computed(() => selectedIndex.value > 0)
const hasNext = computed(() => {
  const list = photos.value ?? []
  const idx = selectedIndex.value
  return idx !== -1 && idx < list.length - 1
})

const openById = async (id: string) => {
  selectedId.value = id
  await router.replace({ query: { ...route.query, photo: id } })
}

const close = async () => {
  selectedId.value = null
  const q = { ...route.query }
  delete q.photo
  await router.replace({ query: q })
}

const prev = async () => {
  const list = photos.value ?? []
  const idx = selectedIndex.value
  if (idx <= 0) return
  const target = list[idx - 1]
  if (!target) return
  await openById(target.id)
}

const next = async () => {
  const list = photos.value ?? []
  const idx = selectedIndex.value
  if (idx === -1 || idx >= list.length - 1) return
  const target = list[idx + 1]
  if (!target) return
  await openById(target.id)
}

watch(
  () => route.query.photo,
  (v) => {
    const id = typeof v === 'string' ? v : null
    selectedId.value = id
  },
  { immediate: true }
)

watch(
  () => selectedId.value,
  (v) => {
    if (!import.meta.client) return
    document.documentElement.style.overflow = v ? 'hidden' : ''
  },
  { immediate: true }
)
</script>
