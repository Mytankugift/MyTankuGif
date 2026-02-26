import { prisma } from '../../../config/database';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';
import { PriceFormulaType, PriceFormulaValue } from '../../../shared/utils/price-formula.utils';
import { S3Service } from '../../../shared/services/s3.service';
import { getAllChildrenIds } from '../../../shared/utils/category.utils';

/**
 * Genera un handle único desde el nombre de la categoría
 */
function generateHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Eliminar guiones al inicio y final
    .substring(0, 100); // Limitar longitud
}

/**
 * Genera un handle único verificando que no exista
 */
async function generateUniqueHandle(name: string, excludeId?: string): Promise<string> {
  let baseHandle = generateHandle(name);
  let handle = baseHandle;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return handle;
    }

    handle = `${baseHandle}-${counter}`;
    counter++;
  }
}

export interface CategoryTreeNode {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  imageUrl: string | null;
  dropiId: number | null;
  blocked: boolean;
  blockedAt: Date | null;
  blockedBy: string | null;
  parentId: string | null;
  defaultPriceFormulaType: PriceFormulaType | null;
  defaultPriceFormulaValue: PriceFormulaValue | null;
  createdAt: Date;
  updatedAt: Date;
  productsCount: number; // Productos directos en esta categoría
  totalProductsCount: number; // Productos directos + todos los hijos (recursivo)
  children: CategoryTreeNode[];
  locker: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface CategoryFilters {
  search?: string;
  blocked?: boolean;
  parentId?: string | null;
}

export class AdminCategoryService {
  private s3Service: S3Service;

  constructor() {
    this.s3Service = new S3Service();
  }

  /**
   * Contar productos directos en una categoría
   */
  private async countDirectProducts(categoryId: string): Promise<number> {
    return await prisma.product.count({
      where: { categoryId },
    });
  }

  /**
   * Contar productos totales (directos + hijos recursivos)
   */
  private async countTotalProducts(categoryId: string): Promise<number> {
    // Contar productos directos
    const directCount = await this.countDirectProducts(categoryId);

    // Obtener todos los hijos
    const childrenIds = await getAllChildrenIds(categoryId);

    // Contar productos de hijos
    let childrenCount = 0;
    if (childrenIds.length > 0) {
      childrenCount = await prisma.product.count({
        where: {
          categoryId: { in: childrenIds },
        },
      });
    }

    return directCount + childrenCount;
  }

  /**
   * Construir árbol de categorías recursivamente
   * OPTIMIZADO: Usa batch queries para contar productos
   */
  private async buildCategoryTree(
    categories: Array<{
      id: string;
      name: string;
      handle: string;
      description: string | null;
      imageUrl: string | null;
      dropiId: number | null;
      blocked: boolean;
      blockedAt: Date | null;
      blockedBy: string | null;
      parentId: string | null;
      defaultPriceFormulaType: PriceFormulaType | null;
      defaultPriceFormulaValue: any;
      createdAt: Date;
      updatedAt: Date;
      locker: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      } | null;
    }>,
    parentId: string | null = null,
    directCountMap?: Map<string, number>
  ): Promise<CategoryTreeNode[]> {
    const nodes: CategoryTreeNode[] = [];

    // Si no hay mapa de conteos, calcularlo una vez para todas las categorías
    let countMap = directCountMap;
    if (!countMap) {
      const allCategoryIds = categories.map(c => c.id);
      
      if (allCategoryIds.length > 0) {
        // Un solo query para contar productos directos de todas las categorías
        const directCounts = await prisma.product.groupBy({
          by: ['categoryId'],
          where: {
            categoryId: { in: allCategoryIds },
          },
          _count: {
            id: true,
          },
        });
        
        countMap = new Map<string, number>();
        directCounts.forEach(item => {
          if (item.categoryId) {
            countMap!.set(item.categoryId, item._count.id);
          }
        });
      } else {
        countMap = new Map<string, number>();
      }
    }

    // Función recursiva para calcular totalProductsCount en memoria
    const calculateTotalCount = (catId: string): number => {
      const direct = countMap!.get(catId) || 0;
      const children = categories.filter(c => c.parentId === catId);
      const childrenTotal = children.reduce((sum, child) => {
        return sum + calculateTotalCount(child.id);
      }, 0);
      return direct + childrenTotal;
    };

    for (const category of categories) {
      if (category.parentId === parentId) {
        // Obtener conteos del mapa (ya calculados)
        const productsCount = countMap!.get(category.id) || 0;
        const totalProductsCount = calculateTotalCount(category.id);

        // Construir hijos recursivamente (pasar el mapa para reutilizar)
        const children = await this.buildCategoryTree(categories, category.id, countMap);

        nodes.push({
          id: category.id,
          name: category.name,
          handle: category.handle,
          description: category.description,
          imageUrl: category.imageUrl,
          dropiId: category.dropiId,
          blocked: category.blocked,
          blockedAt: category.blockedAt,
          blockedBy: category.blockedBy,
          parentId: category.parentId,
          defaultPriceFormulaType: category.defaultPriceFormulaType,
          defaultPriceFormulaValue: category.defaultPriceFormulaValue as PriceFormulaValue | null,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
          productsCount,
          totalProductsCount,
          children,
          locker: category.locker,
        });
      }
    }

    return nodes;
  }

