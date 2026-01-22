/**
 * DTOs para módulo de productos y catálogo
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type CategoryDTO = {
  id: string;
  name: string;
  handle: string;
  parentId: string | null;
};

export type ProductVariantDTO = {
  id: string;
  sku: string;
  title: string;
  tankuPrice: number; // Precio final calculado (único precio expuesto al frontend)
  stock: number;
  active: boolean;
  attributes: Record<string, any> | null;
};

export type ProductDTO = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  images: string[];
  active: boolean;
  category: CategoryDTO | null;
  variants: ProductVariantDTO[];
};

export type ProductListDTO = {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  minPrice: number;
  active: boolean;
};

