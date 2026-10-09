export interface Food {
  id: string
  name: string
  brand?: string
  referenceGrams: number
  servingGrams?: number // Optional input convenience; never a FoodLog history link.
  calories: number
  protein?: number
  carbs?: number
  fat?: number
  createdAt: string
  updatedAt: string
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodLog {
  id: string
  date: string
  meal?: MealType
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

export interface Habit {
  id: string
  name: string
  note?: string
  weekdays?: number[]
  targetPerWeek?: number
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface HabitCheckIn {
  id: string
  habitId: string
  date: string
  completedAt: string
  createdAt: string
  updatedAt: string
}

export interface TaskTag {
  id: string
  name: string
  normalizedName: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  note?: string
  date?: string
  startTime?: string
  endTime?: string
  tagIds: string[]
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type CardioActivityType = 'stair_climber' | 'treadmill'

export interface CardioSession {
  id: string
  date: string
  activityType?: CardioActivityType
  durationMinutes: number
  speed?: number
  inclinePercent?: number
  note?: string
  createdAt: string
  updatedAt: string
}

export interface LegacyCardioSessionV4 extends Omit<CardioSession, 'activityType' | 'speed' | 'inclinePercent'> {
  speed: number
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

export interface NutritionGoal {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface DietTemplate {
  id: string
  name: string
  description?: string
  items: DietTemplateItem[]
  nutritionGoal?: NutritionGoal
  createdAt: string
  updatedAt: string
  lastUsedAt?: string
}

export interface NutritionStrategyTemplate {
  id: string
  name: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface NutritionStrategyVariant extends NutritionGoal {
  id: string
  templateId: string
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface NutritionStrategyPhase {
  id: string
  templateId: string
  templateName: string
  startDate: string
  endDate?: string
  createdAt: string
}

export interface NutritionStrategySelection {
  templateId: string
  variantId: string
  phaseId: string
  templateName: string
  variantName: string
}

export interface NutritionTarget extends NutritionGoal {
  id: string
  date: string
  sourceTemplateId?: string // Existing DietTemplate origin; distinct from nutrition strategies.
  strategySelection?: NutritionStrategySelection
  createdAt: string
  updatedAt: string
}

export interface PelvicFloorPhase {
  type: 'prepare' | 'contract' | 'hold' | 'release' | 'relax' | 'rest'
  durationSeconds: number
}

export interface PelvicFloorSession {
  id: string
  date: string
  startedAt: string
  finishedAt: string
  phases: PelvicFloorPhase[]
  repetitions: number
  completedRepetitions: number
  completionType?: 'completed' | 'manual'
  routine?: {
    id: string
    name: string
    description: string
    exercises: { id: string; name: string; phases: PelvicFloorPhase[]; repetitions: number; sets?: number; restBetweenSetsSeconds?: number; restAfterSeconds?: number }[]
  }
  createdAt: string
  updatedAt: string
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

export interface BackupDataV3 extends BackupBase {
  schemaVersion: 3
  data: BackupDataV2['data'] & {
    nutritionTargets: NutritionTarget[]
    pelvicFloorSessions: PelvicFloorSession[]
  }
}

export interface BackupDataV4 extends BackupBase {
  schemaVersion: 4
  data: BackupDataV3['data'] & {
    cardioSessions: LegacyCardioSessionV4[]
  }
}

export interface BackupDataV5 extends BackupBase {
  schemaVersion: 5
  data: BackupDataV3['data'] & {
    cardioSessions: (CardioSession & { activityType: CardioActivityType })[]
  }
}

export interface BackupDataV6 extends BackupBase {
  schemaVersion: 6
  data: BackupDataV5['data'] & {
    habits: Habit[]
    habitCheckIns: HabitCheckIn[]
  }
}

export interface BackupDataV7 extends BackupBase {
  schemaVersion: 7
  data: BackupDataV6['data'] & {
    taskTags: TaskTag[]
    tasks: Task[]
  }
}

export interface BackupDataV8 extends BackupBase {
  schemaVersion: 8
  data: BackupDataV7['data'] & {
    nutritionStrategyTemplates: NutritionStrategyTemplate[]
    nutritionStrategyVariants: NutritionStrategyVariant[]
    nutritionStrategyPhases: NutritionStrategyPhase[]
  }
}

export interface BackupDataV9 extends BackupBase {
  schemaVersion: 9
  data: BackupDataV8['data']
}

export type BackupData = BackupDataV1 | BackupDataV2 | BackupDataV3 | BackupDataV4 | BackupDataV5 | BackupDataV6 | BackupDataV7 | BackupDataV8 | BackupDataV9 | BackupDataV10 | BackupDataV11

/** Context only: estimates never contribute to canonical FoodLog nutrition. */
export interface DietEvent {
  id: string; date: string; kind: 'indulgence'; scope: MealType | 'day'; note?: string
  estimatedCalories?: number; estimatedCaloriesLow?: number; estimatedCaloriesHigh?: number
  estimateSource?: 'manual' | 'photo'; createdAt: string; updatedAt: string
}
export interface BackupDataV10 extends BackupBase {
  schemaVersion: 10
  data: BackupDataV9['data'] & { dietEvents: DietEvent[] }
}

/** Absolute instants; completed sessions retain the local wake-date at finish/edit. */
export interface SleepSession {
  id: string
  startTime: string
  endTime?: string
  durationMinutes?: number
  recordDate?: string
  activeKey?: 'active'
  sleepNightDate?: string
  sleepNightDateSource?: 'auto' | 'manual'
  sleepStartLocalDate?: string
  createdAt: string
  updatedAt: string
}
export interface WaterLog {
  id: string
  date: string
  timestamp: string
  amountMl: number
  createdAt: string
  updatedAt: string
}
export interface BackupDataV11 extends BackupBase {
  schemaVersion: 11
  data: BackupDataV10['data'] & { sleepSessions: SleepSession[]; waterLogs: WaterLog[] }
}
