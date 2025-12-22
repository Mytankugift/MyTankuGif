import { prisma } from '../../config/database';
import { DropiService } from '../dropi/dropi.service';

interface DropiCategory {
  id: number;
  name: string;
  parent_category: number;
}

export class CategoriesSyncService {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * Generar handle (slug) desde el nombre de la categoría
   */
  private generateHandle(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/(^-|-$)/g, '') // Remover guiones al inicio y final
      .substring(0, 100); // Limitar longitud
  }

  /**
   * Sincronizar categorías desde Dropi a nuestra base de datos
   */
  async syncCategoriesFromDropi(): Promise<{
    success: boolean;
    source: 'dropi_api' | 'seed';
    total: number;
    processed: number;
    errors: number;
    categories: Array<{
      id: string;
      name: string;
      handle: string;
      status: 'created' | 'updated';
    }>;
    errorDetails: Array<{
      dropi_id: number;
      name: string;
      error: string;
    }>;
  }> {
    console.log('🔄 [CATEGORIES SYNC] Iniciando sincronización de categorías desde Dropi...');

    // Categorías seed como fallback
    const SEED_DROPI_CATEGORIES: DropiCategory[] = [
      { id: 1247, name: 'Bisutería', parent_category: 0 },
      { id: 1248, name: 'Ropa Deportiva', parent_category: 0 },
      { id: 1252, name: 'Vaporizadores', parent_category: 0 },
    ];

    let categories: DropiCategory[] = [];
    let source: 'dropi_api' | 'seed' = 'seed';

    // Intentar obtener categorías de Dropi API
    try {
      const response = await this.dropiService.getCategories();
      console.log('[CATEGORIES SYNC] Respuesta de Dropi:', {
        isSuccess: response?.isSuccess,
        hasObjects: Array.isArray(response?.objects),
        count: response?.objects?.length || 0,
      });

      if (response?.isSuccess && Array.isArray(response.objects) && response.objects.length > 0) {
        categories = response.objects;
        source = 'dropi_api';
        console.log(`✅ [CATEGORIES SYNC] Obtenidas ${categories.length} categorías desde Dropi API`);
      } else {
        console.warn('⚠️ [CATEGORIES SYNC] Dropi API no retornó categorías válidas, usando seed');
        categories = SEED_DROPI_CATEGORIES;
      }
    } catch (error: any) {
      console.error('❌ [CATEGORIES SYNC] Error al obtener categorías de Dropi API:', error?.message);
      console.warn('⚠️ [CATEGORIES SYNC] Usando categorías seed como fallback');
      categories = SEED_DROPI_CATEGORIES;
    }

    const processed: Array<{
      id: string;
      name: string;
      handle: string;
      status: 'created' | 'updated';
    }> = [];
    const errors: Array<{
      dropi_id: number;
      name: string;
      error: string;
    }> = [];

    // Mapa para almacenar dropi_id -> category_id
    const dropiIdToCategoryId = new Map<number, string>();

    // Separar categorías raíz e hijas
    const rootCategories = categories.filter((cat) => !cat.parent_category || cat.parent_category === 0);
    const childCategories = categories.filter((cat) => cat.parent_category && cat.parent_category !== 0);

    // Procesar categorías raíz primero
    for (const cat of rootCategories) {
      try {
        const handle = this.generateHandle(cat.name);

        // Verificar si la categoría ya existe (por handle)
        const existingCategory = await prisma.category.findUnique({
          where: { handle },
        });

        let category;
        if (existingCategory) {
          // Actualizar categoría existente
          const updateData: any = {
            name: cat.name,
            parentId: null, // Asegurar que es raíz
            dropiId: cat.id, // Guardar dropiId
          };
          category = await prisma.category.update({
            where: { id: existingCategory.id },
            data: updateData,
          });
          processed.push({
            id: category.id,
            name: category.name,
            handle: category.handle,
            status: 'updated',
          });
          const categoryWithDropiId = category as any;
          console.log(`  ✅ Categoría raíz actualizada: ${category.name} (${category.handle}, dropiId: ${categoryWithDropiId.dropiId})`);
        } else {
          // Crear nueva categoría
          const createData: any = {
            name: cat.name,
            handle,
            parentId: null, // Categoría raíz
            dropiId: cat.id, // Guardar dropiId
          };
          category = await prisma.category.create({
            data: createData,
          });
          processed.push({
            id: category.id,
            name: category.name,
            handle: category.handle,
            status: 'created',
          });
          const categoryWithDropiId = category as any;
          console.log(`  ✅ Categoría raíz creada: ${category.name} (${category.handle}, dropiId: ${categoryWithDropiId.dropiId})`);
        }

        // Guardar en el mapa
        dropiIdToCategoryId.set(cat.id, category.id);
      } catch (error: any) {
        console.error(`  ❌ Error procesando categoría raíz ${cat.id} (${cat.name}):`, error);
        errors.push({
          dropi_id: cat.id,
          name: cat.name,
          error: error?.message || 'Error desconocido',
        });
      }
    }

    // Procesar categorías hijas en múltiples pasadas hasta que todas estén procesadas
    let remainingCategories = [...childCategories];
    let maxIterations = 10; // Prevenir loops infinitos
    let iteration = 0;

    while (remainingCategories.length > 0 && iteration < maxIterations) {
      iteration++;
      const processedThisIteration: DropiCategory[] = [];

      for (const cat of remainingCategories) {
        try {
          const parentDropiId = cat.parent_category;
          
          // Verificar si el padre ya está en el mapa
          if (!dropiIdToCategoryId.has(parentDropiId)) {
            // El padre aún no está procesado, saltar esta categoría por ahora
            continue;
          }

          const handle = this.generateHandle(cat.name);
          const parentCategoryId = dropiIdToCategoryId.get(parentDropiId)!;

          // Verificar si la categoría ya existe
          const existingCategory = await prisma.category.findUnique({
            where: { handle },
          });

          let category;
          if (existingCategory) {
            // Actualizar categoría existente
            const updateData: any = {
              name: cat.name,
              parentId: parentCategoryId,
              dropiId: cat.id, // Guardar dropiId
            };
            category = await prisma.category.update({
              where: { id: existingCategory.id },
              data: updateData,
            });
            processed.push({
              id: category.id,
              name: category.name,
              handle: category.handle,
              status: 'updated',
            });
            const categoryWithDropiId = category as any;
            console.log(`  ✅ Categoría hija actualizada: ${category.name} (padre: ${parentCategoryId}, dropiId: ${categoryWithDropiId.dropiId})`);
          } else {
            // Crear nueva categoría hija
            const createData: any = {
              name: cat.name,
              handle,
              parentId: parentCategoryId,
              dropiId: cat.id, // Guardar dropiId
            };
            category = await prisma.category.create({
              data: createData,
            });
            processed.push({
              id: category.id,
              name: category.name,
              handle: category.handle,
              status: 'created',
            });
            const categoryWithDropiId = category as any;
            console.log(`  ✅ Categoría hija creada: ${category.name} (padre: ${parentCategoryId}, dropiId: ${categoryWithDropiId.dropiId})`);
          }

          // Guardar en el mapa para que otras categorías hijas puedan usarla como padre
          dropiIdToCategoryId.set(cat.id, category.id);
          processedThisIteration.push(cat);
        } catch (error: any) {
          console.error(`  ❌ Error procesando categoría hija ${cat.id} (${cat.name}):`, error);
          errors.push({
            dropi_id: cat.id,
            name: cat.name,
            error: error?.message || 'Error desconocido',
          });
          // Marcar como procesada para no intentar de nuevo
          processedThisIteration.push(cat);
        }
      }

      // Remover las categorías procesadas de la lista
      remainingCategories = remainingCategories.filter(
        (cat) => !processedThisIteration.some((p) => p.id === cat.id)
      );
    }

    // Si quedan categorías sin procesar, reportarlas como errores
    if (remainingCategories.length > 0) {
      console.warn(`⚠️ [CATEGORIES SYNC] ${remainingCategories.length} categorías no pudieron ser procesadas (padres faltantes o loops)`);
      for (const cat of remainingCategories) {
        errors.push({
          dropi_id: cat.id,
          name: cat.name,
          error: 'No se pudo procesar: padre no encontrado o loop en jerarquía',
        });
      }
    }

    console.log(`✅ [CATEGORIES SYNC] Sincronización completada: ${processed.length} procesadas, ${errors.length} errores`);

    return {
      success: true,
      source,
      total: categories.length,
      processed: processed.length,
      errors: errors.length,
      categories: processed,
      errorDetails: errors.slice(0, 10), // Solo primeros 10 errores
    };
  }
}
