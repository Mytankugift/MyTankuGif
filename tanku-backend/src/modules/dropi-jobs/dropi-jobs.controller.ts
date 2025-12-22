import { Request, Response, NextFunction } from 'express';
import { DropiJobsService } from './dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

export class DropiJobsController {
  private dropiJobsService: DropiJobsService;

  constructor() {
    this.dropiJobsService = new DropiJobsService();
  }

  /**
   * POST /api/v1/dropi/jobs/raw
   * Crear job RAW
   */
  createRawJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await this.dropiJobsService.createJob(DropiJobType.RAW);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/jobs/normalize
   * Crear job NORMALIZE
   */
  createNormalizeJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await this.dropiJobsService.createJob(DropiJobType.NORMALIZE);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/jobs/enrich
   * Crear job ENRICH
   */
  createEnrichJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await this.dropiJobsService.createJob(DropiJobType.ENRICH);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/jobs/sync-product
   * Crear job SYNC_PRODUCT
   */
  createSyncProductJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await this.dropiJobsService.createJob(DropiJobType.SYNC_PRODUCT);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/jobs/stock
   * Crear job SYNC_STOCK (para cron)
   */
  createSyncStockJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await this.dropiJobsService.createJob(DropiJobType.SYNC_STOCK);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/dropi/jobs/:id
   * Obtener estado de un job
   */
  getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const job = await this.dropiJobsService.getJob(id);

      if (!job) {
        return res.status(404).json({
          error: 'Job no encontrado',
        });
      }

      res.status(200).json({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        attempts: job.attempts,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/dropi/jobs/:id
   * Cancelar un job
   * Solo puede cancelar jobs en estado PENDING o RUNNING
   */
  cancelJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      const result = await this.dropiJobsService.cancelJob(id);

      res.status(200).json({
        success: true,
        message: 'Job cancelado exitosamente',
        jobId: result.id,
        status: result.status,
        cancelled: result.cancelled,
      });
    } catch (error: any) {
      // Si el job no existe o ya está terminado, devolver error apropiado
      if (error.message === 'Job no encontrado') {
        return res.status(404).json({
          error: 'Job no encontrado',
        });
      }

      if (
        error.message.includes('ya está completado') ||
        error.message.includes('ya está marcado como fallido')
      ) {
        return res.status(400).json({
          error: error.message,
        });
      }

      next(error);
    }
  };
}
