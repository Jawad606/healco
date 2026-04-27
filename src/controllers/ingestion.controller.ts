import multer from 'multer';
import { Request, Response } from 'express';
import { z } from 'zod';
import { getIngestionRun, ingestEmployerFile, listIngestionRuns } from '../services/ingestion.service';
import { getIngestionLogsWithSummary } from '../services/governance.service';

const upload = multer({ storage: multer.memoryStorage() });

export const uploadIngestionFile = upload.single('file');

const ingestionMetaSchema = z.object({
  employerName: z.string().min(1)
});

export async function createIngestion(req: Request, res: Response) {
  const parsedMeta = ingestionMetaSchema.safeParse(req.body);
  if (!parsedMeta.success) {
    return res.status(400).json({
      code: 'VALIDATION_FAILED',
      message: 'employerName is required.',
      details: parsedMeta.error.flatten()
    });
  }

  if (!req.file) {
    return res.status(400).json({
      code: 'VALIDATION_FAILED',
      message: 'file is required.'
    });
  }

  const result = await ingestEmployerFile({
    employerName: parsedMeta.data.employerName,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    fileBuffer: req.file.buffer
  });

  if (!result.ok) {
    return res.status(result.status).json(result);
  }

  return res.status(result.status).json(result);
}

export async function getIngestion(req: Request, res: Response) {
  const run = await getIngestionRun(String(req.params.runId));
  if (!run) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Ingestion run not found.' });
  }

  return res.json(run);
}

export async function listIngestions(req: Request, res: Response) {
  const status = req.query.status ? String(req.query.status) : undefined;
  const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
  const offset = Number.parseInt(String(req.query.offset ?? '0'), 10);

  const runs = await listIngestionRuns({ status, limit, offset });
  return res.json(runs);
}

export async function getIngestionLogs(req: Request, res: Response) {
  const run = await getIngestionRun(String(req.params.runId));
  if (!run) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Ingestion run not found.' });
  }

  const result = await getIngestionLogsWithSummary(run.id);

  return res.json({
    ingestionRunId: req.params.runId,
    canonical: run.canonical,
    consistency: run.consistency,
    summary: result.summary,
    timeline: result.logs.map((log, index) => ({
      index: index + 1,
      step: log.step,
      fromState: log.fromState,
      toState: log.toState,
      actor: log.actor,
      title: log.title,
      message: log.message,
      at: log.createdAt
    })),
    logs: result.logs
  });
}
