import { canonicalSyncData } from '../src/utils/syncDataHash'
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FitLogDatabase } from '../src/db/database'
import { exportBackup, restoreBackup, validateBackup } from '../src/services/backupService'
import { GitHubManualSync, SYNC_STORAGE_KEYS } from '../src/services/githubManualSync'
import { bytesToBase64, decryptSyncText, encryptSyncText } from '../src/services/syncCryptoService'
import records from './fixtures/legacyV7Data.json'
const password = 'synthetic-password-123456'
const backup = () => validateBackup({ app: 'FitLog Lite', schemaVersion: 7, exportedAt: '2026-09-28T08:00:00.000Z', data: structuredClone(records) })
const databases: FitLogDatabase[] = []
afterEach(async () => { for (const d of databases.splice(0)) { d.close(); await d.delete() } })
function harness() {
  const d = new FitLogDatabase(`sync-safe-${crypto.randomUUID()}`); databases.push(d)
  const map = new Map(), storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) } as Storage
  let remote: { sha: string; text: string } | undefined, writes = 0, conflict = false
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    if (init.method === 'PUT') { writes++; if (conflict) return new Response('{}', { status: 409 }); const payload = JSON.parse(init.body as string); remote = { sha: `sha-${writes}`, text: new TextDecoder().decode(Uint8Array.from(atob(payload.content), c => c.charCodeAt(0))) }; return Response.json({ content: { sha: remote.sha } }) }
    if (url.includes('/contents/fitlog/')) return remote ? Response.json({ type: 'file', sha: remote.sha, encoding: 'base64', content: bytesToBase64(new TextEncoder().encode(remote.text)) }) : new Response('{}', { status: 404 })
    if (url.includes('/contents?')) return Response.json([])
    return Response.json({ private: true, default_branch: 'main' })
  }) as unknown as typeof fetch
  const sync = new GitHubManualSync(storage, d, fetcher)
  return { d, sync, map, fetcher, writes: () => writes, getRemote: () => remote, setRemote: (value: typeof remote) => { remote = value }, conflict: () => { conflict = true } }
}
async function connected(h: ReturnType<typeof harness>) { await h.sync.connect('test-owner', 'data', 'synthetic-token'); await h.d.open() }
async function setRemote(h: ReturnType<typeof harness>, value = backup(), sha = 'external') { h.setRemote({ sha, text: JSON.stringify(await encryptSyncText(JSON.stringify(value), password)) }) }
async function paired(h: ReturnType<typeof harness>) { await connected(h); await restoreBackup(backup(), h.d); const i = await h.sync.inspect(password); await h.sync.upload(i, password) }
describe('Manual sync safety and preservation', () => {
  it('first upload encrypts full Backup without changing DB; only transport config is stored', async () => {
    const h = harness(); await connected(h); await restoreBackup(backup(), h.d); const before = (await exportBackup(h.d)).data
    const i = await h.sync.inspect(password); expect(i.action).toBe('first-upload'); await h.sync.upload(i, password)
    expect(h.getRemote()!.text).not.toContain('PRIVATE_TEST_'); expect(validateBackup(JSON.parse(await decryptSyncText(JSON.parse(h.getRemote()!.text), password))).data).toEqual(before)
    expect((await exportBackup(h.d)).data).toEqual(before); expect([...h.map.values()].join('')).not.toContain(password); expect(JSON.stringify(await exportBackup(h.d))).not.toContain('synthetic-token')
  })
  it('fresh starter-only device restores all 14 stores through existing validated path', async () => {
    const h = harness(); await connected(h); await setRemote(h); const i = await h.sync.inspect(password)
    expect(i.action).toBe('unpaired-restore'); expect(await h.d.foods.count()).toBe(0); await h.sync.restore(i); expect(canonicalSyncData((await exportBackup(h.d)).data)).toBe(canonicalSyncData(backup().data)); expect(h.writes()).toBe(0)
  })
  it('wrong password or decrypted invalid Backup never changes local data, remote or baseline', async () => {
    const h = harness(); await paired(h); const before = (await exportBackup(h.d)).data, baseline = h.map.get(SYNC_STORAGE_KEYS.state), remote = h.getRemote()
    await expect(h.sync.inspect('wrong')).rejects.toThrow('数据密码'); expect((await exportBackup(h.d)).data).toEqual(before); expect(h.getRemote()).toEqual(remote); expect(h.map.get(SYNC_STORAGE_KEYS.state)).toBe(baseline)
    h.setRemote({ sha: 'invalid', text: JSON.stringify(await encryptSyncText('{"bad":"PRIVATE"}', password)) }); await expect(h.sync.inspect(password)).rejects.toThrow('不兼容'); expect((await exportBackup(h.d)).data).toEqual(before); expect(h.map.get(SYNC_STORAGE_KEYS.state)).toBe(baseline)
  })
  it('detects local-only, remote-only and divergent conflicts without automatic writes', async () => {
    const h = harness(); await paired(h); await h.d.tasks.update('task-old', { title: 'local change' }); const local = await h.sync.inspect(); expect(local.action).toBe('upload'); await h.sync.upload(local)
    const newer = backup(); newer.data.tasks[0]!.title = 'remote change'; await setRemote(h, newer); expect((await h.sync.inspect()).action).toBe('restore')
    await h.d.tasks.update('task-old', { title: 'second local' }); const conflict = await h.sync.inspect(); expect(conflict.action).toBe('conflict'); await expect(h.sync.upload(conflict)).rejects.toThrow('确认'); expect(h.writes()).toBe(2)
  })
  it('PUT conflict refetches but never retries or advances baseline', async () => {
    const h = harness(); await paired(h); await h.d.tasks.update('task-old', { title: 'local' }); const i = await h.sync.inspect(), baseline = h.map.get(SYNC_STORAGE_KEYS.state); h.conflict()
    await expect(h.sync.upload(i)).rejects.toMatchObject({ code: 'conflict' }); expect(h.writes()).toBe(2); expect(h.map.get(SYNC_STORAGE_KEYS.state)).toBe(baseline)
    expect((h.fetcher as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1].method).toBe('GET')
  })
  it('remote deletion requires explicit recreation, never silently first-uploads', async () => { const h = harness(); await paired(h); h.setRemote(undefined); const i = await h.sync.inspect(password); expect(i.action).toBe('remote-missing'); await expect(h.sync.upload(i, password)).rejects.toThrow('确认') })
  it('local or remote edits after restore preview abort without replacing local data', async () => {
    const h = harness(); await connected(h); await setRemote(h); const i = await h.sync.inspect(password); await h.d.tasks.add(backup().data.tasks[0]!); const before = (await exportBackup(h.d)).data
    await expect(h.sync.restore(i)).rejects.toMatchObject({ code: 'conflict' }); expect((await exportBackup(h.d)).data).toEqual(before)
    const j = await h.sync.inspect(password); await setRemote(h, backup(), 'new-sha'); await expect(h.sync.restore(j)).rejects.toMatchObject({ code: 'conflict' }); expect((await exportBackup(h.d)).data).toEqual(before)
  })
  it('identical actual data with changed envelope advances baseline without overwrites; disconnect preserves DB', async () => {
    const h = harness(); await paired(h); await setRemote(h); const i = await h.sync.inspect(); expect(i.action).toBe('adopt-baseline'); await h.sync.acceptSameData(i); expect(h.sync.state.lastRemoteSha).toBe('external'); expect(h.writes()).toBe(1)
    const before = (await exportBackup(h.d)).data; h.sync.disconnect(); expect(h.map.size).toBe(0); expect(h.sync.unlocked).toBe(false); expect((await exportBackup(h.d)).data).toEqual(before); expect(h.getRemote()).toBeDefined()
  })
})
