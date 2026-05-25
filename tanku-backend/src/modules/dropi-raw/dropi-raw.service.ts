import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

export type SyncRawProgressUpdate = {
  percent: number;
  /** Página completada (1-based) */
  pageNumber: number;
  totalProcessed: number;
};

export type SyncRawProductsOptions = {
  onProgress?: (update: SyncRawProgressUpdate) => void | Promise<void>;
  shouldAbort?: () => boolean | Promise<boolean>;
  categoryIds?: string[];
  favorite?: boolean;
};

export class DropiRawService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Elimina filas raw de corridas anteriores (solo tras RAW completo exitoso).
   */
  /**
   * IDs Dropi del catálogo actual (último RAW exitoso con este syncRunId).
   */
  /**
   * Catálogo del RAW más reciente (último syncRunId en BD).
   */
  async getLatestCatalogDropiIds(): Promise<number[]> {
    const latest = await prisma.dropiRawProduct.findFirst({
      where: { syncRunId: { not: null } },
      orderBy: { syncedAt: 'desc' },
      select: { syncRunId: true },
    });
    if (!latest?.syncRunId) return [];
    return this.getCatalogDropiIds(latest.syncRunId);
  }

  async getCatalogDropiIds(syncRunId: string): Promise<number[]> {
    const rows = await prisma.dropiRawProduct.findMany({
      where: { syncRunId },
      select: { dropiId: true },
      distinct: ['dropiId'],
    });
    return rows.map((r) => r.dropiId);
  }

  async purgeStaleRawProducts(currentSyncRunId: string): Promise<number> {
    const result = await prisma.dropiRawProduct.deleteMany({
      where: {
        OR: [{ syncRunId: null }, { syncRunId: { not: currentSyncRunId } }],
      },
    });
    console.log(
      `[SYNC RAW] Limpieza post-éxito: ${result.count} filas de corridas anteriores eliminadas (run=${currentSyncRunId})`
    );
    return result.count;
  }

  /**
   * Sincronizar productos RAW desde Dropi.
   * Filtros opcionales: `favorite`, `categoryIds` (ver `listProducts`).
   * Al terminar sin error: elimina raw de corridas anteriores vía syncRunId.
   */
  async syncRawProducts(
    startPage: number = 0,
    maxPages: number | null = null,
    options?: SyncRawProductsOptions
  ): Promise<{
    success: boolean;
    message: string;
    processed: number;
    total: number;
    pages_processed: number;
    next_start_page: number;
    has_more: boolean;
    sync_run_id: string;
    purged_stale: number;
  }> {
    const pageSize = 40;
    const DELAY_BETWEEN_REQUESTS = 2000;
    const MAX_RETRIES = 5;
    const INITIAL_RETRY_DELAY = 3000;
    const syncRunId = randomUUID();

    let totalCount = 0;
    let totalProcessed = 0;
    let startData = startPage * pageSize;
    let pageNumber = startPage;

    const abortIfNeeded = async () => {
      if (options?.shouldAbort && (await options.shouldAbort())) {
        throw new Error('Job cancelado por el usuario');
      }
    };

    const reportProgress = async () => {
      if (!options?.onProgress) return;
      const percent =
        totalCount > 0 ? Math.min(Math.round((totalProcessed / totalCount) * 100), 100) : 0;
      await options.onProgress({
        percent,
        pageNumber: pageNumber + 1,
        totalProcessed,
      });
    };

    const listProductsParams = (startDataOffset: number) => ({
      pageSize,
      startData: startDataOffset,
      ...(options?.favorite === true ? { favorite: true } : {}),
      ...(options?.categoryIds?.length ? { categoryIds: options.categoryIds } : {}),
    });

    console.log(`\n[SYNC RAW] Iniciando sincronización (syncRunId=${syncRunId})`);
    console.log(`[SYNC RAW] Página inicial: ${startPage}, startData: ${startData}`);
    if (options?.favorite === true) {
      console.log('[SYNC RAW] Filtro: solo favoritos Dropi (favorite=true)');
    } else if (options?.categoryIds?.length) {
      console.log(
        `[SYNC RAW] Filtro categoría Dropi: ${options.categoryIds.length === 1 ? `"${options.categoryIds[0]}"` : `[${options.categoryIds.join(', ')}]`}`
      );
    } else {
      console.log('[SYNC RAW] Sin filtro (catálogo completo según API Dropi)');
    }

    try {
      await abortIfNeeded();

      const firstPage = await this.dropiService.listProducts(listProductsParams(startData));

      if (!firstPage?.isSuccess) {
        throw new Error(
          `Dropi API returned isSuccess: false. Message: ${firstPage?.message || 'N/A'}`
        );
      }

      totalCount = firstPage.count || 0;
      const firstPageProducts = firstPage.objects || [];
      const estimatedTotalPages =
        totalCount > 0 ? Math.ceil(totalCount / pageSize) : null;

      console.log(`[SYNC RAW] Total de productos en Dropi: ${totalCount}`);
      console.log(`[SYNC RAW] Productos en primera página: ${firstPageProducts.length}`);
      if (estimatedTotalPages) {
        console.log(`[SYNC RAW] Total estimado de páginas: ${estimatedTotalPages}`);
      }

      if (firstPageProducts.length > 0) {
        await abortIfNeeded();
        await this.saveRawProducts(firstPageProducts, 'index', syncRunId);
        totalProcessed += firstPageProducts.length;
        await reportProgress();
        console.log(
          `[SYNC RAW] Página ${pageNumber + 1}: ${firstPageProducts.length} guardados | acumulado ${totalProcessed}/${totalCount}`
        );
        pageNumber++;
      }

      startData += pageSize;
      while (true) {
        await abortIfNeeded();

        if (maxPages !== null && pageNumber >= startPage + maxPages) {
          break;
        }

        if (totalCount > 0 && startData >= totalCount) {
          break;
        }

        await this.delay(DELAY_BETWEEN_REQUESTS);

        let page;
        let retries = 0;

        while (retries <= MAX_RETRIES) {
          try {
            page = await this.dropiService.listProducts(listProductsParams(startData));
            break;
          } catch (error: any) {
            if (
              error?.message?.includes('429') ||
              error?.message?.includes('Too Many Attempts')
            ) {
              retries++;
              if (retries > MAX_RETRIES) {
                throw new Error(
                  `Error 429 después de ${MAX_RETRIES} reintentos. Rate limit de Dropi excedido.`
                );
              }
              const waitTime = INITIAL_RETRY_DELAY * Math.pow(2, retries - 1);
              console.log(
                `[SYNC RAW] Error 429, reintento ${retries}/${MAX_RETRIES} en ${waitTime}ms...`
              );
              await this.delay(waitTime);
              continue;
            }
            throw error;
          }
        }

        if (!page?.isSuccess || !Array.isArray(page.objects) || page.objects.length === 0) {
          console.log(`[SYNC RAW] Fin de paginación en página ${pageNumber + 1}`);
          break;
        }

        await this.saveRawProducts(page.objects, 'index', syncRunId);
        totalProcessed += page.objects.length;
        await reportProgress();

        if (estimatedTotalPages) {
          const remaining = totalCount > 0 ? totalCount - totalProcessed : 0;
          console.log(
            `[SYNC RAW] Página ${pageNumber + 1}/${estimatedTotalPages}: +${page.objects.length} | total ${totalProcessed}/${totalCount} | faltan ~${remaining}`
          );
        }

        startData += pageSize;
        pageNumber++;
      }

      await abortIfNeeded();

      const purgedStale = await this.purgeStaleRawProducts(syncRunId);

      console.log(`[SYNC RAW] Sincronización completada`);
      console.log(
        `[SYNC RAW] Procesados: ${totalProcessed} en ${pageNumber - startPage} páginas | purgados: ${purgedStale}`
      );

      if (options?.onProgress) {
        const pagesDone = Math.max(pageNumber - startPage, 0);
        await options.onProgress({
          percent: 100,
          pageNumber: pagesDone,
          totalProcessed,
        });
      }

      return {
        success: true,
        message: 'Sync RAW ejecutado',
        processed: totalProcessed,
        total: totalCount,
        pages_processed: pageNumber - startPage,
        next_start_page: pageNumber,
        has_more: totalCount > 0 ? startData < totalCount : false,
        sync_run_id: syncRunId,
        purged_stale: purgedStale,
      };
    } catch (error: any) {
      console.error(
        `[SYNC RAW] Error (syncRunId=${syncRunId}, sin limpieza de corridas anteriores): ${error?.message}`
      );
      throw error;
    }
  }

  private async saveRawProducts(
    products: any[],
    source: string,
    syncRunId: string
  ): Promise<void> {
    const now = new Date();

    for (const product of products) {
      try {
        await prisma.dropiRawProduct.upsert({
          where: {
            dropiId_source: {
              dropiId: product.id,
              source: source,
            },
          },
          create: {
            dropiId: product.id,
            source: source,
            payload: product as any,
            syncRunId,
            syncedAt: now,
          },
          update: {
            payload: product as any,
            syncRunId,
            syncedAt: now,
            updatedAt: now,
          },
        });
      } catch (error: any) {
        console.warn(
          `[SYNC RAW] Error en upsert para producto ${product.id}, reintento:`,
          error?.message
        );
        try {
          await prisma.dropiRawProduct.create({
            data: {
              dropiId: product.id,
              source: source,
              payload: product as any,
              syncRunId,
              syncedAt: now,
            },
          });
        } catch (createError: any) {
          if (createError?.code === 'P2002') {
            await prisma.dropiRawProduct.updateMany({
              where: {
                dropiId: product.id,
                source: source,
              },
              data: {
                payload: product as any,
                syncRunId,
                syncedAt: now,
                updatedAt: now,
              },
            });
          } else {
            throw createError;
          }
        }
      }
    }
  }
}
