import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { BadRequestError } from '../../shared/errors/AppError';

interface DropiProduct {
  id: number;
  name: string;
  type: 'SIMPLE' | 'VARIABLE';
  sku?: string;
  sale_price?: number;
  suggested_price?: number;
  active?: boolean;
  main_image_s3_path?: string;
  gallery?: Array<{
    id: number;
    url?: string;
    urlS3?: string;
    main?: boolean;
  }>;
  categories?: Array<{
    id: number;
    name: string;
  }>;
  variations?: Array<{
    id: number;
    sku?: string;
    sale_price?: number;
    attributes?: Record<string, any>;
    stock?: number;
  }>;
}

interface DropiListResponse {
  isSuccess: boolean;
  count?: number;
  objects?: DropiProduct[];
  message?: string;
}

export class DropiService {
  private baseUrl: string;
  private token: string;
  private proxyUrl?: string;
  private proxyKey?: string;

  constructor() {
    this.baseUrl = env.DROPI_BASE_URL;
    this.token = env.DROPI_STATIC_TOKEN;
    this.proxyUrl = env.DROPI_PROXY_URL;
    this.proxyKey = env.DROPI_PROXY_KEY;
  }

  /**
   * Llamar a la API de Dropi
   * Si está configurado el proxy, usa el proxy. Si no, usa la URL base directamente.
   * Todas las llamadas usan 'dropi-integration-key' como header
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    // Si hay proxy configurado, usarlo. Si no, usar la URL base directamente
    const baseUrl = this.proxyUrl || this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'dropi-integration-key': this.token,
    };

    // Si estamos usando proxy, agregar el header de proxy key
    if (this.proxyUrl && this.proxyKey) {
      headers['x-proxy-key'] = this.proxyKey;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestError(
        `Error en Dropi API: ${response.status} - ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Obtener categorías desde Dropi
   * GET /integrations/categories
   */
  async getCategories(): Promise<{
    isSuccess: boolean;
    objects?: Array<{
      id: number;
      name: string;
      parent_category: number;
    }>;
    message?: string;
  }> {
    try {
      const response = await this.request<{
        isSuccess: boolean;
        objects?: Array<{
          id: number;
          name: string;
          parent_category: number;
        }>;
        message?: string;
      }>('GET', '/integrations/categories');
      
      return response;
    } catch (error: any) {
      console.error('[DROPI] Error obteniendo categorías:', error);
      return {
        isSuccess: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Listar productos desde Dropi
   */
  async listProducts(params: {
    pageSize: number;
    startData?: number;
    category_id?: number;
  }): Promise<DropiListResponse> {
    const body: any = {
      pageSize: params.pageSize,
      no_count: false, // Siempre obtener count
    };

    if (params.startData !== undefined) {
      body.startData = params.startData;
    }

    if (params.category_id !== undefined) {
      body.category_id = params.category_id;
    }

    return this.request<DropiListResponse>(
      'POST',
      '/integrations/products/index',
      body
    );
  }

  /**
   * Obtener detalle de producto desde Dropi
   */
  async getProductDetail(productId: number): Promise<any> {
    return this.request('GET', `/integrations/products/v2/${productId}`);
  }

  /**
   * Normalizar producto de Dropi a nuestro schema
   */
  private normalizeDropiProduct(dropiProduct: DropiProduct): {
    title: string;
    handle: string;
    description?: string;
    images: string[];
    categoryId?: string;
    variants: Array<{
      sku: string;
      title: string;
      price: number; // en centavos
      stock: number;
    }>;
  } {
    // Generar handle desde el nombre
    const handle = dropiProduct.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    // Obtener imágenes
    const images: string[] = [];
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    
    if (dropiProduct.main_image_s3_path) {
      // Construir URL completa desde S3 path
      let imagePath = dropiProduct.main_image_s3_path;
      
      // Si ya es una URL completa, usarla tal cual
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        images.push(imagePath);
      } else {
        // Si es un path relativo, construir la URL completa
        // Remover slash inicial si existe
        const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
        images.push(`${cdnBase}/${cleanPath}`);
      }
    }
    
    if (dropiProduct.gallery) {
      dropiProduct.gallery.forEach((img) => {
        if (img.urlS3) {
          // Si ya es una URL completa, usarla
          if (img.urlS3.startsWith('http://') || img.urlS3.startsWith('https://')) {
            if (!images.includes(img.urlS3)) {
              images.push(img.urlS3);
            }
          } else {
            // Construir URL completa
            const cleanPath = img.urlS3.startsWith('/') ? img.urlS3.substring(1) : img.urlS3;
            const fullUrl = `${cdnBase}/${cleanPath}`;
            if (!images.includes(fullUrl)) {
              images.push(fullUrl);
            }
          }
        } else if (img.url) {
          // Si ya es una URL completa, usarla
          if (img.url.startsWith('http://') || img.url.startsWith('https://')) {
            if (!images.includes(img.url)) {
              images.push(img.url);
            }
          } else {
            // Construir URL completa
            const cleanPath = img.url.startsWith('/') ? img.url.substring(1) : img.url;
            const fullUrl = `${cdnBase}/${cleanPath}`;
            if (!images.includes(fullUrl)) {
              images.push(fullUrl);
            }
          }
        }
      });
    }

    // Crear variantes
    const variants: Array<{
      sku: string;
      title: string;
      price: number;
      stock: number;
    }> = [];

    if (dropiProduct.type === 'SIMPLE') {
      // Producto simple: una sola variante
      variants.push({
        sku: dropiProduct.sku || `DROP-${dropiProduct.id}`,
        title: dropiProduct.name,
        price: Math.round((dropiProduct.sale_price || 0) * 100), // Convertir a centavos
        stock: 0, // TODO: Obtener stock de warehouse_product
      });
    } else if (dropiProduct.type === 'VARIABLE' && dropiProduct.variations) {
      // Producto variable: múltiples variantes
      dropiProduct.variations.forEach((variation) => {
        const attributes = variation.attributes || {};
        const variantTitle = Object.values(attributes).join(' ') || dropiProduct.name;
        
        variants.push({
          sku: variation.sku || `DROP-${dropiProduct.id}-${variation.id}`,
          title: variantTitle,
          price: Math.round((variation.sale_price || 0) * 100), // Convertir a centavos
          stock: variation.stock || 0,
        });
      });
    }

    return {
      title: dropiProduct.name,
      handle,
      description: undefined, // Se obtiene del detalle
      images,
      categoryId: undefined, // TODO: Mapear categorías de Dropi a nuestras categorías
      variants,
    };
  }

  /**
   * Sincronizar productos desde Dropi a nuestra BD
   */
  async syncProducts(limit: number = 10): Promise<{
    synced: number;
    products: any[];
  }> {
    console.log(`🔄 [DROPI] Sincronizando primeros ${limit} productos...`);

    // Obtener productos de Dropi
    const response = await this.listProducts({
      pageSize: limit,
      startData: 0,
      category_id: 1, // Categoría por defecto
    });

    if (!response.isSuccess || !response.objects) {
      throw new BadRequestError(
        `Error obteniendo productos de Dropi: ${response.message || 'Unknown error'}`
      );
    }

    const syncedProducts = [];

    for (const dropiProduct of response.objects) {
      try {
        // Normalizar producto
        const normalized = this.normalizeDropiProduct(dropiProduct);

        // Verificar si el producto ya existe (por handle)
        const existingProduct = await prisma.product.findUnique({
          where: { handle: normalized.handle },
          include: { variants: true },
        });

        if (existingProduct) {
          console.log(`  ⏭️  Producto ya existe: ${normalized.handle}`);
          syncedProducts.push(existingProduct);
          continue;
        }

        // Verificar SKUs duplicados antes de crear
        const existingSkus = await prisma.productVariant.findMany({
          where: {
            sku: {
              in: normalized.variants.map((v) => v.sku),
            },
          },
          select: { sku: true },
        });

        const existingSkuSet = new Set(existingSkus.map((v) => v.sku));
        const variantsToCreate = normalized.variants.filter(
          (v) => !existingSkuSet.has(v.sku)
        );

        if (variantsToCreate.length === 0) {
          console.log(`  ⏭️  Todas las variantes ya existen para: ${normalized.handle}`);
          continue;
        }

        if (variantsToCreate.length < normalized.variants.length) {
          console.log(
            `  ⚠️  Algunas variantes ya existen. Creando ${variantsToCreate.length} de ${normalized.variants.length} variantes.`
          );
        }

        // Crear producto con variantes (solo las que no existen)
        const product = await prisma.product.create({
          data: {
            title: normalized.title,
            handle: normalized.handle,
            description: normalized.description,
            images: normalized.images,
            categoryId: normalized.categoryId,
            active: dropiProduct.active !== false,
            variants: {
              create: variantsToCreate.map((variant) => ({
                sku: variant.sku,
                title: variant.title,
                price: variant.price,
                stock: variant.stock,
                active: true,
              })),
            },
          },
          include: {
            variants: true,
            category: true,
          },
        });

        console.log(`  ✅ Producto creado: ${product.title} (${product.variants.length} variantes)`);
        syncedProducts.push(product);
      } catch (error: any) {
        console.error(`  ❌ Error sincronizando producto ${dropiProduct.id}:`, error.message);
        // Continuar con el siguiente producto
      }
    }

    return {
      synced: syncedProducts.length,
      products: syncedProducts,
    };
  }
}
