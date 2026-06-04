import cron, { ScheduledTask } from 'node-cron';
import { APP_CONSTANTS } from '../../config/constants';
import {
  SupportCaseEvidenceRetentionService,
  SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY,
} from './support-case-evidence-retention.service';

const CRON_EXPRESSION = '0 4 * * *';
const DEFAULT_TIMEZONE = 'America/Bogota';

let scheduledTask: ScheduledTask | null = null;
let retentionService: SupportCaseEvidenceRetentionService | null = null;

function getService(): SupportCaseEvidenceRetentionService {
  if (!retentionService) {
    retentionService = new SupportCaseEvidenceRetentionService();
  }
  return retentionService;
}

export async function runSupportCaseEvidenceRetention(
  source: 'cron' | 'manual'
): Promise<Awaited<ReturnType<SupportCaseEvidenceRetentionService['runRetentionJob']>>> {
  console.log(`[SUPPORT-EVIDENCE-RETENTION] Ejecutando (${source})…`);
  const result = await getService().runRetentionJob();
  console.log(
    `[SUPPORT-EVIDENCE-RETENTION] Completado: ${result.totalDeleted} eliminados, ${result.totalErrors} errores`
  );
  return result;
}

async function runScheduledTick(): Promise<void> {
  if (!APP_CONSTANTS.ENABLE_CRON_JOBS) {
    console.log('[SUPPORT-EVIDENCE-RETENTION] ENABLE_CRON_JOBS=false, tick omitido');
    return;
  }

  try {
    await runSupportCaseEvidenceRetention('cron');
  } catch (error) {
    console.error('[SUPPORT-EVIDENCE-RETENTION] Error en tick:', error);
  }
}

export function initializeSupportCaseEvidenceRetentionCron(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }

  if (!APP_CONSTANTS.ENABLE_CRON_JOBS) {
    console.log('[SUPPORT-EVIDENCE-RETENTION] ENABLE_CRON_JOBS=false, cron no programado');
    return;
  }

  const timezone =
    process.env.SUPPORT_EVIDENCE_RETENTION_CRON_TZ?.trim() || DEFAULT_TIMEZONE;

  if (!cron.validate(CRON_EXPRESSION)) {
    console.error(`[SUPPORT-EVIDENCE-RETENTION] Expresión inválida: ${CRON_EXPRESSION}`);
    return;
  }

  scheduledTask = cron.schedule(
    CRON_EXPRESSION,
    () => {
      void runScheduledTick();
    },
    { timezone }
  );

  console.log(
    `[SUPPORT-EVIDENCE-RETENTION] Programado: ${CRON_EXPRESSION} (diario 04:00) TZ=${timezone} jobKey=${SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY}`
  );
}
