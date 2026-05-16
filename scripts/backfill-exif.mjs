import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import exifr from 'exifr'

const root = process.cwd()
const ossRoot = path.resolve(root, 'local-oss')
const photosJsonPath = path.join(ossRoot, 'meta', 'photos.json')

const shutterString = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined
  if (value >= 1) return `${value}s`
  const inv = Math.round(1 / value)
  if (inv <= 0) return `${value}s`
  return `1/${inv}`
}

const mapExif = (exifData) => {
  const takenAtValue = exifData?.DateTimeOriginal ?? exifData?.CreateDate ?? exifData?.ModifyDate
  const takenAt =
    takenAtValue instanceof Date
      ? takenAtValue.toISOString()
      : typeof takenAtValue === 'string'
        ? takenAtValue
        : undefined

  const gpsLat = exifData?.latitude ?? exifData?.GPSLatitude
  const gpsLng = exifData?.longitude ?? exifData?.GPSLongitude
  const location = typeof gpsLat === 'number' && typeof gpsLng === 'number' ? `${gpsLat},${gpsLng}` : undefined

  const cameraModel = exifData?.Model ?? exifData?.model
  const cameraMake = exifData?.Make ?? exifData?.make
  const camera = [cameraMake, cameraModel].filter(Boolean).join(' ').trim() || undefined

  const lens = exifData?.LensModel ?? exifData?.lensModel
  const focal = exifData?.FocalLength
  const focalLength = typeof focal === 'number' ? `${Math.round(focal)}mm` : typeof focal === 'string' ? focal : undefined

  const fNumber = exifData?.FNumber
  const aperture = typeof fNumber === 'number' ? `f/${fNumber}` : typeof fNumber === 'string' ? fNumber : undefined

  const exposureTime = exifData?.ExposureTime
  const shutter = typeof exposureTime === 'string' ? exposureTime : shutterString(exposureTime)

  const isoValue = exifData?.ISO ?? exifData?.PhotographicSensitivity
  const iso = typeof isoValue === 'number' ? isoValue : undefined

  return {
    takenAt,
    location,
    exif: {
      camera,
      lens,
      focalLength,
      aperture,
      shutter,
      iso,
    },
  }
}

const main = async () => {
  const raw = await readFile(photosJsonPath, 'utf8')
  const photos = JSON.parse(raw)

  let changed = 0
  for (const p of photos) {
    const originalKey = p?.images?.original
    if (!originalKey) continue

    const exifIsEmpty = !p.exif || Object.keys(p.exif).length === 0
    if (!exifIsEmpty && p.takenAt) continue

    const filePath = path.join(ossRoot, originalKey)
    const buf = await readFile(filePath).catch(() => null)
    if (!buf) continue

    let exifData = null
    try {
      exifData = await exifr.parse(buf, { exif: true, tiff: true, gps: true })
    } catch {
      exifData = null
    }

    const mapped = mapExif(exifData)
    const nextExif = Object.fromEntries(Object.entries(mapped.exif).filter(([, v]) => v !== undefined))
    const nextLocation = mapped.location ?? p.location
    const nextTakenAt = mapped.takenAt ?? p.takenAt

    const next = {
      ...p,
      ...(nextTakenAt ? { takenAt: nextTakenAt } : {}),
      ...(nextLocation ? { location: nextLocation } : {}),
      exif: nextExif,
      updatedAt: new Date().toISOString(),
    }

    p.takenAt = next.takenAt
    p.location = next.location
    p.exif = next.exif
    p.updatedAt = next.updatedAt
    changed += 1
  }

  if (!changed) {
    process.stdout.write('No changes\n')
    return
  }

  await writeFile(photosJsonPath, `${JSON.stringify(photos, null, 2)}\n`, 'utf8')
  process.stdout.write(`Updated ${changed} photos\n`)
}

await main()

