import { DEFAULT_GITHUB_SYNC_OWNER, DEFAULT_GITHUB_SYNC_REPO, GitHubSyncError } from '../services/githubSyncService'
import type { GitHubManualSync } from '../services/githubManualSync'

/** Defaults apply only to the unconnected UI. The transport stays generic. */
export async function connectDefaultGitHubSync(sync: Pick<GitHubManualSync, 'connect'>, token: string): Promise<void> {
  try { await sync.connect(DEFAULT_GITHUB_SYNC_OWNER, DEFAULT_GITHUB_SYNC_REPO, token) }
  catch (error) {
    if (error instanceof GitHubSyncError && error.code === 'not-found') {
      throw new GitHubSyncError('not-found', `还没有找到私人数据仓库 ${DEFAULT_GITHUB_SYNC_OWNER}/${DEFAULT_GITHUB_SYNC_REPO}。请先在 GitHub 创建这个 Private Repository，并初始化 README。若已创建，请确认 Token 已选择这个仓库。`)
    }
    throw error
  }
}

export function githubSyncSetupHtml(): string {
  return `<p class="sync-note">在这台设备加密完整数据，再手动备份到私人 GitHub 仓库。</p><dl class="sync-details"><div><dt>数据仓库</dt><dd>${DEFAULT_GITHUB_SYNC_OWNER} / ${DEFAULT_GITHUB_SYNC_REPO}</dd></div><div><dt>状态</dt><dd>等待连接</dd></div></dl><form class="form" id="sync-connect-form"><label>Personal Access Token<input name="token" type="password" placeholder="github_pat_..." autocomplete="off" autocapitalize="none" spellcheck="false" required></label><button class="primary" type="submit">连接 GitHub</button></form><details class="sync-prepare"><summary>准备 GitHub</summary><ol><li>在 king-640-060 下创建 Private Repository：<strong>fitlog-lite-data</strong>，并初始化 README。</li><li>创建 Fine-grained Personal Access Token，Repository access 选择 Only selected repositories → fitlog-lite-data。</li><li>Repository permissions 只需 Contents: Read and write。</li></ol><div class="sync-prepare-links"><a href="https://github.com/new" target="_blank" rel="noopener noreferrer">新建 GitHub 仓库 ↗</a><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">GitHub Token 设置 ↗</a></div></details><p class="sync-note">Token 只保存在这台设备。连接后设置或输入数据密码；FitLog 不保存数据密码，换设备恢复仍需要它。</p>`
}
