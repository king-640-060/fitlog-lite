import Dexie from 'dexie'
import { LEGACY_V10_SCHEMA } from './legacyV10Database'
// Frozen Recovery release: V11 / 20 stores. Earlier fixtures remain immutable.
export const LEGACY_V11_SCHEMA = { ...LEGACY_V10_SCHEMA, sleepSessions: 'id, &activeKey, recordDate, startTime', waterLogs: 'id, date, timestamp' } as const
export function legacyV11Database(name: string): Dexie { const database = new Dexie(name); database.version(11).stores(LEGACY_V11_SCHEMA); return database }
