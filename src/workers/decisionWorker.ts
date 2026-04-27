import { workflowQueue } from '../core/queue';
import { WorkflowStatus, WorkflowContext } from '../core/workflow-state';
import { WorkflowRepository } from '../repositories/workflow.repository';
import { logTransition } from '../services/governance.service';

const repo = new WorkflowRepository();

export async function decisionWorker(workflowId: string) {
  const workflow = await repo.findById(workflowId);
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const context = workflow.contextData as Record<string, unknown>;
  const input = (context.input as {
    painLevel?: number;
    redFlags?: boolean;
    symptom?: string;
    failedPtHistory?: boolean;
  } | undefined) ?? {};
  const pathway = context.pathway as { route?: string } | undefined;

  const plan = decidePlan({
    route: pathway?.route ?? 'GENERAL',
    painLevel: Number(input.painLevel ?? 0),
    redFlags: Boolean(input.redFlags),
    failedPtHistory: Boolean(input.failedPtHistory)
  });

  const updatedContext: WorkflowContext = {
    ...context,
    decision: plan
  };

  await repo.updateStatus(workflowId, WorkflowStatus.ACTION_PENDING, updatedContext);

  await logTransition({
    workflowId,
    traceId: workflow.traceId,
    step: 'DECISION',
    fromState: WorkflowStatus.DECISION_PENDING,
    toState: WorkflowStatus.ACTION_PENDING,
    actor: 'decision-worker',
    title: `${String(plan.plan)} Selected`,
    narrative: buildDecisionNarrative(plan),
    decisionMade: plan as Record<string, unknown>,
    payloadSnapshot: updatedContext as Record<string, unknown>
  });

  await workflowQueue.add('process-workflow', { workflowId, step: 'action' });
}

function decidePlan(input: {
  route: string;
  painLevel: number;
  redFlags: boolean;
  failedPtHistory: boolean;
}) {
  const decisionContext = {
    route: input.route,
    painLevel: input.painLevel,
    redFlags: input.redFlags,
    failedPtHistory: input.failedPtHistory
  };

  if (input.route === 'MSK') {
    if (input.redFlags || input.painLevel >= 6) {
      return {
        plan: 'IMAGING_FIRST',
        expectedCare: 'Imaging referral created',
        avoidedPath: 'HOSPITAL_FIRST',
        avoidedReason: 'Hospital-first pathway avoided because outpatient imaging can address diagnostic needs without inpatient admission.',
        rationale: {
          selectedBecause: [
            input.redFlags
              ? 'Red flags are present and require escalation before conservative treatment.'
              : 'Pain score is high and requires imaging to rule out structural causes first.'
          ],
          factors: decisionContext
        },
        alternatives: [
          {
            plan: 'PT_FIRST',
            expectedCare: 'PT referral created',
            ranking: 2,
            selected: false,
            notSelectedReason:
              'Not selected because red flags or elevated pain indicate imaging should precede PT.'
          }
        ],
        comparison: {
          compared: true,
          methodology: 'rules-v1',
          notes: 'Structured for future weighted scoring and side-by-side strategy comparison.'
        }
      };
    }

    return {
      plan: 'PT_FIRST',
      expectedCare: 'PT referral created',
      avoidedPath: 'HOSPITAL_FIRST',
      avoidedReason: 'Hospital-first pathway avoided because conservative PT management is appropriate given mild symptoms and no red flags.',
      rationale: {
        selectedBecause: [
          'Pain score is mild to moderate and no red flags are present.',
          input.failedPtHistory
            ? 'PT is still selected because no contraindications were detected in this ruleset.'
            : 'No prior failed PT history is recorded, so conservative care is first-line.'
        ],
        factors: decisionContext
      },
      alternatives: [
        {
          plan: 'IMAGING_FIRST',
          expectedCare: 'Imaging referral created',
          ranking: 2,
          selected: false,
          notSelectedReason:
            'Not selected because no red flags and no high pain threshold trigger were found.'
        }
      ],
      comparison: {
        compared: true,
        methodology: 'rules-v1',
        notes: 'Structured for future weighted scoring and side-by-side strategy comparison.'
      }
    };
  }

  return {
    plan: 'GENERAL_REVIEW',
    expectedCare: 'General referral created',
    avoidedPath: 'HOSPITAL_FIRST',
    avoidedReason: 'Hospital-first pathway avoided because symptoms do not meet inpatient admission criteria.',
    rationale: {
      selectedBecause: ['Symptoms did not match a specialized pathway with sufficient confidence.'],
      factors: decisionContext
    },
    alternatives: [
      {
        plan: 'PT_FIRST',
        expectedCare: 'PT referral created',
        ranking: 2,
        selected: false,
        notSelectedReason: 'Not selected because routing did not classify this case as MSK.'
      },
      {
        plan: 'IMAGING_FIRST',
        expectedCare: 'Imaging referral created',
        ranking: 3,
        selected: false,
        notSelectedReason: 'Not selected because high-risk escalation criteria were not met.'
      }
    ],
    comparison: {
      compared: true,
      methodology: 'rules-v1',
      notes: 'Structured for future weighted scoring and side-by-side strategy comparison.'
    }
  };
}

function buildDecisionNarrative(plan: Record<string, unknown>) {
  const selectedPlan = typeof plan.plan === 'string' ? plan.plan : 'UNKNOWN_PLAN';
  const selectedBecause = Array.isArray((plan.rationale as Record<string, unknown> | undefined)?.selectedBecause)
    ? ((plan.rationale as Record<string, unknown>).selectedBecause as unknown[])
        .filter((item): item is string => typeof item === 'string')
        .join(' | ')
    : '';

  if (!selectedBecause) {
    return `${selectedPlan} selected`;
  }

  return `${selectedPlan} selected because: ${selectedBecause}`;
}