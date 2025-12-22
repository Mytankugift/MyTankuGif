import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiRawService } from '../../dropi-raw/dropi-raw.service';

/**
 * Worker para procesar jobs RAW
 * Al completar, crea un job NORMALIZE
 */
export class RawWorker extends BaseWorker {
  private dropiRawService: DropiRawService;

  constructor() {
    super(DropiJobType.RAW);
    this.dropiRawService = new DropiRawService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[RAW WORKER] Procesando job ${jobId}`);

    // Ejecutar sync RAW completo (todas las páginas)
    const result = await this.dropiRawService.syncRawProducts(0, null);

    console.log(`[RAW WORKER] Sync RAW completado: ${result.processed} productos`);

    // Crear job NORMALIZE para que continúe el flujo
    await this.dropiJobsService.createJob(DropiJobType.NORMALIZE);
    console.log(`[RAW WORKER] Job NORMALIZE creado`);
  }
}
