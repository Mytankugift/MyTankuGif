import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/AppError';

export interface CustomerResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
  orders?: any[]; // TODO: Implementar cuando tengamos módulo de órdenes
}

export class CustomersService {
  /**
   * Obtener información del cliente autenticado
   */
  async getCurrentCustomer(userId: string): Promise<CustomerResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        personalInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Construir metadata con información adicional
    const metadata: Record<string, any> = {};
    
    if (user.profile?.avatar) {
      metadata.avatar_url = user.profile.avatar;
      console.log(`🔍 [CUSTOMERS] Avatar encontrado: ${user.profile.avatar}`);
    } else {
      console.log(`⚠️ [CUSTOMERS] No hay avatar para usuario ${userId}`);
    }
    
    if (user.personalInfo?.statusMessage) {
      metadata.status_message = user.personalInfo.statusMessage;
    }
    
    if (user.profile?.banner) {
      metadata.banner_profile_url = user.profile.banner;
    }
    
    if (user.personalInfo?.pseudonym) {
      metadata.pseudonym = user.personalInfo.pseudonym;
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      orders: [], // TODO: Implementar cuando tengamos módulo de órdenes
    };
  }

  /**
   * Obtener direcciones del cliente
   */
  async getCustomerAddresses(userId: string): Promise<any[]> {
    // IMPORTANTE: Con la nueva estructura many-to-many, todas las direcciones pueden ser reutilizadas
    // Mostrar todas las direcciones del usuario (pueden estar asociadas a múltiples órdenes)
    // Si queremos filtrar solo direcciones "guardadas" (sin órdenes), usamos orderAddresses: { none: {} }
    const addresses = await prisma.address.findMany({
      where: { 
        userId,
        // Opcional: Si queremos mostrar solo direcciones que no están en ninguna orden:
        // orderAddresses: { none: {} }
      },
      include: {
        orderAddresses: {
          select: {
            orderId: true,
          },
        },
      },
      orderBy: [
        { isDefaultShipping: 'desc' }, // Predeterminadas primero
        { createdAt: 'desc' },
      ],
    });

    // Formatear direcciones al formato esperado por el frontend
    return addresses.map((addr) => {
      const metadata = addr.metadata as Record<string, any> | null;
      return {
        id: addr.id,
        first_name: addr.firstName,
        last_name: addr.lastName,
        phone: addr.phone || '',
        address_1: addr.address1,
        address_2: addr.detail || '', // Usar detail en lugar de address2
        city: addr.city,
        province: addr.state,
        postal_code: addr.postalCode,
        country_code: addr.country.toLowerCase(),
        is_default_shipping: addr.isDefaultShipping,
        is_default_billing: false, // TODO: Implementar lógica de billing
        metadata: metadata || {},
        created_at: addr.createdAt,
        updated_at: addr.updatedAt,
      };
    });
  }

  /**
   * Crear dirección para el cliente
   */
  async createCustomerAddress(userId: string, addressData: any): Promise<any> {
    // Si se marca como predeterminada, desmarcar las demás
    if (addressData.is_default_shipping) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefaultShipping: false },
      });
    }

    const metadata: Record<string, any> = {};
    if (addressData.metadata?.alias) {
      metadata.alias = addressData.metadata.alias;
    }

    const address = await prisma.address.create({
      data: {
        userId,
        firstName: addressData.first_name,
        lastName: addressData.last_name,
        phone: addressData.phone || null, // Guardar phone correctamente
        address1: addressData.address_1,
        detail: addressData.address_2 || addressData.detail || null, // Usar detail
        city: addressData.city,
        state: addressData.province || addressData.state || '',
        postalCode: addressData.postal_code,
        country: addressData.country_code?.toUpperCase() || 'CO',
        isDefaultShipping: addressData.is_default_shipping || false,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    });

    // Formatear respuesta al formato esperado por el frontend
    return {
      id: address.id,
      first_name: address.firstName,
      last_name: address.lastName,
      phone: address.phone || '',
      address_1: address.address1,
      address_2: address.detail || '',
      city: address.city,
      province: address.state,
      postal_code: address.postalCode,
      country_code: address.country.toLowerCase(),
      is_default_shipping: address.isDefaultShipping,
      is_default_billing: false,
      metadata: (address.metadata as Record<string, any>) || {},
      created_at: address.createdAt,
      updated_at: address.updatedAt,
    };
  }

  /**
   * Actualizar información del cliente
   */
  async updateCustomer(userId: string, updateData: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
  }): Promise<CustomerResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    // Construir objeto de actualización solo con los campos proporcionados
    const updateFields: any = {};
    
    if (updateData.first_name !== undefined) {
      updateFields.firstName = updateData.first_name;
    }
    
    if (updateData.last_name !== undefined) {
      updateFields.lastName = updateData.last_name;
    }
    
    if (updateData.phone !== undefined) {
      updateFields.phone = updateData.phone;
    }
    
    if (updateData.email !== undefined) {
      updateFields.email = updateData.email;
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateFields,
      include: {
        profile: true,
        personalInfo: true,
      },
    });

    // Construir metadata con información adicional
    const metadata: Record<string, any> = {};
    
    if (updatedUser.profile?.avatar) {
      metadata.avatar_url = updatedUser.profile.avatar;
    }
    
    if (updatedUser.personalInfo?.statusMessage) {
      metadata.status_message = updatedUser.personalInfo.statusMessage;
    }
    
    if (updatedUser.profile?.banner) {
      metadata.banner_profile_url = updatedUser.profile.banner;
    }
    
    if (updatedUser.personalInfo?.pseudonym) {
      metadata.pseudonym = updatedUser.personalInfo.pseudonym;
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      phone: updatedUser.phone,
      created_at: updatedUser.createdAt,
      updated_at: updatedUser.updatedAt,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      orders: [], // TODO: Implementar cuando tengamos módulo de órdenes
    };
  }

  /**
   * Actualizar dirección del cliente
   */
  async updateCustomerAddress(userId: string, addressId: string, addressData: any): Promise<any> {
    // Verificar que la dirección pertenece al usuario
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundError('Dirección no encontrada');
    }

    // Si se marca como predeterminada, desmarcar las demás
    if (addressData.is_default_shipping) {
      await prisma.address.updateMany({
        where: { 
          userId,
          id: { not: addressId }, // Excluir la dirección actual
        },
        data: { isDefaultShipping: false },
      });
    }

    const metadata: Record<string, any> = {};
    if (addressData.metadata?.alias) {
      metadata.alias = addressData.metadata.alias;
    } else if (existingAddress.metadata) {
      // Preservar metadata existente si no se proporciona nuevo
      Object.assign(metadata, existingAddress.metadata as Record<string, any>);
    }

    const address = await prisma.address.update({
      where: { id: addressId },
      data: {
        firstName: addressData.first_name,
        lastName: addressData.last_name,
        phone: addressData.phone || null,
        address1: addressData.address_1,
        detail: addressData.address_2 || addressData.detail || null,
        city: addressData.city,
        state: addressData.province || addressData.state || '',
        postalCode: addressData.postal_code,
        country: addressData.country_code?.toUpperCase() || 'CO',
        isDefaultShipping: addressData.is_default_shipping !== undefined ? addressData.is_default_shipping : existingAddress.isDefaultShipping,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      },
    });

    // Formatear respuesta al formato esperado por el frontend
    return {
      id: address.id,
      first_name: address.firstName,
      last_name: address.lastName,
      phone: address.phone || '',
      address_1: address.address1,
      address_2: address.detail || '',
      city: address.city,
      province: address.state,
      postal_code: address.postalCode,
      country_code: address.country.toLowerCase(),
      is_default_shipping: address.isDefaultShipping,
      is_default_billing: false,
      metadata: (address.metadata as Record<string, any>) || {},
      created_at: address.createdAt,
      updated_at: address.updatedAt,
    };
  }

  /**
   * Eliminar dirección del cliente
   */
  async deleteCustomerAddress(userId: string, addressId: string): Promise<void> {
    // Verificar que la dirección pertenece al usuario
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new NotFoundError('Dirección no encontrada');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });
  }
}