  /**
   * Obtener todas las categorías en formato de árbol
   */
  async getCategories(filters: CategoryFilters = {}): Promise<CategoryTreeNode[]> {
    const where: any = {};

    // Filtro de búsqueda
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { handle: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtro por bloqueo
    if (filters.blocked !== undefined) {
      where.blocked = filters.blocked;
    }

    // Filtro por padre
    if (filters.parentId !== undefined) {
      if (filters.parentId === null || filters.parentId === 'null') {
        where.parentId = null;
      } else {
        where.parentId = filters.parentId;
      }
    }

    // Obtener todas las categorías
    const categories = await prisma.category.findMany({
      where,
      include: {
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Construir árbol - pasar el parentId del filtro si existe
    // Si filtramos por parentId, queremos obtener las subcategorías de ese padre
    const treeParentId = filters.parentId !== undefined ? filters.parentId : null;
    return await this.buildCategoryTree(categories, treeParentId);
  }

  /**
   * Obtener categoría por ID
   */
  async getCategoryById(id: string): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Obtener todas las categorías para construir el árbol completo
    const allCategories = await prisma.category.findMany({
      include: {
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Construir árbol completo (optimizado con batch queries)
    const fullTree = await this.buildCategoryTree(allCategories);

    // Buscar la categoría específica en el árbol
    const findCategoryInTree = (nodes: CategoryTreeNode[]): CategoryTreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) {
          return node;
        }
        const found = findCategoryInTree(node.children);
        if (found) {
          return found;
        }
      }
      return null;
    };

    const categoryNode = findCategoryInTree(fullTree);

    if (!categoryNode) {
      // Si no se encuentra en el árbol (puede pasar si hay problemas de estructura),
      // construir manualmente solo con esta categoría y sus hijos directos
      const directCount = await this.countDirectProducts(category.id);
      const totalCount = await this.countTotalProducts(category.id);
      
      // Obtener hijos directos
      const directChildren = allCategories.filter(c => c.parentId === id);
      const childrenTree = await this.buildCategoryTree(directChildren);

      return {
        id: category.id,
        name: category.name,
        handle: category.handle,
        description: category.description,
        imageUrl: category.imageUrl,
        dropiId: category.dropiId,
        blocked: category.blocked,
        blockedAt: category.blockedAt,
        blockedBy: category.blockedBy,
        parentId: category.parentId,
        defaultPriceFormulaType: category.defaultPriceFormulaType,
        defaultPriceFormulaValue: category.defaultPriceFormulaValue as PriceFormulaValue | null,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        productsCount: directCount,
        totalProductsCount: totalCount,
        children: childrenTree,
        locker: category.locker,
      };
    }

    return categoryNode;
  }

  /**
   * Crear nueva categoría
   */
  async createCategory(
    data: {
      name: string;
      description?: string | null;
      parentId?: string | null;
      handle?: string;
    },
    adminUserId: string
  ): Promise<CategoryTreeNode> {
    // Validar nombre
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestError('El nombre de la categoría es requerido');
    }

    // Validar padre si se proporciona
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundError('Categoría padre no encontrada');
      }
    }

    // Generar handle único
    const handle = data.handle || await generateUniqueHandle(data.name);

    // Crear categoría (sin dropiId - es nueva manual)
    const category = await prisma.category.create({
      data: {
        name: data.name.trim(),
        handle,
        description: data.description?.trim() || null,
        parentId: data.parentId || null,
        // dropiId se deja como null (categoría nueva manual)
      },
      include: {
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`[ADMIN CATEGORIES] Categoría ${category.id} creada por admin ${adminUserId}`);

    return await this.getCategoryById(category.id);
  }

  /**
   * Actualizar categoría
   */
  async updateCategory(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      parentId?: string | null;
    },
    adminUserId: string
  ): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Validar que no se intente cambiar dropiId si existe
    // (esto se maneja en el controller, pero por seguridad aquí también)

    // Validar nombre si se proporciona
    if (data.name !== undefined) {
      if (!data.name || data.name.trim() === '') {
        throw new BadRequestError('El nombre de la categoría no puede estar vacío');
      }
    }

    // Validar padre si se proporciona
    if (data.parentId !== undefined) {
      if (data.parentId === 'null' || data.parentId === null) {
        data.parentId = null;
      } else {
        // Validar que el padre existe
        const parent = await prisma.category.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new NotFoundError('Categoría padre no encontrada');
        }

        // Validar que no se cree un ciclo (el padre no puede ser hijo de esta categoría)
        const childrenIds = await getAllChildrenIds(id);
        if (childrenIds.includes(data.parentId)) {
          throw new BadRequestError('No se puede establecer una categoría hija como padre (evitar ciclos)');
        }

        // Validar que no se establezca a sí misma como padre
        if (data.parentId === id) {
          throw new BadRequestError('Una categoría no puede ser su propio padre');
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
      // Regenerar handle si cambió el nombre
      updateData.handle = await generateUniqueHandle(data.name.trim(), id);
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId;
    }

    // Actualizar categoría
    await prisma.category.update({
      where: { id },
      data: updateData,
    });

    console.log(`[ADMIN CATEGORIES] Categoría ${id} actualizada por admin ${adminUserId}`);

    return await this.getCategoryById(id);
  }

  /**
   * Eliminar categoría
   */
  async deleteCategory(id: string, adminUserId: string): Promise<void> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Validar que no tenga dropiId (solo categorías padre con dropiId)
    if (category.dropiId !== null && category.parentId === null) {
      throw new BadRequestError('No se puede eliminar una categoría padre que tiene dropiId (sincronizada desde Dropi)');
    }

    // Validar que no tenga hijos
    if (category.children.length > 0) {
      throw new BadRequestError('No se puede eliminar una categoría que tiene subcategorías');
    }

    // Validar que no tenga productos
    const totalProductsCount = await this.countTotalProducts(id);
    if (totalProductsCount > 0) {
      throw new BadRequestError(`No se puede eliminar una categoría con ${totalProductsCount} producto(s)`);
    }

    // Eliminar imagen de S3 si existe
    if (category.imageUrl) {
      try {
        await this.s3Service.deleteFile(category.imageUrl);
        console.log(`[ADMIN CATEGORIES] Imagen ${category.imageUrl} eliminada de S3`);
      } catch (error) {
        console.warn(`[ADMIN CATEGORIES] Error eliminando imagen de S3:`, error);
        // Continuar con la eliminación aunque falle el S3
      }
    }

    // Eliminar categoría
    await prisma.category.delete({
      where: { id },
    });

    console.log(`[ADMIN CATEGORIES] Categoría ${id} eliminada por admin ${adminUserId}`);
  }

