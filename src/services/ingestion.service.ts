import crypto from 'crypto';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { IngestionRepository, IngestionRecordCreateInput } from '../repositories/ingestion.repository';
import { GovernanceRepository } from '../repositories/governance.repository';
import { startWorkflow } from './workflow.service';
import { logTransition } from './governance.service';
import { buildCanonicalResponse, extractEventTimestamps } from './canonical-response.service';
import { validateIngestionConsistency } from './consistency-validator.service';
import { prisma } from '../core/db';

const repo = new IngestionRepository();
const governanceRepo = new GovernanceRepository();

const LEGACY_REQUIRED_HEADERS = [
  'claim_id',
  'employer_id',
  'member_id',
  'date_of_service',
  'cpt_code',
  'icd10_code',
  'place_of_service',
  'provider_type',
  'billed_amount',
  'allowed_amount',
  'paid_amount',
  'claim_source'
] as const;

const EMPLOYER_PACKET_REQUIRED_HEADERS = [
  'claim_id',
  'member_id',
  'date_of_service',
  'procedure_code',
  'diagnosis_code',
  'allowed_amount',
  'plan_paid'
] as const;

type InputSchema = 'LEGACY_CLAIMS' | 'EMPLOYER_PACKET';

type CsvRow = Record<string, string>;

type NormalizedRow = {
  claimId: string | null;
  memberId: string | null;
  caseId: string | null;
  diagnosisCode: string | null;
  procedureCode: string | null;
  utilizationType: string | null;
  serviceDate: Date | null;
  billedAmount: number | null;
  paidAmount: number | null;
  normalizedPayload: Record<string, unknown>;
  rowStatus: 'VALID' | 'INVALID';
  rowErrors: string[];
};

type DetectionOutcome = {
  isMskFlagged: boolean;
  reason: string | null;
};

function inferSourceFileType(fileName: string, mimeType: string): 'CSV' | 'XML' | null {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.csv' || mimeType.includes('csv')) return 'CSV';
  if (ext === '.xml' || mimeType.includes('xml')) return 'XML';
  return null;
}

function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseServiceDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function hasAllHeaders(headers: string[], requiredHeaders: readonly string[]) {
  return requiredHeaders.every((header) => headers.includes(header));
}

function resolveInputSchema(headers: string[]): InputSchema | null {
  if (hasAllHeaders(headers, LEGACY_REQUIRED_HEADERS)) {
    return 'LEGACY_CLAIMS';
  }

  if (hasAllHeaders(headers, EMPLOYER_PACKET_REQUIRED_HEADERS)) {
    return 'EMPLOYER_PACKET';
  }

  return null;
}

function validateHeaders(headers: string[], schema: InputSchema): string[] {
  const requiredHeaders = schema === 'LEGACY_CLAIMS' ? LEGACY_REQUIRED_HEADERS : EMPLOYER_PACKET_REQUIRED_HEADERS;
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  return missing.map((header) => `Missing required header: ${header}`);
}

function detectMsk(row: {
  diagnosisCode: string | null;
  procedureCode: string | null;
  utilizationType: string | null;
}): DetectionOutcome {
  const diagnosis = (row.diagnosisCode ?? '').toUpperCase();
  const procedure = (row.procedureCode ?? '').toUpperCase();
  const utilization = (row.utilizationType ?? '').toLowerCase();

  if (diagnosis.startsWith('M')) {
    return { isMskFlagged: true, reason: `Diagnosis code ${diagnosis} mapped to MSK v1` };
  }

  if (procedure.startsWith('97') || procedure === '97110' || procedure === '97140') {
    return { isMskFlagged: true, reason: `Procedure code ${procedure} mapped to MSK rehab patterns` };
  }

  if (utilization.includes('ortho') || utilization.includes('physical') || utilization.includes('chiro')) {
    return {
      isMskFlagged: true,
      reason: `Provider/utilization '${row.utilizationType ?? ''}' mapped to MSK provider cues`
    };
  }

  return { isMskFlagged: false, reason: null };
}

