import { prisma } from '../../config/database';
import { AgeRestrictedError } from '../errors/AppError';
import { isProductBlockedForMinor, isUserMinorForPolicy } from './catalog-age-policy';

/**
 * Fecha de nacimiento del usuario para política de edad (menores / +18).
 * Sin userId → undefined (visitante). Con userId y sin fila / sin fecha → null.
 */
export async function getBirthDateForUserId(
  userId: string | undefined
): Promise<Date | null | undefined> {
  if (!userId) return undefined;
  const row = await prisma.personalInformation.findUnique({
    where: { userId },
    select: { birthDate: true },
  });
  return row?.birthDate ?? null;
}

/**
 * Regalo: comprobar si el destinatario puede recibir este producto (+18).
 */
export async function checkGiftProductAllowedForRecipient(
  product: { restrictToAdults: boolean },
  category: { restrictToAdults: boolean } | null | undefined,
  recipientUserId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isProductBlockedForMinor(product, category)) return { ok: true };
  const birthDate = await getBirthDateForUserId(recipientUserId);
  if (isUserMinorForPolicy(birthDate)) {
    return {
      ok: false,
      reason: 'Este producto no puede enviarse a un destinatario menor de edad',
    };
  }
  return { ok: true };
}

/**
 * Regalo: no enviar producto +18 a destinatario menor (o sin edad conocida).
 */
export async function assertGiftProductAllowedForRecipient(
  product: { restrictToAdults: boolean },
  category: { restrictToAdults: boolean } | null | undefined,
  recipientUserId: string
): Promise<void> {
  const r = await checkGiftProductAllowedForRecipient(product, category, recipientUserId);
  if (!r.ok) {
    throw new AgeRestrictedError(r.reason);
  }
}
