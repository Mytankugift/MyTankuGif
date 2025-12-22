import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

export class DropiCategoriesService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * Sincronizar categorías desde Dropi a la tabla Category
   * Crea o actualiza categorías con el dropiId correspondiente
   * 
   * @returns Estadísticas de sincronización
   */
  async syncCategories(): Promise<{
    success: boolean;
    message: string;
    created: number;
    updated: number;
    errors: number;
    error_details: Array<{ dropi_id: number; error: string }>;
  }> {
    console.log(`\n🔄 [DROPI CATEGORIES] Sincronizando categorías desde Dropi...`);

    try {
      // Obtener categorías desde Dropi
      const response = await this.dropiService.getCategories();

      if (!response.isSuccess || !response.objects) {
        throw new Error(`Error obteniendo categorías de Dropi: ${response.message || 'Unknown error'}`);
      }

      const categories = response.objects;
      console.log(`[DROPI CATEGORIES] Categorías obtenidas desde Dropi: ${categories.length}`);

      let created = 0;
      let updated = 0;
      const errors: Array<{ dropi_id: number; error: string }> = [];

      for (const dropiCategory of categories) {
        try {
          // Generar handle desde el nombre
          const handle = dropiCategory.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

          // Buscar si ya existe una categoría con este dropiId
          let existingByDropiId = null;
          try {
            existingByDropiId = await prisma.category.findUnique({
              where: { dropiId: dropiCategory.id },
            });
          } catch (error: any) {
            // Si falla, puede ser que el cliente de Prisma no esté actualizado
            console.warn(`[DROPI CATEGORIES] ⚠️ Error buscando por dropiId (puede ser que Prisma no esté actualizado):`, error?.message);
            // Intentar buscar por otro método
            existingByDropiId = await prisma.category.findFirst({
              where: {
                dropiId: dropiCategory.id,
              },
            });
          }

          // Buscar si ya existe una categoría con este handle (por si acaso)
          const existingByHandle = await prisma.category.findUnique({
            where: { handle },
          });

          console.log(`[DROPI CATEGORIES] 📋 Procesando categoría: ${dropiCategory.name} (dropiId: ${dropiCategory.id})`);
          console.log(`[DROPI CATEGORIES] 📋 Handle generado: ${handle}`);
          console.log(`[DROPI CATEGORIES] 📋 existingByDropiId:`, existingByDropiId ? existingByDropiId.id : 'null');
          console.log(`[DROPI CATEGORIES] 📋 existingByHandle:`, existingByHandle ? { id: existingByHandle.id, dropiId: existingByHandle.dropiId } : 'null');

          if (existingByDropiId) {
            // Actualizar categoría existente por dropiId
            console.log(`[DROPI CATEGORIES] 🔄 Actualizando categoría existente por dropiId...`);
            try {
              const updatedCategory = await prisma.category.update({
                where: { id: existingByDropiId.id },
                data: {
                  name: dropiCategory.name,
                  handle: handle,
                  dropiId: dropiCategory.id,
                },
              });
              updated++;
              console.log(`[DROPI CATEGORIES] ✅ Categoría actualizada: ${dropiCategory.name} (dropiId: ${updatedCategory.dropiId}, id: ${updatedCategory.id})`);
            } catch (updateError: any) {
              console.error(`[DROPI CATEGORIES] ❌ Error actualizando por dropiId:`, updateError?.message);
              throw updateError;
            }
          } else if (existingByHandle) {
            // Si existe por handle, actualizarlo (siempre actualizar dropiId)
            console.log(`[DROPI CATEGORIES] 🔄 Actualizando categoría existente por handle...`);
            console.log(`[DROPI CATEGORIES] 📋 Categoría existente tiene dropiId: ${existingByHandle.dropiId || 'null'}`);
            try {
              const updatedCategory = await prisma.category.update({
                where: { id: existingByHandle.id },
                data: {
                  name: dropiCategory.name,
                  dropiId: dropiCategory.id, // Siempre actualizar dropiId
                },
              });
              updated++;
              console.log(`[DROPI CATEGORIES] ✅ Categoría actualizada con dropiId: ${dropiCategory.name} (dropiId: ${updatedCategory.dropiId}, id: ${updatedCategory.id})`);
              
              // Verificar que se guardó correctamente
              const verifyCategory = await prisma.category.findUnique({
                where: { id: updatedCategory.id },
              });
              console.log(`[DROPI CATEGORIES] 🔍 Verificación post-actualización:`, {
                id: verifyCategory?.id,
                dropiId: verifyCategory?.dropiId,
                name: verifyCategory?.name,
              });
            } catch (updateError: any) {
              console.error(`[DROPI CATEGORIES] ❌ Error actualizando por handle:`, updateError?.message);
              console.error(`[DROPI CATEGORIES] ❌ Stack:`, updateError?.stack);
              throw updateError;
            }
          } else {
            // Crear nueva categoría
            console.log(`[DROPI CATEGORIES] ➕ Creando nueva categoría...`);
            // Si tiene parent_category, buscar la categoría padre por dropiId
            let parentId: string | null = null;
            if (dropiCategory.parent_category && dropiCategory.parent_category !== 0) {
              const parentCategory = await prisma.category.findUnique({
                where: { dropiId: dropiCategory.parent_category },
              });
              if (parentCategory) {
                parentId = parentCategory.id;
                console.log(`[DROPI CATEGORIES] 📋 Categoría padre encontrada: ${parentCategory.id}`);
              } else {
                console.warn(`[DROPI CATEGORIES] ⚠️ Categoría padre no encontrada para dropiId: ${dropiCategory.parent_category}`);
              }
            }

            const createdCategory = await prisma.category.create({
              data: {
                name: dropiCategory.name,
                handle: handle,
                dropiId: dropiCategory.id,
                parentId: parentId,
              },
            });
            created++;
            console.log(`[DROPI CATEGORIES] ✅ Categoría creada: ${dropiCategory.name} (dropiId: ${createdCategory.dropiId}, id: ${createdCategory.id})`);
            
            // Verificar que se guardó correctamente
            const verifyCategory = await prisma.category.findUnique({
              where: { id: createdCategory.id },
            });
            console.log(`[DROPI CATEGORIES] 🔍 Verificación post-creación:`, {
              id: verifyCategory?.id,
              dropiId: verifyCategory?.dropiId,
              name: verifyCategory?.name,
            });
          }
        } catch (error: any) {
          console.error(`[DROPI CATEGORIES] ❌ Error procesando categoría ${dropiCategory.id}:`, error?.message);
          errors.push({
            dropi_id: dropiCategory.id,
            error: error?.message || 'Error desconocido',
          });
        }
      }

      console.log(`✅ [DROPI CATEGORIES] Sincronización completada: ${created} creadas, ${updated} actualizadas, ${errors.length} errores`);

      return {
        success: true,
        message: 'Categorías sincronizadas',
        created,
        updated,
        errors: errors.length,
        error_details: errors.slice(0, 10), // Solo primeros 10 errores
      };
    } catch (error: any) {
      console.error(`❌ [DROPI CATEGORIES] Error fatal:`, error);
      throw error;
    }
  }
}
