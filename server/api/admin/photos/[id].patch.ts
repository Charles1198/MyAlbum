import { createError, getRequestHeader, getRouterParam, readBody, setResponseHeader } from 'h3'
import type { Photo } from '~~/shared/photo'
import { requireAdmin } from '~~/server/utils/admin-session'
import { readPhotosJson, writePhotosJson } from '~~/server/utils/photos-store'

type PatchBody = Partial<
  Pick<Photo, 'title' | 'description' | 'tags' | 'takenAt' | 'location' | 'isPublic' | 'order'>
>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  requireAdmin(event, config.authSecret)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const body = (await readBody(event).catch(() => null)) as PatchBody | null
  if (!body) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const { photos, etag } = await readPhotosJson()
  const idx = photos.findIndex((p) => p.id === id)
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  const current = photos[idx]
  const next: Photo = {
    ...current,
    ...body,
    updatedAt: new Date().toISOString(),
  }

  const nextPhotos = photos.slice()
  nextPhotos[idx] = next

  const ifMatch = getRequestHeader(event, 'if-match') ?? etag
  const { etag: nextEtag } = await writePhotosJson(nextPhotos, { ifMatch })
  setResponseHeader(event, 'etag', nextEtag)
  return next
})

