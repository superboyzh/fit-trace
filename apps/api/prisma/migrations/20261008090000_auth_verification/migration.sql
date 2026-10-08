ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TYPE "EmailCodePurpose" AS ENUM ('REGISTER', 'RESET_PASSWORD');
CREATE TABLE "email_verifications" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "EmailCodePurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "email_verifications_email_purpose_key" ON "email_verifications"("email", "purpose");
CREATE INDEX "email_verifications_expiresAt_idx" ON "email_verifications"("expiresAt");
CREATE TABLE "auth_rate_limits" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "auth_rate_limits_expiresAt_idx" ON "auth_rate_limits"("expiresAt");
CREATE TABLE "login_captcha_challenges" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  CONSTRAINT "login_captcha_challenges_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "login_captcha_challenges_expiresAt_idx" ON "login_captcha_challenges"("expiresAt");
