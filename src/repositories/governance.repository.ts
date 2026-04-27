import { prisma } from '../core/db';
import { Prisma } from '@prisma/client';

export class GovernanceRepository {
  async create(
    data: {
      workflowId?: string | null;
      ingestionRunId?: string | null;
      traceId: string;
      step: string;
      fromState: string;
      toState: string;
      actor: string;
      title: string;
      narrative: string;
      message: string;
      routingDecision?: any;
      decisionMade?: any;
      actionTaken?: any;
      adherenceResult?: any;
      payloadSnapshot: any;
    },
    tx?: any
  ) {
    const client = tx || prisma;
    return client.governanceLog.create({ data });
  }

  async findByWorkflowId(workflowId: string) {
    return prisma.governanceLog.findMany({
      where: { workflowId } as any,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
  }

  async findByIngestionRunId(ingestionRunId: string) {
    return prisma.governanceLog.findMany({
      where: { ingestionRunId } as any,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
  }
}