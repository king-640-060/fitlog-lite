export interface Food {
  id: string
  name: string
  brand?: string
  referenceGrams: number
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  createdAt: string
  updatedAt: string
}

export interface FoodLog {
  id: string
  date: string
  foodId?: string
  foodName: string
  brand?: string
  grams: number
  referenceGrams: number
  caloriesPerReference: number
  proteinPerReference?: number
  carbsPerReference?: number
  fatPerReference?: number
  totalCalories: number
  totalProtein?: number
  totalCarbs?: number
  totalFat?: number
  createdAt: string
  updatedAt: string
}

export interface Exercise {
  id: string
  name: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface WorkoutSet {
  id: string
  weightKg?: number
  reps: number
  rpe?: number
  note?: string
}

export interface WorkoutExercise {
  id: string
  exerciseId?: string
  exerciseName: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  date: string
  startedAt: string
  finishedAt?: string
  exercises: WorkoutExercise[]
  note?: string
  createdAt: string
  updatedAt: string
}

export interface WeightLog {
  id: string
  date: string
  weightKg: number
  createdAt: string
  updatedAt: string
}

export interface BackupData {
  app: 'FitLog Lite'
  schemaVersion: 1
  exportedAt: string
  data: {
    foods: Food[]
    foodLogs: FoodLog[]
    exercises: Exercise[]
    workouts: Workout[]
    weights: WeightLog[]
  }
}
