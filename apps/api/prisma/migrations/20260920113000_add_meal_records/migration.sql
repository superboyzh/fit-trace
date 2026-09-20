-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "meal_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "mealRecordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT,
    "calories" INTEGER,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_records_userId_recordedAt_idx" ON "meal_records"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "food_items_mealRecordId_idx" ON "food_items"("mealRecordId");

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_mealRecordId_fkey" FOREIGN KEY ("mealRecordId") REFERENCES "meal_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
