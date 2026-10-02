import type { FitLogDatabase } from '../db/database'
import type { AiPermissions, AiScope } from './types'
import { AiError, assertNoKnownSecrets } from './security'
import { canonicalAiSource } from './nutritionPlans'

export type AiProposalStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'expired'
export interface AiProposal { id: string; title: string; domain: AiScope; preview: unknown; status: AiProposalStatus; message?: string; result?: unknown }
export interface AiProposalSpec { title: string; domain: AiScope; scopes: AiScope[]; preview: unknown; tables: string[]; source: unknown; readSource: () => Promise<unknown>; apply: () => Promise<unknown> }
export class AiProposals {
  private readonly database: FitLogDatabase
  private readonly permissions: () => AiPermissions
  private readonly secrets: () => readonly string[]
  private records = new Map<string, { view: AiProposal; spec?: AiProposalSpec; fingerprint: string }>()
  private jobs = new Map<string, Promise<AiProposal>>()
  private queue: Promise<unknown> = Promise.resolve()
  onChange?: () => void
  onCommitted?: (proposal: AiProposal) => Promise<void> | void
  constructor(database: FitLogDatabase, permissions: () => AiPermissions, secrets: () => readonly string[] = () => []) { this.database = database; this.permissions = permissions; this.secrets = secrets }
  get(id: string): AiProposal | undefined { const view = this.records.get(id)?.view; return view ? structuredClone(view) : undefined }
  get all(): AiProposal[] { return [...this.records.values()].map(record => structuredClone(record.view)) }
  create(spec: AiProposalSpec): AiProposal {
    assertNoKnownSecrets(spec.preview, this.secrets())
    if (this.records.size >= 64) throw new AiError('proposal_limit', '本次对话建议较多，请清空对话后继续')
    const view: AiProposal = { id: crypto.randomUUID(), title: spec.title, domain: spec.domain, preview: structuredClone(spec.preview), status: 'pending' }
    this.records.set(view.id, { view, spec, fingerprint: canonicalAiSource(spec.source) }); this.onChange?.(); return structuredClone(view)
  }
  cancel(id: string): void { const record = this.records.get(id); if (record?.view.status === 'pending') { record.view.status = 'cancelled'; record.spec = undefined; this.onChange?.() } }
  invalidatePending(): void { for (const record of this.records.values()) if (record.view.status === 'pending') { record.view.status = 'expired'; record.spec = undefined }; this.onChange?.() }
  clear(): void { this.invalidatePending(); this.records.clear(); this.onChange?.() }
  confirm(id: string): Promise<AiProposal> {
    const existingJob = this.jobs.get(id)
    if (existingJob) return existingJob
    const record = this.records.get(id)
    if (!record) return Promise.reject(new AiError('proposal_expired', '这份建议已失效，请重新提出'))
    if (record.view.status !== 'pending') return Promise.resolve(structuredClone(record.view))
    record.view.status = 'processing'; this.onChange?.()
    const job = this.queue.then(async () => {
      try {
        const spec = record.spec
        if (!spec) throw new AiError('proposal_expired', '这份建议已失效')
        const allowed = this.permissions()
        if (!allowed.writeProposals || spec.scopes.some(scope => !allowed.read[scope])) throw new AiError('permission_denied', '权限已变化，请重新授权后提出建议')
        const tables = spec.tables.map(name => this.database.table(name))
        record.view.result = await this.database.transaction('rw', tables, async () => {
          if (canonicalAiSource(await spec.readSource()) !== record.fingerprint) throw new AiError('stale_proposal', '相关数据已变化，这份建议已失效，请重新提出')
          return spec.apply()
        })
        record.view.status = 'completed'; record.view.message = '已保存'; record.spec = undefined
        // A successful commit is final even if refreshing a view fails.
        try { await this.onCommitted?.(structuredClone(record.view)) } catch { record.view.message = '已保存；重新打开页面可查看最新记录' }
      } catch (error) {
        record.view.status = 'expired'; record.view.message = error instanceof AiError ? error.message : '校验或保存未完成，数据未写入，请重新提出建议'; record.spec = undefined
      }
      this.onChange?.(); return structuredClone(record.view)
    })
    this.queue = job.catch(() => undefined); this.jobs.set(id, job)
    void job.finally(() => this.jobs.delete(id))
    return job
  }
}
