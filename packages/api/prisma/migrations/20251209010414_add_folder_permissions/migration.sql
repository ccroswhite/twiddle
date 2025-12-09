-- CreateEnum
CREATE TYPE "FolderPermissionLevel" AS ENUM ('READ', 'WRITE', 'ADMIN');

-- CreateTable
CREATE TABLE "FolderPermission" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "permission" "FolderPermissionLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "FolderPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FolderPermission_folderId_idx" ON "FolderPermission"("folderId");

-- CreateIndex
CREATE INDEX "FolderPermission_userId_idx" ON "FolderPermission"("userId");

-- CreateIndex
CREATE INDEX "FolderPermission_groupId_idx" ON "FolderPermission"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderPermission_folderId_userId_key" ON "FolderPermission"("folderId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderPermission_folderId_groupId_key" ON "FolderPermission"("folderId", "groupId");

-- AddForeignKey
ALTER TABLE "FolderPermission" ADD CONSTRAINT "FolderPermission_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderPermission" ADD CONSTRAINT "FolderPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderPermission" ADD CONSTRAINT "FolderPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
