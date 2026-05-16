import { createReadStream, promises as fs } from 'node:fs'
import path from 'node:path'
import { createError, getRouterParam, sendStream, setHeader } from 'h3'
import { localObjectKeyToFilePath } from '~~/server/utils/photos-store'

const contentTypeOf = (ext: string) => {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, 'key') ?? ''
  if (!key || key.startsWith('/') || key.includes('..') || !key.startsWith('photos/')) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request' })
  }

  const filePath = localObjectKeyToFilePath(key)
  await fs.access(filePath).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  })

  setHeader(event, 'content-type', contentTypeOf(path.extname(filePath)))
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  return sendStream(event, createReadStream(filePath))
})
