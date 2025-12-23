import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// URLs de las bases de datos
const LOCAL_DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/tanku_backend';
const REMOTE_DB_URL = process.env.DATABASE_URL2 || 'postgresql://postgres:UtPOPXCBkQiZvfHRUkVOVdhKQVjMzCzi@hopper.proxy.rlwy.net:15585/railway';

// Crear clientes Prisma para ambas bases de datos
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: LOCAL_DB_URL,
    },
  },
});

const remotePrisma = new PrismaClient({
  datasources: {
    db: {
      url: REMOTE_DB_URL,
    },
  },
});

// Función auxiliar para logging
const log = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

// Función para convertir snake_case a camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Función para detectar campos faltantes en el error y convertirlos a camelCase
function extractMissingFields(errorMessage: string): string[] {
  const matches = errorMessage.match(/The column `([^`]+)` does not exist/g);
  if (!matches) return [];
  return matches
    .map(m => m.match(/`([^`]+)`/)?.[1] || '')
    .filter(Boolean)
    .map(snakeToCamel); // Convertir snake_case a camelCase
}

// Función para remover campos de un objeto
function removeFields<T extends Record<string, any>>(obj: T, fieldsToRemove: string[]): Partial<T> {
  const result = { ...obj };
  for (const field of fieldsToRemove) {
    delete result[field];
  }
  return result;
}

