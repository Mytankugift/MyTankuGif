/**
 * Script de prueba para el sistema de jobs de Dropi
 * 
 * Uso:
 *   tsx src/modules/dropi-jobs/test-jobs.ts
 * 
 * Este script:
 * 1. Verifica la conexión a la base de datos
 * 2. Verifica la configuración del proxy (si está configurado)
 * 3. Crea un job RAW de prueba
 * 4. Monitorea el estado del job
 */

import { prisma } from '../../config/database';
import { DropiJobsService } from './dropi-jobs.service';
import { DropiJobType, DropiJobStatus } from '@prisma/client';
import { env } from '../../config/env';
import { DropiService } from '../dropi/dropi.service';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function testDatabaseConnection() {
  console.log('\n📊 [TEST] Verificando conexión a la base de datos...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ [TEST] Conexión a base de datos OK');
    return true;
  } catch (error: any) {
    console.error('❌ [TEST] Error conectando a la base de datos:', error.message);
    return false;
  }
}

async function testProxyConfiguration() {
  console.log('\n🔗 [TEST] Verificando configuración del proxy...');
  
  if (!env.DROPI_PROXY_URL) {
    console.log('⚠️  [TEST] DROPI_PROXY_URL no está configurado, usando DROPI_BASE_URL directamente');
    console.log(`   DROPI_BASE_URL: ${env.DROPI_BASE_URL}`);
    return true;
  }

  console.log(`✅ [TEST] Proxy configurado: ${env.DROPI_PROXY_URL}`);
  console.log(`   Proxy Key: ${env.DROPI_PROXY_KEY ? '✅ Configurado' : '❌ No configurado'}`);
  
  // Probar conexión al proxy con una llamada simple
  try {
    const dropiService = new DropiService();
    console.log('\n🔍 [TEST] Probando conexión al proxy con /integrations/categories...');
    
    const result = await dropiService.getCategories();
    
    if (result.isSuccess) {
      console.log(`✅ [TEST] Proxy funciona correctamente`);
      console.log(`   Categorías obtenidas: ${result.objects?.length || 0}`);
      return true;
    } else {
      console.error(`❌ [TEST] Proxy respondió con error: ${result.message}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ [TEST] Error probando proxy: ${error.message}`);
    return false;
  }
}

async function testJobCreation() {
  console.log('\n📦 [TEST] Probando creación de job...');
  
  try {
    const jobsService = new DropiJobsService();
    const job = await jobsService.createJob(DropiJobType.RAW);
    
    console.log(`✅ [TEST] Job creado exitosamente`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Type: ${job.type}`);
    console.log(`   Status: ${job.status}`);
    
    return job.id;
  } catch (error: any) {
    console.error(`❌ [TEST] Error creando job: ${error.message}`);
    return null;
  }
}

async function monitorJob(jobId: string, maxWaitSeconds: number = 60) {
  console.log(`\n👀 [TEST] Monitoreando job ${jobId} (máximo ${maxWaitSeconds}s)...`);
  
  const jobsService = new DropiJobsService();
  const startTime = Date.now();
  const maxWait = maxWaitSeconds * 1000;
  
  while (Date.now() - startTime < maxWait) {
    const job = await jobsService.getJob(jobId);
    
    if (!job) {
      console.error(`❌ [TEST] Job ${jobId} no encontrado`);
      return;
    }
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[${elapsed}s] Job ${jobId}: ${job.status} - Progress: ${job.progress}% - Attempts: ${job.attempts}`);
    
    if (job.status === DropiJobStatus.DONE) {
      console.log(`\n✅ [TEST] Job completado exitosamente en ${elapsed}s`);
      return;
    }
    
    if (job.status === DropiJobStatus.FAILED) {
      console.error(`\n❌ [TEST] Job falló después de ${elapsed}s`);
      console.error(`   Error: ${job.error}`);
      return;
    }
    
    // Esperar 2 segundos antes de la siguiente verificación
    await sleep(2000);
  }
  
  console.log(`\n⏱️  [TEST] Tiempo máximo alcanzado (${maxWaitSeconds}s)`);
  const finalJob = await jobsService.getJob(jobId);
  if (finalJob) {
    console.log(`   Estado final: ${finalJob.status} - Progress: ${finalJob.progress}%`);
  }
}

async function listPendingJobs() {
  console.log('\n📋 [TEST] Listando jobs pendientes...');
  
  try {
    const jobs = await prisma.dropiJob.findMany({
      where: {
        status: {
          in: [DropiJobStatus.PENDING, DropiJobStatus.RUNNING],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    if (jobs.length === 0) {
      console.log('   No hay jobs pendientes');
    } else {
      console.log(`   ${jobs.length} jobs encontrados:`);
      jobs.forEach((job) => {
        console.log(`   - ${job.id.substring(0, 8)}... | ${job.type} | ${job.status} | Progress: ${job.progress}%`);
      });
    }
  } catch (error: any) {
    console.error(`❌ [TEST] Error listando jobs: ${error.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 PRUEBA DEL SISTEMA DE JOBS DE DROPI');
  console.log('═══════════════════════════════════════════════════════');
  
  // 1. Verificar base de datos
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.error('\n❌ La prueba no puede continuar sin conexión a la base de datos');
    process.exit(1);
  }
  
  // 2. Verificar configuración del proxy
  const proxyOk = await testProxyConfiguration();
  if (!proxyOk) {
    console.warn('\n⚠️  El proxy no funciona correctamente, pero continuamos con la prueba...');
  }
  
  // 3. Listar jobs pendientes
  await listPendingJobs();
  
  // 4. Crear job de prueba
  const jobId = await testJobCreation();
  if (!jobId) {
    console.error('\n❌ No se pudo crear el job de prueba');
    process.exit(1);
  }
  
  // 5. Monitorear job (solo si los workers están corriendo)
  console.log('\n⚠️  IMPORTANTE: Los workers deben estar corriendo para procesar el job');
  console.log('   Ejecuta: tsx src/modules/dropi-jobs/workers/start-workers.ts');
  console.log('\n   Monitoreando job por 30 segundos (puedes cancelar con Ctrl+C)...');
  
  try {
    await monitorJob(jobId, 30);
  } catch (error: any) {
    if (error.message.includes('SIGINT')) {
      console.log('\n⚠️  Monitoreo cancelado por el usuario');
    } else {
      console.error(`\n❌ Error monitoreando job: ${error.message}`);
    }
  }
  
  // 6. Estado final
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE LA PRUEBA');
  console.log('═══════════════════════════════════════════════════════');
  await listPendingJobs();
  
  console.log('\n💡 Para ver el estado completo del job:');
  console.log(`   curl http://localhost:9000/api/v1/dropi/jobs/${jobId}`);
  
  // Cerrar conexión
  await prisma.$disconnect();
  console.log('\n✅ Prueba completada');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('\n❌ Error fatal en la prueba:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { main as testJobs };
