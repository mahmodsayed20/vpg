const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export async function uploadImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; publicId: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', PRESET)

  onProgress?.(20)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: form,
  })

  onProgress?.(90)
  if (!res.ok) throw new Error('Image upload failed')

  const data = await res.json()
  onProgress?.(100)

  return { url: data.secure_url, publicId: data.public_id }
}
