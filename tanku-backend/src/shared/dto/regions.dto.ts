/**
 * DTOs para módulo de regiones
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type CountryDTO = {
  id: string;
  iso2: string;
  iso3: string;
  numCode: string;
  name: string;
  displayName: string;
};

export type RegionDTO = {
  id: string;
  name: string;
  currencyCode: string;
  countries: CountryDTO[];
};

