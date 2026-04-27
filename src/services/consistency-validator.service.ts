type RunLike = {
  id: string;
  status: string;
  totalMskFlags: number;
  startedAt: Date;
  completedAt: Date | null;
};

type WorkflowLike = {
  id: string;
  ingestionRunId: string | null;
  status: string;
  actualCare: string | null;
  contextData: unknown;
  createdAt: Date;
  completedAt: Date | null;
};

type GovernanceLike = {
  step: string;
  createdAt: Date;
  workflowId: string | null;
  ingestionRunId: string | null;
  decisionMade: unknown;
  actionTaken: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isMonotonicTimeline(logs: GovernanceLike[]) {
  for (let i = 1; i < logs.length; i += 1) {
    if (logs[i].createdAt.getTime() < logs[i - 1].createdAt.getTime()) {
      return false;
    }
  }

  return true;
}

export function validateIngestionConsistency(input: {
  run: RunLike;
  workflows: WorkflowLike[];
  logs: GovernanceLike[];
}) {
  const errors: string[] = [];

  const idsLinked = input.workflows.every((workflow) => workflow.ingestionRunId === input.run.id);
  if (!idsLinked) {
    errors.push('One or more workflows are not linked to the ingestion run id.');
  }

  const workflowCountMatchesMsk = input.workflows.length === input.run.totalMskFlags;
  if (!workflowCountMatchesMsk) {
    errors.push('Workflow count does not match totalMskFlags.');
  }

  const logsLinked = input.logs.every((log) => !log.ingestionRunId || log.ingestionRunId === input.run.id);
  if (!logsLinked) {
    errors.push('One or more governance events are linked to a different ingestion run id.');
  }

  const timelineMonotonic = isMonotonicTimeline(input.logs);
  if (!timelineMonotonic) {
    errors.push('Governance timeline timestamps are not monotonic.');
  }

  let decisionActionAligned = true;

  for (const workflow of input.workflows) {
    const context = asRecord(workflow.contextData);
    const decision = asRecord(context?.decision);
    const action = asRecord(context?.action);

    const expectedCare = asString(decision?.expectedCare);
    const contextActualCare = asString(action?.actualCare);
    const storedActualCare = workflow.actualCare;

    if (contextActualCare && storedActualCare && contextActualCare !== storedActualCare) {
      decisionActionAligned = false;
      errors.push(`Workflow ${workflow.id} has mismatch between context action and stored actualCare.`);
      continue;
    }

    if (expectedCare && storedActualCare && expectedCare !== storedActualCare) {
      decisionActionAligned = false;
      errors.push(`Workflow ${workflow.id} expectedCare does not match stored actualCare.`);
    }
  }

  // Ingestion completion can precede asynchronous workflow completion, so we only flag obvious contradictions.
  const runStateCoherent = !(
    input.run.status === 'FAILED' &&
    input.workflows.some((workflow) => workflow.status === 'COMPLETED')
  );

  if (!runStateCoherent) {
    errors.push('Ingestion run is COMPLETED but has non-terminal workflow statuses.');
  }

  return {
    valid: errors.length === 0,
    checks: {
      idsLinked,
      workflowCountMatchesMsk,
      logsLinked,
      timelineMonotonic,
      decisionActionAligned,
      runStateCoherent
    },
    errors
  };
}
