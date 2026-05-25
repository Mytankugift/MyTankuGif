import { BaseWorker } from './base-worker';
import { DropiJobType } from '@prisma/client';
import { DropiRawService } from '../../dropi-raw/dropi-raw.service';
import { DropiNormalizeService } from '../../dropi-normalize/dropi-normalize.service';
import { DropiSyncService } from '../../dropi-sync/dropi-sync.service';
import { prisma } from '../../../config/database';

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
    await this.dropiJobsService.initSyncStockMetadata(jobId);

    try {
      // —— Paso 1: RAW ——
      await this.dropiJobsService.updateSyncStockStep(jobId, 'raw', {
        status: 'running',
        progress: 0,
        message: 'Descargando favoritos desde Dropi…',
      });

      const rawResult = await this.dropiRawService.syncRawProducts(0, null, {
        favorite: true,
        shouldAbort: () => this.isJobCancelled(jobId),
        onProgress: async ({ percent, pageNumber, totalProcessed }) => {
          await this.dropiJobsService.updateSyncStockStep(jobId, 'raw', {
            status: 'running',
            progress: percent,
            message: `Descargando… página ${pageNumber} · ${totalProcessed} productos`,
            stats: {
              productosProcesados: totalProcessed,
              paginas: pageNumber,
            },
          });
        },
      });

      const syncRunId = rawResult.sync_run_id;
      const catalogDropiIds = await this.dropiRawService.getCatalogDropiIds(syncRunId);

      await this.dropiJobsService.updateSyncStockStep(jobId, 'raw', {
        status: 'completed',
        progress: 100,
        message: 'RAW completado',
        stats: {
          productosProcesados: rawResult.processed,
          totalDropi: rawResult.total,
          paginas: rawResult.pages_processed,
          syncRunId,
          catalogDropiIdsCount: catalogDropiIds.length,
          filasPurgadasCorridasAnteriores: rawResult.purged_stale,
          limpiezaRaw: `${rawResult.purged_stale} filas de corridas anteriores eliminadas`,
        },
      });

      // —— Paso 2: Normalizar ——
      await this.dropiJobsService.updateSyncStockStep(jobId, 'normalize', {
        status: 'running',
        progress: 0,
        message: 'Normalizando a dropi_products…',
        currentStep: 'normalize',
      });

      let offset = 0;
      const batchSize = 100;
      let hasMore = true;
      let normalizedTotal = 0;
      let totalPending = 0;

      while (hasMore) {
        if (await this.isJobCancelled(jobId)) {
          throw new Error('Job cancelado por el usuario');
        }

        const result = await this.dropiNormalizeService.normalizeProducts(
          batchSize,
          offset,
          undefined,
          false
        );

        normalizedTotal += result.normalized;
        totalPending = result.total_pending;

        const stepProgress =
          result.total_pending > 0
            ? Math.round(
                ((result.total_pending - result.remaining) / result.total_pending) * 100
              )
            : 100;

        await this.dropiJobsService.updateSyncStockStep(jobId, 'normalize', {
          status: 'running',
          progress: stepProgress,
          message: `Normalizando ${result.total_pending - result.remaining}/${result.total_pending}`,
          stats: {
            normalizadosAcumulado: normalizedTotal,
            totalRaw: result.total_pending,
            erroresAcumulado: result.errors,
          },
        });

        if (result.next_offset === null) {
          hasMore = false;
        } else {
          offset = result.next_offset;
        }
      }

      const purgedDropiProducts =
        await this.dropiSyncService.purgeDropiProductsNotInCatalog(catalogDropiIds);

      const retireStats =
        await this.dropiSyncService.retireProductsNotInCatalog(catalogDropiIds);

      const privatizadosDesactivados =
        await this.dropiSyncService.deactivateTankuProductsForPrivateDropi();

      const privatizadosEnDropi = await prisma.dropiProduct.count({
        where: { privatedProduct: true },
      });

      await this.dropiJobsService.updateSyncStockStep(jobId, 'normalize', {
        status: 'completed',
        progress: 100,
        message: 'Normalización y retiro fuera de catálogo completados',
        stats: {
          normalizados: normalizedTotal,
          totalRaw: totalPending,
          catalogDropiIdsCount: catalogDropiIds.length,
          purgedDropiProducts,
          retainedForOrders: retireStats.retainedForOrders,
          deletedNoOrders: retireStats.deletedNoOrders,
          markedOutOfCatalog: retireStats.markedOutOfCatalog,
          privatizadosEnDropi,
          privatizadosDesactivadosEnTanku: privatizadosDesactivados,
        },
      });

      // —— Paso 3: Sync backend ——
      await this.dropiJobsService.updateSyncStockStep(jobId, 'sync', {
        status: 'running',
        progress: 0,
        message: 'Sincronizando stock a Tanku…',
        currentStep: 'sync',
      });

      let syncOffset = 0;
      const syncBatchSize = 50;
      let syncHasMore = true;
      let syncBatches = 0;
      let variantsUpdated = 0;
      let warehouseVariantsCreated = 0;

      while (syncHasMore) {
        if (await this.isJobCancelled(jobId)) {
          throw new Error('Job cancelado por el usuario');
        }

        const syncResult = await this.dropiSyncService.syncToBackend(
          syncBatchSize,
          syncOffset,
          true,
          true,
          catalogDropiIds
        );

        syncBatches++;
        variantsUpdated += syncResult.variants_updated;
        warehouseVariantsCreated += syncResult.warehouse_variants_created;

        const stepProgress =
          syncResult.total > 0
            ? Math.round(
                ((syncResult.total - syncResult.remaining) / syncResult.total) * 100
              )
            : 100;

        await this.dropiJobsService.updateSyncStockStep(jobId, 'sync', {
          status: 'running',
          progress: stepProgress,
          message: `Backend ${syncResult.total - syncResult.remaining}/${syncResult.total} dropi_products`,
          stats: {
            lotes: syncBatches,
            dropiProductsTotal: syncResult.total,
            variantesActualizadas: variantsUpdated,
            warehouseVariantsCreados: warehouseVariantsCreated,
            excluidosSinStockRanking: syncResult.products_excluded_no_stock,
            incluidosConStockRanking: syncResult.products_included_with_stock,
          },
        });

        if (syncResult.next_offset === null) {
          syncHasMore = false;
        } else {
          syncOffset = syncResult.next_offset;
        }
      }

      await this.dropiJobsService.updateSyncStockStep(jobId, 'sync', {
        status: 'completed',
        progress: 100,
        message: 'Sync backend completado',
        stats: {
          lotes: syncBatches,
          variantesActualizadas: variantsUpdated,
          warehouseVariantsCreados: warehouseVariantsCreated,
        },
      });

      // —— Paso 4: Estados por stock ——
      await this.dropiJobsService.updateSyncStockStep(jobId, 'status', {
        status: 'running',
        progress: 0,
        message: 'Actualizando activo/inactivo por stock…',
        currentStep: 'status',
      });

      const catalogProducts = await prisma.product.findMany({
        where: { inDropiCatalog: true },
        select: { id: true },
      });

      let processed = 0;
      let variantsInactivated = 0;
      let productsInactivated = 0;

      for (const product of catalogProducts) {
        if (await this.isJobCancelled(jobId)) {
          throw new Error('Job cancelado por el usuario');
        }

        const variants = await prisma.productVariant.findMany({
          where: { productId: product.id },
          select: { id: true, active: true },
        });

        for (const variant of variants) {
          const wasActive = variant.active;
          await this.dropiSyncService.updateVariantStockStatus(variant.id);
          const after = await prisma.productVariant.findUnique({
            where: { id: variant.id },
            select: { active: true },
          });
          if (wasActive && after && !after.active) {
            variantsInactivated++;
          }
        }

        const productBefore = await prisma.product.findUnique({
          where: { id: product.id },
          select: { active: true },
        });

        await this.dropiSyncService.updateProductStatusFromVariants(product.id);

        const productAfter = await prisma.product.findUnique({
          where: { id: product.id },
          select: { active: true },
        });

        if (productBefore?.active && productAfter && !productAfter.active) {
          productsInactivated++;
        }

        await this.dropiSyncService.updateProductRankingStatus(product.id);

        processed++;
        if (
          processed % 25 === 0 ||
          processed === catalogProducts.length ||
          catalogProducts.length === 0
        ) {
          const stepProgress =
            catalogProducts.length > 0
              ? Math.round((processed / catalogProducts.length) * 100)
              : 100;
          await this.dropiJobsService.updateSyncStockStep(jobId, 'status', {
            status: 'running',
            progress: stepProgress,
            message: `Estados ${processed}/${catalogProducts.length} productos en catálogo`,
            stats: {
              productosRevisados: processed,
              productosEnCatalogo: catalogProducts.length,
              variantesInactivadas: variantsInactivated,
              productosInactivados: productsInactivated,
            },
          });
        }
      }

      await this.dropiJobsService.updateSyncStockStep(jobId, 'status', {
        status: 'completed',
        progress: 100,
        message: 'Estados actualizados',
        stats: {
          productosRevisados: processed,
          productosEnCatalogo: catalogProducts.length,
          variantesInactivadas: variantsInactivated,
          productosInactivados: productsInactivated,
        },
      });

      await this.dropiJobsService.finalizeSyncStockMetadata(jobId, true);
      console.log(`[SYNC_STOCK WORKER] Completado. ${processed} productos revisados.`);
    } catch (error: any) {
      const step = await this.dropiJobsService.getJob(jobId);
      const meta = step?.metadata as { currentStep?: string } | null;
      const failedStep = (meta?.currentStep as 'raw' | 'normalize' | 'sync' | 'status') || 'raw';
      if (['raw', 'normalize', 'sync', 'status'].includes(failedStep)) {
        await this.dropiJobsService.updateSyncStockStep(jobId, failedStep, {
          status: 'failed',
          message: error?.message || 'Error',
        });
      }
      throw error;
    }
  }
}