function normalizeLegacyRow(row: CsvRow): NormalizedRow {
  const rowErrors: string[] = [];

  const claimId = row.claim_id?.trim() || null;
  const memberId = row.member_id?.trim() || null;
  const serviceDate = parseServiceDate(row.date_of_service);
  const billedAmount = parseAmount(row.billed_amount);
  const paidAmount = parseAmount(row.paid_amount);

  if (!claimId) {
    rowErrors.push('claim_id is required');
  }

  if (!memberId) {
    rowErrors.push('member_id is required');
  }

  if (!serviceDate) {
    rowErrors.push('date_of_service is invalid');
  }

  if (billedAmount === null) {
    rowErrors.push('billed_amount is invalid');
  }

  if (paidAmount === null) {
    rowErrors.push('paid_amount is invalid');
  }

  return {
    claimId,
    memberId,
    caseId: row.claim_id?.trim() || null,
    diagnosisCode: row.icd10_code?.trim() || null,
    procedureCode: row.cpt_code?.trim() || null,
    utilizationType: row.provider_type?.trim() || null,
    serviceDate,
    billedAmount,
    paidAmount,
    normalizedPayload: row,
    rowStatus: rowErrors.length ? 'INVALID' : 'VALID',
    rowErrors
  };
}

function normalizeEmployerPacketRow(row: CsvRow, employerName: string, fileName: string): NormalizedRow {
  const rowErrors: string[] = [];

  const claimId = row.claim_id?.trim() || null;
  const memberId = row.member_id?.trim() || null;
  const serviceDate = parseServiceDate(row.date_of_service);
  const billedAmount = parseAmount(row.allowed_amount);
  const paidAmount = parseAmount(row.plan_paid);

  if (!claimId) {
    rowErrors.push('claim_id is required');
  }

  if (!memberId) {
    rowErrors.push('member_id is required');
  }

  if (!serviceDate) {
    rowErrors.push('date_of_service is invalid');
  }

  if (billedAmount === null) {
    rowErrors.push('allowed_amount is invalid');
  }

  if (paidAmount === null) {
    rowErrors.push('plan_paid is invalid');
  }

  return {
    claimId,
    memberId,
    caseId: row.claim_id?.trim() || null,
    diagnosisCode: row.diagnosis_code?.trim() || null,
    procedureCode: row.procedure_code?.trim() || null,
    utilizationType: row.site_of_care?.trim() || row.procedure_category?.trim() || row.provider_name?.trim() || null,
    serviceDate,
    billedAmount,
    paidAmount,
    normalizedPayload: {
      ...row,
      employer_id: employerName,
      source_file: row.source_file?.trim() || fileName,
      claim_source: row.source_file?.trim() || fileName,
      provider_type: row.site_of_care?.trim() || row.procedure_category?.trim() || row.provider_name?.trim() || null,
      cpt_code: row.procedure_code?.trim() || null,
      icd10_code: row.diagnosis_code?.trim() || null,
      billed_amount: row.allowed_amount?.trim() || null,
      paid_amount: row.plan_paid?.trim() || null
    },
    rowStatus: rowErrors.length ? 'INVALID' : 'VALID',
    rowErrors
  };
}

function mapWorkflowPayloadFromRecord(record: {
  memberId: string | null;
  diagnosisCode: string | null;
  mskReason: string | null;
}) {
  const diagnosis = (record.diagnosisCode ?? '').toUpperCase();
  const symptom = diagnosis.startsWith('M54') ? 'lower back pain' : 'musculoskeletal pain';

  return {
    symptom,
    painLevel: 4,
    duration: 'unknown',
    redFlags: false,
    age: 35,
    patientId: record.memberId ?? 'unknown_member',
    failedPtHistory: false
  };
}

