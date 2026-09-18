-- CreateTable
CREATE TABLE "body_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weight" DECIMAL(6,2) NOT NULL,
    "bodyFat" DECIMAL(5,2),
    "waist" DECIMAL(6,2),
    "chest" DECIMAL(6,2),
    "hip" DECIMAL(6,2),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "body_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "body_records_userId_recordedAt_idx" ON "body_records"("userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "body_records" ADD CONSTRAINT "body_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
