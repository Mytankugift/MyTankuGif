/**
 * Script de prueba para ejecutar el flujo completo de Dropi
 * 
 * Uso:
 *   tsx scripts/test-full-flow.ts
 * 
 * Este script:
 * 1. Sincroniza la primera página de productos RAW (40 productos)
 * 2. Normaliza esos productos
 * 3. Enriquece esos productos
 * 4. Sincroniza al backend (Product/ProductVariant/WarehouseVariant)
 * 
 * Útil para debuggear por qué no aparecen productos en el feed
 */

import { prisma } from '../src/config/database';
import { DropiRawService } from '../src/modules/dropi-raw/dropi-raw.service';
import { DropiNormalizeService } from '../src/modules/dropi-normalize/dropi-normalize.service';
import { DropiEnrichService } from '../src/modules/dropi-enrich/dropi-enrich.service';
import { DropiSyncService } from '../src/modules/dropi-sync/dropi-sync.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function checkDatabaseConnection() {
  console.log('\n📊 [TEST] Verificando conexión a la base de datos...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ [TEST] Conexión a base de datos OK\n');
    return true;
  } catch (error: any) {
    console.error('❌ [TEST] Error conectando a la base de datos:', error.message);
    return false;
  }
}

async function step1_SyncRaw() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📥 PASO 1: Sincronizar productos RAW (primera página)');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const rawService = new DropiRawService();
    
    // Sincronizar solo la primera página (40 productos)
    const result = await rawService.syncRawProducts(0, 1);
    
    console.log(`✅ [RAW] Sincronización completada:`);
    console.log(`   - Productos procesados: ${result.processed}`);
    console.log(`   - Total en Dropi: ${result.total}`);
    console.log(`   - Páginas procesadas: ${result.pages_processed}`);
    console.log(`   - Hay más páginas: ${result.has_more ? 'Sí' : 'No'}\n`);
    
    return result.success;
  } catch (error: any) {
    console.error(`❌ [RAW] Error: ${error.message}\n`);
    return false;
  }
}

async function step2_Normalize() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 PASO 2: Normalizar productos RAW');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const normalizeService = new DropiNormalizeService();
    
    // Normalizar todos los productos RAW pendientes
    const result = await normalizeService.normalizeProducts(100, 0, undefined, true);
    
    console.log(`✅ [NORMALIZE] Normalización completada:`);
    console.log(`   - Productos normalizados: ${result.normalized}`);
    console.log(`   - Errores: ${result.errors}`);
    console.log(`   - Total pendiente: ${result.total_pending}`);
    console.log(`   - Restantes: ${result.remaining}\n`);
    
    if (result.errors > 0 && result.error_details.length > 0) {
      console.log(`⚠️  [NORMALIZE] Primeros errores:`);
      result.error_details.slice(0, 5).forEach((err: any) => {
        console.log(`   - Producto ${err.dropi_id}: ${err.error}`);
      });
      console.log();
    }
    
    return result.success;
  } catch (error: any) {
    console.error(`❌ [NORMALIZE] Error: ${error.message}\n`);
    return false;
  }
}

async function step3_Enrich() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('✨ PASO 3: Enriquecer productos (descripciones e imágenes)');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const enrichService = new DropiEnrichService();
    
    // Enriquecer productos (limit: 1000, pero solo procesará los que no tengan descripción/imágenes)
    const result = await enrichService.enrichProducts(1000, 'active', 50, false);
    
    console.log(`✅ [ENRICH] Enriquecimiento completado:`);
    console.log(`   - Productos enriquecidos: ${result.enriched}`);
    console.log(`   - Errores: ${result.errors}`);
    console.log(`   - Total pendiente: ${result.total_pending || 'N/A'}`);
    console.log(`   - Restantes: ${result.remaining || 'N/A'}\n`);
    
    if (result.errors > 0 && result.error_details.length > 0) {
      console.log(`⚠️  [ENRICH] Primeros errores:`);
      result.error_details.slice(0, 5).forEach((err: any) => {
        console.log(`   - Producto ${err.dropi_id}: ${err.error}`);
      });
      console.log();
    }
    
    return result.success;
  } catch (error: any) {
    console.error(`❌ [ENRICH] Error: ${error.message}\n`);
    return false;
  }
}

async function step4_SyncToBackend() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 PASO 4: Sincronizar al backend (Product/ProductVariant/WarehouseVariant)');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const syncService = new DropiSyncService();
    
    // Sincronizar todos los productos normalizados y enriquecidos
    const result = await syncService.syncToBackend(50, 0, false, false);
    
    console.log(`✅ [SYNC] Sincronización completada:`);
    console.log(`   - Productos creados: ${result.products_created}`);
    console.log(`   - Productos actualizados: ${result.products_updated}`);
    console.log(`   - Variantes creadas: ${result.variants_created}`);
    console.log(`   - Variantes actualizadas: ${result.variants_updated}`);
    console.log(`   - Warehouse variants creadas: ${result.warehouse_variants_created}`);
    console.log(`   - Errores: ${result.errors}`);
    console.log(`   - Total procesado: ${result.total}`);
    console.log(`   - Restantes: ${result.remaining}\n`);
    
    if (result.errors > 0 && result.error_details.length > 0) {
      console.log(`⚠️  [SYNC] Primeros errores:`);
      result.error_details.slice(0, 5).forEach((err: any) => {
        console.log(`   - Producto ${err.dropi_id}: ${err.error}`);
      });
      console.log();
    }
    
    return result.success;
  } catch (error: any) {
    console.error(`❌ [SYNC] Error: ${error.message}\n`);
    return false;
  }
}

