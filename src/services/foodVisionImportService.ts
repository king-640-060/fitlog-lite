import { db, type FitLogDatabase } from '../db/database'
import type { Food, FoodLog, MealType } from '../db/types'
import { logFood, saveFood, validateFoodInput, type FoodInput } from './foodService'
import type { NutritionLabelExtractionV1 } from './aiVisionFoodService'
import { energyToKcal, type EnergyUnit } from '../utils/energy'
import { getLocalDateString } from '../utils/date'
import { isMealType } from '../utils/foodMeals'
import { isFutureBusinessDate } from '../utils/nutritionCompletion'

export interface VisionFoodDraft { name: string; brand: string; referenceGrams: number | null; energyValue: number | null; energyUnit: EnergyUnit; protein: number | null; carbs: number | null; fat: number | null }
export interface VisionIntake { date: string; meal: MealType; grams: number }
export function draftFromLabel(label: NutritionLabelExtractionV1): VisionFoodDraft {
  let referenceGrams = label.basis.unit === 'g' ? label.basis.amount : null
  if (label.basis.kind === 'unknown') referenceGrams = null
  if (label.basis.kind === 'per_package' && referenceGrams === null && ['g', 'kg'].includes(label.netQuantity.unit ?? '') && label.netQuantity.value !== null) referenceGrams = label.netQuantity.value * (label.netQuantity.unit === 'kg' ? 1000 : 1)
  return { name: label.productName ?? '', brand: label.brand ?? '', referenceGrams, energyValue: label.nutrients.energy.value, energyUnit: label.nutrients.energy.unit ?? 'kcal', protein: label.nutrients.protein.value, carbs: label.nutrients.carbs.value, fat: label.nutrients.fat.value }
}
export function validateVisionFoodDraft(draft: VisionFoodDraft): FoodInput {
  if (draft.referenceGrams === null || draft.energyValue === null) throw new Error('请核对并填写基准重量和能量；无法识别的数值不会自动补齐')
  if (draft.name.length > 120 || draft.brand.length > 120) throw new Error('名称或品牌不能超过 120 字符')
  const input = validateFoodInput({ name: draft.name, brand: draft.brand, referenceGrams: draft.referenceGrams, calories: energyToKcal(draft.energyValue, draft.energyUnit), protein: draft.protein ?? undefined, carbs: draft.carbs ?? undefined, fat: draft.fat ?? undefined })
  if ([input.referenceGrams, input.calories, input.protein, input.carbs, input.fat].some(value => value !== undefined && value > 1_000_000)) throw new Error('数值过大，请核对包装单位')
  return input
}
export function validateVisionIntake(intake: VisionIntake, today = getLocalDateString()): VisionIntake {
  const date = intake.date, [year, month, day] = date.split('-').map(Number), check = new Date(year!, month! - 1, day!, 12)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || getLocalDateString(check) !== date) throw new Error('记录日期无效')
  if (isFutureBusinessDate(date, today)) throw new Error('未来日期可以保存食物，实际吃下后再记录饮食')
  if (!isMealType(intake.meal) || !Number.isFinite(intake.grams) || intake.grams <= 0 || intake.grams > 1_000_000) throw new Error('请选择餐次并填写实际吃下的克数')
  return { date, meal: intake.meal, grams: intake.grams }
}
/** App-owned immutable preview. No write occurs until confirm is invoked by the UI. */
export class FoodVisionWrite {
  readonly food: Readonly<FoodInput>
  readonly intake?: Readonly<VisionIntake>
  private job?: Promise<{ food: Food; log?: FoodLog }>
  private cancelled = false
  private readonly database: FitLogDatabase
  private readonly today: () => string
  constructor(input: FoodInput, intake?: VisionIntake, database: FitLogDatabase = db, today = () => getLocalDateString()) {
    this.database = database; this.today = today
    this.food = Object.freeze({ ...validateFoodInput(input) }); this.intake = intake ? Object.freeze(validateVisionIntake(intake, today())) : undefined
  }
  cancel(): void { if (!this.job) this.cancelled = true }
  confirm(): Promise<{ food: Food; log?: FoodLog }> {
    if (this.job) return this.job
    if (this.cancelled) return Promise.reject(new Error('这份预览已取消，请重新核对'))
    this.job = this.database.transaction('rw', this.database.foods, this.database.foodLogs, async () => {
      if (this.intake) validateVisionIntake(this.intake, this.today())
      const food = await saveFood(this.food, undefined, this.database)
      const log = this.intake ? await logFood(food, this.intake.grams, this.intake.date, this.intake.meal, this.database) : undefined
      return { food, log }
    })
    const job = this.job
    void job.catch(() => { if (this.job === job) this.job = undefined })
    return job
  }
}
export async function logReviewedVisionFood(food: Food, intake: VisionIntake, database: FitLogDatabase = db): Promise<FoodLog> {
  const captured = { ...food }, validated = validateVisionIntake(intake)
  return database.transaction('rw', database.foods, database.foodLogs, async () => {
    const current = await database.foods.get(captured.id)
    const keys = ['id', 'name', 'brand', 'referenceGrams', 'calories', 'protein', 'carbs', 'fat', 'updatedAt'] as const
    if (!current || keys.some(key => current[key] !== captured[key])) throw new Error('食物已修改或删除，请重新选择并核对')
    validateVisionIntake(validated)
    return logFood(captured, validated.grams, validated.date, validated.meal, database)
  })
}
