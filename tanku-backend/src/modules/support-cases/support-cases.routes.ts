import { Router } from 'express';
import { SupportCasesController } from './support-cases.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const controller = new SupportCasesController();

router.post('/', authenticate, controller.createCase);
router.get('/', authenticate, controller.listCases);
router.get('/:id', authenticate, controller.getCaseById);

export default router;
