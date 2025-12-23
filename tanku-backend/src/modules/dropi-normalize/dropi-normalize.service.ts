import { prisma } from '../../config/database';
import type { DropiRawProduct } from '@prisma/client';
import {
  extractWarehouseProductFromPayload,
  extractCategoryDropiIdsFromPayload,
  calculateTotalStockFromPayload,
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

    // Si processAll es true, ignoramos offset y batchSize
    const batch = processAll
      ? pendingRaw
      : pendingRaw.slice(offset, offset + batchSize);

    let isFirstProduct = true;

    for (const raw of batch) {
      try {
        const payload = raw.payload as any;

        // Aquí va todo tu código de normalización (precios, warehouse, variations, etc.)
        const compositeSku = payload.sku
          ? `${payload.sku}-DP-${payload.id}`
          : `DP-${payload.id}`;
        const finalPrice = parseFloat(payload.sale_price || payload.suggested_price || 0);

        const existing = await prisma.dropiProduct.findUnique({ where: { dropiId: payload.id } });
        const productData = {
          dropiId: payload.id,
          name: payload.name || "",
          type: payload.type || "SIMPLE",
          sku: compositeSku,
          price: finalPrice,
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

    return {
      success: true,
      message: "Normalización ejecutada",
      normalized: normalizedTotal,
      errors: errors.length,
      error_details: errors.slice(0, 10),
      next_offset: null, // null porque ya procesamos todos
      remaining: 0,
      total_pending: pendingRaw.length,
    };
  }
}

