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
