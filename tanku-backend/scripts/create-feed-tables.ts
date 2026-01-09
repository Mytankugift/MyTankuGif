// Crear archivo: scripts/create-feed-tables.ts en tanku-backend/

/**
 * Script para crear las tablas del feed (global_ranking e item_metrics)
 * Ejecutar: npx tsx scripts/create-feed-tables.ts
 */

import { prisma } from '../src/config/database';

async function createFeedTables() {
  try {
    console.log('🔄 Creando tablas del feed...\n');

    // Crear tabla global_ranking
    console.log('📊 Creando tabla global_ranking...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "global_ranking" (
          "id" TEXT NOT NULL,
          "item_id" TEXT NOT NULL,
          "item_type" TEXT NOT NULL,
          "global_score" DOUBLE PRECISION NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "global_ranking_pkey" PRIMARY KEY ("id")
        );
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "global_ranking_global_score_created_at_idx" 
        ON "global_ranking"("global_score", "created_at");
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "global_ranking_item_type_idx" 
        ON "global_ranking"("item_type");
      `;

      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "global_ranking_item_id_item_type_key" 
        ON "global_ranking"("item_id", "item_type");
      `;

      console.log('✅ Tabla global_ranking creada exitosamente\n');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.code === '42P07') {
        console.log('✅ La tabla global_ranking ya existe\n');
      } else {
        throw error;
      }
    }

    // Crear tabla item_metrics
    console.log('📈 Creando tabla item_metrics...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "item_metrics" (
          "id" TEXT NOT NULL,
          "item_id" TEXT NOT NULL,
          "item_type" TEXT NOT NULL,
          "wishlist_count" INTEGER NOT NULL DEFAULT 0,
          "orders_count" INTEGER NOT NULL DEFAULT 0,
          "likes_count" INTEGER NOT NULL DEFAULT 0,
          "comments_count" INTEGER NOT NULL DEFAULT 0,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "item_metrics_pkey" PRIMARY KEY ("id")
        );
      `;

      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "item_metrics_item_type_idx" 
        ON "item_metrics"("item_type");
      `;

      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "item_metrics_item_id_item_type_key" 
        ON "item_metrics"("item_id", "item_type");
      `;

      console.log('✅ Tabla item_metrics creada exitosamente\n');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.code === '42P07') {
        console.log('✅ La tabla item_metrics ya existe\n');
      } else {
        throw error;
      }
    }

    console.log('✅ ¡Todas las tablas del feed creadas exitosamente!\n');

    // Verificar que se crearon correctamente
    const globalRankingExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'global_ranking'
      ) as exists;
    `;

    const itemMetricsExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'item_metrics'
      ) as exists;
    `;

    console.log('📋 Verificación:');
    console.log(`   - global_ranking: ${globalRankingExists[0]?.exists ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   - item_metrics: ${itemMetricsExists[0]?.exists ? '✅ Existe' : '❌ No existe'}\n`);

    if (globalRankingExists[0]?.exists && itemMetricsExists[0]?.exists) {
      console.log('✅ ¡Todo listo! Ahora puedes inicializar los datos:');
      console.log('   npx tsx scripts/init-feed-metrics.ts\n');
    }

  } catch (error: any) {
    console.error('\n❌ Error creando tablas:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createFeedTables()
  .then(() => {
    console.log('✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });