/**
 * Script de migración para calcular tankuPrice en productos existentes
 * 
 * Ejecutar con: npx ts-node src/scripts/migrate-tanku-price.ts
 */

import { prisma } from '../config/database';
import { calculateTankuPriceFromVariant } from '../shared/utils/price.utils';

async function migrateTankuPrice() {
  console.log('🔄 Iniciando migración de tankuPrice...');
  
  try {
    // Obtener todas las variantes que no tienen tankuPrice
    const variants = await prisma.productVariant.findMany({
      where: {
        OR: [
          { tankuPrice: null },
          { tankuPrice: 0 },
        ],
      },
      select: {
        id: true,
        price: true,
        suggestedPrice: true,
        sku: true,
      },
    });
    
    console.log(`📦 Encontradas ${variants.length} variantes sin tankuPrice`);
    
    let updated = 0;
    let errors = 0;
    
    for (const variant of variants) {
      try {
        const tankuPrice = calculateTankuPriceFromVariant({
          suggestedPrice: variant.suggestedPrice,
          price: variant.price,
        });
        
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { tankuPrice },
        });
        
        updated++;
        
        if (updated % 100 === 0) {
          console.log(`✅ Procesadas ${updated}/${variants.length} variantes...`);
        }
      } catch (error: any) {
        console.error(`❌ Error actualizando variante ${variant.sku}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Migración completada:`);
    console.log(`   - Variantes actualizadas: ${updated}`);
    console.log(`   - Errores: ${errors}`);
    console.log(`   - Total procesadas: ${variants.length}`);
    
  } catch (error: any) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateTankuPrice()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

