import { Request, Response } from 'express';
import { z } from 'zod';
import * as workflowService from '../services/workflow.service';
import * as governanceService from '../services/governance.service';
import { buildCanonicalResponse, extractEventTimestamps } from '../services/canonical-response.service';

const createSchema = z.object({
  idempotencyKey: z.string().min(1),
  payload: z.object({
    symptom: z.string(),
    painLevel: z.number().min(0).max(10),
    duration: z.string(),
    redFlags: z.boolean(),
    age: z.number().positive(),
    patientId: z.string(),
    failedPtHistory: z.boolean().optional()
  })
});

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function toBooleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function toDateValue(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  return new Date(String(value));
}

function mapWorkflowInput(context: Record<string, unknown>) {
  const input = asRecord(context.input);
  if (!input) {
    return null;
  }

  return {
    symptom: toStringValue(input.symptom) ?? null,
    painLevel: toNumberValue(input.painLevel) ?? toNumberValue(input.pain_level) ?? null,
    duration: toStringValue(input.duration) ?? null,
    redFlags: toBooleanValue(input.redFlags) ?? toBooleanValue(input.red_flags) ?? null,
    age: toNumberValue(input.age) ?? null,
    patientId: toStringValue(input.patientId) ?? toStringValue(input.patient_id) ?? null,
    failedPtHistory:
      toBooleanValue(input.failedPtHistory) ?? toBooleanValue(input.failed_pt_history) ?? null
  };
}

function formatDisplayTime(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
    .format(value)
    .toLowerCase();
}

function formatYesNo(value: boolean | null) {
  if (value === null) {
    return 'unknown';
  }

  return value ? 'yes' : 'no';
}

function formatPainLevel(value: number | null) {
  return value === null ? 'unknown' : `${value}/10`;
}

function getPathwayLabel(route: string | null) {
  if (route === 'MSK') return 'MSK Spine Pathway';
  if (route === 'CARDIO') return 'Cardiology Pathway';
  if (route === 'GENERAL') return 'General Review Pathway';
  return 'Clinical Pathway';
}

function buildTimelineDisplayLine(index: number, label: string, time: Date) {
  return `${index}. [${label}] - ${formatDisplayTime(time)}`;
}

function buildIntakeMessage(input: ReturnType<typeof mapWorkflowInput>) {
  if (!input) {
    return 'Workflow created and queued for routing.';
  }

  return `Patient reported ${input.symptom ?? 'unrecorded symptoms'} (pain level ${formatPainLevel(
    input.painLevel
  )}, red flags: ${formatYesNo(input.redFlags)}). Workflow created and queued for routing.`;
}

function buildRouteMessage(
  input: ReturnType<typeof mapWorkflowInput>,
  pathway: ReturnType<typeof mapPathway>
) {
  const routeLabel = getPathwayLabel(pathway?.route ?? null);
  const symptomText = input?.symptom
    ? `Symptoms matched ${routeLabel} criteria.`
    : 'Symptoms matched pathway criteria.';
  const redFlagText =
    input?.redFlags === false ? 'No red flags detected.' : 'Routing reviewed for red flags.';

  return `${symptomText} ${redFlagText} Patient assigned to ${routeLabel} automatically.`;
}

function buildDecisionMessage(
  input: ReturnType<typeof mapWorkflowInput>,
  decision: ReturnType<typeof mapDecision>
) {
  const selectedBecause = decision?.rationale?.selectedBecause?.join(' ');

  if (decision?.plan === 'PT_FIRST') {
    if (selectedBecause) {
      return `PT-first pathway selected. ${selectedBecause} Telehealth Physical Therapy recommended as first line of care.`;
    }

    return `PT-first pathway selected. Pain score mild (${formatPainLevel(
      input?.painLevel ?? null
    )}), no red flags, no prior failed PT on record. Telehealth Physical Therapy recommended as first line of care.`;
  }

  if (decision?.plan === 'IMAGING_FIRST') {
    if (selectedBecause) {
      return `Imaging-first pathway selected. ${selectedBecause} Imaging referral recommended before conservative management.`;
    }

    return `Imaging-first pathway selected. Pain score elevated (${formatPainLevel(
      input?.painLevel ?? null
    )}), or red flags present. Imaging referral recommended before conservative management.`;
  }

  return `Clinical review pathway selected. Recommended care: ${decision?.expectedCare ?? 'specialist review'}.`;
}

