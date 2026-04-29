/**
 * DTOs para módulo de amigos
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export type FriendUserDTO = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  /** ISO 8601 desde `personal_information.birth_date`; null si no hay dato */
  birthDate?: string | null;
  profile: {
    avatar: string | null;
    banner: string | null;
    bio: string | null;
  } | null;
};

export type FriendDTO = {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  friend: FriendUserDTO;
  createdAt: string;
  updatedAt: string;
  /** Amigos que compartís (excl. el vínculo directo) — ordenar por relevancia en UI */
  mutualFriendsCount?: number;
};

export type FriendRequestDTO = {
  id: string;
  userId: string;
  friendId: string;
  status: FriendStatus;
  fromUser: FriendUserDTO;
  createdAt: string;
  updatedAt: string;
};

export type CreateFriendRequestDTO = {
  friendId: string;
};

export type UpdateFriendRequestDTO = {
  status: 'accepted' | 'rejected';
};

export type FriendSuggestionDTO = {
  userId: string;
  user: FriendUserDTO;
  /** mutual_friends | similar_interests | similar_activities | search_match | ... */
  reason: string;
  mutualFriendsCount?: number;
  mutualFriendNames?: string[]; // Nombres de amigos en común (para tooltip)
  commonCategories?: string[]; // Nombres de categorías comunes
  commonActivities?: string[]; // Actividades comunes
};

