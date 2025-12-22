import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiEnrichService } from '../../dropi-enrich/dropi-enrich.service';

/**
 * Worker para procesar jobs ENRICH
 * Al completar, crea un job SYNC_PRODUCT
 */
export class EnrichWorker extends BaseWorker {
  private dropiEnrichService: DropiEnrichService;

  constructor() {
    super(DropiJobType.ENRICH);
    this.dropiEnrichService = new DropiEnrichService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[ENRICH WORKER] Procesando job ${jobId}`);

    // Ejecutar enriquecimiento completo
    // Procesar en lotes hasta completar todos los productos
    let limit = 1000;
    let enriched = 0;
    let totalErrors = 0;

    while (true) {
      const result = await this.dropiEnrichService.enrichProducts(
        limit,
        'active',
        50,
        false
      );

      enriched += result.enriched;
      totalErrors += result.errors;

      console.log(`[ENRICH WORKER] Lote enriquecido: ${result.enriched} productos`);

      // Si no hay más productos para enriquecer, salir
      if (result.enriched === 0) {
        break;
      }
    }

    console.log(`[ENRICH WORKER] Enriquecimiento completado: ${enriched} productos, ${totalErrors} errores`);

    // Crear job SYNC_PRODUCT para que continúe el flujo
    await this.dropiJobsService.createJob(DropiJobType.SYNC_PRODUCT);
    console.log(`[ENRICH WORKER] Job SYNC_PRODUCT creado`);
  }
}
