import Dexie from 'dexie'
// DO NOT UPDATE THIS FIXTURE TO MATCH THE CURRENT SCHEMA.
// IT REPRESENTS A PREVIOUS PRODUCTION DATABASE: Dexie V7, 14 stores.
export const LEGACY_V7_SCHEMA = {
  foods: 'id, name, brand, [name+brand], createdAt',
  foodLogs: 'id, date, foodId, createdAt',
  exercises: 'id, name, createdAt',
  workouts: 'id, date, finishedAt, createdAt',
  weights: 'id, &date, createdAt',
  workoutTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
  dietTemplates: 'id, name, createdAt, updatedAt, lastUsedAt',
  nutritionTargets: 'id, &date, sourceTemplateId, createdAt',
  pelvicFloorSessions: 'id, date, startedAt, finishedAt, createdAt',
  cardioSessions: 'id, date, createdAt',
  habits: 'id, sortOrder, createdAt',
  habitCheckIns: 'id, habitId, date, &[habitId+date], completedAt',
  tasks: 'id, date, completedAt, createdAt, updatedAt, *tagIds',
  taskTags: 'id, &normalizedName, name, createdAt',
} as const
export function legacyV7Database(name: string): Dexie {
  const database = new Dexie(name)
  database.version(7).stores(LEGACY_V7_SCHEMA)
  return database
}
