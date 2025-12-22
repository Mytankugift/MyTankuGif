import { prisma } from '../../config/database'
import {
  extractWarehouseProductFromPayload,
  extractCategoryDropiIdsFromPayload,
  calculateTotalStockFromPayload,
} from '../../shared/utils/dropi-warehouse-helper'

export class DropiNormalizeService {
  async normalizeProducts(
    batchSize: number | null = 100,
    offset: number = 0,
    categoryId?: number,
    processAll: boolean = false
  ) {
    const effectiveBatchSize = processAll ? null : batchSize

    const allRawProducts = await prisma.dropiRawProduct.findMany({
      where: { source: 'index' },
      orderBy: { createdAt: 'asc' },
    })

    let pendingRaw = allRawProducts

    if (categoryId) {
      pendingRaw = pendingRaw.filter((p) => {
        const payload = p.payload as any
        const cat = payload.categories?.[0]
        const id = cat?.pivot?.category_id || cat?.id
        return id === categoryId
      })
    }

    const batch = effectiveBatchSize
      ? pendingRaw.slice(offset, offset + effectiveBatchSize)
      : pendingRaw.slice(offset)

    let normalized = 0
    const errors: any[] = []
    let isFirstProduct = true // Solo mostrar logs del primer producto para no saturar

    for (const raw of batch) {
      try {
        const payload = raw.payload as any

        // ============================================
        // LOGS DETALLADOS DEL PAYLOAD (solo primer producto)
        // ============================================
        if (isFirstProduct) {
          console.log('\n' + '='.repeat(80))
          console.log('📦 [PAYLOAD DEBUG] Producto ID:', payload.id)
          console.log('📦 [PAYLOAD DEBUG] Tipo:', payload.type)
          console.log('📦 [PAYLOAD DEBUG] Nombre:', payload.name)
          console.log('\n--- ESTRUCTURA DE PRICING ---')
          console.log('payload.pricing:', JSON.stringify(payload.pricing, null, 2))
          console.log('payload.sale_price (directo):', payload.sale_price)
          console.log('payload.suggested_price (directo):', payload.suggested_price)
          console.log('\n--- ESTRUCTURA COMPLETA DEL PAYLOAD (primer nivel) ---')
          console.log('Keys del payload:', Object.keys(payload))
          console.log('\n--- PAYLOAD COMPLETO (primeros 2000 caracteres) ---')
          const payloadStr = JSON.stringify(payload, null, 2)
          console.log(payloadStr.substring(0, 2000))
          if (payloadStr.length > 2000) {
            console.log('... (payload truncado, total:', payloadStr.length, 'caracteres)')
          }
          console.log('='.repeat(80) + '\n')
        }

        // Extraer imagen: puede estar en payload.gallery o payload.media.gallery
        const gallery = payload.gallery || payload.media?.gallery || []
        const mainImage = gallery.find((g: any) => g.main) || gallery[0]
        const mainImageS3Path = mainImage?.urlS3 || null

        // Extraer precios: están directamente en payload, NO en payload.pricing
        // Prioridad: payload.sale_price > payload.pricing?.sale_price
        const salePriceRaw = payload.sale_price || payload.pricing?.sale_price
        const suggestedPriceRaw = payload.suggested_price || payload.pricing?.suggested_price
        
        if (isFirstProduct) {
          console.log('\n--- EXTRACCIÓN DE PRECIOS ---')
          console.log('payload.sale_price (directo):', payload.sale_price, '(tipo:', typeof payload.sale_price, ')')
          console.log('payload.suggested_price (directo):', payload.suggested_price, '(tipo:', typeof payload.suggested_price, ')')
          console.log('payload.pricing?.sale_price (fallback):', payload.pricing?.sale_price)
          console.log('payload.pricing?.suggested_price (fallback):', payload.pricing?.suggested_price)
        }
        
        const salePrice = salePriceRaw && salePriceRaw !== "0" && salePriceRaw !== "0.00"
          ? Math.round(parseFloat(String(salePriceRaw)))
          : 0
        const suggestedPrice = suggestedPriceRaw && suggestedPriceRaw !== "0" && suggestedPriceRaw !== "0.00"
          ? Math.round(parseFloat(String(suggestedPriceRaw)))
          : null

        let finalPrice = salePrice > 0 ? salePrice : (suggestedPrice || 0)
        
        if (isFirstProduct) {
          console.log('salePriceRaw:', salePriceRaw)
          console.log('suggestedPriceRaw:', suggestedPriceRaw)
          console.log('salePrice (calculado):', salePrice)
          console.log('suggestedPrice (calculado):', suggestedPrice)
          console.log('finalPrice:', finalPrice)
        }

        if (payload.type === "VARIABLE" && finalPrice === 0) {
          const prices = payload.variations
            ?.map((v: any) => parseFloat(v.sale_price || v.suggested_price || 0))
            .filter((p: number) => p > 0)

          if (prices?.length) finalPrice = Math.min(...prices)
        }

        // VARIABLE: Guardar TODO el contenido de variations[] directamente desde payload (RAW)
        const variationsData =
          payload.type === "VARIABLE" && Array.isArray(payload.variations) && payload.variations.length > 0
            ? payload.variations
            : null

        // SIMPLE: Guardar TODO el array de warehouses completo directamente desde payload (RAW)
        // Incluye toda la estructura: id, stock, product_id, warehouse_id, warehouse (con city, etc.)
        // Verificar dónde están los warehouses en el payload
        if (isFirstProduct) {
          console.log('\n--- EXTRACCIÓN DE INVENTORY/WAREHOUSES ---')
          console.log('payload.inventory:', payload.inventory ? 'EXISTE' : 'NO EXISTE')
          if (payload.inventory) {
            console.log('payload.inventory.warehouses:', Array.isArray(payload.inventory.warehouses) ? `[${payload.inventory.warehouses.length} warehouses]` : 'NO ES ARRAY')
            if (Array.isArray(payload.inventory.warehouses) && payload.inventory.warehouses.length > 0) {
              console.log('Primer warehouse:', JSON.stringify(payload.inventory.warehouses[0], null, 2))
            }
          }
          console.log('payload.warehouse_product:', payload.warehouse_product ? 'EXISTE' : 'NO EXISTE')
          if (payload.warehouse_product) {
            console.log('payload.warehouse_product tipo:', typeof payload.warehouse_product)
            console.log('payload.warehouse_product es array:', Array.isArray(payload.warehouse_product))
            if (Array.isArray(payload.warehouse_product)) {
              console.log('payload.warehouse_product length:', payload.warehouse_product.length)
              if (payload.warehouse_product.length > 0) {
                console.log('Primer warehouse_product:', JSON.stringify(payload.warehouse_product[0], null, 2))
              }
            } else {
              console.log('payload.warehouse_product completo:', JSON.stringify(payload.warehouse_product, null, 2))
            }
          }
        }
        
        // Usar el helper para extraer warehouses (busca en inventory.warehouses y warehouse_product)
        const warehouseProductRaw = payload.type === "SIMPLE"
          ? extractWarehouseProductFromPayload(payload)
          : []
        const warehouseProduct = warehouseProductRaw && warehouseProductRaw.length > 0
          ? warehouseProductRaw
          : null

        const totalStock = calculateTotalStockFromPayload(payload)

        const compositeSku = payload.sku
          ? `${payload.sku}-DP-${payload.id}`
          : `DP-${payload.id}`

        const categoryDropiIds = extractCategoryDropiIdsFromPayload(payload)
        const mainCategory = payload.categories?.[0]
        const categoryDropiId =
          mainCategory?.pivot?.category_id || mainCategory?.id || null

        const productData = {
          dropiId: payload.id,
          name: payload.name || "",
          type: payload.type || "SIMPLE",
          sku: compositeSku,
          price: finalPrice,
          suggestedPrice: suggestedPrice,
          stock: totalStock,
          categoryDropiId,
          categoryDropiIds: categoryDropiIds.length ? categoryDropiIds : undefined,
          mainImageS3Path,
          warehouseProduct,
          variationsData,
          lastSyncedAt: new Date(),
        }

        // Log de datos finales que se van a guardar (solo primer producto)
        if (isFirstProduct) {
          console.log('\n--- DATOS FINALES A GUARDAR ---')
          console.log('productData:', JSON.stringify({
            dropiId: productData.dropiId,
            name: productData.name,
            type: productData.type,
            sku: productData.sku,
            price: productData.price,
            suggestedPrice: productData.suggestedPrice,
            stock: productData.stock,
            categoryDropiId: productData.categoryDropiId,
            categoryDropiIds: productData.categoryDropiIds,
            mainImageS3Path: productData.mainImageS3Path,
            warehouseProduct: productData.warehouseProduct ? `[${productData.warehouseProduct.length} warehouses]` : null,
            variationsData: productData.variationsData ? `[${productData.variationsData.length} variations]` : null,
          }, null, 2))
          console.log('\n')
        }

        const existing = await prisma.dropiProduct.findUnique({
          where: { dropiId: payload.id },
        })

        if (existing) {
          // Preservar campos enriquecidos (description, images, userVerified, descriptionSyncedAt)
          const updateData: any = {
            dropiId: productData.dropiId,
            name: productData.name,
            type: productData.type,
            sku: productData.sku,
            price: productData.price,
            stock: productData.stock,
            categoryDropiId: productData.categoryDropiId,
            categoryDropiIds: categoryDropiIds.length ? categoryDropiIds : undefined,
            mainImageS3Path: productData.mainImageS3Path,
            warehouseProduct: productData.warehouseProduct ?? undefined,
            variationsData: productData.variationsData ?? undefined,
            lastSyncedAt: productData.lastSyncedAt,
            // Preservar campos enriquecidos
            description: existing.description,
            images: existing.images ?? undefined,
            userVerified: existing.userVerified,
          }
          
          // Solo incluir suggestedPrice si tiene valor
          if (productData.suggestedPrice !== null && productData.suggestedPrice !== undefined) {
            updateData.suggestedPrice = productData.suggestedPrice
          }
          
          await prisma.dropiProduct.update({
            where: { id: existing.id },
            data: updateData,
          })
        } else {
          await prisma.dropiProduct.create({
            data: {
              ...productData,
              warehouseProduct: productData.warehouseProduct ?? undefined,
              variationsData: productData.variationsData ?? undefined,
              description: null,
              userVerified: false,
            },
          })
        }

        normalized++
        isFirstProduct = false // Solo mostrar logs del primer producto
      } catch (error: any) {
        errors.push({
          dropi_id: raw.dropiId,
          error: error?.message || "Error desconocido",
        })
        isFirstProduct = false
      }
    }

    const processed = batch.length
    const remaining = pendingRaw.length - (offset + processed)

    return {
      success: true,
      message: "Normalización ejecutada",
      normalized,
      errors: errors.length,
      error_details: errors.slice(0, 10),
      next_offset: remaining > 0 ? offset + processed : null,
      remaining,
      total_pending: pendingRaw.length,
    }
  }
}
