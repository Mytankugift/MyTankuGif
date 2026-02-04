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
    let totalPending = 0; // ✅ AGREGADO: Para calcular progreso

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

        // ✅ AGREGADO: Guardar total_pending en la primera iteración
        if (totalPending === 0 && result.total_pending !== undefined) {
          totalPending = result.total_pending;
        }

        enriched += result.enriched;
        totalErrors += result.errors;

        // ✅ AGREGADO: Calcular y actualizar progreso
        if (totalPending > 0) {
          const remaining = result.remaining !== undefined ? result.remaining : Math.max(0, totalPending - enriched);
          const progress = Math.round(((totalPending - remaining) / totalPending) * 100);
          await this.updateProgress(jobId, progress);
          console.log(`[ENRICH WORKER] Lote enriquecido: ${result.enriched} productos | Progreso: ${progress}%`);
        } else {
          console.log(`[ENRICH WORKER] Lote enriquecido: ${result.enriched} productos`);
        }

        // Si no hay más productos para enriquecer, salir
        if (result.enriched === 0) {
          break;
        }
      }

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      // ✅ AGREGADO: Actualizar progreso a 100% al finalizar
      await this.updateProgress(jobId, 100);

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
