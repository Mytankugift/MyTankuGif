/**
 * StalkerGift Schemas
 * 
 * Validaciones con Zod para el módulo StalkerGift
 */

import { z } from 'zod';

/**
 * Schema para crear un StalkerGift
 */
export const createStalkerGiftSchema = z.object({
  body: z.object({
    // Receptor interno (opcional si es externo)
    receiverId: z.string().cuid().optional(),
    
    // Receptor externo (opcional si es interno)
    externalReceiverData: z.object({
      instagram: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
    }).optional(),
    
    // Producto
    productId: z.string().cuid('productId debe ser un ID válido'),
    variantId: z.string().cuid().optional(),
    quantity: z.number().int().positive().min(1).max(10),
    
    // Datos del sender
    senderAlias: z.string().min(1).max(50, 'El alias no puede tener más de 50 caracteres'),
    senderMessage: z.string().max(500, 'El mensaje no puede tener más de 500 caracteres').optional(),
  }).refine(
    (data) => data.receiverId || data.externalReceiverData,
    {
      message: 'Debes especificar un receptor (receiverId o externalReceiverData)',
      path: ['receiverId'],
    }
  ),
});

/**
 * Schema para aceptar un StalkerGift
 */
export const acceptStalkerGiftSchema = z.object({
  body: z.object({
    addressId: z.string().cuid('addressId debe ser un ID válido'),
  }),
  params: z.object({
    id: z.string().cuid('id debe ser un ID válido'),
  }),
});

/**
 * Schema para rechazar un StalkerGift
 */
export const rejectStalkerGiftSchema = z.object({
  params: z.object({
    id: z.string().cuid('id debe ser un ID válido'),
  }),
});

/**
 * Schema para cancelar un StalkerGift
 */
export const cancelStalkerGiftSchema = z.object({
  params: z.object({
    id: z.string().cuid('id debe ser un ID válido'),
  }),
});

/**
 * Schema para obtener StalkerGift por token (público)
 */
export const getStalkerGiftByTokenSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token es requerido'),
  }),
});

/**
 * Schema para obtener StalkerGift por ID
 */
export const getStalkerGiftByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('id debe ser un ID válido'),
  }),
});

/**
 * Tipos TypeScript inferidos de los schemas
 */
export type CreateStalkerGiftInput = z.infer<typeof createStalkerGiftSchema>['body'];
export type AcceptStalkerGiftInput = z.infer<typeof acceptStalkerGiftSchema>['body'];
export type GetStalkerGiftByTokenInput = z.infer<typeof getStalkerGiftByTokenSchema>['params'];
export type GetStalkerGiftByIdInput = z.infer<typeof getStalkerGiftByIdSchema>['params'];

