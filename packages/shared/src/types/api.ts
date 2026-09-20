export interface ApiResponse<T> {
  data: T;
}

export interface ApiListMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta: ApiListMeta;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
}

export interface HealthStatus {
  status: 'ok';
}

export interface PublicUser {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export interface BodyRecord {
  id: string;
  weight: number;
  bodyFat: number | null;
  waist: number | null;
  chest: number | null;
  hip: number | null;
  recordedAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BodyTrendDays = 7 | 30 | 90;
export type BodyTrendMetric = 'weight' | 'bodyFat' | 'waist';

export interface BodyTrendPoint {
  recordedAt: string;
  value: number;
}

export interface BodyTrendStats {
  current: number;
  start: number;
  change: number;
  max: number;
  min: number;
  average: number;
}

export interface BodyTrendSeries {
  points: BodyTrendPoint[];
  stats: BodyTrendStats | null;
}

export interface BodyTrendData {
  days: BodyTrendDays;
  from: string;
  to: string;
  weight: BodyTrendSeries;
  bodyFat: BodyTrendSeries;
  waist: BodyTrendSeries;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface FoodRecognitionItem {
  name: string;
  estimatedAmount: string | null;
  estimatedCalories: number | null;
}

export interface FoodRecognitionResult {
  /** 生成该结果的识别服务，用于提示用户当前是否处于模拟模式。 */
  provider: string;
  imageUrl: string;
  foods: FoodRecognitionItem[];
}

export interface FoodItem {
  id: string;
  name: string;
  amount: string | null;
  calories: number | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecord {
  id: string;
  type: MealType;
  recordedAt: string;
  note: string | null;
  imageUrl: string | null;
  foods: FoodItem[];
  totalCalories: number | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkoutType = 'STRENGTH' | 'CARDIO' | 'RUNNING' | 'CYCLING' | 'SWIMMING' | 'OTHER';

export interface WorkoutRecord {
  id: string;
  type: WorkoutType;
  name: string;
  startedAt: string;
  durationMinutes: number;
  calories: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PhotoType = 'FRONT' | 'SIDE' | 'BACK' | 'OTHER';

export interface ProgressPhoto {
  id: string;
  type: PhotoType;
  imageUrl: string;
  recordedAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  url: string;
  key: string;
}

export type InsightDays = 7 | 30 | 90;

export interface InsightSeriesPoint {
  date: string;
  weight: number | null;
  calories: number | null;
  workoutMinutes: number;
  mealCount: number;
}

export interface InsightWeightSummary {
  start: number | null;
  current: number | null;
  change: number | null;
  lowest: number | null;
  highest: number | null;
  recordCount: number;
}

export interface InsightCaloriesSummary {
  average: number | null;
  highest: number | null;
  recordedDays: number;
}

export interface InsightWorkoutSummary {
  count: number;
  totalMinutes: number;
  totalCalories: number | null;
  byType: Array<{ type: WorkoutType; count: number; minutes: number }>;
}

export interface InsightMealSummary {
  count: number;
  recordedDays: number;
  byType: Array<{ type: MealType; count: number }>;
}

export interface InsightPhotoSummary {
  count: number;
  latestRecordedAt: string | null;
}

export interface InsightOverview {
  days: InsightDays;
  from: string;
  to: string;
  series: InsightSeriesPoint[];
  weight: InsightWeightSummary;
  calories: InsightCaloriesSummary;
  workouts: InsightWorkoutSummary;
  meals: InsightMealSummary;
  photos: InsightPhotoSummary;
}
