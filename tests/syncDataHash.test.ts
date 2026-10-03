import { describe, expect, it } from 'vitest'
import { validateBackup } from '../src/services/backupService'
import { canonicalSyncData, syncDataHash } from '../src/utils/syncDataHash'
import data from './fixtures/legacyV7Data.json'
import strategies from './fixtures/legacyV8Data.json'
import { encryptSyncText, decryptSyncText } from '../src/services/syncCryptoService'
const backup = () => validateBackup({ app: 'FitLog Lite', schemaVersion: 7, exportedAt: '2026-09-28T08:00:00.000Z', data: structuredClone(data) })
describe('Stable business data hash', () => {
  it('BackupV8 encrypted payload contains complete strategy definitions, order, phases and provenance', async () => {
    const original = validateBackup({ app: 'FitLog Lite', schemaVersion: 8, exportedAt: '2026-09-29T08:00:00.000Z', data: structuredClone(strategies) })
    const envelope = await encryptSyncText(JSON.stringify(original), 'synthetic-data-password-123')
    expect(envelope.formatVersion).toBe(1)
    const restored = validateBackup(JSON.parse(await decryptSyncText(envelope, 'synthetic-data-password-123')))
    expect(restored.data).toEqual(original.data)
    const changed = structuredClone(original)
    changed.data.nutritionStrategyVariants[0]!.sortOrder = 5
    expect(await syncDataHash(changed.data)).not.toBe(await syncDataHash(original.data))
    expect(JSON.stringify(envelope)).not.toContain('冻结营养策略')
  })
  it('ignores export timestamp, object key ordering and top-level entity ordering', async () => {
    const a = backup(), b = backup(); b.exportedAt = '2026-10-01T08:00:00.000Z'; b.data.tasks.reverse()
    b.data.foods[0] = Object.fromEntries(Object.entries(b.data.foods[0]!).reverse()) as never
    const before = structuredClone(b); expect(await syncDataHash(a.data)).toBe(await syncDataHash(b.data)); expect(b).toEqual(before)
  })
  it('real business changes change the fingerprint', async () => { const a = backup(), b = backup(); b.data.tasks[0]!.title = 'changed'; expect(await syncDataHash(a.data)).not.toBe(await syncDataHash(b.data)) })
  it('preserves nested semantic order and JSON undefined semantics', async () => {
    const a = backup(), b = backup(); b.data.workouts[0]!.exercises[0]!.sets.reverse(); expect(await syncDataHash(a.data)).not.toBe(await syncDataHash(b.data))
    const c = backup(); c.data.foods[0]!.fat = undefined; expect(canonicalSyncData(c.data)).toBe(canonicalSyncData(a.data))
    const d = backup(); d.data.workouts[0]!.exercises.push({ id: 'we2', exerciseName: 'second', sets: [] }); const e = structuredClone(d); e.data.workouts[0]!.exercises.reverse(); expect(await syncDataHash(d.data)).not.toBe(await syncDataHash(e.data))
  })
})
