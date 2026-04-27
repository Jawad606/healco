# Client Validation Outputs

This note captures the live validation results for the Vagabond PropCo employer data packet and the key API/governance outputs the client asked to review.

## Dataset Used

- File: `vagabond_propco_employer_data_packet - Claims_2025.csv`
- Employer: `Vagabond PropCo`
- Run date: `2026-04-27`

## Validation Summary

- Rows processed: `603`
- Valid rows: `603`
- Invalid rows: `0`
- MSK records detected: `130`
- Workflows created: `130`
- Governance / consistency status: `valid`

## Original API Response: Create Ingestion

```json

{
    "ok": true,
    "status": 202,
    "reused": false,
    "runId": "run_1777310849878_fc6bde03",
    "ingestionStatus": "COMPLETED",
    "totals": {
        "totalRows": 603,
        "validRows": 603,
        "invalidRows": 0,
        "mskFound": 130
    },
    "workflows": [
        "cmohgzpdl00h1umusbjbyj0nh",
        "cmohgzpe800h3umuslqo02lbd",
        "cmohgzped00h5umus87766yul",
        "cmohgzpei00h7umuso9jqcypb",
        "cmohgzpem00h9umusl6swy9sh",
        "cmohgzpeq00hbumusfg09cex9",
        "cmohgzpeu00hdumushsxnpoum",
        "cmohgzpey00hfumusbxdiqh3u",
        "cmohgzpf200hhumus51i7j718",
        "cmohgzpf600hjumusduxoqc3w",
        "cmohgzpf900hlumusl4nyuz43",
        "cmohgzpfd00hnumusrinw72ux",
        "cmohgzpfh00hpumuswshciozw",
        "cmohgzpfk00hrumus3fbc50aq",
        "cmohgzpfo00htumus2na9aoyw",
        "cmohgzpfs00hvumusnh7i1hlg",
        "cmohgzpfw00hxumusbsuu4ln9",
        "cmohgzpfz00hzumusovkgq3ep",
        "cmohgzpg300i1umusm0uk4f8q",
        "cmohgzpg700i3umusyhydpz8r",
        "cmohgzpgc00i5umusd3o52mad",
        "cmohgzpgf00i7umusvozhfhm8",
        "cmohgzpgj00i9umustfgsdgyq",
        "cmohgzpgm00ibumusgst6ay4a",
        "cmohgzpgp00idumushqknsrwa",
        "cmohgzpgt00ifumusbklvlu3z",
        "cmohgzpgx00ihumus5wjmgq0d",
        "cmohgzph100ijumus67hmri87",
        "cmohgzph400ilumus7gkuu2q6",
        "cmohgzph800inumusw02x3f8x",
        "cmohgzphc00ipumusry9z7v1s",
        "cmohgzphg00irumusv3s908w1",
        "cmohgzphj00itumusseub4p9n",
        "cmohgzphm00ivumussncnhjbc",
        "cmohgzphr00ixumusiddgg13v",
        "cmohgzphu00izumusarce7gwb",
        "cmohgzphy00j1umusrysl7xm0",
        "cmohgzpi100j3umusgjqb8zm1",
        "cmohgzpi400j5umusg0qqcdp1",
        "cmohgzpi800j7umusz2mr78ra",
        "cmohgzpib00j9umus6dpmu4hg",
        "cmohgzpie00jbumusmk6ru721",
        "cmohgzpii00jdumus0tpbah1p",
        "cmohgzpil00jfumuss4z4ryla",
        "cmohgzpip00jhumussx9530xm",
        "cmohgzpis00jjumus83zdpdp3",
        "cmohgzpiv00jlumusm174s1in",
        "cmohgzpix00jnumuspv66zxy6",
        "cmohgzpj100jpumusbixmyx75",
        "cmohgzpj400jrumusqlsjazni",
        "cmohgzpj800jtumus03rhxls8",
        "cmohgzpjb00jvumusixic2rdf",
        "cmohgzpje00jxumusfptqn7xe",
        "cmohgzpji00jzumus6yuy3hn7",
        "cmohgzpjm00k1umusbl1og4p9",
        "cmohgzpjr00k3umuspbhic364",
        "cmohgzpjv00k5umus93xwrsb5",
        "cmohgzpk000k7umusm5eew9ps",
        "cmohgzpk400k9umusgw0h6rqw",
        "cmohgzpk900kbumusgqspep6u",
        "cmohgzpkd00kdumushy6gi377",
        "cmohgzpkh00kfumusiyh9tmeh",
        "cmohgzpkm00khumusbfagpbwu",
        "cmohgzpkq00kjumustnisojhz",
        "cmohgzpku00klumus4rmgq5ms",
        "cmohgzpky00knumusj1bsosyh",
        "cmohgzpl200kpumus8ola7n7u",
        "cmohgzpl500krumus94l01z8r",
        "cmohgzpl900ktumushpj5k9kt",
        "cmohgzple00kvumusrfjhuysi",
        "cmohgzplk00kxumus84fmyq8o",
        "cmohgzplq00kzumusjn81z9il",
        "cmohgzplw00l1umusmxbbvmks",
        "cmohgzpm200l3umusiubam8i2",
        "cmohgzpm900l5umusrjjzftek",
        "cmohgzpmh00l7umusdcszgy4k",
        "cmohgzpmo00l9umuswdl7v3y0",
        "cmohgzpmu00lbumus9cfp2xzg",
        "cmohgzpn000ldumus4civ6brw",
        "cmohgzpn700lfumuszn84hqru",
        "cmohgzpne00lhumusbmhiva3q",
        "cmohgzpnk00ljumusgt8ktgw8",
        "cmohgzpnr00llumuswcq30q57",
        "cmohgzpny00lnumuszdpu9hen",
        "cmohgzpo500lpumusbj76du97",
        "cmohgzpoc00lrumusrugmm4lv",
        "cmohgzpoi00ltumusydz4zm1l",
        "cmohgzpor00lvumuswjwgzzcy",
        "cmohgzpoy00lxumusdqvrdh1n",
        "cmohgzpp400lzumusrqcc2rib",
        "cmohgzppa00m1umuszamqimy7",
        "cmohgzppg00m3umusitpc042k",
        "cmohgzppn00m5umuszxte6itk",
        "cmohgzppv00m7umussmwfdzy3",
        "cmohgzpq200m9umusd4t3j6ro",
        "cmohgzpq800mbumusqlyx4zoh",
        "cmohgzpqc00mdumuszw9eq1ft",
        "cmohgzpqj00mfumusgsekpn0a",
        "cmohgzpqo00mhumus38enqec3",
        "cmohgzpqt00mjumusxezkiy2u",
        "cmohgzpqx00mlumusrrtx6wuj",
        "cmohgzpr100mnumus91lyl0y1",
        "cmohgzpr600mpumusu6nvvdmr",
        "cmohgzpra00mrumus355sz04d",
        "cmohgzpre00mtumuspsbqr2qs",
        "cmohgzprj00mvumussq1la954",
        "cmohgzprm00mxumusvlv59a8j",
        "cmohgzprp00mzumus2enr4ebe",
        "cmohgzprs00n1umus1sasoeol",
        "cmohgzprw00n3umusqk6je3hv",
        "cmohgzprz00n5umusez4k7zhi",
        "cmohgzps400n7umusgqubea6w",
        "cmohgzps700n9umusw36h65ay",
        "cmohgzpsb00nbumus1wl7cbq1",
        "cmohgzpsf00ndumusnzlr211v",
        "cmohgzpsi00nfumusug43qcr0",
        "cmohgzpsm00nhumusswx7a1gi",
        "cmohgzpso00njumusq9qxhwx7",
        "cmohgzpss00nlumusy17lc929",
        "cmohgzpsw00nnumusp8ra5k8e",
        "cmohgzpt000npumus6vxbgr6c",
        "cmohgzpt400nrumusv7dmow6x",
        "cmohgzpt900ntumushnssw4hh",
        "cmohgzptg00nvumus0bdy019d",
        "cmohgzpto00nxumusa8n5sev3",
        "cmohgzptu00nzumusern2kxqt",
        "cmohgzpty00o1umusmvedbj25",
        "cmohgzpu200o3umus2jk80tph",
        "cmohgzpu500o5umusrinzcuni",
        "cmohgzpua00o7umusledlrfat"
    ],
    "failures": []
}
```
## Original API Response: Ingestion Summary

