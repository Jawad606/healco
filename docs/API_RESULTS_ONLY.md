# HealCo API Results Only

This file contains refreshed API samples from the current implementation state.

> [!NOTE]
> All samples below are live captures from the running API as of 2026-04-26.

## 1. System Health
### GET /health
**Response:**
```json
{
  "ok": true
}
```

---

## 2. Direct Workflow Creation
### POST /api/v1/workflows
**Request Body:**
```json
{
  "idempotencyKey": "demo-run-1",
  "payload": {
    "symptom": "lower back pain",
    "painLevel": 3,
    "duration": "2 weeks",
    "redFlags": false,
    "age": 34,
    "patientId": "patient_001",
    "failedPtHistory": false
  }
}
```
**Response (202 Accepted):**
```json
{
  "workflowId": "cmofq7lho00zvum7o4torev1o",
  "status": "INITIATED"
}
```

### GET /api/v1/workflows/:id
**Response:**
```json
{
  "id": "cmofq7lho00zvum7o4torev1o",
  "ingestionRunId": null,
  "traceId": "c6a61232-d609-43ec-b8ad-2a800c02fe47",
  "status": "COMPLETED",
  "input": {
    "symptom": "lower back pain",
    "painLevel": 3,
    "duration": "2 weeks",
    "redFlags": false,
    "age": 34,
    "patientId": "patient_001",
    "failedPtHistory": false
  },
  "pathway": {
    "route": "MSK",
    "confidence": 0.95,
    "reasoning": "Keyword match - deterministic rules"
  },
  "decision": {
    "plan": "PT_FIRST",
    "expectedCare": "PT referral created",
    "avoidedPath": null,
    "avoidedReason": null,
    "rationale": {
      "selectedBecause": [
        "Pain score is mild to moderate and no red flags are present.",
        "No prior failed PT history is recorded, so conservative care is first-line."
      ],
      "factors": {
        "route": "MSK",
        "painLevel": 3,
        "redFlags": false,
        "failedPtHistory": false
      }
    },
    "alternatives": [
      {
        "plan": "IMAGING_FIRST",
        "expectedCare": "Imaging referral created",
        "ranking": 2,
        "selected": false,
        "notSelectedReason": "Not selected because no red flags and no high pain threshold trigger were found."
      }
    ],
    "comparison": {
      "compared": true,
      "methodology": "rules-v1",
      "notes": "Structured for future weighted scoring and side-by-side strategy comparison."
    }
  },
  "action": {
    "actualCare": "PT referral created",
    "isDefaultPath": null,
    "overrideReason": null,
    "completedAt": "2026-04-26T12:10:03.498Z"
  },
  "adherence": {
    "isAdhered": true,
    "expectedCare": "PT referral created",
    "actualCare": "PT referral created"
  },
  "retryCount": 0,
  "timestamps": {
    "createdAt": "2026-04-26T12:10:03.276Z",
    "updatedAt": "2026-04-26T12:10:03.500Z",
    "completedAt": "2026-04-26T12:10:03.498Z"
  }
}
```

