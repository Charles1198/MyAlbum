import { clearAdminCookie } from '~~/server/utils/admin-session'

export default defineEventHandler((event) => {
  clearAdminCookie(event)
  return { ok: true }
})
