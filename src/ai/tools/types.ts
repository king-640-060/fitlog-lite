import type { VideoSearchProvider, VideoSearchResult } from '../../services/videoSearchService'
import type { FitLogDatabase } from '../../db/database'
import type { AiContext, AiPermissions, AiScope } from '../types'
import type { AiProposals } from '../proposals'
import type { AiNutritionPlans } from '../nutritionPlans'
import { AiError } from '../security'

export interface AiToolEnvironment { videoSearch?: VideoSearchProvider; signal?: AbortSignal; onVideos?: (videos: VideoSearchResult[]) => void; database: FitLogDatabase; context: () => AiContext; permissions: () => AiPermissions; proposals: AiProposals; plans: AiNutritionPlans }
export interface AiSchema { type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean'; properties?: Record<string, AiSchema>; required?: string[]; additionalProperties?: false; items?: AiSchema; minItems?: number; maxItems?: number; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; enum?: (string | number)[]; description?: string }
export interface AiTool { name: string; label: string; kind: 'READ' | 'PROPOSAL'; scopes: AiScope[]; schema: AiSchema; execute: (args: Record<string, unknown>, env: AiToolEnvironment) => Promise<unknown> | unknown }
export const stringSchema = (maxLength = 200, description?: string): AiSchema => ({ type: 'string', minLength: 1, maxLength, ...(description ? { description } : {}) })
export const numberSchema = (minimum = 0, maximum = 100000): AiSchema => ({ type: 'number', minimum, maximum })
export const booleanSchema: AiSchema = { type: 'boolean' }
export const dateSchema = stringSchema(10, '设备本地 YYYY-MM-DD 日期；相对日期请按当前上下文转换')
export const enumSchema = (...values: string[]): AiSchema => ({ type: 'string', enum: values })
export const arraySchema = (items: AiSchema, maxItems = 20, minItems = 1): AiSchema => ({ type: 'array', items, minItems, maxItems })
export const objectSchema = (properties: Record<string, AiSchema>, required = Object.keys(properties)): AiSchema => ({ type: 'object', properties, required, additionalProperties: false })
export const rangeSchema = objectSchema({ start: dateSchema, end: dateSchema })
export function defineTool<A extends object>(name: string, label: string, kind: AiTool['kind'], scopes: AiScope[], schema: AiSchema, execute: (args: A, env: AiToolEnvironment) => Promise<unknown> | unknown): AiTool { return { name, label, kind, scopes, schema, execute: (args, env) => execute(args as A, env) } }
export function validateAiArguments(value: unknown, schema: AiSchema): void {
  const invalid = () => { throw new AiError('invalid_arguments', '工具参数不符合格式或范围，请补充清楚后再试') }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid()
    const object = value as Record<string, unknown>
    if (Object.keys(object).some(key => !Object.hasOwn(schema.properties ?? {}, key)) || schema.required?.some(key => !Object.hasOwn(object, key))) return invalid()
    for (const [key, child] of Object.entries(object)) validateAiArguments(child, schema.properties![key])
  } else if (schema.type === 'array') {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? 20)) return invalid()
    for (const item of value) validateAiArguments(item, schema.items!)
  } else if (schema.type === 'string') {
    if (typeof value !== 'string' || value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? 200)) return invalid()
  } else if (schema.type === 'boolean') { if (typeof value !== 'boolean') return invalid() }
  else if (typeof value !== 'number' || !Number.isFinite(value) || (schema.type === 'integer' && !Number.isInteger(value)) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity)) return invalid()
  if (schema.enum && !schema.enum.includes(value as string | number)) invalid()
}
