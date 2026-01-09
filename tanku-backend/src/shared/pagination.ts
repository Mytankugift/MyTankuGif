/**
 * Helpers para paginación estándar
 */

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Valida y normaliza parámetros de paginación
 */
export function normalizePagination(
  query: PaginationQuery,
  defaults: { page: number; limit: number } = { page: 1, limit: 20 }
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(query.page) || defaults.page);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaults.limit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Crea metadata de paginación
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
  };
}

/**
 * Crea resultado paginado completo
 */
export function createPaginatedResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResult<T> {
  return {
    items,
    meta: createPaginationMeta(page, limit, total),
  };
}

