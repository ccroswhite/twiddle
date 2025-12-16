-- CreateTable
CREATE TABLE "WorkflowLock" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowLock_workflowId_key" ON "WorkflowLock"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowLock_userId_idx" ON "WorkflowLock"("userId");

-- AddForeignKey
ALTER TABLE "WorkflowLock" ADD CONSTRAINT "WorkflowLock_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowLock" ADD CONSTRAINT "WorkflowLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
