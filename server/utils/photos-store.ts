import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import type { Photo } from '~~/shared/photo'
import { getOssClient } from '~~/server/utils/oss'

const LOCAL_OSS_ROOT = path.resolve(process.cwd(), 'local-oss')
const PHOTOS_JSON_PATH = path.join(LOCAL_OSS_ROOT, 'meta', 'photos.json')
const PHOTOS_JSON_KEY = 'meta/photos.json'

const etagOf = (value: string) => createHash('sha1').update(value).digest('hex')

export async function readPhotosJson() {
  const oss = getOssClient()
  if (oss) {
    try {
      const res = await oss.get(PHOTOS_JSON_KEY)
      const raw = (res.content as Buffer).toString('utf8')
      const etag = String(res.res.headers.etag ?? '')
      const photos = JSON.parse(raw || '[]') as Photo[]
      return { photos, etag }
    } catch (err) {
      const status = (err as { status?: number; code?: string })?.status
      const code = (err as { status?: number; code?: string })?.code
      if (status === 404 || code === 'NoSuchKey') {
        return { photos: [] as Photo[], etag: '' }
      }
      throw err
    }
  }

  const raw = await fs.readFile(PHOTOS_JSON_PATH, 'utf8').catch((err) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return '[]'
    }
    throw err
  })
  const etag = etagOf(raw)
  const photos = JSON.parse(raw) as Photo[]
  return { photos, etag }
}

export async function writePhotosJson(next: Photo[], opts?: { ifMatch?: string }) {
  const current = await readPhotosJson()
  if (opts?.ifMatch && opts.ifMatch !== current.etag) {
    throw createError({ statusCode: 412, statusMessage: 'Precondition Failed' })
  }

  const raw = JSON.stringify(next, null, 2)
  const oss = getOssClient()
  if (oss) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' }
    const res = await oss.put(PHOTOS_JSON_KEY, Buffer.from(`${raw}\n`, 'utf8'), { headers })
    const etag = String(res.res.headers.etag ?? '')
    return { etag }
  }

  await fs.mkdir(path.dirname(PHOTOS_JSON_PATH), { recursive: true })
  await fs.writeFile(PHOTOS_JSON_PATH, `${raw}\n`, 'utf8')
  return { etag: etagOf(`${raw}\n`) }
}

export function localObjectKeyToFilePath(key: string) {
  return path.join(LOCAL_OSS_ROOT, key)
}

export async function removeObjectByKey(key: string) {
  const oss = getOssClient()
  if (oss) {
    await oss.delete(key).catch(() => {})
    return
  }

  const filePath = localObjectKeyToFilePath(key)
  await fs.rm(filePath, { force: true })
}
