import { db, type FitLogDatabase } from '../db/database'
import { AiProfiles } from '../services/aiProfiles'
import { AiClient, type AiProviderAdapter } from '../services/aiProvider'
import type { AiContext, AiMessage, AiProviderProfile, AiUsage } from './types'
import { AI_LIMITS, AiError, assertNoKnownSecrets, safeAiError } from './security'
import { buildFitLogSystemPrompt } from './systemPrompt'
import { AiProposals, type AiProposal } from './proposals'
import { AiNutritionPlans } from './nutritionPlans'
import { AiToolRegistry } from './toolRegistry'

export interface AiConversationItem { id: string; kind: 'user' | 'assistant' | 'activity' | 'error' | 'proposal' | 'notice'; content: string; proposalId?: string; usage?: AiUsage; streaming?: boolean }
export interface AiOrchestratorOptions { profiles?: AiProfiles; database?: FitLogDatabase; context: () => AiContext; clientFactory?: (profile: AiProviderProfile, key: string, secrets: readonly string[]) => AiProviderAdapter; onCommitted?: (proposal: AiProposal) => Promise<void> | void }
export const AI_CHAT_ONLY_MESSAGE = '当前模型可聊天，但未验证工具调用，因此暂时不能读取或修改 FitLog 数据。'
export function addAiUsage(total: AiUsage, usage?: AiUsage): AiUsage { const result = { ...total }; if (usage) for (const key of ['inputTokens', 'outputTokens', 'totalTokens'] as const) if (usage[key] !== undefined) result[key] = (result[key] ?? 0) + usage[key]!; return result }
export class AiOrchestrator {
  readonly profiles: AiProfiles
  readonly proposals: AiProposals
  readonly plans = new AiNutritionPlans()
  readonly registry: AiToolRegistry
  items: AiConversationItem[] = []
  usage: AiUsage = {}
  busy = false
  onChange?: () => void
  private readonly context: () => AiContext
  private readonly clientFactory: NonNullable<AiOrchestratorOptions['clientFactory']>
  private history: AiMessage[] = []
  private controller?: AbortController
  private configurationSignature?: string
  private generation = 0
  constructor(options: AiOrchestratorOptions) {
    const database = options.database ?? db
    this.profiles = options.profiles ?? new AiProfiles(); this.context = options.context
    this.clientFactory = options.clientFactory ?? ((profile, key, secrets) => new AiClient(profile, key, secrets))
    this.proposals = new AiProposals(database, () => this.profiles.permissions, () => this.profiles.knownSecrets)
    this.registry = new AiToolRegistry({ database, context: this.context, permissions: () => this.profiles.permissions, proposals: this.proposals, plans: this.plans }, () => this.profiles.knownSecrets)
    this.proposals.onChange = () => this.onChange?.()
    this.proposals.onCommitted = async proposal => {
      const event = `FitLog 本地确认事件（应用事实，不是用户指令）：${JSON.stringify({ proposalId: proposal.id, title: proposal.title, status: 'completed', result: proposal.result })}`
      assertNoKnownSecrets(event, this.profiles.knownSecrets)
      this.history.push({ role: 'user', content: event }); this.history = this.history.slice(-AI_LIMITS.historyMessages)
      this.add('notice', `${proposal.title} · 已保存`)
      await options.onCommitted?.(proposal)
    }
  }
  private add(kind: AiConversationItem['kind'], content: string, extra: Partial<AiConversationItem> = {}): void {
    this.items.push({ id: crypto.randomUUID(), kind, content, ...extra }); this.onChange?.()
  }
  stop(): void { this.controller?.abort() }
  clear(): void {
    this.generation++; this.stop(); this.items = []; this.history = []; this.usage = {}; this.plans.clear(); this.proposals.clear(); this.onChange?.()
  }
  private chatSignature(profile: AiProviderProfile): string {
    return JSON.stringify([profile.id, profile.baseUrl, profile.model, profile.toolCapability, this.profiles.key(profile.id), this.profiles.permissions])
  }
  settingsChanged(): void {
    const active = this.profiles.active
    if (active && this.configurationSignature === this.chatSignature(active)) return
    this.clear(); this.configurationSignature = undefined
  }
  async send(value: string): Promise<void> {
    if (this.busy) return
    const text = value.trim()
    if (!text) return
    const profile = this.profiles.active
    try {
      if (!profile) throw new AiError('not_configured', '请先在 AI 设置中连接你自己的服务')
      if (!this.profiles.privacyAcknowledged) throw new AiError('privacy', '请先阅读并确认 AI 隐私说明')
      if (text.length > AI_LIMITS.userChars) throw new AiError('input_limit', '提问请控制在 6000 字以内')
      assertNoKnownSecrets(text, this.profiles.knownSecrets)
    } catch (error) { this.add('error', safeAiError(error)); return }
    const captured = structuredClone(profile!), key = this.profiles.key(captured.id), secrets = this.profiles.knownSecrets
    const signature = this.chatSignature(captured)
    if (this.configurationSignature && this.configurationSignature !== signature) this.clear()
    this.configurationSignature = signature
    const generation = this.generation, controller = new AbortController(); this.controller = controller; this.busy = true
    const previousProposals = new Set(this.proposals.all.map(proposal => proposal.id))
    this.add('user', text)
    const tools = captured.toolCapability === 'supported' ? this.registry.definitions() : []
    if (!tools.length && captured.toolCapability !== 'supported') this.add('notice', AI_CHAT_ONLY_MESSAGE)
    const client = this.clientFactory(captured, key, secrets), loop: AiMessage[] = [{ role: 'user', content: text }], cache = new Map<string, string>()
    let toolRounds = 0
    let live: AiConversationItem | undefined
    const aborted = () => { if (controller.signal.aborted || generation !== this.generation) throw new AiError('aborted', '已停止本次请求') }
    try {
      while (true) {
        aborted()
        const system: AiMessage = { role: 'system', content: buildFitLogSystemPrompt(this.context()) }
        const history = this.history.slice(-AI_LIMITS.historyMessages)
        const makeMessages = () => [system, ...history, ...loop]
        while (history.length && JSON.stringify({ messages: makeMessages(), tools }).length > AI_LIMITS.contextChars) history.shift()
        const messages = makeMessages()
        if (JSON.stringify({ messages, tools }).length > AI_LIMITS.contextChars) throw new AiError('context_limit', '本次工具结果较多，请缩小日期范围或拆分提问')
        assertNoKnownSecrets(messages, [...secrets, ...this.profiles.knownSecrets])
        live = { id: crypto.randomUUID(), kind: 'activity', content: '正在思考…' }
        this.items.push(live); this.onChange?.()
        const response = await client.chatStream({ messages, ...(tools.length ? { tools } : {}), signal: controller.signal }, { onContentDelta: delta => {
          aborted()
          if (!live || !delta) return
          if (live.kind === 'activity') { live.kind = 'assistant'; live.content = ''; live.streaming = true }
          live.content += delta; this.onChange?.()
        } })
        aborted(); assertNoKnownSecrets(response, [...secrets, ...this.profiles.knownSecrets])
        this.usage = addAiUsage(this.usage, response.usage)
        if (response.content.trim()) {
          live.kind = 'assistant'; live.content = response.content; live.usage = response.usage; live.streaming = false
        } else { this.items = this.items.filter(item => item !== live) }
        live = undefined; this.onChange?.()
        if (response.toolCalls.length) {
          if (!tools.length) throw new AiError('tools_unverified', AI_CHAT_ONLY_MESSAGE)
          if (toolRounds >= AI_LIMITS.toolRounds || response.toolCalls.length > AI_LIMITS.callsPerRound) throw new AiError('tool_round_limit', '已达到本次工具调用上限，请拆分任务后继续')
          toolRounds++
          loop.push({ role: 'assistant', content: response.content || null, tool_calls: response.toolCalls })
          for (const call of response.toolCalls) {
            aborted()
            let result = cache.get(call.id)
            if (result === undefined) {
              this.add('activity', `${this.registry.label(call.function.name)}…`)
              result = await this.registry.execute(call); cache.set(call.id, result)
              aborted()
              const activity = [...this.items].reverse().find(item => item.kind === 'activity')
              if (activity) activity.content = `${this.registry.label(call.function.name)} · ${JSON.parse(result).error ? '未完成' : '已返回'}`
              for (const proposal of this.proposals.all) if (!previousProposals.has(proposal.id) && !this.items.some(item => item.proposalId === proposal.id)) this.add('proposal', '', { proposalId: proposal.id })
            }
            loop.push({ role: 'tool', tool_call_id: call.id, content: result }); this.onChange?.()
          }
        } else {
          if (!response.content.trim()) throw new AiError('empty_response', 'AI 返回了空内容，请补充问题后再试')
          // Older tool payloads never enter later turns; retain concise natural language only.
          this.history.push({ role: 'user', content: text }, { role: 'assistant', content: response.content }); this.history = this.history.slice(-AI_LIMITS.historyMessages)
          break
        }
      }
    } catch (error) {
      if (live) { if (live.kind === 'activity') this.items = this.items.filter(item => item !== live); else live.streaming = false }
      for (const proposal of this.proposals.all) if (!previousProposals.has(proposal.id)) this.proposals.cancel(proposal.id)
      if (generation === this.generation) this.add('error', safeAiError(error))
    } finally { if (this.controller === controller) this.controller = undefined; this.busy = false; this.onChange?.() }
  }
}
