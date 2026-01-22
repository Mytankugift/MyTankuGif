/**
 * DTOs para módulo de autenticación
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type SocialLink = {
  platform: string;
  url: string;
};

export type UserPublicDTO = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  profile: {
    avatar: string | null;
    banner: string | null;
    bio: string | null;
    socialLinks?: SocialLink[];
  } | null;
};

export type AuthResponseDTO = {
  user: UserPublicDTO;
  accessToken: string;
  refreshToken: string;
};

