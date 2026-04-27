import { v4 as uuid } from 'uuid';
import { workflowQueue } from '../core/queue';
import { WorkflowStatus, WorkflowContext, WorkflowInput } from '../core/workflow-state';
import { WorkflowRepository } from '../repositories/workflow.repository';

const repo = new WorkflowRepository();

export async function startWorkflow(input: {
  idempotencyKey: string;
  payload: WorkflowInput;
  ingestionRunId?: string;
}) {
  const existing = await repo.findByIdempotencyKey(input.idempotencyKey);
  if (existing) return existing;

  const workflow = await repo.create({
    idempotencyKey: input.idempotencyKey,
    ingestionRunId: input.ingestionRunId,
    traceId: uuid(),
    status: WorkflowStatus.INITIATED,
    contextData: { input: input.payload } satisfies WorkflowContext
  });

  await workflowQueue.add('process-workflow', {
    workflowId: workflow.id,
    step: 'route'
  });

  return workflow;
}

export async function getWorkflowById(id: string) {
  return repo.findById(id);
}

export async function listWorkflows(status: string, limit: number, offset: number) {
  return repo.listByStatus(status as WorkflowStatus, limit, offset);
}