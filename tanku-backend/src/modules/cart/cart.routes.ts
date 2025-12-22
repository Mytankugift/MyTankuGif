import { Router } from 'express';
import { CartController } from './cart.controller';
import { optionalAuthenticate } from '../../shared/middleware/auth.middleware';

const router = Router();
const cartController = new CartController();

/**
 * IMPORTANTE: Orden de rutas crítico
 * Las rutas fijas SIEMPRE deben ir ANTES de las rutas dinámicas (/:id)
 * De lo contrario, Express capturará "/add-item" como "/:id" con id="add-item"
 */

/**
 * POST /store/cart/add-item
 * Agregar item al carrito (ruta fija - debe ir ANTES de /:id)
 * Usa autenticación opcional para obtener userId si está disponible
 */
router.post('/add-item', optionalAuthenticate, cartController.addItem);

/**
 * POST /store/cart/update-item
 * Actualizar cantidad de item (ruta fija - debe ir ANTES de /:id)
 * Usa autenticación opcional para obtener userId si está disponible
 */
router.post('/update-item', optionalAuthenticate, cartController.updateItem);

/**
 * DELETE /store/cart/delete-item
 * Eliminar item del carrito (ruta fija - debe ir ANTES de /:id)
 */
router.delete('/delete-item', cartController.deleteItem);

/**
 * POST /store/carts
 * Crear carrito nuevo (ruta fija - debe ir ANTES de /:id)
 * Usa autenticación opcional para obtener userId si está disponible
 */
router.post('/', optionalAuthenticate, cartController.createCart);

/**
 * GET /store/carts/:id
 * Obtener carrito por ID (ruta dinámica - debe ir DESPUÉS de las fijas)
 */
router.get('/:id', cartController.getCart);

/**
 * POST /store/carts/:id
 * Actualizar carrito (ruta dinámica - debe ir DESPUÉS de las fijas)
 */
router.post('/:id', cartController.updateCart);

export default router;
