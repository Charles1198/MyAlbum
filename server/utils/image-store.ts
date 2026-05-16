import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { getOssClient } from '~~/server/utils/oss'

const LOCAL_OSS_ROOT = path.resolve(process.cwd(), 'local-oss')

const contentTypeOfExt = (ext: string) => {
  switch (ext.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

export async function saveOriginal(params: { id: string; ext: string; buffer: Buffer }) {
  const key = `photos/original/${params.id}.${params.ext}`
  const oss = getOssClient()
  if (oss) {
    await oss.put(key, params.buffer, { headers: { 'Content-Type': contentTypeOfExt(params.ext) } })
    return { key }
  }

  const filePath = path.join(LOCAL_OSS_ROOT, key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, params.buffer)
  return { key }
}

export async function saveThumbnail(params: { id: string; buffer: Buffer }) {
  const key = `photos/thumbnail/${params.id}.jpg`
  const thumb = await sharp(params.buffer)
    .rotate()
    .resize({ width: 600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()

  const oss = getOssClient()
  if (oss) {
    await oss.put(key, thumb, { headers: { 'Content-Type': 'image/jpeg' } })
    return { key, buffer: thumb }
  }

  const filePath = path.join(LOCAL_OSS_ROOT, key)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, thumb)
  return { key, buffer: thumb }
}
