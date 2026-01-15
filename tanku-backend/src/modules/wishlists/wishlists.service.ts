import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../shared/errors/AppError';
import { WishListDTO, WishListItemDTO } from '../../shared/dto/wishlists.dto';
import type { WishList, WishListItem } from '@prisma/client';
import { env } from '../../config/env';
import { FeedService } from '../feed/feed.service';

export class WishListsService {
  private feedService: FeedService;

  constructor() {
    this.feedService = new FeedService();
  }

  /**
   * Normalizar URL de imagen
   */
  private normalizeImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${cdnBase}/${cleanPath}`;
  }

  /**
   * Mapper: WishListItem de Prisma a WishListItemDTO
   */
  private mapWishListItemToDTO(
    item: WishListItem & {
      product: { id: string; title: string; handle: string; images: string[] };
      variant?: { id: string; title: string; price: number } | null;
    }
  ): WishListItemDTO {
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || null,
      variant: item.variant
        ? {
            id: item.variant.id,
            title: item.variant.title,
            price: item.variant.price,
          }
        : null,
      product: {
        id: item.product.id,
        title: item.product.title,
        handle: item.product.handle,
        thumbnail: this.normalizeImageUrl(item.product.images?.[0]),
      },
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Mapper: WishList de Prisma a WishListDTO
   */
  private mapWishListToDTO(wishList: WishList & { items: (WishListItem & { product: { id: string; title: string; handle: string; images: string[] } })[] }): WishListDTO {
    return {
      id: wishList.id,
      userId: wishList.userId,
      name: wishList.name,
      public: wishList.public,
      items: wishList.items.map((item) => this.mapWishListItemToDTO(item)),
      createdAt: wishList.createdAt.toISOString(),
      updatedAt: wishList.updatedAt.toISOString(),
    };
  }

  /**
   * Obtener wish lists de un usuario
   */
  async getUserWishLists(userId: string): Promise<WishListDTO[]> {
    const wishLists = await prisma.wishList.findMany({
      where: {
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                variants: {
                  where: {
                    active: true,
                  },
                  include: {
                    warehouseVariants: {
                      select: {
                        stock: true,
                      },
                    },
                  },
                  orderBy: {
                    price: 'asc',
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                price: true,
                suggestedPrice: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return wishLists.map((list) => this.mapWishListToDTOComplete(list));
  }

  /**
   * Mapper: WishListItem con producto completo de Prisma a WishListItemDTO
   */
  private mapWishListItemToDTOComplete(
    item: WishListItem & {
      product: any; // Product con todas sus relaciones
      variant?: { id: string; title: string; price: number; suggestedPrice: number | null; sku: string } | null;
    }
  ): WishListItemDTO {
    // Mapear variantes del producto completo
    const variants = item.product.variants?.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price: v.price,
      suggestedPrice: v.suggestedPrice,
      stock: v.warehouseVariants?.reduce((sum: number, wv: any) => sum + (wv.stock || 0), 0) || 0,
      active: v.active,
    })) || [];

    // Normalizar imágenes
    const images = Array.isArray(item.product.images) 
      ? item.product.images.map((img: string) => this.normalizeImageUrl(img)).filter((img: string | null) => img !== null)
      : [];

    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId || null,
      variant: item.variant
        ? {
            id: item.variant.id,
            title: item.variant.title,
            price: item.variant.price,
          }
        : null,
      product: {
        id: item.product.id,
        title: item.product.title,
        handle: item.product.handle,
        thumbnail: this.normalizeImageUrl(item.product.images?.[0]),
        // Agregar información completa del producto
        images: images as string[],
        variants: variants,
        description: item.product.description || undefined,
        category: item.product.category ? {
          id: item.product.category.id,
          name: item.product.category.name,
          handle: item.product.category.handle,
        } : undefined,
        active: item.product.active !== false,
      },
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Mapper: WishList con productos completos de Prisma a WishListDTO
   */
  private mapWishListToDTOComplete(wishList: WishList & { items: any[] }): WishListDTO {
    return {
      id: wishList.id,
      userId: wishList.userId,
      name: wishList.name,
      public: wishList.public,
      items: wishList.items.map((item) => this.mapWishListItemToDTOComplete(item)),
      createdAt: wishList.createdAt.toISOString(),
      updatedAt: wishList.updatedAt.toISOString(),
    };
  }

  /**
   * Crear nueva wish list
   */
  async createWishList(userId: string, name: string, isPublic: boolean = false): Promise<WishListDTO> {
    if (!name || name.trim().length === 0) {
      throw new BadRequestError('El nombre de la wish list es requerido');
    }

    const wishList = await prisma.wishList.create({
      data: {
        userId,
        name: name.trim(),
        public: isPublic,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return this.mapWishListToDTO(wishList);
  }

  /**
   * Actualizar wish list (nombre y visibilidad)
   */
  async updateWishList(
    wishListId: string,
    userId: string,
    name?: string,
    isPublic?: boolean
  ): Promise<WishListDTO> {
    const wishList = await prisma.wishList.findUnique({
      where: { id: wishListId },
    });

    if (!wishList) {
      throw new NotFoundError('Wish list no encontrada');
    }

    if (wishList.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para editar esta wish list');
    }

    const updateData: { name?: string; public?: boolean } = {};
    if (name !== undefined) {
      if (!name.trim()) {
        throw new BadRequestError('El nombre no puede estar vacío');
      }
      updateData.name = name.trim();
    }
    if (isPublic !== undefined) {
      updateData.public = isPublic;
    }

    const updated = await prisma.wishList.update({
      where: { id: wishListId },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                handle: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                title: true,
                price: true,
              },
            },
          },
        },
      },
    });

    return this.mapWishListToDTO(updated);
  }

  /**
   * Eliminar wish list
   */
  async deleteWishList(wishListId: string, userId: string): Promise<void> {
    const wishList = await prisma.wishList.findUnique({
      where: { id: wishListId },
      include: { items: true },
    });

    if (!wishList) {
      throw new NotFoundError('Wish list no encontrada');
    }

    if (wishList.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para eliminar esta wish list');
    }

    // Actualizar métricas del feed para cada producto antes de eliminar
    for (const item of wishList.items) {
      try {
        const currentMetrics = await (prisma as any).itemMetric.findUnique({
          where: {
            itemId_itemType: {
              itemId: item.productId,
              itemType: 'product',
            },
          },
        });

        const currentCount = currentMetrics?.wishlistCount || 0;
        const newCount = Math.max(0, currentCount - 1);

        await this.feedService.updateItemMetricsDebounced(item.productId, 'product', {
          wishlistCount: newCount,
        });
      } catch (error) {
        console.error(`Error actualizando métricas para producto ${item.productId}:`, error);
        // No fallar si la actualización de métricas falla
      }
    }

    // Eliminar la wish list (cascade delete eliminará los items)
    await prisma.wishList.delete({
      where: { id: wishListId },
    });
  }

  /**
   * Agregar producto a wish list
   */
  async addItemToWishList(
    wishListId: string,
    productId: string,
    userId: string,
    variantId?: string
  ): Promise<WishListItemDTO> {
    // Verificar que la wish list existe y pertenece al usuario
    const wishList = await prisma.wishList.findUnique({
      where: { id: wishListId },
    });

    if (!wishList) {
      throw new NotFoundError('Wish list no encontrada');
    }

    if (wishList.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para agregar items a esta wish list');
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Si se especifica variantId, verificar que existe y pertenece al producto
    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant || variant.productId !== productId) {
        throw new BadRequestError('La variante no pertenece a este producto');
      }
    } else {
      // Si NO se especifica variantId y el producto solo tiene 1 variante activa,
      // guardamos automáticamente esa variante para que el item tenga precio/variante.
      const onlyVariant = await prisma.productVariant.findFirst({
        where: { productId, active: true },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      const secondVariant = await prisma.productVariant.findFirst({
        where: { productId, active: true, NOT: { id: onlyVariant?.id } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });

      if (onlyVariant && !secondVariant) {
        variantId = onlyVariant.id;
      }
    }

    // Verificar que el producto no esté ya en la wish list (mismo producto y misma variante si aplica)
    const existingItem = await prisma.wishListItem.findFirst({
      where: {
        wishListId,
        productId,
        variantId: variantId || null,
      },
    });

    if (existingItem) {
      throw new ConflictError('El producto ya está en esta wish list');
    }

    // Crear el item
    const item = await prisma.wishListItem.create({
      data: {
        wishListId,
        productId,
        variantId: variantId || null,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            handle: true,
            images: true,
          },
        },
        variant: variantId
          ? {
              select: {
                id: true,
                title: true,
                price: true,
              },
            }
          : undefined,
      },
    });

    // Actualizar métricas del feed
    try {
      const currentMetrics = await (prisma as any).itemMetric.findUnique({
        where: {
          itemId_itemType: {
            itemId: productId,
            itemType: 'product',
          },
        },
      });

      const currentCount = currentMetrics?.wishlistCount || 0;
      await this.feedService.updateItemMetricsDebounced(productId, 'product', {
        wishlistCount: currentCount + 1,
      });
    } catch (error) {
      console.error(`Error actualizando métricas para producto ${productId}:`, error);
      // No fallar si la actualización de métricas falla
    }

    return this.mapWishListItemToDTO(item);
  }

  /**
   * Remover producto de wish list
   */
  async removeItemFromWishList(wishListId: string, itemId: string, userId: string): Promise<void> {
    // Verificar que el item existe
    const item = await prisma.wishListItem.findUnique({
      where: { id: itemId },
      include: {
        wishList: true,
      },
    });

    if (!item) {
      throw new NotFoundError('Item no encontrado');
    }

    if (item.wishList.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para remover items de esta wish list');
    }

    if (item.wishListId !== wishListId) {
      throw new BadRequestError('El item no pertenece a esta wish list');
    }

    const productId = item.productId;

    // Eliminar el item
    await prisma.wishListItem.delete({
      where: { id: itemId },
    });

    // Actualizar métricas del feed
    try {
      const currentMetrics = await (prisma as any).itemMetric.findUnique({
        where: {
          itemId_itemType: {
            itemId: productId,
            itemType: 'product',
          },
        },
      });

      const currentCount = currentMetrics?.wishlistCount || 0;
      const newCount = Math.max(0, currentCount - 1);

      await this.feedService.updateItemMetricsDebounced(productId, 'product', {
        wishlistCount: newCount,
      });
    } catch (error) {
      console.error(`Error actualizando métricas para producto ${productId}:`, error);
      // No fallar si la actualización de métricas falla
    }
  }
}

