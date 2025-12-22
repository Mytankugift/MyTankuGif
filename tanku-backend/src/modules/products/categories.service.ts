import { prisma } from '../../config/database';

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string; // handle
  display_order?: number | null;
  parent_category_id?: string | null;
}

export class CategoriesService {
  /**
   * Listar todas las categorías activas
   * Incluye relaciones padre/hijo para estructura jerárquica
   */
  async listCategories(): Promise<CategoryResponse[]> {
    console.log(`📂 [CATEGORIES SERVICE] Ejecutando query para obtener categorías...`);
    
    // Primero verificar si hay categorías en la BD
    const totalCategories = await prisma.category.count();
    console.log(`📂 [CATEGORIES SERVICE] Total de categorías en BD: ${totalCategories}`);
    
    const categories = await prisma.category.findMany({
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
    
    console.log(`📂 [CATEGORIES SERVICE] Categorías obtenidas: ${categories.length}`);

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.handle,
      display_order: null, // No tenemos este campo en el schema
      parent_category_id: category.parentId || null,
    }));
  }

  /**
   * Obtener categoría por handle
   */
  async getCategoryByHandle(handle: string): Promise<CategoryResponse | null> {
    const category = await prisma.category.findUnique({
      where: { handle },
    });

    if (!category) {
      return null;
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
