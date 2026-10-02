import { describe, expect, it, vi } from 'vitest'
import { parseNutritionLabelExtraction, analyzeFoodPackageImages, type NutritionLabelExtractionV1 } from '../src/services/aiVisionFoodService'
import { buildAiRequest, OpenAICompatibleChatAdapter } from '../src/services/aiProvider'
import { draftFromLabel, validateVisionFoodDraft } from '../src/services/foodVisionImportService'
import { AI_FOOD_VISION_PROMPT_VERSION, FOOD_VISION_PROMPT } from '../src/ai/foodVisionPrompt'
import { AI_VISION_LIMITS, assertVisionDataUrl, validateVisionImageHeader } from '../src/ai/visionImages'
import { energyToKcal, kcalToKj } from '../src/utils/energy'
import type { AiProviderProfile } from '../src/ai/types'
const image = { dataUrl: 'data:image/jpeg;base64,/9j/AA==', width: 100, height: 100, bytes: 4 }
const profile: AiProviderProfile = { id: 'vision', name: 'vision', baseUrl: 'https://example.invalid/v1', model: 'editable-model', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' }
export const label = (): NutritionLabelExtractionV1 => ({ format: 'fitlog-food-label', version: 1, productName: '方便面', brand: '测试品牌', netQuantity: { value: 120, unit: 'g', evidence: '净含量120g' }, basis: { kind: 'per_100g', amount: 100, unit: 'g', evidence: '每100克' }, nutrients: { energy: { value: 1980, unit: 'kJ', evidence: '能量1980kJ' }, protein: { value: 9.2, unit: 'g', evidence: '蛋白质9.2g' }, carbs: { value: 60, unit: 'g', evidence: '碳水60g' }, fat: { value: null, unit: null, evidence: null } }, warnings: ['脂肪看不清'] })
const response = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }))
describe('bounded multimodal transport and independent capability', () => {
  it('rejects disguised SVG/HTML before decoding and accepts real raster signatures', () => {
    expect(() => validateVisionImageHeader('image/jpeg', new TextEncoder().encode('<svg onload="alert(1)">'))).toThrow()
    expect(() => validateVisionImageHeader('image/png', new Uint8Array([137,80,78,71,13,10,26,10]))).not.toThrow()
    expect(() => validateVisionImageHeader('image/jpeg', new Uint8Array([255,216,255]))).not.toThrow()
  })
  it('preserves content parts, projects protocol fields and keeps existing text requests exact', () => {
    const request = buildAiRequest('model', { messages: [{ role: 'user', content: [{ type: 'text', text: '转录' }, { type: 'image_url', image_url: { url: image.dataUrl, detail: 'high', secret: 'omit' } } as never] }] })
    expect(request.messages[0]?.content).toEqual([{ type: 'text', text: '转录' }, { type: 'image_url', image_url: { url: image.dataUrl, detail: 'high' } }])
    expect(JSON.stringify(request)).not.toContain('omit')
    expect(buildAiRequest('model', { messages: [{ role: 'user', content: 'hello' }] })).toEqual({ model: 'model', messages: [{ role: 'user', content: 'hello' }] })
  })
  it.each(['https://example.com/label.jpg', 'file:///tmp/label.jpg', 'blob:any', 'javascript:any', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,aGVsbG8='])('rejects untrusted image URL %s before any fetch', async url => {
    const fetcher = vi.fn(), client = new OpenAICompatibleChatAdapter(profile, 'synthetic-key', fetcher)
    await expect(client.chat({ messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url } }] }] })).rejects.toMatchObject({ code: 'invalid_image' })
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('bounds image count/data and permits only user-role images', () => {
    expect(() => assertVisionDataUrl('data:image/png;base64,' + 'iVBORw0KGgoA' + 'A'.repeat(AI_VISION_LIMITS.imageBytes * 2))).toThrow()
    expect(() => buildAiRequest('x', { messages: [{ role: 'user', content: Array.from({ length: 4 }, () => ({ type: 'image_url', image_url: { url: image.dataUrl } })) }] })).toThrow('最多')
    expect(() => buildAiRequest('x', { messages: [{ role: 'tool', content: [{ type: 'image_url', image_url: { url: image.dataUrl } }] }] })).toThrow('用户')
  })
  it('marks supported only for exact 731; wrong/empty answers remain unknown; no hint digits or FitLog records in prompt', async () => {
    const fetcher = vi.fn(async () => response('731')), adapter = new OpenAICompatibleChatAdapter(profile, 'synthetic-key', fetcher)
    expect(await adapter.testVisionCapability(image)).toBe('supported')
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))
    expect(body.tools).toBeUndefined(); expect(body.messages[0].content[0].text).not.toContain('731')
    for (const answer of ['732', '数字是731', '']) expect(await new OpenAICompatibleChatAdapter(profile, 'synthetic-key', async () => response(answer)).testVisionCapability(image)).toBe('unknown')
  })
  it('requires an explicit image rejection to mark unsupported and retains safe error categories', async () => {
    const unsupported = new OpenAICompatibleChatAdapter(profile, 'synthetic-key', async () => new Response(JSON.stringify({ error: { message: 'this model does not support images' } }), { status: 400 }))
    expect(await unsupported.testVisionCapability(image)).toBe('unsupported')
    for (const status of [400, 401, 403, 404, 429, 500]) await expect(new OpenAICompatibleChatAdapter(profile, 'synthetic-key', async () => new Response('secret error', { status })).testVisionCapability(image)).rejects.toMatchObject({ code: `http_${status}` })
    await expect(new OpenAICompatibleChatAdapter(profile, 'synthetic-key', async () => { throw new TypeError('secret url') }).testVisionCapability(image)).rejects.toMatchObject({ code: 'network' })
  })
})
describe('strict packaging extraction and local nutrition conversion', () => {
  it('accepts JSON or one complete JSON fence without inventing missing macros', () => {
    const raw = JSON.stringify(label())
    for (const text of [raw, `\n\`\`\`json\n${raw}\n\`\`\`\n`]) expect(parseNutritionLabelExtraction(text)).toEqual(label())
    const draft = draftFromLabel(parseNutritionLabelExtraction(raw)), food = validateVisionFoodDraft(draft)
    expect(food.calories).toBeCloseTo(1980 / 4.184, 12); expect(food.fat).toBeUndefined(); expect(food.referenceGrams).toBe(100)
    expect(food.calories).not.toBe(4 * (food.protein! + food.carbs!) + 9 * (food.fat ?? 0))
    expect(energyToKcal(0, 'kJ')).toBe(0); expect(kcalToKj(100)).toBeCloseTo(418.4, 12)
  })
  it.each(['prose', 'partial', 'extra', 'string', 'percent', 'negative', 'unit', 'evidence', 'wrong-basis', 'version', 'too-long'])('rejects %s without coercion', kind => {
    const value = label() as unknown as Record<string, any>
    if (kind === 'extra') value.guessedCalories = 500
    if (kind === 'string') value.nutrients.energy.value = '1980'
    if (kind === 'percent') value.nutrients.protein.value = '15%'
    if (kind === 'negative') value.nutrients.fat = { value: -1, unit: 'g', evidence: '-1g' }
    if (kind === 'unit') value.nutrients.energy.unit = 'kj'
    if (kind === 'evidence') value.nutrients.protein.evidence = null
    if (kind === 'wrong-basis') value.basis.amount = 120
    if (kind === 'version') value.version = 2
    if (kind === 'too-long') value.nutrients.energy.evidence = 'x'.repeat(101)
    const raw = JSON.stringify(value), text = kind === 'prose' ? `结果：${raw}` : kind === 'partial' ? raw.slice(0, -1) : raw
    expect(() => parseNutritionLabelExtraction(text)).toThrow()
  })
  it('never treats mL as g, a serving as 100g, or net quantity as a per-100g basis', () => {
    const milk = label(); milk.basis = { kind: 'per_100ml', amount: 100, unit: 'ml', evidence: '每100mL' }
    expect(draftFromLabel(milk).referenceGrams).toBeNull(); expect(() => validateVisionFoodDraft(draftFromLabel(milk))).toThrow('基准重量')
    const serving = label(); serving.basis = { kind: 'per_serving', amount: 30, unit: 'g', evidence: '每份30g' }
    expect(validateVisionFoodDraft(draftFromLabel(serving)).referenceGrams).toBe(30)
    serving.basis.amount = null; serving.basis.unit = null; expect(draftFromLabel(serving).referenceGrams).toBeNull()
    const packageLabel = label(); packageLabel.basis = { kind: 'per_package', amount: null, unit: null, evidence: '每包装' }; packageLabel.netQuantity = { value: .12, unit: 'kg', evidence: '净含量0.12kg' }
    expect(draftFromLabel(packageLabel).referenceGrams).toBe(120)
    const unknown = label(); unknown.basis = { kind: 'unknown', amount: null, unit: null, evidence: null }; expect(draftFromLabel(unknown).referenceGrams).toBeNull()
  })
  it('rejects NRV-only evidence or evidence contradicting the copied value/unit', () => {
    for (const evidence of ['NRV 9.2%', '蛋白质19.2g', '蛋白质9.2mg']) { const value = label(); value.nutrients.protein.evidence = evidence; expect(() => parseNutritionLabelExtraction(JSON.stringify(value))).toThrow() }
    const value = label(); value.nutrients.protein.evidence = '蛋白质9.2克 NRV15%'; expect(parseNutritionLabelExtraction(JSON.stringify(value)).nutrients.protein.value).toBe(9.2)
  })
  it('uses one direct extraction request with no tools/history/business data; rejects tool/secret/aborted responses', async () => {
    const visionChat = vi.fn(async () => ({ content: JSON.stringify(label()), toolCalls: [] }))
    expect(await analyzeFoodPackageImages({ client: { visionChat }, images: [image] })).toEqual(label())
    expect(visionChat).toHaveBeenCalledTimes(1); const request = visionChat.mock.calls[0]?.[0] as any
    expect(request.tools).toBeUndefined(); expect(request.messages).toHaveLength(2)
    await expect(analyzeFoodPackageImages({ client: { visionChat: async () => ({ content: JSON.stringify({ ...label(), productName: 'known-secret' }), toolCalls: [] }) }, images: [image], secrets: ['known-secret'] })).rejects.toMatchObject({ code: 'secret_detected' })
    await expect(analyzeFoodPackageImages({ client: { visionChat: async () => ({ content: '', toolCalls: [{ id: 'x', type: 'function', function: { name: 'save_food', arguments: '{}' } }] }) }, images: [image] })).rejects.toMatchObject({ code: 'invalid_label' })
    const controller = new AbortController(); controller.abort(); await expect(analyzeFoodPackageImages({ client: { visionChat }, images: [image], signal: controller.signal })).rejects.toMatchObject({ code: 'aborted' })
    expect(AI_FOOD_VISION_PROMPT_VERSION).toBe(1)
    for (const text of ['NRV%', 'null', 'mL', 'kJ', '净含量', '不可信数据', '禁止从宏量']) expect(FOOD_VISION_PROMPT).toContain(text)
  })
})


