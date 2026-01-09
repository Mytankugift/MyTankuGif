import { Router } from 'express';
import { GroupsController } from './groups.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const groupsController = new GroupsController();

/**
 * POST /api/v1/groups
 * Crear un nuevo grupo
 */
router.post('/', authenticate, groupsController.createGroup);

/**
 * GET /api/v1/groups
 * Obtener todos los grupos del usuario
 */
router.get('/', authenticate, groupsController.getGroups);

/**
 * GET /api/v1/groups/recommended
 * Obtener grupos recomendados (plantillas)
 */
router.get('/recommended', authenticate, groupsController.getRecommendedGroups);

/**
 * GET /api/v1/groups/:id
 * Obtener un grupo por ID
 */
router.get('/:id', authenticate, groupsController.getGroupById);

/**
 * PUT /api/v1/groups/:id
 * Actualizar un grupo
 */
router.put('/:id', authenticate, groupsController.updateGroup);

/**
 * DELETE /api/v1/groups/:id
 * Eliminar un grupo
 */
router.delete('/:id', authenticate, groupsController.deleteGroup);

/**
 * POST /api/v1/groups/:id/members
 * Agregar un miembro a un grupo
 */
router.post('/:id/members', authenticate, groupsController.addGroupMember);

/**
 * DELETE /api/v1/groups/:id/members/:memberId
 * Eliminar un miembro de un grupo
 */
router.delete('/:id/members/:memberId', authenticate, groupsController.removeGroupMember);

export default router;