async function showStatistics() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 ESTADÍSTICAS FINALES');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const [rawCount, normalizedCount, enrichedCount, productsCount, variantsCount, warehouseVariantsCount] = await Promise.all([
      prisma.dropiRawProduct.count(),
      prisma.dropiProduct.count(),
      prisma.dropiProduct.count({ where: { description: { not: null }, images: { not: null } } }),
      prisma.product.count(),
      prisma.productVariant.count(),
      prisma.warehouseVariant.count(),
    ]);
    
    console.log(`📦 DropiRawProduct: ${rawCount} productos`);
    console.log(`🔄 DropiProduct: ${normalizedCount} productos`);
    console.log(`✨ DropiProduct enriquecidos: ${enrichedCount} productos`);
    console.log(`🚀 Product (backend): ${productsCount} productos`);
    console.log(`🔀 ProductVariant: ${variantsCount} variantes`);
    console.log(`🏭 WarehouseVariant: ${warehouseVariantsCount} variantes\n`);
    
    // Mostrar algunos productos de ejemplo
    const sampleProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          take: 1,
          include: {
            warehouseVariants: true,
          },
        },
      },
    });
    
    if (sampleProducts.length > 0) {
      console.log('📋 Ejemplos de productos sincronizados:');
      sampleProducts.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.title}`);
        console.log(`      - ID: ${p.id}`);
        console.log(`      - Handle: ${p.handle}`);
        console.log(`      - Variantes: ${p.variants.length}`);
        console.log(`      - Warehouse Variants: ${p.variants[0]?.warehouseVariants.length || 0}`);
        console.log(`      - Imágenes: ${p.images?.length || 0}`);
        console.log();
      });
    } else {
      console.log('⚠️  No hay productos en la tabla Product\n');
    }
  } catch (error: any) {
    console.error(`❌ Error obteniendo estadísticas: ${error.message}\n`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 PRUEBA COMPLETA DEL FLUJO DE DROPI');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Este script ejecutará:');
  console.log('  1. Sincronizar primera página RAW (40 productos)');
  console.log('  2. Normalizar productos RAW');
  console.log('  3. Enriquecer productos (descripciones e imágenes)');
  console.log('  4. Sincronizar al backend (Product/ProductVariant/WarehouseVariant)');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Verificar conexión a BD
  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    console.error('❌ La prueba no puede continuar sin conexión a la base de datos');
    process.exit(1);
  }
  
  const results = {
    raw: false,
    normalize: false,
    enrich: false,
    sync: false,
  };
  
  try {
    // Paso 1: Sync RAW
    results.raw = await step1_SyncRaw();
    if (!results.raw) {
      console.error('❌ El paso RAW falló, pero continuamos...\n');
    }
    
    await sleep(1000); // Pequeña pausa entre pasos
    
    // Paso 2: Normalize
    results.normalize = await step2_Normalize();
    if (!results.normalize) {
      console.error('❌ El paso NORMALIZE falló, pero continuamos...\n');
    }
    
    await sleep(1000);
    
    // Paso 3: Enrich
    results.enrich = await step3_Enrich();
    if (!results.enrich) {
      console.warn('⚠️  El paso ENRICH falló o no había productos para enriquecer\n');
    }
    
    await sleep(1000);
    
    // Paso 4: Sync to Backend
    results.sync = await step4_SyncToBackend();
    if (!results.sync) {
      console.error('❌ El paso SYNC falló\n');
    }
    
    // Mostrar estadísticas finales
    await showStatistics();
    
    // Resumen
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ RAW: ${results.raw ? 'OK' : 'FALLÓ'}`);
    console.log(`✅ NORMALIZE: ${results.normalize ? 'OK' : 'FALLÓ'}`);
    console.log(`✅ ENRICH: ${results.enrich ? 'OK' : 'FALLÓ'}`);
    console.log(`✅ SYNC: ${results.sync ? 'OK' : 'FALLÓ'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (results.raw && results.normalize && results.enrich && results.sync) {
      console.log('🎉 ¡Flujo completo ejecutado exitosamente!');
    } else {
      console.log('⚠️  Algunos pasos fallaron. Revisa los logs arriba.');
    }
    
  } catch (error: any) {
    console.error(`\n❌ Error fatal en la prueba: ${error.message}`);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Prueba completada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { main as testFullFlow };

