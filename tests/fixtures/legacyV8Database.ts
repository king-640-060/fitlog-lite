import Dexie from 'dexie'
import { LEGACY_V7_SCHEMA } from './legacyV7Database'
// Frozen strategy release: V8 / 17 stores. Do not revise to match future schemas.
export const LEGACY_V8_SCHEMA = {
  ...LEGACY_V7_SCHEMA,
  nutritionStrategyTemplates: 'id, name, archivedAt, updatedAt',
  nutritionStrategyVariants: 'id, templateId, [templateId+sortOrder]',
  nutritionStrategyPhases: 'id, templateId, &startDate',
} as const
export function legacyV8Database(name: string): Dexie {
  const database = new Dexie(name)
  database.version(8).stores(LEGACY_V8_SCHEMA)
  return database
}
