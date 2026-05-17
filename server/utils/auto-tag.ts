type AutoTagResult = {
  description?: string
  tags?: string[]
}

const getEnv = (key: string) => (process.env[key] ?? '').trim()

const normalizeTags = (value: unknown) => {
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.map((v) => String(v ?? '')).join(',')
        : ''
  const items = raw
    .replace(/[，、]/g, ',')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^#/, ''))
    .filter(Boolean)

  const set = new Set<string>()
  for (const t of items) {
    if (t.length > 24) continue
    set.add(t)
    if (set.size >= 12) break
  }
  return set.size ? Array.from(set) : undefined
}

const extractJsonObject = (text: string) => {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

export async function autoTagFromThumbnail(params: {
  thumbnailJpeg: Buffer
  existingDescription?: string
  existingTags?: string[]
}) {
  const enabled = getEnv('AUTO_TAG_ENABLED')
  if (enabled !== '1') return null

  if (params.existingDescription && (params.existingTags?.length ?? 0) > 0) return null

  const apiKey = getEnv('DASHSCOPE_API_KEY')
  if (!apiKey) return null

  const model = getEnv('AUTO_TAG_MODEL') || 'qwen-vl-plus'
  const endpoint =
    getEnv('DASHSCOPE_VL_ENDPOINT') || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'

  const prompt =
    '你是摄影作品整理助手。请根据图片内容生成用于作品站的描述与标签。只输出严格 JSON：{"description":"...","tags":["..."]}。description<=40字，中文为主，避免主观夸张；tags 5-10 个，中文短词，去重，不要#，不要标点。'

  const dataUri = `data:image/jpeg;base64,${params.thumbnailJpeg.toString('base64')}`
  const body = {
    model,
    input: {
      messages: [
        {
          role: 'user',
          content: [{ image: dataUri }, { text: prompt }],
        },
      ],
    },
    parameters: {},
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) return null
    const json = (await res.json()) as any
    const text =
      json?.output?.choices?.[0]?.message?.content?.[0]?.text ??
      json?.output?.choices?.[0]?.message?.content?.[0] ??
      json?.output?.choices?.[0]?.message?.content ??
      ''

    const rawObj = extractJsonObject(String(text))
    if (!rawObj) return null
    const parsed = JSON.parse(rawObj) as { description?: unknown; tags?: unknown }
    const description = typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 200) : undefined
    const tags = normalizeTags(parsed.tags)

    const result: AutoTagResult = {
      description: description || undefined,
      tags,
    }

    if (!result.description && !result.tags?.length) return null
    return result
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
