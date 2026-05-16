import { getRequestHeader, setResponseHeader, setResponseStatus } from 'h3'
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
        large: resolveImageUrl(p.images.large),
        largeWebp: resolveImageUrl(p.images.largeWebp),
      }
    : p.images,
})

const toSortableTime = (p: Photo) => p.takenAt ?? p.createdAt ?? p.updatedAt ?? ''

export default defineEventHandler(async (event) => {
  const { photos, etag } = await readPhotosJson()

  setResponseHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=300')

  const ifNoneMatch = getRequestHeader(event, 'if-none-match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    setResponseStatus(event, 304)
    return null
  }

  setResponseHeader(event, 'etag', etag)

  const list = photos
    .filter((p) => p.isPublic !== false)
    .slice()
    .sort((a, b) => {
      const orderDiff = (b.order ?? 0) - (a.order ?? 0)
      if (orderDiff) return orderDiff
      const ta = toSortableTime(a)
      const tb = toSortableTime(b)
      if (ta !== tb) return tb.localeCompare(ta)
      return b.id.localeCompare(a.id)
    })
    .map(normalizePhoto)

  return list
})
