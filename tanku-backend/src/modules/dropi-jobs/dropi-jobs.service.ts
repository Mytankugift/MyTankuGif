import { prisma } from '../../config/database';
import { DropiJobType, DropiJobStatus, Prisma } from '@prisma/client';
import {
  SyncStockJobMetadata,
  SyncStockStepKey,
  StepRunStatus,
  createInitialSyncStockMetadata,
  computeOverallProgress,
  SyncStockPipelineFollowUp,
} from './dropi-job-step-metadata';
import {
  getDropiJobRetentionPerType,
  DROPI_JOB_LIST_DEFAULT_LIMIT,
  DROPI_JOB_LIST_MAX_LIMIT,
} from './dropi-job-retention';
import { parseEnrichChainMetadata } from './dropi-job-chain-metadata';
import { DropiEnrichService } from '../dropi-enrich/dropi-enrich.service';

export class DropiJobsService {
  /**
   * Conserva solo los N jobs más recientes por tipo; borra DONE/FAILED más viejos.
   * Nunca borra PENDING ni RUNNING.
   */
  async pruneOldJobs(type: DropiJobType, keepCount?: number): Promise<number> {
    const keep = keepCount ?? getDropiJobRetentionPerType();
    const recent = await prisma.dropiJob.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    });

    const keepIds = new Set(recent.slice(0, keep).map((j) => j.id));
    const terminal = [DropiJobStatus.DONE, DropiJobStatus.FAILED] as DropiJobStatus[];
    const deleteIds = recent
      .filter((j) => !keepIds.has(j.id) && terminal.includes(j.status))
      .map((j) => j.id);

    if (deleteIds.length === 0) return 0;

    const result = await prisma.dropiJob.deleteMany({
      where: { id: { in: deleteIds } },
    });

    if (result.count > 0) {
      console.log(
        `[DROPI JOBS] Purgados ${result.count} job(s) antiguos de tipo ${type} (retención: ${keep})`
      );
    }
    return result.count;
  }

  private async pruneAfterTerminal(jobId: string): Promise<void> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
      select: { type: true },
    });
    if (job) await this.pruneOldJobs(job.type);
  }
  /**
   * Crear un nuevo job
   */
  async createJob(type: DropiJobType): Promise<{
    id: string;
    type: DropiJobType;
    status: DropiJobStatus;
  }> {
    const job = await prisma.dropiJob.create({
      data: {
        type,
        status: DropiJobStatus.PENDING,
        progress: 0,
        attempts: 0,
      },
    });

    return {
      id: job.id,
      type: job.type,
      status: job.status,
    };
  }

  /**
   * Encolar SYNC_STOCK con opciones (cron vs manual + propagar ficha a products).
   */
  async createSyncStockJob(options?: {
    propagateProductFicha?: boolean;
    chainEnrichOnComplete?: boolean;
    source?: 'cron' | 'manual';
  }): Promise<{ id: string; type: DropiJobType; status: DropiJobStatus }> {
    const job = await prisma.dropiJob.create({
      data: {
        type: DropiJobType.SYNC_STOCK,
        status: DropiJobStatus.PENDING,
        progress: 0,
        attempts: 0,
      },
    });
    await this.initSyncStockMetadata(job.id, options);
    return {
      id: job.id,
      type: job.type,
      status: job.status,
    };
  }

  /**
   * Tomar el próximo job PENDING de un tipo específico con locking
   * Usa SELECT FOR UPDATE SKIP LOCKED para evitar concurrencia
   */
  async takeNextJob(type: DropiJobType, workerId: string): Promise<{
    id: string;
    type: DropiJobType;
    status: DropiJobStatus;
    attempts: number;
  } | null> {
    // Usar transacción para locking atómico
    const job = await prisma.$transaction(async (tx) => {
      // Buscar job PENDING con locking
      // Prisma no tiene soporte directo para SKIP LOCKED, así que usamos raw query
      // En PostgreSQL, los ENUMs se comparan directamente como strings
      const result = await tx.$queryRawUnsafe<Array<{
        id: string;
        type: string;
        status: string;
        attempts: number;
      }>>(
        `SELECT id, type, status, attempts
         FROM dropi_jobs
         WHERE type = $1::"DropiJobType"
           AND status = 'PENDING'
         FOR UPDATE SKIP LOCKED
         LIMIT 1`,
        type
      );

      if (result.length === 0) {
        return null;
      }

      const jobId = result[0].id;

      // Actualizar job con lock
      await tx.dropiJob.update({
        where: { id: jobId },
        data: {
          status: DropiJobStatus.RUNNING,
          lockedBy: workerId,
          lockedAt: new Date(),
          startedAt: new Date(),
          attempts: {
            increment: 1,
          },
        },
      });

      return result[0];
    }, {
      maxWait: 10000, // Esperar máximo 10s para iniciar transacción
      timeout: 30000, // Timeout de 30s para la transacción completa
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      type: job.type as DropiJobType,
      status: job.status as DropiJobStatus,
      attempts: job.attempts,
    };
  }

  /**
   * Marcar job como completado
   */
  async markJobDone(jobId: string): Promise<void> {
    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        status: DropiJobStatus.DONE,
        progress: 100,
        finishedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
    });
    await this.pruneAfterTerminal(jobId);
  }

  /**
   * Marcar job como fallido
   */
  async markJobFailed(jobId: string, error: string): Promise<void> {
    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        status: DropiJobStatus.FAILED,
        error: error.substring(0, 10000), // Limitar tamaño del error
        finishedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
    });
    await this.pruneAfterTerminal(jobId);
  }

  /**
   * Actualizar progreso del job
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
      },
    });
  }

  /**
   * Fusiona `patch` con la metadata existente (no reemplaza el objeto entero).
   * Evita perder flags de encadenado (p. ej. chainSyncProduct) al guardar stats al finalizar.
   */
  async updateJobMetadata(jobId: string, patch: Record<string, unknown>): Promise<void> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
      select: { metadata: true },
    });

    const existing =
      job?.metadata != null &&
      typeof job.metadata === 'object' &&
      !Array.isArray(job.metadata)
        ? { ...(job.metadata as Record<string, unknown>) }
        : {};

    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        metadata: { ...existing, ...patch } as Prisma.InputJsonValue,
      },
    });
  }

  async initSyncStockMetadata(
    jobId: string,
    options?: {
      propagateProductFicha?: boolean;
      chainEnrichOnComplete?: boolean;
      source?: 'cron' | 'manual';
    }
  ): Promise<void> {
    const metadata = createInitialSyncStockMetadata(options);
    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        metadata: metadata as unknown as Prisma.InputJsonValue,
        progress: 0,
      },
    });
  }

  async updateSyncStockStep(
    jobId: string,
    stepKey: SyncStockStepKey,
    options: {
      status?: StepRunStatus;
      progress?: number;
      stats?: Record<string, unknown>;
      message?: string;
      currentStep?: SyncStockStepKey | 'done';
    }
  ): Promise<void> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
      select: { metadata: true },
    });
    if (!job) return;

    const base =
      (job.metadata as unknown as SyncStockJobMetadata) || createInitialSyncStockMetadata();

    const prev = base.steps[stepKey];
    base.steps[stepKey] = {
      status: options.status ?? prev.status,
      progress: options.progress ?? prev.progress,
      stats: options.stats ? { ...prev.stats, ...options.stats } : prev.stats,
      message: options.message ?? prev.message,
    };

    if (options.currentStep) {
      base.currentStep = options.currentStep;
    } else if (options.status === 'running') {
      base.currentStep = stepKey;
    }

    const overall = computeOverallProgress(base);

    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        metadata: base as unknown as Prisma.InputJsonValue,
        progress: overall,
      },
    });
  }

  async findActiveJob(
    type: DropiJobType
  ): Promise<{ id: string; status: DropiJobStatus } | null> {
    return prisma.dropiJob.findFirst({
      where: {
        type,
        status: { in: [DropiJobStatus.PENDING, DropiJobStatus.RUNNING] },
      },
      select: { id: true, status: true },
    });
  }

  /**
   * Tras SYNC_STOCK exitoso: encola ENRICH en paralelo si hay pendientes y no hay ENRICH activo.
   * No bloquea el cron de sync-stock.
   */
  async maybeEnqueueEnrichAfterSyncStock(syncStockJobId: string): Promise<{
    enqueued: boolean;
    enrichJobId?: string;
    pendingCount?: number;
    reason?: string;
  }> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: syncStockJobId },
      select: { metadata: true },
    });
    const meta = job?.metadata as SyncStockJobMetadata | null;

    if (meta?.chainEnrichOnComplete === false) {
      return { enqueued: false, reason: 'chainEnrichOnComplete desactivado' };
    }

    const enrichService = new DropiEnrichService();
    const pendingCount = await enrichService.countPendingEnrich(false);
    if (pendingCount === 0) {
      return { enqueued: false, reason: 'sin productos pendientes de enrich' };
    }

    const activeEnrich = await this.findActiveJob(DropiJobType.ENRICH);
    if (activeEnrich) {
      console.log(
        `[DROPI PIPELINE] ENRICH ya activo (${activeEnrich.id}, ${activeEnrich.status}); ${pendingCount} pendiente(s) se procesarán en ese job`
      );
      return {
        enqueued: false,
        enrichJobId: activeEnrich.id,
        pendingCount,
        reason: `ENRICH ya activo: ${activeEnrich.id}`,
      };
    }

    const enrichJob = await prisma.dropiJob.create({
      data: {
        type: DropiJobType.ENRICH,
        status: DropiJobStatus.PENDING,
        progress: 0,
        attempts: 0,
        metadata: {
          chainSyncProduct: true,
          parentSyncStockJobId: syncStockJobId,
          source: meta?.source ?? 'chain',
        } as Prisma.InputJsonValue,
      },
    });

    console.log(
      `[DROPI PIPELINE] ENRICH encolado ${enrichJob.id} tras SYNC_STOCK ${syncStockJobId} (${pendingCount} pendiente(s))`
    );

    return { enqueued: true, enrichJobId: enrichJob.id, pendingCount };
  }

  /**
   * Tras ENRICH encadenado: encola SYNC_PRODUCT si hubo enriquecidos y no hay otro activo.
   */
  async maybeEnqueueSyncProductAfterEnrich(
    enrichJobId: string,
    enrichedCount: number
  ): Promise<{ enqueued: boolean; syncJobId?: string; reason?: string }> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: enrichJobId },
      select: { metadata: true },
    });
    const meta = parseEnrichChainMetadata(job?.metadata);

    if (!meta?.chainSyncProduct) {
      return { enqueued: false, reason: 'job ENRICH no es encadenado' };
    }

    if (enrichedCount <= 0) {
      return { enqueued: false, reason: 'ningún producto enriquecido en esta corrida' };
    }

    const activeSync = await this.findActiveJob(DropiJobType.SYNC_PRODUCT);
    if (activeSync) {
      console.log(
        `[DROPI PIPELINE] SYNC_PRODUCT ya activo (${activeSync.id}); omitiendo encolado tras ENRICH ${enrichJobId}`
      );
      return { enqueued: false, reason: `SYNC_PRODUCT ya activo: ${activeSync.id}` };
    }

    const syncJob = await prisma.dropiJob.create({
      data: {
        type: DropiJobType.SYNC_PRODUCT,
        status: DropiJobStatus.PENDING,
        progress: 0,
        attempts: 0,
        metadata: {
          chainedFromEnrichJobId: enrichJobId,
          parentSyncStockJobId: meta.parentSyncStockJobId,
          source: 'chain',
        } as Prisma.InputJsonValue,
      },
    });

    console.log(
      `[DROPI PIPELINE] SYNC_PRODUCT encolado ${syncJob.id} tras ENRICH ${enrichJobId} (${enrichedCount} enriquecido(s))`
    );

    return { enqueued: true, syncJobId: syncJob.id };
  }

  async updateSyncStockPipelineFollowUp(
    syncStockJobId: string,
    patch: SyncStockPipelineFollowUp
  ): Promise<void> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: syncStockJobId },
      select: { metadata: true },
    });
    if (!job?.metadata) return;

    const metadata = job.metadata as unknown as SyncStockJobMetadata;
    const prev = metadata.pipeline ?? {};

    metadata.pipeline = {
      enrich: patch.enrich ? { ...prev.enrich, ...patch.enrich } : prev.enrich,
      syncProduct: patch.syncProduct
        ? { ...prev.syncProduct, ...patch.syncProduct }
        : prev.syncProduct,
    };

    await prisma.dropiJob.update({
      where: { id: syncStockJobId },
      data: {
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async finalizeSyncStockMetadata(jobId: string, success: boolean): Promise<void> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
      select: { metadata: true },
    });
    if (!job?.metadata) return;

    const metadata = job.metadata as unknown as SyncStockJobMetadata;
    metadata.currentStep = 'done';
    if (success) {
      for (const key of Object.keys(metadata.steps) as SyncStockStepKey[]) {
        if (metadata.steps[key].status !== 'failed') {
          metadata.steps[key].status = 'completed';
          metadata.steps[key].progress = 100;
        }
      }
    }

    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        metadata: metadata as unknown as Prisma.InputJsonValue,
        progress: success ? 100 : computeOverallProgress(metadata),
      },
    });
  }

  /**
   * Listar jobs con filtros opcionales
   */
  async listJobs(options?: {
    limit?: number;
    type?: DropiJobType;
    status?: DropiJobStatus;
  }): Promise<Array<{
    id: string;
    type: DropiJobType;
    status: DropiJobStatus;
    progress: number;
    metadata: unknown;
    attempts: number;
    error: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>> {
    const retention = getDropiJobRetentionPerType();
    const requested = options?.limit ?? DROPI_JOB_LIST_DEFAULT_LIMIT;
    const limit = Math.min(
      Math.max(1, requested),
      DROPI_JOB_LIST_MAX_LIMIT,
      retention
    );
    const { type, status } = options || {};

    if (type) {
      await this.pruneOldJobs(type);
    } else {
      for (const t of Object.values(DropiJobType)) {
        await this.pruneOldJobs(t);
      }
    }

    const where: Prisma.DropiJobWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const jobs = await prisma.dropiJob.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return jobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      metadata: job.metadata,
      attempts: job.attempts,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    }));
  }

  /**
   * Obtener job por ID
   */
  async getJob(jobId: string) {
    return await prisma.dropiJob.findUnique({
      where: { id: jobId },
    });
  }

  /**
   * Verificar si un job fue cancelado o falló
   * Retorna true si el job está en estado FAILED
   */
  async isJobCancelled(jobId: string): Promise<boolean> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });

    return job?.status === DropiJobStatus.FAILED;
  }

  /**
   * Cancelar un job
   * Solo puede cancelar jobs en estado PENDING o RUNNING
   * Marca el job como FAILED con mensaje de cancelación
   */
  async cancelJob(jobId: string): Promise<{
    id: string;
    status: DropiJobStatus;
    cancelled: boolean;
  }> {
    const job = await prisma.dropiJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Job no encontrado');
    }

    // Solo permitir cancelar jobs pendientes o en ejecución
    if (job.status === DropiJobStatus.DONE) {
      throw new Error('No se puede cancelar un job que ya está completado');
    }

    if (job.status === DropiJobStatus.FAILED) {
      throw new Error('El job ya está marcado como fallido');
    }

    // Marcar como fallido con mensaje de cancelación
    await prisma.dropiJob.update({
      where: { id: jobId },
      data: {
        status: DropiJobStatus.FAILED,
        error: 'Cancelado por el usuario',
        finishedAt: new Date(),
        lockedBy: null,
        lockedAt: null,
      },
    });

    await this.pruneAfterTerminal(jobId);

    return {
      id: job.id,
      status: DropiJobStatus.FAILED,
      cancelled: true,
    };
  }
}
