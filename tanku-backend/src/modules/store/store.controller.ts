import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from '../products/categories.service';
import { prisma } from '../../config/database';
import { env } from '../../config/env';

/**
 * Controlador básico para endpoints de Store
 * Estos endpoints son stubs temporales para que el frontend no falle
 * Se expandirán en las siguientes fases
 */
export class StoreController {
  private categoriesService: CategoriesService;

  constructor() {
    this.categoriesService = new CategoriesService();
  }
  /**
   * GET /api/v1/store/regions
   * GET /store/regions
   * Obtener regiones (stub básico)
   * El frontend espera: { regions: [...] }
   */
  getRegions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Stub básico: devolver región por defecto (Colombia)
      // TODO: Implementar lógica real en Fase 3.3 (Módulo de Productos)
      const regions = [
        {
          id: 'reg_colombia',
          name: 'Colombia',
          currency_code: 'COP',
          countries: [
            {
              id: 'co',
              iso_2: 'co',
              iso_3: 'col',
              num_code: '170',
              name: 'Colombia',
              display_name: 'Colombia',
            },
          ],
        },
      ];

      // El frontend espera directamente { regions: [...] }
      res.status(200).json({ regions });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /store/regions/:id
   * Obtener una región específica por ID
   */
  getRegionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Por ahora solo tenemos Colombia
      if (id === 'reg_colombia') {
        const region = {
          id: 'reg_colombia',
          name: 'Colombia',
          currency_code: 'COP',
          countries: [
            {
              id: 'co',
              iso_2: 'co',
              iso_3: 'col',
              num_code: '170',
              name: 'Colombia',
              display_name: 'Colombia',
            },
          ],
        };

        res.status(200).json({ region });
      } else {
        res.status(404).json({
          error: 'Región no encontrada',
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/store/categories
   * Obtener categorías desde nuestra base de datos
   * El frontend espera: { success: true, count: number, categories: [...] }
   */
  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await this.categoriesService.listCategories();

      if (categories.length === 0 && env.NODE_ENV === 'development') {
        console.warn('⚠️ [STORE] No hay categorías en la BD');
      }

      const response = {
        success: true,
        count: categories.length,
        categories,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('❌ [STORE] Error obteniendo categorías:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/store/products
   * Obtener productos (stub básico)
   * El frontend espera: { products: [], count: 0 }
   * NOTA: Este endpoint ahora está implementado en products.controller
   */
  getProducts = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Stub básico: devolver array vacío por ahora
      // TODO: Implementar lógica real con Prisma en Fase 3.3 (Módulo de Productos)
      const response = {
        products: [],
        count: 0,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /store/wish-list/:customerId
   * Obtener wish lists de un cliente
   * El frontend espera: { data: { result: [...] } }
   */
  getWishLists = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId es requerido',
        });
      }

      const wishLists = await prisma.wishList.findMany({
        where: {
          userId: customerId,
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  handle: true,
                  images: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Formatear respuesta según lo que espera el frontend
      const formattedWishLists = wishLists.map((list) => ({
        id: list.id,
        title: list.name,
        public: list.public,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        products: list.items.map((item: { product: { id: string; title: string; handle: string; images: string[] } }) => ({
          id: item.product.id,
          title: item.product.title,
          handle: item.product.handle,
          thumbnail: item.product.images?.[0] || null,
        })),
      }));

      res.status(200).json({
        data: {
          result: formattedWishLists,
        },
      });
    } catch (error) {
      console.error('❌ [STORE] Error obteniendo wish lists:', error);
      next(error);
    }
  };
}
