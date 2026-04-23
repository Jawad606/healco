-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('INITIATED', 'ROUTING', 'DECISION_PENDING', 'ACTION_PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "WorkflowRecord" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'INITIATED',
    "contextData" JSONB NOT NULL,
    "actualCare" TEXT,
    "isAdhered" BOOLEAN,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceLog" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "fromState" "WorkflowStatus" NOT NULL,
    "toState" "WorkflowStatus" NOT NULL,
    "actor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "routingDecision" JSONB,
    "decisionMade" JSONB,
    "actionTaken" JSONB,
    "adherenceResult" JSONB,
    "payloadSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRecord_idempotencyKey_key" ON "WorkflowRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WorkflowRecord_status_createdAt_idx" ON "WorkflowRecord"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GovernanceLog_workflowId_createdAt_idx" ON "GovernanceLog"("workflowId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernanceLog_step_createdAt_idx" ON "GovernanceLog"("step", "createdAt");

-- CreateIndex
CREATE INDEX "GovernanceLog_workflowId_step_idx" ON "GovernanceLog"("workflowId", "step");

-- AddForeignKey
ALTER TABLE "GovernanceLog" ADD CONSTRAINT "GovernanceLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "WorkflowRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

