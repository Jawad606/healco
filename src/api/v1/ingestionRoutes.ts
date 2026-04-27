import { Router } from 'express';
import {
  createIngestion,
  getIngestion,
  listIngestions,
  getIngestionLogs,
  uploadIngestionFile
} from '../../controllers/ingestion.controller';

export const ingestionRoutes = Router();

ingestionRoutes.get('/ingestions', listIngestions);
ingestionRoutes.post('/ingestions', uploadIngestionFile, createIngestion);
ingestionRoutes.get('/ingestions/:runId', getIngestion);
ingestionRoutes.get('/ingestions/:runId/logs', getIngestionLogs);
