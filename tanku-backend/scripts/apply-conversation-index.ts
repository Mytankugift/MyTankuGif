/**
 * Script para aplicar el índice conversations_updated_at_idx
 * Ejecutar: npx tsx scripts/apply-conversation-index.ts
 */

import { prisma } from '../src/config/database'

async function applyIndex() {
  try {
    console.log('🔄 Aplicando índice conversations_updated_at_idx...')
    
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "conversations_updated_at_idx" 
      ON "conversations"("updated_at")
    `
    
    console.log('✅ Índice aplicado exitosamente')
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✅ El índice ya existe')
    } else {
      console.error('❌ Error:', error)
      process.exit(1)
    }
  } finally {
    await prisma.$disconnect()
    process.exit(0) // ✅ Cerrar el proceso después de desconectar
  }
}

applyIndex()

