import { getRequestHeader, setResponseHeader, setResponseStatus } from 'h3'
import type { Photo } from '~~/shared/photo'
import { requireAdmin } from '~~/server/utils/admin-session'
import { readPhotosJson } from '~~/server/utils/photos-store'
import { resolveImageUrl } from '~~/server/utils/image-urls'

const normalizePhoto = (p: Photo): Photo => ({
  ...p,
  images: p.images
    ? {
        ...p.images,
        original: resolveImageUrl(p.images.original),
        thumbnail: resolveImageUrl(p.images.thumbnail),
        large: resolveImageUrl(p.images.large),
        largeWebp: resolveImageUrl(p.images.largeWebp),
      }
    : p.images,
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  requireAdmin(event, config.authSecret)

  const { photos, etag } = await readPhotosJson()

  const ifNoneMatch = getRequestHeader(event, 'if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return null
  }

  setResponseHeader(event, 'etag', etag)

  return photos
    .slice()
    .sort((a, b) => {
      const orderDiff = (b.order ?? 0) - (a.order ?? 0)
      if (orderDiff) return orderDiff
      const ta = a.takenAt ?? a.createdAt ?? a.updatedAt ?? ''
      const tb = b.takenAt ?? b.createdAt ?? b.updatedAt ?? ''
      if (ta !== tb) return tb.localeCompare(ta)
      return b.id.localeCompare(a.id)
    })
    .map(normalizePhoto)
})
