-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "properties" JSONB DEFAULT '[]',
ADD COLUMN     "schedule" JSONB;
