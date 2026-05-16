import { isAdminAuthed } from '~~/server/utils/admin-session'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  return { authenticated: isAdminAuthed(event, config.authSecret) }
})
