<template>
  <div ref="root" class="w-full">
    <div
      class="grid gap-1.5"
      :style="{
        gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      }"
    >
      <div v-for="(col, idx) in columns" :key="idx" class="flex flex-col gap-1.5">
        <button
          v-for="p in col"
          :key="p.id"
          type="button"
          class="group overflow-hidden bg-transparent outline-none"
          @click="$emit('select', p.id)"
        >
          <div class="relative bg-black/5 dark:bg-white/5">
            <img
              v-if="p.images?.thumbnail"
              :src="p.images.thumbnail"
              class="h-auto w-full select-none object-cover opacity-0 transition-[opacity,transform] duration-200 ease-out will-change-transform group-hover:scale-110"
              :class="{ 'opacity-100': loadedIds.has(p.id) }"
              loading="lazy"
              decoding="async"
              @load="markLoaded(p.id)"
            />
            <div
              class="pointer-events-none absolute inset-0 flex items-end opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              <div class="w-full bg-gradient-to-t from-black/75 via-black/25 to-transparent px-3 pb-3 pt-10 text-left text-white">
                <div class="text-sm font-semibold leading-snug">
                  {{ p.title || 'Untitled' }}
                </div>
                <div v-if="p.description" class="mt-1 text-xs text-white/85 truncate">
                  {{ p.description }}
                </div>
                <div v-if="p.takenAt" class="mt-2 flex items-center gap-1 text-[11px] text-white/80">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 opacity-90">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <path d="M3 10h18" />
                    <path d="M21 8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
                  </svg>
                  <span>{{ formatTakenAt(p.takenAt) }}</span>
                </div>

                <div v-if="p.exif?.camera" class="mt-1 flex items-center gap-1 text-[11px] text-white/85">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 opacity-90">
                    <path d="M14.4 5H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5.6" />
                    <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                    <path d="M9 5l1.5-2h3L15 5" />
                  </svg>
                  <span class="truncate max-w-[18rem]">{{ cameraShort(p.exif.camera) }}</span>
                </div>
                <div
                  v-if="p.exif?.focalLength || p.exif?.aperture || p.exif?.shutter || typeof p.exif?.iso === 'number'"
                  class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/85"
                >
                  <span v-if="p.exif?.focalLength" class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 opacity-90">
                      <path d="M7 12h10" />
                      <path d="M12 7v10" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <span>{{ p.exif.focalLength }}</span>
                  </span>
                  <span v-if="p.exif?.aperture" class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 opacity-90">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m14.31 8 5.74 9.94" />
                      <path d="M9.69 8h11.48" />
                      <path d="m7.38 12 5.74-9.94" />
                      <path d="M9.69 16 3.95 6.06" />
                      <path d="M14.31 16H2.83" />
                      <path d="m16.62 12-5.74 9.94" />
                    </svg>
                    <span>{{ p.exif.aperture }}</span>
                  </span>
                  <span v-if="p.exif?.shutter" class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 opacity-90">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    <span>{{ p.exif.shutter }}</span>
                  </span>
                  <span v-if="typeof p.exif?.iso === 'number'" class="inline-flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5 opacity-90">
                      <rect x="3" y="6" width="18" height="12" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" />
                      <text x="12" y="15" text-anchor="middle" font-size="8" fill="currentColor" font-family="ui-sans-serif, system-ui">ISO</text>
                    </svg>
                    <span>{{ p.exif.iso }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Photo } from '~~/shared/photo'

const props = defineProps<{
  photos: Photo[]
  minColumnWidth?: number
}>()

defineEmits<{
  select: [id: string]
}>()

const GAP = 6
const minColumnWidth = computed(() => props.minColumnWidth ?? 240)

const root = ref<HTMLElement | null>(null)
const rootWidth = ref(0)

onMounted(() => {
  if (!root.value) return
  const ro = new ResizeObserver((entries) => {
    rootWidth.value = entries[0]?.contentRect.width ?? 0
  })
  ro.observe(root.value)
  onBeforeUnmount(() => ro.disconnect())
})

const columnCount = computed(() => {
  const width = rootWidth.value
  const minW = minColumnWidth.value
  if (!width) return 2
  return Math.max(2, Math.floor((width + GAP) / (minW + GAP)))
})

const columnWidthPx = computed(() => {
  const width = rootWidth.value
  const count = columnCount.value
  if (!width || count <= 0) return minColumnWidth.value
  return Math.floor((width - GAP * (count - 1)) / count)
})

const ratios = shallowReactive(new Map<string, number>())
const loadedIds = shallowReactive(new Set<string>())

const markLoaded = (id: string) => {
  loadedIds.add(id)
}

const ensureRatio = (p: Photo) => {
  if (!import.meta.client) return
  if (!p.images?.thumbnail) return
  if (ratios.has(p.id)) return

  const img = new Image()
  img.decoding = 'async'
  img.src = p.images.thumbnail
  img.onload = () => {
    if (!img.naturalWidth || !img.naturalHeight) return
    ratios.set(p.id, img.naturalHeight / img.naturalWidth)
  }
}

const formatTakenAt = (value: string) => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString().slice(0, 10)
}

const cameraShort = (value?: string) => {
  const parts = (value ?? '').split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length <= 2) return parts.join(' ')
  return parts.slice(-2).join(' ')
}

watch(
  () => props.photos,
  (list) => list.forEach(ensureRatio),
  { immediate: true }
)

const columns = computed(() => {
  const count = columnCount.value
  const cw = columnWidthPx.value
  const cols: Photo[][] = Array.from({ length: count }, () => [])
  const heights = Array.from({ length: count }, () => 0)

  for (const p of props.photos) {
    const ratio = ratios.get(p.id) ?? 1
    const est = cw * ratio
    let minIdx = 0
    for (let i = 1; i < heights.length; i++) {
      if ((heights[i] ?? 0) < (heights[minIdx] ?? 0)) minIdx = i
    }
    cols[minIdx]?.push(p)
    heights[minIdx] = (heights[minIdx] ?? 0) + est + GAP
  }

  return cols
})
</script>