function buildActionMessage(
  workflow: { actualCare: string | null; isAdhered: boolean | null },
  decision: ReturnType<typeof mapDecision>,
  pathway: ReturnType<typeof mapPathway>
) {
  const care = workflow.actualCare ?? decision?.expectedCare ?? 'Care completed';
  const pathwayLabel = getPathwayLabel(pathway?.route ?? null);
  const careSetting = pathwayLabel === 'MSK Spine Pathway' ? 'Telehealth, In-Network' : 'Standard Care';
  const referralTarget =
    decision?.plan === 'PT_FIRST'
      ? 'City PT Clinic'
      : decision?.plan === 'IMAGING_FIRST'
        ? 'Imaging Center'
        : care;
  const adherenceText =
    workflow.isAdhered === true
      ? 'Pathway adhered.'
      : workflow.isAdhered === false
        ? 'Pathway overridden.'
        : 'Pathway adherence unknown.';

  return `Referral created for ${referralTarget} (${careSetting}). Care navigator notified. Workflow completed. No overrides. ${adherenceText}`;
}

function inferLogLabel(fromState: unknown, toState: unknown, title: unknown) {
  const explicitTitle = toStringValue(title);
  if (explicitTitle) {
    return explicitTitle;
  }

  const from = toStringValue(fromState);
  const to = toStringValue(toState);

  if (from === 'ROUTING' && to === 'DECISION_PENDING') return 'Route';
  if (from === 'DECISION_PENDING' && to === 'ACTION_PENDING') return 'Decision';
  if (from === 'ACTION_PENDING' && to === 'COMPLETED') return 'Action';
  if (to === 'FAILED') return 'Failure';
  return 'Event';
}

function mapPathway(context: Record<string, unknown>) {
  const pathway = asRecord(context.pathway) ?? asRecord(context.routingDecision);
  if (!pathway) {
    return null;
  }

  return {
    route: toStringValue(pathway.route) ?? toStringValue(pathway.code) ?? null,
    confidence: toNumberValue(pathway.confidence) ?? null,
    reasoning: toStringValue(pathway.reasoning) ?? null
  };
}

function mapDecision(context: Record<string, unknown>) {
  const decision = asRecord(context.decision);
  if (!decision) {
    return null;
  }

  const rationale = asRecord(decision.rationale);
  const factors = asRecord(rationale?.factors);
  const alternatives = Array.isArray(decision.alternatives)
    ? decision.alternatives
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((alternative, index) => ({
          plan: toStringValue(alternative.plan) ?? null,
          expectedCare: toStringValue(alternative.expectedCare) ?? null,
          ranking: toNumberValue(alternative.ranking) ?? index + 1,
          selected: toBooleanValue(alternative.selected) ?? false,
          notSelectedReason: toStringValue(alternative.notSelectedReason) ?? null
        }))
    : [];

  const comparison = asRecord(decision.comparison);

  return {
    plan: toStringValue(decision.plan) ?? null,
    expectedCare: toStringValue(decision.expectedCare) ?? null,
    avoidedPath: toStringValue(decision.avoidedPath) ?? null,
    avoidedReason: toStringValue(decision.avoidedReason) ?? null,
    rationale: {
      selectedBecause: toStringArray(rationale?.selectedBecause),
      factors: {
        route: toStringValue(factors?.route) ?? null,
        painLevel: toNumberValue(factors?.painLevel) ?? null,
        redFlags: toBooleanValue(factors?.redFlags) ?? null,
        failedPtHistory: toBooleanValue(factors?.failedPtHistory) ?? null
      }
    },
    alternatives,
    comparison: {
      compared: toBooleanValue(comparison?.compared) ?? alternatives.length > 0,
      methodology: toStringValue(comparison?.methodology) ?? 'rules-v1',
      notes:
        toStringValue(comparison?.notes) ??
        'Structured for future alternatives and side-by-side comparison support.'
    }
  };
}

function mapAction(
  context: Record<string, unknown>,
  workflow: { actualCare: string | null; completedAt: Date | null }
) {
  const action = asRecord(context.action);
  const actualCare =
    toStringValue(action?.actualCare) ??
    toStringValue(action?.performedCare) ??
    workflow.actualCare ??
    null;

  if (!action && !actualCare) {
    return null;
  }

  return {
    actualCare,
    isDefaultPath: toBooleanValue(action?.isDefaultPath) ?? null,
    overrideReason: toStringValue(action?.overrideReason) ?? null,
    completedAt: workflow.completedAt
  };
}

