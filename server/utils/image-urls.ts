import { getOssPublicBaseUrl } from '~~/server/utils/oss'

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value)

export const resolveImageUrl = (value?: string) => {
  if (!value) return value
  if (isHttpUrl(value)) return value

  if (value.startsWith('photos/')) {
    const base = getOssPublicBaseUrl()
    if (base) return `${base}/${value}`
    return `/api/local-oss/${value}`
  }

  return value
}

