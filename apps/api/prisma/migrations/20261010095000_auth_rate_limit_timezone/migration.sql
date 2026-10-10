-- 旧值由原始 SQL 写入 timestamp 列，使用的是数据库会话时区。
-- 保留原到期时刻，改为带时区时间，使 Prisma 与原始 SQL 读取一致。
ALTER TABLE "auth_rate_limits"
ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3)
USING "expiresAt" AT TIME ZONE current_setting('TimeZone');
