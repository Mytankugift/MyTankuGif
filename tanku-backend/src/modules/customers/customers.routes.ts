import { Router } from 'express';
import { CustomersController } from './customers.controller';
import { authenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const customersController = new CustomersController();

/**
 * GET /store/customers/me
 * Obtener información del cliente autenticado
 */
router.get('/me', authenticate, customersController.getCurrentCustomer);

/**
 * GET /store/customers/me/addresses
 * Obtener direcciones del cliente autenticado
 */
router.get('/me/addresses', authenticate, customersController.getCustomerAddresses);

/**
 * POST /store/customers/me/addresses
 * Crear dirección para el cliente autenticado
 */
router.post('/me/addresses', authenticate, customersController.createCustomerAddress);

/**
 * PUT /store/customers/me/addresses/:addressId
 * Actualizar dirección del cliente autenticado
 */
router.put('/me/addresses/:addressId', authenticate, customersController.updateCustomerAddress);

/**
 * DELETE /store/customers/me/addresses/:addressId
 * Eliminar dirección del cliente autenticado
 */
router.delete('/me/addresses/:addressId', authenticate, customersController.deleteCustomerAddress);

/**
 * PUT /store/customers/me
 * Actualizar información del cliente autenticado
 */
router.put('/me', authenticate, customersController.updateCustomer);

/**
 * PATCH /store/customers/me
 * Actualizar información del cliente autenticado (alias de PUT)
 */
router.patch('/me', authenticate, customersController.updateCustomer);

export default router;
