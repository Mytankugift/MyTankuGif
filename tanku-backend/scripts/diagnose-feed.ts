/**
 * Script de diagnóstico rápido para el feed
 */

import { prisma } from '../src/config/database';

async function diagnoseFeed() {
  console.log('🔍 DIAGNÓSTICO RÁPIDO DEL FEED\n');

  try {
    // 1. Obtener primeros 10 productos del ranking
    const rankingItems = await (prisma as any).globalRanking.findMany({
      where: { itemType: 'product' },
      orderBy: [{ globalScore: 'desc' }, { createdAt: 'desc' }],
      take: 10,
      select: { itemId: true },
    });

    console.log(`✅ Productos en ranking (primeros 10): ${rankingItems.length}\n`);

    if (rankingItems.length === 0) {
      console.log('❌ No hay productos en global_ranking');
      return;
    }

    const productIds = rankingItems.map((r: any) => r.itemId);

    // 2. Verificar estos productos en la BD
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        title: true,
        images: true,
        variants: {
          where: { active: true },
          take: 1,
          select: { id: true },
        },
      },
    });

    console.log(`📊 Productos encontrados en BD: ${products.length}\n`);

    // 3. Analizar cada producto
    let validCount = 0;
    let invalidCount = 0;

    products.forEach((p, idx) => {
      const hasTitle = p.title && p.title.trim() !== '';
      
      // ✅ MEJORAR: Verificar images de forma más robusta
      let hasImages = false;
      let imagesArray: any[] = [];
      let imagesType = typeof p.images;
      
      if (p.images) {
        if (Array.isArray(p.images)) {
          imagesArray = p.images;
          hasImages = p.images.length > 0;
        } else if (typeof p.images === 'string') {
          // Si es string, intentar parsear como JSON
          try {
            const parsed = JSON.parse(p.images);
            if (Array.isArray(parsed)) {
              imagesArray = parsed;
              hasImages = parsed.length > 0;
            }
          } catch (e) {
            // No es JSON válido
          }
        } else if (typeof p.images === 'object' && p.images !== null) {
          // Si es objeto, intentar convertirlo a array
          imagesArray = Object.values(p.images);
          hasImages = imagesArray.length > 0;
        }
      }
      
      const hasVariants = p.variants && p.variants.length > 0;

      const isValid = hasTitle && hasImages && hasVariants;

      if (isValid) {
        validCount++;
        console.log(`✅ ${idx + 1}. ${p.title}`);
        console.log(`   - Imágenes: ${imagesArray.length}`);
        if (imagesArray.length > 0) {
          const firstImg = imagesArray[0];
          const firstImgStr = typeof firstImg === 'string' 
            ? firstImg.substring(0, 60) 
            : (firstImg?.url || firstImg?.urlS3 || JSON.stringify(firstImg).substring(0, 60));
          console.log(`   - Primera imagen: ${firstImgStr}...`);
        }
        console.log(`   - Variantes: ${p.variants.length}`);
      } else {
        invalidCount++;
        console.log(`❌ ${idx + 1}. ${p.title || 'SIN TÍTULO'}`);
        if (!hasTitle) console.log(`   ⚠️  Sin title`);
        if (!hasImages) {
          console.log(`   ⚠️  Sin imágenes`);
          console.log(`   - Tipo de images: ${imagesType}`);
          console.log(`   - Es array: ${Array.isArray(p.images)}`);
          if (p.images) {
            const imagesStr = JSON.stringify(p.images);
            console.log(`   - Valor (primeros 150 chars): ${imagesStr.substring(0, 150)}`);
            if (typeof p.images === 'object' && p.images !== null && !Array.isArray(p.images)) {
              console.log(`   - Keys: ${Object.keys(p.images).join(', ')}`);
            }
          } else {
            console.log(`   - Valor: null o undefined`);
          }
        }
        if (!hasVariants) console.log(`   ⚠️  Sin variantes activas`);
      }
      console.log();
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 RESUMEN (de muestra de 10):`);
    console.log(`✅ Válidos: ${validCount}`);
    console.log(`❌ Inválidos: ${invalidCount}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // ✅ AGREGAR: Buscar productos que SÍ tienen imágenes en la BD
    console.log('🔍 Buscando productos CON imágenes en la BD...\n');
    // Obtener todos los productos y filtrar los que tienen imágenes
    const allProductsForCheck = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        images: true,
      },
      take: 100, // Revisar más productos para encontrar algunos con imágenes
    });
    
    // Filtrar los que tienen imágenes válidas
    const productsWithImages = allProductsForCheck.filter((p) => {
      if (!p.images) return false;
      if (Array.isArray(p.images)) {
        return p.images.length > 0;
      }
      return false;
    }).slice(0, 10);

    console.log(`📊 Productos con imágenes encontrados: ${productsWithImages.length}\n`);

    if (productsWithImages.length > 0) {
      // Verificar si estos productos están en global_ranking
      const productIdsWithImages = productsWithImages.map(p => p.id);
      const rankingItemsWithImages = await (prisma as any).globalRanking.findMany({
        where: {
          itemType: 'product',
          itemId: { in: productIdsWithImages },
        },
        select: {
          itemId: true,
          globalScore: true,
        },
        orderBy: [{ globalScore: 'desc' }],
      });

      console.log(`📊 De estos productos con imágenes:`);
      console.log(`   - En global_ranking: ${rankingItemsWithImages.length}`);
      if (rankingItemsWithImages.length > 0) {
        const scores = rankingItemsWithImages.map((r: any) => r.globalScore);
        console.log(`   - Score máximo: ${Math.max(...scores)}`);
        console.log(`   - Score mínimo: ${Math.min(...scores)}`);
        console.log(`   - Score promedio: ${(scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(2)}`);
      }
      console.log();

      // Mostrar algunos ejemplos
      productsWithImages.slice(0, 3).forEach((p, idx) => {
        let imagesArray: any[] = [];
        if (Array.isArray(p.images)) {
          imagesArray = p.images;
        } else if (typeof p.images === 'string') {
          try {
            const parsed = JSON.parse(p.images);
            if (Array.isArray(parsed)) imagesArray = parsed;
          } catch (e) {}
        }
        
        const rankingItem = rankingItemsWithImages.find((r: any) => r.itemId === p.id);
        console.log(`${idx + 1}. ${p.title}`);
        console.log(`   - Imágenes: ${imagesArray.length}`);
        if (imagesArray.length > 0) {
          const firstImg = imagesArray[0];
          const firstImgStr = typeof firstImg === 'string' 
            ? firstImg.substring(0, 60) 
            : (firstImg?.url || firstImg?.urlS3 || JSON.stringify(firstImg).substring(0, 60));
          console.log(`   - Primera: ${firstImgStr}...`);
        }
        console.log(`   - En ranking: ${rankingItem ? 'Sí' : 'No'} (score: ${rankingItem?.globalScore || 'N/A'})`);
        console.log();
      });
    } else {
      console.log('⚠️  No se encontraron productos con imágenes en la BD');
      console.log('   Esto significa que sync-to-backend no está guardando imágenes correctamente');
      console.log('   O que los productos no han pasado por ENRICH\n');
    }

    // ✅ AGREGAR: Verificar dropi_product para ver si tiene images
    console.log('🔍 Verificando dropi_product para ver si tiene images...\n');
    const dropiProductsSample = await prisma.dropiProduct.findMany({
      select: {
        dropiId: true,
        name: true,
        images: true,
        mainImageS3Path: true,
      },
      take: 5,
    });

    console.log(`📊 Muestra de dropi_product (5 productos):\n`);
    dropiProductsSample.forEach((dp, idx) => {
      console.log(`${idx + 1}. ${dp.name} (dropiId: ${dp.dropiId})`);
      console.log(`   - mainImageS3Path: ${dp.mainImageS3Path || 'null'}`);
      
      let imagesArray: any[] = [];
      let imagesType = typeof dp.images;
      if (dp.images) {
        if (Array.isArray(dp.images)) {
          imagesArray = dp.images;
        } else if (typeof dp.images === 'string') {
          try {
            const parsed = JSON.parse(dp.images);
            if (Array.isArray(parsed)) imagesArray = parsed;
          } catch (e) {}
        }
      }
      
      console.log(`   - images type: ${imagesType}, isArray: ${Array.isArray(dp.images)}`);
      console.log(`   - images count: ${imagesArray.length}`);
      if (imagesArray.length > 0) {
        const firstImg = imagesArray[0];
        if (typeof firstImg === 'object' && firstImg !== null) {
          console.log(`   - Primera imagen: urlS3=${(firstImg as any).urlS3 || 'null'}, url=${(firstImg as any).url || 'null'}`);
        } else {
          console.log(`   - Primera imagen: ${firstImg}`);
        }
      }
      console.log();
    });

    if (invalidCount > 0) {
      console.log('💡 SOLUCIÓN:');
      if (invalidCount === products.length) {
        console.log('   ⚠️  TODOS los productos de la muestra están inválidos');
        if (productsWithImages.length === 0) {
          console.log('   1. ❌ PROBLEMA: No hay productos con imágenes en la BD');
          console.log('      - Verifica que sync-to-backend esté extrayendo urlS3 de dropi_product.images');
          console.log('      - Ejecuta ENRICH para obtener imágenes');
        } else {
          console.log('   1. ⚠️  Los productos con imágenes tienen score bajo y están al final del ranking');
          console.log('   2. Ejecuta ENRICH para obtener más imágenes');
          console.log('   3. O espera a que los productos tengan más interacción (likes, wishlist) para subir de score');
        }
        console.log('   2. Verifica que sync-to-backend esté guardando title correctamente');
        console.log('   3. Verifica que los productos tengan variantes activas');
      } else {
        console.log('   1. Algunos productos necesitan ENRICH para obtener imágenes');
        console.log('   2. Verifica que sync-to-backend esté guardando todos los campos');
      }
    } else {
      console.log('✅ Todos los productos de la muestra son válidos');
      console.log('   Si aún no aparecen en el feed, revisa los logs del servidor');
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  diagnoseFeed();
}

export { diagnoseFeed };

