import { GovernanceRepository } from '../repositories/governance.repository';
import { Prisma } from '@prisma/client';

const repo = new GovernanceRepository();

type TransitionPayload = {
  workflowId?: string | null;
  ingestionRunId?: string | null;
  traceId: string;
  step: string;
  fromState: string;
  toState: string;
  actor: string;
  title: string;
  narrative: string;
  message?: string;
  routingDecision?: Record<string, unknown>;
  decisionMade?: Record<string, unknown>;
  actionTaken?: Record<string, unknown>;
  adherenceResult?: Record<string, unknown>;
  payloadSnapshot: Record<string, unknown>;
};

function toInputJsonValue(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function formatMessage(data: TransitionPayload) {
  if (data.message) {
    return data.message;
  }

  if (data.step === 'ROUTE' && data.routingDecision) {
    const routeData = data.routingDecision as { route?: string; confidence?: number; reasoning?: string };
    const route = routeData.route ?? 'UNKNOWN';
    const confidence = typeof routeData.confidence === 'number' ? routeData.confidence.toFixed(2) : 'N/A';
    const reasoning = routeData.reasoning ? ` ${routeData.reasoning}` : '';
    return `Routed to ${route} pathway (confidence ${confidence}).${reasoning}`;
  }

  if (data.step === 'DECISION' && data.decisionMade) {
    const decisionData = data.decisionMade as {
      plan?: string;
      expectedCare?: string;
      rationale?: { selectedBecause?: string[] };
    };
    const plan = decisionData.plan ?? 'UNKNOWN_PLAN';
    const care = decisionData.expectedCare ?? 'Care to be determined';
    const selectedBecause = Array.isArray(decisionData.rationale?.selectedBecause)
      ? decisionData.rationale?.selectedBecause.filter((item): item is string => typeof item === 'string').join(' ')
      : '';

    if (selectedBecause) {
      return `${plan} selected because ${selectedBecause} Recommended care: ${care}.`;
    }

    return `${plan} selected. Recommended care: ${care}.`;
  }

  if (data.step === 'ACTION' && data.actionTaken) {
    const actionData = data.actionTaken as { actualCare?: string };
    const adherence = data.adherenceResult as { isAdhered?: boolean } | undefined;
    const outcome = adherence?.isAdhered === true ? 'Pathway adhered.' : adherence?.isAdhered === false ? 'Pathway overridden.' : 'Pathway adherence unknown.';
    return `${actionData.actualCare ?? 'Action completed'}. ${outcome}`;
  }

  return data.narrative;
}

export async function logTransition(data: TransitionPayload, tx?: Prisma.TransactionClient) {
  return repo.create({
    ...data,
    workflowId: data.workflowId ?? null,
    ingestionRunId: data.ingestionRunId ?? null,
    routingDecision: toInputJsonValue(data.routingDecision),
    decisionMade: toInputJsonValue(data.decisionMade),
    actionTaken: toInputJsonValue(data.actionTaken),
    adherenceResult: toInputJsonValue(data.adherenceResult),
    payloadSnapshot: data.payloadSnapshot as Prisma.InputJsonValue,
    message: formatMessage(data)
  }, tx);
}

export async function getLogsWithSummary(workflowId: string) {
  const logs = await repo.findByWorkflowId(workflowId);
  const summary = logs.map((log) => log.narrative).filter(Boolean).join(' → ');
  return { summary, logs };
}

export async function getIngestionLogsWithSummary(ingestionRunId: string) {
  const logs = await repo.findByIngestionRunId(ingestionRunId);
  const summary = logs.map((log) => log.narrative).filter(Boolean).join(' → ');
  return { summary, logs };
}