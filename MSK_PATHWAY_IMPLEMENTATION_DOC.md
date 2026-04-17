# HealCo MSK Pathway - Implementation Doc

## 1. Objective

Deliver a working end-to-end flow for one pathway:

- MSK pathway (lower back pain)
- Intake -> Route -> Decision -> Action -> Governance Log
- Persisted in DB
- Traceable in logs
- Consistent across API and DB

## 2. Scope Delivered

- End-to-end orchestration for MSK demo flow
- Repository-backed persistence with idempotent create behavior
- UI-ready workflow response with normalized sections
- Governance timeline for readability plus raw logs for audit/debug
- Explicit decision rationale and future-ready alternatives/comparison shape

## 3. Workflow Stages

1. Intake: create workflow with idempotency key and input payload.
2. Route: classify pathway using deterministic symptom rules.
3. Decision: select plan with rationale and alternative options.
4. Action: execute expected care and record adherence.

## 4. API Endpoints

- `POST /api/v1/workflows`
- `GET /api/v1/workflows/:id`
- `GET /api/v1/workflows/:id/logs`
- `GET /api/v1/workflows?status=COMPLETED&limit=20&offset=0`

## 5. Example Requests and Responses

### 5.1 Create Workflow

Request:

```http
POST /api/v1/workflows
Content-Type: application/json

{
  "idempotencyKey": "demo-key-001",
  "payload": {
    "patient_id": "patient_001",
    "symptom": "lower back pain",
    "pain_level": 3,
    "duration": "2 weeks",
    "red_flags": false,
    "age": 34,
    "failed_pt_history": false
  }
}
```

Response:

```json
{
  "workflowId": "cmo15ay910001umco7wqlhr5j",
  "status": "INITIATED"
}
```

### 5.2 Get Workflow (UI-ready shape)

Request:

```http
GET /api/v1/workflows/cmo15ay910001umco7wqlhr5j
```

Response:

```json
{
  "id": "cmo15ay910001umco7wqlhr5j",
  "traceId": "70f64db8-8f35-4321-bdcd-e97f3495e5ca",
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
    "completedAt": "2026-04-16T07:16:01.436Z"
  },
  "adherence": {
    "isAdhered": true,
    "expectedCare": "PT referral created",
    "actualCare": "PT referral created"
  },
  "retryCount": 0,
  "timestamps": {
    "createdAt": "2026-04-16T07:16:01.381Z",
    "updatedAt": "2026-04-16T07:16:01.437Z",
    "completedAt": "2026-04-16T07:16:01.436Z"
  }
}
```

### 5.3 Get Governance Logs (timeline + raw logs)

Request:

```http
GET /api/v1/workflows/cmo15ay910001umco7wqlhr5j/logs
```

Response:

