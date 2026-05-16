import { createError, getRequestHeader, getRouterParam, setResponseHeader } from 'h3'
import { requireAdmin } from '~~/server/utils/admin-session'
import { readPhotosJson, removeObjectByKey, writePhotosJson } from '~~/server/utils/photos-store'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  requireAdmin(event, config.authSecret)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const { photos, etag } = await readPhotosJson()
  const found = photos.find((p) => p.id === id)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const next = photos.filter((p) => p.id !== id)
  const ifMatch = getRequestHeader(event, 'if-match') ?? etag
  const { etag: nextEtag } = await writePhotosJson(next, { ifMatch })
  setResponseHeader(event, 'etag', nextEtag)

  const keys = [found.images?.original, found.images?.thumbnail].filter(Boolean) as string[]
  await Promise.all(keys.map((k) => removeObjectByKey(k).catch(() => {})))

  return { ok: true }
})

