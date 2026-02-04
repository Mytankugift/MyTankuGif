import { prisma } from '../../config/database';
import type { DropiRawProduct } from '@prisma/client';
import {
  extractWarehouseProductFromPayload,
  extractCategoryDropiIdsFromPayload,
  calculateTotalStockFromPayload,
  extractVariationsFromPayload,
} from '../../shared/utils/dropi-warehouse-helper'

export class DropiNormalizeService {
  async normalizeProducts(
    batchSize: number = 100,
    offset: number = 0,
    categoryId?: number,
    processAll: boolean = false
  ) {
    let normalizedTotal = 0;
    const errors: any[] = [];

    // Tomar todos los productos RAW ordenados
    let pendingRaw = await prisma.dropiRawProduct.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Filtrar por categoría si aplica
    if (categoryId) {
      pendingRaw = pendingRaw.filter((p) => {
        const payload = p.payload as any;
        const cat = payload.categories?.[0];
        const id = cat?.pivot?.category_id || cat?.id;
        return id === categoryId;
      });
    }

    const totalPending = pendingRaw.length;
    
    // Si processAll es true, ignoramos offset y batchSize
    const batch = processAll
      ? pendingRaw
      : pendingRaw.slice(offset, offset + batchSize);

    let isFirstProduct = true;

    for (const raw of batch) {
      try {
        const payload = raw.payload as any;

        // 1. Extraer categorías
        const categoryDropiIds = extractCategoryDropiIdsFromPayload(payload);
        const categoryDropiId = categoryDropiIds.length > 0 ? categoryDropiIds[0] : null;

        // 2. Extraer precios
        const salePrice = payload.sale_price ? Math.round(parseFloat(payload.sale_price)) : 0;
        const suggestedPrice = payload.suggested_price ? Math.round(parseFloat(payload.suggested_price)) : null;
        const finalPrice = salePrice > 0 ? salePrice : (suggestedPrice || 0);

        // 3. Extraer stock
        const stock = calculateTotalStockFromPayload(payload);

        // 4. Extraer warehouseProduct (solo para SIMPLE)
        const warehouseProduct = extractWarehouseProductFromPayload(payload);

        // 5. Extraer variationsData (solo para VARIABLE)
        const variationsData = extractVariationsFromPayload(payload);

        // 6. Extraer imagen principal
        const mainImageS3Path = payload.main_image_s3_path || payload.mainImageS3Path || null;

        // 7. SKU compuesto
        const compositeSku = payload.sku
          ? `${payload.sku}-DP-${payload.id}`
          : `DP-${payload.id}`;

        const existing = await prisma.dropiProduct.findUnique({ where: { dropiId: payload.id } });
        const productData: any = {
          dropiId: payload.id,
          name: payload.name || "",
          type: payload.type || "SIMPLE",
          sku: compositeSku,
          price: finalPrice,
          suggestedPrice: suggestedPrice, // ✅ AGREGADO
          categoryDropiId: categoryDropiId, // ✅ AGREGADO
          categoryDropiIds: categoryDropiIds.length > 0 ? categoryDropiIds : null, // ✅ AGREGADO
          stock: stock, // ✅ AGREGADO
          warehouseProduct: warehouseProduct.length > 0 ? warehouseProduct : undefined, // ✅ AGREGADO (undefined para campos JSON vacíos)
          variationsData: variationsData && variationsData.length > 0 ? variationsData : undefined, // ✅ AGREGADO (undefined para campos JSON vacíos)
          mainImageS3Path: mainImageS3Path, // ✅ AGREGADO
          lastSyncedAt: new Date(),
        };

        if (existing) {
          await prisma.dropiProduct.update({
            where: { id: existing.id },
            data: { ...productData, description: existing.description },
          });
        } else {
          await prisma.dropiProduct.create({ data: productData });
        }

        normalizedTotal++;
        isFirstProduct = false;
      } catch (error: any) {
        errors.push({ dropi_id: raw.dropiId, error: error?.message || "Error desconocido" });
        isFirstProduct = false;
      }
    }

    // ✅ CALCULAR next_offset correctamente
    const nextOffset = processAll 
      ? null  // Si processAll, no hay siguiente offset
      : (offset + batchSize < totalPending 
          ? offset + batchSize  // Hay más productos
          : null);  // Ya procesamos todos

    const remaining = Math.max(0, totalPending - (offset + batch.length));

    return {
      success: true,
      message: "Normalización ejecutada",
      normalized: normalizedTotal,
      errors: errors.length,
      error_details: errors.slice(0, 10),
      next_offset: nextOffset, // ✅ Ahora calcula correctamente
      remaining: remaining,
      total_pending: totalPending,
    };
  }
}

