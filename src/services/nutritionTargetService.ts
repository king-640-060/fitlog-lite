import { db, type FitLogDatabase } from '../db/database'
import type { NutritionGoal, NutritionTarget } from '../db/types'
import { optionalNumber } from '../utils/validation'

export function normalizeNutritionGoal(value?: Partial<NutritionGoal>): NutritionGoal | undefined {
  const goal: NutritionGoal = {
    calories: optionalNumber(value?.calories, '目标热量', 0),
    protein: optionalNumber(value?.protein, '目标蛋白质', 0),
    carbs: optionalNumber(value?.carbs, '目标碳水', 0),
    fat: optionalNumber(value?.fat, '目标脂肪', 0),
  }
  return Object.values(goal).some((item) => item !== undefined) ? goal : undefined
}

export function createNutritionTarget(
  date: string,
  goal: Partial<NutritionGoal>,
  existing?: NutritionTarget,
  sourceTemplateId?: string,
): NutritionTarget {
  const normalized = normalizeNutritionGoal(goal)
  if (!normalized) throw new Error('请至少填写一项营养目标')
  const now = new Date().toISOString()
  return {
    id: existing?.id ?? crypto.randomUUID(), date, ...normalized, sourceTemplateId,
    createdAt: existing?.createdAt ?? now, updatedAt: now,
  }
}

export async function saveNutritionTarget(
  date: string,
  goal: Partial<NutritionGoal>,
  database: FitLogDatabase = db,
): Promise<NutritionTarget> {
  const existing = await database.nutritionTargets.where('date').equals(date).first()
  const target = createNutritionTarget(date, goal, existing)
  await database.nutritionTargets.put(target)
  return target
}

export async function deleteNutritionTarget(date: string, database: FitLogDatabase = db): Promise<void> {
  await database.nutritionTargets.where('date').equals(date).delete()
}
