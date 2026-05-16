import { createHmac, timingSafeEqual } from 'node:crypto'
import { createError, deleteCookie, getCookie, setCookie } from 'h3'

const COOKIE_NAME = 'pa_admin'
const ONE_DAY = 24 * 60 * 60
const MAX_AGE = 7 * ONE_DAY

const toBase64Url = (value: Buffer | string) =>
  Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64')
}

function sign(secret: string, payloadB64Url: string) {
  return toBase64Url(createHmac('sha256', secret).update(payloadB64Url).digest())
}

export function createAdminToken(secret: string) {
  const payload = { exp: Date.now() + MAX_AGE * 1000 }
  const payloadB64Url = toBase64Url(JSON.stringify(payload))
  const sig = sign(secret, payloadB64Url)
  return `${payloadB64Url}.${sig}`
}

export function verifyAdminToken(secret: string, token: string) {
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [payloadB64Url, sig] = parts
  const expected = sign(secret, payloadB64Url)
  const ok =
    sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  if (!ok) return false

  const payloadRaw = fromBase64Url(payloadB64Url).toString('utf8')
  const payload = JSON.parse(payloadRaw) as { exp?: number }
  if (!payload.exp || Number.isNaN(payload.exp)) return false
  return Date.now() < payload.exp
}

export function setAdminCookie(event: Parameters<typeof setCookie>[0], token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function clearAdminCookie(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function isAdminAuthed(event: Parameters<typeof getCookie>[0], secret: string) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return false
  return verifyAdminToken(secret, token)
}

export function requireAdmin(event: Parameters<typeof getCookie>[0], secret: string) {
  if (!isAdminAuthed(event, secret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
}

