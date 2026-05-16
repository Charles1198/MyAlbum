import { createError, getRequestHeader, getRouterParam, setResponseHeader, setResponseStatus } from 'h3'
import type { Photo } from '~~/shared/photo'
import { readPhotosJson } from '~~/server/utils/photos-store'
import { resolveImageUrl } from '~~/server/utils/image-urls'

const normalizePhoto = (p: Photo): Photo => ({
  ...p,
  images: p.images
    ? {
        ...p.images,
        original: resolveImageUrl(p.images.original),
        thumbnail: resolveImageUrl(p.images.thumbnail),
      }
    : p.images,
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const { photos, etag } = await readPhotosJson()

  const ifNoneMatch = getRequestHeader(event, 'if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return null
  }

  setResponseHeader(event, 'etag', etag)

  const found = photos.find((p) => p.id === id && p.isPublic !== false)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Not Found' })

  return normalizePhoto(found)
})
