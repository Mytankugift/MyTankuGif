import { CronJobStateService } from '../cron-job-state/cron-job-state.service';

export const SUPPORT_CASES_MODULE_JOB_KEY = 'support_cases_module';

export interface SupportCasesModuleConfig {
  notificationEmail: string | null;
}

export class SupportCasesConfigService {
  private cronState = new CronJobStateService();

  async getConfig(): Promise<SupportCasesModuleConfig & { updatedAt: string | null }> {
    const row = await this.cronState.getByKey(SUPPORT_CASES_MODULE_JOB_KEY);
    const meta = (row?.metadata as Record<string, unknown> | null) ?? {};
    const email =
      typeof meta.notificationEmail === 'string' && meta.notificationEmail.trim()
        ? meta.notificationEmail.trim()
        : null;

    return {
      notificationEmail: email,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async saveConfig(patch: { notificationEmail?: string | null }): Promise<SupportCasesModuleConfig> {
    const current = await this.getConfig();
    let notificationEmail = current.notificationEmail;

    if (patch.notificationEmail !== undefined) {
      const raw = patch.notificationEmail;
      if (raw === null || raw === '') {
        notificationEmail = null;
      } else {
        const trimmed = String(raw).trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          throw new Error('Correo de notificación inválido');
        }
        notificationEmail = trimmed;
      }
    }

    await this.cronState.upsertConfig(SUPPORT_CASES_MODULE_JOB_KEY, {
      notificationEmail,
    });

    return { notificationEmail };
  }
}
