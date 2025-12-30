-- Add DataSourceGroup join table for multi-group sharing
-- Migrate existing single groupId to the new join table

-- Create the DataSourceGroup join table
CREATE TABLE "DataSourceGroup" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSourceGroup_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "DataSourceGroup_dataSourceId_groupId_key" ON "DataSourceGroup"("dataSourceId", "groupId");
CREATE INDEX "DataSourceGroup_dataSourceId_idx" ON "DataSourceGroup"("dataSourceId");
CREATE INDEX "DataSourceGroup_groupId_idx" ON "DataSourceGroup"("groupId");

-- Add foreign keys
ALTER TABLE "DataSourceGroup" ADD CONSTRAINT "DataSourceGroup_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DataSourceGroup" ADD CONSTRAINT "DataSourceGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing groupId data to the join table
INSERT INTO "DataSourceGroup" ("id", "dataSourceId", "groupId", "createdAt")
SELECT 
    gen_random_uuid()::text,
    "id",
    "groupId",
    NOW()
FROM "Credential"
WHERE "groupId" IS NOT NULL;

-- Drop the old groupId column and its index
DROP INDEX IF EXISTS "Credential_groupId_idx";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "groupId";
