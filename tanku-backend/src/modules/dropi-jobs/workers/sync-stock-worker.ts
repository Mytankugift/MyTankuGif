import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiRawService } from '../../dropi-raw/dropi-raw.service';
import { DropiNormalizeService } from '../../dropi-normalize/dropi-normalize.service';
import { DropiSyncService } from '../../dropi-sync/dropi-sync.service';
import { prisma } from '../../../config/database';

/**
 * Worker para procesar jobs SYNC_STOCK
 * Sincroniza solo stock y precios (para ejecución periódica vía cron)
 * Este es un flujo independiente, no crea otros jobs
 */
export class SyncStockWorker extends BaseWorker {
  private dropiRawService: DropiRawService;
  private dropiNormalizeService: DropiNormalizeService;
  private dropiSyncService: DropiSyncService;

  constructor() {
    super(DropiJobType.SYNC_STOCK);
    this.dropiRawService = new DropiRawService();
    this.dropiNormalizeService = new DropiNormalizeService();
    this.dropiSyncService = new DropiSyncService();
  }

  protected async processJob(jobId: string): Promise<void> {
    console.log(`[SYNC_STOCK WORKER] Procesando job ${jobId}`);

    // PASO 1: Sincronizar RAW completo (para obtener stock/precios actualizados)
    console.log(`[SYNC_STOCK WORKER] Sincronizando RAW...`);
    await this.dropiRawService.syncRawProducts(0, null);

    // PASO 2: Normalizar solo productos que ya existen (actualizar stock/precios)
    // Usar processAll=false para solo actualizar productos existentes
    console.log(`[SYNC_STOCK WORKER] Normalizando productos (solo stock/precios)...`);
    let offset = 0;
    const batchSize = 100;
    let hasMore = true;

    while (hasMore) {
      const result = await this.dropiNormalizeService.normalizeProducts(
        batchSize,
        offset,
        undefined,
        false
      );

      console.log(`[SYNC_STOCK WORKER] Batch normalizado: ${result.normalized} productos`);

      if (result.next_offset === null) {
        hasMore = false;
      } else {
        offset = result.next_offset;
      }

      // Actualizar progreso
      const progress = result.total_pending > 0
        ? Math.round(((result.total_pending - result.remaining) / result.total_pending) * 100)
        : 100;
      await this.updateProgress(jobId, progress);
    }

    // PASO 3: Sincronizar stock actualizado al backend (actualizar warehouseVariants)
    console.log(`[SYNC_STOCK WORKER] Sincronizando stock al backend...`);
    await this.dropiSyncService.syncToBackend(
      50,
      0,
      true, // activeOnly
      true  // skipExisting - solo actualizar productos existentes
    );

    // PASO 4: Actualizar estados de productos y variantes según stock
    console.log(`[SYNC_STOCK WORKER] Actualizando estados según stock...`);
    const allProducts = await prisma.product.findMany({
      select: { id: true },
    });

    let updatedCount = 0;
    for (const product of allProducts) {
      try {
        await this.dropiSyncService.updateProductRankingStatus(product.id);
        
        // Actualizar estado de todas las variantes del producto
        const variants = await prisma.productVariant.findMany({
          where: { productId: product.id },
          select: { id: true },
        });

        for (const variant of variants) {
          await this.dropiSyncService.updateVariantStockStatus(variant.id);
        }

        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`[SYNC_STOCK WORKER] Actualizados ${updatedCount} productos...`);
        }
      } catch (error: any) {
        console.error(`[SYNC_STOCK WORKER] Error actualizando producto ${product.id}:`, error?.message);
      }
    }

    console.log(`[SYNC_STOCK WORKER] Sincronización de stock completada. ${updatedCount} productos actualizados.`);
  }
}
