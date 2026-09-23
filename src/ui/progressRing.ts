export interface GoalProgress {
  hasGoal: boolean
  main: number
  outer: number
  excess: number
  state: 'unset' | 'zero' | 'below' | 'reached' | 'above'
}

export function getGoalProgress(actual: number, goal?: number): GoalProgress {
  if (goal === undefined) return { hasGoal: false, main: 0, outer: 0, excess: 0, state: 'unset' }
  if (goal <= 0) {
    return actual > 0
      ? { hasGoal: true, main: 1, outer: 1, excess: actual, state: 'above' }
      : { hasGoal: true, main: 0, outer: 0, excess: 0, state: 'zero' }
  }
  if (actual > goal) return { hasGoal: true, main: 1, outer: Math.min(1, (actual - goal) / goal), excess: actual - goal, state: 'above' }
  if (actual === goal) return { hasGoal: true, main: 1, outer: 0, excess: 0, state: 'reached' }
  return { hasGoal: true, main: Math.max(0, Math.min(1, actual / goal)), outer: 0, excess: 0, state: 'below' }
}
