import { randomUUID } from 'node:crypto'
import { createError, getRequestHeader, readMultipartFormData, setResponseHeader } from 'h3'
import exifr from 'exifr'
import type { Photo } from '~~/shared/photo'
import { requireAdmin } from '~~/server/utils/admin-session'
import { autoTagFromThumbnail } from '~~/server/utils/auto-tag'
import { saveLarge, saveOriginal, saveThumbnail } from '~~/server/utils/image-store'
import { readPhotosJson, removeObjectByKey, writePhotosJson } from '~~/server/utils/photos-store'
import path from 'node:path'

const extFromFilename = (name?: string) => {
  const lower = (name ?? '').toLowerCase()
  if (lower.endsWith('.jpeg')) return 'jpeg'
  if (lower.endsWith('.jpg')) return 'jpg'
  if (lower.endsWith('.png')) return 'png'
  if (lower.endsWith('.webp')) return 'webp'
  return 'jpg'
}

const shutterString = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  if (value >= 1) return `${value}s`
  const inv = Math.round(1 / value)
  if (inv <= 0) return `${value}s`
  return `1/${inv}`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  requireAdmin(event, config.authSecret)

  const items = await readMultipartFormData(event)
  if (!items) throw createError({ statusCode: 400, statusMessage: 'Bad Request' })

  const getField = (name: string) => items.find((i) => i.name === name && 'data' in i)?.data?.toString()

  const tagsRaw = (getField('tags') ?? '').trim()
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : undefined

  const fileItem = items.find((i) => i.name === 'file' && 'data' in i && i.data instanceof Buffer) as
    | { name: string; data: Buffer; filename?: string; type?: string }
    | undefined

  if (!fileItem?.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'file required' })
  }

  const filenameBase = (fileItem.filename ? path.parse(fileItem.filename).name : '').trim()
  const title = ((getField('title') ?? '').trim() || filenameBase || 'Untitled').slice(0, 200)
  const description = (getField('description') ?? '').trim()

  const id = randomUUID()
  const now = new Date().toISOString()

  const ext = extFromFilename(fileItem.filename)
  const original = await saveOriginal({ id, ext, buffer: fileItem.data })

  let thumbnail: { key: string; buffer: Buffer } | undefined
  let large: { jpgKey: string; webpKey: string } | undefined
  try {
    thumbnail = await saveThumbnail({ id, buffer: fileItem.data })
    large = await saveLarge({ id, buffer: fileItem.data })
  } catch (err) {
    await removeObjectByKey(original.key).catch(() => {})
    if (thumbnail) await removeObjectByKey(thumbnail.key).catch(() => {})
    await removeObjectByKey(`photos/large/${id}.jpg`).catch(() => {})
    await removeObjectByKey(`photos/large/${id}.webp`).catch(() => {})
    throw err
  }

  let exifData: Record<string, unknown> | null = null
  try {
    exifData = (await exifr.parse(fileItem.data, { exif: true, tiff: true, gps: true })) as Record<
      string,
      unknown
    >
  } catch {
    exifData = null
  }

  const takenAtValue = exifData?.DateTimeOriginal ?? exifData?.CreateDate ?? exifData?.ModifyDate
  const takenAt =
    takenAtValue instanceof Date ? takenAtValue.toISOString() : typeof takenAtValue === 'string' ? takenAtValue : undefined

  const gpsLat = exifData?.latitude ?? exifData?.GPSLatitude
  const gpsLng = exifData?.longitude ?? exifData?.GPSLongitude
  const location =
    typeof gpsLat === 'number' && typeof gpsLng === 'number' ? `${gpsLat},${gpsLng}` : undefined

  const cameraModel = (exifData?.Model ?? exifData?.model) as string | undefined
  const cameraMake = (exifData?.Make ?? exifData?.make) as string | undefined
  const camera = [cameraMake, cameraModel].filter(Boolean).join(' ').trim() || undefined

  const lens = (exifData?.LensModel ?? exifData?.lensModel) as string | undefined
  const focal = exifData?.FocalLength
  const focalLength = typeof focal === 'number' ? `${Math.round(focal)}mm` : typeof focal === 'string' ? focal : undefined

  const fNumber = exifData?.FNumber
  const aperture =
    typeof fNumber === 'number' ? `f/${fNumber}` : typeof fNumber === 'string' ? fNumber : undefined

  const exposureTime = exifData?.ExposureTime
  const shutter =
    typeof exposureTime === 'string' ? exposureTime : shutterString(exposureTime)

  const isoValue = exifData?.ISO ?? exifData?.PhotographicSensitivity
  const iso = typeof isoValue === 'number' ? isoValue : undefined

  const auto = thumbnail?.buffer
    ? await autoTagFromThumbnail({
        thumbnailJpeg: thumbnail.buffer,
        existingDescription: description || undefined,
        existingTags: tags,
      })
    : null

  const finalDescription = description || auto?.description || undefined
  const mergedTags = (() => {
    const set = new Set<string>()
    for (const t of tags ?? []) set.add(t)
    for (const t of auto?.tags ?? []) set.add(t)
    const list = Array.from(set).filter(Boolean)
    return list.length ? list : undefined
  })()

  const nextPhoto: Photo = {
    id,
    title,
    description: finalDescription,
    tags: mergedTags,
    takenAt,
    location,
    images: {
      original: original.key,
      thumbnail: thumbnail.key,
      large: large?.jpgKey,
      largeWebp: large?.webpKey,
    },
    exif: {
      camera,
      lens,
      focalLength,
      aperture,
      shutter,
      iso,
    },
    isPublic: true,
    createdAt: now,
    updatedAt: now,
    order: 0,
  }

  const { photos, etag } = await readPhotosJson()
  const ifMatch = getRequestHeader(event, 'if-match') ?? etag

  try {
    const { etag: nextEtag } = await writePhotosJson([nextPhoto, ...photos], { ifMatch })
    setResponseHeader(event, 'etag', nextEtag)
    return nextPhoto
  } catch (err) {
    await removeObjectByKey(original.key).catch(() => {})
    await removeObjectByKey(thumbnail.key).catch(() => {})
    throw err
  }
})
