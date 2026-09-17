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

export interface WorkoutTemplateSet {
  id: string
  weightKg?: number
  reps: number
  rpe?: number
  note?: string
}

export interface WorkoutTemplateExercise {
  id: string
  exerciseId?: string
  exerciseName: string
  sets: WorkoutTemplateSet[]
  note?: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  description?: string
  exercises: WorkoutTemplateExercise[]
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

export interface DietTemplateFallback {
  referenceGrams: number
  calories: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface DietTemplateItem {
  id: string
  foodId?: string
  foodName: string
  brand?: string
  grams: number
  fallback: DietTemplateFallback
}

export interface DietTemplate {
  id: string
  name: string
  description?: string
  items: DietTemplateItem[]
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

interface BackupBase {
  app: 'FitLog Lite'
  exportedAt: string
}

export interface BackupDataV1 extends BackupBase {
  schemaVersion: 1
  data: {
    foods: Food[]
    foodLogs: FoodLog[]
    exercises: Exercise[]
    workouts: Workout[]
    weights: WeightLog[]
  }
}

export interface BackupDataV2 extends BackupBase {
  schemaVersion: 2
  data: BackupDataV1['data'] & {
    workoutTemplates: WorkoutTemplate[]
    dietTemplates: DietTemplate[]
  }
}

export type BackupData = BackupDataV1 | BackupDataV2
