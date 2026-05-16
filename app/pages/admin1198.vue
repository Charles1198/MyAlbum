<template>
  <main class="mx-auto max-w-5xl px-4 py-10">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold">管理</h1>
        <div v-if="authenticated" class="text-xs text-emerald-300">已登录</div>
        <div v-else class="text-xs text-rose-300">未登录</div>
      </div>

      <div class="flex items-center gap-3">
        <NuxtLink to="/" class="text-sm underline underline-offset-4">返回首页</NuxtLink>
        <button
          v-if="authenticated"
          class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          type="button"
          @click="logout"
        >
          退出
        </button>
      </div>
    </div>

    <section v-if="!authenticated" class="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
      <div class="text-sm font-medium">登录</div>
      <form class="mt-4 space-y-3" @submit.prevent="login">
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="管理员密码"
          class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
        />
        <button class="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black" type="submit">
          登录
        </button>
        <div v-if="errorText" class="text-xs text-rose-300">{{ errorText }}</div>
      </form>
    </section>

    <section v-else class="mt-8 space-y-8">
      <div class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="text-sm font-medium">上传</div>
        <form class="mt-4 grid gap-3" @submit.prevent="upload">
          <input
            v-model="title"
            type="text"
            placeholder="标题（可选）"
            class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
          />
          <input
            v-model="tags"
            type="text"
            placeholder="标签（可选，用英文逗号分隔）"
            class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
          />
          <textarea
            v-model="description"
            rows="3"
            placeholder="描述（可选）"
            class="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/20"
          />
          <div class="flex flex-wrap items-center gap-3">
            <input
              :key="fileInputKey"
              type="file"
              accept="image/*"
              multiple
              class="text-sm"
              @change="onFileChange"
            />
            <button
              class="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
              type="submit"
              :disabled="uploading"
            >
              {{ uploading ? (uploadProgress ? `上传中 ${uploadProgress.done}/${uploadProgress.total}` : '上传中...') : '上传' }}
            </button>
            <div v-if="files.length" class="text-xs text-neutral-400">已选择 {{ files.length }} 张</div>
            <div v-if="errorText" class="text-xs text-rose-300">{{ errorText }}</div>
          </div>
        </form>
      </div>

      <div class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="text-sm font-medium">图片（{{ photos.length }}）</div>
            <div v-if="selectedCount" class="text-xs text-neutral-400">已选 {{ selectedCount }} 张</div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              type="button"
              @click="selectAll"
            >
              全选
            </button>
            <button
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              type="button"
              @click="clearSelection"
            >
              清空
            </button>
            <button
              class="rounded-lg bg-rose-500/90 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              type="button"
              :disabled="deleting || !selectedCount"
              @click="removeSelected"
            >
              {{ deleting ? '删除中...' : '删除选中' }}
            </button>
            <button
              class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
              type="button"
              :disabled="uploading || deleting"
              @click="loadPhotos"
            >
              刷新
            </button>
          </div>
        </div>

        <div v-if="photos.length === 0" class="mt-4 text-sm text-neutral-300">暂无数据</div>

        <div v-else class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div v-for="p in photos" :key="p.id" class="relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <label class="absolute left-2 top-2 z-10 inline-flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs text-white">
              <input
                type="checkbox"
                class="h-4 w-4 accent-white"
                :checked="selectedIds.has(p.id)"
                @change="toggleSelected(p.id, ($event.target as HTMLInputElement).checked)"
              />
              选中
            </label>
            <div class="aspect-[4/3] bg-black/40">
              <img v-if="p.images?.thumbnail" :src="p.images.thumbnail" class="h-full w-full object-cover" />
            </div>
            <div class="p-3">
              <div class="truncate text-sm font-medium">{{ p.title }}</div>
              <div class="mt-1 text-xs text-neutral-300">{{ p.description }}</div>
              <div class="mt-3 flex items-center justify-between gap-3">
                <div class="truncate text-[11px] text-neutral-400">{{ p.id }}</div>
                <button
                  class="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs hover:bg-white/10"
                  type="button"
                  @click="remove(p.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { Photo } from '~~/shared/photo'

const authenticated = ref(false)
const password = ref('')

const title = ref('')
const description = ref('')
const tags = ref('')
const files = ref<File[]>([])

