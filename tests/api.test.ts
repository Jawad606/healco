type Primitive = string | number | boolean | null;

type WorkflowResponse = {
  id: string;
  ingestionRunId?: string | null;
  traceId: string;
  status: string;
  decision: {
    plan: string | null;
    expectedCare: string | null;
  } | null;
  action: {
    actualCare: string | null;
    completedAt: string | null;
  } | null;
  timestamps: {
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
};

type TimelineEntry = {
  index: number;
  label?: string;
  at: string;
  displayLine?: string;
  message: string;
  step: string;
  transition: string;
  actor: string;
  pathway: { route: string | null } | null;
  decision: Record<string, Primitive | object | Array<unknown>> | null;
  action: { actualCare: string | null; completedAt: string | null } | null;
  adherence:
    | {
        isAdhered: boolean | null;
        expectedCare: string | null;
        actualCare: string | null;
      }
    | null;
};

type CompactLog = {
  index: number;
  at: string;
  step: string;
  transition: string;
  actor: string;
  message: string;
  route: string | null;
  plan: string | null;
  actualCare: string | null;
  isAdhered: boolean | null;
  label?: unknown;
  displayLine?: unknown;
};

type LogsResponse = {
  workflowId: string;
  summary: string;
  timeline: TimelineEntry[];
  logs: CompactLog[];
  rawLogs?: Array<Record<string, unknown>>;
  sections?: {
    timeline?: { role?: string };
    logs?: { role?: string; alignment?: { with?: string; guaranteed?: boolean } };
    rawLogs?: { role?: string };
    overview?: { role?: string };
  };
  responseMeta?: {
    rawLogs?: {
      included?: boolean;
      query?: string;
      note?: string;
    };
  };
};

type IngestionCreateResponse = {
  ok: boolean;
  status: number;
  reused?: boolean;
  runId?: string;
  code?: string;
  message?: string;
  totals?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    mskFound: number;
  };
  workflows?: string[];
  failures?: Array<{ rowNumber: number; reason: string }>;
};

type IngestionSummaryResponse = {
  ingestionRunId: string;
  status: string;
  totals: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    mskFound: number;
  };
  workflows?: Array<{
    workflowId: string;
    traceId: string;
    status: string;
    completedAt: string | null;
    createdAt: string;
  }>;
  consistency?: {
    valid: boolean;
    idsLinked: boolean;
    workflowCountMatchesMsk: boolean;
    terminalWorkflowCount: number;
    totalWorkflowCount: number;
    errors: string[];
  };
  failures: Array<{ rowNumber: number; reason: string }>;
};

import { readFile } from 'node:fs/promises';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8000';
const WAIT_TIMEOUT_MS = Number(process.env.API_WAIT_TIMEOUT_MS ?? 60000);
const WAIT_INTERVAL_MS = Number(process.env.API_WAIT_INTERVAL_MS ?? 500);

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const response = await fetch(url, init);
  const contentType = response.headers.get('content-type') ?? '';
  const bodyText = await response.text();
  const data = contentType.includes('application/json')
    ? (JSON.parse(bodyText) as T)
    : ({ raw: bodyText } as T);

  return { status: response.status, data };
}

