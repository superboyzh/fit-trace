-- CreateEnum
CREATE TYPE "FitnessGoalType" AS ENUM ('LOSE_FAT', 'GAIN_MUSCLE', 'MAINTAIN');

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "goalType" "FitnessGoalType",
ADD COLUMN "goalStartWeight" DECIMAL(6,2),
ADD COLUMN "targetWeight" DECIMAL(6,2),
ADD COLUMN "targetDate" TIMESTAMP(3),
ADD COLUMN "goalStartedAt" TIMESTAMP(3);
