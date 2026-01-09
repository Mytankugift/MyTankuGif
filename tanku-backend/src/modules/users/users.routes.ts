import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { uploadAvatar, uploadBanner } from '../../shared/middleware/upload.middleware';

const router = Router();
const usersController = new UsersController();

// ==================== USER BASIC INFO ====================

/**
 * GET /api/v1/users/me
 * Obtener usuario actual con direcciones
 */
router.get('/me', authenticate, usersController.getCurrentUser);

/**
 * PUT /api/v1/users/me
 * Actualizar información del usuario (firstName, lastName, phone, email)
 */
router.put('/me', authenticate, usersController.updateCurrentUser);

// ==================== USER PROFILE ====================

/**
 * GET /api/v1/users/me/profile
 * Obtener perfil del usuario (avatar, banner, bio)
 */
router.get('/me/profile', authenticate, usersController.getUserProfile);

/**
 * PUT /api/v1/users/me/profile
 * Actualizar perfil del usuario (bio)
 */
router.put('/me/profile', authenticate, usersController.updateUserProfile);

/**
 * POST /api/v1/users/me/profile/avatar
 * Actualizar avatar del usuario (upload de archivo)
 */
router.post('/me/profile/avatar', authenticate, uploadAvatar, usersController.updateUserProfileAvatar);

/**
 * POST /api/v1/users/me/profile/banner
 * Actualizar banner del usuario (upload de archivo)
 */
router.post('/me/profile/banner', authenticate, uploadBanner, usersController.updateUserProfileBanner);

// ==================== PERSONAL INFORMATION ====================

/**
 * GET /api/v1/users/me/personal-info
 * Obtener información personal del usuario (pseudonym, statusMessage)
 */
router.get('/me/personal-info', authenticate, usersController.getPersonalInformation);

/**
 * PUT /api/v1/users/me/personal-info
 * Actualizar información personal del usuario
 */
router.put('/me/personal-info', authenticate, usersController.updatePersonalInformation);

// ==================== ONBOARDING DATA ====================

/**
 * GET /api/v1/users/me/onboarding-data
 * Obtener datos de onboarding del usuario
 */
router.get('/me/onboarding-data', authenticate, usersController.getOnboardingData);

/**
 * PUT /api/v1/users/me/onboarding-data
 * Actualizar datos de onboarding del usuario
 */
router.put('/me/onboarding-data', authenticate, usersController.updateOnboardingData);

// ==================== ADDRESSES ====================

/**
 * GET /api/v1/users/me/addresses
 * Obtener direcciones del usuario
 */
router.get('/me/addresses', authenticate, usersController.getUserAddresses);

/**
 * POST /api/v1/users/me/addresses
 * Crear dirección para el usuario
 */
router.post('/me/addresses', authenticate, usersController.createUserAddress);

/**
 * PUT /api/v1/users/me/addresses/:addressId
 * Actualizar dirección del usuario
 */
router.put('/me/addresses/:addressId', authenticate, usersController.updateUserAddress);

/**
 * DELETE /api/v1/users/me/addresses/:addressId
 * Eliminar dirección del usuario
 */
router.delete('/me/addresses/:addressId', authenticate, usersController.deleteUserAddress);

export default router;

