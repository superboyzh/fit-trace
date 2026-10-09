/** 环境变量始终先按秒转成数字；JWT 库会把纯数字字符串当作毫秒。 */
export function accessTokenLifetime(value: unknown): number {
  if (value === undefined) return 900;
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value))) {
    throw new Error('JWT_EXPIRES_IN_SECONDS 必须是以秒为单位的正整数');
  }
  const seconds = Number(value);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('JWT_EXPIRES_IN_SECONDS 必须是以秒为单位的正整数');
  }
  return seconds;
}
