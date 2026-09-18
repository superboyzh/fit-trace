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
