/**
 * Script para diagnosticar productos inválidos
 * 
 * Muestra un análisis detallado de productos que no cumplen requisitos:
 * - Productos sin título o con título inválido
 * - Productos sin imágenes
 * - Productos inactivos
 * 
 * Uso:
 *   npm run diagnose:invalid-products
 * 
 * O con DATABASE_URL específico:
 *   DATABASE_URL="..." npm run diagnose:invalid-products
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
  console.error('   2. Usar variable de entorno: DATABASE_URL="..." npm run diagnose:invalid-products');
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

interface ProductDiagnostic {
  id: string;
  title: string;
  images: any;
  active: boolean;
  issues: string[];
}

async function diagnoseInvalidProducts() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 DIAGNÓSTICO DE PRODUCTOS INVÁLIDOS');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Obtener todos los productos
    console.log('📋 Obteniendo todos los productos...');
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        title: true,
        images: true,
        active: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total de productos en BD: ${allProducts.length}\n`);

    if (allProducts.length === 0) {
      console.log('✅ No hay productos para analizar');
      return;
    }

    // 2. Analizar productos
    const diagnostics: ProductDiagnostic[] = [];
    const stats = {
      total: allProducts.length,
      valid: 0,
      invalid: 0,
      noTitle: 0,
      invalidTitle: 0,
      noImages: 0,
      inactive: 0,
      multipleIssues: 0,
    };

    for (const product of allProducts) {
      const issues: string[] = [];

      // Validar título
      const hasTitle = product.title && product.title.trim() !== '';
      const hasValidTitle = hasTitle && product.title !== 'Sin nombre';

      if (!hasTitle) {
        issues.push('sin título');
        stats.noTitle++;
      } else if (!hasValidTitle) {
        issues.push(`título inválido: "${product.title}"`);
        stats.invalidTitle++;
      }

      // Validar imágenes
      const hasValidImages = product.images && 
                            Array.isArray(product.images) && 
                            product.images.length > 0;
      if (!hasValidImages) {
        issues.push('sin imágenes');
        stats.noImages++;
      }

      // Validar activo
      if (!product.active) {
        issues.push('inactivo');
        stats.inactive++;
      }

      if (issues.length > 0) {
        diagnostics.push({
          id: product.id,
          title: product.title || 'SIN TÍTULO',
          images: product.images,
          active: product.active,
          issues,
        });
        stats.invalid++;
        if (issues.length > 1) {
          stats.multipleIssues++;
        }
      } else {
        stats.valid++;
      }
    }

    // 3. Mostrar estadísticas generales
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ESTADÍSTICAS GENERALES');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Productos válidos: ${stats.valid} (${((stats.valid / stats.total) * 100).toFixed(1)}%)`);
    console.log(`❌ Productos inválidos: ${stats.invalid} (${((stats.invalid / stats.total) * 100).toFixed(1)}%)`);
    console.log();
    console.log('📋 Desglose de problemas:');
    console.log(`   • Sin título: ${stats.noTitle}`);
    console.log(`   • Título inválido ("Sin nombre"): ${stats.invalidTitle}`);
    console.log(`   • Sin imágenes: ${stats.noImages}`);
    console.log(`   • Inactivos: ${stats.inactive}`);
    console.log(`   • Múltiples problemas: ${stats.multipleIssues}`);
    console.log();

    // 4. Mostrar ejemplos de productos sin título
    const productsNoTitle = diagnostics.filter(p => 
      p.issues.some(i => i.includes('sin título') || i.includes('título inválido'))
    );

    if (productsNoTitle.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`❌ PRODUCTOS SIN TÍTULO VÁLIDO (${productsNoTitle.length})`);
      console.log('═══════════════════════════════════════════════════════');
      productsNoTitle.slice(0, 20).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.id.substring(0, 12)}...`);
        console.log(`      Título: "${p.title}"`);
        console.log(`      Problemas: ${p.issues.join(', ')}`);
        console.log();
      });
      if (productsNoTitle.length > 20) {
        console.log(`   ... y ${productsNoTitle.length - 20} más\n`);
      }
    }

    // 5. Mostrar ejemplos de productos sin imágenes
    const productsNoImages = diagnostics.filter(p => 
      p.issues.some(i => i.includes('sin imágenes'))
    );

    if (productsNoImages.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`🖼️  PRODUCTOS SIN IMÁGENES (${productsNoImages.length})`);
      console.log('═══════════════════════════════════════════════════════');
      console.log(`   Nota: Estos productos pueden estar esperando el proceso de ENRICH\n`);
      
      productsNoImages.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.id.substring(0, 12)}... - "${p.title}"`);
        const imageInfo = Array.isArray(p.images) 
          ? `Array[${p.images.length}]` 
          : p.images === null 
          ? 'null' 
          : typeof p.images;
        console.log(`      Images: ${imageInfo}`);
        console.log();
      });
      if (productsNoImages.length > 10) {
        console.log(`   ... y ${productsNoImages.length - 10} más\n`);
      }
    }

    // 6. Mostrar productos con múltiples problemas
    const productsMultipleIssues = diagnostics.filter(p => p.issues.length > 1);

    if (productsMultipleIssues.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log(`⚠️  PRODUCTOS CON MÚLTIPLES PROBLEMAS (${productsMultipleIssues.length})`);
      console.log('═══════════════════════════════════════════════════════');
      productsMultipleIssues.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.id.substring(0, 12)}... - "${p.title}"`);
        console.log(`      Problemas: ${p.issues.join(', ')}`);
        console.log();
      });
      if (productsMultipleIssues.length > 10) {
        console.log(`   ... y ${productsMultipleIssues.length - 10} más\n`);
      }
    }

    // 7. Resumen final
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total productos: ${stats.total}`);
    console.log(`✅ Válidos: ${stats.valid}`);
    console.log(`❌ Inválidos: ${stats.invalid}`);
    console.log();
    console.log('Problemas más comunes:');
    if (stats.noTitle + stats.invalidTitle > 0) {
      console.log(`   ⚠️  ${stats.noTitle + stats.invalidTitle} productos sin título válido`);
    }
    if (stats.noImages > 0) {
      console.log(`   ⚠️  ${stats.noImages} productos sin imágenes (pueden estar esperando ENRICH)`);
    }
    if (stats.inactive > 0) {
      console.log(`   ⚠️  ${stats.inactive} productos inactivos`);
    }
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error ejecutando diagnóstico:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Ejecutar
diagnoseInvalidProducts()
  .then(() => {
    console.log('✅ Diagnóstico completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

