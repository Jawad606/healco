-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('RECEIVED', 'PARSED', 'DETECTED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceFileType" AS ENUM ('CSV', 'XML');

-- CreateEnum
CREATE TYPE "IngestionRowStatus" AS ENUM ('VALID', 'INVALID');

-- AlterTable
ALTER TABLE "WorkflowRecord" ADD COLUMN     "ingestionRunId" TEXT;

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employerName" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileType" "SourceFileType" NOT NULL,
    "sourceChecksum" TEXT NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RECEIVED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "totalMskFlags" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestedClaimRecord" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "memberId" TEXT,
    "claimId" TEXT,
    "caseId" TEXT,
    "diagnosisCode" TEXT,
    "procedureCode" TEXT,
    "utilizationType" TEXT,
    "serviceDate" TIMESTAMP(3),
    "billedAmount" DECIMAL(65,30),
    "paidAmount" DECIMAL(65,30),
    "normalizedPayload" JSONB NOT NULL,
    "rowStatus" "IngestionRowStatus" NOT NULL,
    "rowErrors" JSONB NOT NULL,
    "isMskFlagged" BOOLEAN NOT NULL DEFAULT false,
    "mskReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestedClaimRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MskDetectionResult" (
    "id" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "detectorVersion" TEXT NOT NULL,
    "totalProcessed" INTEGER NOT NULL,
    "mskFound" INTEGER NOT NULL,
    "flaggedMemberIds" JSONB NOT NULL,
    "flaggedCaseIds" JSONB NOT NULL,
    "detectionReasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MskDetectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IngestionRun_runId_key" ON "IngestionRun"("runId");

-- CreateIndex
CREATE INDEX "IngestionRun_status_createdAt_idx" ON "IngestionRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_employerName_createdAt_idx" ON "IngestionRun"("employerName", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_createdAt_idx" ON "IngestionRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionRun_employerName_sourceChecksum_key" ON "IngestionRun"("employerName", "sourceChecksum");

-- CreateIndex
CREATE INDEX "IngestedClaimRecord_ingestionRunId_rowNumber_idx" ON "IngestedClaimRecord"("ingestionRunId", "rowNumber");

-- CreateIndex
CREATE INDEX "IngestedClaimRecord_ingestionRunId_rowStatus_idx" ON "IngestedClaimRecord"("ingestionRunId", "rowStatus");

-- CreateIndex
CREATE INDEX "IngestedClaimRecord_ingestionRunId_isMskFlagged_idx" ON "IngestedClaimRecord"("ingestionRunId", "isMskFlagged");

-- CreateIndex
CREATE INDEX "MskDetectionResult_ingestionRunId_createdAt_idx" ON "MskDetectionResult"("ingestionRunId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowRecord_ingestionRunId_createdAt_idx" ON "WorkflowRecord"("ingestionRunId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkflowRecord" ADD CONSTRAINT "WorkflowRecord_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestedClaimRecord" ADD CONSTRAINT "IngestedClaimRecord_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MskDetectionResult" ADD CONSTRAINT "MskDetectionResult_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