### GET /api/v1/workflows/:id/logs
**Response:**
```json
{
  "workflowId": "cmofq7lho00zvum7o4torev1o",
  "summary": "Routed to MSK pathway because symptom keyword mapping matched deterministic rules (confidence 0.95) → PT_FIRST selected because: Pain score is mild to moderate and no red flags are present. | No prior failed PT history is recorded, so conservative care is first-line. → PT referral created completed",
  "timeline": [
    {
      "index": 1,
      "label": "Intake",
      "at": "2026-04-26T12:10:03.276Z",
      "displayLine": "1. [Intake] - 5:10:03 pm",
      "message": "Patient reported lower back pain (pain level 3/10, red flags: no). Workflow created and queued for routing.",
      "step": "INTAKE",
      "transition": "CREATED -> QUEUED",
      "actor": "system"
    },
    {
      "index": 2,
      "label": "MSK Routing Complete",
      "at": "2026-04-26T12:10:03.378Z",
      "displayLine": "2. [MSK Routing Complete] - 5:10:03 pm",
      "message": "Routed to MSK pathway (confidence 0.95). Keyword match - deterministic rules",
      "step": "ROUTE",
      "transition": "ROUTING -> DECISION_PENDING",
      "actor": "route-worker"
    },
    {
      "index": 3,
      "label": "PT_FIRST Selected",
      "at": "2026-04-26T12:10:03.474Z",
      "displayLine": "3. [PT_FIRST Selected] - 5:10:03 pm",
      "message": "PT_FIRST selected because Pain score is mild to moderate and no red flags are present. No prior failed PT history is recorded, so conservative care is first-line. Recommended care: PT referral created.",
      "step": "DECISION",
      "transition": "DECISION_PENDING -> ACTION_PENDING",
      "actor": "decision-worker"
    },
    {
      "index": 4,
      "label": "Action Completed",
      "at": "2026-04-26T12:10:03.503Z",
      "displayLine": "4. [Action Completed] - 5:10:03 pm",
      "message": "PT referral created. Pathway adhered.",
      "step": "ACTION",
      "transition": "ACTION_PENDING -> COMPLETED",
      "actor": "action-worker"
    }
  ],
  "logs": [
    {
      "index": 1,
      "at": "2026-04-26T12:10:03.276Z",
      "step": "INTAKE",
      "transition": "CREATED -> QUEUED",
      "actor": "system",
      "message": "Patient reported lower back pain (pain level 3/10, red flags: no). Workflow created and queued for routing.",
      "route": "MSK",
      "plan": null,
      "actualCare": null,
      "isAdhered": null
    },
    {
      "index": 2,
      "at": "2026-04-26T12:10:03.378Z",
      "step": "ROUTE",
      "transition": "ROUTING -> DECISION_PENDING",
      "actor": "route-worker",
      "message": "Routed to MSK pathway (confidence 0.95). Keyword match - deterministic rules",
      "route": "MSK",
      "plan": null,
      "actualCare": null,
      "isAdhered": null
    },
    {
      "index": 3,
      "at": "2026-04-26T12:10:03.474Z",
      "step": "DECISION",
      "transition": "DECISION_PENDING -> ACTION_PENDING",
      "actor": "decision-worker",
      "message": "PT_FIRST selected because Pain score is mild to moderate and no red flags are present. No prior failed PT history is recorded, so conservative care is first-line. Recommended care: PT referral created.",
      "route": "MSK",
      "plan": "PT_FIRST",
      "actualCare": null,
      "isAdhered": null
    },
    {
      "index": 4,
      "at": "2026-04-26T12:10:03.503Z",
      "step": "ACTION",
      "transition": "ACTION_PENDING -> COMPLETED",
      "actor": "action-worker",
      "message": "PT referral created. Pathway adhered.",
      "route": "MSK",
      "plan": "PT_FIRST",
      "actualCare": "PT referral created",
      "isAdhered": true
    }
  ],
  "sections": {
    "timeline": {
      "role": "primary-rich",
      "description": "Human-readable, detailed timeline for UI and audit playback."
    },
    "logs": {
      "role": "compact-aligned",
      "description": "Compact projection of timeline for table/list rendering.",
      "alignment": {
        "with": "timeline",
        "guaranteed": true,
        "fields": [
          "index",
          "step",
          "transition",
          "actor",
          "message"
        ]
      }
    },
    "rawLogs": {
      "role": "audit-debug",
      "description": "Raw transition records with payload snapshots for diagnostics."
    },
    "overview": {
      "role": "final-state",
      "description": "Final aggregate snapshot of input, pathway, decision, action, and adherence."
    }
  },
  "overview": {
    "input": {
      "symptom": "lower back pain",
      "painLevel": 3,
      "duration": "2 weeks",
      "redFlags": false,
      "age": 34,
      "patientId": "patient_001",
      "failedPtHistory": false
    },
    "pathway": {
      "route": "MSK",
      "confidence": 0.95,
      "reasoning": "Keyword match - deterministic rules"
    },
    "decision": {
      "plan": "PT_FIRST",
      "expectedCare": "PT referral created",
      "avoidedPath": null,
      "avoidedReason": null,
      "rationale": {
        "selectedBecause": [
          "Pain score is mild to moderate and no red flags are present.",
          "No prior failed PT history is recorded, so conservative care is first-line."
        ],
        "factors": {
          "route": "MSK",
          "painLevel": 3,
          "redFlags": false,
          "failedPtHistory": false
        }
      },
      "alternatives": [
        {
          "plan": "IMAGING_FIRST",
          "expectedCare": "Imaging referral created",
          "ranking": 2,
          "selected": false,
          "notSelectedReason": "Not selected because no red flags and no high pain threshold trigger were found."
        }
      ],
      "comparison": {
        "compared": true,
        "methodology": "rules-v1",
        "notes": "Structured for future weighted scoring and side-by-side strategy comparison."
      }
    },
    "action": {
      "actualCare": "PT referral created",
      "isDefaultPath": null,
      "overrideReason": null,
      "completedAt": "2026-04-26T12:10:03.498Z"
    },
    "adherence": {
      "isAdhered": true,
      "expectedCare": "PT referral created",
      "actualCare": "PT referral created"
    }
  },
  "responseMeta": {
    "includeQuery": null,
    "rawLogs": {
      "included": false,
      "query": "include=raw",
      "note": "rawLogs are excluded by default and returned only when include=raw is requested."
    }
  }
}
```

