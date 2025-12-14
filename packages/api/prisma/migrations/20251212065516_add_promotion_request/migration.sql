-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PromotionRequest" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "fromEnv" "Environment" NOT NULL,
    "toEnv" "Environment" NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" "PromotionStatus" NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionRequest_workflowId_idx" ON "PromotionRequest"("workflowId");

-- CreateIndex
CREATE INDEX "PromotionRequest_status_idx" ON "PromotionRequest"("status");

-- CreateIndex
CREATE INDEX "PromotionRequest_requesterId_idx" ON "PromotionRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PromotionRequest_reviewerId_idx" ON "PromotionRequest"("reviewerId");

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRequest" ADD CONSTRAINT "PromotionRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
