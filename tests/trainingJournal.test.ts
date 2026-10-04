import { describe, expect, it } from 'vitest'
import { normalizeTrainingJournal, normalizeWorkoutForSave } from '../src/services/workoutService'
import { validateCardioInput } from '../src/services/cardioService'
describe('training journal preservation', () => {
  it('trims only outer whitespace, preserves newlines and unicode, and enforces 2000 characters', () => {
    expect(normalizeTrainingJournal('  第一行\\n第二行 🌱  ')).toBe('第一行\\n第二行 🌱')
    expect(normalizeTrainingJournal('   ')).toBeUndefined()
    expect(() => normalizeTrainingJournal('a'.repeat(2001))).toThrow('2000')
    expect(normalizeTrainingJournal('a'.repeat(2000))).toHaveLength(2000)
  })
  it('normalizes strength and cardio notes through the same limit', () => {
    const workout = normalizeWorkoutForSave({ id: 'w', date: '2026-10-04', startedAt: '2026-10-04T00:00:00Z', exercises: [], createdAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z', note: '  感受\\n很好  ' })
    expect(workout.note).toBe('感受\\n很好')
    expect(() => validateCardioInput({ date: '2026-10-04', activityType: 'treadmill', durationMinutes: 20, speed: 6, note: 'x'.repeat(2001) })).toThrow('2000')
  })
})

