import { Prisma } from '@prisma/client';
import { calculateTankuPriceFromVariant } from '../utils/price.utils';

/**
 * Prisma Middleware para calcular automáticamente tankuPrice
 * cuando se crea o actualiza un ProductVariant
 * 
 * Esto asegura que tankuPrice siempre esté calculado correctamente,
 * incluso si se actualiza manualmente price o suggestedPrice
 * 
 * Nota: Solo calcula si tiene todos los datos necesarios en el payload.
 * Si falta algún dato, el cálculo debe hacerse explícitamente en el código.
 */
export function createPriceMiddleware(prisma: any) {
  return async (
    params: any,
    next: (params: any) => Promise<any>
  ) => {
    // Solo procesar ProductVariant
    if (params.model === 'ProductVariant') {
      // Crear o actualizar
      if (params.action === 'create' || params.action === 'update') {
        const data = params.args.data as any;
        
        // Si se está actualizando price o suggestedPrice, recalcular tankuPrice
        if (data.price !== undefined || data.suggestedPrice !== undefined) {
          // Obtener los valores actuales o nuevos
          let price = data.price;
          let suggestedPrice = data.suggestedPrice;
          
          // Si es una actualización y no se proporcionan todos los valores,
          // necesitamos obtener los valores actuales de la BD
          if (params.action === 'update' && (price === undefined || suggestedPrice === undefined)) {
            const where = params.args.where;
            if (where) {
              try {
                const existing = await prisma.productVariant.findUnique({
                  where,
                  select: { price: true, suggestedPrice: true },
                });
                
                if (existing) {
                  price = price !== undefined ? price : existing.price;
                  suggestedPrice = suggestedPrice !== undefined ? suggestedPrice : existing.suggestedPrice;
                }
              } catch (error) {
                // Si falla, continuar con los valores proporcionados
                console.warn('[PRISMA MIDDLEWARE] Error obteniendo variante existente:', error);
              }
            }
          }
          
          // Calcular tankuPrice si tenemos al menos price
          // Solo calcular si tankuPrice no fue proporcionado explícitamente
          if (price !== undefined && data.tankuPrice === undefined) {
            data.tankuPrice = calculateTankuPriceFromVariant({
              suggestedPrice: suggestedPrice ?? null,
              price: price,
            });
          }
        }
      }
      
      // Para updateMany, también calcular tankuPrice si ambos valores están presentes
      if (params.action === 'updateMany') {
        const data = params.args.data as any;
        
        if (data.price !== undefined && data.suggestedPrice !== undefined && data.tankuPrice === undefined) {
          data.tankuPrice = calculateTankuPriceFromVariant({
            suggestedPrice: data.suggestedPrice,
            price: data.price,
          });
        }
      }
    }
    
    return next(params);
  };
}

