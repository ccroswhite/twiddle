-- AlterTable
ALTER TABLE "WorkflowLock" ADD COLUMN     "requestingAt" TIMESTAMP(3),
ADD COLUMN     "requestingUserId" TEXT;

-- CreateIndex
CREATE INDEX "WorkflowLock_requestingUserId_idx" ON "WorkflowLock"("requestingUserId");

-- AddForeignKey
ALTER TABLE "WorkflowLock" ADD CONSTRAINT "WorkflowLock_requestingUserId_fkey" FOREIGN KEY ("requestingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
