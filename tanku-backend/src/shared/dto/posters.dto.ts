/**
 * DTOs para módulo de posters (social)
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type PosterAuthorDTO = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  avatar: string | null;
};

export type PosterDTO = {
  id: string;
  imageUrl: string;
  videoUrl: string | null;
  description: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PosterAuthorDTO;
  isLiked?: boolean; // Si el usuario actual le dio like
  comments?: PosterCommentDTO[]; // Comentarios completos (opcional, solo en detalle)
};

export type PosterReactionDTO = {
  id: string;
  posterId: string;
  userId: string;
  reactionType: string;
  createdAt: string;
};

export type PosterCommentDTO = {
  id: string;
  posterId: string;
  userId: string;
  content: string;
  parentId: string | null;
  likesCount: number;
  createdAt: string;
  author: PosterAuthorDTO;
  mentions?: string[]; // Array de userIds mencionados
};

