/**
 * Gift Service
 * 
 * Servicio para gestionar regalos entre usuarios
 * Validaciones y obtención de direcciones para regalos
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors/AppError';
import { FriendsService } from '../friends/friends.service';

export interface GiftRecipientEligibility {
  canReceive: boolean;
  hasAddress: boolean;
  allowGiftShipping: boolean;
  useMainAddressForGifts: boolean;
  reason?: string;
  canSendGift?: boolean; // Si el remitente puede enviar regalo a este destinatario
  sendGiftReason?: string; // Razón si no puede enviar
}

export interface GiftAddressInfo {
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
  // NO incluir datos sensibles como metadata completo
}

export class GiftService {
  private friendsService: FriendsService;

  constructor() {
    this.friendsService = new FriendsService();
  }

  /**
   * Validar si un usuario puede recibir regalos
   * 
   * @param recipientId - ID del usuario destinatario
   * @param senderId - ID del usuario remitente (opcional, para validar permisos de envío)
   * @returns Información sobre si puede recibir regalos y por qué
   */
  async validateGiftRecipient(recipientId: string, senderId?: string): Promise<GiftRecipientEligibility> {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
      include: {
        profile: true,
        addresses: true,
      },
    });

    if (!user) {
      return {
        canReceive: false,
        hasAddress: false,
        allowGiftShipping: false,
        useMainAddressForGifts: false,
        reason: 'Usuario no encontrado',
      };
    }

    const profile = user.profile;
    const addresses = user.addresses || [];

    // Verificar si permite recibir regalos
    const allowGiftShipping = profile?.allowGiftShipping ?? false;
    const useMainAddressForGifts = profile?.useMainAddressForGifts ?? false;

    // Verificar si tiene dirección configurada
    let hasAddress = false;
    let hasGiftAddress = false;
    let hasDefaultAddress = false;

    if (useMainAddressForGifts) {
      // Si usa dirección principal, verificar que tenga una dirección por defecto
      hasDefaultAddress = addresses.some(addr => addr.isDefaultShipping);
      hasAddress = hasDefaultAddress;
    } else {
      // Si no usa dirección principal, verificar que tenga una dirección específica para regalos
      hasGiftAddress = addresses.some(addr => addr.isGiftAddress);
      hasAddress = hasGiftAddress;
    }

    // Determinar si puede recibir regalos
    const canReceive = allowGiftShipping && hasAddress;

    let reason: string | undefined;
    if (!allowGiftShipping) {
      reason = 'Este usuario no permite recibir regalos';
    } else if (!hasAddress) {
      if (useMainAddressForGifts) {
        reason = 'Este usuario no tiene una dirección principal configurada para regalos';
      } else {
        reason = 'Este usuario no tiene una dirección configurada para recibir regalos';
      }
    }

    // Validar si el remitente puede enviar regalo a este destinatario (si se proporciona senderId)
    let canSendGift = true;
    let sendGiftReason: string | undefined;

    if (senderId && senderId !== recipientId) {
      const isPublic = profile?.isPublic ?? true;
      
      if (!isPublic) {
        // Si el perfil no es público, solo amigos pueden enviar regalos
        const areFriends = await this.friendsService.areFriends(senderId, recipientId);
        
        if (!areFriends) {
          canSendGift = false;
          sendGiftReason = 'Solo los amigos pueden enviar regalos a este usuario. Su perfil es privado.';
        }
      }
      // Si el perfil es público, cualquiera puede enviar regalos
    }

    return {
      canReceive,
      hasAddress,
      allowGiftShipping,
      useMainAddressForGifts,
      reason,
      canSendGift,
      sendGiftReason,
    };
  }

  /**
   * Obtener dirección de envío para regalos (sin datos sensibles)
   * 
   * @param recipientId - ID del usuario destinatario
   * @returns Información de dirección necesaria para envío (sin mostrar al remitente)
   */
  async getGiftAddress(recipientId: string): Promise<GiftAddressInfo | null> {
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
      include: {
        profile: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario destinatario no encontrado');
    }

    const profile = user.profile;
    const addresses = user.addresses || [];
    const useMainAddressForGifts = profile?.useMainAddressForGifts ?? false;

    let addressToUse = null;

    if (useMainAddressForGifts) {
      // Usar dirección principal
      addressToUse = addresses.find(addr => addr.isDefaultShipping);
    } else {
      // Usar dirección específica para regalos
      addressToUse = addresses.find(addr => addr.isGiftAddress);
    }

    if (!addressToUse) {
      return null;
    }

    // Retornar solo información necesaria para envío (sin metadata completo)
    return {
      id: addressToUse.id,
      firstName: addressToUse.firstName,
      lastName: addressToUse.lastName,
      phone: addressToUse.phone,
      address1: addressToUse.address1,
      address2: addressToUse.detail,
      city: addressToUse.city,
      state: addressToUse.state,
      postalCode: addressToUse.postalCode,
      country: addressToUse.country,
    };
  }
}

