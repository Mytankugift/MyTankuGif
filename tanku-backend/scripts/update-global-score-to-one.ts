/**
 * Script para actualizar productos con globalScore 0 a 1
 * 
 * Esto asegura que todos los productos aparezcan en el feed,
 * ya que el ordenamiento es por globalScore DESC
 * 
 * Uso:
 *   npm run update:global-score-to-one
 * 
 * O con DATABASE_URL específico:
 *   DATABASE_URL="..." npm run update:global-score-to-one
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
  console.error('   2. Usar variable de entorno: DATABASE_URL="..." npm run update:global-score-to-one');
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

async function updateGlobalScoreToOne() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 ACTUALIZANDO GLOBALSCORE DE 0 A 1');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Contar productos con globalScore 0
    console.log('📋 Contando productos con globalScore = 0...');
    const countResult = await (prisma as any).globalRanking.count({
      where: {
        itemType: 'product',
        globalScore: 0,
      },
    });

    console.log(`📊 Productos con globalScore = 0: ${countResult}\n`);

    if (countResult === 0) {
      console.log('✅ No hay productos con globalScore = 0 para actualizar');
      return;
    }

    // 2. Confirmar antes de actualizar
    console.log(`⚠️  Se actualizarán ${countResult} productos de globalScore 0 a 1`);
    console.log('   Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 3. Actualizar productos
    console.log(`🔄 Actualizando productos...\n`);
    
    const updateResult = await (prisma as any).globalRanking.updateMany({
      where: {
        itemType: 'product',
        globalScore: 0,
      },
      data: {
        globalScore: 1,
      },
    });

    console.log(`✅ ${updateResult.count} productos actualizados de globalScore 0 a 1\n`);

    // 4. Verificar resultado
    const remainingZero = await (prisma as any).globalRanking.count({
      where: {
        itemType: 'product',
        globalScore: 0,
      },
    });

    const totalWithOne = await (prisma as any).globalRanking.count({
      where: {
        itemType: 'product',
        globalScore: 1,
      },
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Productos actualizados: ${updateResult.count}`);
    console.log(`📊 Productos con globalScore = 1: ${totalWithOne}`);
    console.log(`📊 Productos con globalScore = 0 (restantes): ${remainingZero}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error ejecutando actualización:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Ejecutar
updateGlobalScoreToOne()
  .then(() => {
    console.log('✅ Actualización completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

