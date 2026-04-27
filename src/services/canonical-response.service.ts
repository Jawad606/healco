type RecordLike = Record<string, unknown>;

export type CanonicalResponse = {
  ids: {
    ingestionRunId: string | null;
    workflowId: string | null;
    traceId: string | null;
  };
  pathway: {
    selectedPathway: string | null;
    confidence: number | null;
    avoidedPath: string | null;
    avoidedReason: string | null;
  };
  decision: {
    plan: string | null;
    expectedCare: string | null;
    rationale: string[];
    alternatives: Array<RecordLike>;
  };
  action: {
    actualCare: string | null;
    isDefaultPath: boolean | null;
    overrideReason: string | null;
  };
  adherence: {
    isAdhered: boolean | null;
    expectedCare: string | null;
    actualCare: string | null;
  };
  status: {
    ingestionStatus: string | null;
    workflowStatus: string | null;
  };
  metrics: {
    totalProcessed: number | null;
    mskFound: number | null;
  };
  timestamps: {
    ingestionStartedAt: Date | null;
    ingestionCompletedAt: Date | null;
    routeAt: Date | null;
    decisionAt: Date | null;
    actionAt: Date | null;
  };
  summary: string;
};

function asRecord(value: unknown): RecordLike | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as RecordLike;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function asDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSummary(input: {
  selectedPathway: string | null;
  decisionPlan: string | null;
  expectedCare: string | null;
  actualCare: string | null;
  workflowStatus: string | null;
  ingestionStatus: string | null;
  mskFound: number | null;
}) {
  const parts: string[] = [];

  if (input.ingestionStatus) {
    parts.push(`Ingestion is ${input.ingestionStatus}.`);
  }

  if (input.mskFound !== null) {
    parts.push(`MSK flagged records: ${input.mskFound}.`);
  }

  if (input.selectedPathway) {
    parts.push(`Selected pathway: ${input.selectedPathway}.`);
  }

  if (input.decisionPlan) {
    parts.push(`Decision: ${input.decisionPlan}.`);
  }

  if (input.expectedCare) {
    parts.push(`Expected care: ${input.expectedCare}.`);
  }

  if (input.actualCare) {
    parts.push(`Actual care: ${input.actualCare}.`);
  }

  if (input.workflowStatus) {
    parts.push(`Workflow is ${input.workflowStatus}.`);
  }

  return parts.join(' ');
}

export function buildCanonicalResponse(input: {
  ingestionRunId?: string | null;
  workflowId?: string | null;
  traceId?: string | null;
  ingestionStatus?: string | null;
  workflowStatus?: string | null;
  totalProcessed?: number | null;
  mskFound?: number | null;
  ingestionStartedAt?: Date | null;
  ingestionCompletedAt?: Date | null;
  routeAt?: Date | null;
  decisionAt?: Date | null;
  actionAt?: Date | null;
  contextData?: unknown;
  workflowActualCare?: string | null;
  workflowIsAdhered?: boolean | null;
}) : CanonicalResponse {
  const context = asRecord(input.contextData) ?? {};
  const pathway = asRecord(context.pathway);
  const decision = asRecord(context.decision);
  const action = asRecord(context.action);
  const rationale = asRecord(decision?.rationale);

  const selectedPathway = asString(pathway?.route);
  const confidence = asNumber(pathway?.confidence);
  const avoidedPath = asString(decision?.avoidedPath);
  const avoidedReason = asString(decision?.avoidedReason);

  const plan = asString(decision?.plan);
  const expectedCare = asString(decision?.expectedCare);
  const rationaleText = asStringArray(rationale?.selectedBecause);
  const alternatives = Array.isArray(decision?.alternatives)
    ? decision?.alternatives.filter((item): item is RecordLike => Boolean(asRecord(item)))
    : [];

  const actualCare = asString(action?.actualCare) ?? input.workflowActualCare ?? null;
  const isDefaultPath = asBoolean(action?.isDefaultPath);
  const overrideReason = asString(action?.overrideReason);

  const isAdhered =
    asBoolean(action?.isAdhered) ??
    input.workflowIsAdhered ??
    (expectedCare && actualCare ? expectedCare === actualCare : null);

  return {
    ids: {
      ingestionRunId: input.ingestionRunId ?? null,
      workflowId: input.workflowId ?? null,
      traceId: input.traceId ?? null
    },
    pathway: {
      selectedPathway,
      confidence,
      avoidedPath,
      avoidedReason
    },
    decision: {
      plan,
      expectedCare,
      rationale: rationaleText,
      alternatives
    },
    action: {
      actualCare,
      isDefaultPath,
      overrideReason
    },
    adherence: {
      isAdhered,
      expectedCare,
      actualCare
    },
    status: {
      ingestionStatus: input.ingestionStatus ?? null,
      workflowStatus: input.workflowStatus ?? null
    },
    metrics: {
      totalProcessed: input.totalProcessed ?? null,
      mskFound: input.mskFound ?? null
    },
    timestamps: {
      ingestionStartedAt: input.ingestionStartedAt ?? null,
      ingestionCompletedAt: input.ingestionCompletedAt ?? null,
      routeAt: asDate(input.routeAt),
      decisionAt: asDate(input.decisionAt),
      actionAt: asDate(input.actionAt)
    },
    summary: buildSummary({
      selectedPathway,
      decisionPlan: plan,
      expectedCare,
      actualCare,
      workflowStatus: input.workflowStatus ?? null,
      ingestionStatus: input.ingestionStatus ?? null,
      mskFound: input.mskFound ?? null
    })
  };
}

export function extractEventTimestamps(logs: Array<{ step: string; createdAt: Date }>) {
  const route = logs.find((log) => log.step === 'ROUTE');
  const decision = logs.find((log) => log.step === 'DECISION');
  const action = logs.find((log) => log.step === 'ACTION');

  return {
    routeAt: route?.createdAt ?? null,
    decisionAt: decision?.createdAt ?? null,
    actionAt: action?.createdAt ?? null
  };
}
