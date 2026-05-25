import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { CronJobStateService } from '../cron-job-state/cron-job-state.service';

export const DROPI_SYNC_STOCK_CRON_JOB_KEY = 'dropi_sync_stock';

export interface DropiSyncStockCronConfig {
  cronExpression: string;
  enabled: boolean;
  timezone: string;
}

const DEFAULT_TIMEZONE = 'America/Bogota';

export function describeCronExpression(expression: string): string {
  const presets: Record<string, string> = {
    '0 */6 * * *': 'Cada 6 horas (minuto 0)',
    '0 */4 * * *': 'Cada 4 horas (minuto 0)',
    '0 */12 * * *': 'Cada 12 horas (minuto 0)',
    '0 3 * * *': 'Diario a las 03:00',
    '0 0 * * *': 'Diario a las 00:00',
  };
  return presets[expression] ?? `Expresión personalizada: ${expression}`;
}

export class DropiSyncStockCronConfigService {
  private cronState = new CronJobStateService();

  getDefaultConfig(): DropiSyncStockCronConfig {
    return {
      cronExpression: env.DROPI_SYNC_CRON,
      enabled: env.ENABLE_CRON_JOBS,
      timezone: process.env.DROPI_SYNC_CRON_TZ?.trim() || DEFAULT_TIMEZONE,
    };
  }

  async getConfig(): Promise<DropiSyncStockCronConfig & { updatedAt: string | null }> {
    const row = await this.cronState.getByKey(DROPI_SYNC_STOCK_CRON_JOB_KEY);
    const defaults = this.getDefaultConfig();
    const meta = (row?.metadata as Record<string, unknown> | null) ?? {};

    return {
      cronExpression:
        typeof meta.cronExpression === 'string' ? meta.cronExpression : defaults.cronExpression,
      enabled: typeof meta.enabled === 'boolean' ? meta.enabled : defaults.enabled,
      timezone:
        typeof meta.timezone === 'string' && meta.timezone.trim()
          ? meta.timezone.trim()
          : defaults.timezone,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async saveConfig(
    patch: Partial<Pick<DropiSyncStockCronConfig, 'cronExpression' | 'enabled' | 'timezone'>>
  ): Promise<DropiSyncStockCronConfig> {
    const current = await this.getConfig();
    const next: DropiSyncStockCronConfig = {
      cronExpression: patch.cronExpression?.trim() || current.cronExpression,
      enabled: patch.enabled ?? current.enabled,
      timezone: patch.timezone?.trim() || current.timezone,
    };

    const metadata = {
      cronExpression: next.cronExpression,
      enabled: next.enabled,
      timezone: next.timezone,
      cronDescription: describeCronExpression(next.cronExpression),
    };

    await this.cronState.upsertConfig(DROPI_SYNC_STOCK_CRON_JOB_KEY, metadata);
    return next;
  }
}
