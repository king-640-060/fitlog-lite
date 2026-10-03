import Dexie from 'dexie'
import { LEGACY_V8_SCHEMA } from './legacyV8Database'
// Frozen serving release: V9 / 17 stores. Optional servingGrams has no index.
export const LEGACY_V9_SCHEMA = { ...LEGACY_V8_SCHEMA } as const
export function legacyV9Database(name: string): Dexie {
  const database = new Dexie(name)
  database.version(9).stores(LEGACY_V9_SCHEMA)
  return database
}
