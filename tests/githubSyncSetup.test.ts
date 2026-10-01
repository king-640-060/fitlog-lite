import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { connectDefaultGitHubSync, githubSyncSetupHtml } from '../src/ui/githubSyncSetup'
import { DEFAULT_GITHUB_SYNC_OWNER, DEFAULT_GITHUB_SYNC_REPO, GITHUB_SYNC_PATH, GitHubSyncError } from '../src/services/githubSyncService'
import { GitHubManualSync, SYNC_STORAGE_KEYS } from '../src/services/githubManualSync'

describe('preconfigured GitHub setup', () => {
  it('shows fixed destination and only a password-style Token input with preparation guidance', () => {
    const html = githubSyncSetupHtml()
    expect(html).toContain('king-640-060 / fitlog-lite-data')
    expect(html).toContain('等待连接')
    expect(html.match(/<input/g)).toHaveLength(1)
    expect(html).toContain('name="token" type="password"')
    expect(html).toContain('autocomplete="off"')
    expect(html).not.toMatch(/name="(owner|repo|branch|path)"/)
    expect(html).toContain('Private Repository'); expect(html).toContain('README')
    expect(html).toContain('Only selected repositories'); expect(html).toContain('Contents: Read and write')
    expect(html).not.toContain('Administration')
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2)
  })
  it('passes the defaults to the generic service only on explicit new connection', async () => {
    const connect = vi.fn(async () => undefined)
    await connectDefaultGitHubSync({ connect }, 'synthetic-token')
    expect(connect).toHaveBeenCalledWith(DEFAULT_GITHUB_SYNC_OWNER, DEFAULT_GITHUB_SYNC_REPO, 'synthetic-token')
    expect(GITHUB_SYNC_PATH).toBe('fitlog/latest.enc.json')
  })
  it('explains 404 with exact private repository and README steps without leaking secrets', async () => {
    const connect = vi.fn(async () => { throw new GitHubSyncError('not-found', 'not found') })
    await expect(connectDefaultGitHubSync({ connect }, 'synthetic-token')).rejects.toThrow('king-640-060/fitlog-lite-data')
    await expect(connectDefaultGitHubSync({ connect }, 'synthetic-token')).rejects.toThrow('Private Repository，并初始化 README')
  })
  it('preserves permission, public, empty and archived errors', async () => {
    for (const code of ['permission', 'public', 'empty', 'archived']) {
      const error = new GitHubSyncError(code, code === 'permission' ? 'Contents: Read and write' : code)
      await expect(connectDefaultGitHubSync({ connect: async () => { throw error } }, 'synthetic-token')).rejects.toBe(error)
    }
  })
  it('opening an existing configuration preserves owner/repo/branch/baseline and does not contact GitHub', () => {
    const config = { owner: 'another-owner', repo: 'previous-private-repo', defaultBranch: 'legacy-branch', remotePath: GITHUB_SYNC_PATH }
    const state = { deviceId: 'old-device', lastRemoteSha: 'old-sha', lastSyncedDataHash: 'old-hash', lastSyncedAt: '2026-09-28T08:00:00.000Z' }
    const map = new Map([[SYNC_STORAGE_KEYS.config, JSON.stringify(config)], [SYNC_STORAGE_KEYS.state, JSON.stringify(state)], [SYNC_STORAGE_KEYS.token, 'synthetic-old-token']])
    const before = [...map]
    const storage = { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v), removeItem: k => map.delete(k) } as Storage
    const fetcher = vi.fn()
    const sync = new GitHubManualSync(storage, undefined, fetcher)
    expect(sync.config).toEqual(config); expect(sync.state).toEqual(state); expect([...map]).toEqual(before); expect(fetcher).not.toHaveBeenCalled()
    sync.disconnect(); expect(sync.config).toBeUndefined(); expect(map.size).toBe(0)
    expect(githubSyncSetupHtml()).toContain('king-640-060 / fitlog-lite-data')
  })
})
