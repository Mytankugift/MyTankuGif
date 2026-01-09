import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Users
 */

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email('Email inválido').optional(),
  }),
});

export const createAddressSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    phone: z.string().min(1, 'El teléfono es requerido'),
    address1: z.string().min(1, 'La dirección es requerida'),
    detail: z.string().optional(),
    city: z.string().min(1, 'La ciudad es requerida'),
    state: z.string().min(1, 'El estado/departamento es requerido'),
    postalCode: z.string().min(1, 'El código postal es requerido'),
    country: z.string().default('CO'),
    isDefaultShipping: z.boolean().default(false),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    addressId: z.string().min(1, 'addressId es requerido'),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    address1: z.string().optional(),
    detail: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    isDefaultShipping: z.boolean().optional(),
  }),
});

export const updateUserProfileSchema = z.object({
  body: z.object({
    avatar: z.string().url('avatar debe ser una URL válida').optional(),
    banner: z.string().url('banner debe ser una URL válida').optional(),
    bio: z.string().optional(),
  }),
});

export const updatePersonalInformationSchema = z.object({
  body: z.object({
    birthday: z.string().optional(),
    maritalStatus: z.string().optional(),
    languages: z.array(z.string()).optional(),
    interests: z.array(z.string()).optional(),
    favoriteColors: z.array(z.string()).optional(),
    favoriteActivities: z.array(z.string()).optional(),
  }),
});