function mapAdherence(
  context: Record<string, unknown>,
  workflow: { isAdhered: boolean | null; actualCare: string | null }
) {
  const action = asRecord(context.action);
  const decision = asRecord(context.decision);

  const isAdhered =
    toBooleanValue(action?.isAdhered) ?? toBooleanValue(action?.adhered) ?? workflow.isAdhered ?? null;
  const expectedCare = toStringValue(decision?.expectedCare) ?? null;
  const actualCare = toStringValue(action?.actualCare) ?? workflow.actualCare ?? null;

  if (isAdhered === null && !expectedCare && !actualCare) {
    return null;
  }

  return {
    isAdhered,
    expectedCare,
    actualCare
  };
}

function normalizeWorkflowResponse(
  workflow: {
    id: string;
    ingestionRunId: string | null;
    traceId: string;
    status: string;
    contextData: unknown;
    retryCount: number;
    actualCare: string | null;
    isAdhered: boolean | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }
) {
  const context = asRecord(workflow.contextData) ?? {};
  const canonical = buildCanonicalResponse({
    ingestionRunId: workflow.ingestionRunId,
    workflowId: workflow.id,
    traceId: workflow.traceId,
    ingestionStatus: null,
    workflowStatus: workflow.status,
    totalProcessed: null,
    mskFound: null,
    ingestionStartedAt: null,
    ingestionCompletedAt: null,
    routeAt: null,
    decisionAt: null,
    actionAt: workflow.completedAt,
    contextData: workflow.contextData,
    workflowActualCare: workflow.actualCare,
    workflowIsAdhered: workflow.isAdhered
  });

  return {
    id: workflow.id,
    ingestionRunId: workflow.ingestionRunId,
    traceId: workflow.traceId,
    status: workflow.status,
    input: mapWorkflowInput(context),
    pathway: mapPathway(context),
    decision: mapDecision(context),
    action: mapAction(context, workflow),
    adherence: mapAdherence(context, workflow),
    canonical,
    retryCount: workflow.retryCount,
    timestamps: {
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      completedAt: workflow.completedAt
    }
  };
}

function inferLogStep(log: Record<string, unknown>) {
  const explicitStep = toStringValue(log.step);
  if (explicitStep) {
    return explicitStep;
  }

  const from = toStringValue(log.fromState);
  const to = toStringValue(log.toState);

  if (from === 'ROUTING' && to === 'DECISION_PENDING') return 'ROUTE';
  if (from === 'DECISION_PENDING' && to === 'ACTION_PENDING') return 'DECISION';
  if (from === 'ACTION_PENDING' && to === 'COMPLETED') return 'ACTION';
  if (to === 'FAILED') return 'FAILURE';
  return 'EVENT';
}

function getStepOrder(step: string) {
  if (step === 'ROUTE') return 1;
  if (step === 'DECISION') return 2;
  if (step === 'ACTION') return 3;
  if (step === 'FAILURE') return 4;
  return 5;
}

function sortLogsForTimeline(logs: Array<Record<string, unknown>>) {
  return [...logs].sort((left, right) => {
    const leftTime = toDateValue(left.createdAt).getTime();
    const rightTime = toDateValue(right.createdAt).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const leftStep = inferLogStep(left);
    const rightStep = inferLogStep(right);
    const leftStepRank = getStepOrder(leftStep);
    const rightStepRank = getStepOrder(rightStep);
    if (leftStepRank !== rightStepRank) {
      return leftStepRank - rightStepRank;
    }

    const leftId = toStringValue(left.id) ?? '';
    const rightId = toStringValue(right.id) ?? '';
    return leftId.localeCompare(rightId);
  });
}

function parseIncludeQuery(value: unknown) {
  if (typeof value !== 'string') {
    return { hasIncludeQuery: false, includes: new Set<string>() };
  }

  const includes = new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );

  return { hasIncludeQuery: true, includes };
}

