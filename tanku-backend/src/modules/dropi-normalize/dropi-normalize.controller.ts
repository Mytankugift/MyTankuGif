import { Request, Response, NextFunction } from 'express';
import { DropiJobsService } from '../dropi-jobs/dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

export class DropiNormalizeController {
  private dropiJobsService: DropiJobsService;

  constructor() {
    this.dropiJobsService = new DropiJobsService();
  }

  /**
   * POST /api/v1/dropi/normalize
   * Crear job NORMALIZE (no ejecuta lógica pesada)
   * 
   * ❌ NO ejecuta lógica de Dropi en el controller
   * ✔ Siempre responde rápido con 202 Accepted
   */
  normalize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`🔄 [DROPI NORMALIZE] Creando job NORMALIZE`);

      const job = await this.dropiJobsService.createJob(DropiJobType.NORMALIZE);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error: any) {
      console.error(`❌ [DROPI NORMALIZE] Error:`, error);
      next(error);
    }
  };
}