  /**
   * Bloquear/desbloquear categoría
   * NO modifica product.active, solo aplica filtro en queries públicas
   */
  async toggleBlock(id: string, blocked: boolean, adminUserId: string, unblockChildren?: boolean): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Determinar si es categoría padre (no tiene parentId)
    const isParentCategory = !category.parentId;

    // Actualizar bloqueo de la categoría principal
    await prisma.category.update({
      where: { id },
      data: {
        blocked,
        blockedAt: blocked ? new Date() : null,
        blockedBy: blocked ? adminUserId : null,
      },
    });

    // Si es categoría padre y se está bloqueando, bloquear también todas las subcategorías
    if (isParentCategory && blocked) {
      const allChildrenIds = await getAllChildrenIds(id);
      
      if (allChildrenIds.length > 0) {
        await prisma.category.updateMany({
          where: {
            id: { in: allChildrenIds },
          },
          data: {
            blocked: true,
            blockedAt: new Date(),
            blockedBy: adminUserId,
          },
        });
        
        console.log(
          `[ADMIN CATEGORIES] Categoría padre ${id} bloqueada junto con ${allChildrenIds.length} subcategoría(s) por admin ${adminUserId}.`
        );
      } else {
        console.log(
          `[ADMIN CATEGORIES] Categoría padre ${id} bloqueada (sin subcategorías) por admin ${adminUserId}.`
        );
      }
    } else if (isParentCategory && !blocked) {
      // Si se desbloquea una categoría padre, verificar si se deben desbloquear también las subcategorías
      if (unblockChildren === true) {
        const allChildrenIds = await getAllChildrenIds(id);
        
        if (allChildrenIds.length > 0) {
          await prisma.category.updateMany({
            where: {
              id: { in: allChildrenIds },
            },
            data: {
              blocked: false,
              blockedAt: null,
              blockedBy: null,
            },
          });
          
          console.log(
            `[ADMIN CATEGORIES] Categoría padre ${id} y ${allChildrenIds.length} subcategoría(s) desbloqueadas por admin ${adminUserId}.`
          );
        } else {
          console.log(
            `[ADMIN CATEGORIES] Categoría padre ${id} desbloqueada (sin subcategorías) por admin ${adminUserId}.`
          );
        }
      } else {
        // NO se desbloquean automáticamente las subcategorías
        console.log(
          `[ADMIN CATEGORIES] Categoría padre ${id} desbloqueada por admin ${adminUserId}. ` +
          `Las subcategorías mantienen su estado de bloqueo individual.`
        );
      }
    } else {
      // Es subcategoría, solo se bloquea/desbloquea esa subcategoría
      console.log(
        `[ADMIN CATEGORIES] Subcategoría ${id} ${blocked ? 'bloqueada' : 'desbloqueada'} por admin ${adminUserId}.`
      );
    }

