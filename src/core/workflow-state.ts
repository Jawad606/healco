export const WorkflowStatus = {
  INITIATED: 'INITIATED',
  ROUTING: 'ROUTING',
  DECISION_PENDING: 'DECISION_PENDING',
  ACTION_PENDING: 'ACTION_PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const;

export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

export const GovernanceStep = {
  INTAKE: 'INTAKE',
  ROUTE: 'ROUTE',
  DECISION: 'DECISION',
  ACTION: 'ACTION',
  FAILURE: 'FAILURE',
  EVENT: 'EVENT',
  FILE_INGESTED: 'FILE_INGESTED',
  RECORDS_PARSED: 'RECORDS_PARSED',
  MSK_DETECTED: 'MSK_DETECTED'
} as const;

export type GovernanceStep = (typeof GovernanceStep)[keyof typeof GovernanceStep];

export type WorkflowInput = {
  symptom: string;
  painLevel: number;
  duration: string;
  redFlags: boolean;
  age: number;
  patientId: string;
  failedPtHistory?: boolean;
};

export type WorkflowPathway = {
  route: string;
  confidence: number;
  reasoning: string;
};

export type WorkflowDecision = {
  plan: string;
  expectedCare: string;
  avoidedPath: string | null;
  avoidedReason: string | null;
  rationale: {
    selectedBecause: string[];
    factors: {
      route: string;
      painLevel: number;
      redFlags: boolean;
      failedPtHistory: boolean;
    };
  };
  alternatives: Array<{
    plan: string;
    expectedCare: string;
    ranking: number;
    selected: boolean;
    notSelectedReason: string | null;
  }>;
  comparison: {
    compared: boolean;
    methodology: string;
    notes: string;
  };
};

export type WorkflowAction = {
  actualCare: string;
  isAdhered: boolean;
  isDefaultPath: boolean;
  overrideReason: string | null;
};

export type WorkflowContext = {
  input?: WorkflowInput;
  pathway?: WorkflowPathway;
  decision?: WorkflowDecision;
  action?: WorkflowAction;
  [key: string]: unknown;
};