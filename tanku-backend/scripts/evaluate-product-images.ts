/**
 * Script para evaluar URLs de imágenes de productos
 * Identifica URLs que no siguen la estructura correcta (colombia/products/)
 * y rastrea su origen (enrich o raw)
 */

import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import * as fs from 'fs';
import * as path from 'path';

interface ImageAnalysis {
  productId: string;
  productTitle: string;
  productHandle: string;
  imageUrl: string;
  isCorrect: boolean;
  issue: string;
  source: 'enrich' | 'raw' | 'unknown';
  dropiId?: number;
  dropiProductImages?: any;
  dropiMainImageS3Path?: string | null;
}

const CDN_BASE = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';

/**
 * Verifica si una URL de imagen es correcta
 * Debe tener el patrón: CDN_BASE/colombia/products/...
 * O ser una URL completa válida del CDN
 */
function isCorrectImageUrl(url: string): boolean {
  // Si es una URL completa del CDN con colombia/products, es correcta
  if (url.includes(`${CDN_BASE}/colombia/products/`)) {
    return true;
  }
  
  // Si es una URL completa del CDN pero sin colombia/products, puede ser incorrecta
  if (url.startsWith(CDN_BASE)) {
    // Verificar si tiene /uploads/images/products (incorrecto)
    if (url.includes('/uploads/images/products')) {
      return false;
    }
    // Si tiene colombia/products en cualquier parte, es correcta
    if (url.includes('colombia/products')) {
      return true;
    }
  }
  
  // Si es una URL relativa que empieza con colombia/products, es correcta
  if (url.startsWith('colombia/products/')) {
    return true;
  }
  
  // Si contiene /uploads/images/products, es incorrecta
  if (url.includes('/uploads/images/products')) {
    return false;
  }
  
  // URLs HTTP/HTTPS completas de otros dominios se consideran válidas por ahora
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (!url.includes(CDN_BASE)) {
      return true; // URL externa válida
    }
  }
  
  return false;
}

/**
 * Identifica el problema con la URL
 */
function identifyIssue(url: string): string {
  if (url.includes('/uploads/images/products')) {
    return 'Contiene /uploads/images/products (debería ser colombia/products/)';
  }
  
  if (url.startsWith(CDN_BASE) && !url.includes('colombia/products')) {
    return 'URL del CDN pero sin estructura colombia/products/';
  }
  
  if (!url.startsWith('http') && !url.startsWith('colombia/products')) {
    return 'URL relativa sin estructura correcta';
  }
  
  return 'Estructura desconocida';
}

/**
 * Rastrea el origen de la imagen
 */
async function traceImageSource(
  productId: string,
  imageUrl: string
): Promise<{
  source: 'enrich' | 'raw' | 'unknown';
  dropiId?: number;
  dropiProductImages?: any;
  dropiMainImageS3Path?: string | null;
}> {
  // Buscar el producto en DropiProduct usando el handle
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { handle: true },
  });

  if (!product) {
    return { source: 'unknown' };
  }

  // Buscar en DropiProduct por handle (necesitamos extraer el dropiId del handle)
  // El handle tiene formato: nombre-producto-{dropiId}
  const handleMatch = product.handle.match(/-(\d+)$/);
  if (!handleMatch) {
    return { source: 'unknown' };
  }

  const dropiId = parseInt(handleMatch[1], 10);

  const dropiProduct = await prisma.dropiProduct.findUnique({
    where: { dropiId },
    select: {
      dropiId: true,
      images: true,
      mainImageS3Path: true,
    },
  });

  if (!dropiProduct) {
    return { source: 'unknown', dropiId };
  }

  // Verificar si la URL viene del enrich (images)
  if (dropiProduct.images) {
    let imagesArray: any[] = [];
    
    if (Array.isArray(dropiProduct.images)) {
      imagesArray = dropiProduct.images;
    } else if (typeof dropiProduct.images === 'string') {
      try {
        const parsed = JSON.parse(dropiProduct.images);
        if (Array.isArray(parsed)) imagesArray = parsed;
      } catch (e) {
        // No es JSON válido
      }
    }

    // Buscar la URL en las imágenes del enrich
    for (const img of imagesArray) {
      let imgUrl: string | null = null;
      
      if (typeof img === 'string') {
        imgUrl = img;
      } else if (typeof img === 'object' && img !== null) {
        imgUrl = (img as any).url || (img as any).urlS3 || null;
      }

      if (imgUrl && (imageUrl.includes(imgUrl) || imgUrl.includes(imageUrl.split('/').pop() || ''))) {
        return {
          source: 'enrich',
          dropiId: dropiProduct.dropiId,
          dropiProductImages: dropiProduct.images,
          dropiMainImageS3Path: dropiProduct.mainImageS3Path,
        };
      }
    }
  }

  // Verificar si viene del raw (mainImageS3Path)
  if (dropiProduct.mainImageS3Path) {
    if (imageUrl.includes(dropiProduct.mainImageS3Path) || 
        imageUrl.includes(dropiProduct.mainImageS3Path.split('/').pop() || '')) {
      return {
        source: 'raw',
        dropiId: dropiProduct.dropiId,
        dropiProductImages: dropiProduct.images,
        dropiMainImageS3Path: dropiProduct.mainImageS3Path,
      };
    }
  }

  return {
    source: 'unknown',
    dropiId: dropiProduct.dropiId,
    dropiProductImages: dropiProduct.images,
    dropiMainImageS3Path: dropiProduct.mainImageS3Path,
  };
}

