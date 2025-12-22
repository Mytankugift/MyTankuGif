import { Request, Response, NextFunction } from 'express';
import { CustomersService } from './customers.service';
import { RequestWithUser } from '../../shared/types';

export class CustomersController {
  private customersService: CustomersService;

  constructor() {
    this.customersService = new CustomersService();
  }

  /**
   * GET /store/customers/me
   * Obtener información del cliente autenticado
   * Devuelve customer con direcciones embebidas (formato Medusa-compatible)
   */
  getCurrentCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      // Obtener customer y direcciones
      const customer = await this.customersService.getCurrentCustomer(requestWithUser.user.id);
      const addresses = await this.customersService.getCustomerAddresses(requestWithUser.user.id);

      // Combinar customer con direcciones (formato Medusa-compatible)
      const customerWithAddresses = {
        ...customer,
        addresses: addresses || [], // Direcciones ya están en formato Medusa-compatible, asegurar array
      };

      // Debug: Log para verificar que se están devolviendo direcciones
      console.log(`📦 [CUSTOMERS-CONTROLLER] Customer ${customer.id} tiene ${addresses.length} direcciones`);

      // Formato compatible con SDK de Medusa
      res.status(200).json({
        customer: customerWithAddresses,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /store/customers/me/addresses
   * Obtener direcciones del cliente autenticado
   */
  getCustomerAddresses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      const addresses = await this.customersService.getCustomerAddresses(requestWithUser.user.id);

      res.status(200).json({
        addresses,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /store/customers/me/addresses
   * Crear dirección para el cliente autenticado
   */
  createCustomerAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      const address = await this.customersService.createCustomerAddress(
        requestWithUser.user.id,
        req.body
      );

      // Obtener todas las direcciones actualizadas para devolver el customer completo
      const addresses = await this.customersService.getCustomerAddresses(requestWithUser.user.id);
      const customer = await this.customersService.getCurrentCustomer(requestWithUser.user.id);

      res.status(200).json({
        customer: {
          ...customer,
          addresses,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /store/customers/me
   * Actualizar información del cliente autenticado
   */
  updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      const updateData = req.body;
      
      // Validar que al menos un campo esté presente
      if (!updateData.first_name && !updateData.last_name && !updateData.phone && !updateData.email) {
        return res.status(400).json({
          error: 'Al menos un campo debe ser proporcionado para actualizar',
        });
      }

      const customer = await this.customersService.updateCustomer(
        requestWithUser.user.id,
        updateData
      );

      // Formato compatible con SDK de Medusa
      res.status(200).json({
        customer,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /store/customers/me/addresses/:addressId
   * Actualizar dirección del cliente autenticado
   */
  updateCustomerAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      const { addressId } = req.params;
      const addressData = req.body;

      const address = await this.customersService.updateCustomerAddress(
        requestWithUser.user.id,
        addressId,
        addressData
      );

      // Obtener todas las direcciones actualizadas
      const addresses = await this.customersService.getCustomerAddresses(requestWithUser.user.id);
      const customer = await this.customersService.getCurrentCustomer(requestWithUser.user.id);

      res.status(200).json({
        customer: {
          ...customer,
          addresses,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /store/customers/me/addresses/:addressId
   * Eliminar dirección del cliente autenticado
   */
  deleteCustomerAddress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;
      
      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json({
          error: 'No autenticado',
        });
      }

      const { addressId } = req.params;

      await this.customersService.deleteCustomerAddress(
        requestWithUser.user.id,
        addressId
      );

      // Obtener todas las direcciones actualizadas
      const addresses = await this.customersService.getCustomerAddresses(requestWithUser.user.id);
      const customer = await this.customersService.getCurrentCustomer(requestWithUser.user.id);

      res.status(200).json({
        customer: {
          ...customer,
          addresses,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
