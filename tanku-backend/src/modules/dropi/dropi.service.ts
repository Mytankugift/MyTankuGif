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
    
    // ❌ REMOVIDO: Logs excesivos que causan rate limit en Railway
    // Solo log en desarrollo o si hay error
    const VERBOSE_LOGS = process.env.DROPI_VERBOSE_LOGS === 'true' || process.env.NODE_ENV === 'development';
    
    if (VERBOSE_LOGS) {
      console.log(`[DROPI] ${method} ${url}`);
    }
    
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

    const startTime = Date.now();
    try {
      // ✅ Agregar timeout para peticiones a Dropi (60 segundos)
      const timeoutMs = 60000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout después de ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const fetchPromise = fetch(url, options);
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      const duration = Date.now() - startTime;
      
      // ✅ SOLO log si hay error o en desarrollo
      if (!response.ok || VERBOSE_LOGS) {
        console.log(`[DROPI] ${method} ${url} - ${response.status} (${duration}ms)`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DROPI] Error en respuesta: ${response.status} - ${errorText}`);
        throw new BadRequestError(
          `Error en Dropi API: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      
      // ❌ REMOVIDO: Logs excesivos de respuesta exitosa
      // Solo log en desarrollo
      if (VERBOSE_LOGS && (data as any).objects) {
        console.log(`[DROPI] Respuesta exitosa - ${(data as any).objects.length} objetos`);
      }
      
      return data as Promise<T>;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      // ✅ SOLO log de errores (siempre)
      console.error(`[DROPI] Error después de ${duration}ms: ${method} ${url} - ${error.message || error}`);
      if (error.message?.includes('Timeout')) {
        throw new BadRequestError(`La petición a Dropi tardó más de 60 segundos. URL: ${url}`);
      }
      throw error;
    }
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

  /**
   * Obtener lista de departamentos desde Dropi
   * GET /integrations/department
   */
  async getDepartments(): Promise<{
    isSuccess: boolean;
    objects?: Array<{
      id: number;
      name: string;
      department_code?: string | null;
      country_id?: number;
    }>;
    message?: string;
    status?: number;
    count?: number | null;
  }> {
    try {
      const response = await this.request<{
        isSuccess: boolean;
        objects?: Array<{
          id: number;
          name: string;
          department_code?: string | null;
          country_id?: number;
        }>;
        message?: string;
        status?: number;
        count?: number | null;
      }>('GET', '/integrations/department');
      
      return response;
    } catch (error: any) {
      console.error('[DROPI] Error obteniendo departamentos:', error);
      return {
        isSuccess: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Obtener departamentos desde nuestra BD (cache)
   */
  async getDepartmentsFromDB(): Promise<Array<{
    id: number;
    name: string;
    department_code?: string | null;
    country_id?: number;
  }>> {
    // ✅ Verificar que prisma esté inicializado
    if (!prisma || !prisma.department) {
      console.error('[DROPI] Prisma no está inicializado o el modelo Department no existe');
      throw new BadRequestError('Error de configuración de base de datos');
    }

    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    return departments.map(dept => ({
      id: dept.dropiId,
      name: dept.name,
      department_code: dept.departmentCode,
      country_id: dept.countryId || undefined,
    }));
  }

  /**
   * Obtener ciudades desde nuestra BD (cache)
   */
  async getCitiesFromDB(departmentDropiId: number): Promise<Array<{
    id: number;
    name: string;
    department_id?: number;
    department_name?: string;
    code?: string;
    rate_type?: string;
    trajectory_type?: string;
  }>> {
    // Buscar el departamento por dropiId
    const department = await prisma.department.findUnique({
      where: { dropiId: departmentDropiId },
      include: { cities: true },
    });

    if (!department) {
      return [];
    }

    return department.cities.map(city => ({
      id: city.dropiId,
      name: city.name,
      department_id: departmentDropiId,
      department_name: department.name,
      code: city.code || undefined,
      rate_type: city.rateType || undefined,
      trajectory_type: city.trajectoryType || undefined,
    }));
  }

  /**
   * Obtener lista de ciudades desde Dropi
   * POST /integrations/trajectory/bycity
   * Body: { rate_type: "CON RECAUDO", department_id: number }
   */
  async getCities(departmentId: number, rateType: string = "CON RECAUDO"): Promise<{
    isSuccess: boolean;
    objects?: Array<{
      id: number;
      name: string;
      department_id?: number;
      department_name?: string;
      code?: string;
      rate_type?: string;
      trajectory_type?: string;
    }>;
    message?: string;
  }> {
    try {
      const body = {
        rate_type: rateType,
        department_id: departmentId,
      };
      
      const response = await this.request<{
        isSuccess: boolean;
        objects?: any; // Dropi puede devolver diferentes estructuras
        cities?: Array<{
          id: number;
          name: string;
          department_id?: number;
          department_name?: string;
          code?: string;
          rate_type?: string;
          trajectory_type?: string;
        }>;
        message?: string;
      }>('POST', '/integrations/trajectory/bycity', body);
      
      // ✅ Logging para debug
      console.log('[DROPI] Respuesta getCities - isSuccess:', response.isSuccess);
      console.log('[DROPI] Respuesta getCities - tiene objects?:', !!response.objects);
      console.log('[DROPI] Respuesta getCities - tiene cities?:', !!(response as any).cities);
      if (response.objects) {
        console.log('[DROPI] Tipo de objects:', typeof response.objects);
        if (Array.isArray(response.objects)) {
          console.log('[DROPI] objects es array, longitud:', response.objects.length);
        } else if (typeof response.objects === 'object') {
          console.log('[DROPI] objects es objeto, keys:', Object.keys(response.objects));
          if ((response.objects as any).cities) {
            console.log('[DROPI] objects.cities es array, longitud:', (response.objects as any).cities.length);
          }
        }
      }
      
      // ✅ Manejar diferentes estructuras de respuesta
      let citiesArray: any[] = [];
      
      if (Array.isArray(response.objects)) {
        // Estructura directa: { isSuccess: true, objects: [...] }
        citiesArray = response.objects;
      } else if (response.objects && typeof response.objects === 'object' && (response.objects as any).cities) {
        // Estructura anidada: { isSuccess: true, objects: { cities: [...] } }
        citiesArray = (response.objects as any).cities;
      } else if ((response as any).cities && Array.isArray((response as any).cities)) {
        // Estructura alternativa: { isSuccess: true, cities: [...] }
        citiesArray = (response as any).cities;
      }
      
      console.log('[DROPI] Ciudades extraídas:', citiesArray.length);
      
      return {
        isSuccess: response.isSuccess,
        objects: citiesArray,
        message: response.message,
      };
    } catch (error: any) {
      console.error('[DROPI] Error obteniendo ciudades:', error);
      return {
        isSuccess: false,
        message: error.message || 'Error desconocido',
      };
    }
  }

  /**
   * Sincronizar departamentos desde Dropi a nuestra BD
   */
  async syncDepartments(): Promise<{
    synced: number;
    updated: number;
  }> {
    console.log('🔄 [DROPI] Sincronizando departamentos desde Dropi...');
    
    const result = await this.getDepartments();
    
    if (!result.isSuccess || !result.objects) {
      throw new BadRequestError(result.message || 'Error obteniendo departamentos desde Dropi');
    }

    let synced = 0;
    let updated = 0;

    for (const dept of result.objects) {
      try {
        const existing = await prisma.department.findUnique({
          where: { dropiId: dept.id },
        });

        if (existing) {
          // Actualizar si hay cambios (incluyendo payload)
          await prisma.department.update({
            where: { dropiId: dept.id },
            data: {
              name: dept.name,
              departmentCode: dept.department_code || null,
              countryId: dept.country_id || null,
              payload: dept as any, // Guardar payload completo
            },
          });
          updated++;
        } else {
          // Crear nuevo (incluyendo payload)
          await prisma.department.create({
            data: {
              id: dept.id, // Usar el ID de Dropi como ID primario
              dropiId: dept.id,
              name: dept.name,
              departmentCode: dept.department_code || null,
              countryId: dept.country_id || null,
              payload: dept as any, // Guardar payload completo
            },
          });
          synced++;
        }
      } catch (error: any) {
        console.error(`⚠️ [DROPI] Error sincronizando departamento ${dept.id}:`, error);
      }
    }

    console.log(`✅ [DROPI] Departamentos sincronizados: ${synced} nuevos, ${updated} actualizados`);
    return { synced, updated };
  }

  /**
   * Sincronizar ciudades de un departamento desde Dropi a nuestra BD
   */
  async syncCities(departmentId: number, rateType: string = "CON RECAUDO"): Promise<{
    synced: number;
    updated: number;
  }> {
    console.log(`🔄 [DROPI] Sincronizando ciudades para departamento ${departmentId}...`);
    
    // Verificar que el departamento existe en nuestra BD
    const department = await prisma.department.findUnique({
      where: { dropiId: departmentId },
    });

    if (!department) {
      throw new BadRequestError(`Departamento con dropiId ${departmentId} no encontrado en BD. Sincroniza departamentos primero.`);
    }

    const result = await this.getCities(departmentId, rateType);
    
    if (!result.isSuccess || !result.objects) {
      throw new BadRequestError(result.message || 'Error obteniendo ciudades desde Dropi');
    }

    let synced = 0;
    let updated = 0;

    for (const city of result.objects) {
      try {
        const existing = await prisma.city.findUnique({
          where: { dropiId: city.id },
        });

        if (existing) {
          // Actualizar si hay cambios (incluyendo payload)
          await prisma.city.update({
            where: { dropiId: city.id },
            data: {
              name: city.name,
              rateType: city.rate_type || null,
              trajectoryType: city.trajectory_type || null,
              code: city.code || null,
              payload: city as any, // Guardar payload completo
            },
          });
          updated++;
        } else {
          // Crear nuevo (incluyendo payload)
          await prisma.city.create({
            data: {
              id: city.id, // Usar el ID de Dropi como ID primario
              dropiId: city.id,
              name: city.name,
              departmentId: department.id, // Usar el ID interno del departamento
              rateType: city.rate_type || null,
              trajectoryType: city.trajectory_type || null,
              code: city.code || null,
              payload: city as any, // Guardar payload completo
            },
          });
          synced++;
        }
      } catch (error: any) {
        console.error(`⚠️ [DROPI] Error sincronizando ciudad ${city.id}:`, error);
      }
    }

    console.log(`✅ [DROPI] Ciudades sincronizadas: ${synced} nuevas, ${updated} actualizadas`);
    return { synced, updated };
  }

  /**
   * Sincronizar todas las ciudades de todos los departamentos
   */
  async syncAllCities(rateType: string = "CON RECAUDO"): Promise<{
    totalSynced: number;
    totalUpdated: number;
    departmentsProcessed: number;
  }> {
    console.log('🔄 [DROPI] Sincronizando todas las ciudades...');
    
    const departments = await prisma.department.findMany();
    let totalSynced = 0;
    let totalUpdated = 0;
    let departmentsProcessed = 0;

    for (const dept of departments) {
      try {
        const result = await this.syncCities(dept.dropiId, rateType);
        totalSynced += result.synced;
        totalUpdated += result.updated;
        departmentsProcessed++;
      } catch (error: any) {
        console.error(`⚠️ [DROPI] Error sincronizando ciudades de departamento ${dept.dropiId}:`, error);
      }
    }

    console.log(`✅ [DROPI] Sincronización completa: ${totalSynced} ciudades nuevas, ${totalUpdated} actualizadas, ${departmentsProcessed} departamentos procesados`);
    return { totalSynced, totalUpdated, departmentsProcessed };
  }
}
