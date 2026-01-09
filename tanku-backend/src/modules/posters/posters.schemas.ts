import { z } from 'zod';

/**
 * Schemas de validación Zod para módulo Posters
 */

export const createPosterSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url('imageUrl debe ser una URL válida').optional(),
    videoUrl: z.string().url('videoUrl debe ser una URL válida').optional(),
  }).refine(
    (data) => data.title || data.description,
    { message: 'Se requiere al menos un título o descripción' }
  ).refine(
    (data) => data.imageUrl || data.videoUrl,
    { message: 'Se requiere al menos una imagen o video' }
  ),
});

export const toggleReactionSchema = z.object({
  params: z.object({
    posterId: z.string().min(1, 'posterId es requerido'),
  }),
  body: z.object({
    reactionType: z.string().default('like'),
  }),
});

export const createCommentSchema = z.object({
  params: z.object({
    posterId: z.string().min(1, 'posterId es requerido'),
  }),
  body: z.object({
    content: z.string().min(1, 'El contenido del comentario es requerido'),
    parentId: z.string().optional(),
  }),
});

