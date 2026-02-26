import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { FeedService } from '../feed/feed.service';
import { calculateTankuPriceFromVariant } from '../../shared/utils/price.utils';
import { calculateTankuPriceWithFormula } from '../../shared/utils/price-formula.utils';
import type { Product } from '@prisma/client';
import { PriceFormulaType } from '@prisma/client';

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
  // Stock mínimo requerido para que un producto aparezca en el ranking
  private readonly MIN_STOCK_THRESHOLD = 30;

  /**
   * Calcular stock total de una variante sumando todos sus warehouseVariants
   */
  private async calculateVariantStock(variantId: string): Promise<number> {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        warehouseVariants: {
          select: { stock: true },
        },
      },
    });

    if (!variant) return 0;

    return variant.warehouseVariants?.reduce(
      (sum, wv) => sum + (wv.stock || 0),
      0
    ) || 0;
  }

  /**
   * Calcular stock total de un producto sumando todas sus variantes
   */
  private async calculateProductStock(productId: string): Promise<number> {
    const variants = await prisma.productVariant.findMany({
      where: { productId },
      include: {
        warehouseVariants: {
          select: { stock: true },
        },
      },
    });

    return variants.reduce((total, variant) => {
      const variantStock = variant.warehouseVariants?.reduce(
        (sum, wv) => sum + (wv.stock || 0),
        0
      ) || 0;
      return total + variantStock;
    }, 0);
  }

  /**
   * Actualizar estado de variantes según su stock
   * Método público para que pueda ser llamado desde otros servicios (ej: worker de stock)
   */
  async updateVariantStockStatus(variantId: string): Promise<void> {
    // Verificar si el producto está bloqueado
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            lockedByAdmin: true,
          },
        },
      },
    });

    if (!variant) return;

    // Si el producto está bloqueado, NO cambiar el estado activo/inactivo
    if (variant.product.lockedByAdmin) {
      console.log(`[SYNC TO BACKEND] 🔒 Producto bloqueado, no se actualiza estado de variante ${variantId}`);
      return; // Solo actualizar stock, no el estado active
    }

    // Si no está bloqueado, actualizar estado según stock (lógica actual)
    const stock = await this.calculateVariantStock(variantId);
    
    if (stock <= 0) {
      // Marcar variante como inactiva si no tiene stock
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { active: false },
      });
      console.log(`[SYNC TO BACKEND]    ⚠️ Variante ${variantId} tiene stock 0, marcada como inactiva`);
    } else {
      // Activar variante si tiene stock
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { active: true },
      });
    }
  }

  /**
   * Actualizar estado del producto en el ranking según su stock
   * Método público para que pueda ser llamado desde otros servicios (ej: worker de stock)
   */
  async updateProductRankingStatus(productId: string): Promise<void> {
    const totalStock = await this.calculateProductStock(productId);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        title: true,
        images: true,
        active: true,
      },
    });

    if (!product) return;

    const hasValidTitle = product.title && 
                         product.title.trim() !== '' && 
                         product.title !== 'Sin nombre';
    const hasValidImages = product.images && 
                          Array.isArray(product.images) && 
                          product.images.length > 0;

    // Si el producto tiene stock menor al mínimo (30) o no cumple requisitos, eliminar del ranking
    if (totalStock < this.MIN_STOCK_THRESHOLD || !hasValidTitle || !hasValidImages || !product.active) {
      try {
        await (prisma as any).globalRanking.deleteMany({
          where: {
            itemId: productId,
            itemType: 'product',
          },
        });
        const reason = totalStock < this.MIN_STOCK_THRESHOLD 
          ? `stock insuficiente (${totalStock} < ${this.MIN_STOCK_THRESHOLD})`
          : `no cumple requisitos (title: ${hasValidTitle}, images: ${hasValidImages}, active: ${product.active})`;
        console.log(`[SYNC TO BACKEND] ✅ Producto ${productId} eliminado del ranking (${reason})`);
      } catch (error) {
        // Ignorar errores (puede que no exista en el ranking)
        console.log(`[SYNC TO BACKEND] ℹ️ Producto ${productId} no estaba en el ranking`);
      }
    } else {
      // Si el producto tiene stock suficiente (>= 30) y cumple requisitos, asegurar que esté en el ranking
      const feedService = new FeedService();
      feedService.initializeItemMetrics(productId, 'product').catch((error) => {
        console.error(`Error inicializando métricas del feed para producto ${productId}:`, error);
      });
    }
  }

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
    products_excluded_no_stock: number;
    products_included_with_stock: number;
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
          products_excluded_no_stock: 0,
          products_included_with_stock: 0,
        };
      }

      let productsCreated = 0;
      let productsUpdated = 0;
      let variantsCreated = 0;
      let variantsUpdated = 0;
      this.warehouseVariantsCreated = 0; // Resetear contador
      const errors: Array<{ dropi_id: number; error: string }> = [];
      let productsExcludedNoStock = 0; // Contador de productos excluidos por no tener stock
      let productsIncludedWithStock = 0; // Contador de productos incluidos con stock

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
                // ✅ CORREGIDO: Priorizar urlS3 sobre url (urlS3 tiene colombia/products/)
                // Si urlS3 existe, usarlo; si no, usar url pero solo si no contiene uploads/images/products
                let imgUrl: string | null = null;
                
                if ((img as any).urlS3) {
                  imgUrl = (img as any).urlS3;
                } else if ((img as any).url && !(img as any).url.includes('/uploads/images/products')) {
                  imgUrl = (img as any).url;
                }
                
                if (imgUrl && imgUrl.trim()) {
                  const fullUrl = imgUrl.startsWith('http') ? imgUrl : buildImageUrl(imgUrl);
                  if (fullUrl) {
                    imageSet.add(fullUrl);
                    hasImagesFromEnrich = true;
                  }
                }
              } else if (typeof img === 'string' && img.trim()) {
                // ✅ AGREGADO: Filtrar URLs que contengan uploads/images/products
                if (!img.includes('/uploads/images/products')) {
                  const fullUrl = img.startsWith('http') ? img : buildImageUrl(img);
                  if (fullUrl) {
                    imageSet.add(fullUrl);
                    hasImagesFromEnrich = true;
                  }
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
            // NO incluir active aquí - se maneja según bloqueo
          };

          const existingProduct = await prisma.product.findUnique({
            where: { handle },
            select: {
              id: true,
              lockedByAdmin: true,
            },
          });

          let product: Product;
          if (existingProduct) {
            if (skipExisting) {
              // Si skipExisting es true, usar el producto existente pero NO actualizar sus datos
              // Sin embargo, SÍ actualizamos variantes y warehouseVariants (para worker de stock)
              product = await prisma.product.findUniqueOrThrow({
                where: { id: existingProduct.id },
              });
              console.log(`[SYNC TO BACKEND] ⏭️ Usando producto existente (skipExisting): ${existingProduct.id}`);
            } else {
              const isLocked = existingProduct.lockedByAdmin;
              
              if (isLocked) {
                // Producto bloqueado: solo actualizar stock, NO tocar active ni otros campos
                // Tampoco actualizar tankuPrice (se respeta la fórmula configurada por admin)
                console.log(`[SYNC TO BACKEND] 🔒 Producto bloqueado, solo actualizando stock (NO precios): ${existingProduct.id}`);
                product = await prisma.product.findUniqueOrThrow({
                  where: { id: existingProduct.id },
                  // No necesitamos incluir nada, solo obtener el producto con sus campos (priceFormulaType, priceFormulaValue)
                });
                // No actualizar el producto, solo las variantes (pero sin tocar tankuPrice)
              } else {
                // Producto no bloqueado: actualizar todo incluyendo active
                product = await prisma.product.update({
                  where: { id: existingProduct.id },
                  data: {
                    ...productData,
                    active: true, // Solo si no está bloqueado
                  },
                });
                productsUpdated++;
                console.log(`[SYNC TO BACKEND] ✅ Producto actualizado: ${product.id}`);

                // ✅ VALIDAR: Verificar si el producto actualizado cumple requisitos para ranking
                // Solo validar si NO está bloqueado
                const hasValidTitle = productData.title && 
                                     productData.title.trim() !== '' && 
                                     productData.title !== 'Sin nombre';
                const hasValidImages = productData.images && 
                                      Array.isArray(productData.images) && 
                                      productData.images.length > 0;

                // Calcular stock total ANTES de decidir si agregar al ranking
                const totalStock = await this.calculateProductStock(product.id);
                const hasEnoughStock = totalStock >= this.MIN_STOCK_THRESHOLD;

                if (hasValidTitle && hasValidImages && product.active && hasEnoughStock) {
                  // Producto válido: asegurar que esté en el ranking
                  const feedService = new FeedService();
                  feedService.initializeItemMetrics(product.id, 'product').catch((error) => {
                    console.error(`Error inicializando métricas del feed para producto ${product.id}:`, error);
                  });
                } else {
                  // Producto inválido: eliminar del ranking si existe
                  const reasons = [];
                  if (!hasValidTitle) reasons.push('título inválido');
                  if (!hasValidImages) reasons.push('sin imágenes');
                  if (!product.active) reasons.push('inactivo');
                  if (!hasEnoughStock) reasons.push(`stock insuficiente (${totalStock} < ${this.MIN_STOCK_THRESHOLD})`);
                  
                  console.warn(`[SYNC TO BACKEND] ⚠️ Producto ${product.id} no cumple requisitos (${reasons.join(', ')}), eliminando del ranking si existe`);
                  try {
                    await (prisma as any).globalRanking.deleteMany({
                      where: {
                        itemId: product.id,
                        itemType: 'product',
                      },
                    });
                    console.log(`[SYNC TO BACKEND] ✅ Producto ${product.id} eliminado del ranking`);
                  } catch (error) {
                    // Ignorar errores (puede que no exista en el ranking)
                    console.log(`[SYNC TO BACKEND] ℹ️ Producto ${product.id} no estaba en el ranking`);
                  }
                }
              }
            }
          } else {
            // Crear nuevo producto (siempre se crea activo, bloqueo no aplica)
            product = await prisma.product.create({
              data: {
                ...productData,
                active: true,
              },
            });
            productsCreated++;
            console.log(`[SYNC TO BACKEND] ✅ Producto creado: ${product.id}`);

            // Inicializar métricas del feed para el nuevo producto (asíncrono, no bloquea)
            // initializeItemMetrics ahora valida internamente antes de agregar al ranking
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
              
              // Calcular tankuPrice solo si el producto NO está bloqueado
              // Si está bloqueado, mantener el tankuPrice existente (respetar fórmula del admin)
              // IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
              let variationTankuPrice: number | undefined = undefined;
              if (!product.lockedByAdmin) {
                // Producto no bloqueado: calcular con fórmula del producto, fórmula por defecto, o estándar
                // Usar SOLO suggestedPrice para fórmulas
                const basePrice = variationSuggestedPrice;
                if (basePrice && basePrice > 0) {
                  if (product.priceFormulaType && product.priceFormulaValue) {
                    // Usar fórmula personalizada del producto
                    variationTankuPrice = calculateTankuPriceWithFormula(
                      basePrice,
                      product.priceFormulaType as PriceFormulaType,
                      product.priceFormulaValue as any
                    );
                  } else {
                    // Buscar fórmula por defecto global
                    const defaultFormula = await prisma.priceFormula.findFirst({
                      where: { isDefault: true },
                    });
                    
                    if (defaultFormula) {
                      // Usar fórmula por defecto global
                      variationTankuPrice = calculateTankuPriceWithFormula(
                        basePrice,
                        defaultFormula.type,
                        defaultFormula.value as any
                      );
                      console.log(`[SYNC TO BACKEND] Usando fórmula por defecto "${defaultFormula.name}" para variante ${variationSku}`);
                    } else {
                      // Fallback a fórmula hardcodeada estándar
                      variationTankuPrice = calculateTankuPriceFromVariant({
                        suggestedPrice: variationSuggestedPrice,
                        price: variationPrice,
                      });
                    }
                  }
                }
                // Si no hay suggestedPrice, no calcular tankuPrice
              }
              // Si está bloqueado, variationTankuPrice queda undefined y no se actualizará
              
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
                    // Si el producto está bloqueado, NO actualizar tankuPrice
                    const updateData: any = {
                      productId: product.id, // Asegurar que el productId sea correcto
                      title: variationTitle,
                      price: variationPrice,
                      suggestedPrice: variationSuggestedPrice,
                      attributes: attributesData.length > 0 ? attributesData : undefined,
                    };
                    // Solo actualizar tankuPrice si no está bloqueado
                    if (variationTankuPrice !== undefined) {
                      updateData.tankuPrice = variationTankuPrice;
                    }
                    variant = await prisma.productVariant.update({
                      where: { id: existingVariant.id },
                      data: updateData,
                    });
                  } else {
                    // Si el producto está bloqueado, NO actualizar tankuPrice
                    const updateData: any = {
                      title: variationTitle,
                      price: variationPrice,
                      suggestedPrice: variationSuggestedPrice,
                      attributes: attributesData.length > 0 ? attributesData : undefined,
                    };
                    // Solo actualizar tankuPrice si no está bloqueado
                    if (variationTankuPrice !== undefined) {
                      updateData.tankuPrice = variationTankuPrice;
                    }
                    variant = await prisma.productVariant.update({
                      where: { id: existingVariant.id },
                      data: updateData,
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
                // Calcular tankuPrice solo si el producto NO está bloqueado
                // IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
                let newVariationTankuPrice: number | undefined = undefined;
                if (!product.lockedByAdmin) {
                  const basePrice = variationSuggestedPrice;
                  if (basePrice && basePrice > 0) {
                    if (product.priceFormulaType && product.priceFormulaValue) {
                      // Usar fórmula personalizada del producto
                      newVariationTankuPrice = calculateTankuPriceWithFormula(
                        basePrice,
                        product.priceFormulaType as PriceFormulaType,
                        product.priceFormulaValue as any
                      );
                    } else {
                      // Buscar fórmula por defecto global
                      const defaultFormula = await prisma.priceFormula.findFirst({
                        where: { isDefault: true },
                      });
                      
                      if (defaultFormula) {
                        // Usar fórmula por defecto global
                        newVariationTankuPrice = calculateTankuPriceWithFormula(
                          basePrice,
                          defaultFormula.type,
                          defaultFormula.value as any
                        );
                      } else {
                        // Fallback a fórmula hardcodeada estándar
                        newVariationTankuPrice = calculateTankuPriceFromVariant({
                          suggestedPrice: variationSuggestedPrice,
                          price: variationPrice,
                        });
                      }
                    }
                  }
                  // Si no hay suggestedPrice, no calcular tankuPrice
                }
                
                const createData: any = {
                  productId: product.id,
                  sku: variationSku,
                  title: variationTitle,
                  price: variationPrice,
                  suggestedPrice: variationSuggestedPrice,
                  attributes: attributesData.length > 0 ? attributesData : undefined,
                  active: true,
                };
                // Solo agregar tankuPrice si no está bloqueado
                if (newVariationTankuPrice !== undefined) {
                  createData.tankuPrice = newVariationTankuPrice;
                }
                
                variant = await prisma.productVariant.create({
                  data: createData,
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

              // 7. Actualizar estado de la variante según su stock (igual que SIMPLE)
              await this.updateVariantStockStatus(variant.id);
            }
          } else {
            // PRODUCTO SIMPLE: Crear una sola variante
            console.log(`[SYNC TO BACKEND] 🔹 Creando variante única para producto SIMPLE...`);

            // El SKU ya viene con formato compuesto desde normalize: {sku}-DP-{dropiId} o DP-{dropiId}
            const uniqueSku = dropiProduct.sku || `DP-${dropiProduct.dropiId}`;

            const finalPrice = Math.round(dropiProduct.price || 0);
            const finalSuggestedPrice = dropiProduct.suggestedPrice ? Math.round(dropiProduct.suggestedPrice) : null;
            
            // Calcular tankuPrice solo si el producto NO está bloqueado
            // Si está bloqueado, mantener el tankuPrice existente (respetar fórmula del admin)
            // IMPORTANTE: Las fórmulas se calculan SOLO desde suggestedPrice (no desde price)
            let simpleTankuPrice: number | undefined = undefined;
            if (!product.lockedByAdmin) {
              const basePrice = finalSuggestedPrice;
              if (basePrice && basePrice > 0) {
                if (product.priceFormulaType && product.priceFormulaValue) {
                  // Usar fórmula personalizada del producto
                  simpleTankuPrice = calculateTankuPriceWithFormula(
                    basePrice,
                    product.priceFormulaType as PriceFormulaType,
                    product.priceFormulaValue as any
                  );
                } else {
                  // Buscar fórmula por defecto global
                  const defaultFormula = await prisma.priceFormula.findFirst({
                    where: { isDefault: true },
                  });
                  
                  if (defaultFormula) {
                    // Usar fórmula por defecto global
                    simpleTankuPrice = calculateTankuPriceWithFormula(
                      basePrice,
                      defaultFormula.type,
                      defaultFormula.value as any
                    );
                    console.log(`[SYNC TO BACKEND] Usando fórmula por defecto "${defaultFormula.name}" para producto SIMPLE ${uniqueSku}`);
                  } else {
                    // Fallback a fórmula hardcodeada estándar
                    simpleTankuPrice = calculateTankuPriceFromVariant({
                      suggestedPrice: finalSuggestedPrice,
                      price: finalPrice,
                    });
                  }
                }
              }
              // Si no hay suggestedPrice, no calcular tankuPrice
            }
            // Si está bloqueado, simpleTankuPrice queda undefined y no se actualizará

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
                  // Si el producto está bloqueado, NO actualizar tankuPrice
                  const updateDataSimple1: any = {
                    productId: product.id, // Asegurar que el productId sea correcto
                    title: dropiProduct.name || 'Default',
                    price: finalPrice,
                    suggestedPrice: finalSuggestedPrice,
                  };
                  if (simpleTankuPrice !== undefined) {
                    updateDataSimple1.tankuPrice = simpleTankuPrice;
                  }
                  variant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: updateDataSimple1,
                  });
                } else {
                  // Si el producto está bloqueado, NO actualizar tankuPrice
                  const updateDataSimple2: any = {
                    title: dropiProduct.name || 'Default',
                    price: finalPrice,
                    suggestedPrice: finalSuggestedPrice,
                  };
                  if (simpleTankuPrice !== undefined) {
                    updateDataSimple2.tankuPrice = simpleTankuPrice;
                  }
                  variant = await prisma.productVariant.update({
                    where: { id: existingVariant.id },
                    data: updateDataSimple2,
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
                const createDataSimple: any = {
                  productId: product.id,
                  sku: uniqueSku,
                  title: dropiProduct.name || 'Default',
                  price: finalPrice,
                  suggestedPrice: finalSuggestedPrice,
                  active: true,
                };
                // Solo agregar tankuPrice si no está bloqueado
                if (simpleTankuPrice !== undefined) {
                  createDataSimple.tankuPrice = simpleTankuPrice;
                }
                variant = await prisma.productVariant.create({
                  data: createDataSimple,
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

            // 7. Actualizar estado de la variante según su stock
            await this.updateVariantStockStatus(variant.id);
          }

          // 8. Actualizar estado del producto en el ranking según su stock total
          const totalStock = await this.calculateProductStock(product.id);
          
          // Contar productos excluidos/incluidos por stock (mínimo 30 unidades)
          if (totalStock < 30) {
            productsExcludedNoStock++;
            const reason = totalStock === 0 
              ? 'sin stock'
              : `stock insuficiente (${totalStock} < 30)`;
            console.log(`[SYNC TO BACKEND] ⚠️ Producto ${product.id} (dropiId: ${dropiProduct.dropiId}) excluido del ranking por ${reason}`);
          } else {
            productsIncludedWithStock++;
            console.log(`[SYNC TO BACKEND] ✅ Producto ${product.id} (dropiId: ${dropiProduct.dropiId}) incluido en ranking con stock: ${totalStock} (>= 30)`);
          }
          
          await this.updateProductRankingStatus(product.id);

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

      const totalProductsProcessed = productsIncludedWithStock + productsExcludedNoStock;
      
      console.log(`✅ [SYNC TO BACKEND] Sincronización completada`);
      console.log(`   - Productos creados: ${productsCreated}`);
      console.log(`   - Productos actualizados: ${productsUpdated}`);
      console.log(`   - Variantes creadas: ${variantsCreated}`);
      console.log(`   - Variantes actualizadas: ${variantsUpdated}`);
      console.log(`   - WarehouseVariants creados: ${this.warehouseVariantsCreated}`);
      console.log(`   - Productos evaluados en este batch: ${totalProductsProcessed} (${productsIncludedWithStock} incluidos + ${productsExcludedNoStock} excluidos)`);
      console.log(`   - ✅ Productos que QUEDARON en ranking (stock >= 30): ${productsIncludedWithStock}`);
      console.log(`   - ❌ Productos que NO quedaron en ranking (stock < 30): ${productsExcludedNoStock}`);
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
        products_excluded_no_stock: productsExcludedNoStock,
        products_included_with_stock: productsIncludedWithStock,
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
