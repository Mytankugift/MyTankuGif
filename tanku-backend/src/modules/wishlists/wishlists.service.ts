import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../shared/errors/AppError';
import { WishListDTO, WishListItemDTO } from '../../shared/dto/wishlists.dto';
import type { WishList, WishListItem } from '@prisma/client';
import { env } from '../../config/env';
import { FeedService } from '../feed/feed.service';
import * as crypto from 'crypto';

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
   * Generar slug desde el nombre de la wishlist
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/(^-|-$)/g, '') // Remover guiones al inicio y final
      .substring(0, 100); // Limitar longitud
  }

  /**
   * Generar ID corto desde el ID completo (primeros 8 caracteres)
   */
  private generateShortId(id: string): string {
    return id.substring(0, 8);
  }

  /**
   * Mapper: WishListItem de Prisma a WishListItemDTO
   */
  private mapWishListItemToDTO(
    item: WishListItem & {
      product: { id: string; title: string; handle: string; images: string[] };
      variant?: { id: string; title: string; price: number; suggestedPrice?: number | null; tankuPrice: number | null } | null;
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
            tankuPrice: item.variant.tankuPrice || 0, // Precio final (tankuPrice)
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
                tankuPrice: true,
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
      variant?: { id: string; title: string; price: number; suggestedPrice: number | null; tankuPrice: number | null; sku: string } | null;
    }
  ): WishListItemDTO {
    // Mapear variantes del producto completo
    const variants = item.product.variants?.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      tankuPrice: v.tankuPrice || 0, // Precio final (tankuPrice)
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
            tankuPrice: item.variant.tankuPrice || 0,
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
                suggestedPrice: true,
                tankuPrice: true,
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
                suggestedPrice: true,
                tankuPrice: true,
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
      // IMPORTANTE: Usar la misma lógica que el feed (ordenar por price asc)
      const onlyVariant = await prisma.productVariant.findFirst({
        where: { productId, active: true },
        select: { id: true },
        orderBy: { price: 'asc' }, // Cambiar de createdAt a price para consistencia con feed
      });

      const secondVariant = await prisma.productVariant.findFirst({
        where: { productId, active: true, NOT: { id: onlyVariant?.id } },
        select: { id: true },
        orderBy: { price: 'asc' }, // Cambiar de createdAt a price para consistencia con feed
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
                suggestedPrice: true,
                tankuPrice: true,
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

  /**
   * Guardar wishlist de otro usuario
   */
  async saveWishlist(wishListId: string, userId: string): Promise<void> {
    // Verificar que la wishlist existe
    const wishList = await prisma.wishList.findUnique({
      where: { id: wishListId },
      include: { user: true },
    });

    if (!wishList) {
      throw new NotFoundError('Wish list no encontrada');
    }

    // No se puede guardar tu propia wishlist
    if (wishList.userId === userId) {
      throw new BadRequestError('No puedes guardar tu propia wish list');
    }

    // Verificar que no esté ya guardada
    const existing = await prisma.savedWishlist.findUnique({
      where: {
        userId_wishListId: {
          userId,
          wishListId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Ya tienes esta wish list guardada');
    }

    // Guardar la wishlist
    await prisma.savedWishlist.create({
      data: {
        userId,
        wishListId,
      },
    });
  }

  /**
   * Desguardar wishlist
   */
  async unsaveWishlist(wishListId: string, userId: string): Promise<void> {
    const saved = await prisma.savedWishlist.findUnique({
      where: {
        userId_wishListId: {
          userId,
          wishListId,
        },
      },
    });

    if (!saved) {
      throw new NotFoundError('Wish list guardada no encontrada');
    }

    await prisma.savedWishlist.delete({
      where: {
        userId_wishListId: {
          userId,
          wishListId,
        },
      },
    });
  }

  /**
   * Obtener wishlists guardadas por el usuario
   */
  async getSavedWishlists(userId: string): Promise<WishListDTO[]> {
    const saved = await prisma.savedWishlist.findMany({
      where: { userId },
      include: {
        wishList: {
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
                    tankuPrice: true,
                  },
                },
              },
            },
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return saved.map((s) => {
      const dto = this.mapWishListToDTO(s.wishList);
      // Agregar información del usuario propietario (user y userId para compatibilidad con frontend)
      return {
        ...dto,
        userId: s.wishList.user.id, // Agregar userId para agrupar por usuario
        user: {
          id: s.wishList.user.id,
          firstName: s.wishList.user.firstName,
          lastName: s.wishList.user.lastName,
          email: s.wishList.user.email,
          username: s.wishList.user.username || null, // Agregar username
          profile: s.wishList.user.profile
            ? {
                avatar: s.wishList.user.profile.avatar,
                banner: s.wishList.user.profile.banner,
                bio: s.wishList.user.profile.bio,
              }
            : null,
        },
      } as any;
    });
  }

  /**
   * Generar token de compartir para wishlist y retornar URL SEO
   */
  async generateShareToken(wishListId: string, userId: string): Promise<{ token: string; shareUrl: string }> {
    const wishList = await prisma.wishList.findUnique({
      where: { id: wishListId },
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!wishList) {
      throw new NotFoundError('Wish list no encontrada');
    }

    if (wishList.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para compartir esta wish list');
    }

    // Generar token único (mantener para compatibilidad con búsqueda)
    const token = crypto.randomBytes(32).toString('hex');

    await prisma.wishList.update({
      where: { id: wishListId },
      data: { shareToken: token },
    });

    // Generar URL SEO: /wishlists/share/{username}/{slug}-{shortId}
    const username = wishList.user.username || 'user';
    const slug = this.generateSlug(wishList.name);
    const shortId = this.generateShortId(wishListId);
    const shareUrl = `/wishlists/share/${username}/${slug}-${shortId}`;

    return { token, shareUrl };
  }

  /**
   * Obtener wishlist por token de compartir o por URL SEO (público)
   * Acepta tanto el token antiguo como el nuevo formato: {username}/{slug}-{shortId}
   */
  async getWishlistByShareToken(tokenOrPath: string): Promise<WishListDTO | null> {
    let wishList = null;

    // Si es un token hexadecimal (64 caracteres), buscar directamente
    if (/^[a-f0-9]{64}$/i.test(tokenOrPath)) {
      wishList = await prisma.wishList.findUnique({
        where: { shareToken: tokenOrPath },
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
                  suggestedPrice: true,
                  tankuPrice: true,
                },
              },
            },
          },
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    } else {
      // Formato SEO: {username}/{slug}-{shortId}
      // Ejemplo: "soydavidchang/mi-wishlist-cumpleanos-cmkecoi8"
      const parts = tokenOrPath.split('/');
      if (parts.length === 2) {
        const [username, slugWithId] = parts;
        // Extraer el shortId (últimos 8 caracteres después del último guión)
        const lastDashIndex = slugWithId.lastIndexOf('-');
        if (lastDashIndex > 0) {
          const shortId = slugWithId.substring(lastDashIndex + 1);
          
          // Buscar wishlist por username y shortId
          // Primero obtener el usuario
          const user = await prisma.user.findUnique({
            where: { username },
            select: { id: true },
          });

          if (user) {
            // Buscar wishlists del usuario que empiecen con el shortId
            const wishLists = await prisma.wishList.findMany({
              where: {
                userId: user.id,
                shareToken: { not: null }, // Solo wishlists compartidas
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
                        suggestedPrice: true,
                        tankuPrice: true,
                      },
                    },
                  },
                },
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            });

            // Encontrar la wishlist cuyo ID empieza con el shortId
            wishList = wishLists.find((wl) => wl.id.startsWith(shortId)) || null;
          }
        }
      }
    }

    if (!wishList) {
      return null;
    }

    return this.mapWishListToDTO(wishList);
  }

  /**
   * Obtener wishlists de un usuario considerando privacidad y amistad
   */
  async getUserWishListsWithPrivacy(
    targetUserId: string,
    viewerUserId?: string
  ): Promise<{ wishlists: WishListDTO[]; canViewPrivate: boolean }> {
    const isOwnProfile = viewerUserId === targetUserId;

    // Si es el propio perfil, devolver todas las wishlists
    if (isOwnProfile) {
      const wishLists = await this.getUserWishLists(targetUserId);
      return { wishlists: wishLists, canViewPrivate: true };
    }

    // Si no hay viewer, solo devolver públicas
    if (!viewerUserId) {
      const wishLists = await this.getUserWishLists(targetUserId);
      return {
        wishlists: wishLists.filter((w) => w.public),
        canViewPrivate: false,
      };
    }

    // Verificar si son amigos
    const { FriendsService } = await import('../friends/friends.service');
    const friendsService = new FriendsService();
    const areFriends = await friendsService.areFriends(viewerUserId, targetUserId);

    const wishLists = await this.getUserWishLists(targetUserId);

    if (areFriends) {
      // Si son amigos, mostrar todas (públicas y privadas)
      return { wishlists: wishLists, canViewPrivate: true };
    } else {
      // Si no son amigos, solo mostrar públicas y nombres de privadas
      const publicWishlists = wishLists.filter((w) => w.public);
      const privateWishlists = wishLists
        .filter((w) => !w.public)
        .map((w) => ({
          ...w,
          items: [], // Ocultar items de wishlists privadas
        }));

      return {
        wishlists: [...publicWishlists, ...privateWishlists],
        canViewPrivate: false,
      };
    }
  }
}

