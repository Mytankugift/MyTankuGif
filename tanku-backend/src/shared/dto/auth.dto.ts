/**
 * DTOs para módulo de autenticación
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type UserPublicDTO = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profile: {
    avatar: string | null;
    banner: string | null;
    bio: string | null;
  } | null;
};

export type AuthResponseDTO = {
  user: UserPublicDTO;
  accessToken: string;
  refreshToken: string;
};

