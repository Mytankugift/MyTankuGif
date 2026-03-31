import type { Prisma } from '@prisma/client';
import { AgeRestrictedError } from '../errors/AppError';

/**
 * Regla única de dominio (sin excepciones):
 * productBlockedForMinor = product.restrictToAdults OR category.restrictToAdults
 */
export type ProductAgePolicyFields = { restrictToAdults: boolean };
export type CategoryAgePolicyFields = { restrictToAdults: boolean } | null | undefined;

/**
 * Edad en años cumplidos (calendario local del servidor). Para cumpleaños: menor estricto hasta el día del cumpleaños 18.
 */
export function getAgeInYears(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * `true` = usuario tratado como menor para política de catálogo +18.
 * Sin fecha válida → conservador (menor).
 */
export function isUserMinorForPolicy(birthDate: Date | null | undefined): boolean {
  if (birthDate == null) return true;
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) return true;
  return getAgeInYears(birthDate) < 18;
}

export function isProductBlockedForMinor(
  product: ProductAgePolicyFields,
  category: CategoryAgePolicyFields
): boolean {
  if (product.restrictToAdults) return true;
  if (category?.restrictToAdults) return true;
  return false;
}

/**
 * Quién no puede ver catálogo +18: anónimos y menores (incl. sin birthDate / onboarding incompleto).
 */
export function viewerCannotSeeAdultCatalog(
  isAuthenticated: boolean,
  birthDate: Date | null | undefined
): boolean {
  if (!isAuthenticated) return true;
  return isUserMinorForPolicy(birthDate);
}

/**
 * Línea de carrito que debe eliminarse: comprador no puede ver +18, o regalo a menor con producto +18.
 * `recipientBirthDate` solo aplica si `isGiftCart && giftRecipientId`.
 */
export function shouldRemoveCartLineForAgePolicy(
  product: ProductAgePolicyFields,
  category: CategoryAgePolicyFields,
  cartUserId: string | null | undefined,
  buyerBirthDate: Date | null | undefined,
  isGiftCart: boolean,
  giftRecipientId: string | null | undefined,
  recipientBirthDate: Date | null | undefined
): boolean {
  if (!isProductBlockedForMinor(product, category)) return false;
  if (viewerCannotSeeAdultCatalog(Boolean(cartUserId), buyerBirthDate)) return true;
  if (
    isGiftCart &&
    giftRecipientId &&
    isUserMinorForPolicy(recipientBirthDate)
  ) {
    return true;
  }
  return false;
}

/**
 * Lanza AgeRestrictedError si el producto es +18 para menores y el viewer no puede verlo.
 */
export function assertProductViewableForUser(
  product: ProductAgePolicyFields,
  category: CategoryAgePolicyFields,
  isAuthenticated: boolean,
  birthDate: Date | null | undefined
): void {
  if (!isProductBlockedForMinor(product, category)) return;
  if (!viewerCannotSeeAdultCatalog(isAuthenticated, birthDate)) return;
  throw new AgeRestrictedError();
}

/**
 * Filtro Prisma: productos visibles para quien no puede ver catálogo +18 (menor o anónimo).
 * product.restrictToAdults y category.restrictToAdults deben ser false; sin categoría solo importa el producto.
 */
export function prismaWhereProductVisibleForMinorCatalog(): Prisma.ProductWhereInput {
  return {
    AND: [
      { restrictToAdults: false },
      {
        OR: [{ categoryId: null }, { category: { restrictToAdults: false } }],
      },
    ],
  };
}
