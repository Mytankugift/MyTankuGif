import { Router } from 'express';
import { ConsentController } from './consent.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const consentController = new ConsentController();

router.post('/', authenticate, consentController.saveConsent);

export default router;

