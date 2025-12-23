import { prisma } from '../../config/database';
import type { DropiRawProduct } from '@prisma/client';
import {
  extractWarehouseProductFromPayload,
  extractCategoryDropiIdsFromPayload,
  calculateTotalStockFromPayload,
} from '../../shared/utils/dropi-warehouse-helper'

export class DropiNormalizeService {
  async normalizeProducts(batchSize: number = 100, categoryId?: number) {
    let normalizedTotal = 0;
    const errors: any[] = [];
    let lastCreatedAt: Date | null = null;

    while (true) {
      // Tomar el siguiente batch de productos, ordenados por createdAt
      const batch: DropiRawProduct[] = await prisma.dropiRawProduct.findMany({
        where: lastCreatedAt
          ? { createdAt: { gt: lastCreatedAt } }
          : {},
        orderBy: { createdAt: 'asc' },
        take: batchSize,
      });

      // Filtrar por categoría si aplica
      let batchFiltered = batch;
      if (categoryId) {
        batchFiltered = batch.filter((p) => {
          const payload = p.payload as any;
          const cat = payload.categories?.[0];
          const id = cat?.pivot?.category_id || cat?.id;
          return id === categoryId;
        });
      }

      if (batchFiltered.length === 0) break; // No hay más productos, terminamos

      let isFirstProduct = true;

      for (const raw of batchFiltered) {
        try {
          const payload = raw.payload as any;

          // ============================================
          // LOGS DETALLADOS DEL PAYLOAD (solo primer producto)
          // ============================================
          if (isFirstProduct) {
            console.log('\n' + '='.repeat(80));
            console.log('📦 [PAYLOAD DEBUG] Producto ID:', payload.id);
            console.log('📦 [PAYLOAD DEBUG] Tipo:', payload.type);
            console.log('📦 [PAYLOAD DEBUG] Nombre:', payload.name);
            console.log('\n--- ESTRUCTURA DE PRICING ---');
            console.log('payload.pricing:', JSON.stringify(payload.pricing, null, 2));
            console.log('payload.sale_price (directo):', payload.sale_price);
            console.log('payload.suggested_price (directo):', payload.suggested_price);
            console.log('\n--- ESTRUCTURA COMPLETA DEL PAYLOAD (primer nivel) ---');
            console.log('Keys del payload:', Object.keys(payload));
            console.log('\n--- PAYLOAD COMPLETO (primeros 2000 caracteres) ---');
            const payloadStr = JSON.stringify(payload, null, 2);
            console.log(payloadStr.substring(0, 2000));
            if (payloadStr.length > 2000) {
              console.log('... (payload truncado, total:', payloadStr.length, 'caracteres)');
            }
            console.log('='.repeat(80) + '\n');
          }

          // ============================================
          // IMAGEN PRINCIPAL
          // ============================================
          const gallery = payload.gallery || payload.media?.gallery || [];
          const mainImage = gallery.find((g: any) => g.main) || gallery[0];
          const mainImageS3Path = mainImage?.urlS3 || null;

          // ============================================
          // PRECIOS
          // ============================================
          const salePriceRaw = payload.sale_price || payload.pricing?.sale_price;
          const suggestedPriceRaw = payload.suggested_price || payload.pricing?.suggested_price;

          const salePrice = salePriceRaw && salePriceRaw !== "0" && salePriceRaw !== "0.00"
            ? Math.round(parseFloat(String(salePriceRaw)))
            : 0;
          const suggestedPrice = suggestedPriceRaw && suggestedPriceRaw !== "0" && suggestedPriceRaw !== "0.00"
            ? Math.round(parseFloat(String(suggestedPriceRaw)))
            : null;

          let finalPrice = salePrice > 0 ? salePrice : (suggestedPrice || 0);

          if (payload.type === "VARIABLE" && finalPrice === 0) {
            const prices = payload.variations
              ?.map((v: any) => parseFloat(v.sale_price || v.suggested_price || 0))
              .filter((p: number) => p > 0);
            if (prices?.length) finalPrice = Math.min(...prices);
          }

          // ============================================
          // VARIACIONES Y INVENTARIO
          // ============================================
          const variationsData =
            payload.type === "VARIABLE" && Array.isArray(payload.variations) && payload.variations.length > 0
              ? payload.variations
              : null;

          const warehouseProductRaw = payload.type === "SIMPLE"
            ? extractWarehouseProductFromPayload(payload)
            : [];
          const warehouseProduct = warehouseProductRaw && warehouseProductRaw.length > 0
            ? warehouseProductRaw
            : null;

          const totalStock = calculateTotalStockFromPayload(payload);

          // SKU compuesto
          const compositeSku = payload.sku
            ? `${payload.sku}-DP-${payload.id}`
            : `DP-${payload.id}`;

          // Categorías
          const categoryDropiIds = extractCategoryDropiIdsFromPayload(payload);
          const mainCategory = payload.categories?.[0];
          const categoryDropiId = mainCategory?.pivot?.category_id || mainCategory?.id || null;

          // ============================================
          // CONSTRUCCIÓN DEL OBJETO PARA PRISMA
          // ============================================
          const productData = {
            dropiId: payload.id,
            name: payload.name || "",
            type: payload.type || "SIMPLE",
            sku: compositeSku,
            price: finalPrice,
            suggestedPrice: suggestedPrice || undefined,
            stock: totalStock || undefined,
            categoryDropiId: categoryDropiId ?? undefined,
            categoryDropiIds: categoryDropiIds.length ? categoryDropiIds : undefined,
            mainImageS3Path: mainImageS3Path || undefined,
            warehouseProduct: warehouseProduct ?? undefined,
            variationsData: variationsData ?? undefined,
            description: null,
            userVerified: false,
            lastSyncedAt: new Date(),
          };

          // ============================================
          // GUARDADO O ACTUALIZACIÓN
          // ============================================
          const existing = await prisma.dropiProduct.findUnique({
            where: { dropiId: payload.id },
          });

          if (existing) {
            await prisma.dropiProduct.update({
              where: { id: existing.id },
              data: {
                ...productData,
                // preservar campos enriquecidos
                description: existing.description,
                images: existing.images ?? undefined,
                userVerified: existing.userVerified,
              },
            });
          } else {
            await prisma.dropiProduct.create({
              data: productData,
            });
          }

          normalizedTotal++;
          isFirstProduct = false;
        } catch (error: any) {
          errors.push({ dropi_id: raw.dropiId, error: error?.message || "Error desconocido" });
          isFirstProduct = false;
        }
      }

      // Preparar para el siguiente batch
      lastCreatedAt = batch[batch.length - 1].createdAt;
    }

    return {
      success: true,
      message: "Normalización ejecutada",
      normalized: normalizedTotal,
      errors: errors.length,
      error_details: errors.slice(0, 10),
    };
  }
}
