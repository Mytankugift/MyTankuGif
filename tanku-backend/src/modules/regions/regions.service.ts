import { RegionDTO } from '../../shared/dto/regions.dto';

/**
 * Servicio de regiones
 * Por ahora usa datos hardcodeados de Colombia
 * TODO: Crear tabla de regions en Prisma cuando sea necesario
 */
export class RegionsService {
  /**
   * Datos de Colombia (hardcodeados por ahora)
   */
  private getColombiaRegion(): RegionDTO {
    return {
      id: 'reg_colombia',
      name: 'Colombia',
      currencyCode: 'COP',
      countries: [
        {
          id: 'co',
          iso2: 'co',
          iso3: 'col',
          numCode: '170',
          name: 'Colombia',
          displayName: 'Colombia',
        },
      ],
    };
  }

  /**
   * Listar todas las regiones disponibles
   */
  async listRegions(): Promise<RegionDTO[]> {
    // Por ahora solo devolvemos Colombia
    // TODO: Cuando se cree la tabla, consultar desde Prisma
    return [this.getColombiaRegion()];
  }

  /**
   * Obtener región por ID
   */
  async getRegionById(regionId: string): Promise<RegionDTO | null> {
    // Por ahora solo tenemos Colombia
    if (regionId === 'reg_colombia') {
      return this.getColombiaRegion();
    }
    return null;
  }
}

