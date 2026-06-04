import { Router } from 'express';
import { SupportCasesController } from './support-cases.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { uploadSupportEvidence } from '../../shared/middleware/upload.middleware';

const router = Router();
const controller = new SupportCasesController();

router.post('/', authenticate, uploadSupportEvidence, controller.createCase);
router.get('/', authenticate, controller.listCases);
router.get('/:id', authenticate, controller.getCaseById);
router.post('/:id/reply', authenticate, controller.addUserReply);

export default router;
