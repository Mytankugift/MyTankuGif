/**
 * Tipos compartidos de la aplicación
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

import { Request } from 'express';
import { AdminRole } from '@prisma/client';

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface RequestWithAdminUser extends Request {
  adminUser?: {
    id: string;
    email: string;
    role: AdminRole;
  };
}