```json
{
    "id": "cmohgzom00000umusc3f7j6lt",
    "ingestionRunId": "run_1777310849878_fc6bde03",
    "employerName": "HealCo Employer",
    "sourceFileName": "vagabond_propco_employer_data_packet - Claims_2025.csv",
    "status": "COMPLETED",
    "totals": {
        "totalRows": 603,
        "validRows": 603,
        "invalidRows": 0,
        "mskFound": 130
    },
    "timestamps": {
        "ingestionStartedAt": "2026-04-27T17:27:29.880Z",
        "ingestionCompletedAt": "2026-04-27T17:27:31.475Z",
        "createdAt": "2026-04-27T17:27:29.880Z",
        "updatedAt": "2026-04-27T17:27:31.476Z"
    },
    "workflows": [
        {
            "workflowId": "cmohgzpdl00h1umusbjbyj0nh",
            "traceId": "adfa30c9-1344-4572-9d95-4e6ff72d21e0",
            "status": "COMPLETED",
            "completedAt": "2026-04-27T17:27:31.320Z",
            "createdAt": "2026-04-27T17:27:30.873Z"
        },
        {
            "workflowId": "cmohgzpe800h3umuslqo02lbd",
            "traceId": "fb278a0f-e1ea-4aa8-80e9-8cf5734dbb97",
            "status": "COMPLETED",
            "completedAt": "2026-04-27T17:27:31.371Z",
            "createdAt": "2026-04-27T17:27:30.896Z"
        },
    ],
    "canonical": {
        "ids": {
            "ingestionRunId": "run_1777310849878_fc6bde03",
            "workflowId": "cmohgzpua00o7umusledlrfat",
            "traceId": "1c7af48e-9988-4a40-95c8-df62b330a711"
        },
        "pathway": {
            "selectedPathway": "GENERAL",
            "confidence": 0.95,
            "avoidedPath": "HOSPITAL_FIRST",
            "avoidedReason": "Hospital-first pathway avoided because symptoms do not meet inpatient admission criteria."
        },
        "decision": {
            "plan": "GENERAL_REVIEW",
            "expectedCare": "General referral created",
            "rationale": [
                "Symptoms did not match a specialized pathway with sufficient confidence."
            ],
            "alternatives": [
                {
                    "plan": "PT_FIRST",
                    "ranking": 2,
                    "selected": false,
                    "expectedCare": "PT referral created",
                    "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                },
                {
                    "plan": "IMAGING_FIRST",
                    "ranking": 3,
                    "selected": false,
                    "expectedCare": "Imaging referral created",
                    "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                }
            ]
        },
        "action": {
            "actualCare": "General referral created",
            "isDefaultPath": true,
            "overrideReason": null
        },
        "adherence": {
            "isAdhered": true,
            "expectedCare": "General referral created",
            "actualCare": "General referral created"
        },
        "status": {
            "ingestionStatus": "COMPLETED",
            "workflowStatus": "COMPLETED"
        },
        "metrics": {
            "totalProcessed": 603,
            "mskFound": 130
        },
        "timestamps": {
            "ingestionStartedAt": "2026-04-27T17:27:29.880Z",
            "ingestionCompletedAt": "2026-04-27T17:27:31.475Z",
            "routeAt": null,
            "decisionAt": null,
            "actionAt": null
        },
        "summary": "Ingestion is COMPLETED. MSK flagged records: 130. Selected pathway: GENERAL. Decision: GENERAL_REVIEW. Expected care: General referral created. Actual care: General referral created. Workflow is COMPLETED."
    },
    "consistency": {
        "valid": true,
        "idsLinked": true,
        "workflowCountMatchesMsk": true,
        "logsLinked": true,
        "timelineMonotonic": true,
        "decisionActionAligned": true,
        "runStateCoherent": true,
        "terminalWorkflowCount": 130,
        "totalWorkflowCount": 130,
        "pendingWorkflowCount": 0,
        "errors": []
    },
    "failures": []
}
```
## Original Ingested logs
```json
{
    "ingestionRunId": "run_1777310849878_fc6bde03",
    "canonical": {
        "ids": {
            "ingestionRunId": "run_1777310849878_fc6bde03",
            "workflowId": "cmohgzpua00o7umusledlrfat",
            "traceId": "1c7af48e-9988-4a40-95c8-df62b330a711"
        },
        "pathway": {
            "selectedPathway": "GENERAL",
            "confidence": 0.95,
            "avoidedPath": "HOSPITAL_FIRST",
            "avoidedReason": "Hospital-first pathway avoided because symptoms do not meet inpatient admission criteria."
        },
        "decision": {
            "plan": "GENERAL_REVIEW",
            "expectedCare": "General referral created",
            "rationale": [
                "Symptoms did not match a specialized pathway with sufficient confidence."
            ],
            "alternatives": [
                {
                    "plan": "PT_FIRST",
                    "ranking": 2,
                    "selected": false,
                    "expectedCare": "PT referral created",
                    "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                },
                {
                    "plan": "IMAGING_FIRST",
                    "ranking": 3,
                    "selected": false,
                    "expectedCare": "Imaging referral created",
                    "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                }
            ]
        },
        "action": {
            "actualCare": "General referral created",
            "isDefaultPath": true,
            "overrideReason": null
        },
        "adherence": {
            "isAdhered": true,
            "expectedCare": "General referral created",
            "actualCare": "General referral created"
        },
        "status": {
            "ingestionStatus": "COMPLETED",
            "workflowStatus": "COMPLETED"
        },
        "metrics": {
            "totalProcessed": 603,
            "mskFound": 130
        },
        "timestamps": {
            "ingestionStartedAt": "2026-04-27T17:27:29.880Z",
            "ingestionCompletedAt": "2026-04-27T17:27:31.475Z",
            "routeAt": null,
            "decisionAt": null,
            "actionAt": null
        },
        "summary": "Ingestion is COMPLETED. MSK flagged records: 130. Selected pathway: GENERAL. Decision: GENERAL_REVIEW. Expected care: General referral created. Actual care: General referral created. Workflow is COMPLETED."
    },
    "consistency": {
        "valid": true,
        "idsLinked": true,
        "workflowCountMatchesMsk": true,
        "logsLinked": true,
        "timelineMonotonic": true,
        "decisionActionAligned": true,
        "runStateCoherent": true,
        "terminalWorkflowCount": 130,
        "totalWorkflowCount": 130,
        "pendingWorkflowCount": 0,
        "errors": []
    },
    "summary": "File vagabond_propco_employer_data_packet - Claims_2025.csv received from employer HealCo Employer. → 603 rows parsed (603 valid, 0 invalid). → 130 MSK-flagged records detected from 603 valid records.",
    "timeline": [
        {
            "index": 1,
            "step": "FILE_INGESTED",
            "fromState": "NONE",
            "toState": "RECEIVED",
            "actor": "ingestion-service",
            "title": "File Ingested",
            "message": "File vagabond_propco_employer_data_packet - Claims_2025.csv received from employer HealCo Employer.",
            "at": "2026-04-27T17:27:29.896Z"
        },
        {
            "index": 2,
            "step": "RECORDS_PARSED",
            "fromState": "RECEIVED",
            "toState": "PARSED",
            "actor": "ingestion-service",
            "title": "Records Parsed",
            "message": "603 rows parsed (603 valid, 0 invalid).",
            "at": "2026-04-27T17:27:30.219Z"
        },
        {
            "index": 3,
            "step": "MSK_DETECTED",
            "fromState": "PARSED",
            "toState": "DETECTED",
            "actor": "msk-detector-v1",
            "title": "MSK Detection Complete",
            "message": "130 MSK-flagged records detected from 603 valid records.",
            "at": "2026-04-27T17:27:30.823Z"
        }
    ],
    "logs": [
        {
            "id": "cmohgzomg0002umusyrb1v7y7",
            "workflowId": null,
            "ingestionRunId": "cmohgzom00000umusc3f7j6lt",
            "traceId": "run_1777310849878_fc6bde03",
            "step": "FILE_INGESTED",
            "fromState": "NONE",
            "toState": "RECEIVED",
            "actor": "ingestion-service",
            "title": "File Ingested",
            "narrative": "File vagabond_propco_employer_data_packet - Claims_2025.csv received from employer HealCo Employer.",
            "message": "File vagabond_propco_employer_data_packet - Claims_2025.csv received from employer HealCo Employer.",
            "routingDecision": null,
            "decisionMade": null,
            "actionTaken": null,
            "adherenceResult": null,
            "payloadSnapshot": {
                "fileName": "vagabond_propco_employer_data_packet - Claims_2025.csv",
                "employerName": "HealCo Employer",
                "sourceChecksum": "c3c7219acd09de70782918da1aeb7d64260a604e00dc2a70fe6b5c0e5bae7461",
                "sourceFileType": "CSV"
            },
            "createdAt": "2026-04-27T17:27:29.896Z"
        },
        {
            "id": "cmohgzovf00gvumusl0traau6",
            "workflowId": null,
            "ingestionRunId": "cmohgzom00000umusc3f7j6lt",
            "traceId": "run_1777310849878_fc6bde03",
            "step": "RECORDS_PARSED",
            "fromState": "RECEIVED",
            "toState": "PARSED",
            "actor": "ingestion-service",
            "title": "Records Parsed",
            "narrative": "603 rows parsed (603 valid, 0 invalid).",
            "message": "603 rows parsed (603 valid, 0 invalid).",
            "routingDecision": null,
            "decisionMade": null,
            "actionTaken": null,
            "adherenceResult": null,
            "payloadSnapshot": {
                "totalRows": 603,
                "validRows": 603,
                "invalidRows": 0
            },
            "createdAt": "2026-04-27T17:27:30.219Z"
        },
        {
            "id": "cmohgzpc700gzumushl1b8gn8",
            "workflowId": null,
            "ingestionRunId": "cmohgzom00000umusc3f7j6lt",
            "traceId": "run_1777310849878_fc6bde03",
            "step": "MSK_DETECTED",
            "fromState": "PARSED",
            "toState": "DETECTED",
            "actor": "msk-detector-v1",
            "title": "MSK Detection Complete",
            "narrative": "130 MSK-flagged records detected from 603 valid records.",
            "message": "130 MSK-flagged records detected from 603 valid records.",
            "routingDecision": null,
            "decisionMade": null,
            "actionTaken": null,
            "adherenceResult": null,
            "payloadSnapshot": {
                "mskFound": 130,
                "flaggedCaseIds": [
                    "CLM-00001",
                    "CLM-00002",
                    "CLM-00003",
                    "CLM-00004",
                    "CLM-00005",
                    "CLM-00006",
                    "CLM-00007",
                    "CLM-00008",
                    "CLM-00009",
                    "CLM-00010",
                    "CLM-00011",
                    "CLM-00012",
                    "CLM-00013",
                    "CLM-00014",
                    "CLM-00015",
                    "CLM-00016",
                    "CLM-00017",
                    "CLM-00018",
                    "CLM-00019",
                    "CLM-00020",
                    "CLM-00021",
                    "CLM-00022",
                    "CLM-00025",
                    "CLM-00026",
                    "CLM-00027",
                    "CLM-00029",
                    "CLM-00030",
                    "CLM-00032",
                    "CLM-00033",
                    "CLM-00034",
                    "CLM-00035",
                    "CLM-00036",
                    "CLM-00037",
                    "CLM-00038",
                    "CLM-00039",
                    "CLM-00040",
                    "CLM-00041",
                    "CLM-00042",
                    "CLM-00043",
                    "CLM-00044",
                    "CLM-00045",
                    "CLM-00046",
                    "CLM-00050",
                    "CLM-00051",
                    "CLM-00052",
                    "CLM-00053",
                    "CLM-00056",
                    "CLM-00059",
                    "CLM-00060",
                    "CLM-00061",
                    "CLM-00062",
                    "CLM-00063",
                    "CLM-00064",
                    "CLM-00065",
                    "CLM-00066",
                    "CLM-00067",
                    "CLM-00068",
                    "CLM-00069",
                    "CLM-00070",
                    "CLM-00071",
                    "CLM-00072",
                    "CLM-00074",
                    "CLM-00075",
                    "CLM-00076",
                    "CLM-00077",
                    "CLM-00078",
                    "CLM-00079",
                    "CLM-00080",
                    "CLM-00081",
                    "CLM-00082",
                    "CLM-00083",
                    "CLM-00084",
                    "CLM-00085",
                    "CLM-00086",
                    "CLM-00087",
                    "CLM-00088",
                    "CLM-00089",
                    "CLM-00090",
                    "CLM-00091",
                    "CLM-00092",
                    "CLM-00093",
                    "CLM-00094",
                    "CLM-00095",
                    "CLM-00096",
                    "CLM-00097",
                    "CLM-00098",
                    "CLM-00099",
                    "CLM-00100",
                    "CLM-00101",
                    "CLM-00102",
                    "CLM-00103",
                    "CLM-00104",
                    "CLM-00105",
                    "CLM-00106",
                    "CLM-00107",
                    "CLM-00108",
                    "CLM-00109",
                    "CLM-00110",
                    "CLM-00111",
                    "CLM-00112",
                    "CLM-00113",
                    "CLM-00114",
                    "CLM-00115",
                    "CLM-00116",
                    "CLM-00117",
                    "CLM-00119",
                    "CLM-00120",
                    "CLM-00121",
                    "CLM-00122",
                    "CLM-00123",
                    "CLM-00124",
                    "CLM-00125",
                    "CLM-00126",
                    "CLM-00127",
                    "CLM-00128",
                    "CLM-00129",
                    "CLM-00130",
                    "CLM-00131",
                    "CLM-00132",
                    "CLM-00133",
                    "CLM-00134",
                    "CLM-00135",
                    "CLM-00136",
                    "CLM-00137",
                    "CLM-00138",
                    "CLM-00139",
                    "CLM-00140",
                    "CLM-00141",
                    "CLM-00142",
                    "CLM-00143"
                ],
                "totalProcessed": 603,
                "detectionReasons": [
                    "Diagnosis code M17.11 mapped to MSK v1",
                    "Diagnosis code M48.06 mapped to MSK v1",
                    "Diagnosis code M54.5 mapped to MSK v1",
                    "Diagnosis code M54.16 mapped to MSK v1",
                    "Diagnosis code M51.26 mapped to MSK v1",
                    "Diagnosis code M25.561 mapped to MSK v1",
                    "Diagnosis code M75.41 mapped to MSK v1",
                    "Diagnosis code M75.101 mapped to MSK v1",
                    "Procedure code 97140 mapped to MSK rehab patterns",
                    "Procedure code 97112 mapped to MSK rehab patterns",
                    "Procedure code 97110 mapped to MSK rehab patterns"
                ],
                "flaggedMemberIds": [
                    "M-1116",
                    "M-1382",
                    "M-1202",
                    "M-1066",
                    "M-1424",
                    "M-1123",
                    "M-1266",
                    "M-1199",
                    "M-1008",
                    "M-1265",
                    "M-1260",
                    "M-1173",
                    "M-1155",
                    "M-1215",
                    "M-1050",
                    "M-1405",
                    "M-1142",
                    "M-1130",
                    "M-1279",
                    "M-1350",
                    "M-1160",
                    "M-1322",
                    "M-1450",
                    "M-1019",
                    "M-1194",
                    "M-1010",
                    "M-1184",
                    "M-1201",
                    "M-1037",
                    "M-1034",
                    "M-1104",
                    "M-1294",
                    "M-1211",
                    "M-1236",
                    "M-1394",
                    "M-1021",
                    "M-1020",
                    "M-1180",
                    "M-1318",
                    "M-1117",
                    "M-1465",
                    "M-1428",
                    "M-1161",
                    "M-1420",
                    "M-1107",
                    "M-1134",
                    "M-1231",
                    "M-1100",
                    "M-1355",
                    "M-1097",
                    "M-1025",
                    "M-1323",
                    "M-1157",
                    "M-1006",
                    "M-1340"
                ]
            },
            "createdAt": "2026-04-27T17:27:30.823Z"
        }
    ]
}
```
## Original Workflow Governance Timeline and Logs

