import { Request, Response, NextFunction } from 'express';
import { ProductsService, ProductListQuery } from './products.service';
import { BadRequestError } from '../../shared/errors/AppError';

export class ProductsController {
  private productsService: ProductsService;

  constructor() {
    this.productsService = new ProductsService();
  }

  /**
   * GET /store/product/
   * Listar productos (compatibilidad con frontend)
   * Query params: limit, offset, category_id
   */
  listProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(`\n🔍 [PRODUCTS CONTROLLER] ========== PETICIÓN RECIBIDA ==========`);
      console.log(`🔍 [PRODUCTS CONTROLLER] Método: ${req.method}`);
      console.log(`🔍 [PRODUCTS CONTROLLER] Path: ${req.path}`);
      console.log(`🔍 [PRODUCTS CONTROLLER] URL: ${req.url}`);
      console.log(`🔍 [PRODUCTS CONTROLLER] Original URL: ${req.originalUrl}`);
      console.log(`🔍 [PRODUCTS CONTROLLER] Query:`, req.query);
      console.log(`🔍 [PRODUCTS CONTROLLER] Headers:`, {
        origin: req.headers.origin,
        'content-type': req.headers['content-type'],
      });
      console.log(`🔍 [PRODUCTS CONTROLLER] ========================================`);

      const query: ProductListQuery = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        category_id: req.query.category_id as string | undefined,
        search: req.query.search as string | undefined,
      };

      console.log(`📦 [PRODUCTS] Listando productos:`, {
        limit: query.limit,
        offset: query.offset,
        category_id: query.category_id,
        category_id_type: typeof query.category_id,
        category_id_length: query.category_id?.length,
        raw_category_id: req.query.category_id,
      });
      
      // Verificar que el category_id sea válido si se proporciona
      if (query.category_id) {
        // Verificar formato (debe ser un string UUID válido)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(query.category_id)) {
          console.warn(`⚠️ [PRODUCTS] category_id no tiene formato UUID válido: ${query.category_id}`);
        } else {
          console.log(`✅ [PRODUCTS] category_id tiene formato UUID válido`);
        }
      }

      // Validar límite
      if (query.limit && (query.limit < 1 || query.limit > 100)) {
        throw new BadRequestError('El límite debe estar entre 1 y 100');
      }

      // Validar offset
      if (query.offset && query.offset < 0) {
        throw new BadRequestError('El offset debe ser mayor o igual a 0');
      }

      const result = await this.productsService.listProducts(query);

      console.log(`✅ [PRODUCTS] Productos encontrados: ${result.products.length} de ${result.count} totales`);
      console.log(`📊 [PRODUCTS] Respuesta:`, {
        productsCount: result.products.length,
        totalCount: result.count,
        hasMore: result.hasMore,
        firstProduct: result.products[0] ? {
          id: result.products[0].id,
          title: result.products[0].title,
          imagesCount: result.products[0].images?.length || 0,
          variantsCount: result.products[0].variants?.length || 0,
        } : null,
      });

      res.status(200).json({
        products: result.products,
        count: result.count,
        hasMore: result.hasMore,
      });
    } catch (error) {
      console.error(`❌ [PRODUCTS] Error listando productos:`, error);
      next(error);
    }
  };

  /**
   * GET /store/products
   * Listar productos (SDK de Medusa)
   * Query params: limit, offset, region_id, fields, category_id
   */
  listProductsSDK = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query: ProductListQuery = {
        limit: req.query.limit ? parseInt(req.query.limit as string) : 12,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        category_id: req.query.category_id as string | undefined,
        search: req.query.search as string | undefined,
      };

      const result = await this.productsService.listProducts(query);

      // Formato compatible con SDK de Medusa
      res.status(200).json({
        products: result.products,
        count: result.count,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /store/product/tanku/:handle
   * Obtener producto por handle (compatibilidad con frontend)
   */
  getProductByHandle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { handle } = req.params;

      if (!handle) {
        throw new BadRequestError('Handle es requerido');
      }

      const product = await this.productsService.getProductByHandle(handle);

      res.status(200).json({
        product,
      });
    } catch (error) {
      next(error);
    }
  };
}
