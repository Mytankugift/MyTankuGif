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
    let processedInBlock = 0; // ✅ AGREGADO: Productos procesados en el bloque actual

    try {
      // Verificar cancelación antes de empezar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de iniciar');
      }

      // ✅ AGREGADO: Inicializar progreso a 0%
      await this.updateProgress(jobId, 0);

      while (true) {
        // ⚠️ VERIFICAR CANCELACIÓN ANTES DE CADA LOTE
        if (await this.isJobCancelled(jobId)) {
          console.log(`[ENRICH WORKER] ⚠️ Job ${jobId} fue cancelado, deteniendo procesamiento`);
          throw new Error('Job cancelado por el usuario');
        }

        // ✅ AGREGADO: Callback para actualizar progreso durante el procesamiento
        const result = await this.dropiEnrichService.enrichProducts(
          limit,
          'active',
          50,
          false,
          async (progress: number) => {
            // Actualizar progreso en el dashboard en tiempo real
            await this.updateProgress(jobId, progress);
          }
        );

        // ✅ AGREGADO: Guardar total_pending en la primera iteración
        if (totalPending === 0 && result.total_pending !== undefined) {
          totalPending = result.total_pending;
          console.log(`[ENRICH WORKER] 📊 Bloque de ${totalPending} productos a procesar`);
        }

        enriched += result.enriched;
        totalErrors += result.errors;
        
        // ✅ AGREGADO: Calcular productos procesados (enriquecidos + errores + omitidos)
        // El total procesado es el mínimo entre el limit y los productos que realmente se procesaron
        // Usamos block_progress si está disponible, sino calculamos basado en enriched
        processedInBlock = result.block_progress !== undefined 
          ? Math.round((result.block_progress / 100) * totalPending)
          : enriched; // Fallback: usar enriched como aproximación

        // ✅ AGREGADO: El progreso ya se actualizó durante el procesamiento via callback
        // Solo mostramos el resumen final del lote
        const finalProgress = result.block_progress !== undefined 
          ? result.block_progress 
          : (totalPending > 0 ? Math.round((processedInBlock / totalPending) * 100) : 100);
        
        console.log(`[ENRICH WORKER] 📦 Lote procesado: ${result.enriched} enriquecidos | ❌ ${result.errors} errores | 📊 Progreso del bloque: ${finalProgress}% (${processedInBlock}/${totalPending})`);

        // Si no hay más productos para enriquecer, salir
        if (result.enriched === 0 && result.remaining === 0) {
          break;
        }
      }

      // Verificar cancelación antes de finalizar
      if (await this.isJobCancelled(jobId)) {
        throw new Error('Job cancelado antes de finalizar');
      }

      // ✅ AGREGADO: Actualizar progreso a 100% al finalizar
      await this.updateProgress(jobId, 100);

      console.log(`[ENRICH WORKER] ✅ Enriquecimiento completado: ${enriched} productos enriquecidos, ${totalErrors} errores`);

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
