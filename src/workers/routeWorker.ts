import { workflowQueue } from '../core/queue';
import { WorkflowStatus, WorkflowContext } from '../core/workflow-state';
import { WorkflowRepository } from '../repositories/workflow.repository';
import { logTransition } from '../services/governance.service';

const repo = new WorkflowRepository();

export async function routeWorker(workflowId: string) {
  const workflow = await repo.findById(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const context = workflow.contextData as Record<string, unknown>;
  const input = (context.input as { symptom?: string } | undefined) ?? {};
  const route = classifySymptom(String(input.symptom ?? ''));

  const updatedContext: WorkflowContext = {
    ...context,
    routingDecision: {
      route,
      confidence: 0.95,
      reasoning: 'Keyword match - deterministic rules'
    }
  };

  await repo.updateStatus(workflowId, WorkflowStatus.DECISION_PENDING, updatedContext);

  await logTransition({
    workflowId,
    traceId: workflow.traceId,
    fromState: WorkflowStatus.ROUTING,
    toState: WorkflowStatus.DECISION_PENDING,
    actor: 'route-worker',
    narrative: `Routed to ${route} pathway because symptom keyword mapping matched deterministic rules (confidence 0.95)`,
    payloadSnapshot: updatedContext
  });

  await workflowQueue.add('process-workflow', { workflowId, step: 'decision' });
}

function classifySymptom(symptom: string): string {
  const value = symptom.toLowerCase();
  if (value.includes('back pain') || value.includes('lumbar') || value.includes('sciatica')) {
    return 'MSK';
  }
  if (value.includes('chest pain') || value.includes('heart')) return 'CARDIO';
  return 'GENERAL';
}