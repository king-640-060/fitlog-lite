import 'fake-indexeddb/auto'
import { FitLogDatabase } from '../../src/db/database'
import type { AiContext, AiToolCall } from '../../src/ai/types'
import { defaultAiPermissions } from '../../src/services/aiProfiles'
import { AiProposals } from '../../src/ai/proposals'
import { AiNutritionPlans } from '../../src/ai/nutritionPlans'
import { AiToolRegistry } from '../../src/ai/toolRegistry'
import type { Food } from '../../src/db/types'
export const aiFood = (id: string, overrides: Partial<Food> = {}): Food => ({ id, name: id, referenceGrams: 100, calories: 200, protein: 10, carbs: 20, fat: 5, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z', ...overrides })
export const aiCall = (name: string, args: unknown, id = crypto.randomUUID()): AiToolCall => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } })
export function aiEnvironment() {
  const database = new FitLogDatabase(`ai-${crypto.randomUUID()}`), permissions = defaultAiPermissions()
  const context: AiContext = { today: '2026-10-02', localTime: '2026-10-02 14:20:00', timezoneOffsetMinutes: -480, activeTab: 'food', foodDate: '2026-09-29', workoutDate: '2026-10-02', planView: 'today' }
  const proposals = new AiProposals(database, () => permissions, () => ['known-AI-secret', 'known-github-secret']), plans = new AiNutritionPlans()
  const env = { database, context: () => context, permissions: () => permissions, proposals, plans }
  const registry = new AiToolRegistry(env, () => ['known-AI-secret', 'known-github-secret'])
  const execute = async (name: string, args: unknown) => JSON.parse(await registry.execute(aiCall(name, args)))
  return { database, context, permissions, proposals, plans, env, registry, execute }
}
