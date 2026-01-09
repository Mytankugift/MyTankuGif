/**
 * DTOs para módulo de stories
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type StoryFileDTO = {
  id: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  duration: number | null;
  orderIndex: number;
};

export type StoryDTO = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  duration: number;
  viewsCount: number;
  expiresAt: string;
  createdAt: string;
  files: StoryFileDTO[];
  author: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
  };
};