const photos = ref<Photo[]>([])
const etag = ref<string>('')
const errorText = ref<string>('')
const uploading = ref(false)
const fileInputKey = ref(0)
const uploadProgress = ref<{ done: number; total: number } | null>(null)
const deleting = ref(false)
const selectedIds = shallowRef(new Set<string>())

const selectedCount = computed(() => selectedIds.value.size)

const clearError = () => (errorText.value = '')

const loadPhotos = async () => {
  clearError()
  const res = await $fetch.raw<Photo[]>('/api/admin/photos')
  photos.value = res._data ?? []
  etag.value = res.headers.get('etag') ?? etag.value
}

const checkMe = async () => {
  const res = await $fetch<{ authenticated: boolean }>('/api/auth/me')
  authenticated.value = res.authenticated
  if (authenticated.value) await loadPhotos()
}

const login = async () => {
  clearError()
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await checkMe()
  } catch (err) {
    errorText.value = (err as { statusMessage?: string })?.statusMessage ?? '登录失败'
  }
}

const logout = async () => {
  clearError()
  await $fetch('/api/auth/logout', { method: 'POST' })
  authenticated.value = false
  photos.value = []
  etag.value = ''
  password.value = ''
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  files.value = input.files ? Array.from(input.files) : []
}

const upload = async () => {
  clearError()
  if (!files.value.length) {
    errorText.value = '请选择图片'
    return
  }

  const list = files.value.slice()

  try {
    uploading.value = true
    uploadProgress.value = { done: 0, total: list.length }

    for (const file of list) {
      const fd = new FormData()
      fd.append('title', title.value)
      fd.append('description', description.value)
      if (tags.value.trim()) fd.append('tags', tags.value.trim())
      fd.append('file', file)

      try {
        const res = await $fetch.raw('/api/admin/photos', {
          method: 'POST',
          body: fd,
          headers: etag.value ? { 'if-match': etag.value } : undefined,
        })
        etag.value = res.headers.get('etag') ?? etag.value
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 412) {
          await loadPhotos()
          const res = await $fetch.raw('/api/admin/photos', {
            method: 'POST',
            body: fd,
            headers: etag.value ? { 'if-match': etag.value } : undefined,
          })
          etag.value = res.headers.get('etag') ?? etag.value
        } else {
          throw err
        }
      }

      uploadProgress.value.done += 1
    }

    title.value = ''
    description.value = ''
    tags.value = ''
    files.value = []
    fileInputKey.value += 1
    await loadPhotos()
  } catch (err) {
    errorText.value = (err as { statusMessage?: string })?.statusMessage ?? '上传失败'
  } finally {
    uploading.value = false
    uploadProgress.value = null
  }
}

const remove = async (id: string) => {
  clearError()
  try {
    const res = await $fetch.raw(`/api/admin/photos/${id}`, {
      method: 'DELETE',
      headers: etag.value ? { 'if-match': etag.value } : undefined,
    })
    etag.value = res.headers.get('etag') ?? etag.value
    await loadPhotos()
  } catch (err) {
    errorText.value = (err as { statusMessage?: string })?.statusMessage ?? '删除失败'
  }
}

const toggleSelected = (id: string, checked: boolean) => {
  const next = new Set(selectedIds.value)
  if (checked) next.add(id)
  else next.delete(id)
  selectedIds.value = next
}

const selectAll = () => {
  selectedIds.value = new Set(photos.value.map((p) => p.id))
}

const clearSelection = () => {
  selectedIds.value = new Set()
}

const removeSelected = async () => {
  clearError()
  if (!selectedIds.value.size) return
  const ids = Array.from(selectedIds.value)

  try {
    deleting.value = true
    for (const id of ids) {
      try {
        const res = await $fetch.raw(`/api/admin/photos/${id}`, {
          method: 'DELETE',
          headers: etag.value ? { 'if-match': etag.value } : undefined,
        })
        etag.value = res.headers.get('etag') ?? etag.value
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 412) {
          await loadPhotos()
          const res = await $fetch.raw(`/api/admin/photos/${id}`, {
            method: 'DELETE',
            headers: etag.value ? { 'if-match': etag.value } : undefined,
          })
          etag.value = res.headers.get('etag') ?? etag.value
        } else {
          throw err
        }
      }
    }

    clearSelection()
    await loadPhotos()
  } catch (err) {
    errorText.value = (err as { statusMessage?: string })?.statusMessage ?? '批量删除失败'
  } finally {
    deleting.value = false
  }
}

await checkMe()
</script>
