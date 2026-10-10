-- 旧账号的随机摘要与用户密码摘要无法区分，保留未知状态，不修改原密码。
ALTER TABLE "users" ADD COLUMN "hasPassword" BOOLEAN;
