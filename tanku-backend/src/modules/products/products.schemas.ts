import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Products
 */

export const listProductsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
    categoryId: z.string().optional(),
    priceMin: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
    priceMax: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
    active: z.string().optional().transform((val) => val === 'true'),
    search: z.string().optional(),
    sortBy: z.enum(['price', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const getProductByHandleSchema = z.object({
  params: z.object({
    handle: z.string().min(1, 'El handle es requerido'),
  }),
});

