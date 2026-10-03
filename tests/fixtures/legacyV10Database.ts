import Dexie from 'dexie'
import { LEGACY_V9_SCHEMA } from './legacyV9Database'
// Frozen contextual DietEvent release: V10 / 18 stores.
export const LEGACY_V10_SCHEMA = { ...LEGACY_V9_SCHEMA, dietEvents: 'id, date, kind, scope, createdAt' } as const
export function legacyV10Database(name: string): Dexie { const database = new Dexie(name); database.version(10).stores(LEGACY_V10_SCHEMA); return database }