    // ✅ NO modificar product.active
    // El filtro se aplica en queries públicas automáticamente

    return await this.getCategoryById(id);
  }

  /**
   * Subir imagen de categoría a S3
   */
  async uploadImage(id: string, file: Express.Multer.File, adminUserId: string): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Eliminar imagen anterior si existe
    if (category.imageUrl) {
      try {
        await this.s3Service.deleteFile(category.imageUrl);
        console.log(`[ADMIN CATEGORIES] Imagen anterior ${category.imageUrl} eliminada de S3`);
      } catch (error) {
        console.warn(`[ADMIN CATEGORIES] Error eliminando imagen anterior de S3:`, error);
        // Continuar con el upload aunque falle la eliminación
      }
    }

    // Subir nueva imagen a S3
    const imageUrl = await this.s3Service.uploadFile(file, 'categories');

    // Actualizar categoría
    await prisma.category.update({
      where: { id },
      data: { imageUrl },
    });

    console.log(`[ADMIN CATEGORIES] Imagen subida para categoría ${id} por admin ${adminUserId}`);

    return await this.getCategoryById(id);
  }

  /**
   * Eliminar imagen de categoría
   */
  async removeImage(id: string, adminUserId: string): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    if (!category.imageUrl) {
      throw new BadRequestError('La categoría no tiene imagen');
    }

    // Eliminar de S3
    try {
      await this.s3Service.deleteFile(category.imageUrl);
      console.log(`[ADMIN CATEGORIES] Imagen ${category.imageUrl} eliminada de S3`);
    } catch (error) {
      console.error(`[ADMIN CATEGORIES] Error eliminando imagen de S3:`, error);
      throw new BadRequestError(`Error al eliminar imagen de S3: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }

    // Actualizar categoría
    await prisma.category.update({
      where: { id },
      data: { imageUrl: null },
    });

    console.log(`[ADMIN CATEGORIES] Imagen eliminada de categoría ${id} por admin ${adminUserId}`);

    return await this.getCategoryById(id);
  }

  /**
   * Configurar fórmula de precio por defecto para la categoría
   */
  async setDefaultPriceFormula(
    id: string,
    formulaId: string,
    adminUserId: string
  ): Promise<CategoryTreeNode> {
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundError('Categoría no encontrada');
    }

    // Obtener fórmula
    const formula = await prisma.priceFormula.findUnique({
      where: { id: formulaId },
    });

    if (!formula) {
      throw new NotFoundError('Fórmula de precio no encontrada');
    }

    // Actualizar categoría
    await prisma.category.update({
      where: { id },
      data: {
        defaultPriceFormulaType: formula.type,
        defaultPriceFormulaValue: formula.value as any,
      },
    });

    console.log(`[ADMIN CATEGORIES] Fórmula "${formula.name}" configurada para categoría ${id} por admin ${adminUserId}`);

    return await this.getCategoryById(id);
  }
}

