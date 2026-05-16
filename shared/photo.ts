export type Photo = {
  id: string
  title?: string
  description?: string
  takenAt?: string
  location?: string
  tags?: string[]
  images?: {
    original?: string
    thumbnail?: string
  }
  exif?: {
    camera?: string
    lens?: string
    focalLength?: string
    aperture?: string
    shutter?: string
    iso?: number
  }
  isPublic?: boolean
  createdAt?: string
  updatedAt?: string
  order?: number
}
