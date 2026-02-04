import { prisma } from '../../config/database';
import { DropiJobType, DropiJobStatus } from '@prisma/client';

export class DropiJobsService {
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
    attempts: number;
    error: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
  }>> {
    const { limit = 50, type, status } = options || {};

    const where: any = {};
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

    return {
      id: job.id,
      status: DropiJobStatus.FAILED,
      cancelled: true,
    };
  }
}
