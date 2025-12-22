import { Request, Response, NextFunction } from 'express';
import { DropiJobsService } from '../dropi-jobs/dropi-jobs.service';
import { DropiJobType } from '@prisma/client';

export class DropiEnrichController {
  private dropiJobsService: DropiJobsService;

  constructor() {
    this.dropiJobsService = new DropiJobsService();
  }

  /**
   * POST /api/v1/dropi/enrich
   * Crear job ENRICH (no ejecuta lógica pesada)
   * 
   * ❌ NO ejecuta lógica de Dropi en el controller
   * ✔ Siempre responde rápido con 202 Accepted
   */
  enrich = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`🔍 [DROPI ENRICH] Creando job ENRICH`);

      const job = await this.dropiJobsService.createJob(DropiJobType.ENRICH);

      res.status(202).json({
        jobId: job.id,
        status: 'queued',
        type: job.type,
      });
    } catch (error: any) {
      console.error(`❌ [DROPI ENRICH] Error:`, error);
      next(error);
    }
  };
}
