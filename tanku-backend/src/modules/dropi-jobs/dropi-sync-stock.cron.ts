import cron, { ScheduledTask } from 'node-cron';
import { DropiJobType, DropiJobStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { APP_CONSTANTS } from '../../config/constants';
import { DropiJobsService } from './dropi-jobs.service';
import { CronJobStateService } from '../cron-job-state/cron-job-state.service';
import {
  DropiSyncStockCronConfigService,
  DROPI_SYNC_STOCK_CRON_JOB_KEY,
  describeCronExpression,
} from './dropi-sync-stock-cron-config.service';

let scheduledTask: ScheduledTask | null = null;
let configService: DropiSyncStockCronConfigService | null = null;
let dropiJobsService: DropiJobsService | null = null;
let cronStateService: CronJobStateService | null = null;

function services() {
  if (!configService) configService = new DropiSyncStockCronConfigService();
  if (!dropiJobsService) dropiJobsService = new DropiJobsService();
  if (!cronStateService) cronStateService = new CronJobStateService();
  return { configService, dropiJobsService, cronStateService };
}

export async function enqueueDropiSyncStockJob(source: 'cron' | 'manual'): Promise<{
  jobId: string;
  skipped: boolean;
  reason?: string;
}> {
  const { dropiJobsService, cronStateService } = services();

  const active = await prisma.dropiJob.findFirst({
    where: {
      type: DropiJobType.SYNC_STOCK,
      status: { in: [DropiJobStatus.PENDING, DropiJobStatus.RUNNING] },
    },
    select: { id: true, status: true },
  });

  if (active) {
    return {
      jobId: active.id,
      skipped: true,
      reason: `Ya hay un job SYNC_STOCK ${active.status}`,
    };
  }

  await cronStateService!.markStarted(DROPI_SYNC_STOCK_CRON_JOB_KEY);
  try {
    const job = await dropiJobsService!.createSyncStockJob({
      propagateProductFicha: false,
      source: 'cron',
    });
    await cronStateService!.markSuccess(DROPI_SYNC_STOCK_CRON_JOB_KEY, {
      source,
      enqueuedJobId: job.id,
      enqueuedAt: new Date().toISOString(),
    });
    console.log(`[DROPI-SYNC-STOCK-CRON] Job encolado (${source}): ${job.id}`);
    return { jobId: job.id, skipped: false };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await cronStateService!.markFailure(DROPI_SYNC_STOCK_CRON_JOB_KEY, msg);
    throw error;
  }
}

async function runScheduledTick(): Promise<void> {
  if (!APP_CONSTANTS.ENABLE_CRON_JOBS) {
    console.log('[DROPI-SYNC-STOCK-CRON] ENABLE_CRON_JOBS=false, tick omitido');
    return;
  }

  const { configService } = services();
  const config = await configService!.getConfig();
  if (!config.enabled) {
    console.log('[DROPI-SYNC-STOCK-CRON] Deshabilitado en configuración, tick omitido');
    return;
  }

  console.log('[DROPI-SYNC-STOCK-CRON] Tick programado…');
  try {
    const result = await enqueueDropiSyncStockJob('cron');
    if (result.skipped) {
      console.log(`[DROPI-SYNC-STOCK-CRON] ${result.reason}`);
    }
  } catch (error) {
    console.error('[DROPI-SYNC-STOCK-CRON] Error en tick:', error);
  }
}

export async function rescheduleDropiSyncStockCron(): Promise<void> {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!APP_CONSTANTS.ENABLE_CRON_JOBS) {
    console.log('[DROPI-SYNC-STOCK-CRON] ENABLE_CRON_JOBS=false, cron no programado');
    return;
  }

  const { configService } = services();
  const config = await configService!.getConfig();

  if (!config.enabled) {
    console.log('[DROPI-SYNC-STOCK-CRON] Deshabilitado en BD, cron no programado');
    return;
  }

  if (!cron.validate(config.cronExpression)) {
    console.error(
      `[DROPI-SYNC-STOCK-CRON] Expresión inválida: ${config.cronExpression}`
    );
    return;
  }

  scheduledTask = cron.schedule(config.cronExpression, () => {
    void runScheduledTick();
  }, { timezone: config.timezone });

  console.log(
    `[DROPI-SYNC-STOCK-CRON] Programado: ${config.cronExpression} (${describeCronExpression(config.cronExpression)}) TZ=${config.timezone}`
  );
}

export async function initializeDropiSyncStockCron(): Promise<void> {
  const { configService } = services();
  const existing = await configService!.getConfig();
  const row = await services().cronStateService!.getByKey(DROPI_SYNC_STOCK_CRON_JOB_KEY);

  if (!row) {
    await configService!.saveConfig({
      cronExpression: existing.cronExpression,
      enabled: existing.enabled,
      timezone: existing.timezone,
    });
  }

  await rescheduleDropiSyncStockCron();
}
