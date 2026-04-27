/*
  Warnings:

  - Changed the type of `fromState` on the `GovernanceLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `toState` on the `GovernanceLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "GovernanceLog" ADD COLUMN     "ingestionRunId" TEXT,
ALTER COLUMN "workflowId" DROP NOT NULL,
ALTER COLUMN "fromState" TYPE TEXT,
ALTER COLUMN "toState" TYPE TEXT;

-- CreateIndex
CREATE INDEX "GovernanceLog_ingestionRunId_createdAt_idx" ON "GovernanceLog"("ingestionRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "GovernanceLog" ADD CONSTRAINT "GovernanceLog_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