function normalizeWorkflowLogsResponse(result: {
  summary: string;
  logs: Array<Record<string, unknown>>;
  workflow: {
    createdAt: Date;
    contextData: unknown;
    actualCare: string | null;
    isAdhered: boolean | null;
    completedAt: Date | null;
  };
}) {
  const orderedLogs = sortLogsForTimeline(result.logs);
  const workflowContext = asRecord(result.workflow.contextData) ?? {};
  const input = mapWorkflowInput(workflowContext);
  const pathway = mapPathway(workflowContext);
  const decision = mapDecision(workflowContext);
  const action = mapAction(workflowContext, {
    actualCare: result.workflow.actualCare,
    completedAt: result.workflow.completedAt
  });
  const adherence = mapAdherence(workflowContext, {
    isAdhered: result.workflow.isAdhered,
    actualCare: result.workflow.actualCare
  });

  const timeline = [
    {
      index: 1,
      label: 'Intake',
      at: result.workflow.createdAt,
      displayLine: buildTimelineDisplayLine(1, 'Intake', result.workflow.createdAt),
      message: buildIntakeMessage(input),
      step: 'INTAKE',
      transition: 'CREATED -> QUEUED',
      actor: 'system',
      pathway,
      decision: null,
      action: null,
      adherence: null
    },
    ...orderedLogs.map((log, offset) => {
      const snapshot = asRecord(log.payloadSnapshot) ?? {};
      const label = inferLogLabel(log.fromState, log.toState, log.title);
      const step = inferLogStep(log);
      const index = offset + 2;
      const createdAt = toDateValue(log.createdAt);

      const storedRoutingDecision = asRecord(log.routingDecision);
      const storedDecision = asRecord(log.decisionMade);
      const storedAction = asRecord(log.actionTaken);
      const storedAdherence = asRecord(log.adherenceResult);

      const snapshotInput = mapWorkflowInput(snapshot) ?? input;
      const snapshotPathway =
        (storedRoutingDecision ? mapPathway({ pathway: storedRoutingDecision }) : null) ??
        mapPathway(snapshot) ??
        pathway;
      const snapshotDecision =
        (storedDecision ? mapDecision({ decision: storedDecision }) : null) ??
        mapDecision(snapshot) ??
        decision;
      const snapshotAction =
        (storedAction
          ? mapAction(
              { action: storedAction },
              {
                actualCare: result.workflow.actualCare,
                completedAt: step === 'ACTION' ? result.workflow.completedAt : null
              }
            )
          : null) ??
        mapAction(snapshot, {
          actualCare: step === 'ACTION' ? result.workflow.actualCare : null,
          completedAt: step === 'ACTION' ? result.workflow.completedAt : null
        }) ??
        null;
      const snapshotAdherence =
        (storedAdherence
          ? {
              isAdhered: toBooleanValue(storedAdherence.isAdhered) ?? null,
              expectedCare: toStringValue(storedAdherence.expectedCare) ?? null,
              actualCare: toStringValue(storedAdherence.actualCare) ?? null
            }
          : null) ??
        mapAdherence(snapshot, {
          isAdhered: step === 'ACTION' ? result.workflow.isAdhered : null,
          actualCare: step === 'ACTION' ? result.workflow.actualCare : null
        }) ??
        null;

      const timelineDecision = step === 'DECISION' || step === 'ACTION' ? snapshotDecision : null;
      const timelineAction = step === 'ACTION' ? snapshotAction : null;
      const timelineAdherence = step === 'ACTION' ? snapshotAdherence : null;

      const fallbackMessage =
        step === 'ROUTE'
          ? buildRouteMessage(snapshotInput, snapshotPathway)
          : step === 'DECISION'
            ? buildDecisionMessage(snapshotInput, snapshotDecision)
            : step === 'ACTION'
              ? buildActionMessage(
                  {
                    actualCare: result.workflow.actualCare,
                    isAdhered: result.workflow.isAdhered
                  },
                  snapshotDecision,
                  snapshotPathway
                )
              : toStringValue(log.narrative) ?? 'Workflow event recorded.';

      return {
        index,
        label,
        at: createdAt,
        displayLine: buildTimelineDisplayLine(index, label, createdAt),
        message: toStringValue(log.message) ?? fallbackMessage,
        step,
        transition: `${String(log.fromState)} -> ${String(log.toState)}`,
        actor: toStringValue(log.actor) ?? 'system',
        pathway: snapshotPathway,
        decision: timelineDecision,
        action: timelineAction,
        adherence: timelineAdherence
      };
    })
  ];

  // logs is a compact projection of timeline and must stay index/order aligned.
  const logs = timeline.map((entry) => ({
    index: entry.index,
    at: entry.at,
    step: entry.step,
    transition: entry.transition,
    actor: entry.actor,
    message: entry.message,
    route: entry.pathway?.route ?? null,
    plan: entry.decision?.plan ?? null,
    actualCare: entry.action?.actualCare ?? null,
    isAdhered: entry.adherence?.isAdhered ?? null
  }));

  const rawLogs = orderedLogs.map((log) => {
    const snapshot = asRecord(log.payloadSnapshot) ?? {};

    return {
      id: log.id,
      workflowId: log.workflowId,
      traceId: log.traceId,
      step: toStringValue(log.step) ?? inferLogStep(log),
      title: toStringValue(log.title) ?? inferLogLabel(log.fromState, log.toState, log.title),
      fromState: log.fromState,
      toState: log.toState,
      actor: log.actor,
      narrative: log.narrative,
      message: toStringValue(log.message) ?? null,
      payloadSnapshot: log.payloadSnapshot,
      routingDecision: asRecord(log.routingDecision) ?? null,
      decisionMade: asRecord(log.decisionMade) ?? null,
      actionTaken: asRecord(log.actionTaken) ?? null,
      adherenceResult: asRecord(log.adherenceResult) ?? null,
      pathway: mapPathway(snapshot),
      decision: mapDecision(snapshot),
      createdAt: log.createdAt
    };
  });

  return {
    summary: result.summary,
    timeline,
    logs,
    rawLogs,
    sections: {
      timeline: {
        role: 'primary-rich',
        description: 'Human-readable, detailed timeline for UI and audit playback.'
      },
      logs: {
        role: 'compact-aligned',
        description: 'Compact projection of timeline for table/list rendering.',
        alignment: {
          with: 'timeline',
          guaranteed: true,
          fields: ['index', 'step', 'transition', 'actor', 'message']
        }
      },
      rawLogs: {
        role: 'audit-debug',
        description: 'Raw transition records with payload snapshots for diagnostics.'
      },
      overview: {
        role: 'final-state',
        description: 'Final aggregate snapshot of input, pathway, decision, action, and adherence.'
      }
    },
    overview: {
      input,
      pathway,
      decision,
      action,
      adherence
    }
  };
}

