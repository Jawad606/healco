import { prisma } from '../core/db';
import { Prisma } from '@prisma/client';
import { WorkflowStatus, WorkflowContext } from '../core/workflow-state';

export class WorkflowRepository {
  async findById(id: string) {
    return prisma.workflowRecord.findUnique({ where: { id } });
  }

  async findByIdempotencyKey(key: string) {
    return prisma.workflowRecord.findUnique({ where: { idempotencyKey: key } });
  }

  async create(data: {
    idempotencyKey: string;
    ingestionRunId?: string;
    traceId: string;
    status: WorkflowStatus;
    contextData: WorkflowContext;
  }) {
    return prisma.workflowRecord.create({
      data: {
        ...data,
        contextData: data.contextData as Prisma.InputJsonValue
      }
    });
  }

  async updateStatus(id: string, status: WorkflowStatus, contextData: WorkflowContext) {
    return prisma.workflowRecord.update({
      where: { id },
      data: { status, contextData: contextData as Prisma.InputJsonValue, updatedAt: new Date() }
    });
  }

  async markCompleted(
    id: string,
    actualCare: string,
    isAdhered: boolean,
    contextData: WorkflowContext
  ) {
    return prisma.workflowRecord.update({
      where: { id },
      data: {
        status: WorkflowStatus.COMPLETED,
        actualCare,
        isAdhered,
        contextData: contextData as Prisma.InputJsonValue,
        completedAt: new Date()
      }
    });
  }

  async markFailed(id: string) {
    return prisma.workflowRecord.update({
      where: { id },
      data: {
        status: WorkflowStatus.FAILED,
        retryCount: { increment: 1 }
      }
    });
  }

  async listByStatus(status: WorkflowStatus, limit: number, offset: number) {
    return prisma.workflowRecord.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }
}