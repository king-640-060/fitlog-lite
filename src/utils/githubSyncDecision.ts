import type { BackupDataV7 } from '../db/types'
import { STARTER_EXERCISE_NAMES } from '../db/database'
export type GitHubSyncAction = 'first-upload' | 'current' | 'upload' | 'adopt-baseline' | 'restore' | 'conflict' | 'unpaired-restore' | 'unpaired-conflict' | 'remote-missing'
export interface SyncDecisionInput {
  lastRemoteSha?: string
  lastSyncedDataHash?: string
  currentLocalHash: string
  currentRemoteSha?: string
  remoteDataHash?: string
  meaningfulLocalData: boolean
}
export function decideGitHubSyncAction(i: SyncDecisionInput): GitHubSyncAction {
  const baseline = Boolean(i.lastRemoteSha && i.lastSyncedDataHash)
  if (!i.currentRemoteSha) return baseline ? 'remote-missing' : 'first-upload'
  if (i.remoteDataHash === i.currentLocalHash) return 'adopt-baseline'
  if (!baseline) return i.meaningfulLocalData ? 'unpaired-conflict' : 'unpaired-restore'
  const localChanged = i.currentLocalHash !== i.lastSyncedDataHash, remoteChanged = i.currentRemoteSha !== i.lastRemoteSha
  if (localChanged && remoteChanged) return 'conflict'
  if (remoteChanged) return 'restore'
  return localChanged ? 'upload' : 'current'
}
export function hasMeaningfulLocalUserData(data: BackupDataV7['data']): boolean {
  if (Object.entries(data).some(([store, rows]) => store !== 'exercises' && rows.length > 0)) return true
  const names = new Set<string>(STARTER_EXERCISE_NAMES)
  return data.exercises.length !== names.size || data.exercises.some(e => !names.delete(e.name) || e.notes !== undefined || e.updatedAt !== e.createdAt)
}
