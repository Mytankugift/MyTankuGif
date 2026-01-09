/**
 * DTOs para módulo de amigos
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export type FriendUserDTO = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
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
  reason: string; // 'mutual_friends' | 'similar_interests' | 'similar_activities' | 'recent_interaction'
  mutualFriendsCount?: number;
  mutualFriendNames?: string[]; // Nombres de amigos en común (para tooltip)
  commonCategories?: string[]; // Nombres de categorías comunes
  commonActivities?: string[]; // Actividades comunes
};

