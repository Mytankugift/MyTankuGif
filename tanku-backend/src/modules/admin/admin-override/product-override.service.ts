import { prisma } from '../../../config/database';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';

/**
 * Servicio para manejar el bloqueo de productos por admin
 * Bloqueo simplificado: bloquea el producto completo (no campo por campo)
 */
export class ProductOverrideService {
  /**
   * Bloquear producto completo
   * Cuando un producto está bloqueado, los workers solo actualizan stock
   */
  async lockProduct(productId: string, adminUserId: string): Promise<void> {
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Si ya está bloqueado, no hacer nada (idempotente)
    if (product.lockedByAdmin && product.lockedBy === adminUserId) {
      return;
    }

    // Bloquear producto
    await prisma.product.update({
      where: { id: productId },
      data: {
        lockedByAdmin: true,
        lockedAt: new Date(),
        lockedBy: adminUserId,
      },
    });

    console.log(`[PRODUCT OVERRIDE] Producto ${productId} bloqueado por admin ${adminUserId}`);
  }

  /**
   * Desbloquear producto
   * Solo SUPER_ADMIN puede desbloquear (se valida en el controller)
   */
  async unlockProduct(productId: string, adminUserId: string): Promise<void> {
    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Si no está bloqueado, no hacer nada (idempotente)
    if (!product.lockedByAdmin) {
      return;
    }

    // Desbloquear producto
    await prisma.product.update({
      where: { id: productId },
      data: {
        lockedByAdmin: false,
        lockedAt: null,
        lockedBy: null,
      },
    });

    console.log(`[PRODUCT OVERRIDE] Producto ${productId} desbloqueado por admin ${adminUserId}`);
  }

  /**
   * Verificar si un producto está bloqueado
   */
  async isLocked(productId: string): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        lockedByAdmin: true,
      },
    });

    if (!product) {
      return false;
    }

    return product.lockedByAdmin;
  }

  /**
   * Obtener información del bloqueo
   */
  async getLockInfo(productId: string): Promise<{
    locked: boolean;
    lockedAt: Date | null;
    lockedBy: string | null;
    locker: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        locker: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    return {
      locked: product.lockedByAdmin,
      lockedAt: product.lockedAt,
      lockedBy: product.lockedBy,
      locker: product.locker,
    };
  }
}


