import { Prisma } from "@prisma/client";
import { prisma } from "../core/db";

export type IngestionRecordCreateInput = {
  ingestionRunId: string;
  rowNumber: number;
  memberId: string | null;
  claimId: string | null;
  caseId: string | null;
  diagnosisCode: string | null;
  procedureCode: string | null;
  utilizationType: string | null;
  serviceDate: Date | null;
  billedAmount: number | null;
  paidAmount: number | null;
  normalizedPayload: Record<string, unknown>;
  rowStatus: "VALID" | "INVALID";
  rowErrors: string[];
};

export class IngestionRepository {
  async findRunByChecksum(employerName: string, sourceChecksum: string) {
    return prisma.ingestionRun.findUnique({
      where: {
        employerName_sourceChecksum: {
          employerName,
          sourceChecksum,
        },
      },
    });
  }

  async createRun(data: {
    runId: string;
    employerName: string;
    sourceFileName: string;
    sourceFileType: "CSV" | "XML";
    sourceChecksum: string;
  }) {
    return prisma.ingestionRun.create({
      data: {
        ...data,
        status: "RECEIVED",
      },
    });
  }

  async updateRun(
    id: string,
    data: {
      status?: "RECEIVED" | "PARSED" | "DETECTED" | "COMPLETED" | "FAILED";
      totalRows?: number;
      validRows?: number;
      invalidRows?: number;
      totalMskFlags?: number;
      errorSummary?: string | null;
      completedAt?: Date | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.ingestionRun.update({
      where: { id },
      data,
    });
  }

  async createRecords(
    records: IngestionRecordCreateInput[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;

    // We use createMany for performance and atomicity
    await (client as any).ingestedClaimRecord.createMany({
      data: records.map((record) => ({
        ingestionRunId: record.ingestionRunId,
        rowNumber: record.rowNumber,
        memberId: record.memberId,
        claimId: record.claimId,
        caseId: record.caseId,
        diagnosisCode: record.diagnosisCode,
        procedureCode: record.procedureCode,
        utilizationType: record.utilizationType,
        serviceDate: record.serviceDate,
        billedAmount:
          record.billedAmount === null
            ? null
            : new Prisma.Decimal(record.billedAmount),
        paidAmount:
          record.paidAmount === null
            ? null
            : new Prisma.Decimal(record.paidAmount),
        normalizedPayload: record.normalizedPayload as Prisma.InputJsonValue,
        rowStatus: record.rowStatus,
        rowErrors: record.rowErrors as Prisma.InputJsonValue,
      })),
    });

    return client.ingestedClaimRecord.findMany({
      where: { ingestionRunId: records[0].ingestionRunId },
      orderBy: [{ rowNumber: "asc" }],
    });
  }

  async listValidRecords(ingestionRunId: string) {
    return prisma.ingestedClaimRecord.findMany({
      where: {
        ingestionRunId,
        rowStatus: "VALID",
      },
      orderBy: [{ rowNumber: "asc" }, { id: "asc" }],
    });
  }

  async markRecordMsk(
    recordId: string,
    isMskFlagged: boolean,
    mskReason: string | null,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.ingestedClaimRecord.update({
      where: { id: recordId },
      data: {
        isMskFlagged,
        mskReason,
      },
    });
  }

  async createDetectionResult(
    data: {
      ingestionRunId: string;
      detectorVersion: string;
      totalProcessed: number;
      mskFound: number;
      flaggedMemberIds: string[];
      flaggedCaseIds: string[];
      detectionReasons: string[];
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    return client.mskDetectionResult.create({
      data: {
        ...data,
        flaggedMemberIds: data.flaggedMemberIds as Prisma.InputJsonValue,
        flaggedCaseIds: data.flaggedCaseIds as Prisma.InputJsonValue,
        detectionReasons: data.detectionReasons as Prisma.InputJsonValue,
      },
    });
  }

  async findRunByRunId(runId: string) {
    return prisma.ingestionRun.findUnique({ where: { runId } });
  }

  async listRecordsByRunId(ingestionRunId: string) {
    return prisma.ingestedClaimRecord.findMany({
      where: { ingestionRunId },
      orderBy: [{ rowNumber: "asc" }, { id: "asc" }],
    });
  }

  async listWorkflowsByIngestionRunId(ingestionRunId: string) {
    return prisma.workflowRecord.findMany({
      where: { ingestionRunId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  async listRuns(filters: { status?: string; limit: number; offset: number }) {
    const where = filters.status
      ? {
          status: filters.status as
            | "RECEIVED"
            | "PARSED"
            | "DETECTED"
            | "COMPLETED"
            | "FAILED",
        }
      : {};

    return (prisma as any).ingestionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit,
      skip: filters.offset,
      select: {
        id: true,
        runId: true,
        employerName: true,
        sourceFileName: true,
        sourceFileType: true,
        status: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        totalMskFlags: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });
  }
}
