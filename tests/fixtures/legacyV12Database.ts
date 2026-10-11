// Frozen synthetic production V12: future migrations must preserve this schema and rows.
import Dexie from 'dexie'
import { LEGACY_V11_SCHEMA } from './legacyV11Database'
export const LEGACY_V12_SCHEMA = {
  ...LEGACY_V11_SCHEMA,
  nutritionCycles: 'id, startDate, endDate, archivedAt, updatedAt',
  nutritionCycleDays: 'id, cycleId, date, &[cycleId+date]',
}
export function legacyV12Database(name: string): Dexie {
  const database = new Dexie(name)
  database.version(12).stores(LEGACY_V12_SCHEMA)
  return database
}
