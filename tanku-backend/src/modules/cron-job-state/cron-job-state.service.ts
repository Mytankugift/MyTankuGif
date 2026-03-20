import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';

export const EVENT_REMINDERS_JOB_KEY = 'event_reminders';

export class CronJobStateService {
  async markStarted(jobKey: string): Promise<void> {
    const now = new Date();
    await prisma.cronJobState.upsert({
      where: { jobKey },
      create: {
        jobKey,
        lastStartedAt: now,
        lastStatus: 'running',
        lastError: null,
      },
      update: {
        lastStartedAt: now,
        lastStatus: 'running',
        lastError: null,
      },
    });
  }

  async markSuccess(jobKey: string, metadata?: Record<string, unknown>): Promise<void> {
    const now = new Date();
    await prisma.cronJobState.update({
      where: { jobKey },
      data: {
        lastCompletedAt: now,
        lastStatus: 'success',
        lastError: null,
        metadata:
          metadata !== undefined
            ? (JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  async markFailure(jobKey: string, errorMessage: string): Promise<void> {
    const now = new Date();
    await prisma.cronJobState.update({
      where: { jobKey },
      data: {
        lastCompletedAt: now,
        lastStatus: 'error',
        lastError: errorMessage.slice(0, 4000),
      },
    });
  }

  async getByKey(jobKey: string) {
    return prisma.cronJobState.findUnique({ where: { jobKey } });
  }
}
