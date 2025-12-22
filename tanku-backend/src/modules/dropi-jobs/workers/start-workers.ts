/**
 * Script para iniciar todos los workers
 * Ejecutar: tsx src/modules/dropi-jobs/workers/start-workers.ts
 * 
 * Cada worker corre en su propio proceso o en el mismo proceso
 * según la configuración (por ahora, mismo proceso con diferentes loops)
 */

import { RawWorker } from './raw-worker';
import { NormalizeWorker } from './normalize-worker';
import { EnrichWorker } from './enrich-worker';
import { SyncProductWorker } from './sync-product-worker';
import { SyncStockWorker } from './sync-stock-worker';

// Control de concurrencia: 1 worker por tipo
const rawWorker = new RawWorker();
const normalizeWorker = new NormalizeWorker();
const enrichWorker = new EnrichWorker();
const syncProductWorker = new SyncProductWorker();
const syncStockWorker = new SyncStockWorker();

console.log('🚀 Iniciando todos los workers de Dropi...');
console.log('⚠️  Control de concurrencia: 1 worker por tipo');
console.log('⚠️  Usando locking en DB para evitar procesamiento duplicado');

// Iniciar todos los workers en paralelo
// Cada worker tiene su propio loop, así que pueden correr en el mismo proceso
Promise.all([
  rawWorker.start().catch((error) => {
    console.error('❌ [RAW WORKER] Error fatal:', error);
    process.exit(1);
  }),
  normalizeWorker.start().catch((error) => {
    console.error('❌ [NORMALIZE WORKER] Error fatal:', error);
    process.exit(1);
  }),
  enrichWorker.start().catch((error) => {
    console.error('❌ [ENRICH WORKER] Error fatal:', error);
    process.exit(1);
  }),
  syncProductWorker.start().catch((error) => {
    console.error('❌ [SYNC_PRODUCT WORKER] Error fatal:', error);
    process.exit(1);
  }),
  syncStockWorker.start().catch((error) => {
    console.error('❌ [SYNC_STOCK WORKER] Error fatal:', error);
    process.exit(1);
  }),
]).catch((error) => {
  console.error('❌ Error iniciando workers:', error);
  process.exit(1);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n⚠️  Recibida señal SIGINT, terminando workers...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Recibida señal SIGTERM, terminando workers...');
  process.exit(0);
});