```json
{
    "workflowId": "cmofpvqfg00vmum7on3a398as",
    "summary": "Routed to GENERAL pathway because symptom keyword mapping matched deterministic rules (confidence 0.95) → GENERAL_REVIEW selected because: Symptoms did not match a specialized pathway with sufficient confidence. → General referral created completed",
    "timeline": [
        {
            "index": 1,
            "label": "Intake",
            "at": "2026-04-26T12:00:49.805Z",
            "displayLine": "1. [Intake] - 5:00:49 pm",
            "message": "Patient reported musculoskeletal pain (pain level 4/10, red flags: no). Workflow created and queued for routing.",
            "step": "INTAKE",
            "transition": "CREATED -> QUEUED",
            "actor": "system",
            "pathway": {
                "route": "GENERAL",
                "confidence": 0.95,
                "reasoning": "Keyword match - deterministic rules"
            },
            "decision": null,
            "action": null,
            "adherence": null
        },
        {
            "index": 2,
            "label": "GENERAL Routing Complete",
            "at": "2026-04-26T12:00:49.906Z",
            "displayLine": "2. [GENERAL Routing Complete] - 5:00:49 pm",
            "message": "Routed to GENERAL pathway (confidence 0.95). Keyword match - deterministic rules",
            "step": "ROUTE",
            "transition": "ROUTING -> DECISION_PENDING",
            "actor": "route-worker",
            "pathway": {
                "route": "GENERAL",
                "confidence": 0.95,
                "reasoning": "Keyword match - deterministic rules"
            },
            "decision": null,
            "action": null,
            "adherence": null
        },
        {
            "index": 3,
            "label": "GENERAL_REVIEW Selected",
            "at": "2026-04-26T12:00:50.035Z",
            "displayLine": "3. [GENERAL_REVIEW Selected] - 5:00:50 pm",
            "message": "GENERAL_REVIEW selected because Symptoms did not match a specialized pathway with sufficient confidence. Recommended care: General referral created.",
            "step": "DECISION",
            "transition": "DECISION_PENDING -> ACTION_PENDING",
            "actor": "decision-worker",
            "pathway": {
                "route": "GENERAL",
                "confidence": 0.95,
                "reasoning": "Keyword match - deterministic rules"
            },
            "decision": {
                "plan": "GENERAL_REVIEW",
                "expectedCare": "General referral created",
                "avoidedPath": null,
                "avoidedReason": null,
                "rationale": {
                    "selectedBecause": [
                        "Symptoms did not match a specialized pathway with sufficient confidence."
                    ],
                    "factors": {
                        "route": "GENERAL",
                        "painLevel": 4,
                        "redFlags": false,
                        "failedPtHistory": false
                    }
                },
                "alternatives": [
                    {
                        "plan": "PT_FIRST",
                        "expectedCare": "PT referral created",
                        "ranking": 2,
                        "selected": false,
                        "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                    },
                    {
                        "plan": "IMAGING_FIRST",
                        "expectedCare": "Imaging referral created",
                        "ranking": 3,
                        "selected": false,
                        "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
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
            "label": "Action Completed",
            "at": "2026-04-26T12:00:50.273Z",
            "displayLine": "4. [Action Completed] - 5:00:50 pm",
            "message": "General referral created. Pathway adhered.",
            "step": "ACTION",
            "transition": "ACTION_PENDING -> COMPLETED",
            "actor": "action-worker",
            "pathway": {
                "route": "GENERAL",
                "confidence": 0.95,
                "reasoning": "Keyword match - deterministic rules"
            },
            "decision": {
                "plan": "GENERAL_REVIEW",
                "expectedCare": "General referral created",
                "avoidedPath": null,
                "avoidedReason": null,
                "rationale": {
                    "selectedBecause": [
                        "Symptoms did not match a specialized pathway with sufficient confidence."
                    ],
                    "factors": {
                        "route": "GENERAL",
                        "painLevel": 4,
                        "redFlags": false,
                        "failedPtHistory": false
                    }
                },
                "alternatives": [
                    {
                        "plan": "PT_FIRST",
                        "expectedCare": "PT referral created",
                        "ranking": 2,
                        "selected": false,
                        "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                    },
                    {
                        "plan": "IMAGING_FIRST",
                        "expectedCare": "Imaging referral created",
                        "ranking": 3,
                        "selected": false,
                        "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                    }
                ],
                "comparison": {
                    "compared": true,
                    "methodology": "rules-v1",
                    "notes": "Structured for future weighted scoring and side-by-side strategy comparison."
                }
            },
            "action": {
                "actualCare": "General referral created",
                "isDefaultPath": null,
                "overrideReason": null,
                "completedAt": "2026-04-26T12:00:50.270Z"
            },
            "adherence": {
                "isAdhered": true,
                "expectedCare": "General referral created",
                "actualCare": "General referral created"
            }
        }
    ],
    "logs": [
        {
            "index": 1,
            "at": "2026-04-26T12:00:49.805Z",
            "step": "INTAKE",
            "transition": "CREATED -> QUEUED",
            "actor": "system",
            "message": "Patient reported musculoskeletal pain (pain level 4/10, red flags: no). Workflow created and queued for routing.",
            "route": "GENERAL",
            "plan": null,
            "actualCare": null,
            "isAdhered": null
        },
        {
            "index": 2,
            "at": "2026-04-26T12:00:49.906Z",
            "step": "ROUTE",
            "transition": "ROUTING -> DECISION_PENDING",
            "actor": "route-worker",
            "message": "Routed to GENERAL pathway (confidence 0.95). Keyword match - deterministic rules",
            "route": "GENERAL",
            "plan": null,
            "actualCare": null,
            "isAdhered": null
        },
        {
            "index": 3,
            "at": "2026-04-26T12:00:50.035Z",
            "step": "DECISION",
            "transition": "DECISION_PENDING -> ACTION_PENDING",
            "actor": "decision-worker",
            "message": "GENERAL_REVIEW selected because Symptoms did not match a specialized pathway with sufficient confidence. Recommended care: General referral created.",
            "route": "GENERAL",
            "plan": "GENERAL_REVIEW",
            "actualCare": null,
            "isAdhered": null
        },
        {
            "index": 4,
            "at": "2026-04-26T12:00:50.273Z",
            "step": "ACTION",
            "transition": "ACTION_PENDING -> COMPLETED",
            "actor": "action-worker",
            "message": "General referral created. Pathway adhered.",
            "route": "GENERAL",
            "plan": "GENERAL_REVIEW",
            "actualCare": "General referral created",
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
            "symptom": "musculoskeletal pain",
            "painLevel": 4,
            "duration": "unknown",
            "redFlags": false,
            "age": 35,
            "patientId": "m_1092",
            "failedPtHistory": false
        },
        "pathway": {
            "route": "GENERAL",
            "confidence": 0.95,
            "reasoning": "Keyword match - deterministic rules"
        },
        "decision": {
            "plan": "GENERAL_REVIEW",
            "expectedCare": "General referral created",
            "avoidedPath": null,
            "avoidedReason": null,
            "rationale": {
                "selectedBecause": [
                    "Symptoms did not match a specialized pathway with sufficient confidence."
                ],
                "factors": {
                    "route": "GENERAL",
                    "painLevel": 4,
                    "redFlags": false,
                    "failedPtHistory": false
                }
            },
            "alternatives": [
                {
                    "plan": "PT_FIRST",
                    "expectedCare": "PT referral created",
                    "ranking": 2,
                    "selected": false,
                    "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                },
                {
                    "plan": "IMAGING_FIRST",
                    "expectedCare": "Imaging referral created",
                    "ranking": 3,
                    "selected": false,
                    "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                }
            ],
            "comparison": {
                "compared": true,
                "methodology": "rules-v1",
                "notes": "Structured for future weighted scoring and side-by-side strategy comparison."
            }
        },
        "action": {
            "actualCare": "General referral created",
            "isDefaultPath": null,
            "overrideReason": null,
            "completedAt": "2026-04-26T12:00:50.270Z"
        },
        "adherence": {
            "isAdhered": true,
            "expectedCare": "General referral created",
            "actualCare": "General referral created"
        }
    },
    "canonical": {
        "ids": {
            "ingestionRunId": "cmofpvpzy00o4um7o7p1r3tnn",
            "workflowId": "cmofpvqfg00vmum7on3a398as",
            "traceId": "5dd0a24d-3046-4d2c-873e-2ae0590453aa"
        },
        "pathway": {
            "selectedPathway": "GENERAL",
            "confidence": 0.95,
            "avoidedPath": null,
            "avoidedReason": null
        },
        "decision": {
            "plan": "GENERAL_REVIEW",
            "expectedCare": "General referral created",
            "rationale": [
                "Symptoms did not match a specialized pathway with sufficient confidence."
            ],
            "alternatives": [
                {
                    "plan": "PT_FIRST",
                    "ranking": 2,
                    "selected": false,
                    "expectedCare": "PT referral created",
                    "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                },
                {
                    "plan": "IMAGING_FIRST",
                    "ranking": 3,
                    "selected": false,
                    "expectedCare": "Imaging referral created",
                    "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                }
            ]
        },
        "action": {
            "actualCare": "General referral created",
            "isDefaultPath": null,
            "overrideReason": null
        },
        "adherence": {
            "isAdhered": true,
            "expectedCare": "General referral created",
            "actualCare": "General referral created"
        },
        "status": {
            "ingestionStatus": null,
            "workflowStatus": "COMPLETED"
        },
        "metrics": {
            "totalProcessed": null,
            "mskFound": null
        },
        "timestamps": {
            "ingestionStartedAt": null,
            "ingestionCompletedAt": null,
            "routeAt": "2026-04-26T12:00:49.906Z",
            "decisionAt": "2026-04-26T12:00:50.035Z",
            "actionAt": "2026-04-26T12:00:50.273Z"
        },
        "summary": "Selected pathway: GENERAL. Decision: GENERAL_REVIEW. Expected care: General referral created. Actual care: General referral created. Workflow is COMPLETED."
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

## Original Workflow Log Response

```json
{
    "id": "cmofpvqfg00vmum7on3a398as",
    "ingestionRunId": "cmofpvpzy00o4um7o7p1r3tnn",
    "traceId": "5dd0a24d-3046-4d2c-873e-2ae0590453aa",
    "status": "COMPLETED",
    "input": {
        "symptom": "musculoskeletal pain",
        "painLevel": 4,
        "duration": "unknown",
        "redFlags": false,
        "age": 35,
        "patientId": "m_1092",
        "failedPtHistory": false
    },
    "pathway": {
        "route": "GENERAL",
        "confidence": 0.95,
        "reasoning": "Keyword match - deterministic rules"
    },
    "decision": {
        "plan": "GENERAL_REVIEW",
        "expectedCare": "General referral created",
        "avoidedPath": null,
        "avoidedReason": null,
        "rationale": {
            "selectedBecause": [
                "Symptoms did not match a specialized pathway with sufficient confidence."
            ],
            "factors": {
                "route": "GENERAL",
                "painLevel": 4,
                "redFlags": false,
                "failedPtHistory": false
            }
        },
        "alternatives": [
            {
                "plan": "PT_FIRST",
                "expectedCare": "PT referral created",
                "ranking": 2,
                "selected": false,
                "notSelectedReason": "Not selected because routing did not classify this case as MSK."
            },
            {
                "plan": "IMAGING_FIRST",
                "expectedCare": "Imaging referral created",
                "ranking": 3,
                "selected": false,
                "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
            }
        ],
        "comparison": {
            "compared": true,
            "methodology": "rules-v1",
            "notes": "Structured for future weighted scoring and side-by-side strategy comparison."
        }
    },
    "action": {
        "actualCare": "General referral created",
        "isDefaultPath": null,
        "overrideReason": null,
        "completedAt": "2026-04-26T12:00:50.270Z"
    },
    "adherence": {
        "isAdhered": true,
        "expectedCare": "General referral created",
        "actualCare": "General referral created"
    },
    "canonical": {
        "ids": {
            "ingestionRunId": "cmofpvpzy00o4um7o7p1r3tnn",
            "workflowId": "cmofpvqfg00vmum7on3a398as",
            "traceId": "5dd0a24d-3046-4d2c-873e-2ae0590453aa"
        },
        "pathway": {
            "selectedPathway": "GENERAL",
            "confidence": 0.95,
            "avoidedPath": null,
            "avoidedReason": null
        },
        "decision": {
            "plan": "GENERAL_REVIEW",
            "expectedCare": "General referral created",
            "rationale": [
                "Symptoms did not match a specialized pathway with sufficient confidence."
            ],
            "alternatives": [
                {
                    "plan": "PT_FIRST",
                    "ranking": 2,
                    "selected": false,
                    "expectedCare": "PT referral created",
                    "notSelectedReason": "Not selected because routing did not classify this case as MSK."
                },
                {
                    "plan": "IMAGING_FIRST",
                    "ranking": 3,
                    "selected": false,
                    "expectedCare": "Imaging referral created",
                    "notSelectedReason": "Not selected because high-risk escalation criteria were not met."
                }
            ]
        },
        "action": {
            "actualCare": "General referral created",
            "isDefaultPath": null,
            "overrideReason": null
        },
        "adherence": {
            "isAdhered": true,
            "expectedCare": "General referral created",
            "actualCare": "General referral created"
        },
        "status": {
            "ingestionStatus": null,
            "workflowStatus": "COMPLETED"
        },
        "metrics": {
            "totalProcessed": null,
            "mskFound": null
        },
        "timestamps": {
            "ingestionStartedAt": null,
            "ingestionCompletedAt": null,
            "routeAt": null,
            "decisionAt": null,
            "actionAt": "2026-04-26T12:00:50.270Z"
        },
        "summary": "Selected pathway: GENERAL. Decision: GENERAL_REVIEW. Expected care: General referral created. Actual care: General referral created. Workflow is COMPLETED."
    },
    "retryCount": 0,
    "timestamps": {
        "createdAt": "2026-04-26T12:00:49.805Z",
        "updatedAt": "2026-04-26T12:00:50.271Z",
        "completedAt": "2026-04-26T12:00:50.270Z"
    }
}
```

## API Test Output

This is the real output from `npm run test:api` after the employer packet CSV support was added.

```text
Running Original API Scenario (Core Checks)
PASS: Original API scenario checks completed successfully.

