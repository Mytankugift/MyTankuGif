import { prisma } from '../../config/database';
import { S3Service } from '../../shared/services/s3.service';
import {
  CronJobStateService,
} from '../cron-job-state/cron-job-state.service';

export const SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY = 'support_case_evidence_retention';

export const DEFAULT_SUPPORT_EVIDENCE_RETENTION_DAYS = 90;
const BATCH_SIZE = 100;

export function getSupportCaseEvidenceRetentionDays(): number {
  const raw = process.env.SUPPORT_EVIDENCE_RETENTION_DAYS?.trim();
  if (!raw) return DEFAULT_SUPPORT_EVIDENCE_RETENTION_DAYS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SUPPORT_EVIDENCE_RETENTION_DAYS;
}

export class SupportCaseEvidenceRetentionService {
  private s3Service = new S3Service();
  private cronState = new CronJobStateService();

  async purgeExpiredEvidence(): Promise<{
    scanned: number;
    deleted: number;
    errors: number;
    retentionDays: number;
  }> {
    const days = getSupportCaseEvidenceRetentionDays();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const batch = await prisma.supportCaseAttachment.findMany({
      where: { createdAt: { lt: cutoff } },
      take: BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true, supportCaseId: true },
    });

    let deleted = 0;
    let errors = 0;
    const deletedCountByCase = new Map<string, number>();

    for (const attachment of batch) {
      try {
        await this.s3Service.deleteFile(attachment.url);
        await prisma.supportCaseAttachment.delete({ where: { id: attachment.id } });
        deleted += 1;
        deletedCountByCase.set(
          attachment.supportCaseId,
          (deletedCountByCase.get(attachment.supportCaseId) ?? 0) + 1
        );
      } catch (err) {
        errors += 1;
        console.error(
          `[SUPPORT-EVIDENCE-RETENTION] Error eliminando adjunto ${attachment.id}:`,
          err
        );
      }
    }

    const purgedAt = new Date();
    for (const [supportCaseId, removedCount] of deletedCountByCase) {
      if (removedCount < 1) continue;
      const remaining = await prisma.supportCaseAttachment.count({
        where: { supportCaseId },
      });
      if (remaining > 0) continue;
      await prisma.supportCase.update({
        where: { id: supportCaseId },
        data: {
          evidencePurgedAt: purgedAt,
          evidencePurgedRetentionDays: days,
        },
      });
    }

    return {
      scanned: batch.length,
      deleted,
      errors,
      retentionDays: days,
    };
  }

  async runRetentionJob(): Promise<{
    totalDeleted: number;
    totalErrors: number;
    batches: number;
    retentionDays: number;
  }> {
    await this.cronState.markStarted(SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY);

    let totalDeleted = 0;
    let totalErrors = 0;
    let batches = 0;
    let retentionDaysUsed = getSupportCaseEvidenceRetentionDays();

    try {
      for (let i = 0; i < 50; i += 1) {
        const result = await this.purgeExpiredEvidence();
        retentionDaysUsed = result.retentionDays;
        batches += 1;
        totalDeleted += result.deleted;
        totalErrors += result.errors;
        if (result.scanned < BATCH_SIZE) break;
      }

      await this.cronState.markSuccess(SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY, {
        totalDeleted,
        totalErrors,
        batches,
        retentionDays: retentionDaysUsed,
      });

      return { totalDeleted, totalErrors, batches, retentionDays: retentionDaysUsed };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.cronState.markFailure(SUPPORT_CASE_EVIDENCE_RETENTION_JOB_KEY, msg);
      throw err;
    }
  }
}
