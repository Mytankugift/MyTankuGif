import { Request, Response, NextFunction } from 'express';
import { FeedService } from './feed.service';
import { CategoriesService } from '../products/categories.service';
import { CartService } from '../cart/cart.service';
import { StoriesService } from '../stories/stories.service';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';
import { successResponse } from '../../shared/response';
import { RequestWithUser } from '../../shared/types';

export class FeedController {
  private feedService: FeedService;
  private categoriesService: CategoriesService;
  private cartService: CartService;
  private storiesService: StoriesService;
  private chatService: ChatService;
  private notificationsService: NotificationsService;
  private authService: AuthService;
  private usersService: UsersService;

  constructor() {
    this.feedService = new FeedService();
    this.categoriesService = new CategoriesService();
    this.cartService = new CartService();
    this.storiesService = new StoriesService();
    this.chatService = new ChatService();
    this.notificationsService = new NotificationsService();
    this.authService = new AuthService();
    this.usersService = new UsersService();
  }

  /**
   * GET /api/v1/feed
   * Obtener feed combinado (productos + posters) con cursor-based pagination
   * 
   * Headers:
   * - X-Feed-Cursor: Token del cursor para paginación (opcional)
   * 
   * Nota: limit y postsPerProducts están hardcodeados en el backend
   */
  getFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as RequestWithUser).user?.id;
      
      // Leer cursor token del header (case-insensitive)
      const cursorToken = req.headers['x-feed-cursor'] as string | undefined;
      
      // Leer categoryId de query params (opcional)
      const categoryId = req.query.categoryId as string | undefined;
      
      // Leer search de query params (opcional)
      const search = req.query.search as string | undefined;

      const feed = await this.feedService.getFeed(cursorToken, userId, categoryId, search);

      res.status(200).json(successResponse(feed));
    } catch (error: any) {
      console.error(`\n❌ [FEED-CONTROLLER] ========== ERROR OBTENIENDO FEED ==========`);
      console.error(`❌ [FEED-CONTROLLER] Error:`, error?.message);
      console.error(`❌ [FEED-CONTROLLER] Stack:`, error?.stack);
      console.error(`❌ [FEED-CONTROLLER] Name:`, error?.name);
      
      // Si es error de tabla no existente (P2021), retornar feed vacío en lugar de error 500
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('global_ranking')) {
        console.warn(`⚠️ [FEED-CONTROLLER] Tabla global_ranking no existe. Retornando feed vacío.`);
        console.warn(`⚠️ [FEED-CONTROLLER] Para habilitar productos, ejecutar: npm run fix:feed:tables`);
        // Retornar feed vacío para que el frontend no falle
        return res.status(200).json(successResponse({
          items: [],
          nextCursorToken: null,
          hasMore: false,
        }));
      }
      
      // Si el error es relacionado con Prisma, agregar información adicional
      if (error?.code?.startsWith('P') || error?.message?.includes('model') || error?.message?.includes('GlobalRanking')) {
        console.error(`❌ [FEED-CONTROLLER] Error de Prisma - Verificar que el modelo GlobalRanking exista`);
        console.error(`❌ [FEED-CONTROLLER] Ejecutar: npx prisma generate`);
        // Retornar feed vacío en lugar de error 500
        return res.status(200).json(successResponse({
          items: [],
          nextCursorToken: null,
          hasMore: false,
        }));
      }
      
      console.error(`❌ [FEED-CONTROLLER] ==========================================\n`);
      next(error);
    }
  };

  /**
   * GET /api/v1/feed/public
   * Obtener feed público (solo productos, sin posters, sin autenticación)
   * Cacheable y limitado a 100 productos máximo
   * 
   * Headers:
   * - X-Feed-Cursor: Token del cursor para paginación (opcional)
   * 
   * Query params:
   * - categoryId: ID de categoría para filtrar (opcional)
   * - search: Query de búsqueda para filtrar productos (opcional)
   */
  getPublicFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Leer cursor token del header (case-insensitive)
      const cursorToken = req.headers['x-feed-cursor'] as string | undefined;
      
      // Leer categoryId de query params (opcional)
      const categoryId = req.query.categoryId as string | undefined;
      
      // Leer search de query params (opcional)
      const search = req.query.search as string | undefined;

      const feed = await this.feedService.getPublicFeed(cursorToken, categoryId, search);

      res.status(200).json(successResponse(feed));
    } catch (error: any) {
      console.error(`❌ [FEED-CONTROLLER] Error obteniendo feed público:`, error?.message);
      console.error(`❌ [FEED-CONTROLLER] Stack:`, error?.stack);
      
      // Retornar feed vacío en lugar de error 500
      return res.status(200).json(successResponse({
        items: [],
        nextCursorToken: null,
      }));
    }
  };

  /**
   * GET /api/v1/feed/init
   * Endpoint batch para inicialización del feed
   * Retorna todos los datos necesarios para cargar el feed en una sola petición
   * 
   * Retorna:
   * - feed: FeedResponseDTO
   * - categories: CategoryDTO[]
   * - cart: CartDTO | null
   * - stories: StoryDTO[]
   * - conversations: ConversationWithParticipants[]
   * - unreadCounts: { chat: number, notifications: number }
   * - notifications: NotificationDTO[]
   * - user: UserPublicDTO | null
   */
  getFeedInit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as RequestWithUser).user?.id;
      
      // Ejecutar todas las llamadas en paralelo para mejor performance
      const [
        feed,
        categories,
        cart,
        stories,
        conversations,
        chatUnreadCount,
        notifications,
        notificationUnreadCount,
        user,
        onboardingData
      ] = await Promise.all([
        // Feed
        this.feedService.getFeed(undefined, userId),
        
        // Categorías
        this.categoriesService.listCategoriesNormalized(),
        
        // Carrito (con manejo de errores si no autenticado)
        userId 
          ? this.cartService.getUserCart(userId).catch(() => null)
          : Promise.resolve(null),
        
        // Stories (con manejo de errores si no autenticado)
        userId 
          ? this.storiesService.getFeedStories(userId, 50).catch(() => [])
          : Promise.resolve([]),
        
        // Conversaciones (con manejo de errores si no autenticado)
        userId 
          ? this.chatService.getConversations(userId).catch(() => [])
          : Promise.resolve([]),
        
        // Contador de chat no leídos (con manejo de errores si no autenticado)
        userId 
          ? this.chatService.getUnreadCount(userId).catch(() => 0)
          : Promise.resolve(0),
        
        // Notificaciones (con manejo de errores si no autenticado)
        userId 
          ? this.notificationsService.getNotifications(userId, { limit: 10 }).catch(() => [])
          : Promise.resolve([]),
        
        // Contador de notificaciones no leídas (con manejo de errores si no autenticado)
        userId 
          ? this.notificationsService.getUnreadCount(userId).catch(() => ({ unreadCount: 0, totalCount: 0 }))
          : Promise.resolve({ unreadCount: 0, totalCount: 0 }),
        
        // Usuario actual (solo si autenticado)
        userId 
          ? this.authService.getCurrentUser(userId).catch(() => null)
          : Promise.resolve(null),
        
        // Datos de onboarding (solo si autenticado)
        userId 
          ? this.usersService.getOnboardingData(userId).catch(() => null)
          : Promise.resolve(null)
      ]);
      
      res.status(200).json(successResponse({
        feed,
        categories,
        cart,
        stories,
        conversations,
        unreadCounts: {
          chat: chatUnreadCount || 0,
          notifications: notificationUnreadCount?.unreadCount || 0
        },
        notifications,
        user,
        onboardingData
      }));
    } catch (error: any) {
      console.error(`❌ [FEED-CONTROLLER] Error en getFeedInit:`, error?.message);
      console.error(`❌ [FEED-CONTROLLER] Stack:`, error?.stack);
      next(error);
    }
  };
}

