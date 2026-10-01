import { base64ToBytes, bytesToBase64 } from './syncCryptoService'
export const GITHUB_SYNC_PATH = 'fitlog/latest.enc.json'
export interface GitHubSyncConfig { owner: string; repo: string; defaultBranch: string; remotePath: typeof GITHUB_SYNC_PATH }
export interface RemoteSyncFile { sha: string; text: string }
export class GitHubSyncError extends Error {
  code: string
  constructor(code: string, message: string) { super(message); this.name = 'GitHubSyncError'; this.code = code }
}
const error = (code: string, message: string): never => { throw new GitHubSyncError(code, message) }
export function validateGitHubLocation(owner: string, repo: string): void {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') error('config', '请填写有效的 GitHub 用户和仓库名称')
}
export class GitHubSyncClient {
  private token: string
  private fetcher: typeof fetch
  constructor(token: string, fetcher: typeof fetch = fetch) { this.token = token; this.fetcher = fetcher.bind(globalThis); if (!token.trim() || /[\r\n]/.test(token)) error('credentials', '请输入有效的 GitHub Token') }
  private async request(path: string, method = 'GET', body?: unknown, missingAllowed = false, raw = false): Promise<Response> {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) error('network', '当前离线，连接网络后再同步。')
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000)
    try {
      const response = await this.fetcher(`https://api.github.com${path}`, { method, headers: { Authorization: `Bearer ${this.token}`, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal })
      if (response.ok || (missingAllowed && response.status === 404)) return response
      if (response.status === 401) error('auth', 'GitHub Token 无效或已过期，请断开后重新连接。')
      if ((response.status === 403 || response.status === 429) && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after') || response.status === 429)) error('rate', 'GitHub 暂时限制了请求，请稍后重试。')
      if (response.status === 403) error('permission', 'Token 需要该 Private Repository 的 Contents: Read and write 权限。')
      if (response.status === 404) error('not-found', '仓库不存在或当前 Token 无权访问。')
      if (method === 'PUT' && (response.status === 409 || response.status === 422)) error('conflict', 'GitHub 数据在检查后发生变化，请重新检查并处理冲突。')
      return error('api', 'GitHub 暂时无法完成请求，请稍后重试。')
    } catch (e) { if (e instanceof GitHubSyncError) throw e; return error('network', '网络连接失败或请求超时，请重试。') } finally { clearTimeout(timeout) }
  }
  private async json(response: Response): Promise<any> {
    try { return await response.json() } catch { return error('format', 'GitHub 返回的数据无法读取，请重试。') }
  }
  private repoPath(owner: string, repo: string): string { validateGitHubLocation(owner, repo); return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` }
  async connect(owner: string, repo: string): Promise<GitHubSyncConfig> {
    const path = this.repoPath(owner, repo), metadata = await this.json(await this.request(path))
    if (metadata.private !== true) error('public', '为了保护个人数据，GitHub 同步只支持 Private Repository。')
    if (metadata.archived === true || metadata.disabled === true) error('archived', '仓库已归档或停用，请选择可写的私人仓库。')
    if (typeof metadata.default_branch !== 'string' || !metadata.default_branch) error('empty', '这个仓库还没有初始化。请先在 GitHub 创建 README，然后重新连接。')
    const root = await this.request(`${path}/contents?ref=${encodeURIComponent(metadata.default_branch)}`, 'GET', undefined, true)
    if (root.status === 404) error('empty', '这个仓库还没有初始化或 Token 缺少 Contents 读取权限。请创建 README 并检查权限后重新连接。')
    return { owner, repo, defaultBranch: metadata.default_branch, remotePath: GITHUB_SYNC_PATH }
  }
  private filePath(config: GitHubSyncConfig): string { return `${this.repoPath(config.owner, config.repo)}/contents/${GITHUB_SYNC_PATH}` }
  async getRemote(config: GitHubSyncConfig): Promise<RemoteSyncFile | undefined> {
    const path = `${this.filePath(config)}?ref=${encodeURIComponent(config.defaultBranch)}`
    const response = await this.request(path, 'GET', undefined, true)
    if (response.status === 404) return undefined
    const file = await this.json(response)
    if (file.type !== 'file' || typeof file.sha !== 'string') error('format', 'GitHub 同步路径不是有效文件。')
    let text: string
    if (file.encoding === 'base64' && typeof file.content === 'string') text = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(file.content.replace(/\s/g, '')))
    else {
      const blob = await this.json(await this.request(`${this.repoPath(config.owner, config.repo)}/git/blobs/${encodeURIComponent(file.sha)}`))
      if (blob.encoding !== 'base64' || typeof blob.content !== 'string') error('format', '远程备份格式无法读取。')
      text = new TextDecoder('utf-8', { fatal: true }).decode(base64ToBytes(blob.content.replace(/\s/g, '')))
    }
    if (text.length > 40 * 1024 * 1024) error('format', '远程备份过大，请使用本机备份。')
    return { sha: file.sha, text }
  }
  async putRemote(config: GitHubSyncConfig, text: string, sha?: string): Promise<string> {
    const response = await this.request(this.filePath(config), 'PUT', { message: 'Update encrypted FitLog backup', branch: config.defaultBranch, content: bytesToBase64(new TextEncoder().encode(text)), ...(sha ? { sha } : {}) })
    const result = await this.json(response)
    if (typeof result.content?.sha !== 'string') error('api', '无法确认 GitHub 上传结果，请重新检查。')
    return result.content.sha
  }
}
