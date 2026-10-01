import { describe, expect, it } from 'vitest'
import { decideGitHubSyncAction as decide, hasMeaningfulLocalUserData } from '../src/utils/githubSyncDecision'
import { STARTER_EXERCISE_NAMES } from '../src/db/database'
import { validateBackup } from '../src/services/backupService'
import data from './fixtures/legacyV7Data.json'
const baseline = { lastRemoteSha: 'old', lastSyncedDataHash: 'base', currentLocalHash: 'base', currentRemoteSha: 'old', meaningfulLocalData: true }
describe('Manual sync decision', () => {
  it.each([
    [{ currentLocalHash: 'local', meaningfulLocalData: false }, 'first-upload'],
    [baseline, 'current'],
    [{ ...baseline, currentLocalHash: 'changed' }, 'upload'],
    [{ ...baseline, currentRemoteSha: 'changed', remoteDataHash: 'remote' }, 'restore'],
    [{ ...baseline, currentLocalHash: 'changed', currentRemoteSha: 'new', remoteDataHash: 'remote' }, 'conflict'],
    [{ ...baseline, currentLocalHash: 'changed', currentRemoteSha: 'new', remoteDataHash: 'changed' }, 'adopt-baseline'],
    [{ ...baseline, currentRemoteSha: undefined }, 'remote-missing'],
    [{ currentLocalHash: 'fresh', currentRemoteSha: 'remote', meaningfulLocalData: false }, 'unpaired-restore'],
    [{ currentLocalHash: 'local', currentRemoteSha: 'remote', meaningfulLocalData: true }, 'unpaired-conflict'],
  ])('%j → %s', (input, expected) => { expect(decide(input)).toBe(expected); expect(decide(input)).toBe(expected) })
  it('only unchanged default exercises are a fresh install', () => {
    const d = validateBackup({ app: 'FitLog Lite', schemaVersion: 7, exportedAt: '2026-09-28T08:00:00.000Z', data: Object.fromEntries(Object.keys(data).map(k => [k, []])) }).data
    d.exercises = STARTER_EXERCISE_NAMES.map((name, i) => ({ id: String(i), name, createdAt: 'now', updatedAt: 'now' })); expect(hasMeaningfulLocalUserData(d)).toBe(false)
    d.exercises[0]!.notes = 'modified'; expect(hasMeaningfulLocalUserData(d)).toBe(true); delete d.exercises[0]!.notes; d.exercises.pop(); expect(hasMeaningfulLocalUserData(d)).toBe(true)
  })
})
