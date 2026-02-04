/**
 * Script para limpiar migraciones fallidas y verificar estado de la base de datos
 * Ejecutar: npx tsx scripts/clean-failed-migrations.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function cleanFailedMigrations() {
  try {
    console.log('🧹 Limpiando migraciones fallidas...\n');

    // 1. Verificar estado actual de migraciones
    const allMigrations = await prisma.$queryRawUnsafe<Array<{
      migration_name: string;
      finished_at: Date | null;
      applied_steps_count: number;
      started_at: Date | null;
    }>>(`
      SELECT migration_name, finished_at, applied_steps_count, started_at
      FROM "_prisma_migrations" 
      ORDER BY started_at DESC
    `);

    console.log('📋 Migraciones en la base de datos:');
    if (allMigrations.length === 0) {
      console.log('  ⚠️  No hay migraciones registradas');
    } else {
      allMigrations.forEach(m => {
        const status = m.finished_at ? '✅ Aplicada' : '❌ Fallida/Pendiente';
        console.log(`  ${status} - ${m.migration_name}`);
        if (m.started_at) {
          console.log(`      Iniciada: ${m.started_at}`);
        }
      });
    }

    // 2. Verificar qué tablas existen
    console.log('\n📊 Verificando tablas existentes...');
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    const tableNames = tables.map(t => t.tablename);
    console.log(`  Total de tablas: ${tableNames.length}`);
    
    const hasConversations = tableNames.includes('conversations');
    const hasMessages = tableNames.includes('messages');
    const hasParticipants = tableNames.includes('conversation_participants');
    
    console.log(`  conversations: ${hasConversations ? '✅' : '❌'}`);
    console.log(`  messages: ${hasMessages ? '✅' : '❌'}`);
    console.log(`  conversation_participants: ${hasParticipants ? '✅' : '❌'}`);

    // 3. Eliminar migración fallida
    console.log('\n🗑️  Eliminando registro de migración fallida...');
    const deleteResult = await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20260204140810_add_conversations'
        AND finished_at IS NULL
    `);
    console.log(`  ✅ Eliminado ${deleteResult} registro(s)`);

    // 4. Si el baseline no existe, marcarlo como aplicado
    const baseline = allMigrations.find(m => m.migration_name === '20260204_baseline');
    if (!baseline) {
      console.log('\n📝 Marcando baseline como aplicado...');
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (
          migration_name,
          checksum,
          finished_at,
          started_at,
          applied_steps_count
        ) VALUES (
          '20260204_baseline',
          '',
          NOW(),
          NOW(),
          1
        )
      `);
      console.log('  ✅ Baseline marcado como aplicado');
    } else {
      console.log('\n✅ Baseline ya existe');
    }

    // 5. Estado final
    console.log('\n📋 Estado final de migraciones:');
    const finalMigrations = await prisma.$queryRawUnsafe<Array<{
      migration_name: string;
      finished_at: Date | null;
    }>>(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC
    `);

    finalMigrations.forEach(m => {
      const status = m.finished_at ? '✅' : '❌';
      console.log(`  ${status} ${m.migration_name}`);
    });

    console.log('\n✅ Limpieza completada');
    console.log('💡 Ahora puedes hacer git push y Railway aplicará la migración corregida');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

cleanFailedMigrations();

