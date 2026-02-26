import { prisma } from '../../config/database';

/**
 * Utilidades para trabajar con categorías y bloqueos recursivos
 */

/**
 * Verifica si una categoría está bloqueada (incluyendo ancestros)
 * Si cualquier ancestro está bloqueado, retorna true
 */
export async function isCategoryBlocked(categoryId: string | null): Promise<boolean> {
  if (!categoryId) return false;
  
  // Obtener categoría con información de bloqueo
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      blocked: true,
      parentId: true,
    },
  });
  
  if (!category) return false;
  
  // Si esta categoría está bloqueada, retornar true
  if (category.blocked) return true;
  
  // Si tiene padre, verificar recursivamente
  if (category.parentId) {
    return await isCategoryBlocked(category.parentId);
  }
  
  return false;
}

/**
 * Obtiene todos los IDs de hijos de una categoría (recursivo)
 */
export async function getAllChildrenIds(categoryId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true },
  });
  
  const allIds: string[] = [];
  
  for (const child of children) {
    allIds.push(child.id);
    const grandchildren = await getAllChildrenIds(child.id);
    allIds.push(...grandchildren);
  }
  
  return allIds;
}

/**
 * Obtiene todos los IDs de categorías bloqueadas (incluyendo hijos)
 * Útil para filtrar productos en queries
 */
export async function getBlockedCategoryIds(): Promise<string[]> {
  const blockedCategories = await prisma.category.findMany({
    where: { blocked: true },
    select: { id: true },
  });
  
  const blockedIds = new Set<string>();
  
  // Agregar categorías bloqueadas directas
  blockedCategories.forEach(cat => blockedIds.add(cat.id));
  
  // Agregar todos los hijos recursivamente
  for (const cat of blockedCategories) {
    const children = await getAllChildrenIds(cat.id);
    children.forEach(id => blockedIds.add(id));
  }
  
  return Array.from(blockedIds);
}

/**
 * Verifica si un producto está en una categoría bloqueada
 */
export async function isProductInBlockedCategory(productId: string): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  });
  
  if (!product || !product.categoryId) return false;
  
  return await isCategoryBlocked(product.categoryId);
}

