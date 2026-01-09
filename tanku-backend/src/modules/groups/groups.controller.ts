import { Request, Response, NextFunction } from 'express';
import { GroupsService, CreateGroupDTO, UpdateGroupDTO } from './groups.service';
import { RequestWithUser } from '../../shared/types';
import { successResponse, errorResponse, ErrorCode } from '../../shared/response';
import { BadRequestError } from '../../shared/errors/AppError';

export class GroupsController {
  private groupsService: GroupsService;

  constructor() {
    this.groupsService = new GroupsService();
  }

  /**
   * POST /api/v1/groups
   * Crear un nuevo grupo
   */
  createGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { name, description, memberIds } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new BadRequestError('El nombre del grupo es requerido');
      }

      const groupData: CreateGroupDTO = {
        name: name.trim(),
        description: description?.trim() || undefined,
        memberIds: Array.isArray(memberIds) ? memberIds : undefined,
      };

      const group = await this.groupsService.createGroup(requestWithUser.user.id, groupData);

      res.status(201).json(successResponse(group));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/groups
   * Obtener todos los grupos del usuario
   */
  getGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const groups = await this.groupsService.getGroups(requestWithUser.user.id);

      res.status(200).json(successResponse(groups));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/groups/recommended
   * Obtener grupos recomendados (plantillas)
   */
  getRecommendedGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recommended = this.groupsService.getRecommendedGroups();
      res.status(200).json(successResponse(recommended));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * GET /api/v1/groups/:id
   * Obtener un grupo por ID
   */
  getGroupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const group = await this.groupsService.getGroupById(id, requestWithUser.user.id);

      res.status(200).json(successResponse(group));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/groups/:id
   * Actualizar un grupo
   */
  updateGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const { name, description } = req.body;

      const updateData: UpdateGroupDTO = {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      };

      const group = await this.groupsService.updateGroup(id, requestWithUser.user.id, updateData);

      res.status(200).json(successResponse(group));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/groups/:id
   * Eliminar un grupo
   */
  deleteGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      await this.groupsService.deleteGroup(id, requestWithUser.user.id);

      res.status(200).json(successResponse({ message: 'Grupo eliminado exitosamente' }));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * POST /api/v1/groups/:id/members
   * Agregar un miembro a un grupo
   */
  addGroupMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id } = req.params;
      const { memberId } = req.body;

      if (!memberId || typeof memberId !== 'string') {
        throw new BadRequestError('memberId es requerido');
      }

      const group = await this.groupsService.addGroupMember(
        id,
        requestWithUser.user.id,
        memberId
      );

      res.status(200).json(successResponse(group));
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * DELETE /api/v1/groups/:id/members/:memberId
   * Eliminar un miembro de un grupo
   */
  removeGroupMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestWithUser = req as RequestWithUser;

      if (!requestWithUser.user || !requestWithUser.user.id) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
      }

      const { id, memberId } = req.params;

      const group = await this.groupsService.removeGroupMember(
        id,
        requestWithUser.user.id,
        memberId
      );

      res.status(200).json(successResponse(group));
    } catch (error: any) {
      next(error);
    }
  };
}
