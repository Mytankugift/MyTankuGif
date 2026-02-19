/**
 * Script para crear el primer usuario admin (SUPER_ADMIN)
 * 
 * Uso:
 *   tsx scripts/create-admin-user.ts
 *   tsx scripts/create-admin-user.ts --email admin@tanku.com --password miPassword123
 * 
 * Variables de entorno:
 *   ADMIN_EMAIL=admin@tanku.com
 *   ADMIN_PASSWORD=miPassword123
 */

import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import bcrypt from 'bcrypt';
import { AdminRole } from '@prisma/client';

async function createAdminUser() {
  try {
    console.log('🔐 Creando usuario admin...\n');

    // Verificar si ya existe un admin
    const existingAdmin = await prisma.adminUser.findFirst();
    if (existingAdmin) {
      console.log('⚠️  Ya existe al menos un usuario admin en la base de datos.');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Rol: ${existingAdmin.role}`);
      console.log('\n💡 Si deseas crear otro admin, usa el módulo admin-users (cuando esté implementado).');
      process.exit(0);
    }

    // Obtener email y password
    const args = process.argv.slice(2);
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;

    // Parsear argumentos de línea de comandos
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      } else if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
      }
    }

    // Validar que se proporcionó email y password
    if (!email || !password) {
      console.error('❌ Error: Email y password son requeridos');
      console.log('\n📝 Uso:');
      console.log('   tsx scripts/create-admin-user.ts --email admin@tanku.com --password miPassword123');
      console.log('\n   O usando variables de entorno:');
      console.log('   ADMIN_EMAIL=admin@tanku.com ADMIN_PASSWORD=miPassword123 tsx scripts/create-admin-user.ts');
      process.exit(1);
    }

    // Validar formato de email básico
    if (!email.includes('@')) {
      console.error('❌ Error: Email inválido');
      process.exit(1);
    }

    // Validar que la contraseña tenga al menos 8 caracteres
    if (password.length < 8) {
      console.error('❌ Error: La contraseña debe tener al menos 8 caracteres');
      process.exit(1);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // Crear admin user
    const adminUser = await prisma.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        role: AdminRole.SUPER_ADMIN,
        active: true,
      },
    });

    console.log('✅ Usuario admin creado exitosamente!\n');
    console.log('📋 Detalles:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Rol: ${adminUser.role}`);
    console.log(`   Activo: ${adminUser.active ? 'Sí' : 'No'}`);
    console.log('\n🔑 Ahora puedes usar este usuario para iniciar sesión en:');
    console.log(`   POST ${env.API_PREFIX}/admin/auth/login`);
    console.log('\n⚠️  IMPORTANTE: Guarda estas credenciales de forma segura.');

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Error: Ya existe un usuario admin con ese email');
    } else {
      console.error('❌ Error creando usuario admin:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createAdminUser();

