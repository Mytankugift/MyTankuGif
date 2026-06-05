import { Router } from 'express';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';
import { AdminFeedGlobalAccountsController } from './admin-feed-global-accounts.controller';

const router = Router();
const controller = new AdminFeedGlobalAccountsController();

router.use(authenticateAdmin);

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.update);

export default router;
