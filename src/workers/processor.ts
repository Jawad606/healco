import { Worker } from 'bullmq';
import { config } from '../core/config';
import { routeWorker } from './routeWorker';
import { decisionWorker } from './decisionWorker';
import { actionWorker } from './actionWorker';
import { WorkflowRepository } from '../repositories/workflow.repository';
import { WorkflowStatus } from '../core/workflow-state';
import { logTransition } from '../services/governance.service';

const repo = new WorkflowRepository();

const worker = new Worker(
  'workflow',
  async (job) => {
    const workflowId = String(job.data.workflowId);
    const step = String(job.data.step ?? 'route');

    if (step === 'route') return routeWorker(workflowId);
    if (step === 'decision') return decisionWorker(workflowId);
    if (step === 'action') return actionWorker(workflowId);

    throw new Error(`Unknown workflow step: ${step}`);
  },
  {
    connection: { url: config.redisUrl } as never
  }
);

worker.on('ready', () => {
  console.log('Workflow processor worker is ready and connected to Redis.');
});

worker.on('failed', async (_job, error) => {
  const workflowId = String(_job?.data?.workflowId ?? '');
  if (!workflowId) return;

  const workflow = await repo.findById(workflowId);
  if (!workflow) return;

  await repo.markFailed(workflowId);
  await logTransition({
    workflowId,
    traceId: workflow.traceId,
    step: 'FAILURE',
    fromState: workflow.status as WorkflowStatus,
    toState: WorkflowStatus.FAILED,
    actor: 'processor',
    title: 'Processing Failed',
    narrative: error.message,
    payloadSnapshot: workflow.contextData as Record<string, unknown>
  });
});

console.log('Workflow processor starting...');

void worker;