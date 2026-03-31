import { prisma } from '../../config/database';
import { CategoryDTO } from '../../shared/dto/products.dto';
import type { Category } from '@prisma/client';
import { getAdultRestrictedCategoryIds, getBlockedCategoryIds } from '../../shared/utils/category.utils';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string; // handle
  display_order?: number | null;
  parent_category_id?: string | null;
}

export class CategoriesService {
  /**
   * Mapper: Category de Prisma a CategoryDTO
   */
  private mapCategoryToDTO(category: Category): CategoryDTO {
    return {
      id: category.id,
      name: category.name,
      handle: category.handle,
      parentId: category.parentId,
      imageUrl: category.imageUrl,
    };
  }

  /**
   * Listar todas las categorías normalizadas (NUEVO)
   * Filtra categorías bloqueadas (recursivo: si un padre está bloqueado, sus hijos también se ocultan)
   * @param hideAdultRestricted Si true, excluye categorías +18 y subárboles (visitantes y menores)
   */
  async listCategoriesNormalized(hideAdultRestricted = false): Promise<CategoryDTO[]> {
    const blockedCategoryIds = await getBlockedCategoryIds();
    const adultRestrictedIds = hideAdultRestricted ? await getAdultRestrictedCategoryIds() : [];
    const excludedIds = [...new Set([...blockedCategoryIds, ...adultRestrictedIds])];

    const categories = await prisma.category.findMany({
      where: {
        ...(excludedIds.length > 0 && {
          id: {
            notIn: excludedIds,
          },
        }),
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' },
      ],
    });

    const filteredCategories = categories.filter((category) => {
      if (category.parentId) {
        if (blockedCategoryIds.includes(category.parentId)) return false;
        if (adultRestrictedIds.includes(category.parentId)) return false;
      }
      return true;
    });

    return filteredCategories.map((c) => this.mapCategoryToDTO(c));
  }

  /**
   * Listar todas las categorías activas (LEGACY - Mantener para compatibilidad)
   * Incluye relaciones padre/hijo para estructura jerárquica
   * Filtra categorías bloqueadas (recursivo)
   */
  async listCategories(): Promise<CategoryResponse[]> {
    console.log(`📂 [CATEGORIES SERVICE] Ejecutando query para obtener categorías...`);
    
    // Obtener IDs de categorías bloqueadas
    const blockedCategoryIds = await getBlockedCategoryIds();
    
    // Primero verificar si hay categorías en la BD
    const totalCategories = await prisma.category.count();
    console.log(`📂 [CATEGORIES SERVICE] Total de categorías en BD: ${totalCategories}`);
    console.log(`📂 [CATEGORIES SERVICE] Categorías bloqueadas: ${blockedCategoryIds.length}`);
    
    const categories = await prisma.category.findMany({
      where: {
        // Excluir categorías bloqueadas
        ...(blockedCategoryIds.length > 0 && {
          id: {
            notIn: blockedCategoryIds,
          },
        }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
      },
      orderBy: [
        { parentId: 'asc' }, // Primero las raíz (sin padre)
        { name: 'asc' }, // Luego ordenadas por nombre
      ],
    });
    
    // Filtrar también categorías cuyo padre esté bloqueado
    const filteredCategories = categories.filter((category) => {
      if (category.parentId) {
        return !blockedCategoryIds.includes(category.parentId);
      }
      return true;
    });
    
    console.log(`📂 [CATEGORIES SERVICE] Categorías obtenidas (después de filtrar bloqueadas): ${filteredCategories.length}`);

    return filteredCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.handle,
      display_order: null, // No tenemos este campo en el schema
      parent_category_id: category.parentId || null,
    }));
  }

  /**
   * Obtener categoría por handle
   * Retorna null si la categoría está bloqueada
   */
  async getCategoryByHandle(handle: string): Promise<CategoryResponse | null> {
    const category = await prisma.category.findUnique({
      where: { handle },
    });

    if (!category) {
      return null;
    }

    // Verificar si está bloqueada (incluyendo ancestros)
    const { isCategoryBlocked } = await import('../../shared/utils/category.utils');
    const isBlocked = await isCategoryBlocked(category.id);
    
    if (isBlocked) {
      return null; // Categoría bloqueada, no se muestra
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.handle,
      display_order: null,
      parent_category_id: category.parentId || null,
    };
  }
}
