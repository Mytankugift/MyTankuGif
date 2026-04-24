/**
 * DTOs para módulo de usuarios
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

import { UserPublicDTO, SocialLink } from './auth.dto';

// Re-exportar SocialLink para que pueda ser importado desde users.dto
export type { SocialLink };

export type AddressDTO = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isGiftAddress?: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type UserWithAddressesDTO = {
  user: UserPublicDTO;
  addresses: AddressDTO[];
};

export type UpdateUserDTO = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  username?: string;
};

export type CreateAddressDTO = {
  firstName: string;
  lastName: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping?: boolean;
  isGiftAddress?: boolean;
  metadata?: Record<string, any>;
};

export type UpdateAddressDTO = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefaultShipping?: boolean;
  isGiftAddress?: boolean;
  metadata?: Record<string, any>;
};

// UserProfile DTOs
// SocialLink se importa de auth.dto para evitar duplicación

export type UserProfileDTO = {
  id: string;
  userId: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  isPublic: boolean;
  allowPublicWishlistsWhenPrivate?: boolean;
  allowGiftShipping?: boolean;
  useMainAddressForGifts?: boolean;
  socialLinks?: SocialLink[];
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserProfileDTO = {
  bio?: string;
  isPublic?: boolean;
  allowPublicWishlistsWhenPrivate?: boolean;
  allowGiftShipping?: boolean;
  useMainAddressForGifts?: boolean;
  socialLinks?: SocialLink[];
};

/** Datos tipo “sugerencias” cuando el visitante no es amigo del perfil (exploración) */
export type ProfileInsightsDTO = {
  mutualFriendsCount: number;
  mutualFriendNames?: string[];
  commonCategories?: string[];
  commonActivities?: string[];
};

// PersonalInformation DTOs
export type PersonalInformationDTO = {
  id: string;
  userId: string;
  pseudonym: string | null;
  statusMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdatePersonalInformationDTO = {
  pseudonym?: string | null;
  statusMessage?: string | null;
};

// Onboarding data DTOs (almacenados en PersonalInformation.metadata)
export type OnboardingDataDTO = {
  birthDate?: string | null;
  categoryIds?: string[];
  activities?: string[];
  completedSteps?: string[];
  lastCompletedAt?: string | null;
  /** ISO 8601: confirmación explícita de mayoría (+18) en onboarding */
  minorAcknowledgedAt?: string | null;
  /** Versión del texto de disclaimer de edad aceptada */
  minorDisclaimerVersion?: string | null;
  /** Versión de términos vigente al aceptar (trazabilidad) */
  acceptedTermsVersion?: string | null;
};

export type UpdateOnboardingDataDTO = {
  birthDate?: string | null;
  categoryIds?: string[];
  activities?: string[];
  completedSteps?: string[];
  /**
   * Registra consentimiento de mayoría de edad (timestamp + versiones).
   * Solo válido si la fecha de nacimiento en perfil indica ≥18 años.
   */
  recordAgeConsent?: boolean;
  /** Opcional: forzar versión de disclaimer (por defecto la del servidor) */
  minorDisclaimerVersion?: string | null;
  /** Opcional: versión de términos aceptada en el mismo acto */
  acceptedTermsVersion?: string | null;
};

