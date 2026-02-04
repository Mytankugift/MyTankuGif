/**
 * Script para limpiar productos defectuosos del ranking
 * 
 * Elimina productos del global_ranking que no cumplen los requisitos:
 * - Deben tener título válido (no vacío, no "Sin nombre")
 * - Deben tener imágenes (array no vacío)
 * - Deben estar activos
 * 
 * Uso:
 *   npm run clean:invalid-products-from-ranking
 * 
 * O con DATABASE_URL específico:
 *   DATABASE_URL="..." npm run clean:invalid-products-from-ranking
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Cargar variables de entorno
dotenv.config({ path: '.env.production' });
dotenv.config(); // Sobrescribir con .env si existe

// Obtener DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL no está configurada');
  console.error('   Opciones:');
  console.error('   1. Crear archivo .env con DATABASE_URL');
  console.error('   2. Usar variable de entorno: DATABASE_URL="..." npm run clean:invalid-products-from-ranking');
  process.exit(1);
}

// Crear pool de PostgreSQL y adapter para Prisma
const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

interface InvalidProduct {
  id: string;
  title: string;
  images: any;
  active: boolean;
  reason: string;
}

async function cleanInvalidProductsFromRanking() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 LIMPIEZA DE PRODUCTOS INVÁLIDOS DEL RANKING');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Obtener todos los productos en el ranking
    console.log('📋 Obteniendo productos del ranking...');
    const rankingProducts = await (prisma as any).globalRanking.findMany({
      where: {
        itemType: 'product',
      },
      select: {
        itemId: true,
      },
    });

    console.log(`📊 Total de productos en ranking: ${rankingProducts.length}\n`);

    if (rankingProducts.length === 0) {
      console.log('✅ No hay productos en el ranking para validar');
      return;
    }

    // 2. Obtener información de cada producto
    const productIds = rankingProducts.map((r: any) => r.itemId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        title: true,
        images: true,
        active: true,
      },
    });

    console.log(`📦 Productos encontrados en BD: ${products.length}\n`);

    // 3. Identificar productos inválidos
    const invalidProducts: InvalidProduct[] = [];

    for (const product of products) {
      const reasons: string[] = [];

      // Validar título
      const hasValidTitle = product.title && 
                           product.title.trim() !== '' && 
                           product.title !== 'Sin nombre';
      if (!hasValidTitle) {
        reasons.push(`título inválido: "${product.title || 'null'}"`);
      }

      // Validar imágenes
      const hasValidImages = product.images && 
                            Array.isArray(product.images) && 
                            product.images.length > 0;
      if (!hasValidImages) {
        reasons.push(`sin imágenes (${Array.isArray(product.images) ? product.images.length : 'no es array'})`);
      }

      // Validar activo
      if (!product.active) {
        reasons.push('inactivo');
      }

      if (reasons.length > 0) {
        invalidProducts.push({
          id: product.id,
          title: product.title || 'SIN TÍTULO',
          images: product.images,
          active: product.active,
          reason: reasons.join(', '),
        });
      }
    }

    // También identificar productos que están en ranking pero no en BD
    const productIdsInDb = new Set(products.map(p => p.id));
    const missingProducts = rankingProducts.filter((r: any) => !productIdsInDb.has(r.itemId));

    console.log(`❌ Productos inválidos encontrados: ${invalidProducts.length}`);
    console.log(`⚠️  Productos en ranking pero no en BD: ${missingProducts.length}\n`);

    if (invalidProducts.length > 0) {
      console.log('📋 Detalle de productos inválidos:');
      invalidProducts.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.id.substring(0, 8)}... - "${p.title}"`);
        console.log(`      Razón: ${p.reason}`);
      });
      if (invalidProducts.length > 10) {
        console.log(`   ... y ${invalidProducts.length - 10} más\n`);
      } else {
        console.log();
      }
    }

    // 4. Eliminar productos inválidos del ranking
    if (invalidProducts.length > 0 || missingProducts.length > 0) {
      const idsToRemove = [
        ...invalidProducts.map(p => p.id),
        ...missingProducts.map((r: any) => r.itemId),
      ];

      console.log(`🗑️  Eliminando ${idsToRemove.length} productos del ranking...\n`);

      let deleted = 0;
      for (const productId of idsToRemove) {
        try {
          await (prisma as any).globalRanking.deleteMany({
            where: {
              itemId: productId,
              itemType: 'product',
            },
          });
          deleted++;
          if (deleted % 10 === 0) {
            console.log(`   ✅ ${deleted}/${idsToRemove.length} productos eliminados...`);
          }
        } catch (error: any) {
          console.error(`   ❌ Error eliminando producto ${productId.substring(0, 8)}...: ${error.message}`);
        }
      }

      console.log(`\n✅ ${deleted} productos eliminados del ranking`);
    } else {
      console.log('✅ Todos los productos en el ranking son válidos');
    }

    // 5. Resumen final
    const remainingProducts = await (prisma as any).globalRanking.count({
      where: {
        itemType: 'product',
      },
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Productos válidos en ranking: ${remainingProducts}`);
    console.log(`❌ Productos eliminados: ${invalidProducts.length + missingProducts.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error ejecutando limpieza:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Ejecutar
cleanInvalidProductsFromRanking()
  .then(() => {
    console.log('✅ Limpieza completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