describe('remaining food vision acceptance', () => {
  it('prefers explicit kcal and warns locally about discrepant secondary kJ', () => {
    const value = label(); value.nutrients.energy = { value: 100, unit: 'kcal', evidence: '能量100kcal' }
    value.nutrients.energyKj = { value: 418.4, unit: 'kJ', evidence: '能量418.4kJ' }
    let parsed = parseNutritionLabelExtraction(JSON.stringify(value))
    expect(validateVisionFoodDraft(draftFromLabel(parsed)).calories).toBe(100)
    expect(parsed.warnings).not.toContain('包装上的 kJ 与 kcal 数值看起来不一致，请核对。')
    value.nutrients.energyKj = { value: 1000, unit: 'kJ', evidence: '能量1000kJ' }
    parsed = parseNutritionLabelExtraction(JSON.stringify(value))
    expect(parsed.warnings).toContain('包装上的 kJ 与 kcal 数值看起来不一致，请核对。')
    expect(validateVisionFoodDraft(draftFromLabel(parsed)).calories).toBe(100)
  })
  it('supports custom and serving grams but never derives volume or missing energy', () => {
    const value = label(); value.basis = { kind: 'custom', amount: 30, unit: 'g', evidence: '每30g' }
    expect(validateVisionFoodDraft(draftFromLabel(value)).referenceGrams).toBe(30)
    value.basis = { kind: 'per_serving', amount: 105, unit: 'g', evidence: '每份105g' }
    expect(validateVisionFoodDraft(draftFromLabel(value)).referenceGrams).toBe(105)
    value.basis = { kind: 'per_package', amount: 500, unit: 'ml', evidence: '每包装500ml' }
    expect(draftFromLabel(value).referenceGrams).toBeNull()
    value.nutrients.energy = { value: null, unit: null, evidence: null }
    expect(() => validateVisionFoodDraft(draftFromLabel(value))).toThrow()
  })
  it('bounds warning arrays, numbers and format and uses the safe parser failure text', () => {
    for (const mutate of [(v: any) => v.format = 'wrong', (v: any) => v.warnings = Array(9).fill('warning'), (v: any) => v.productName = 'x'.repeat(121), (v: any) => v.nutrients.energy.value = 1_000_001]) {
      const value = label(); mutate(value); expect(() => parseNutritionLabelExtraction(JSON.stringify(value))).toThrow('图片识别结果格式不正确，请重试。')
    }
    const value = label(); value.nutrients.energy.value = Infinity
    expect(() => validateVisionFoodDraft(draftFromLabel(value))).toThrow()
  })
  it('scans textual secrets including arbitrary tool schema fields, without scanning trusted raster base64', async () => {
    const fetcher = vi.fn(async () => response('731'))
    // Secret intentionally coincides with raster encoding; raster bytes are not textual fields.
    const client = new OpenAICompatibleChatAdapter(profile, '/9j/', fetcher)
    await client.testVisionCapability(image); expect(fetcher).toHaveBeenCalledTimes(1)
    await expect(client.chat({ messages: [{ role: 'user', content: [{ type: 'text', text: '/9j/' }, { type: 'image_url', image_url: { url: image.dataUrl } }] }] })).rejects.toMatchObject({ code: 'secret_detected' })
    await expect(client.chat({ messages: [{ role: 'user', content: 'hello' }], tools: [{ type: 'function', function: { name: 'x', description: 'x', parameters: { image_url: { secret: '/9j/' } } } }] })).rejects.toMatchObject({ code: 'secret_detected' })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(() => buildAiRequest('x', { messages: [{ role: 'user', content: Array(3).fill({ type: 'image_url', image_url: { url: image.dataUrl } }) }] })).toThrow()
  })
})