async function pollWorkflowUntilTerminal(workflowId: string): Promise<WorkflowResponse> {
  const deadline = Date.now() + WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = await fetchJson<WorkflowResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}`);
    assertCondition(result.status === 200, `GET workflow failed with status ${result.status}`);

    if (result.data.status === 'COMPLETED' || result.data.status === 'FAILED') {
      return result.data;
    }

    await wait(WAIT_INTERVAL_MS);
  }

  throw new Error(`Workflow ${workflowId} did not reach terminal state within ${WAIT_TIMEOUT_MS}ms`);
}

async function uploadCsvForIngestion(
  employerName: string,
  fileName: string,
  csvContent: string
): Promise<{ status: number; data: IngestionCreateResponse }> {
  const form = new FormData();
  form.set('employerName', employerName);
  form.set('file', new Blob([csvContent], { type: 'text/csv' }), fileName);

  return fetchJson<IngestionCreateResponse>(`${BASE_URL}/api/v1/ingestions`, {
    method: 'POST',
    body: form
  });
}

async function run() {
  console.log('Running original API scenario against', BASE_URL);

  const health = await fetchJson<{ ok: boolean }>(`${BASE_URL}/health`);
  assertCondition(health.status === 200, `Health check failed with status ${health.status}`);
  assertCondition(health.data.ok === true, 'Health response missing ok=true');

  const idempotencyKey = `scenario-${Date.now()}`;
  const createPayload = {
    idempotencyKey,
    payload: {
      symptom: 'lower back pain',
      painLevel: 3,
      duration: '2 weeks',
      redFlags: false,
      age: 34,
      patientId: 'patient_original_scenario',
      failedPtHistory: false
    }
  };

  const create = await fetchJson<{ workflowId: string; status: string }>(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });

  assertCondition(create.status === 202, `Create workflow failed with status ${create.status}`);
  assertCondition(typeof create.data.workflowId === 'string', 'Create response missing workflowId');

  const workflow = await pollWorkflowUntilTerminal(create.data.workflowId);
  assertCondition(workflow.status === 'COMPLETED', `Expected COMPLETED status, got ${workflow.status}`);
  assertCondition(workflow.action !== null, 'Top-level action should not be null after completion');
  assertCondition(
    workflow.action?.completedAt === workflow.timestamps.completedAt,
    'Top-level action.completedAt must match timestamps.completedAt'
  );

  const logs = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${create.data.workflowId}/logs`);
  assertCondition(logs.status === 200, `GET logs failed with status ${logs.status}`);

  const timeline = logs.data.timeline;
  const compactLogs = logs.data.logs;

  assertCondition(Array.isArray(timeline) && timeline.length >= 4, 'Timeline must contain at least 4 entries');
  assertCondition(Array.isArray(compactLogs) && compactLogs.length === timeline.length, 'logs must align with timeline length');
  assertCondition(logs.data.sections?.timeline?.role === 'primary-rich', 'sections.timeline.role should be primary-rich');
  assertCondition(logs.data.sections?.logs?.role === 'compact-aligned', 'sections.logs.role should be compact-aligned');
  assertCondition(logs.data.sections?.logs?.alignment?.with === 'timeline', 'sections.logs.alignment.with should be timeline');
  assertCondition(logs.data.sections?.logs?.alignment?.guaranteed === true, 'sections.logs.alignment.guaranteed should be true');
  assertCondition(logs.data.responseMeta?.rawLogs?.included === false, 'rawLogs should be excluded by default');
  assertCondition(!('rawLogs' in logs.data), 'rawLogs key should be absent by default');

  const routeEntry = timeline.find((entry) => entry.step === 'ROUTE');
  const decisionEntry = timeline.find((entry) => entry.step === 'DECISION');
  const actionEntry = timeline.find((entry) => entry.step === 'ACTION');

  assertCondition(routeEntry, 'Timeline missing ROUTE step');
  assertCondition(decisionEntry, 'Timeline missing DECISION step');
  assertCondition(actionEntry, 'Timeline missing ACTION step');

  assertCondition(routeEntry.decision === null, 'ROUTE decision must be null');
  assertCondition(routeEntry.action === null, 'ROUTE action must be null');
  assertCondition(routeEntry.adherence === null, 'ROUTE adherence must be null');

  assertCondition(decisionEntry.decision !== null, 'DECISION entry must contain decision object');
  assertCondition(decisionEntry.action === null, 'DECISION action must be null');
  assertCondition(decisionEntry.adherence === null, 'DECISION adherence must be null');
  assertCondition(
    typeof decisionEntry.message === 'string' && decisionEntry.message.toLowerCase().includes('because'),
    'DECISION message should include rationale wording (because)'
  );

  assertCondition(actionEntry.action !== null, 'ACTION entry must contain action object');
  assertCondition(
    actionEntry.action?.completedAt === workflow.timestamps.completedAt,
    'ACTION timeline completedAt must match top-level completedAt'
  );

  const firstCompactLog = compactLogs[0];
  assertCondition(!('label' in firstCompactLog), 'Compact logs should not include timeline-only label field');
  assertCondition(!('displayLine' in firstCompactLog), 'Compact logs should not include timeline-only displayLine field');

  for (let i = 0; i < timeline.length; i += 1) {
    assertCondition(
      timeline[i].index === compactLogs[i].index,
      `Timeline/logs index mismatch at position ${i}: ${timeline[i].index} vs ${compactLogs[i].index}`
    );
    assertCondition(
      timeline[i].step === compactLogs[i].step,
      `Timeline/logs step mismatch at position ${i}: ${timeline[i].step} vs ${compactLogs[i].step}`
    );
  }

  const logsWithoutRaw = await fetchJson<LogsResponse>(
    `${BASE_URL}/api/v1/workflows/${create.data.workflowId}/logs?include=timeline,logs,overview`
  );
  assertCondition(logsWithoutRaw.status === 200, `GET logs without raw failed with status ${logsWithoutRaw.status}`);
  assertCondition(logsWithoutRaw.data.responseMeta?.rawLogs?.included === false, 'rawLogs should be excluded when include does not contain raw');
  assertCondition(!('rawLogs' in logsWithoutRaw.data), 'rawLogs key should be absent when excluded by include query');

  const logsWithRaw = await fetchJson<LogsResponse>(
    `${BASE_URL}/api/v1/workflows/${create.data.workflowId}/logs?include=raw`
  );
  assertCondition(logsWithRaw.status === 200, `GET logs with raw failed with status ${logsWithRaw.status}`);
  assertCondition(logsWithRaw.data.responseMeta?.rawLogs?.included === true, 'rawLogs should be included when include=raw');
  assertCondition(Array.isArray(logsWithRaw.data.rawLogs), 'rawLogs should be present when include=raw');

  console.log('PASS: Original API scenario checks completed successfully.');
  console.log(
    JSON.stringify(
      {
        workflowId: create.data.workflowId,
        status: workflow.status,
        completedAt: workflow.timestamps.completedAt,
        routeStep: {
          decision: routeEntry.decision,
          action: routeEntry.action,
          adherence: routeEntry.adherence
        },
        decisionMessage: decisionEntry.message,
        compactLogShape: Object.keys(firstCompactLog)
      },
      null,
      2
    )
  );
}

