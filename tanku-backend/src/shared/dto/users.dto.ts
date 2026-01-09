/**
 * DTOs para módulo de usuarios
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

import { UserPublicDTO } from './auth.dto';

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
  metadata?: Record<string, any>;
};

// UserProfile DTOs
export type UserProfileDTO = {
  id: string;
  userId: string;
  avatar: string | null;
  banner: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserProfileDTO = {
  bio?: string;
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
};

export type UpdateOnboardingDataDTO = {
  birthDate?: string | null;
  categoryIds?: string[];
  activities?: string[];
  completedSteps?: string[];
};

