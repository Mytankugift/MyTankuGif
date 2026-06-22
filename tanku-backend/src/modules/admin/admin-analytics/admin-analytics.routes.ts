import { Router } from 'express';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';
import { analyticsCache } from './analytics-cache.middleware';

const router = Router();
const adminAnalyticsController = new AdminAnalyticsController();

// Todas las rutas requieren autenticación admin
router.use(authenticateAdmin);

// Caché de respuestas GET (las analíticas son iguales para todo admin)
router.use(analyticsCache());

// Rutas (todas aceptan ?from, ?to, ?granularity=day|week|month)
router.get('/overview', adminAnalyticsController.getOverview);
router.get('/sales', adminAnalyticsController.getSales);
router.get('/users', adminAnalyticsController.getUsers);
router.get('/gifts', adminAnalyticsController.getGifts);
router.get('/support', adminAnalyticsController.getSupport);
router.get('/operations', adminAnalyticsController.getOperations);
router.get('/catalog', adminAnalyticsController.getCatalog);
router.get('/social', adminAnalyticsController.getSocial);
router.get('/behavior', adminAnalyticsController.getBehavior);

export default router;
