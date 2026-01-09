import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Stories
 */

export const createStorySchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    files: z.array(z.object({
      fileType: z.enum(['image', 'video']),
      fileUrl: z.string().url('fileUrl debe ser una URL válida'),
    })).min(1, 'Se requiere al menos un archivo'),
  }),
});

