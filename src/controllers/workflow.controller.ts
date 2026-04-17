import { Request, Response } from 'express';
import { z } from 'zod';
import * as workflowService from '../services/workflow.service';
import * as governanceService from '../services/governance.service';

const createSchema = z.object({
  idempotencyKey: z.string().min(1),
  payload: z.object({
    symptom: z.string(),
    pain_level: z.number().min(0).max(10),
    duration: z.string(),
    red_flags: z.boolean(),
    age: z.number().positive(),
    patient_id: z.string(),
    failed_pt_history: z.boolean().optional()
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
    painLevel: toNumberValue(input.pain_level) ?? null,
    duration: toStringValue(input.duration) ?? null,
    redFlags: toBooleanValue(input.red_flags) ?? null,
    age: toNumberValue(input.age) ?? null,
    patientId: toStringValue(input.patient_id) ?? null,
    failedPtHistory: toBooleanValue(input.failed_pt_history) ?? null
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
  const symptomText = input?.symptom ? `Symptoms matched ${routeLabel} criteria.` : 'Symptoms matched pathway criteria.';
  const redFlagText = input?.redFlags === false ? 'No red flags detected.' : 'Routing reviewed for red flags.';

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

function inferLogLabel(fromState: unknown, toState: unknown) {
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

  return {
    id: workflow.id,
    traceId: workflow.traceId,
    status: workflow.status,
    input: mapWorkflowInput(context),
    pathway: mapPathway(context),
    decision: mapDecision(context),
    action: mapAction(context, workflow),
    adherence: mapAdherence(context, workflow),
    retryCount: workflow.retryCount,
    timestamps: {
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      completedAt: workflow.completedAt
    }
  };
}

function inferLogStep(fromState: unknown, toState: unknown) {
  const from = toStringValue(fromState);
  const to = toStringValue(toState);

  if (from === 'ROUTING' && to === 'DECISION_PENDING') return 'ROUTE';
  if (from === 'DECISION_PENDING' && to === 'ACTION_PENDING') return 'DECISION';
  if (from === 'ACTION_PENDING' && to === 'COMPLETED') return 'ACTION';
  if (to === 'FAILED') return 'FAILURE';
  return 'EVENT';
}

function normalizeWorkflowLogsResponse(result: {
  summary: string;
  logs: Array<Record<string, unknown>>;
  workflow: {
    createdAt: Date;
    contextData: unknown;
    actualCare: string | null;
    isAdhered: boolean | null;
  };
}) {
  const workflowContext = asRecord(result.workflow.contextData) ?? {};
  const input = mapWorkflowInput(workflowContext);
  const pathway = mapPathway(workflowContext);
  const decision = mapDecision(workflowContext);
  const action = mapAction(workflowContext, {
    actualCare: result.workflow.actualCare,
    completedAt: null
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
    ...result.logs.map((log, offset) => {
      const snapshot = asRecord(log.payloadSnapshot) ?? {};
      const label = inferLogLabel(log.fromState, log.toState);
      const step = inferLogStep(log.fromState, log.toState);
      const index = offset + 2;
      const createdAt = toDateValue(log.createdAt);
      const snapshotInput = mapWorkflowInput(snapshot) ?? input;
      const snapshotPathway = mapPathway(snapshot) ?? pathway;
      const snapshotDecision = mapDecision(snapshot) ?? decision;
      const snapshotAction = mapAction(snapshot, {
        actualCare: result.workflow.actualCare,
        completedAt: null
      });
      const snapshotAdherence = mapAdherence(snapshot, {
        isAdhered: result.workflow.isAdhered,
        actualCare: result.workflow.actualCare
      });

      return {
        index,
        label,
        at: createdAt,
        displayLine: buildTimelineDisplayLine(index, label, createdAt),
        message:
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
                : log.narrative,
        step,
        transition: `${String(log.fromState)} -> ${String(log.toState)}`,
        actor: log.actor,
        pathway: snapshotPathway,
        decision: snapshotDecision,
        action: snapshotAction,
        adherence: snapshotAdherence
      };
    })
  ];

  const rawLogs = result.logs.map((log) => {
    const snapshot = asRecord(log.payloadSnapshot) ?? {};

    return {
      id: log.id,
      workflowId: log.workflowId,
      traceId: log.traceId,
      fromState: log.fromState,
      toState: log.toState,
      actor: log.actor,
      narrative: log.narrative,
      payloadSnapshot: log.payloadSnapshot,
      pathway: mapPathway(snapshot),
      decision: mapDecision(snapshot),
      createdAt: log.createdAt
    };
  });

  return {
    summary: result.summary,
    timeline,
    logs: timeline,
    rawLogs,
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

  const result = await governanceService.getLogsWithSummary(String(req.params.id));
  return res.json({
    workflowId: String(req.params.id),
    ...normalizeWorkflowLogsResponse({
      ...result,
      workflow: {
        createdAt: workflow.createdAt,
        contextData: workflow.contextData,
        actualCare: workflow.actualCare,
        isAdhered: workflow.isAdhered
      }
    })
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