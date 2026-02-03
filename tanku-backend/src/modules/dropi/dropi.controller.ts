import { Request, Response, NextFunction } from 'express';
import { DropiService } from './dropi.service';
import { BadRequestError } from '../../shared/errors/AppError';
import { prisma } from '../../config/database';

export class DropiController {
  private dropiService: DropiService;

  constructor() {
    this.dropiService = new DropiService();
  }

  /**
   * POST /api/v1/dropi/sync
   * Sincronizar productos desde Dropi
   * Query params: limit (default: 10)
   */
  syncProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : 10;

      if (limit < 1 || limit > 100) {
        throw new BadRequestError('El límite debe estar entre 1 y 100');
      }

      const result = await this.dropiService.syncProducts(limit);

      res.status(200).json({
        success: true,
        message: `Se sincronizaron ${result.synced} productos desde Dropi`,
        data: {
          synced: result.synced,
          products: result.products,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/dropi/departments
   * Obtener lista de departamentos (desde BD cache, o sincronizar desde Dropi si no hay datos)
   */
  getDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ Intentar obtener desde BD primero
      const dbDepartments = await this.dropiService.getDepartmentsFromDB();
      
      if (dbDepartments.length > 0) {
        // Ya están en BD, devolverlos (no volver a consultar Dropi)
        console.log(`[DROPI CONTROLLER] Devolviendo ${dbDepartments.length} departamentos desde BD`);
        return res.status(200).json({
          success: true,
          data: dbDepartments,
        });
      }

      // Si no hay datos en BD, consultar desde Dropi UNA VEZ y guardar todos
      console.log('[DROPI CONTROLLER] No hay departamentos en BD, consultando desde Dropi y guardando...');
      
      try {
        const dropiResult = await this.dropiService.getDepartments();
        
        if (!dropiResult.isSuccess || !dropiResult.objects) {
          const errorMessage = dropiResult.message || 'Error obteniendo departamentos desde Dropi';
          console.error('[DROPI CONTROLLER] Error en getDepartments:', errorMessage);
          throw new BadRequestError(errorMessage);
        }

        // ✅ Guardar todos los departamentos en BD (datos estructurados + payload completo)
        let savedCount = 0;
        let errorCount = 0;
        for (const dept of dropiResult.objects) {
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
            } else {
              // Crear nuevo (incluyendo payload)
              await prisma.department.create({
                data: {
                  id: dept.id,
                  dropiId: dept.id,
                  name: dept.name,
                  departmentCode: dept.department_code || null,
                  countryId: dept.country_id || null,
                  payload: dept as any, // Guardar payload completo
                },
              });
              savedCount++;
            }
          } catch (error: any) {
            errorCount++;
            console.error(`⚠️ [DROPI CONTROLLER] Error guardando departamento ${dept.id}:`, error);
            // Continuar con el siguiente departamento
          }
        }

        console.log(`✅ [DROPI CONTROLLER] ${savedCount} departamentos guardados en BD, ${errorCount} errores`);

        // Si no se guardó ningún departamento y hubo errores, lanzar error
        if (savedCount === 0 && errorCount > 0) {
          throw new BadRequestError('No se pudieron guardar los departamentos en la base de datos');
        }

        // Devolver los datos (ya están guardados en BD)
        return res.status(200).json({
          success: true,
          data: dropiResult.objects.map(dept => ({
            id: dept.id,
            name: dept.name,
            department_code: dept.department_code,
            country_id: dept.country_id,
          })),
        });
      } catch (dropiError: any) {
        // ✅ Si el error ya es un BadRequestError, propagarlo
        if (dropiError instanceof BadRequestError) {
          throw dropiError;
        }
        // ✅ Si es otro tipo de error, crear un BadRequestError con mensaje descriptivo
        console.error('[DROPI CONTROLLER] Error inesperado consultando Dropi:', dropiError);
        throw new BadRequestError(
          dropiError.message || 'Error al consultar departamentos desde Dropi. Por favor, verifica tu conexión e intenta más tarde.'
        );
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/dropi/cities?department_id=XXX
   * Obtener lista de ciudades (desde BD cache, o sincronizar desde Dropi si no hay datos)
   */
  getCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentId = req.query.department_id 
        ? parseInt(req.query.department_id as string) 
        : null;
      
      if (!departmentId || isNaN(departmentId)) {
        throw new BadRequestError('department_id es requerido y debe ser un número válido');
      }

      // ✅ Intentar obtener desde BD primero (solo para este departamento)
      const dbCities = await this.dropiService.getCitiesFromDB(departmentId);
      
      if (dbCities.length > 0) {
        // Ya están en BD para este departamento, devolverlas (no volver a consultar Dropi)
        console.log(`[DROPI CONTROLLER] Devolviendo ${dbCities.length} ciudades desde BD para departamento ${departmentId}`);
        return res.status(200).json({
          success: true,
          data: dbCities,
        });
      }

      // Si no hay ciudades en BD para este departamento, consultar desde Dropi y guardar
      console.log(`[DROPI CONTROLLER] No hay ciudades en BD para departamento ${departmentId}, consultando desde Dropi y guardando...`);
      
      // Verificar que el departamento existe en BD
      const department = await prisma.department.findUnique({
        where: { dropiId: departmentId },
      });

      if (!department) {
        throw new BadRequestError(`Departamento con dropiId ${departmentId} no encontrado en BD. Consulta departamentos primero.`);
      }

      // Consultar desde Dropi
      const dropiResult = await this.dropiService.getCities(departmentId);
      
      if (!dropiResult.isSuccess || !dropiResult.objects) {
        throw new BadRequestError(
          dropiResult.message || 'Error obteniendo ciudades desde Dropi'
        );
      }

      // ✅ Guardar automáticamente en BD solo las ciudades de este departamento (datos estructurados + payload completo)
      let savedCount = 0;
      for (const city of dropiResult.objects) {
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
          } else {
            // Crear nuevo (incluyendo payload)
            await prisma.city.create({
              data: {
                id: city.id,
                dropiId: city.id,
                name: city.name,
                departmentId: department.id, // Usar el ID interno del departamento
                rateType: city.rate_type || null,
                trajectoryType: city.trajectory_type || null,
                code: city.code || null,
                payload: city as any, // Guardar payload completo
              },
            });
            savedCount++;
          }
        } catch (error: any) {
          console.error(`⚠️ [DROPI CONTROLLER] Error guardando ciudad ${city.id}:`, error);
        }
      }

