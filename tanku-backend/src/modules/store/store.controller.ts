import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from '../products/categories.service';

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
      console.log('\n📂 [STORE] ========== OBTENIENDO CATEGORÍAS ==========');
      console.log(`📂 [STORE] Método: ${req.method}`);
      console.log(`📂 [STORE] Path: ${req.path}`);
      console.log(`📂 [STORE] URL: ${req.url}`);
      console.log(`📂 [STORE] Original URL: ${req.originalUrl}`);
      console.log(`📂 [STORE] Query:`, req.query);
      console.log(`📂 [STORE] Headers:`, {
        origin: req.headers.origin,
      });
      
      const categories = await this.categoriesService.listCategories();
      console.log(`✅ [STORE] ${categories.length} categorías encontradas en BD`);
      
      if (categories.length > 0) {
        console.log(`✅ [STORE] Primeras 3 categorías:`, categories.slice(0, 3).map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })));
      } else {
        console.log(`⚠️ [STORE] No hay categorías en la BD. Ejecuta: GET/POST /api/v1/dropi/sync-categories`);
      }

      const response = {
        success: true,
        count: categories.length,
        categories,
      };

      console.log(`📂 [STORE] Enviando respuesta con ${categories.length} categorías`);
      console.log('📂 [STORE] ==========================================\n');

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
}
