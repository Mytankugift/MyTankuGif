/**
 * Events Schemas
 * 
 * Validaciones con Zod para el módulo Events
 */

import { z } from 'zod';

const eventDateSchema = z
  .string()
  .min(1, 'La fecha es requerida')
  .refine(
    (s) => {
      const d = s.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return true;
      return !Number.isNaN(Date.parse(s));
    },
    { message: 'Fecha inválida' }
  );

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex #RRGGBB')
  .optional();

/**
 * Schema para crear un evento
 */
export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'El título es requerido').max(200, 'El título no puede tener más de 200 caracteres'),
    description: z.string().max(1000, 'La descripción no puede tener más de 1000 caracteres').optional(),
    eventDate: eventDateSchema,
    repeatType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      errorMap: () => ({ message: 'El tipo de repetición debe ser NONE, DAILY, WEEKLY, MONTHLY o YEARLY' }),
    }),
    reminders: z.array(z.number().int().min(0).max(365))
      .refine(
        (arr) => arr.length === new Set(arr).size,
        { message: 'Los recordatorios no pueden tener valores duplicados' }
      )
      .default([]),
    color: colorSchema,
  }),
});

/**
 * Schema para actualizar un evento
 */
export const updateEventSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    eventDate: eventDateSchema.optional(),
    repeatType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    reminders: z.array(z.number().int().min(0).max(365))
      .refine(
        (arr) => arr.length === new Set(arr).size,
        { message: 'Los recordatorios no pueden tener valores duplicados' }
      )
      .optional(),
    isActive: z.boolean().optional(),
    color: colorSchema,
  }),
});

/**
 * Schema para obtener eventos (query params)
 */
export const getEventsSchema = z.object({
  query: z.object({
    month: z.string().regex(/^\d+$/, 'El mes debe ser un número').transform(Number).pipe(z.number().int().min(1).max(12)).optional(),
    year: z.string().regex(/^\d+$/, 'El año debe ser un número').transform(Number).pipe(z.number().int().min(2000).max(2100)).optional(),
  }),
});