---

## 3. Bulk File Ingestion
### POST /api/v1/ingestions
**Request:** `multipart/form-data` with file `claims_sample_ark_emp_1000_demo.csv`.
**Response (202 Accepted):**
```json
{
  "ok": true,
  "status": 202,
  "reused": false,
  "runId": "run_1777205418654_0f841cdd",
  "ingestionStatus": "COMPLETED",
  "totals": {
    "totalRows": 250,
    "validRows": 250,
    "invalidRows": 0,
    "mskFound": 82
  },
  "workflows": [
    "cmofq7xwb0174um7o8xmew1uy",
    "cmofq7xwk0176um7oybipqty3",
    "cmofq7xwq0178um7ovbrqjgtz",
    "cmofq7xwv017aum7o8e6mqf3v",
    "cmofq7xx2017cum7owntirzs6"
  ]
}
```

### GET /api/v1/ingestions/:runId
**Response:**
```json
{
  "id": "cmofq7xcv00zwum7ol2gpxpop",
  "ingestionRunId": "run_1777205418654_0f841cdd",
  "employerName": "Demo Employer",
  "sourceFileName": "claims_sample_ark_emp_1000_demo.csv",
  "status": "DETECTED",
  "totals": {
    "totalRows": 250,
    "validRows": 250,
    "invalidRows": 0,
    "mskFound": 82
  },
  "consistency": {
    "valid": true,
    "idsLinked": true,
    "workflowCountMatchesMsk": true,
    "terminalWorkflowCount": 82,
    "totalWorkflowCount": 82,
    "pendingWorkflowCount": 0,
    "errors": []
  }
}
```

### GET /api/v1/ingestions/:runId/logs
**Response:**
```json
{
  "ingestionRunId": "run_1777205418654_0f841cdd",
  "summary": "File claims_sample_ark_emp_1000_demo.csv received from employer Demo Employer. → 250 rows parsed (250 valid, 0 invalid). → 82 MSK-flagged records detected from 250 valid records.",
  "timeline": [
    {
      "index": 1,
      "step": "FILE_INGESTED",
      "fromState": "NONE",
      "toState": "RECEIVED",
      "actor": "ingestion-service",
      "title": "File Ingested",
      "message": "File claims_sample_ark_emp_1000_demo.csv received from employer Demo Employer.",
      "at": "2026-04-26T12:10:18.659Z"
    },
    {
      "index": 2,
      "step": "RECORDS_PARSED",
      "fromState": "RECEIVED",
      "toState": "PARSED",
      "actor": "ingestion-service",
      "title": "Records Parsed",
      "message": "250 rows parsed (250 valid, 0 invalid).",
      "at": "2026-04-26T12:10:18.824Z"
    },
    {
      "index": 3,
      "step": "MSK_DETECTED",
      "fromState": "PARSED",
      "toState": "DETECTED",
      "actor": "msk-detector-v1",
      "title": "MSK Detection Complete",
      "message": "82 MSK-flagged records detected from 250 valid records.",
      "at": "2026-04-26T12:10:19.332Z"
    }
  ],
  "logs": [
    {
      "id": "cmofq7xcy00zyum7ovzgwbwkr",
      "step": "FILE_INGESTED",
      "actor": "ingestion-service",
      "message": "File claims_sample_ark_emp_1000_demo.csv received from employer Demo Employer.",
      "createdAt": "2026-04-26T12:10:18.659Z"
    },
    {
      "id": "cmofq7xhk016yum7o1c2lui00",
      "step": "RECORDS_PARSED",
      "actor": "ingestion-service",
      "message": "250 rows parsed (250 valid, 0 invalid).",
      "createdAt": "2026-04-26T12:10:18.824Z"
    },
    {
      "id": "cmofq7xvo0172um7ok5nwadim",
      "step": "MSK_DETECTED",
      "actor": "msk-detector-v1",
      "message": "82 MSK-flagged records detected from 250 valid records.",
      "createdAt": "2026-04-26T12:10:19.332Z"
    }
  ]
}
```
