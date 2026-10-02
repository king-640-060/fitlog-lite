import type { AiProviderAdapter } from './aiProvider'
import { FOOD_VISION_PROMPT } from '../ai/foodVisionPrompt'
import { AI_VISION_LIMITS, visionImagePart, type PreparedVisionImage } from '../ai/visionImages'
import { AiError, assertNoKnownSecrets } from '../ai/security'

export type LabelBasisKind = 'per_100g' | 'per_100ml' | 'per_serving' | 'per_package' | 'custom' | 'unknown'
export interface LabelValue<U extends string> { value: number | null; unit: U | null; evidence: string | null }
export interface NutritionLabelExtractionV1 {
  format: 'fitlog-food-label'; version: 1; productName: string | null; brand: string | null
  netQuantity: LabelValue<'g' | 'kg' | 'ml' | 'l'>
  basis: { kind: LabelBasisKind; amount: number | null; unit: 'g' | 'ml' | null; evidence: string | null }
  nutrients: { energy: LabelValue<'kJ' | 'kcal'>; protein: LabelValue<'g'>; carbs: LabelValue<'g'>; fat: LabelValue<'g'> }
  warnings: string[]
}
const invalid = (): never => { throw new AiError('invalid_label', '识别结果格式或单位不完整，请重新拍摄，或核对图片后手动填写') }
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
  const result = value as Record<string, unknown>
  if (Object.keys(result).length !== keys.length || keys.some(key => !Object.hasOwn(result, key))) return invalid()
  return result
}
function text(value: unknown, max: number): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || !value.trim() || value.length > max) return invalid()
  return value.trim()
}
function number(value: unknown): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000) return invalid()
  return value
}
function unit<U extends string>(value: unknown, units: readonly U[]): U | null { if (value === null) return null; if (typeof value !== 'string' || !units.includes(value as U)) return invalid(); return value as U }
function evidenceMatches(value: number, units: string, evidence: string): boolean {
  const normalized = evidence.normalize('NFKC').replace(/\s/g, '').replace(/千焦耳?/g, 'kJ').replace(/千卡|大卡/g, 'kcal').replace(/千克|公斤/g, 'kg').replace(/毫升/g, 'ml').replace(/克/g, 'g').replace(/升/g, 'l')
  return [...normalized.matchAll(/(\d+(?:\.\d+)?)(kcal|kJ|kg|ml|mL|g|l|L)(?![%％])/g)].some(match => Number(match[1]) === value && match[2]!.toLowerCase() === units.toLowerCase())
}
function labelValue<U extends string>(value: unknown, units: readonly U[]): LabelValue<U> {
  const raw = object(value, ['value', 'unit', 'evidence']), result = { value: number(raw.value), unit: unit(raw.unit, units), evidence: text(raw.evidence, 100) }
  if (result.value !== null && (result.unit === null || result.evidence === null)) return invalid()
  if (result.value !== null && !evidenceMatches(result.value, result.unit!, result.evidence!)) return invalid()
  return result
}
/** A full JSON fence is tolerated; prose, fragments and coercions are rejected. */
export function parseNutritionLabelExtraction(response: string): NutritionLabelExtractionV1 {
  if (typeof response !== 'string' || response.length > AI_VISION_LIMITS.extractionChars) return invalid()
  const trimmed = response.trim(), fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(trimmed)
  let parsed: unknown
  try { parsed = JSON.parse(fence ? fence[1]! : trimmed) } catch { return invalid() }
  const root = object(parsed, ['format', 'version', 'productName', 'brand', 'netQuantity', 'basis', 'nutrients', 'warnings'])
  if (root.format !== 'fitlog-food-label' || root.version !== 1) return invalid()
  const basisRaw = object(root.basis, ['kind', 'amount', 'unit', 'evidence'])
  const kind = unit(basisRaw.kind, ['per_100g', 'per_100ml', 'per_serving', 'per_package', 'custom', 'unknown'] as const)
  if (kind === null) return invalid()
  const basis = { kind, amount: number(basisRaw.amount), unit: unit(basisRaw.unit, ['g', 'ml'] as const), evidence: text(basisRaw.evidence, 100) }
  if (basis.kind !== 'unknown' && !basis.evidence) return invalid()
  if (basis.amount !== null && (basis.amount <= 0 || !basis.unit || !basis.evidence)) return invalid()
  if (basis.amount !== null && !evidenceMatches(basis.amount, basis.unit!, basis.evidence!)) return invalid()
  if (basis.kind === 'per_100g' && (basis.amount !== 100 || basis.unit !== 'g')) return invalid()
  if (basis.kind === 'per_100ml' && (basis.amount !== 100 || basis.unit !== 'ml')) return invalid()
  const nutrientsRaw = object(root.nutrients, ['energy', 'protein', 'carbs', 'fat'])
  if (!Array.isArray(root.warnings) || root.warnings.length > 8) return invalid()
  const warnings = root.warnings.map(value => text(value, 200) ?? invalid())
  return { format: 'fitlog-food-label', version: 1, productName: text(root.productName, 120), brand: text(root.brand, 120), netQuantity: labelValue(root.netQuantity, ['g', 'kg', 'ml', 'l']), basis, nutrients: { energy: labelValue(nutrientsRaw.energy, ['kJ', 'kcal']), protein: labelValue(nutrientsRaw.protein, ['g']), carbs: labelValue(nutrientsRaw.carbs, ['g']), fat: labelValue(nutrientsRaw.fat, ['g']) }, warnings }
}
export async function analyzeFoodPackageImages(options: { client: Pick<AiProviderAdapter, 'chat'>; images: readonly PreparedVisionImage[]; signal?: AbortSignal; secrets?: readonly string[] }): Promise<NutritionLabelExtractionV1> {
  if (!options.images.length || options.images.length > AI_VISION_LIMITS.images) throw new AiError('image_limit', '请选择 1 到 3 张同一产品的包装图片')
  if (options.signal?.aborted) throw new AiError('aborted', '已停止本次识别')
  const response = await options.client.chat({ messages: [{ role: 'system', content: FOOD_VISION_PROMPT }, { role: 'user', content: [{ type: 'text', text: '转录这些同一产品的包装图片中的营养成分表，未知字段为 null。' }, ...options.images.map(visionImagePart)] }], signal: options.signal })
  if (options.signal?.aborted) throw new AiError('aborted', '已停止本次识别')
  if (response.toolCalls.length) throw new AiError('invalid_label', '图片识别返回了无效工具请求，请重新识别')
  assertNoKnownSecrets(response.content, options.secrets ?? [])
  return parseNutritionLabelExtraction(response.content)
}