      console.log(`✅ [DROPI CONTROLLER] ${savedCount} ciudades guardadas en BD para departamento ${departmentId}`);

      // Devolver los datos (ya están guardados en BD)
      return res.status(200).json({
        success: true,
        data: dropiResult.objects,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/sync-departments
   * Sincronizar departamentos desde Dropi a nuestra BD
   */
  syncDepartments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.dropiService.syncDepartments();
      
      res.status(200).json({
        success: true,
        message: `Se sincronizaron ${result.synced} departamentos nuevos y se actualizaron ${result.updated}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/dropi/sync-cities
   * Sincronizar ciudades desde Dropi a nuestra BD
   * Body: { department_id?: number, rate_type?: string }
   * Si no se proporciona department_id, sincroniza todas las ciudades de todos los departamentos
   */
  syncCities = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentId = req.body.department_id 
        ? parseInt(req.body.department_id as string) 
        : null;
      const rateType = req.body.rate_type || "CON RECAUDO";

      let result;
      
      if (departmentId) {
        // Sincronizar ciudades de un departamento específico
        result = await this.dropiService.syncCities(departmentId, rateType);
        res.status(200).json({
          success: true,
          message: `Se sincronizaron ${result.synced} ciudades nuevas y se actualizaron ${result.updated} para el departamento ${departmentId}`,
          data: result,
        });
      } else {
        // Sincronizar todas las ciudades
        result = await this.dropiService.syncAllCities(rateType);
        res.status(200).json({
          success: true,
          message: `Se sincronizaron ${result.totalSynced} ciudades nuevas y se actualizaron ${result.totalUpdated} en ${result.departmentsProcessed} departamentos`,
          data: result,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
