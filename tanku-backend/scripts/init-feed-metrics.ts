/**
 * Script para inicializar métricas y ranking del feed
 * 
 * Ejecutar: npx tsx scripts/init-feed-metrics.ts
 */

import { prisma } from '../src/config/database';
import { FeedService } from '../src/modules/feed/feed.service';

async function initFeedMetrics() {
  try {
    console.log('🚀 Inicializando métricas del feed...\n');

    const feedService = new FeedService();

    // ============================================
    // 1. INICIALIZAR PRODUCTOS
    // ============================================
    console.log('📦 Buscando productos...');
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    console.log(`   Encontrados ${products.length} productos activos\n`);

    if (products.length > 0) {
      console.log('   Inicializando métricas de productos...');
      let productCount = 0;

      for (const product of products) {
        try {
          // Inicializar métricas
          await feedService.initializeItemMetrics(product.id, 'product');

          // Obtener métricas reales
          const wishlistCount = await prisma.wishList.count({
            where: {
              items: {
                some: {
                  productId: product.id,
                },
              },
            },
          });

          const ordersCount = await prisma.orderItem.count({
            where: {
              productId: product.id,
            },
          });

          // Actualizar métricas
          await feedService.updateItemMetrics(product.id, 'product', {
            wishlistCount,
            ordersCount,
          });

          productCount++;
          if (productCount % 10 === 0) {
            console.log(`   Procesados ${productCount}/${products.length} productos...`);
          }
        } catch (error: any) {
          console.error(`   ❌ Error procesando producto ${product.id}:`, error.message);
        }
      }

      console.log(`   ✅ ${productCount} productos inicializados\n`);
    }

    // ============================================
    // 2. INICIALIZAR POSTERS
    // ============================================
    console.log('📸 Buscando posters...');
    const posters = await prisma.poster.findMany({
      where: { isActive: true },
      select: {
        id: true,
        customerId: true,
        likesCount: true,
        commentsCount: true,
        createdAt: true,
      },
    });

    console.log(`   Encontrados ${posters.length} posters activos\n`);

    if (posters.length > 0) {
      console.log('   Inicializando métricas de posters...');
      let posterCount = 0;

      for (const poster of posters) {
        try {
          // Inicializar métricas
          await feedService.initializeItemMetrics(poster.id, 'poster');

          // Actualizar métricas con valores reales
          await feedService.updateItemMetrics(poster.id, 'poster', {
            likesCount: poster.likesCount,
            commentsCount: poster.commentsCount,
          });

          posterCount++;
          if (posterCount % 10 === 0) {
            console.log(`   Procesados ${posterCount}/${posters.length} posters...`);
          }
        } catch (error: any) {
          console.error(`   ❌ Error procesando poster ${poster.id}:`, error.message);
        }
      }

      console.log(`   ✅ ${posterCount} posters inicializados\n`);
    }

    // ============================================
    // 3. VERIFICAR RESULTADOS
    // ============================================
    console.log('📊 Verificando resultados...\n');

    const rankingCount = await prisma.globalRanking.count();
    const metricsCount = await prisma.itemMetric.count();

    console.log(`   Ranking global: ${rankingCount} items`);
    console.log(`   Métricas: ${metricsCount} items\n`);

    // Obtener algunos items del ranking para mostrar
    const topItems = await prisma.globalRanking.findMany({
      orderBy: [
        { globalScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
    });

    if (topItems.length > 0) {
      console.log('   Top 5 items del ranking:');
      for (const item of topItems) {
        console.log(`   - ${item.itemType} ${item.itemId}: score ${item.globalScore}`);
      }
      console.log('');
    }

    console.log('✅ Inicialización completada!\n');
    console.log('💡 Ahora puedes probar el feed:');
    console.log('   GET http://localhost:9000/api/v1/feed?limit=20\n');
  } catch (error) {
    console.error('❌ Error durante la inicialización:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
initFeedMetrics();

