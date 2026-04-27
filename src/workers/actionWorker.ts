import { WorkflowStatus, WorkflowContext } from '../core/workflow-state';
import { WorkflowRepository } from '../repositories/workflow.repository';
import { logTransition } from '../services/governance.service';

const repo = new WorkflowRepository();

export async function actionWorker(workflowId: string) {
  const workflow = await repo.findById(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const context = workflow.contextData as Record<string, unknown>;
  const decision = context.decision as { expectedCare?: string; plan?: string } | undefined;

  if (!decision?.expectedCare) {
    throw new Error(`Workflow ${workflowId} is missing decision context`);
  }

  const actualCare = decision.expectedCare;
  const isAdhered = actualCare === decision.expectedCare;
  const isDefaultPath = actualCare === decision.expectedCare;
  const overrideReason: string | null = isDefaultPath ? null : 'Manual override applied';

  const updatedContext: WorkflowContext = {
    ...context,
    action: {
      actualCare,
      isAdhered,
      isDefaultPath,
      overrideReason
    }
  };

  await repo.markCompleted(workflowId, actualCare, isAdhered, updatedContext);

  await logTransition({
    workflowId,
    traceId: workflow.traceId,
    step: 'ACTION',
    fromState: WorkflowStatus.ACTION_PENDING,
    toState: WorkflowStatus.COMPLETED,
    actor: 'action-worker',
    title: 'Action Completed',
    narrative: `${actualCare} completed`,
    actionTaken: {
      actualCare,
      isDefaultPath,
      overrideReason
    } as Record<string, unknown>,
    adherenceResult: {
      isAdhered,
      expectedCare: decision.expectedCare,
      actualCare
    } as Record<string, unknown>,
    payloadSnapshot: updatedContext as Record<string, unknown>
  });
}