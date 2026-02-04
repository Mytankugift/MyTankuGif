import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiEnrichService } from '../../dropi-enrich/dropi-enrich.service';

/**
 * Worker para procesar jobs ENRICH
 * No crea jobs automáticamente - cada proceso se activa manualmente
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

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

      while (true) {
        // ⚠️ VERIFICAR CANCELACIÓN ANTES DE CADA LOTE
        if (await this.isJobCancelled(jobId)) {
          console.log(`[ENRICH WORKER] ⚠️ Job ${jobId} fue cancelado, deteniendo procesamiento`);
          throw new Error('Job cancelado por el usuario');
        }

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

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      console.log(`[ENRICH WORKER] Enriquecimiento completado: ${enriched} productos, ${totalErrors} errores`);

      // ❌ REMOVIDO: No crear job SYNC_PRODUCT automáticamente
      // Cada proceso se activa manualmente desde tanku-admin
    } catch (error: any) {
      // Si el error es por cancelación, no lanzarlo como error fatal
      if (error?.message?.includes('cancelado')) {
        console.log(`[ENRICH WORKER] ⚠️ Job ${jobId} cancelado: ${error.message}`);
        return; // No lanzar error si fue cancelado
      }
      console.error(`[ENRICH WORKER] ❌ Error: ${error?.message}`);
      throw error;
    }
  }
}
