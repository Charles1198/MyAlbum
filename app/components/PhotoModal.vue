<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50" @click="requestClose">
      <div class="absolute inset-0 bg-black/80 opacity-0 transition-opacity duration-200 ease-out" :class="{ 'opacity-100': entered }" />

      <div class="absolute inset-0 p-4 md:p-8" @click.stop>
        <div
          class="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-neutral-950 ring-1 ring-white/10 opacity-0 transition-all duration-200 ease-out will-change-transform"
          :class="entered ? 'opacity-100 translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'"
        >
          <div class="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div class="min-w-0">
              <div class="truncate text-sm font-medium text-neutral-100">
                {{ photo?.title || 'Untitled' }}
              </div>
              <div v-if="photo?.takenAt || photo?.location" class="truncate text-xs text-neutral-400">
                <span v-if="photo?.takenAt">{{ formatTime(photo.takenAt) }}</span>
                <span v-if="photo?.takenAt && photo?.location"> · </span>
                <span v-if="photo?.location">{{ photo.location }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                :disabled="!hasPrev"
                @click="emit('prev')"
              >
                上一张
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                :disabled="!hasNext"
                @click="emit('next')"
              >
                下一张
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                @click="copyLink"
              >
                复制链接
              </button>
              <button
                type="button"
                class="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                @click="requestClose"
              >
                关闭
              </button>
            </div>
          </div>

          <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div class="relative flex min-h-0 flex-1 items-center justify-center bg-black">
              <img
                v-if="thumbSrc"
                :src="thumbSrc"
                class="absolute inset-0 h-full w-full select-none object-contain opacity-60 blur-sm"
                decoding="async"
              />
              <img
                v-if="fullSrc"
                :key="fullSrc"
                :src="fullSrc"
                class="relative max-h-full max-w-full select-none object-contain opacity-0 transition-opacity duration-300 ease-out"
                :class="{ 'opacity-100': fullLoaded }"
                decoding="async"
                @load="fullLoaded = true"
              />
            </div>

            <div class="w-full shrink-0 border-t border-white/10 p-4 text-sm text-neutral-200 lg:w-96 lg:border-l lg:border-t-0">
              <div v-if="photo?.description" class="whitespace-pre-wrap text-neutral-200">{{ photo.description }}</div>
              <div v-else class="text-neutral-500">暂无描述</div>

              <div v-if="photo?.tags?.length" class="mt-4 flex flex-wrap gap-2">
                <div v-for="t in photo.tags" :key="t" class="rounded-full bg-white/5 px-2 py-1 text-xs text-neutral-200 ring-1 ring-white/10">
                  {{ t }}
                </div>
              </div>

              <div v-if="photo?.exif && hasExif(photo.exif)" class="mt-4 space-y-1 text-xs text-neutral-300">
                <div v-if="photo.exif.camera">相机：{{ photo.exif.camera }}</div>
                <div v-if="photo.exif.lens">镜头：{{ photo.exif.lens }}</div>
                <div v-if="photo.exif.focalLength">焦距：{{ photo.exif.focalLength }}</div>
                <div v-if="photo.exif.aperture">光圈：{{ photo.exif.aperture }}</div>
                <div v-if="photo.exif.shutter">快门：{{ photo.exif.shutter }}</div>
                <div v-if="photo.exif.iso">ISO：{{ photo.exif.iso }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Photo } from '~~/shared/photo'

const entered = ref(false)
const closing = ref(false)
const closeTimer = ref<number | null>(null)

const props = defineProps<{
  photo: Photo | null
  hasPrev: boolean
  hasNext: boolean
}>()

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const thumbSrc = computed(() => props.photo?.images?.thumbnail ?? '')
const fullSrc = computed(() => props.photo?.images?.original ?? props.photo?.images?.thumbnail ?? '')
const fullLoaded = ref(false)

watch(
  () => fullSrc.value,
  (src) => {
    fullLoaded.value = false
    if (!import.meta.client) return
    if (!src) return
    const img = new Image()
    img.onload = () => {
      fullLoaded.value = true
    }
    img.src = src
  },
  { immediate: true },
)

const formatTime = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const hasExif = (exif: NonNullable<Photo['exif']>) => Object.values(exif).some((v) => v !== undefined && v !== '')

const copyLink = async () => {
  if (!props.photo) return
  const url = new URL(window.location.href)
  url.searchParams.set('photo', props.photo.id)
  await navigator.clipboard.writeText(url.toString())
}

const requestClose = () => {
  if (closing.value) return
  closing.value = true
  entered.value = false
  if (closeTimer.value) window.clearTimeout(closeTimer.value)
  closeTimer.value = window.setTimeout(() => {
    emit('close')
  }, 200)
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') requestClose()
  if (e.key === 'ArrowLeft') emit('prev')
  if (e.key === 'ArrowRight') emit('next')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (closeTimer.value) window.clearTimeout(closeTimer.value)
})

onMounted(() => {
  requestAnimationFrame(() => {
    entered.value = true
  })
})
</script>
