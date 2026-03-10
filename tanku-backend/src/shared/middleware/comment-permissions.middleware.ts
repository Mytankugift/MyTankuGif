import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { errorResponse, ErrorCode } from '../response';
import { RequestWithUser } from '../types';

/**
 * Middleware para verificar permisos en comentarios
 * Verifica que el usuario sea el dueño del comentario, el dueño del poster, o admin
 */
export const checkCommentPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestWithUser = req as RequestWithUser;

    if (!requestWithUser.user || !requestWithUser.user.id) {
      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, 'No autenticado'));
    }

    const { commentId, posterId } = req.params;
    const userId = requestWithUser.user.id;

    if (!commentId) {
      return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, 'commentId es requerido'));
    }

    // Buscar el comentario con información del poster
    const comment = await prisma.posterComment.findUnique({
      where: { id: commentId },
      include: {
        poster: {
          select: { customerId: true },
        },
      },
    });

    if (!comment) {
      return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, 'Comentario no encontrado'));
    }

    // Verificar que el comentario pertenece al poster si se especifica
    if (posterId && comment.posterId !== posterId) {
      return res.status(400).json(
        errorResponse(ErrorCode.BAD_REQUEST, 'El comentario no pertenece a este poster')
      );
    }

    // Verificar si es el dueño del comentario
    const isCommentOwner = comment.customerId === userId;

    // Verificar si es el dueño del poster
    const isPosterOwner = comment.poster.customerId === userId;

    // Verificar si es admin (buscando en admin_users)
    const adminUser = await prisma.adminUser.findUnique({
      where: { email: requestWithUser.user.email },
      select: { id: true, role: true },
    });
    const isAdmin = !!adminUser;

    // Agregar información de permisos al request
    (requestWithUser as any).commentPermissions = {
      isCommentOwner,
      isPosterOwner,
      isAdmin,
      comment,
    };

    next();
  } catch (error) {
    next(error);
  }
};

