import { describe, expect, it } from 'vitest'
import { aiChatModelLabel, aiModelRouteLabel, aiProposalPreviewLines, aiSuggestionPrompts, aiUsageText, shouldSendAiShortcut } from '../src/ui/aiUiHelpers'
import { buildFitLogSystemPrompt, AI_SYSTEM_PROMPT_VERSION } from '../src/ai/systemPrompt'
describe('AI interface and prompt helpers', () => {
  it('displays App-calculated nutrition, unknown fields and replacement values without exposing transport IDs', () => {
    const lines = aiProposalPreviewLines({ id: 'proposal', title: '记录饮食', domain: 'food', status: 'pending', preview: { date: '2026-09-29', meal: 'dinner', items: [{ foodId: 'transport-only', foodName: '<img onerror=attack>', grams: 150, calories: 300, protein: undefined }], totals: { calories: 300 } } }).join('\n')
    expect(lines).toContain('晚餐'); expect(lines).toContain('300 kcal'); expect(lines).toContain('未知'); expect(lines).not.toContain('transport-only')
    expect(aiProposalPreviewLines({ id: 'p', title: '体重', domain: 'weight', status: 'pending', preview: { date: '2026-09-29', beforeWeightKg: 72, weightKg: 71, replacesExisting: true } }).join(' ')).toContain('72 kg → 71 kg')
    expect(aiUsageText({ totalTokens: 0 })).toBe('0 tokens'); expect(aiUsageText({})).toBe(''); expect(aiSuggestionPrompts).toHaveLength(6)
  })
  it.each([
    ['glm-5.3-flash', 'glm-5.3-flash', '智谱 · glm-5.3-flash · 图片：glm-5.3-flash'],
    ['glm-4.5', 'glm-5.3-flash', '智谱 · glm-4.5 · 图片：glm-5.3-flash'],
    ['glm-5.3-flash', undefined, '智谱 · glm-5.3-flash'],
  ])('labels effective routes independently of a stale name and probe status (%s / %s)', (model, visionModel, expected) => {
    for (const visionCapability of ['unknown', 'supported', 'unsupported'] as const) {
      expect(aiModelRouteLabel({ id: 'label', name: '智谱 · glm-4.5', preset: 'zhipu', model: model!, visionModel, visionCapability, baseUrl: 'https://synthetic.invalid/v1', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' })).toBe(expected)
    }
  })
  it('uses the active chat model rather than the editable profile name', () => {
    expect(aiChatModelLabel({ id: 'label', name: '旧配置名称', preset: 'zhipu', model: 'glm-5.3-fast', visionModel: 'glm-4.5v', visionCapability: 'supported', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', protocol: 'openai-chat-completions', createdAt: '', updatedAt: '' })).toBe('智谱 · glm-5.3-fast')
  })
  it('preserves Enter/newline and IME composition; only explicit Ctrl/Cmd Enter sends', () => {
    const event = { key: 'Enter', ctrlKey: false, metaKey: false, isComposing: false }
    expect(shouldSendAiShortcut(event, false)).toBe(false); expect(shouldSendAiShortcut({ ...event, ctrlKey: true }, false)).toBe(true)
    expect(shouldSendAiShortcut({ ...event, metaKey: true }, true)).toBe(false); expect(shouldSendAiShortcut({ ...event, metaKey: true, isComposing: true }, false)).toBe(false)
  })
  it('has a versioned Chinese context/prompt with factual, snapshot, secret, ambiguity and explicit confirmation constraints', () => {
    const prompt = buildFitLogSystemPrompt({ today: '2026-10-02', localTime: '2026-10-02 13:00:00', timezoneOffsetMinutes: -480, activeTab: 'food', foodDate: '2026-09-29', workoutDate: '2026-10-02', planView: 'inbox' })
    expect(AI_SYSTEM_PROMPT_VERSION).toBe(1)
    for (const word of ['2026-09-29', '-480', 'snapshot', '4/4/9', '未知', '多个候选', '必须询问', '确认按钮', '不可信数据', 'API Key', 'get_report', 'get_nutrition_completion']) expect(prompt).toContain(word)
  })
})
