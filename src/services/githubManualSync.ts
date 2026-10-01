import Dexie from 'dexie'
import { db, type FitLogDatabase } from '../db/database'
import { exportBackup, restoreBackup, validateBackup, type ValidatedBackup } from './backupService'
import { GitHubSyncClient, GitHubSyncError, GITHUB_SYNC_PATH, type GitHubSyncConfig, type RemoteSyncFile } from './githubSyncService'
import { decryptSyncText, encryptSyncText } from './syncCryptoService'
import { syncDataHash } from '../utils/syncDataHash'
import { decideGitHubSyncAction, hasMeaningfulLocalUserData, type GitHubSyncAction } from '../utils/githubSyncDecision'
export const SYNC_STORAGE_KEYS = { config: 'fitlog-github-sync-config-v1', token: 'fitlog-github-sync-token-v1', state: 'fitlog-github-sync-state-v1' } as const
export interface GitHubSyncState { deviceId: string; lastRemoteSha?: string; lastSyncedDataHash?: string; lastSyncedAt?: string }
export interface SyncInspection { action: GitHubSyncAction; localHash: string; meaningfulLocalData: boolean; remote?: RemoteSyncFile; remoteBackup?: ValidatedBackup; remoteHash?: string }
export class GitHubManualSync {
  private password?: string
  private running = false
  private passwordEpoch = 0
  private storage: Storage
  private database: FitLogDatabase
  private fetcher: typeof fetch
  constructor(storage: Storage, database = db, fetcher: typeof fetch = fetch) { this.storage = storage; this.database = database; this.fetcher = fetcher }
  get config(): GitHubSyncConfig | undefined {
    try { const c = JSON.parse(this.storage.getItem(SYNC_STORAGE_KEYS.config) || 'null'); return c && typeof c.owner === 'string' && typeof c.repo === 'string' && typeof c.defaultBranch === 'string' && c.remotePath === GITHUB_SYNC_PATH ? c : undefined } catch { return undefined }
  }
  get state(): GitHubSyncState { try { const s = JSON.parse(this.storage.getItem(SYNC_STORAGE_KEYS.state) || 'null'); return s && typeof s.deviceId === 'string' ? s : { deviceId: '' } } catch { return { deviceId: '' } } }
  get unlocked(): boolean { return this.password !== undefined }
  private client(): GitHubSyncClient { return new GitHubSyncClient(this.storage.getItem(SYNC_STORAGE_KEYS.token) || '', this.fetcher) }
  private requiredConfig(): GitHubSyncConfig { const c = this.config; if (!c) throw new Error('请先连接 GitHub'); return c }
  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.running) throw new Error('同步正在进行，请稍候')
    this.running = true; try { return await run() } finally { this.running = false }
  }
  private async checkedConfig(): Promise<GitHubSyncConfig> {
    const saved = this.requiredConfig(), current = await this.client().connect(saved.owner, saved.repo)
    if (current.defaultBranch !== saved.defaultBranch) throw new Error('仓库默认分支已变化，请断开后重新连接')
    return saved
  }
  async connect(owner: string, repo: string, token: string): Promise<void> {
    await this.exclusive(async () => {
      const config = await new GitHubSyncClient(token.trim(), this.fetcher).connect(owner.trim(), repo.trim())
      // Metadata/Contents validation only; connection does not upload or restore business data.
      this.lock()
      this.storage.removeItem(SYNC_STORAGE_KEYS.state)
      this.storage.setItem(SYNC_STORAGE_KEYS.config, JSON.stringify(config))
      this.storage.setItem(SYNC_STORAGE_KEYS.token, token.trim())
      this.storage.setItem(SYNC_STORAGE_KEYS.state, JSON.stringify({ deviceId: crypto.randomUUID() }))
    })
  }
  disconnect(): void {
    if (this.running) throw new Error('同步正在进行，请稍候')
    this.lock()
    Object.values(SYNC_STORAGE_KEYS).forEach(key => this.storage.removeItem(key))
  }
  lock(): void { this.passwordEpoch++; this.password = undefined }
  async checkRemote(): Promise<RemoteSyncFile | undefined> { return this.exclusive(async () => this.client().getRemote(await this.checkedConfig())) }
  private capture() { return this.database.transaction('r', this.database.tables, () => exportBackup(this.database)) }
  async inspect(password?: string): Promise<SyncInspection> {
    return this.exclusive(async () => {
      const epoch = this.passwordEpoch
      const remote = await this.client().getRemote(await this.checkedConfig()), local = await this.capture(), localHash = await syncDataHash(local.data)
      const entered = password ?? this.password
      if (!entered) throw new Error('请输入数据密码')
      let remoteBackup: ValidatedBackup | undefined, remoteHash: string | undefined
      if (remote) {
        try { remoteBackup = validateBackup(JSON.parse(await decryptSyncText(JSON.parse(remote.text), entered))) } catch { throw new Error('数据密码不正确，或远程备份已损坏或不兼容。') }
        remoteHash = await syncDataHash(remoteBackup.data)
        if (epoch === this.passwordEpoch) this.password = entered // Only cache a password proven to decrypt a validated remote backup.
      }
      const meaningfulLocalData = hasMeaningfulLocalUserData(local.data)
      return { action: decideGitHubSyncAction({ ...this.state, currentLocalHash: localHash, currentRemoteSha: remote?.sha, remoteDataHash: remoteHash, meaningfulLocalData }), localHash, meaningfulLocalData, remote, remoteBackup, remoteHash }
    })
  }
  private baseline(sha: string, hash: string): void { this.storage.setItem(SYNC_STORAGE_KEYS.state, JSON.stringify({ deviceId: this.state.deviceId || crypto.randomUUID(), lastRemoteSha: sha, lastSyncedDataHash: hash, lastSyncedAt: new Date().toISOString() })) }
  async acceptSameData(inspection: SyncInspection): Promise<void> {
    await this.exclusive(async () => {
      if (!inspection.remote || inspection.remoteHash !== inspection.localHash) throw new Error('请重新检查同步状态')
      const config = await this.checkedConfig(), latest = await this.client().getRemote(config)
      if (latest?.sha !== inspection.remote.sha || await syncDataHash((await this.capture()).data) !== inspection.localHash) throw new GitHubSyncError('conflict', '检查后数据发生变化，请重新检查')
      this.baseline(inspection.remote.sha, inspection.localHash)
    })
  }
  async upload(inspection: SyncInspection, password?: string, confirmedReplacement = false): Promise<void> {
    await this.exclusive(async () => {
      if (!['first-upload', 'upload'].includes(inspection.action) && !confirmedReplacement) throw new Error('覆盖 GitHub 数据需要明确确认')
      const epoch = this.passwordEpoch, entered = password ?? this.password
      if (!entered || (!inspection.remote && entered.length < 12)) throw new Error('首次创建数据密码至少需要 12 个字符')
      const config = await this.checkedConfig(), current = await this.client().getRemote(config)
      if (current?.sha !== inspection.remote?.sha) throw new GitHubSyncError('conflict', 'GitHub 数据在检查后发生变化，请重新检查并处理冲突。')
      if (current) { try { validateBackup(JSON.parse(await decryptSyncText(JSON.parse(current.text), entered))) } catch { throw new Error('数据密码不正确，或远程备份已损坏或不兼容。') } }
      const backup = await this.capture(), hash = await syncDataHash(backup.data)
      if (hash !== inspection.localHash) throw new GitHubSyncError('conflict', '本机数据在检查后发生变化，请重新检查。')
      const text = JSON.stringify(await encryptSyncText(JSON.stringify(backup), entered))
      try {
        const sha = await this.client().putRemote(config, text, current?.sha)
        this.baseline(sha, hash); if (epoch === this.passwordEpoch) this.password = entered
      } catch (e) {
        if (e instanceof GitHubSyncError && e.code === 'conflict') { await this.client().getRemote(config); throw new GitHubSyncError('conflict', '检测到并发数据冲突，已重新获取 GitHub 状态。请重新检查；未再次上传。') }
        throw e
      }
    })
  }
  async restore(inspection: SyncInspection): Promise<void> {
    await this.exclusive(async () => {
      if (!inspection.remote || !inspection.remoteBackup || !this.password) throw new Error('请先解锁并检查 GitHub 备份')
      const config = await this.checkedConfig(), remote = await this.client().getRemote(config)
      if (remote?.sha !== inspection.remote.sha) throw new GitHubSyncError('conflict', 'GitHub 数据在预览后发生变化，请重新检查。')
      const validated = validateBackup(JSON.parse(await decryptSyncText(JSON.parse(remote.text), this.password)))
      // Guard local changes inside the same write transaction as Restore, including other tabs.
      await this.database.transaction('rw', this.database.tables, async () => {
        const before = await exportBackup(this.database)
        // Native crypto must not allow IndexedDB to auto-commit while validating the fingerprint.
        const hash = await Dexie.waitFor(syncDataHash(before.data))
        if (hash !== inspection.localHash) throw new GitHubSyncError('conflict', '本机数据在预览后发生变化，请重新检查。')
        await restoreBackup(validated, this.database)
      })
      this.baseline(remote.sha, await syncDataHash(validated.data))
    })
  }
}
