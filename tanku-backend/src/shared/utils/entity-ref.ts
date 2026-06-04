import type { Prisma } from '@prisma/client';

/** Prefijos de referencia legible para entidades de negocio */
export type EntityRefPrefix = 'USR' | 'ORD' | 'RCL' | 'PST' | 'WLS' | 'EVT' | 'GFT';

const YEAR_PREFIXES = new Set<EntityRefPrefix>(['ORD', 'RCL', 'PST', 'EVT']);

const SEQ_PAD: Record<EntityRefPrefix, number> = {
  USR: 8,
  WLS: 8,
  GFT: 8,
  ORD: 7,
  RCL: 7,
  PST: 7,
  EVT: 7,
};

export const ENTITY_REF_PATTERN =
  /^((USR|WLS|GFT)-\d{8}|(ORD|RCL|PST|EVT)-\d{4}-\d{7})$/;

export function isEntityRef(value: string): boolean {
  return ENTITY_REF_PATTERN.test(value);
}

export function formatEntityRef(
  prefix: EntityRefPrefix,
  seq: number,
  year?: number
): string {
  const n = String(seq).padStart(SEQ_PAD[prefix], '0');
  if (year != null && YEAR_PREFIXES.has(prefix)) {
    return `${prefix}-${year}-${n}`;
  }
  return `${prefix}-${n}`;
}

type TransactionClient = Prisma.TransactionClient;

/**
 * Reserva el siguiente número de secuencia y devuelve el ref formateado.
 * Debe llamarse dentro de la misma transacción que el create de la entidad.
 */
export async function allocateEntityRef(
  tx: TransactionClient,
  prefix: EntityRefPrefix,
  createdAt: Date = new Date()
): Promise<string> {
  const useYear = YEAR_PREFIXES.has(prefix);
  const year = useYear ? createdAt.getUTCFullYear() : 0;

  const row = await tx.entityRefSequence.upsert({
    where: {
      entityType_year: { entityType: prefix, year },
    },
    create: { entityType: prefix, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });

  return formatEntityRef(prefix, row.lastValue, useYear ? year : undefined);
}
