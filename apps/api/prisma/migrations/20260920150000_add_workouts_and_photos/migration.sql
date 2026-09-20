-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('STRENGTH', 'CARDIO', 'RUNNING', 'CYCLING', 'SWIMMING', 'OTHER');

-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('FRONT', 'SIDE', 'BACK', 'OTHER');

-- CreateTable
CREATE TABLE "workout_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WorkoutType" NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "calories" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_photos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PhotoType" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_records_userId_startedAt_idx" ON "workout_records"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "progress_photos_userId_recordedAt_idx" ON "progress_photos"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "workout_records" ADD CONSTRAINT "workout_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
