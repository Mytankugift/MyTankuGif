import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

// Cargar variables de entorno
dotenv.config();

const REMOTE_DB_URL = process.env.DATABASE_URL2 || process.env.DATABASE_URL;

if (!REMOTE_DB_URL) {
  console.error('❌ DATABASE_URL2 o DATABASE_URL no está configurado en .env');
  process.exit(1);
}

const remotePrisma = new PrismaClient({
  datasources: {
    db: {
      url: REMOTE_DB_URL,
    },
  },
});

async function checkMigrations() {
  console.log('🔍 Verificando estado de migraciones en Railway...\n');

  try {
    await remotePrisma.$connect();
    console.log('✅ Conexión establecida con Railway\n');

    // Verificar qué columnas existen en dropi_products
    const columns = await remotePrisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT DISTINCT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dropi_products' 
      AND table_schema = 'public'
      ORDER BY column_name
    `;

    console.log('📋 Columnas existentes en dropi_products:');
    const uniqueColumns = [...new Set(columns.map(c => c.column_name))];
    uniqueColumns.forEach(col => console.log(`   - ${col}`));

    const expectedColumns = [
      'main_image_s3_path',
      'category_dropi_ids',
      'last_synced_at',
      'last_price_stock_sync_at',
      'description_synced_at',
      'suggested_price'
    ];

    const columnNames = uniqueColumns;
    const missingColumns = expectedColumns.filter(
      col => !columnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      console.log('\n⚠️  Columnas faltantes:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n💡 Ejecuta las migraciones pendientes:');
      console.log('   npm run prisma:migrate:deploy');
      console.log('\n   O manualmente ejecuta:');
      console.log('   npx prisma migrate deploy --schema prisma/schema.prisma');
    } else {
      console.log('\n✅ Todas las columnas esperadas existen en la base de datos');
    }

    // Verificar tabla _prisma_migrations
    try {
      const migrations = await remotePrisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY started_at
      `;

      console.log('\n📦 Migraciones aplicadas en Railway:');
      migrations.forEach(m => {
        const status = m.finished_at ? '✅' : '⏳';
        console.log(`   ${status} ${m.migration_name}`);
      });

      // Listar todas las migraciones locales
      const fs = require('fs');
      const path = require('path');
      const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
      const localMigrations = fs.readdirSync(migrationsDir)
        .filter((dir: string) => {
          const dirPath = path.join(migrationsDir, dir);
          return fs.statSync(dirPath).isDirectory() && dir !== 'node_modules';
        })
        .sort();

      const appliedMigrationNames = migrations.map(m => m.migration_name);
      const missingMigrations = localMigrations.filter(
        (m: string) => !appliedMigrationNames.includes(m)
      );

      if (missingMigrations.length > 0) {
        console.log('\n⚠️  Migraciones locales que NO están aplicadas en Railway:');
        missingMigrations.forEach(m => console.log(`   ❌ ${m}`));
        console.log('\n💡 Para aplicar las migraciones faltantes, ejecuta:');
        console.log('   npm run prisma:migrate:deploy');
        console.log('\n   O asegúrate de que DATABASE_URL apunte a Railway y ejecuta:');
        console.log('   npx prisma migrate deploy --schema prisma/schema.prisma');
      }

      const pendingMigrations = migrations.filter(m => !m.finished_at);
      if (pendingMigrations.length > 0) {
        console.log('\n⚠️  Hay migraciones iniciadas pero no finalizadas:');
        pendingMigrations.forEach(m => console.log(`   ⏳ ${m.migration_name}`));
      }
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        console.log('\n⚠️  La tabla _prisma_migrations no existe. Ejecuta:');
        console.log('   npm run prisma:migrate:deploy');
      } else {
        throw error;
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await remotePrisma.$disconnect();
  }
}

checkMigrations();

