import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { FeedService } from '../feed/feed.service';
import type { Product } from '@prisma/client';

/**
 * Limpia HTML de una descripción, convirtiéndola a texto plano
 */
function cleanDescription(html: string | null | undefined): string | null {
  if (!html) return null;
  
  let cleaned = html
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/<em>/gi, '*')
    .replace(/<\/em>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned || null;
}

/**
 * Genera handle único desde el nombre
 */
function generateHandle(name: string, dropiId: number): string {
  const baseHandle = name
    ?.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `product-${dropiId}`;
  
  return `${baseHandle}-${dropiId}`;
}

/**
 * Construye URL de imagen desde S3 path
 */
function buildImageUrl(s3Path: string | null | undefined): string | null {
  if (!s3Path) return null;
  
  const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
  
  if (s3Path.startsWith('http://') || s3Path.startsWith('https://')) {
    return s3Path;
  }
  
  const cleanPath = s3Path.startsWith('/') ? s3Path.substring(1) : s3Path;
  return `${cdnBase}/${cleanPath}`;
}

export class DropiSyncService {
  /**
   * Sincronizar productos desde DropiProduct a Product/ProductVariant/WarehouseVariant
   * 
   * @param batchSize Número de productos a procesar por lote (default: 50)
   * @param offset Offset para continuar desde donde quedó (default: 0)
   * @param activeOnly Solo productos activos (default: true)
   * @param skipExisting Omitir productos que ya existen (default: false)
   * @returns Estadísticas de sincronización
   */
  async syncToBackend(
    batchSize: number = 50,
    offset: number = 0,
    activeOnly: boolean = true,
    skipExisting: boolean = false
  ): Promise<{
    success: boolean;
    message: string;
    products_created: number;
    products_updated: number;
    variants_created: number;
    variants_updated: number;
    warehouse_variants_created: number;
    errors: number;
    error_details: Array<{ dropi_id: number; error: string }>;
    next_offset: number | null;
    remaining: number;
    total: number;
  }> {
    console.log(`\n🔄 [SYNC TO BACKEND] Iniciando sincronización`);
    console.log(`🔄 [SYNC TO BACKEND] batch_size: ${batchSize}, offset: ${offset}, active_only: ${activeOnly}, skip_existing: ${skipExisting}`);

    try {
      // Buscar productos desde DropiProduct
      const where: any = {};
      // Nota: DropiProduct no tiene campo 'active' en el schema actual
      // Si necesitamos filtrar por activos, podemos agregar el campo o filtrar por otro criterio

      const allDropiProducts = await prisma.dropiProduct.findMany({
        where,
        orderBy: {
          createdAt: 'asc',
        },
      });

      const batch = allDropiProducts.slice(offset, offset + batchSize);

      if (batch.length === 0) {
        return {
          success: true,
          message: 'No hay productos para sincronizar',
          products_created: 0,
          products_updated: 0,
          variants_created: 0,
          variants_updated: 0,
          warehouse_variants_created: 0,
          errors: 0,
          error_details: [],
          next_offset: null,
          remaining: 0,
          total: allDropiProducts.length,
        };
      }

      let productsCreated = 0;
      let productsUpdated = 0;
      let variantsCreated = 0;
      let variantsUpdated = 0;
      this.warehouseVariantsCreated = 0; // Resetear contador
      const errors: Array<{ dropi_id: number; error: string }> = [];

      // Obtener todas las categorías para mapeo rápido por dropiId
      const categories = await prisma.category.findMany({
        where: {
          dropiId: {
            not: null,
          },
        },
      });
      const categoryMapByDropiId = new Map<number, string>();
      
      // Mapear categorías Dropi → Category usando dropiId directamente
      for (const cat of categories) {
        if (cat.dropiId) {
          categoryMapByDropiId.set(cat.dropiId, cat.id);
        }
      }
      
      console.log(`[SYNC TO BACKEND] 📋 Mapeo de categorías: ${categoryMapByDropiId.size} categorías con dropiId`);

      for (const dropiProduct of batch) {
        try {
          console.log(`\n[SYNC TO BACKEND] ════════════════════════════════════════════════════════`);
          console.log(`[SYNC TO BACKEND] 📦 PRODUCTO ${dropiProduct.dropiId}: ${dropiProduct.name}`);
          console.log(`[SYNC TO BACKEND] ════════════════════════════════════════════════════════`);

          // 1. Mapear categoría Dropi → Category
          // IMPORTANTE: Las categorías deben sincronizarse primero desde Dropi usando el endpoint correspondiente
          // para que tengan el campo dropiId poblado en la tabla Category
          let categoryId: string | null = null;
          if (dropiProduct.categoryDropiId) {
            categoryId = categoryMapByDropiId.get(dropiProduct.categoryDropiId) || null;
            if (!categoryId) {
              console.warn(`[SYNC TO BACKEND] ⚠️ No se encontró categoría para category_dropi_id: ${dropiProduct.categoryDropiId}`);
              console.warn(`[SYNC TO BACKEND] ⚠️ Asegúrate de sincronizar las categorías desde Dropi primero para que tengan el campo dropiId`);
            } else {
              console.log(`[SYNC TO BACKEND] ✅ Categoría encontrada: dropiId=${dropiProduct.categoryDropiId} → categoryId=${categoryId}`);
            }
          } else {
            console.log(`[SYNC TO BACKEND] ℹ️ Producto sin categoryDropiId, se creará sin categoría`);
          }

          // 2. Construir handle único
          const handle = generateHandle(dropiProduct.name, dropiProduct.dropiId);

          // 3. Construir imágenes
          // Prioridad: Si images tiene contenido, usar solo eso. Si no, usar mainImageS3Path
          const imageSet = new Set<string>();
          let hasImagesFromEnrich = false;

          // Primero verificar si hay imágenes del enrich
          if (dropiProduct.images && Array.isArray(dropiProduct.images) && dropiProduct.images.length > 0) {
            for (const img of dropiProduct.images) {
              if (typeof img === 'object' && img !== null) {
                const imgUrl = (img as any).url || (img as any).urlS3;
                if (imgUrl && imgUrl.trim()) {
                  const fullUrl = imgUrl.startsWith('http') ? imgUrl : buildImageUrl(imgUrl);
                  if (fullUrl) {
                    imageSet.add(fullUrl);
                    hasImagesFromEnrich = true;
                  }
                }
              } else if (typeof img === 'string' && img.trim()) {
                const fullUrl = img.startsWith('http') ? img : buildImageUrl(img);
                if (fullUrl) {
                  imageSet.add(fullUrl);
                  hasImagesFromEnrich = true;
                }
              }
            }
          }

          // Solo si NO hay imágenes del enrich, usar mainImageS3Path
          if (!hasImagesFromEnrich) {
            const mainImageUrl = buildImageUrl(dropiProduct.mainImageS3Path);
            if (mainImageUrl) {
              imageSet.add(mainImageUrl);
            }
          }
          
          const images = Array.from(imageSet);

          // 4. Crear o actualizar Product
          const productData = {
            title: dropiProduct.name || 'Sin nombre',
            handle: handle,
            description: cleanDescription(dropiProduct.description),
            images: images,
            categoryId: categoryId,
            active: true, // Por defecto activo
          };

          const existingProduct = await prisma.product.findUnique({
            where: { handle },
          });

          let product: Product;
          if (existingProduct) {
            if (skipExisting) {
              console.log(`[SYNC TO BACKEND] ⏭️ Omitiendo producto existente: ${existingProduct.id}`);
              continue;
            }
            product = await prisma.product.update({
              where: { id: existingProduct.id },
              data: productData,
            });
            productsUpdated++;
            console.log(`[SYNC TO BACKEND] ✅ Producto actualizado: ${product.id}`);
          } else {
            product = await prisma.product.create({
              data: productData,
            });
            productsCreated++;
            console.log(`[SYNC TO BACKEND] ✅ Producto creado: ${product.id}`);

            // Inicializar métricas del feed para el nuevo producto (asíncrono, no bloquea)
            const feedService = new FeedService();
            feedService.initializeItemMetrics(product.id, 'product').catch((error) => {
              console.error(`Error inicializando métricas del feed para producto ${product.id}:`, error);
            });
          }

          // Validar que el producto existe antes de continuar
          if (!product || !product.id) {
            throw new Error(`No se pudo crear/obtener el producto para dropiId: ${dropiProduct.dropiId}`);
          }

          // 5. Crear variantes
          const isVariable = dropiProduct.type === 'VARIABLE' && 
            dropiProduct.variationsData && 
            Array.isArray(dropiProduct.variationsData) && 
            dropiProduct.variationsData.length > 0;

          if (isVariable) {
            // PRODUCTO VARIABLE: Crear múltiples variantes
            const variations = dropiProduct.variationsData as any[] | null;
            if (!variations || !Array.isArray(variations)) {
              console.warn(`[SYNC TO BACKEND] ⚠️ Producto VARIABLE sin variationsData válido: ${dropiProduct.dropiId}`);
              continue;
            }
            console.log(`[SYNC TO BACKEND] 🔹 Creando ${variations.length} variantes para producto VARIABLE...`);
            // Buscar variantes existentes por SKU (más confiable que por productId)
            // Ya que el SKU es único y no depende de la relación con Product
            const allExistingVariants = await prisma.productVariant.findMany({
              where: {
                sku: {
                  startsWith: `DP-${dropiProduct.dropiId}-`,
                },
              },
            });

            for (let i = 0; i < variations.length; i++) {
              const variation = variations[i];
              const variationSku = variation.sku
                ? `DP-${dropiProduct.dropiId}-${variation.sku}`
                : `DP-${dropiProduct.dropiId}-VAR-${variation.id || i}`;

              const variationSalePrice = variation.sale_price ? Math.round(variation.sale_price) : 0;
              const variationSuggestedPrice = variation.suggested_price ? Math.round(variation.suggested_price) : (dropiProduct.suggestedPrice || null);
              const variationPrice = variationSalePrice > 0 ? variationSalePrice : (variationSuggestedPrice || dropiProduct.price || 0);
              
              // Extraer atributos desde attribute_values (estructura real del raw)
              // attribute_values: [{ attribute_name: "Color", value: "Negro" }, { attribute_name: "Talla", value: "L" }]
              let attributesData: any[] = [];
              let variationTitle = dropiProduct.name;
              
              if (variation.attribute_values && Array.isArray(variation.attribute_values)) {
                // Usar attribute_values (estructura real)
                attributesData = variation.attribute_values.map((attr: any) => ({
                  attribute_name: attr.attribute_name || attr.name,
                  value: attr.value,
                }));
                
                const attrs = attributesData
                  .map((attr: any) => `${attr.attribute_name}: ${attr.value}`)
                  .join(', ');
                if (attrs) {
                  variationTitle = `${dropiProduct.name} - ${attrs}`;
                }
              } else if (variation.attributes && Array.isArray(variation.attributes)) {
                // Fallback: usar attributes si existe (formato antiguo)
                attributesData = variation.attributes.map((attr: any) => ({
                  attribute_name: attr.name || attr.attribute_name,
                  value: attr.value,
                }));
                
                const attrs = attributesData
                  .map((attr: any) => `${attr.attribute_name}: ${attr.value}`)
                  .join(', ');
                if (attrs) {
                  variationTitle = `${dropiProduct.name} - ${attrs}`;
                }
              } else if (variation.attributes && typeof variation.attributes === 'object') {
                // Fallback: attributes como objeto
                attributesData = Object.entries(variation.attributes).map(([key, value]) => ({
                  attribute_name: key,
                  value: value,
                }));
                
                const attrs = Object.entries(variation.attributes)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(', ');
                if (attrs) {
                  variationTitle = `${dropiProduct.name} - ${attrs}`;
                }
              }

              const existingVariant = allExistingVariants.find((v) => v.sku === variationSku);

              let variant;
              let shouldCreate = false;

              if (existingVariant) {
                try {
                  // Verificar que el Product existe antes de actualizar
                  const productExists = await prisma.product.findUnique({
                    where: { id: product.id },
                  });
                  
                  if (!productExists) {
                    throw new Error(`Product ${product.id} no existe`);
                  }

                  // Verificar que el existingVariant tiene productId válido
                  if (!existingVariant.productId || existingVariant.productId !== product.id) {
                    console.warn(`[SYNC TO BACKEND]    ⚠️ Variante ${variationSku} tiene productId diferente (${existingVariant.productId} vs ${product.id}), actualizando...`);
                    // Si el productId es diferente, actualizarlo también
                    variant = await prisma.productVariant.update({
                      where: { id: existingVariant.id },
                      data: {
                        productId: product.id, // Asegurar que el productId sea correcto
                        title: variationTitle,
                        price: variationPrice,
                        suggestedPrice: variationSuggestedPrice,
                        attributes: attributesData.length > 0 ? attributesData : undefined,
                      },
                    });
                  } else {
                    variant = await prisma.productVariant.update({
                      where: { id: existingVariant.id },
                      data: {
                        title: variationTitle,
                        price: variationPrice,
                        suggestedPrice: variationSuggestedPrice,
                        attributes: attributesData.length > 0 ? attributesData : undefined,
                      },
                    });
                  }
                  variantsUpdated++;
                  console.log(`[SYNC TO BACKEND]    ✅ Variante actualizada: ${variationSku}`);
                } catch (updateError: any) {
                  // Si falla la actualización (por ejemplo, P2014 - relación inválida)
                  // Eliminar la variante existente y recrearla
                  if (updateError?.code === 'P2014' || updateError?.message?.includes('relation') || updateError?.message?.includes('required relation')) {
                    console.warn(`[SYNC TO BACKEND]    ⚠️ Error de relación al actualizar variante ${variationSku} (${updateError?.code}): ${updateError?.message}`);
                    console.warn(`[SYNC TO BACKEND]    ⚠️ Eliminando variante existente y recreándola...`);
                    try {
                      await prisma.productVariant.delete({
                        where: { id: existingVariant.id },
                      });
                      console.log(`[SYNC TO BACKEND]    ✅ Variante eliminada, se recreará...`);
                    } catch (deleteError: any) {
                      console.warn(`[SYNC TO BACKEND]    ⚠️ Error eliminando variante: ${deleteError?.message}`);
                    }
                    // Marcar para crear la variante de nuevo
                    shouldCreate = true;
                  } else {
                    throw updateError; // Re-lanzar si es otro error
                  }
                }
              } else {
                shouldCreate = true;
              }
              
              // Crear variante si no existe o si falló la actualización
              if (shouldCreate && !variant) {
                variant = await prisma.productVariant.create({
                  data: {
                    productId: product.id,
                    sku: variationSku,
                    title: variationTitle,
                    price: variationPrice,
                    suggestedPrice: variationSuggestedPrice,
                    attributes: attributesData.length > 0 ? attributesData : undefined,
                    active: true,
                  },
                });
                variantsCreated++;
                console.log(`[SYNC TO BACKEND]    ✅ Variante creada: ${variationSku}`);
              }

              // Validar que la variante se creó/actualizó correctamente
              if (!variant || !variant.id) {
                throw new Error(`No se pudo crear/actualizar la variante para SKU: ${variationSku}`);
              }

              // 6. Crear WarehouseVariant desde warehouse_product_variation[] (SOLO para VARIABLE)
              // Para VARIABLE: NO usar dropiProduct.warehouseProduct, usar SOLO variation.warehouse_product_variation[]
              await this.createWarehouseVariantsForVariable(
                variant.id,
                variation.warehouse_product_variation || [],
                variation.stock || 0
              );
            }
          } else {
            // PRODUCTO SIMPLE: Crear una sola variante
            console.log(`[SYNC TO BACKEND] 🔹 Creando variante única para producto SIMPLE...`);

            // El SKU ya viene con formato compuesto desde normalize: {sku}-DP-{dropiId} o DP-{dropiId}
            const uniqueSku = dropiProduct.sku || `DP-${dropiProduct.dropiId}`;

            const finalPrice = Math.round(dropiProduct.price || 0);
            const finalSuggestedPrice = dropiProduct.suggestedPrice ? Math.round(dropiProduct.suggestedPrice) : null;

            const existingVariant = await prisma.productVariant.findUnique({
              where: { sku: uniqueSku },
            });

            let variant;
            let shouldCreate = false;

            if (existingVariant) {
              try {
                // Verificar que el Product existe antes de actualizar
                const productExists = await prisma.product.findUnique({
                  where: { id: product.id },
                });
                
                if (!productExists) {
                  throw new Error(`Product ${product.id} no existe`);
                }

                // Verificar que el existingVariant tiene productId válido
                if (!existingVariant.productId || existingVariant.productId !== product.id) {
                  console.warn(`[SYNC TO BACKEND]    ⚠️ Variante ${uniqueSku} tiene productId diferente (${existingVariant.productId} vs ${product.id}), actualizando...`);
                  // Si el productId es diferente, actualizarlo también
                  variant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: {
                      productId: product.id, // Asegurar que el productId sea correcto
                      title: dropiProduct.name || 'Default',
                      price: finalPrice,
                      suggestedPrice: finalSuggestedPrice,
                    },
                  });
                } else {
                  variant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: {
                      title: dropiProduct.name || 'Default',
                      price: finalPrice,
                      suggestedPrice: finalSuggestedPrice,
                    },
                  });
                }
                variantsUpdated++;
                console.log(`[SYNC TO BACKEND]    ✅ Variante actualizada: ${uniqueSku}`);
              } catch (updateError: any) {
                // Si falla la actualización (por ejemplo, P2014 - relación inválida)
                if (updateError?.code === 'P2014' || updateError?.message?.includes('relation') || updateError?.message?.includes('required relation')) {
                  console.warn(`[SYNC TO BACKEND]    ⚠️ Error de relación al actualizar variante ${uniqueSku} (${updateError?.code}): ${updateError?.message}`);
                  console.warn(`[SYNC TO BACKEND]    ⚠️ Eliminando variante existente y recreándola...`);
                  try {
                    await prisma.productVariant.delete({
                      where: { id: existingVariant.id },
                    });
                    console.log(`[SYNC TO BACKEND]    ✅ Variante eliminada, se recreará...`);
                  } catch (deleteError: any) {
                    console.warn(`[SYNC TO BACKEND]    ⚠️ Error eliminando variante: ${deleteError?.message}`);
                  }
                  shouldCreate = true;
                } else {
                  throw updateError; // Re-lanzar si es otro error
                }
              }
            } else {
              shouldCreate = true;
            }

            // Crear variante si no existe o si falló la actualización
            if (shouldCreate && !variant) {
              variant = await prisma.productVariant.create({
                data: {
                  productId: product.id,
                  sku: uniqueSku,
                  title: dropiProduct.name || 'Default',
                  price: finalPrice,
                  suggestedPrice: finalSuggestedPrice,
                  active: true,
                },
              });
              variantsCreated++;
              console.log(`[SYNC TO BACKEND]    ✅ Variante creada: ${uniqueSku}`);
            }

            // Validar que la variante se creó/actualizó correctamente
            if (!variant || !variant.id) {
              throw new Error(`No se pudo crear/actualizar la variante para SKU: ${uniqueSku}`);
            }

            // 6. Crear WarehouseVariant desde warehouseProduct (SOLO para SIMPLE)
            // Para SIMPLE: NO usar fallback de dropiProduct.stock
            await this.createWarehouseVariantsForSimple(
              variant.id,
              dropiProduct.warehouseProduct
            );
          }