async function evaluateProductImages() {
  console.log('🔍 EVALUANDO URLs DE IMÁGENES DE PRODUCTOS\n');
  console.log(`CDN Base: ${CDN_BASE}\n`);

  try {
    // Obtener todos los productos y filtrar los que tienen imágenes
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        handle: true,
        images: true,
      },
    });

    // Filtrar productos que tienen imágenes válidas
    const products = allProducts.filter((p) => {
      if (!p.images) return false;
      if (Array.isArray(p.images)) {
        return p.images.length > 0;
      }
      if (typeof p.images === 'string') {
        try {
          const parsed = JSON.parse(p.images);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch (e) {
          return false;
        }
      }
      return false;
    });

    console.log(`📊 Total de productos: ${allProducts.length}`);
    console.log(`📊 Productos con imágenes: ${products.length}\n`);

    const analysis: ImageAnalysis[] = [];
    let totalImages = 0;
    let correctImages = 0;
    let incorrectImages = 0;

    // Analizar cada producto
    for (const product of products) {
      if (!product.images) continue;

      let imagesArray: string[] = [];

      // Normalizar el array de imágenes
      if (Array.isArray(product.images)) {
        imagesArray = product.images.filter((img): img is string => typeof img === 'string');
      } else if (typeof product.images === 'string') {
        try {
          const parsed = JSON.parse(product.images);
          if (Array.isArray(parsed)) {
            imagesArray = parsed.filter((img): img is string => typeof img === 'string');
          }
        } catch (e) {
          // No es JSON válido, continuar
        }
      }

      totalImages += imagesArray.length;

      // Analizar cada imagen
      for (const imageUrl of imagesArray) {
        const isCorrect = isCorrectImageUrl(imageUrl);
        
        if (isCorrect) {
          correctImages++;
        } else {
          incorrectImages++;
          
          // Rastrear el origen de la imagen incorrecta
          const sourceInfo = await traceImageSource(product.id, imageUrl);
          
          analysis.push({
            productId: product.id,
            productTitle: product.title,
            productHandle: product.handle,
            imageUrl,
            isCorrect: false,
            issue: identifyIssue(imageUrl),
            source: sourceInfo.source,
            dropiId: sourceInfo.dropiId,
            dropiProductImages: sourceInfo.dropiProductImages,
            dropiMainImageS3Path: sourceInfo.dropiMainImageS3Path,
          });
        }
      }
    }

    // Estadísticas
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ESTADÍSTICAS GENERALES');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total de productos analizados: ${products.length}`);
    console.log(`Total de imágenes: ${totalImages}`);
    console.log(`✅ URLs correctas: ${correctImages} (${((correctImages / totalImages) * 100).toFixed(2)}%)`);
    console.log(`❌ URLs incorrectas: ${incorrectImages} (${((incorrectImages / totalImages) * 100).toFixed(2)}%)`);
    console.log();

    // Análisis por origen
    if (analysis.length > 0) {
      const bySource = {
        enrich: analysis.filter(a => a.source === 'enrich').length,
        raw: analysis.filter(a => a.source === 'raw').length,
        unknown: analysis.filter(a => a.source === 'unknown').length,
      };

      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 ANÁLISIS POR ORIGEN');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Del ENRICH: ${bySource.enrich}`);
      console.log(`Del RAW: ${bySource.raw}`);
      console.log(`Origen desconocido: ${bySource.unknown}`);
      console.log();

      // Análisis por tipo de problema
      const byIssue = new Map<string, number>();
      analysis.forEach(a => {
        const count = byIssue.get(a.issue) || 0;
        byIssue.set(a.issue, count + 1);
      });

      console.log('═══════════════════════════════════════════════════════');
      console.log('📊 ANÁLISIS POR TIPO DE PROBLEMA');
      console.log('═══════════════════════════════════════════════════════');
      byIssue.forEach((count, issue) => {
        console.log(`${issue}: ${count}`);
      });
      console.log();

      // Mostrar ejemplos
      console.log('═══════════════════════════════════════════════════════');
      console.log('📋 EJEMPLOS DE URLs INCORRECTAS (primeros 10)');
      console.log('═══════════════════════════════════════════════════════');
      
      analysis.slice(0, 10).forEach((item, idx) => {
        console.log(`\n${idx + 1}. Producto: ${item.productTitle}`);
        console.log(`   Handle: ${item.productHandle}`);
        console.log(`   DropiId: ${item.dropiId || 'N/A'}`);
        console.log(`   Origen: ${item.source.toUpperCase()}`);
        console.log(`   Problema: ${item.issue}`);
        console.log(`   URL: ${item.imageUrl.substring(0, 100)}${item.imageUrl.length > 100 ? '...' : ''}`);
        
        if (item.source === 'enrich' && item.dropiProductImages) {
          console.log(`   📸 Imágenes en DropiProduct.images:`);
          let imagesArray: any[] = [];
          if (Array.isArray(item.dropiProductImages)) {
            imagesArray = item.dropiProductImages;
          } else if (typeof item.dropiProductImages === 'string') {
            try {
              const parsed = JSON.parse(item.dropiProductImages);
              if (Array.isArray(parsed)) imagesArray = parsed;
            } catch (e) {}
          }
          
          imagesArray.slice(0, 2).forEach((img: any, imgIdx: number) => {
            const imgUrl = typeof img === 'string' ? img : (img?.url || img?.urlS3 || 'N/A');
            console.log(`      ${imgIdx + 1}. ${imgUrl}`);
          });
        }
        
        if (item.source === 'raw' && item.dropiMainImageS3Path) {
          console.log(`   📸 mainImageS3Path: ${item.dropiMainImageS3Path}`);
        }
      });

      // Generar reporte detallado en archivo
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('💾 Generando reporte detallado...');
      
      const report = {
        summary: {
          totalProducts: products.length,
          totalImages,
          correctImages,
          incorrectImages,
          correctPercentage: ((correctImages / totalImages) * 100).toFixed(2),
          incorrectPercentage: ((incorrectImages / totalImages) * 100).toFixed(2),
        },
        bySource,
        byIssue: Object.fromEntries(byIssue),
        incorrectImages: analysis.map(a => ({
          productId: a.productId,
          productTitle: a.productTitle,
          productHandle: a.productHandle,
          imageUrl: a.imageUrl,
          issue: a.issue,
          source: a.source,
          dropiId: a.dropiId,
        })),
      };

      const reportPath = path.join(__dirname, 'product-images-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Reporte guardado en: ${reportPath}`);
    } else {
      console.log('✅ ¡Excelente! No se encontraron URLs incorrectas.');
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  evaluateProductImages();
}

export { evaluateProductImages };

