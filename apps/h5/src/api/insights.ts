import type { ApiResponse, InsightDays, InsightOverview } from '@fit-trace/shared';
import { http } from './http';

export function getLocalTimezoneOffset(): number {
  // getTimezoneOffset 以分钟为单位、西为正，这里换算成“UTC 以东为正”。
  return -new Date().getTimezoneOffset();
}

export async function getInsightOverview(days: InsightDays): Promise<InsightOverview> {
  const response = await http.get<ApiResponse<InsightOverview>>('/insights/overview', {
    params: { days, tzOffset: getLocalTimezoneOffset() },
  });
  return response.data.data;
}
