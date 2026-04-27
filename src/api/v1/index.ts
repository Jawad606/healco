import { Router } from 'express';
import { workflowRoutes } from './workflowRoutes';
import { ingestionRoutes } from './ingestionRoutes';

export const v1Router = Router();

v1Router.use('/', workflowRoutes);
v1Router.use('/', ingestionRoutes);