function buildRunId() {
  return `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function ingestEmployerFile(input: {
  employerName: string;
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
}) {
  const sourceFileType = inferSourceFileType(input.fileName, input.mimeType);
  if (!sourceFileType) {
    return {
      ok: false as const,
      status: 400,
      code: 'UNSUPPORTED_FILE_TYPE',
      message: 'Only CSV and XML uploads are supported.'
    };
  }

  if (sourceFileType === 'XML') {
    return {
      ok: false as const,
      status: 400,
      code: 'XML_NOT_IMPLEMENTED',
      message: 'XML parser adapter is not yet implemented in this wave. Use CSV for now.'
    };
  }

  const sourceChecksum = crypto.createHash('sha256').update(input.fileBuffer).digest('hex');
  const existingRun = await repo.findRunByChecksum(input.employerName, sourceChecksum);
  if (existingRun) {
    return {
      ok: true as const,
      status: 200,
      reused: true,
      runId: existingRun.runId,
      ingestionStatus: existingRun.status,
      totals: {
        totalRows: existingRun.totalRows,
        validRows: existingRun.validRows,
        invalidRows: existingRun.invalidRows,
        mskFound: existingRun.totalMskFlags
      }
    };
  }

  const run = await repo.createRun({
    runId: buildRunId(),
    employerName: input.employerName,
    sourceFileName: input.fileName,
    sourceFileType,
    sourceChecksum
  });

  await logTransition({
    ingestionRunId: run.id,
    traceId: run.runId,
    step: 'FILE_INGESTED',
    fromState: 'NONE',
    toState: 'RECEIVED',
    actor: 'ingestion-service',
    title: 'File Ingested',
    narrative: `File ${input.fileName} received from employer ${input.employerName}.`,
    payloadSnapshot: { fileName: input.fileName, employerName: input.employerName, sourceFileType, sourceChecksum }
  });

  if (!input.fileBuffer.length) {
    await repo.updateRun(run.id, {
      status: 'FAILED',
      errorSummary: 'Uploaded file is empty.',
      completedAt: new Date()
    });

    return {
      ok: false as const,
      status: 400,
      code: 'INVALID_FILE',
      runId: run.runId,
      message: 'Uploaded file is empty.'
    };
  }

  try {
    const csvRecords = parse(input.fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true
    }) as CsvRow[];

    if (!csvRecords.length) {
      await repo.updateRun(run.id, {
        status: 'FAILED',
        errorSummary: 'No rows found in uploaded CSV.',
        completedAt: new Date()
      });

      return {
        ok: false as const,
        status: 400,
        code: 'INVALID_FILE',
        runId: run.runId,
        message: 'No rows found in uploaded CSV.'
      };
    }

    const headers = Object.keys(csvRecords[0]);
    const schema = resolveInputSchema(headers);
    if (!schema) {
      const legacyErrors = LEGACY_REQUIRED_HEADERS.filter((header) => !headers.includes(header)).map(
        (header) => `Missing required header: ${header}`
      );
      const employerPacketErrors = EMPLOYER_PACKET_REQUIRED_HEADERS.filter((header) => !headers.includes(header)).map(
        (header) => `Missing required header: ${header}`
      );
      const headerErrors = [...legacyErrors, ...employerPacketErrors];
      await repo.updateRun(run.id, {
        status: 'FAILED',
        errorSummary: headerErrors.join('; '),
        completedAt: new Date()
      });

      return {
        ok: false as const,
        status: 400,
        code: 'HEADER_VALIDATION_FAILED',
        runId: run.runId,
        message: 'CSV header validation failed.',
        failures: headerErrors.map((reason) => ({ rowNumber: 0, reason }))
      };
    }

    const headerErrors = validateHeaders(headers, schema);
    if (headerErrors.length > 0) {
      await repo.updateRun(run.id, {
        status: 'FAILED',
        errorSummary: headerErrors.join('; '),
        completedAt: new Date()
      });

      return {
        ok: false as const,
        status: 400,
        code: 'HEADER_VALIDATION_FAILED',
        runId: run.runId,
        message: 'CSV header validation failed.',
        failures: headerErrors.map((reason) => ({ rowNumber: 0, reason }))
      };
    }

    const records: IngestionRecordCreateInput[] = csvRecords.map((row, index) => {
      const rowNumber = index + 2;
      const normalizedRow =
        schema === 'LEGACY_CLAIMS'
          ? normalizeLegacyRow(row)
          : normalizeEmployerPacketRow(row, input.employerName, input.fileName);

      return {
        ingestionRunId: run.id,
        rowNumber,
        memberId: normalizedRow.memberId,
        claimId: normalizedRow.claimId,
        caseId: normalizedRow.caseId,
        diagnosisCode: normalizedRow.diagnosisCode,
        procedureCode: normalizedRow.procedureCode,
        utilizationType: normalizedRow.utilizationType,
        serviceDate: normalizedRow.serviceDate,
        billedAmount: normalizedRow.billedAmount,
        paidAmount: normalizedRow.paidAmount,
        normalizedPayload: normalizedRow.normalizedPayload,
        rowStatus: normalizedRow.rowStatus,
        rowErrors: normalizedRow.rowErrors
      };
    });

    const { persistedRecords, validRecords, invalidRecords, mskFound } = await (prisma as any).$transaction(async (tx: any) => {
      const pRecords = await repo.createRecords(records, tx);

      const vRecords = pRecords.filter((record) => record.rowStatus === 'VALID');
      const iRecords = pRecords.filter((record) => record.rowStatus === 'INVALID');

      await repo.updateRun(run.id, {
        status: 'PARSED',
        totalRows: pRecords.length,
        validRows: vRecords.length,
        invalidRows: iRecords.length
      }, tx);

      await logTransition({
        ingestionRunId: run.id,
        traceId: run.runId,
        step: 'RECORDS_PARSED',
        fromState: 'RECEIVED',
        toState: 'PARSED',
        actor: 'ingestion-service',
        title: 'Records Parsed',
        narrative: `${pRecords.length} rows parsed (${vRecords.length} valid, ${iRecords.length} invalid).`,
        payloadSnapshot: { totalRows: pRecords.length, validRows: vRecords.length, invalidRows: iRecords.length }
      }, tx);

      const detectionReasons = new Set<string>();
      const flaggedMemberIds = new Set<string>();
      const flaggedCaseIds = new Set<string>();

      for (const record of vRecords) {
        const detection = detectMsk({
          diagnosisCode: record.diagnosisCode,
          procedureCode: record.procedureCode,
          utilizationType: record.utilizationType
        });

        if (detection.isMskFlagged) {
          if (record.memberId) flaggedMemberIds.add(record.memberId);
          if (record.caseId) flaggedCaseIds.add(record.caseId);
          if (detection.reason) detectionReasons.add(detection.reason);
        }

        await repo.markRecordMsk(record.id, detection.isMskFlagged, detection.reason, tx);
      }

      const mskCount = flaggedCaseIds.size;

      await repo.createDetectionResult({
        ingestionRunId: run.id,
        detectorVersion: 'msk-detector-v1',
        totalProcessed: vRecords.length,
        mskFound: mskCount,
        flaggedMemberIds: Array.from(flaggedMemberIds),
        flaggedCaseIds: Array.from(flaggedCaseIds),
        detectionReasons: Array.from(detectionReasons)
      }, tx);

      await repo.updateRun(run.id, {
        status: 'DETECTED',
        totalMskFlags: mskCount
      }, tx);

      await logTransition({
        ingestionRunId: run.id,
        traceId: run.runId,
        step: 'MSK_DETECTED',
        fromState: 'PARSED',
        toState: 'DETECTED',
        actor: 'msk-detector-v1',
        title: 'MSK Detection Complete',
        narrative: `${mskCount} MSK-flagged records detected from ${vRecords.length} valid records.`,
        payloadSnapshot: {
          totalProcessed: vRecords.length,
          mskFound: mskCount,
          flaggedMemberIds: Array.from(flaggedMemberIds),
          flaggedCaseIds: Array.from(flaggedCaseIds),
          detectionReasons: Array.from(detectionReasons)
        }
      }, tx);

      return { persistedRecords: pRecords, validRecords: vRecords, invalidRecords: iRecords, mskFound: mskCount };
    });

    const flaggedRecords = (await repo.listValidRecords(run.id)).filter((record) => record.isMskFlagged);
    const startedWorkflowIds: string[] = [];

    for (const record of flaggedRecords) {
      const workflow = await startWorkflow({
        idempotencyKey: `ingestion:${run.runId}:row:${record.rowNumber}`,
        payload: mapWorkflowPayloadFromRecord(record),
        ingestionRunId: run.id
      });
      startedWorkflowIds.push(workflow.id);
    }

    await repo.updateRun(run.id, {
      status: 'COMPLETED',
      completedAt: new Date()
    });

    return {
      ok: true as const,
      status: 202,
      reused: false,
      runId: run.runId,
      ingestionStatus: 'COMPLETED',
      totals: {
        totalRows: persistedRecords.length,
        validRows: validRecords.length,
        invalidRows: invalidRecords.length,
        mskFound
      },
      workflows: startedWorkflowIds,
      failures: invalidRecords.flatMap((record: (typeof invalidRecords)[number]) =>
        Array.isArray(record.rowErrors)
          ? (record.rowErrors as unknown[])
              .filter((item): item is string => typeof item === 'string')
              .map((reason) => ({ rowNumber: record.rowNumber, reason }))
          : []
      )
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse uploaded file.';

    await repo.updateRun(run.id, {
      status: 'FAILED',
      errorSummary: errorMessage,
      completedAt: new Date()
    });

    return {
      ok: false as const,
      status: 400,
      code: 'PARSE_FAILED',
      runId: run.runId,
      message: errorMessage
    };
  }
}

export async function getIngestionRun(runId: string) {
  const run = await repo.findRunByRunId(runId);
  if (!run) {
    return null;
  }

  const records = await repo.listRecordsByRunId(run.id);
  const workflows = await repo.listWorkflowsByIngestionRunId(run.id);
  const logs = await governanceRepo.findByIngestionRunId(run.id);

  const terminalWorkflowCount = workflows.filter(
    (workflow) => workflow.status === 'COMPLETED' || workflow.status === 'FAILED'
  ).length;
  const consistency = validateIngestionConsistency({ run, workflows, logs });
  const latestWorkflow = workflows[workflows.length - 1] ?? null;
  const stepTimes = extractEventTimestamps(
    logs
      .filter((log) => log.workflowId === latestWorkflow?.id || !log.workflowId)
      .map((log) => ({ step: log.step, createdAt: log.createdAt }))
  );
  const canonical = buildCanonicalResponse({
    ingestionRunId: run.runId,
    workflowId: latestWorkflow?.id ?? null,
    traceId: latestWorkflow?.traceId ?? run.runId,
    ingestionStatus: run.status,
    workflowStatus: latestWorkflow?.status ?? null,
    totalProcessed: run.validRows,
    mskFound: run.totalMskFlags,
    ingestionStartedAt: run.startedAt,
    ingestionCompletedAt: run.completedAt,
    routeAt: stepTimes.routeAt,
    decisionAt: stepTimes.decisionAt,
    actionAt: stepTimes.actionAt,
    contextData: latestWorkflow?.contextData,
    workflowActualCare: latestWorkflow?.actualCare ?? null,
    workflowIsAdhered: latestWorkflow?.isAdhered ?? null
  });

  return {
    id: run.id,
    ingestionRunId: run.runId,
    employerName: run.employerName,
    sourceFileName: run.sourceFileName,
    status: run.status,
    totals: {
      totalRows: run.totalRows,
      validRows: run.validRows,
      invalidRows: run.invalidRows,
      mskFound: run.totalMskFlags
    },
    timestamps: {
      ingestionStartedAt: run.startedAt,
      ingestionCompletedAt: run.completedAt,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt
    },
    workflows: workflows.map((workflow) => ({
      workflowId: workflow.id,
      traceId: workflow.traceId,
      status: workflow.status,
      completedAt: workflow.completedAt,
      createdAt: workflow.createdAt
    })),
    canonical,
    consistency: {
      valid: consistency.valid,
      idsLinked: consistency.checks.idsLinked,
      workflowCountMatchesMsk: consistency.checks.workflowCountMatchesMsk,
      logsLinked: consistency.checks.logsLinked,
      timelineMonotonic: consistency.checks.timelineMonotonic,
      decisionActionAligned: consistency.checks.decisionActionAligned,
      runStateCoherent: consistency.checks.runStateCoherent,
      terminalWorkflowCount,
      totalWorkflowCount: workflows.length,
      pendingWorkflowCount: workflows.length - terminalWorkflowCount,
      errors: consistency.errors
    },
    failures: records
      .filter((record) => record.rowStatus === 'INVALID')
      .flatMap((record) =>
        Array.isArray(record.rowErrors)
          ? (record.rowErrors as unknown[])
              .filter((item): item is string => typeof item === 'string')
              .map((reason) => ({ rowNumber: record.rowNumber, reason }))
          : []
      )
  };
}

export async function listIngestionRuns(filters: {
  status?: string;
  limit: number;
  offset: number;
}) {
  return repo.listRuns(filters);
}