```json
{
  "workflowId": "cmo15ay910001umco7wqlhr5j",
  "summary": "Routed to MSK pathway because symptom keyword mapping matched deterministic rules (confidence 0.95) -> PT_FIRST selected because: Pain score is mild to moderate and no red flags are present. | No prior failed PT history is recorded, so conservative care is first-line. -> PT referral created completed",
  "timeline": [
    {
      "index": 1,
      "label": "Intake",
      "at": "2026-04-16T07:16:01.381Z",
      "displayLine": "1. [Intake] - 10:56:17 am",
      "message": "Patient reported lower back pain (pain level 3/10, red flags: no). Workflow created and queued for routing.",
      "step": "INTAKE",
      "transition": "CREATED -> QUEUED",
      "actor": "system",
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": null,
      "action": null,
      "adherence": null
    },
    {
      "index": 2,
      "label": "Route",
      "at": "2026-04-16T07:16:01.425Z",
      "displayLine": "2. [Route] - 10:56:17 am",
      "message": "Symptoms matched MSK Spine Pathway criteria. No red flags detected. Patient assigned to MSK Spine Pathway automatically.",
      "step": "ROUTE",
      "transition": "ROUTING -> DECISION_PENDING",
      "actor": "route-worker",
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": null,
      "action": null,
      "adherence": null
    },
    {
      "index": 3,
      "label": "Decision",
      "at": "2026-04-16T07:16:01.433Z",
      "displayLine": "3. [Decision] - 10:56:17 am",
      "message": "PT-first pathway selected. Pain score is mild to moderate and no red flags are present. No prior failed PT history is recorded, so conservative care is first-line. Telehealth Physical Therapy recommended as first line of care.",
      "step": "DECISION",
      "transition": "DECISION_PENDING -> ACTION_PENDING",
      "actor": "decision-worker",
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": {
        "plan": "PT_FIRST",
        "expectedCare": "PT referral created",
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
      "action": null,
      "adherence": null
    },
    {
      "index": 4,
      "label": "Action",
      "at": "2026-04-16T07:16:01.438Z",
      "displayLine": "4. [Action] - 10:56:18 am",
      "message": "Referral created for City PT Clinic (Telehealth, In-Network). Care navigator notified. Workflow completed. No overrides. Pathway adhered.",
      "step": "ACTION",
      "transition": "ACTION_PENDING -> COMPLETED",
      "actor": "action-worker",
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": {
        "plan": "PT_FIRST",
        "expectedCare": "PT referral created",
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
        "completedAt": null
      },
      "adherence": {
        "isAdhered": true,
        "expectedCare": "PT referral created",
        "actualCare": "PT referral created"
      }
    }
  ],
  "logs": [
    {
      "index": 1,
      "label": "Intake",
      "at": "2026-04-16T07:16:01.381Z",
      "displayLine": "1. [Intake] - 10:56:17 am",
      "message": "Patient reported lower back pain (pain level 3/10, red flags: no). Workflow created and queued for routing.",
      "step": "INTAKE",
      "transition": "CREATED -> QUEUED",
      "actor": "system",
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": null,
      "action": null,
      "adherence": null
    }
  ],
  "rawLogs": [
    {
      "id": "cmo15aya90007ummou9thness",
      "workflowId": "cmo15ay910001umco7wqlhr5j",
      "traceId": "70f64db8-8f35-4321-bdcd-e97f3495e5ca",
      "fromState": "ROUTING",
      "toState": "DECISION_PENDING",
      "actor": "route-worker",
      "narrative": "Routed to MSK pathway because symptom keyword mapping matched deterministic rules (confidence 0.95)",
      "payloadSnapshot": {
        "input": {
          "age": 34,
          "symptom": "lower back pain",
          "duration": "2 weeks",
          "red_flags": false,
          "pain_level": 3,
          "patient_id": "patient_001",
          "failed_pt_history": false
        },
        "routingDecision": {
          "route": "MSK",
          "reasoning": "Keyword match - deterministic rules",
          "confidence": 0.95
        }
      },
      "pathway": {
        "route": "MSK",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
      },
      "decision": null,
      "createdAt": "2026-04-16T07:16:01.425Z"
    }
  ],
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
      "completedAt": null
    },
    "adherence": {
      "isAdhered": true,
      "expectedCare": "PT referral created",
      "actualCare": "PT referral created"
    }
  }
}
```

### 5.4 List Completed Workflows

Request:

```http
GET /api/v1/workflows?status=COMPLETED&limit=20&offset=0
```

Response shape:

```json
[
  {
    "id": "...",
    "traceId": "...",
    "status": "COMPLETED",
    "input": {
      "symptom": "...",
      "painLevel": 0,
      "duration": "...",
      "redFlags": false,
      "age": 0,
      "patientId": "...",
      "failedPtHistory": null
    },
    "pathway": {
      "route": "...",
      "confidence": 0,
      "reasoning": "..."
    },
    "decision": {
      "plan": "...",
      "expectedCare": "...",
      "rationale": {
        "selectedBecause": [],
        "factors": {
          "route": "...",
          "painLevel": 0,
          "redFlags": false,
          "failedPtHistory": false
        }
      },
      "alternatives": [],
      "comparison": {
        "compared": false,
        "methodology": "rules-v1",
        "notes": "..."
      }
    },
    "action": {
      "actualCare": "...",
      "completedAt": "..."
    },
    "adherence": {
      "isAdhered": true,
      "expectedCare": "...",
      "actualCare": "..."
    },
    "retryCount": 0,
    "timestamps": {
      "createdAt": "...",
      "updatedAt": "...",
      "completedAt": "..."
    }
  }
]
```

## 6. Consistency Notes

- API and DB stay consistent through repository-backed persistence.
- `idempotencyKey` prevents duplicate workflow creation for repeated create requests.
- `traceId` links one workflow across all governance entries.
- API response shape is UI-ready with explicit `pathway`, `decision`, `action`, and `adherence` fields.
- Decision output includes explicit rationale and future-ready alternatives/comparison structure.
- Governance logs are returned as a readable timeline plus raw log detail for drill-down.

## 7. Out of Scope (intentionally not included)

- UI or dashboard changes
- Additional pathways beyond MSK primary flow
- LLM decisioning
- Reporting and performance optimization

## 8. Ready for Client Review

- End-to-end MSK flow is operational.
- API contract is stable for create, get, list, and logs.
- Governance output is readable, traceable, and rationale-aware.
- Final action captures adherence for auditability.
