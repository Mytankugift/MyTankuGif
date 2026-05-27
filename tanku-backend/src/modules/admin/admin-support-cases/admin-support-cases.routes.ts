import { Router } from 'express';
import { AdminSupportCasesController } from './admin-support-cases.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';

const router = Router();
const controller = new AdminSupportCasesController();

router.use(authenticateAdmin);

router.get('/', controller.listCases);
router.patch('/:id/status', controller.updateCaseStatus);
router.get('/:id', controller.getCaseById);

export default router;
