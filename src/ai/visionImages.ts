import type { AiImageContentPart } from './types'
import { AiError } from './security'

export const AI_VISION_LIMITS = { images: 3, sourceBytes: 15 * 1024 * 1024, pixels: 60_000_000, longEdge: 1600, imageBytes: 1024 * 1024, extractionChars: 16000 } as const
export interface PreparedVisionImage { dataUrl: string; width: number; height: number; bytes: number }
export function validateVisionImageHeader(type: string, bytes: Uint8Array): void {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length))
  const valid = type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)
    : type === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP'
    : ['image/heic', 'image/heif'].includes(type) && ascii(4, 4) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(ascii(8, 24))
  if (!valid) throw new AiError('image_type', '图片内容与格式不匹配，请重新选择 JPEG 或 PNG')
}
/** Only locally re-encoded JPEG, or our local PNG probe, can enter transport. */
export function assertVisionDataUrl(url: string): void {
  if (typeof url !== 'string' || url.length > Math.ceil(AI_VISION_LIMITS.imageBytes / 3) * 4 + 32 || !/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(url)) throw new AiError('invalid_image', '图片必须是本地处理后的 JPEG 或 PNG')
  const payload = url.slice(url.indexOf(',') + 1)
  if (payload.length % 4 !== 0 || !(url.startsWith('data:image/jpeg;') ? payload.startsWith('/9j/') : payload.startsWith('iVBORw0KGgo'))) throw new AiError('invalid_image', '图片格式无效，请重新选择')
}
export function visionImagePart(image: Pick<PreparedVisionImage, 'dataUrl'>): AiImageContentPart {
  assertVisionDataUrl(image.dataUrl)
  return { type: 'image_url', image_url: { url: image.dataUrl, detail: 'high' } }
}
export function createVisionProbeImage(): PreparedVisionImage {
  const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new AiError('image_processing', '当前浏览器无法生成测试图片')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'; ctx.font = 'bold 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('731', 160, 90)
  const dataUrl = canvas.toDataURL('image/png'); assertVisionDataUrl(dataUrl)
  return { dataUrl, width: 320, height: 180, bytes: Math.floor(dataUrl.split(',')[1]!.length * 3 / 4) }
}
export async function preprocessFoodPackageImage(file: File): Promise<PreparedVisionImage> {
  if (!file.size || file.size > AI_VISION_LIMITS.sourceBytes) throw new AiError('image_size', '每张原图不能超过 15 MB')
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type.toLowerCase())) throw new AiError('image_type', '请选择 JPEG、PNG 或 WebP 图片；HEIC 需要浏览器支持')
  validateVisionImageHeader(file.type.toLowerCase(), new Uint8Array(await file.slice(0, 32).arrayBuffer()))
  const objectUrl = URL.createObjectURL(file), image = new Image()
  try {
    image.src = objectUrl
    try { await image.decode() } catch { throw new AiError('image_decode', '无法读取这张图片，请改用 JPEG 或 PNG') }
    const width = image.naturalWidth, height = image.naturalHeight
    if (width < 32 || height < 32 || width * height > AI_VISION_LIMITS.pixels) throw new AiError('image_dimensions', '图片尺寸不适合识别，请重新拍摄营养成分表')
    const scale = Math.min(1, AI_VISION_LIMITS.longEdge / Math.max(width, height))
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new AiError('image_processing', '当前浏览器无法处理图片')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.88, 0.76, 0.64]) {
      // A new canvas encoding strips source metadata, including EXIF/location.
      const dataUrl = canvas.toDataURL('image/jpeg', quality), payload = dataUrl.split(',')[1] ?? '', bytes = Math.floor(payload.length * 3 / 4)
      if (bytes <= AI_VISION_LIMITS.imageBytes) { assertVisionDataUrl(dataUrl); return { dataUrl, width: canvas.width, height: canvas.height, bytes } }
    }
    throw new AiError('image_size', '处理后的图片仍过大，请裁剪到营养成分表后再选择')
  } finally { image.src = ''; URL.revokeObjectURL(objectUrl) }
}
