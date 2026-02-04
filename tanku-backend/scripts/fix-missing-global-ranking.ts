/**
 * Script para insertar productos faltantes en global_ranking
 * 
 * Uso:
 *   # Usando DATABASE_URL de producción desde variable de entorno
 *   DATABASE_URL="postgresql://..." tsx scripts/fix-missing-global-ranking.ts
 * 
 *   # O crear un archivo .env.production con DATABASE_URL
 *   tsx scripts/fix-missing-global-ranking.ts
 * 
 * IMPORTANTE: Este script modifica la base de datos de producción.
 * Asegúrate de tener la DATABASE_URL correcta antes de ejecutar.
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Cargar .env.production si existe, sino usar .env
dotenv.config({ path: '.env.production' });
dotenv.config(); // Sobrescribir con .env si existe

// Crear instancia de Prisma con DATABASE_URL de producción
const productionDatabaseUrl = process.env.DATABASE_URL;

if (!productionDatabaseUrl) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  console.error('   Opciones:');
  console.error('   1. Crear archivo .env.production con DATABASE_URL');
  console.error('   2. Usar variable de entorno: DATABASE_URL="..." tsx scripts/fix-missing-global-ranking.ts');
  process.exit(1);
}

// Verificar que es producción (contiene "railway" o "production")
const isProduction = productionDatabaseUrl.includes('railway') || 
                     productionDatabaseUrl.includes('production') ||
                     productionDatabaseUrl.includes('trolley.proxy.rlwy.net');

// Crear pool de PostgreSQL y adapter para Prisma
const pool = new Pool({
  connectionString: productionDatabaseUrl,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

// Crear Prisma client con la URL de producción
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function fixMissingGlobalRanking() {
  // Verificar que es producción antes de continuar
  if (!isProduction) {
    console.warn('⚠️  ADVERTENCIA: La DATABASE_URL no parece ser de producción');
    console.warn(`   URL: ${productionDatabaseUrl.substring(0, 50)}...`);
    console.warn('   ¿Estás seguro de que quieres continuar? (Ctrl+C para cancelar)');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('🔧 CORRECCIÓN DE GLOBAL_RANKING (PRODUCCIÓN)');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📊 Conectando a: ${productionDatabaseUrl.substring(0, 50)}...\n`);

  try {
    // 1. Verificar conexión
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Conexión a base de datos establecida\n');

    // 2. Verificar que la tabla global_ranking existe
    try {
      const count = await (prisma as any).globalRanking.count();
      console.log(`✅ Tabla global_ranking existe (${count} registros actuales)\n`);
    } catch (error: any) {
      if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
        console.error('❌ La tabla global_ranking no existe en producción.');
        console.error('   Ejecuta en producción: npm run fix:feed:tables');
        process.exit(1);
      }
      throw error;
    }

    // 3. Encontrar productos que NO están en global_ranking
    console.log('🔍 Buscando productos faltantes en global_ranking...\n');
    
    const allProducts = await prisma.product.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const productsInRanking = await (prisma as any).globalRanking.findMany({
      where: { itemType: 'product' },
      select: { itemId: true },
    });

    const productIdsInRanking = new Set(productsInRanking.map((r: any) => r.itemId));
    const missingProducts = allProducts.filter((p) => !productIdsInRanking.has(p.id));

    console.log(`📊 Estadísticas:`);
    console.log(`   - Total productos: ${allProducts.length}`);
    console.log(`   - Productos en ranking: ${productIdsInRanking.size}`);
    console.log(`   - Productos faltantes: ${missingProducts.length}\n`);

    if (missingProducts.length === 0) {
      console.log('✅ Todos los productos ya están en global_ranking\n');
      return;
    }

    // 4. Mostrar algunos productos faltantes
    console.log('📋 Primeros 10 productos faltantes:');
    missingProducts.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.title} (ID: ${p.id.substring(0, 8)}...)`);
    });
    console.log();

    // 5. Confirmar antes de insertar
    console.log(`⚠️  Se insertarán ${missingProducts.length} productos en global_ranking`);
    console.log('   Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 6. Insertar productos faltantes
    console.log(`🔧 Insertando ${missingProducts.length} productos faltantes...\n`);
    
    let inserted = 0;
    let errors = 0;
    const errorsList: Array<{ productId: string; error: string }> = [];

    for (const product of missingProducts) {
      try {
        // Insertar en item_metrics
        await (prisma as any).itemMetric.upsert({
          where: {
            itemId_itemType: {
              itemId: product.id,
              itemType: 'product',
            },
          },
          update: {},
          create: {
            itemId: product.id,
            itemType: 'product',
            wishlistCount: 0,
            ordersCount: 0,
            likesCount: 0,
            commentsCount: 0,
          },
        });

        // Insertar en global_ranking
        await (prisma as any).globalRanking.upsert({
          where: {
            itemId_itemType: {
              itemId: product.id,
              itemType: 'product',
            },
          },
          update: {},
          create: {
            itemId: product.id,
            itemType: 'product',
            globalScore: 0,
            createdAt: product.createdAt,
          },
        });

        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   ✅ ${inserted}/${missingProducts.length} productos insertados...`);
        }
      } catch (error: any) {
        errors++;
        errorsList.push({ productId: product.id, error: error.message });
        console.error(`   ❌ Error insertando producto ${product.id.substring(0, 8)}...: ${error.message}`);
      }
    }

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`📊 RESUMEN`);
    console.log(`═══════════════════════════════════════════════════════`);
    console.log(`✅ Productos insertados: ${inserted}`);
    console.log(`❌ Errores: ${errors}`);
    
    if (errorsList.length > 0 && errorsList.length <= 10) {
      console.log(`\n⚠️  Errores encontrados:`);
      errorsList.forEach((err) => {
        console.log(`   - ${err.productId.substring(0, 8)}...: ${err.error}`);
      });
    }

    // 7. Verificar resultado final
    const finalCount = await (prisma as any).globalRanking.count({
      where: { itemType: 'product' },
    });
    console.log(`\n📊 Productos en global_ranking después de la corrección: ${finalCount}\n`);

  } catch (error: any) {
    console.error(`\n❌ Error fatal: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Conexión cerrada');
  }
}

if (require.main === module) {
  fixMissingGlobalRanking()
    .catch((error) => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { fixMissingGlobalRanking };

