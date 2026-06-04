import { Router } from 'express';
import { AdminSupportCasesController } from './admin-support-cases.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';

const router = Router();
const controller = new AdminSupportCasesController();

router.use(authenticateAdmin);

router.get('/', controller.listCases);
router.post('/:id/take', controller.takeCase);
router.post('/:id/start-review', controller.startReview);
router.post('/:id/wait-for-user', controller.waitForUser);
router.post('/:id/messages', controller.addMessage);
router.post('/:id/notes', controller.addNote);
router.post('/:id/resolve', controller.resolveCase);
router.post('/:id/close', controller.closeCase);
router.get('/:id/dropi-preview', controller.previewDropi);
router.post('/:id/dropi-refresh', controller.refreshDropi);
router.patch('/:id/status', controller.updateCaseStatus);
router.get('/:id', controller.getCaseById);

export default router;
