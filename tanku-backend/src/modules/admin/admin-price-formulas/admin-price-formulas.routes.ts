import { Router } from 'express';
import { AdminPriceFormulaController } from './admin-price-formulas.controller';
import { authenticateAdmin } from '../admin-auth/admin-auth.middleware';

const router = Router();
const priceFormulaController = new AdminPriceFormulaController();

// Todas las rutas requieren autenticación
router.use(authenticateAdmin);

// Rutas de fórmulas de precio
router.get('/', priceFormulaController.getPriceFormulas);
router.get('/:id', priceFormulaController.getPriceFormulaById);
router.post('/', priceFormulaController.createPriceFormula);
router.patch('/:id', priceFormulaController.updatePriceFormula);
router.delete('/:id', priceFormulaController.deletePriceFormula);

export default router;

