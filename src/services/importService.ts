import Papa from 'papaparse'
import type { Food } from '../db/types'
import { validateFoodInput, type FoodInput } from './foodService'

const aliases: Record<keyof FoodInput, string[]> = {
  name: ['name', '名称'], brand: ['brand', '品牌'], referenceGrams: ['reference_g', 'referenceGrams', '基准克数'],
  calories: ['calories', '热量'], protein: ['protein', '蛋白质'], carbs: ['carbs', '碳水'], fat: ['fat', '脂肪'],
}

export interface ImportError { row: number; reason: string }
export interface ImportPreview { valid: FoodInput[]; errors: ImportError[]; duplicateIndexes: number[] }

function getValue(row: Record<string, unknown>, keys: string[]): unknown {
  const key = keys.find((candidate) => Object.hasOwn(row, candidate))
  return key ? row[key] : undefined
}

export function normalizeFoodRow(row: Record<string, unknown>): FoodInput {
  const rawReference = getValue(row, aliases.referenceGrams)
  return validateFoodInput({
    name: getValue(row, aliases.name) as string, brand: getValue(row, aliases.brand) as string,
    referenceGrams: rawReference === '' || rawReference === undefined ? 100 : rawReference as number,
    calories: getValue(row, aliases.calories) as number,
    protein: getValue(row, aliases.protein) as number,
    carbs: getValue(row, aliases.carbs) as number,
    fat: getValue(row, aliases.fat) as number,
  })
}

export function parseFoodCsv(csv: string): { rows: Record<string, unknown>[]; parseErrors: ImportError[] } {
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: 'greedy', transformHeader: (header) => header.trim() })
  return {
    rows: parsed.data,
    parseErrors: parsed.errors.map((error) => ({ row: (error.row ?? 0) + 2, reason: error.message })),
  }
}

export function parseFoodJson(text: string): Record<string, unknown>[] {
  const value: unknown = JSON.parse(text)
  if (!Array.isArray(value)) throw new Error('JSON 顶层必须是数组')
  return value as Record<string, unknown>[]
}

export function buildImportPreview(rows: Record<string, unknown>[], existing: Pick<Food, 'name' | 'brand'>[]): ImportPreview {
  const valid: FoodInput[] = []
  const errors: ImportError[] = []
  const duplicateIndexes: number[] = []
  const keys = new Set(existing.map((item) => `${item.name.trim().toLocaleLowerCase()}\u0000${(item.brand ?? '').trim().toLocaleLowerCase()}`))
  rows.forEach((row, index) => {
    try {
      const food = normalizeFoodRow(row)
      const key = `${food.name.toLocaleLowerCase()}\u0000${(food.brand ?? '').toLocaleLowerCase()}`
      if (keys.has(key)) duplicateIndexes.push(valid.length)
      else keys.add(key)
      valid.push(food)
    } catch (error) {
      errors.push({ row: index + 2, reason: error instanceof Error ? error.message : '格式错误' })
    }
  })
  return { valid, errors, duplicateIndexes }
}