          console.log(`[SYNC TO BACKEND] ✅ PRODUCTO ${dropiProduct.dropiId} COMPLETADO`);
          console.log(`[SYNC TO BACKEND] ════════════════════════════════════════════════════════\n`);
        } catch (error: any) {
          console.error(`[SYNC TO BACKEND] ❌ Error sincronizando producto ${dropiProduct.dropiId}:`, error);
          errors.push({
            dropi_id: dropiProduct.dropiId,
            error: error?.message || 'Error desconocido',
          });
        }
      }

      const nextOffset = offset + batchSize;
      const remaining = allDropiProducts.length - nextOffset;

      console.log(`✅ [SYNC TO BACKEND] Sincronización completada`);
      console.log(`   - Productos creados: ${productsCreated}`);
      console.log(`   - Productos actualizados: ${productsUpdated}`);
      console.log(`   - Variantes creadas: ${variantsCreated}`);
      console.log(`   - Variantes actualizadas: ${variantsUpdated}`);
      console.log(`   - WarehouseVariants creados: ${this.warehouseVariantsCreated}`);
      console.log(`   - Errores: ${errors.length}`);

      return {
        success: true,
        message: 'Sincronización ejecutada',
        products_created: productsCreated,
        products_updated: productsUpdated,
        variants_created: variantsCreated,
        variants_updated: variantsUpdated,
        warehouse_variants_created: this.warehouseVariantsCreated,
        errors: errors.length,
        error_details: errors.slice(0, 10),
        next_offset: remaining > 0 ? nextOffset : null,
        remaining: remaining,
        total: allDropiProducts.length,
      };
    } catch (error: any) {
      console.error(`❌ [SYNC TO BACKEND] Error fatal:`, error);
      throw error;
    }
  }

  private warehouseVariantsCreated = 0;

  /**
   * Crear WarehouseVariant para producto SIMPLE
   * Fuente: dropiProduct.warehouseProduct[]
   * NO usa fallback de stock
   * 
   * @param variantId ID de la variante
   * @param warehouseProduct Array de warehouses desde dropiProduct.warehouseProduct
   */
  private async createWarehouseVariantsForSimple(
    variantId: string,
    warehouseProduct: any
  ): Promise<void> {
    // Para SIMPLE: SOLO usar warehouseProduct[], NO fallback
    if (!warehouseProduct || !Array.isArray(warehouseProduct) || warehouseProduct.length === 0) {
      console.log(`[SYNC TO BACKEND]    ⚠️ Producto SIMPLE sin warehouseProduct, no se crean WarehouseVariants`);
      return;
    }

    // Crear WarehouseVariant para cada warehouse
    for (const warehouse of warehouseProduct) {
      const warehouseId = warehouse.warehouse_id || warehouse.id || 0;
      const warehouseName = warehouse.warehouse?.name || warehouse.warehouse_name || `Bodega ${warehouseId}`;
      const warehouseCity = warehouse.warehouse?.city?.name || warehouse.warehouse_city || null;
      const stock = parseInt(warehouse.stock) || 0;

      await this.upsertWarehouseVariant(variantId, warehouseId, warehouseName, warehouseCity, stock);
    }
  }

  /**
   * Crear WarehouseVariant para producto VARIABLE
   * Fuente: variation.warehouse_product_variation[] (array)
   * Fallback: solo si no hay warehouse_product_variation pero hay variation.stock
   * 
   * @param variantId ID de la variante
   * @param warehouseProductVariation Array de warehouse_product_variation desde variation.warehouse_product_variation[]
   * @param fallbackStock Stock por defecto solo si no hay warehouse_product_variation
   */
  private async createWarehouseVariantsForVariable(
    variantId: string,
    warehouseProductVariation: any[],
    fallbackStock: number
  ): Promise<void> {
    // Para VARIABLE: SOLO usar variation.warehouse_product_variation[]
    if (warehouseProductVariation && Array.isArray(warehouseProductVariation) && warehouseProductVariation.length > 0) {
      // Tiene warehouse_product_variation real
      for (const wpv of warehouseProductVariation) {
        // Estructura: { warehouse_id, warehouse: { id, name, city: { name } }, stock }
        const warehouseId = wpv.warehouse_id || wpv.warehouse?.id || 0;
        const warehouseName = wpv.warehouse?.name || `Bodega ${warehouseId}`;
        const warehouseCity = wpv.warehouse?.city?.name || null;
        const stock = parseInt(String(wpv.stock)) || 0;

        console.log(`[SYNC TO BACKEND]    📦 Creando WarehouseVariant para VARIABLE:`);
        console.log(`[SYNC TO BACKEND]       - variantId: ${variantId}`);
        console.log(`[SYNC TO BACKEND]       - warehouseId: ${warehouseId}`);
        console.log(`[SYNC TO BACKEND]       - warehouseName: ${warehouseName}`);
        console.log(`[SYNC TO BACKEND]       - warehouseCity: ${warehouseCity}`);
        console.log(`[SYNC TO BACKEND]       - stock: ${stock}`);

        await this.upsertWarehouseVariant(variantId, warehouseId, warehouseName, warehouseCity, stock);
      }
    } else if (fallbackStock > 0) {
      // Fallback: solo si NO hay warehouse_product_variation pero hay stock
      console.log(`[SYNC TO BACKEND]    ⚠️ Variación sin warehouse_product_variation, creando warehouse virtual con stock: ${fallbackStock}`);
      await this.upsertWarehouseVariant(variantId, 0, 'Stock General', null, fallbackStock);
    } else {
      console.log(`[SYNC TO BACKEND]    ⚠️ Variación sin warehouse_product_variation ni stock, no se crea WarehouseVariant`);
    }
  }

  /**
   * Crear o actualizar WarehouseVariant
   */
  private async upsertWarehouseVariant(
    variantId: string,
    warehouseId: number,
    warehouseName: string | null,
    warehouseCity: string | null,
    stock: number
  ): Promise<void> {
    try {
      // Usar cast temporal hasta que Prisma se regenere
      const warehouseVariantModel = (prisma as any).warehouseVariant;
      
      if (!warehouseVariantModel) {
        console.error(`[SYNC TO BACKEND] ❌ Modelo warehouseVariant no encontrado en Prisma. Ejecuta: npx prisma generate`);
        return;
      }

      // Verificar si ya existe usando el constraint único
      const existing = await warehouseVariantModel.findFirst({
        where: {
          variantId: variantId,
          warehouseId: warehouseId,
        },
      });

      if (existing) {
        // Actualizar existente
        await warehouseVariantModel.update({
          where: { id: existing.id },
          data: {
            warehouseName: warehouseName,
            warehouseCity: warehouseCity,
            stock: stock,
          },
        });
        console.log(`[SYNC TO BACKEND]    ✅ WarehouseVariant actualizado: variant=${variantId}, warehouse=${warehouseId}, stock=${stock}`);
      } else {
        // Crear nuevo
        await warehouseVariantModel.create({
          data: {
            variantId: variantId,
            warehouseId: warehouseId,
            warehouseName: warehouseName,
            warehouseCity: warehouseCity,
            stock: stock,
          },
        });
        this.warehouseVariantsCreated++;
        console.log(`[SYNC TO BACKEND]    ✅ WarehouseVariant creado: variant=${variantId}, warehouse=${warehouseId}, stock=${stock}`);
      }
    } catch (error: any) {
      // Si es error de constraint único, intentar actualizar
      if (error?.code === 'P2002') {
        try {
          const warehouseVariantModel = (prisma as any).warehouseVariant;
          const existing = await warehouseVariantModel.findFirst({
            where: {
              variantId: variantId,
              warehouseId: warehouseId,
            },
          });
          if (existing) {
            await warehouseVariantModel.update({
              where: { id: existing.id },
              data: {
                warehouseName: warehouseName,
                warehouseCity: warehouseCity,
                stock: stock,
              },
            });
            console.log(`[SYNC TO BACKEND]    ✅ WarehouseVariant actualizado (después de P2002): variant=${variantId}, warehouse=${warehouseId}`);
          }
        } catch (updateError: any) {
          console.warn(`[SYNC TO BACKEND] ⚠️ Error actualizando WarehouseVariant para variant ${variantId}, warehouse ${warehouseId}:`, updateError?.message);
        }
      } else {
        console.warn(`[SYNC TO BACKEND] ⚠️ Error creando WarehouseVariant para variant ${variantId}, warehouse ${warehouseId}:`, error?.message);
        console.warn(`[SYNC TO BACKEND]       - Datos: warehouseId=${warehouseId}, warehouseName=${warehouseName}, warehouseCity=${warehouseCity}, stock=${stock}`);
      }
    }
  }
}
