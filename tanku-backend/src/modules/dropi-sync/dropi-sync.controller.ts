import { Request, Response, NextFunction } from 'express';
import { DropiJobsService } from '../dropi-jobs/dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

export class DropiSyncController {
  private dropiJobsService: DropiJobsService;

  constructor() {
    this.dropiJobsService = new DropiJobsService();
  }

  /**
   * POST /api/v1/dropi/sync-to-backend
   * Crear job SYNC_PRODUCT (no ejecuta lógica pesada)
   * 
   * ❌ NO ejecuta lógica de Dropi en el controller
   * ✔ Siempre responde rápido con 202 Accepted
   */
  syncToBackend = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`🔄 [DROPI SYNC] Creando job SYNC_PRODUCT`);

      const job = await this.dropiJobsService.createJob(DropiJobType.SYNC_PRODUCT);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error: any) {
      console.error(`❌ [DROPI SYNC] Error:`, error);
      next(error);
    }
  };
}
