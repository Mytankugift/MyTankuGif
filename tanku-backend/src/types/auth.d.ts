/**
 * Tipo para usuario autenticado
 * NO es el User de Prisma, es solo lo que necesitamos del JWT
 */
export interface AuthUser {
  id: string;
  email: string;
}

