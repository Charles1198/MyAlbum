import OSS from 'ali-oss'

export type OssConfig = {
  region: string
  bucket: string
  accessKeyId: string
  accessKeySecret: string
  publicBaseUrl?: string
}

const getEnv = (key: string) => (process.env[key] ?? '').trim()

export const getOssConfig = (): OssConfig | null => {
  const region = getEnv('OSS_REGION')
  const bucket = getEnv('OSS_BUCKET')
  const accessKeyId = getEnv('OSS_ACCESS_KEY_ID')
  const accessKeySecret = getEnv('OSS_ACCESS_KEY_SECRET')
  const publicBaseUrl = getEnv('OSS_PUBLIC_BASE_URL') || undefined

  if (!region || !bucket || !accessKeyId || !accessKeySecret) return null
  return { region, bucket, accessKeyId, accessKeySecret, publicBaseUrl }
}

let _client: OSS | null = null

export const getOssClient = () => {
  const cfg = getOssConfig()
  if (!cfg) return null
  if (_client) return _client
  _client = new OSS({
    region: cfg.region,
    bucket: cfg.bucket,
    accessKeyId: cfg.accessKeyId,
    accessKeySecret: cfg.accessKeySecret,
  })
  return _client
}

export const getOssPublicBaseUrl = () => {
  const cfg = getOssConfig()
  const raw = cfg?.publicBaseUrl?.trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw.replace(/\/+$/g, '')
  return `https://${raw.replace(/\/+$/g, '')}`
}

