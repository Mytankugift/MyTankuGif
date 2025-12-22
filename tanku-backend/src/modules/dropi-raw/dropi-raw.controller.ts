import { Request, Response, NextFunction } from 'express';
import { DropiJobsService } from '../dropi-jobs/dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

export class DropiRawController {
  private dropiJobsService: DropiJobsService;

  constructor() {
    this.dropiJobsService = new DropiJobsService();
  }

  /**
   * POST /api/v1/dropi/sync-raw
   * Crear job RAW (no ejecuta lógica pesada)
   * 
   * ❌ NO ejecuta lógica de Dropi en el controller
   * ✔ Siempre responde rápido con 202 Accepted
   */
  syncRaw = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`📦 [DROPI RAW] Creando job RAW`);

      const job = await this.dropiJobsService.createJob(DropiJobType.RAW);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error: any) {
      console.error(`❌ [DROPI RAW] Error:`, error);
      next(error);
    }
  };
}
