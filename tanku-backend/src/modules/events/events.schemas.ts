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

const remindersSchema = z
  .array(z.number().int().min(0).max(365))
  .refine((arr) => arr.length === new Set(arr).size, {
    message: 'Los recordatorios no pueden tener valores duplicados',
  });

const createBodySchema = z
  .object({
    title: z
      .string()
      .min(1, 'El título es requerido')
      .max(200, 'El título no puede tener más de 200 caracteres'),
    description: z
      .string()
      .max(1000, 'La descripción no puede tener más de 1000 caracteres')
      .optional(),
    eventDate: eventDateSchema,
    repeatType: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], {
      errorMap: () => ({
        message:
          'El tipo de repetición debe ser NONE, DAILY, WEEKLY, MONTHLY o YEARLY',
      }),
    }),
    kind: z.enum(['CELEBRATION', 'EVENT']).optional().default('EVENT'),
    reminders: remindersSchema.default([]),
    color: colorSchema,
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'EVENT' && data.repeatType !== 'NONE') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Los eventos de una sola vez no admiten repetición',
        path: ['repeatType'],
      });
    }
  });

/**
 * Schema para crear un evento
 */
export const createEventSchema = z.object({
  body: createBodySchema,
});

/**
 * Schema para actualizar un evento
 */
export const updateEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      eventDate: eventDateSchema.optional(),
      repeatType: z
        .enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
        .optional(),
      kind: z.enum(['CELEBRATION', 'EVENT']).optional(),
      reminders: remindersSchema.optional(),
      isActive: z.boolean().optional(),
      color: colorSchema,
    })
    .superRefine((data, ctx) => {
      if (data.kind === 'EVENT' && data.repeatType && data.repeatType !== 'NONE') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Los eventos de una sola vez no admiten repetición',
          path: ['repeatType'],
        });
      }
    }),
});

const eventColorPresetEntrySchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(40),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex #RRGGBB'),
});

/**
 * PUT /events/color-presets — cuerpo JSON (req.body tras express.json)
 */
export const putEventColorPresetsBodySchema = z.object({
  presets: z
    .array(eventColorPresetEntrySchema)
    .max(24, 'Máximo 24 tipos de color personalizados'),
});

/**
 * Schema para obtener eventos (query params)
 */
export const getEventsSchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d+$/, 'El mes debe ser un número')
      .transform(Number)
      .pipe(z.number().int().min(1).max(12))
      .optional(),
    year: z
      .string()
      .regex(/^\d+$/, 'El año debe ser un número')
      .transform(Number)
      .pipe(z.number().int().min(2000).max(2100))
      .optional(),
  }),
});
