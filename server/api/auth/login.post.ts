import { createError, readBody } from 'h3'
import { createAdminToken, setAdminCookie } from '~~/server/utils/admin-session'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = (await readBody(event).catch(() => null)) as { password?: string } | null

  if (!body?.password || body.password !== config.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = createAdminToken(config.authSecret)
  setAdminCookie(event, token)
  return { ok: true }
})