[TEST 1] Timeline Progression Clean: Intake → Route → Decision → Action
  ✓ Steps in correct order: INTAKE → ROUTE → DECISION → ACTION
  ✓ No early decision/action population
  ✓ Each step has only expected fields populated

[TEST 2] Decision → Action Immediately After Route
  ✓ DECISION appears immediately after ROUTE with PT_FIRST plan
  ✓ ACTION appears immediately after DECISION with PT referral
  ✓ Decision expectedCare matches Action actualCare

[TEST 3] Consistency Across All Sections
  ✓ Main response action.completedAt matches timestamps.completedAt
  ✓ Timeline action.completedAt matches main action.completedAt
  ✓ All completedAt values are consistent across sections

[TEST 4] Response Cleanliness
  ✓ rawLogs not included by default
  ✓ rawLogs not included when not in include query
  ✓ rawLogs included only when explicitly requested
  ✓ All expected steps present
  ✓ Timeline and logs perfectly aligned (index, step, at)
  ✓ Response sections and metadata correct

[WAVE 1] Stable Happy-Path Ingestion
  ✓ Upload, parse, detect, and workflow bridge completed

[WAVE 2] Scenario Hardening (No-MSK + Invalid File)
  ✓ No-MSK path closes cleanly with mskFound=0
  ✓ Empty and bad-header files fail cleanly with actionable error payloads

[WAVE 3] Consistency Lock (API / DB / Governance Surface)
  ✓ Consistency checks passed for ids and run-workflow count alignment

ALL E2E TESTS PASSED ✓
```

## Notes

- The workbook was consumed successfully after adding support for the employer-packet CSV shape.
- The run completed cleanly with no invalid rows and no consistency errors.
- The workflow timeline and compact logs remain aligned for audit playback and client review.