export async function createWorkflow(req: Request, res: Response) {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const workflow = await workflowService.startWorkflow(parsed.data);
  return res.status(202).json({ workflowId: workflow.id, status: workflow.status });
}

export async function getWorkflow(req: Request, res: Response) {
  const workflow = await workflowService.getWorkflowById(String(req.params.id));
  if (!workflow) return res.status(404).json({ error: 'not found' });
  return res.json(normalizeWorkflowResponse(workflow));
}

export async function getWorkflowLogs(req: Request, res: Response) {
  const workflow = await workflowService.getWorkflowById(String(req.params.id));
  if (!workflow) return res.status(404).json({ error: 'not found' });

  const includeQuery = parseIncludeQuery(req.query.include);
  const includeRaw = includeQuery.includes.has('raw');

  const result = await governanceService.getLogsWithSummary(String(req.params.id));
  const normalized = normalizeWorkflowLogsResponse({
    ...result,
    workflow: {
      createdAt: workflow.createdAt,
      contextData: workflow.contextData,
      actualCare: workflow.actualCare,
      isAdhered: workflow.isAdhered,
      completedAt: workflow.completedAt
    }
  });

  const { rawLogs, ...baseResponse } = normalized;
  const stepTimes = extractEventTimestamps(
    result.logs.map((log) => ({ step: String(log.step), createdAt: toDateValue(log.createdAt) }))
  );
  const canonical = buildCanonicalResponse({
    ingestionRunId: workflow.ingestionRunId,
    workflowId: workflow.id,
    traceId: workflow.traceId,
    ingestionStatus: null,
    workflowStatus: workflow.status,
    totalProcessed: null,
    mskFound: null,
    ingestionStartedAt: null,
    ingestionCompletedAt: null,
    routeAt: stepTimes.routeAt,
    decisionAt: stepTimes.decisionAt,
    actionAt: stepTimes.actionAt,
    contextData: workflow.contextData,
    workflowActualCare: workflow.actualCare,
    workflowIsAdhered: workflow.isAdhered
  });

  return res.json({
    workflowId: String(req.params.id),
    ...baseResponse,
    canonical,
    ...(includeRaw ? { rawLogs } : {}),
    responseMeta: {
      includeQuery: req.query.include ?? null,
      rawLogs: {
        included: includeRaw,
        query: 'include=raw',
        note: 'rawLogs are excluded by default and returned only when include=raw is requested.'
      }
    }
  });
}

export async function listWorkflows(req: Request, res: Response) {
  const { status = 'COMPLETED', limit = '20', offset = '0' } = req.query;
  const workflows = await workflowService.listWorkflows(
    String(status),
    Number.parseInt(String(limit), 10),
    Number.parseInt(String(offset), 10)
  );
  return res.json(workflows.map((workflow) => normalizeWorkflowResponse(workflow)));
}