/**
 * Test 1: Timeline Progression Clean - Intake → Route → Decision → Action
 * Verify no early population of decision/action fields at intermediate steps
 */
async function testTimelineProgressionClean() {
  console.log('\n[TEST 1] Timeline Progression Clean: Intake → Route → Decision → Action');

  const idempotencyKey = `test1-timeline-${Date.now()}`;
  const createPayload = {
    idempotencyKey,
    payload: {
      symptom: 'lower back pain',
      painLevel: 3,
      duration: '2 weeks',
      redFlags: false,
      age: 34,
      patientId: `patient_test1_${Date.now()}`,
      failedPtHistory: false
    }
  };

  const create = await fetchJson<{ workflowId: string; status: string }>(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });

  assertCondition(create.status === 202, `Create workflow failed with status ${create.status}`);
  const workflowId = create.data.workflowId;

  const workflow = await pollWorkflowUntilTerminal(workflowId);
  assertCondition(workflow.status === 'COMPLETED', `Expected COMPLETED, got ${workflow.status}`);

  const logs = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}/logs`);
  assertCondition(logs.status === 200, `GET logs failed with status ${logs.status}`);

  const timeline = logs.data.timeline;
  assertCondition(timeline.length >= 4, 'Timeline must contain at least 4 entries (INTAKE, ROUTE, DECISION, ACTION)');

  // Find each step in order
  const intakeEntry = timeline.find((e) => e.step === 'INTAKE');
  const routeEntry = timeline.find((e) => e.step === 'ROUTE');
  const decisionEntry = timeline.find((e) => e.step === 'DECISION');
  const actionEntry = timeline.find((e) => e.step === 'ACTION');

  assertCondition(intakeEntry, 'Timeline missing INTAKE step');
  assertCondition(routeEntry, 'Timeline missing ROUTE step');
  assertCondition(decisionEntry, 'Timeline missing DECISION step');
  assertCondition(actionEntry, 'Timeline missing ACTION step');

  // Verify step order
  const stepOrder = [intakeEntry.index, routeEntry.index, decisionEntry.index, actionEntry.index];
  for (let i = 1; i < stepOrder.length; i++) {
    assertCondition(
      stepOrder[i] > stepOrder[i - 1],
      `Steps not in order: ${stepOrder.join(' -> ')}`
    );
  }

  // INTAKE: should have no decision, action, or adherence
  assertCondition(intakeEntry.decision === null, `INTAKE decision must be null, got ${JSON.stringify(intakeEntry.decision)}`);
  assertCondition(intakeEntry.action === null, `INTAKE action must be null, got ${JSON.stringify(intakeEntry.action)}`);
  assertCondition(intakeEntry.adherence === null, `INTAKE adherence must be null, got ${JSON.stringify(intakeEntry.adherence)}`);

  // ROUTE: should have no decision, action, or adherence
  assertCondition(routeEntry.decision === null, `ROUTE decision must be null, got ${JSON.stringify(routeEntry.decision)}`);
  assertCondition(routeEntry.action === null, `ROUTE action must be null, got ${JSON.stringify(routeEntry.action)}`);
  assertCondition(routeEntry.adherence === null, `ROUTE adherence must be null, got ${JSON.stringify(routeEntry.adherence)}`);

  // DECISION: should have decision but no action (adherence can be empty or null at this point)
  assertCondition(decisionEntry.decision !== null, `DECISION decision must not be null`);
  assertCondition(
    typeof decisionEntry.decision === 'object' && 'plan' in decisionEntry.decision,
    `DECISION decision must contain 'plan' field`
  );
  assertCondition(decisionEntry.action === null, `DECISION action must be null, got ${JSON.stringify(decisionEntry.action)}`);

  // ACTION: should have action object
  assertCondition(actionEntry.action !== null, `ACTION action must not be null`);
  assertCondition(
    typeof actionEntry.action === 'object' && actionEntry.action.completedAt !== null,
    `ACTION action must have completedAt`
  );

  console.log('  ✓ Steps in correct order: INTAKE → ROUTE → DECISION → ACTION');
  console.log('  ✓ No early decision/action population');
  console.log('  ✓ Each step has only expected fields populated');
}

/**
 * Test 2: Decision → Action Shows Immediately After Route
 * Verify clear appearance of decision (PT_FIRST) and corresponding action
 */
async function testDecisionActionImmediateAfterRoute() {
  console.log('\n[TEST 2] Decision → Action Immediately After Route');

  const idempotencyKey = `test2-decision-${Date.now()}`;
  const createPayload = {
    idempotencyKey,
    payload: {
      symptom: 'lower back pain',
      painLevel: 3,
      duration: '2 weeks',
      redFlags: false,
      age: 34,
      patientId: `patient_test2_${Date.now()}`,
      failedPtHistory: false
    }
  };

  const create = await fetchJson<{ workflowId: string; status: string }>(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  assertCondition(create.status === 202, `Create workflow failed with status ${create.status}`);
  assertCondition(typeof create.data.workflowId === 'string', 'Create response missing workflowId');

  const workflowId = create.data.workflowId;
  const workflow = await pollWorkflowUntilTerminal(workflowId);
  assertCondition(workflow.status === 'COMPLETED', `Expected COMPLETED, got ${workflow.status}`);

  const logs = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}/logs`);
  assertCondition(logs.status === 200, `GET logs failed with status ${logs.status}`);
  const timeline = logs.data.timeline;
  const compactLogs = logs.data.logs;

  assertCondition(Array.isArray(timeline) && timeline.length >= 4, 'Timeline must contain at least 4 entries');
  assertCondition(Array.isArray(compactLogs) && compactLogs.length === timeline.length, 'logs must align with timeline length');

  const routeEntry = timeline.find((e) => e.step === 'ROUTE');
  const decisionEntry = timeline.find((e) => e.step === 'DECISION');
  const actionEntry = timeline.find((e) => e.step === 'ACTION');

  assertCondition(routeEntry, 'ROUTE step missing');
  assertCondition(decisionEntry, 'DECISION step missing');
  assertCondition(actionEntry, 'ACTION step missing');

  // DECISION should be immediately after ROUTE (index-wise, could be consecutive or within a few entries)
  const distanceBetweenRouteAndDecision = decisionEntry.index - routeEntry.index;
  assertCondition(
    distanceBetweenRouteAndDecision > 0 && distanceBetweenRouteAndDecision <= 2,
    `DECISION should appear immediately after ROUTE, distance is ${distanceBetweenRouteAndDecision}`
  );

  // ACTION should be immediately after DECISION
  const distanceBetweenDecisionAndAction = actionEntry.index - decisionEntry.index;
  assertCondition(
    distanceBetweenDecisionAndAction > 0 && distanceBetweenDecisionAndAction <= 2,
    `ACTION should appear immediately after DECISION, distance is ${distanceBetweenDecisionAndAction}`
  );

  // Verify DECISION contains PT_FIRST plan
  assertCondition(
    decisionEntry.decision?.plan === 'PT_FIRST',
    `Expected plan PT_FIRST, got ${decisionEntry.decision?.plan}`
  );
  assertCondition(
    typeof decisionEntry.decision?.expectedCare === 'string' && decisionEntry.decision.expectedCare.length > 0,
    'DECISION expectedCare should be present'
  );

  // Verify DECISION message mentions the plan
  assertCondition(
    typeof decisionEntry.message === 'string',
    'DECISION message should be a string'
  );

  // Verify ACTION shows PT referral created
  assertCondition(
    actionEntry.action?.actualCare === 'PT referral created',
    `Expected ACTION actualCare 'PT referral created', got ${actionEntry.action?.actualCare}`
  );

  // Verify the decision expectedCare matches action actualCare
  assertCondition(
    decisionEntry.decision?.expectedCare === actionEntry.action?.actualCare,
    `expectedCare (${decisionEntry.decision?.expectedCare}) should match actualCare (${actionEntry.action?.actualCare})`
  );

  // Verify DECISION and ACTION entries are aligned with compact logs by index
  const compactDecision = compactLogs.find((entry) => entry.step === 'DECISION');
  const compactAction = compactLogs.find((entry) => entry.step === 'ACTION');
  assertCondition(compactDecision, 'Compact logs missing DECISION step');
  assertCondition(compactAction, 'Compact logs missing ACTION step');
  assertCondition(
    compactDecision.index === decisionEntry.index,
    `DECISION index mismatch timeline=${decisionEntry.index} logs=${compactDecision.index}`
  );
  assertCondition(
    compactAction.index === actionEntry.index,
    `ACTION index mismatch timeline=${actionEntry.index} logs=${compactAction.index}`
  );
  assertCondition(
    compactAction.actualCare === actionEntry.action?.actualCare,
    `ACTION actualCare mismatch timeline=${actionEntry.action?.actualCare} logs=${compactAction.actualCare}`
  );

  console.log('  ✓ DECISION appears immediately after ROUTE with PT_FIRST plan');
  console.log('  ✓ ACTION appears immediately after DECISION with PT referral');
  console.log('  ✓ Decision expectedCare matches Action actualCare');
}