// Función para escapar valores SQL de forma segura
function escapeSqlValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  // Escapar comillas simples y backslashes
  return `'${String(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

// Función para convertir valores a JSONB de PostgreSQL
function toJsonb(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  // Convertir a JSON string y escapar comillas simples para SQL
  const jsonString = JSON.stringify(value);
  // Escapar comillas simples (doblar las comillas simples)
  const escaped = jsonString.replace(/'/g, "''");
  return `'${escaped}'::jsonb`;
}

// Función para copiar datos de una tabla
async function copyTable<T extends Record<string, any>>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  insertFn: (data: any[]) => Promise<any>,
  transformFn?: (data: T) => any,
  fieldsToExclude: string[] = []
): Promise<number> {
  try {
    log(`Iniciando copia de ${tableName}...`);
    const data = await fetchFn();
    
    if (data.length === 0) {
      log(`${tableName}: No hay datos para copiar`, 'info');
      return 0;
    }

    log(`${tableName}: Encontrados ${data.length} registros`);

    // Transformar datos si es necesario
    let transformedData = transformFn 
      ? data.map(transformFn)
      : data;

    // Remover campos excluidos
    if (fieldsToExclude.length > 0) {
      transformedData = transformedData.map(item => removeFields(item, fieldsToExclude));
      log(`${tableName}: Excluyendo campos: ${fieldsToExclude.join(', ')}`);
    }

    // Insertar en lotes para evitar problemas de memoria
    const batchSize = 100;
    let inserted = 0;
    let skipped = 0;
    let missingFields: string[] = [...fieldsToExclude];

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      const cleanedBatch = missingFields.length > 0 
        ? batch.map(item => removeFields(item, missingFields))
        : batch;

      try {
        const result = await insertFn(cleanedBatch);
        // createMany devuelve { count: number } cuando tiene skipDuplicates
        const batchInserted = result?.count ?? cleanedBatch.length;
        inserted += batchInserted;
        skipped += (cleanedBatch.length - batchInserted);
        log(`${tableName}: Insertados ${inserted}/${transformedData.length} registros${skipped > 0 ? ` (${skipped} omitidos)` : ''}`);
      } catch (error: any) {
        // Detectar campos faltantes
        const detectedFields = extractMissingFields(error.message);
        if (detectedFields.length > 0) {
          // Agregar nuevos campos faltantes detectados
          const newFields = detectedFields.filter(f => !missingFields.includes(f));
          if (newFields.length > 0) {
            missingFields = [...missingFields, ...newFields];
            log(`${tableName}: Detectados campos faltantes adicionales: ${newFields.join(', ')}. Reintentando sin estos campos...`, 'info');
            // Reintentar el lote actual sin los campos faltantes
            const reCleanedBatch = batch.map(item => removeFields(item, missingFields));
            try {
              const result = await insertFn(reCleanedBatch);
              const batchInserted = result?.count ?? reCleanedBatch.length;
              inserted += batchInserted;
              skipped += (reCleanedBatch.length - batchInserted);
              log(`${tableName}: Insertados ${inserted}/${transformedData.length} registros${skipped > 0 ? ` (${skipped} omitidos)` : ''}`);
              continue;
            } catch (retryError: any) {
              // Si aún falla, intentar uno por uno
            }
          }
        }

        // Si falla el lote, intentar insertar uno por uno
        log(`${tableName}: Error en lote, intentando insertar individualmente...`, 'error');
        for (const item of batch) {
          try {
            const cleanedItem = missingFields.length > 0 
              ? removeFields(item, missingFields) 
              : item;
            await insertFn([cleanedItem]);
            inserted++;
          } catch (itemError: any) {
            skipped++;
            // Detectar más campos faltantes
            const itemMissingFields = extractMissingFields(itemError.message);
            const newItemFields = itemMissingFields.filter(f => !missingFields.includes(f));
            if (newItemFields.length > 0) {
              missingFields = [...missingFields, ...newItemFields];
              log(`${tableName}: Detectado campo faltante adicional: ${newItemFields.join(', ')}`, 'info');
              // Reintentar sin el nuevo campo
              try {
                const finalCleanedItem = removeFields(item, missingFields);
                await insertFn([finalCleanedItem]);
                inserted++;
                skipped--; // Corregir el contador
              } catch (finalError: any) {
                // Solo loguear si no es un error de duplicado
                if (!finalError.message?.includes('Unique constraint') && !finalError.code?.includes('P2002')) {
                  log(`${tableName}: Error final insertando registro: ${finalError.message.substring(0, 200)}`, 'error');
                }
              }
            } else if (!itemError.message?.includes('Unique constraint') && 
                       !itemError.code?.includes('P2002')) {
              log(`${tableName}: Error insertando registro: ${itemError.message.substring(0, 200)}`, 'error');
            }
          }
        }
      }
    }

    if (missingFields.length > 0) {
      log(`${tableName}: ⚠️ Campos omitidos: ${missingFields.join(', ')}`, 'info');
    }

    log(`${tableName}: ✅ Completado - ${inserted} registros copiados${skipped > 0 ? `, ${skipped} omitidos` : ''}`, 'success');
    return inserted;
  } catch (error: any) {
    log(`${tableName}: ❌ Error - ${error.message}`, 'error');
    throw error;
  }
}

// Función principal de migración
async function migrateDatabase() {
  log('🚀 Iniciando migración de base de datos...', 'info');
  log(`Origen: ${LOCAL_DB_URL.split('@')[1] || 'local'}`, 'info');
  log(`Destino: ${REMOTE_DB_URL.split('@')[1] || 'remote'}`, 'info');

  try {
    // Verificar conexiones
    log('Verificando conexiones...');
    await localPrisma.$connect();
    await remotePrisma.$connect();
    log('✅ Conexiones establecidas', 'success');

    let totalRecords = 0;

    // 1. Modelos independientes (sin dependencias)
    log('\n📦 Copiando modelos independientes...', 'info');
    
    totalRecords += await copyTable(
      'DropiCategory',
      () => localPrisma.dropiCategory.findMany(),
      (data) => remotePrisma.dropiCategory.createMany({ data, skipDuplicates: true })
    );

    // DropiProduct: Usar SQL directo para leer y escribir
    log('Iniciando copia de DropiProduct...');
    try {
      const dropiProducts = await localPrisma.$queryRaw<any[]>`
        SELECT 
          id, dropi_id, name, type, sku, 
          category_dropi_id, description, images, 
          price, stock, warehouse_product, 
          variations_data, user_verified,
          synced_at, created_at, updated_at
        FROM dropi_products
      `;
      
      if (dropiProducts.length === 0) {
        log('DropiProduct: No hay datos para copiar', 'info');
      } else {
        log(`DropiProduct: Encontrados ${dropiProducts.length} registros`);
        
        const batchSize = 100;
        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < dropiProducts.length; i += batchSize) {
          const batch = dropiProducts.slice(i, i + batchSize);
          
          // Construir query SQL para insertar
          const values = batch.map((p: any) => {
            return `(
              ${escapeSqlValue(p.id)},
              ${p.dropi_id},
              ${escapeSqlValue(p.name)},
              ${escapeSqlValue(p.type)},
              ${escapeSqlValue(p.sku)},
              ${p.category_dropi_id ?? 'NULL'},
              ${p.description ? escapeSqlValue(p.description) : 'NULL'},
              ${toJsonb(p.images)},
              ${p.price},
              ${p.stock},
              ${toJsonb(p.warehouse_product)},
              ${toJsonb(p.variations_data)},
              ${p.user_verified},
              ${p.synced_at ? escapeSqlValue(p.synced_at) : 'NULL'},
              ${escapeSqlValue(p.created_at)},
              ${escapeSqlValue(p.updated_at)}
            )`;
          }).join(',');

          const insertQuery = `
            INSERT INTO dropi_products (
              id, dropi_id, name, type, sku, 
              category_dropi_id, description, images, 
              price, stock, warehouse_product, 
              variations_data, user_verified,
              synced_at, created_at, updated_at
            ) VALUES ${values}
            ON CONFLICT (dropi_id) DO NOTHING
          `;

          try {
            const result = await remotePrisma.$executeRawUnsafe(insertQuery);
            inserted += batch.length;
            log(`DropiProduct: Insertados ${inserted}/${dropiProducts.length} registros`);
          } catch (error: any) {
            // Si falla el lote, intentar uno por uno
            log(`DropiProduct: Error en lote, intentando insertar individualmente...`, 'error');
            for (const p of batch) {
              try {
                const singleInsert = `
                  INSERT INTO dropi_products (
                    id, dropi_id, name, type, sku, 
                    category_dropi_id, description, images, 
                    price, stock, warehouse_product, 
                    variations_data, user_verified,
                    synced_at, created_at, updated_at
                  ) VALUES (
                    ${escapeSqlValue(p.id)},
                    ${p.dropi_id},
                    ${escapeSqlValue(p.name)},
                    ${escapeSqlValue(p.type)},
                    ${escapeSqlValue(p.sku)},
                    ${p.category_dropi_id ?? 'NULL'},
                    ${p.description ? escapeSqlValue(p.description) : 'NULL'},
                    ${toJsonb(p.images)},
                    ${p.price},
                    ${p.stock},
                    ${toJsonb(p.warehouse_product)},
                    ${toJsonb(p.variations_data)},
                    ${p.user_verified},
                    ${p.synced_at ? escapeSqlValue(p.synced_at) : 'NULL'},
                    ${escapeSqlValue(p.created_at)},
                    ${escapeSqlValue(p.updated_at)}
                  )
                  ON CONFLICT (dropi_id) DO NOTHING
                `;
                
                await remotePrisma.$executeRawUnsafe(singleInsert);
                inserted++;
              } catch (itemError: any) {
                skipped++;
                if (!itemError.message?.includes('duplicate') && !itemError.message?.includes('unique')) {
                  log(`DropiProduct: Error insertando registro: ${itemError.message.substring(0, 200)}`, 'error');
                }
              }
            }
          }
        }

        log(`DropiProduct: ✅ Completado - ${inserted} registros copiados${skipped > 0 ? `, ${skipped} omitidos` : ''}`, 'success');
        totalRecords += inserted;
      }
    } catch (error: any) {
      log(`DropiProduct: ❌ Error - ${error.message}`, 'error');
      throw error;
    }

    // DropiRawProduct: Usar SQL directo
    log('Iniciando copia de DropiRawProduct...');
    try {
      const dropiRawProducts = await localPrisma.$queryRaw<any[]>`
        SELECT 
          id, dropi_id, source, payload, 
          created_at, synced_at, updated_at
        FROM dropi_raw_products
      `;
      
      if (dropiRawProducts.length === 0) {
        log('DropiRawProduct: No hay datos para copiar', 'info');
      } else {
        log(`DropiRawProduct: Encontrados ${dropiRawProducts.length} registros`);
        
        const batchSize = 100;
        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < dropiRawProducts.length; i += batchSize) {
          const batch = dropiRawProducts.slice(i, i + batchSize);
          
          const values = batch.map((p: any) => {
            return `(
              ${escapeSqlValue(p.id)},
              ${p.dropi_id},
              ${escapeSqlValue(p.source)},
              ${toJsonb(p.payload)},
              ${escapeSqlValue(p.created_at)},
              ${escapeSqlValue(p.synced_at)},
              ${escapeSqlValue(p.updated_at)}
            )`;
          }).join(',');

          const insertQuery = `
            INSERT INTO dropi_raw_products (
              id, dropi_id, source, payload, 
              created_at, synced_at, updated_at
            ) VALUES ${values}
            ON CONFLICT (dropi_id, source) DO NOTHING
          `;

          try {
            await remotePrisma.$executeRawUnsafe(insertQuery);
            inserted += batch.length;
            log(`DropiRawProduct: Insertados ${inserted}/${dropiRawProducts.length} registros`);
          } catch (error: any) {
            log(`DropiRawProduct: Error en lote, intentando insertar individualmente...`, 'error');
            for (const p of batch) {
              try {
                const singleInsert = `
                  INSERT INTO dropi_raw_products (
                    id, dropi_id, source, payload, 
                    created_at, synced_at, updated_at
                  ) VALUES (
                    ${escapeSqlValue(p.id)},
                    ${p.dropi_id},
                    ${escapeSqlValue(p.source)},
                    ${toJsonb(p.payload)},
                    ${escapeSqlValue(p.created_at)},
                    ${escapeSqlValue(p.synced_at)},
                    ${escapeSqlValue(p.updated_at)}
                  )
                  ON CONFLICT (dropi_id, source) DO NOTHING
                `;
                
                await remotePrisma.$executeRawUnsafe(singleInsert);
                inserted++;
              } catch (itemError: any) {
                skipped++;
                if (!itemError.message?.includes('duplicate') && !itemError.message?.includes('unique')) {
                  log(`DropiRawProduct: Error insertando registro: ${itemError.message.substring(0, 200)}`, 'error');
                }
              }
            }
          }
        }

        log(`DropiRawProduct: ✅ Completado - ${inserted} registros copiados${skipped > 0 ? `, ${skipped} omitidos` : ''}`, 'success');
        totalRecords += inserted;
      }
    } catch (error: any) {
      log(`DropiRawProduct: ❌ Error - ${error.message}`, 'error');
      throw error;
    }

    totalRecords += await copyTable(
      'DropiJob',
      () => localPrisma.dropiJob.findMany(),
      (data) => remotePrisma.dropiJob.createMany({ data, skipDuplicates: true })
    );

    // 2. User (base para muchos otros modelos)
    log('\n👤 Copiando usuarios...', 'info');
    totalRecords += await copyTable(
      'User',
      () => localPrisma.user.findMany(),
      (data) => remotePrisma.user.createMany({ data, skipDuplicates: true })
    );

    // 3. Modelos que dependen de User
    log('\n📋 Copiando datos relacionados con usuarios...', 'info');
    
    totalRecords += await copyTable(
      'UserProfile',
      () => localPrisma.userProfile.findMany(),
      (data) => remotePrisma.userProfile.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'PersonalInformation',
      () => localPrisma.personalInformation.findMany(),
      (data) => remotePrisma.personalInformation.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'OnboardingStatus',
      () => localPrisma.onboardingStatus.findMany(),
      (data) => remotePrisma.onboardingStatus.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'Address',
      () => localPrisma.address.findMany(),
      (data) => remotePrisma.address.createMany({ data, skipDuplicates: true })
    );

    // 4. Categories (manejar relaciones parent-child)
    log('\n📂 Copiando categorías...', 'info');
    const categories = await localPrisma.category.findMany();
    
    if (categories.length > 0) {
      // Primero insertar categorías sin parent
      const rootCategories = categories.filter(c => !c.parentId);
      const childCategories = categories.filter(c => c.parentId);

      if (rootCategories.length > 0) {
        await remotePrisma.category.createMany({
          data: rootCategories,
          skipDuplicates: true
        });
        log(`Category: Insertadas ${rootCategories.length} categorías raíz`, 'info');
        totalRecords += rootCategories.length;
      }

      // Luego insertar categorías con parent
      if (childCategories.length > 0) {
        await remotePrisma.category.createMany({
          data: childCategories,
          skipDuplicates: true
        });
        log(`Category: Insertadas ${childCategories.length} categorías hijas`, 'info');
        totalRecords += childCategories.length;
      }

      log(`Category: ✅ Completado - ${categories.length} categorías copiadas`, 'success');
    }

    // 5. Products y Variants
    log('\n🛍️ Copiando productos...', 'info');
    totalRecords += await copyTable(
      'Product',
      () => localPrisma.product.findMany(),
      (data) => remotePrisma.product.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'ProductVariant',
      () => localPrisma.productVariant.findMany(),
      (data) => remotePrisma.productVariant.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'WarehouseVariant',
      () => localPrisma.warehouseVariant.findMany(),
      (data) => remotePrisma.warehouseVariant.createMany({ data, skipDuplicates: true })
    );

    // 6. Carts
    log('\n🛒 Copiando carritos...', 'info');
    totalRecords += await copyTable(
      'Cart',
      () => localPrisma.cart.findMany(),
      (data) => remotePrisma.cart.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'CartItem',
      () => localPrisma.cartItem.findMany(),
      (data) => remotePrisma.cartItem.createMany({ data, skipDuplicates: true })
    );

    // 7. Orders
    log('\n📦 Copiando órdenes...', 'info');
    totalRecords += await copyTable(
      'Order',
      () => localPrisma.order.findMany(),
      (data) => remotePrisma.order.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'OrderItem',
      () => localPrisma.orderItem.findMany(),
      (data) => remotePrisma.orderItem.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'OrderAddress',
      () => localPrisma.orderAddress.findMany(),
      (data) => remotePrisma.orderAddress.createMany({ data, skipDuplicates: true })
    );

    // 8. WishLists
    log('\n❤️ Copiando listas de deseos...', 'info');
    totalRecords += await copyTable(
      'WishList',
      () => localPrisma.wishList.findMany(),
      (data) => remotePrisma.wishList.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'WishListItem',
      () => localPrisma.wishListItem.findMany(),
      (data) => remotePrisma.wishListItem.createMany({ data, skipDuplicates: true })
    );

    // 9. StalkerGifts
    log('\n🎁 Copiando regalos stalker...', 'info');
    totalRecords += await copyTable(
      'StalkerGift',
      () => localPrisma.stalkerGift.findMany(),
      (data) => remotePrisma.stalkerGift.createMany({ data, skipDuplicates: true })
    );

    // 10. Posters y reacciones
    log('\n📸 Copiando posters...', 'info');
    totalRecords += await copyTable(
      'Poster',
      () => localPrisma.poster.findMany(),
      (data) => remotePrisma.poster.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'PosterReaction',
      () => localPrisma.posterReaction.findMany(),
      (data) => remotePrisma.posterReaction.createMany({ data, skipDuplicates: true })
    );

    // 11. PosterComments (manejar relaciones parent-child)
    log('\n💬 Copiando comentarios...', 'info');
    const comments = await localPrisma.posterComment.findMany();
    
    if (comments.length > 0) {
      // Primero insertar comentarios sin parent
      const rootComments = comments.filter(c => !c.parentId);
      const replyComments = comments.filter(c => c.parentId);

      if (rootComments.length > 0) {
        await remotePrisma.posterComment.createMany({
          data: rootComments,
          skipDuplicates: true
        });
        log(`PosterComment: Insertados ${rootComments.length} comentarios raíz`, 'info');
        totalRecords += rootComments.length;
      }

      // Luego insertar respuestas
      if (replyComments.length > 0) {
        await remotePrisma.posterComment.createMany({
          data: replyComments,
          skipDuplicates: true
        });
        log(`PosterComment: Insertadas ${replyComments.length} respuestas`, 'info');
        totalRecords += replyComments.length;
      }

      log(`PosterComment: ✅ Completado - ${comments.length} comentarios copiados`, 'success');
    }

    // 12. Stories
    log('\n📖 Copiando historias...', 'info');
    totalRecords += await copyTable(
      'StoriesUser',
      () => localPrisma.storiesUser.findMany(),
      (data) => remotePrisma.storiesUser.createMany({ data, skipDuplicates: true })
    );

    totalRecords += await copyTable(
      'StoryFile',
      () => localPrisma.storyFile.findMany(),
      (data) => remotePrisma.storyFile.createMany({ data, skipDuplicates: true })
    );

    log('\n✅ Migración completada exitosamente!', 'success');
    log(`📊 Total de registros copiados: ${totalRecords}`, 'success');

  } catch (error: any) {
    log(`❌ Error durante la migración: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    // Desconectar ambos clientes
    log('Desconectando clientes...', 'info');
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
    log('✅ Clientes desconectados', 'success');
  }
}

// Ejecutar migración
migrateDatabase()
  .then(() => {
    log('🎉 Proceso finalizado', 'success');
    process.exit(0);
  })
  .catch((error) => {
    log(`❌ Error fatal: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });

