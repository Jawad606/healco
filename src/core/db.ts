import { Prisma, PrismaClient } from '@prisma/client';
import { WorkflowStatus } from './workflow-state';

type WorkflowRow = {
  id: string;
  idempotencyKey: string;
  ingestionRunId: string | null;
  traceId: string;
  status: WorkflowStatus;
  contextData: Prisma.InputJsonValue;
  actualCare: string | null;
  isAdhered: boolean | null;
  retryCount: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type GovernanceRow = {
  id: string;
  workflowId: string | null;
  ingestionRunId: string | null;
  traceId: string;
  step: string;
  fromState: string;
  toState: string;
  actor: string;
  title: string;
  narrative: string;
  message: string;
  routingDecision: Prisma.InputJsonValue | null;
  decisionMade: Prisma.InputJsonValue | null;
  actionTaken: Prisma.InputJsonValue | null;
  adherenceResult: Prisma.InputJsonValue | null;
  payloadSnapshot: Prisma.InputJsonValue;
  createdAt: Date;
};

type IngestionRunStatus = 'RECEIVED' | 'PARSED' | 'DETECTED' | 'COMPLETED' | 'FAILED';
type SourceFileType = 'CSV' | 'XML';
type IngestionRowStatus = 'VALID' | 'INVALID';

type IngestionRunRow = {
  id: string;
  runId: string;
  employerName: string;
  sourceFileName: string;
  sourceFileType: SourceFileType;
  sourceChecksum: string;
  status: IngestionRunStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  totalMskFlags: number;
  errorSummary: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type IngestedClaimRow = {
  id: string;
  ingestionRunId: string;
  rowNumber: number;
  memberId: string | null;
  claimId: string | null;
  caseId: string | null;
  diagnosisCode: string | null;
  procedureCode: string | null;
  utilizationType: string | null;
  serviceDate: Date | null;
  billedAmount: Prisma.Decimal | null;
  paidAmount: Prisma.Decimal | null;
  normalizedPayload: Prisma.InputJsonValue;
  rowStatus: IngestionRowStatus;
  rowErrors: Prisma.InputJsonValue;
  isMskFlagged: boolean;
  mskReason: string | null;
  createdAt: Date;
};

type MskDetectionResultRow = {
  id: string;
  ingestionRunId: string;
  detectorVersion: string;
  totalProcessed: number;
  mskFound: number;
  flaggedMemberIds: Prisma.InputJsonValue;
  flaggedCaseIds: Prisma.InputJsonValue;
  detectionReasons: Prisma.InputJsonValue;
  createdAt: Date;
};

type WhereInput = { id?: string; idempotencyKey?: string; status?: WorkflowStatus; workflowId?: string };

const workflowRows = new Map<string, WorkflowRow>();
const workflowKeyIndex = new Map<string, string>();
const governanceRows: GovernanceRow[] = [];
const ingestionRunRows = new Map<string, IngestionRunRow>();
const ingestionRunIdIndex = new Map<string, string>();
const ingestionChecksumIndex = new Map<string, string>();
const ingestedClaimRows = new Map<string, IngestedClaimRow>();
const mskDetectionRows = new Map<string, MskDetectionResultRow>();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function buildWorkflowRecordApi() {
  return {
    async findUnique({ where }: { where: WhereInput }) {
      if (where.id) {
        const row = workflowRows.get(where.id);
        return row ? clone(row) : null;
      }

      if (where.idempotencyKey) {
        const workflowId = workflowKeyIndex.get(where.idempotencyKey);
        if (!workflowId) return null;
        const row = workflowRows.get(workflowId);
        return row ? clone(row) : null;
      }

      return null;
    },
    async create({
      data
    }: {
      data: {
        idempotencyKey: string;
        ingestionRunId?: string | null;
        traceId: string;
        status: WorkflowStatus;
        contextData: Prisma.InputJsonValue;
      };
    }) {
      const now = new Date();
      const id = `wf_${workflowRows.size + 1}`;
      const row: WorkflowRow = {
        id,
        idempotencyKey: data.idempotencyKey,
        ingestionRunId: data.ingestionRunId ?? null,
        traceId: data.traceId,
        status: data.status,
        contextData: clone(data.contextData),
        actualCare: null,
        isAdhered: null,
        retryCount: 0,
        completedAt: null,
        createdAt: now,
        updatedAt: now
      };

      workflowRows.set(id, row);
      workflowKeyIndex.set(data.idempotencyKey, id);
      return clone(row);
    },
    async update({ where, data }: { where: { id: string }; data: Omit<Partial<WorkflowRow>, 'retryCount'> & { retryCount?: { increment: number } } }) {
      const row = workflowRows.get(where.id);
      if (!row) {
        throw new Error(`Workflow ${where.id} not found`);
      }

      const retryCountUpdate = data.retryCount as { increment: number } | undefined;
      if (retryCountUpdate) {
        row.retryCount += retryCountUpdate.increment;
      }

      const nextData = { ...data } as Partial<WorkflowRow>;
      delete nextData.retryCount;
      Object.assign(row, nextData, { updatedAt: new Date() });
      workflowRows.set(where.id, row);
      return clone(row);
    },
    async findMany({
      where,
      orderBy,
      take,
      skip
    }: {
      where: { status?: WorkflowStatus; ingestionRunId?: string };
      orderBy?: { createdAt: 'asc' | 'desc' } | Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
      take?: number;
      skip?: number;
    }) {
      const createdAtOrder = Array.isArray(orderBy)
        ? orderBy.find((item) => item.createdAt)?.createdAt ?? 'desc'
        : orderBy?.createdAt ?? 'desc';

      const rows = Array.from(workflowRows.values())
        .filter((row) => !where.status || row.status === where.status)
        .filter((row) => !where.ingestionRunId || row.ingestionRunId === where.ingestionRunId);
      rows.sort((a, b) =>
        createdAtOrder === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime()
      );
      const sliced = rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length));
      return clone(sliced);
    }
  };
}

function buildGovernanceLogApi() {
  return {
    async create({
      data
    }: {
      data: {
        workflowId?: string | null;
        ingestionRunId?: string | null;
        traceId: string;
        step: string;
        fromState: string;
        toState: string;
        actor: string;
        title: string;
        narrative: string;
        message: string;
        routingDecision?: Prisma.InputJsonValue;
        decisionMade?: Prisma.InputJsonValue;
        actionTaken?: Prisma.InputJsonValue;
        adherenceResult?: Prisma.InputJsonValue;
        payloadSnapshot: Prisma.InputJsonValue;
      };
    }) {
      const row: GovernanceRow = {
        id: `gl_${governanceRows.length + 1}`,
        workflowId: data.workflowId ?? null,
        ingestionRunId: data.ingestionRunId ?? null,
        traceId: data.traceId,
        step: data.step,
        fromState: data.fromState,
        toState: data.toState,
        actor: data.actor,
        title: data.title,
        narrative: data.narrative,
        message: data.message,
        routingDecision: data.routingDecision ?? null,
        decisionMade: data.decisionMade ?? null,
        actionTaken: data.actionTaken ?? null,
        adherenceResult: data.adherenceResult ?? null,
        payloadSnapshot: clone(data.payloadSnapshot),
        createdAt: new Date()
      };

      governanceRows.push(row);
      return clone(row);
    },
    async findMany({
      where,
      orderBy
    }: {
      where: { workflowId?: string; ingestionRunId?: string };
      orderBy?: Array<{ createdAt?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
    }) {
      const createdAtOrder = orderBy?.find((item) => item.createdAt)?.createdAt;
      const idOrder = orderBy?.find((item) => item.id)?.id;
      const rows = governanceRows
        .filter((row) => !where.workflowId || row.workflowId === where.workflowId)
        .filter((row) => !where.ingestionRunId || row.ingestionRunId === where.ingestionRunId)
        .sort((a, b) => {
          const createdAtDelta = a.createdAt.getTime() - b.createdAt.getTime();
          if (createdAtDelta !== 0) {
            return createdAtOrder === 'desc' ? -createdAtDelta : createdAtDelta;
          }

          if (idOrder === 'desc') {
            return b.id.localeCompare(a.id);
          }

          return a.id.localeCompare(b.id);
        });
      return clone(rows);
    }
  };
}

function buildIngestionRunApi() {
  return {
    async findUnique({ where }: { where: { runId?: string; employerName_sourceChecksum?: { employerName: string; sourceChecksum: string } } }) {
      if (where.runId) {
        const id = ingestionRunIdIndex.get(where.runId);
        if (!id) return null;
        const row = ingestionRunRows.get(id);
        return row ? clone(row) : null;
      }

      if (where.employerName_sourceChecksum) {
        const key = `${where.employerName_sourceChecksum.employerName}::${where.employerName_sourceChecksum.sourceChecksum}`;
        const id = ingestionChecksumIndex.get(key);
        if (!id) return null;
        const row = ingestionRunRows.get(id);
        return row ? clone(row) : null;
      }

      return null;
    },
    async create({
      data
    }: {
      data: {
        runId: string;
        employerName: string;
        sourceFileName: string;
        sourceFileType: SourceFileType;
        sourceChecksum: string;
        status: IngestionRunStatus;
      };
    }) {
      const now = new Date();
      const id = `ing_${ingestionRunRows.size + 1}`;
      const row: IngestionRunRow = {
        id,
        runId: data.runId,
        employerName: data.employerName,
        sourceFileName: data.sourceFileName,
        sourceFileType: data.sourceFileType,
        sourceChecksum: data.sourceChecksum,
        status: data.status,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        totalMskFlags: 0,
        errorSummary: null,
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now
      };

      ingestionRunRows.set(id, row);
      ingestionRunIdIndex.set(data.runId, id);
      ingestionChecksumIndex.set(`${data.employerName}::${data.sourceChecksum}`, id);
      return clone(row);
    },
    async update({ where, data }: { where: { id: string }; data: Partial<IngestionRunRow> }) {
      const row = ingestionRunRows.get(where.id);
      if (!row) {
        throw new Error(`Ingestion run ${where.id} not found`);
      }

      Object.assign(row, data, { updatedAt: new Date() });
      ingestionRunRows.set(where.id, row);
      return clone(row);
    }
  };
}

function buildIngestedClaimRecordApi() {
  return {
    async create({ data }: { data: Omit<IngestedClaimRow, 'id' | 'createdAt' | 'isMskFlagged' | 'mskReason'> & { isMskFlagged?: boolean; mskReason?: string | null } }) {
      const id = `rec_${ingestedClaimRows.size + 1}`;
      const row: IngestedClaimRow = {
        id,
        ...data,
        isMskFlagged: data.isMskFlagged ?? false,
        mskReason: data.mskReason ?? null,
        createdAt: new Date()
      };

      ingestedClaimRows.set(id, row);
      return clone(row);
    },
    async findMany({
      where,
      orderBy
    }: {
      where: { ingestionRunId: string; rowStatus?: IngestionRowStatus };
      orderBy?: Array<{ rowNumber?: 'asc' | 'desc'; id?: 'asc' | 'desc' }>;
    }) {
      const rowNumberOrder = orderBy?.find((item) => item.rowNumber)?.rowNumber ?? 'asc';
      const idOrder = orderBy?.find((item) => item.id)?.id ?? 'asc';
      const rows = Array.from(ingestedClaimRows.values())
        .filter((row) => row.ingestionRunId === where.ingestionRunId)
        .filter((row) => !where.rowStatus || row.rowStatus === where.rowStatus)
        .sort((a, b) => {
          const rowNumberDelta = a.rowNumber - b.rowNumber;
          if (rowNumberDelta !== 0) {
            return rowNumberOrder === 'desc' ? -rowNumberDelta : rowNumberDelta;
          }

          if (idOrder === 'desc') {
            return b.id.localeCompare(a.id);
          }

          return a.id.localeCompare(b.id);
        });

      return clone(rows);
    },
    async update({ where, data }: { where: { id: string }; data: Partial<IngestedClaimRow> }) {
      const row = ingestedClaimRows.get(where.id);
      if (!row) {
        throw new Error(`Ingested claim record ${where.id} not found`);
      }

      Object.assign(row, data);
      ingestedClaimRows.set(where.id, row);
      return clone(row);
    }
  };
}

function buildMskDetectionResultApi() {
  return {
    async create({ data }: { data: Omit<MskDetectionResultRow, 'id' | 'createdAt'> }) {
      const row: MskDetectionResultRow = {
        id: `det_${mskDetectionRows.size + 1}`,
        ...data,
        createdAt: new Date()
      };

      mskDetectionRows.set(row.id, row);
      return clone(row);
    }
  };
}

const inMemoryPrisma = {
  workflowRecord: buildWorkflowRecordApi(),
  governanceLog: buildGovernanceLogApi(),
  ingestionRun: buildIngestionRunApi(),
  ingestedClaimRecord: buildIngestedClaimRecordApi(),
  mskDetectionResult: buildMskDetectionResultApi(),
  async $transaction<T>(operations: Array<Promise<T>>) {
    return Promise.all(operations);
  }
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | typeof inMemoryPrisma | undefined;
}

export const prisma = globalThis.prisma ?? (process.env.DATABASE_URL ? new PrismaClient() : inMemoryPrisma);

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}