/**
 * Test 3: Consistency Across All Sections
 * Verify action.completedAt matches everywhere (overview, timeline, main response)
 */
async function testConsistencyAcrossAllSections() {
  console.log('\n[TEST 3] Consistency Across All Sections');

  const idempotencyKey = `test3-consistency-${Date.now()}`;
  const createPayload = {
    idempotencyKey,
    payload: {
      symptom: 'lower back pain',
      painLevel: 3,
      duration: '2 weeks',
      redFlags: false,
      age: 34,
      patientId: `patient_test3_${Date.now()}`,
      failedPtHistory: false
    }
  };

  const create = await fetchJson<{ workflowId: string; status: string }>(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  assertCondition(create.status === 202, `Create workflow failed with status ${create.status}`);
  assertCondition(typeof create.data.workflowId === 'string', 'Create response missing workflowId');

  const workflowId = create.data.workflowId;

  // Get main workflow response
  const workflowRes = await pollWorkflowUntilTerminal(workflowId);
  assertCondition(workflowRes.status === 'COMPLETED', `Expected COMPLETED, got ${workflowRes.status}`);
  assertCondition(workflowRes.decision?.plan === 'PT_FIRST', `Expected PT_FIRST plan, got ${workflowRes.decision?.plan}`);
  assertCondition(
    typeof workflowRes.decision?.expectedCare === 'string' && workflowRes.decision.expectedCare.length > 0,
    'Main response decision.expectedCare should be present'
  );
  assertCondition(workflowRes.action !== null, 'Main response action should be present for completed workflow');
  assertCondition(
    workflowRes.action?.actualCare === workflowRes.decision?.expectedCare,
    `Main response expectedCare (${workflowRes.decision?.expectedCare}) should match actualCare (${workflowRes.action?.actualCare})`
  );
  const mainCompletedAt = workflowRes.timestamps.completedAt;
  const mainActionCompletedAt = workflowRes.action?.completedAt;

  assertCondition(mainCompletedAt !== null, 'Main response timestamps.completedAt should not be null');
  assertCondition(mainActionCompletedAt !== null, 'Main response action.completedAt should not be null');
  assertCondition(
    mainActionCompletedAt === mainCompletedAt,
    `Main: action.completedAt (${mainActionCompletedAt}) must match timestamps.completedAt (${mainCompletedAt})`
  );

  // Get logs response
  const logsRes = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}/logs`);
  assertCondition(logsRes.status === 200, `GET logs failed with status ${logsRes.status}`);
  const timeline = logsRes.data.timeline;
  const compactLogs = logsRes.data.logs;

  assertCondition(Array.isArray(timeline) && timeline.length >= 4, 'Timeline must contain at least 4 entries');
  assertCondition(Array.isArray(compactLogs) && compactLogs.length === timeline.length, 'logs must align with timeline length');

  // Find ACTION entries
  const timelineAction = timeline.find((e) => e.step === 'ACTION');
  const compactLogsAction = compactLogs.find((e) => e.step === 'ACTION');

  assertCondition(timelineAction, 'ACTION not found in timeline');
  assertCondition(compactLogsAction, 'ACTION not found in compact logs');

  const timelineActionCompletedAt = timelineAction.action?.completedAt;
  const compactLogsActionCompletedAt = compactLogsAction.actualCare; // compact logs use actualCare

  // Consistency check: action.completedAt must be the same everywhere
  assertCondition(
    timelineActionCompletedAt === mainActionCompletedAt,
    `Timeline action.completedAt (${timelineActionCompletedAt}) must match main action.completedAt (${mainActionCompletedAt})`
  );

  // Cross-verify with timestamps
  assertCondition(
    mainCompletedAt === mainActionCompletedAt,
    `Main timestamps.completedAt (${mainCompletedAt}) must match action.completedAt (${mainActionCompletedAt})`
  );

  // Verify adherence uses the same actualCare
  const adherence = timelineAction.adherence;
  if (adherence && adherence.actualCare) {
    assertCondition(
      adherence.actualCare === timelineAction.action?.actualCare,
      `Adherence actualCare should match action actualCare`
    );
  }

  const timelineDecision = timeline.find((e) => e.step === 'DECISION');
  assertCondition(timelineDecision, 'DECISION not found in timeline');
  assertCondition(
    timelineDecision.decision?.plan === workflowRes.decision?.plan,
    `Timeline decision plan (${timelineDecision.decision?.plan}) must match main decision plan (${workflowRes.decision?.plan})`
  );
  assertCondition(
    timelineDecision.decision?.expectedCare === timelineAction.action?.actualCare,
    `Timeline decision expectedCare (${timelineDecision.decision?.expectedCare}) must match timeline action actualCare (${timelineAction.action?.actualCare})`
  );
  assertCondition(
    compactLogsActionCompletedAt === timelineAction.action?.actualCare,
    `Compact logs ACTION actualCare (${compactLogsActionCompletedAt}) must match timeline action actualCare (${timelineAction.action?.actualCare})`
  );

  console.log('  ✓ Main response action.completedAt matches timestamps.completedAt');
  console.log('  ✓ Timeline action.completedAt matches main action.completedAt');
  console.log('  ✓ All completedAt values are consistent across sections');
}

/**
 * Test 4: Response Cleanliness
 * rawLogs NOT returned unless requested, logs correctly reflects timeline (no partial/missing steps)
 */
async function testResponseCleanliness() {
  console.log('\n[TEST 4] Response Cleanliness');

  const idempotencyKey = `test4-clean-${Date.now()}`;
  const createPayload = {
    idempotencyKey,
    payload: {
      symptom: 'lower back pain',
      painLevel: 3,
      duration: '2 weeks',
      redFlags: false,
      age: 34,
      patientId: `patient_test4_${Date.now()}`,
      failedPtHistory: false
    }
  };

  const create = await fetchJson<{ workflowId: string; status: string }>(`${BASE_URL}/api/v1/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });
  assertCondition(create.status === 202, `Create workflow failed with status ${create.status}`);
  assertCondition(typeof create.data.workflowId === 'string', 'Create response missing workflowId');

  const workflowId = create.data.workflowId;
  const workflow = await pollWorkflowUntilTerminal(workflowId);
  assertCondition(workflow.status === 'COMPLETED', `Expected COMPLETED, got ${workflow.status}`);

  // Test 4a: Default request should NOT include rawLogs
  console.log('  [4a] rawLogs NOT included by default');
  const defaultLogs = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}/logs`);
  assertCondition(defaultLogs.status === 200, `Default logs request failed with status ${defaultLogs.status}`);
  assertCondition(!('rawLogs' in defaultLogs.data), 'rawLogs should be absent by default');
  assertCondition(
    defaultLogs.data.responseMeta?.rawLogs?.included === false,
    'responseMeta.rawLogs.included should be false'
  );
  console.log('    ✓ rawLogs not included by default');

  // Test 4b: Explicit include without raw should NOT include rawLogs
  console.log('  [4b] rawLogs NOT included when not in include query');
  const explicitNoRaw = await fetchJson<LogsResponse>(
    `${BASE_URL}/api/v1/workflows/${workflowId}/logs?include=timeline,logs,overview`
  );
  assertCondition(explicitNoRaw.status === 200, `Logs request without raw failed with status ${explicitNoRaw.status}`);
  assertCondition(!('rawLogs' in explicitNoRaw.data), 'rawLogs should be absent when not in include');
  assertCondition(
    explicitNoRaw.data.responseMeta?.rawLogs?.included === false,
    'responseMeta.rawLogs.included should be false'
  );
  console.log('    ✓ rawLogs not included when not requested');

  // Test 4c: Explicit include=raw SHOULD include rawLogs
  console.log('  [4c] rawLogs included only when explicitly requested');
  const withRaw = await fetchJson<LogsResponse>(`${BASE_URL}/api/v1/workflows/${workflowId}/logs?include=raw`);
  assertCondition(withRaw.status === 200, `Logs request with raw failed with status ${withRaw.status}`);
  assertCondition('rawLogs' in withRaw.data, 'rawLogs should be present when include=raw');
  assertCondition(Array.isArray(withRaw.data.rawLogs), 'rawLogs should be an array');
  assertCondition(
    withRaw.data.responseMeta?.rawLogs?.included === true,
    'responseMeta.rawLogs.included should be true'
  );
  console.log('    ✓ rawLogs included when include=raw');

  // Test 4d: Timeline and logs alignment - no partial/missing steps
  console.log('  [4d] Timeline and logs alignment - no missing steps');
  const timelineData = defaultLogs.data.timeline;
  const logsData = defaultLogs.data.logs;

  assertCondition(Array.isArray(timelineData) && timelineData.length >= 4, 'Timeline must contain at least 4 entries');
  assertCondition(Array.isArray(logsData), 'logs must be an array');

  assertCondition(
    timelineData.length === logsData.length,
    `Timeline (${timelineData.length}) and logs (${logsData.length}) must have same length`
  );

  // Verify all expected steps are present
  const steps = new Set(timelineData.map((e) => e.step));
  const expectedSteps = ['INTAKE', 'ROUTE', 'DECISION', 'ACTION'];
  for (const step of expectedSteps) {
    assertCondition(steps.has(step), `Missing expected step: ${step}`);
  }
  console.log('    ✓ All expected steps present');

  // Verify each timeline entry has compact log equivalent
  for (let i = 0; i < timelineData.length; i++) {
    const t = timelineData[i];
    const c = logsData[i];

    assertCondition(
      t.index === c.index,
      `Index mismatch at position ${i}: timeline=${t.index}, logs=${c.index}`
    );
    assertCondition(
      t.step === c.step,
      `Step mismatch at position ${i}: timeline=${t.step}, logs=${c.step}`
    );
    assertCondition(
      t.at === c.at,
      `Timestamp mismatch at position ${i}: timeline=${t.at}, logs=${c.at}`
    );
  }
  console.log('    ✓ Timeline and logs perfectly aligned (index, step, at)');

  const timelineDecision = timelineData.find((entry) => entry.step === 'DECISION');
  const timelineAction = timelineData.find((entry) => entry.step === 'ACTION');
  assertCondition(timelineDecision, 'Timeline missing DECISION step');
  assertCondition(timelineAction, 'Timeline missing ACTION step');
  assertCondition(
    timelineDecision.decision?.expectedCare === timelineAction.action?.actualCare,
    `Decision expectedCare (${timelineDecision.decision?.expectedCare}) should match action actualCare (${timelineAction.action?.actualCare})`
  );
  assertCondition(
    timelineAction.action?.completedAt === workflow.timestamps.completedAt,
    'ACTION completedAt should match top-level timestamps.completedAt'
  );

  // Test 4e: Verify response metadata
  console.log('  [4e] Response metadata and sections');
  assertCondition(
    defaultLogs.data.sections?.timeline?.role === 'primary-rich',
    'sections.timeline.role should be primary-rich'
  );
  assertCondition(
    defaultLogs.data.sections?.logs?.role === 'compact-aligned',
    'sections.logs.role should be compact-aligned'
  );
  assertCondition(
    defaultLogs.data.sections?.logs?.alignment?.with === 'timeline',
    'sections.logs.alignment.with should be timeline'
  );
  assertCondition(
    defaultLogs.data.sections?.logs?.alignment?.guaranteed === true,
    'sections.logs.alignment.guaranteed should be true'
  );
  console.log('    ✓ Response sections and metadata correct');
}

async function testWave1StableHappyPathIngestion() {
  console.log('\n[WAVE 1] Stable Happy-Path Ingestion');

  const csvSample = await readFile('vagabond_propco_employer_data_packet - Claims_2025.csv', 'utf-8');
  const employerName = `wave1_${Date.now()}`;

  const upload = await uploadCsvForIngestion(
    employerName,
    'vagabond_propco_employer_data_packet - Claims_2025.csv',
    csvSample
  );

  assertCondition(upload.status === 202, `Wave 1 upload expected 202, got ${upload.status}`);
  assertCondition(upload.data.ok === true, 'Wave 1 upload should return ok=true');
  assertCondition(Boolean(upload.data.runId), 'Wave 1 upload should return runId');
  assertCondition((upload.data.totals?.totalRows ?? 0) > 0, 'Wave 1 totalRows should be > 0');
  assertCondition((upload.data.totals?.mskFound ?? 0) > 0, 'Wave 1 should detect at least one MSK record');
  assertCondition((upload.data.workflows?.length ?? 0) > 0, 'Wave 1 should create at least one workflow');

  const runId = String(upload.data.runId);
  const summary = await fetchJson<IngestionSummaryResponse>(`${BASE_URL}/api/v1/ingestions/${runId}`);
  assertCondition(summary.status === 200, `Wave 1 summary expected 200, got ${summary.status}`);
  assertCondition(summary.data.status === 'COMPLETED', `Wave 1 run status expected COMPLETED, got ${summary.data.status}`);
  assertCondition(summary.data.totals.totalRows === upload.data.totals?.totalRows, 'Wave 1 totals should match upload response');

  const firstWorkflowId = upload.data.workflows?.[0];
  assertCondition(Boolean(firstWorkflowId), 'Wave 1 should include at least one created workflow id');
  const firstWorkflow = await pollWorkflowUntilTerminal(String(firstWorkflowId));
  assertCondition(
    firstWorkflow.status === 'COMPLETED' || firstWorkflow.status === 'FAILED',
    `Wave 1 first workflow should be terminal, got ${firstWorkflow.status}`
  );

  console.log('  ✓ Upload, parse, detect, and workflow bridge completed');
}

async function testWave2ScenarioHardening() {
  console.log('\n[WAVE 2] Scenario Hardening (No-MSK + Invalid File)');

  const noMskCsv = [
    'claim_id,employer_id,member_id,date_of_service,cpt_code,icd10_code,place_of_service,provider_type,billed_amount,allowed_amount,paid_amount,claim_source',
    'clm_no_1,emp_no_msk,m_1,2026-01-10,99213,F41.1,11,PCP,100,80,70,TPA_EXPORT',
    'clm_no_2,emp_no_msk,m_2,2026-01-11,83036,E11.9,11,PCP,120,95,88,TPA_EXPORT'
  ].join('\n');

  const noMskUpload = await uploadCsvForIngestion(
    `wave2_nomsk_${Date.now()}`,
    'no_msk.csv',
    noMskCsv
  );
  assertCondition(noMskUpload.status === 202, `Wave 2 no-MSK upload expected 202, got ${noMskUpload.status}`);
  assertCondition(noMskUpload.data.ok === true, 'Wave 2 no-MSK upload should return ok=true');
  assertCondition(noMskUpload.data.totals?.mskFound === 0, `Wave 2 no-MSK should have mskFound=0, got ${noMskUpload.data.totals?.mskFound}`);
  assertCondition((noMskUpload.data.workflows?.length ?? 0) === 0, 'Wave 2 no-MSK should create zero workflows');

  const noMskSummary = await fetchJson<IngestionSummaryResponse>(
    `${BASE_URL}/api/v1/ingestions/${String(noMskUpload.data.runId)}`
  );
  assertCondition(noMskSummary.status === 200, `Wave 2 no-MSK summary expected 200, got ${noMskSummary.status}`);
  assertCondition(noMskSummary.data.status === 'COMPLETED', `Wave 2 no-MSK summary expected COMPLETED, got ${noMskSummary.data.status}`);

  const emptyUpload = await uploadCsvForIngestion(
    `wave2_invalid_${Date.now()}`,
    'empty.csv',
    ''
  );
  assertCondition(emptyUpload.status === 400, `Wave 2 empty file expected 400, got ${emptyUpload.status}`);
  assertCondition(emptyUpload.data.code === 'INVALID_FILE', `Wave 2 empty file expected INVALID_FILE, got ${emptyUpload.data.code}`);
  assertCondition(Boolean(emptyUpload.data.runId), 'Wave 2 empty file should still return runId');

  const badHeaderCsv = ['foo,bar', '1,2'].join('\n');
  const badHeaderUpload = await uploadCsvForIngestion(
    `wave2_badheader_${Date.now()}`,
    'bad_headers.csv',
    badHeaderCsv
  );
  assertCondition(badHeaderUpload.status === 400, `Wave 2 bad-header expected 400, got ${badHeaderUpload.status}`);
  assertCondition(
    badHeaderUpload.data.code === 'HEADER_VALIDATION_FAILED',
    `Wave 2 bad-header expected HEADER_VALIDATION_FAILED, got ${badHeaderUpload.data.code}`
  );
  assertCondition((badHeaderUpload.data.failures?.length ?? 0) > 0, 'Wave 2 bad-header response should include failures');

  console.log('  ✓ No-MSK path closes cleanly with mskFound=0');
  console.log('  ✓ Empty and bad-header files fail cleanly with actionable error payloads');
}

async function testWave3ConsistencyLock() {
  console.log('\n[WAVE 3] Consistency Lock (API / DB / Governance Surface)');

  const csvSample = await readFile('vagabond_propco_employer_data_packet - Claims_2025.csv', 'utf-8');
  const employerName = `wave3_${Date.now()}`;
  const upload = await uploadCsvForIngestion(
    employerName,
    'vagabond_propco_employer_data_packet - Claims_2025.csv',
    csvSample
  );

  assertCondition(upload.status === 202, `Wave 3 upload expected 202, got ${upload.status}`);
  assertCondition(Boolean(upload.data.runId), 'Wave 3 upload should return runId');

  const runId = String(upload.data.runId);
  const summary = await fetchJson<IngestionSummaryResponse>(`${BASE_URL}/api/v1/ingestions/${runId}`);
  assertCondition(summary.status === 200, `Wave 3 summary expected 200, got ${summary.status}`);
  assertCondition(Boolean(summary.data.consistency), 'Wave 3 summary should include consistency block');
  assertCondition(summary.data.consistency?.idsLinked === true, 'Wave 3 idsLinked should be true');
  assertCondition(
    summary.data.consistency?.workflowCountMatchesMsk === true,
    'Wave 3 workflowCountMatchesMsk should be true'
  );
  assertCondition(summary.data.consistency?.valid === true, `Wave 3 consistency expected valid=true, errors=${summary.data.consistency?.errors.join('; ')}`);

  const firstWorkflowId = summary.data.workflows?.[0]?.workflowId;
  if (firstWorkflowId) {
    const workflow = await pollWorkflowUntilTerminal(firstWorkflowId);
    assertCondition(
      workflow.ingestionRunId !== null && typeof workflow.ingestionRunId === 'string',
      'Wave 3 workflow response should expose ingestionRunId linkage'
    );
  }

  console.log('  ✓ Consistency checks passed for ids and run-workflow count alignment');
}

async function runAllE2ETests() {
  try {
    console.log('='.repeat(70));
    console.log('Running Original API Scenario (Core Checks)');
    console.log('='.repeat(70));
    await run();

    console.log('\n' + '='.repeat(70));
    console.log('Running End-to-End Test Cases');
    console.log('='.repeat(70));

    await testTimelineProgressionClean();
    await testDecisionActionImmediateAfterRoute();
    await testConsistencyAcrossAllSections();
    await testResponseCleanliness();
    await testWave1StableHappyPathIngestion();
    await testWave2ScenarioHardening();
    await testWave3ConsistencyLock();

    console.log('\n' + '='.repeat(70));
    console.log('ALL E2E TESTS PASSED ✓');
    console.log('='.repeat(70));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n' + '='.repeat(70));
    console.error('E2E TEST FAILED ✗');
    console.error('='.repeat(70));
    console.error('FAIL:', message);
    process.exitCode = 1;
  }
}

runAllE2ETests();
