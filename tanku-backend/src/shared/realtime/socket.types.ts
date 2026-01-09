/**
 * Tipos genéricos para eventos de Socket.IO
 * 
 * El sistema de realtime está diseñado para ser genérico y reutilizable.
 * No contiene lógica de negocio específica (amigos, chat, grupos).
 * 
 * Los eventos siguen el patrón: { type: string, payload: any }
 */

export type SocketEventType = 
  | 'notification'
  | 'message'
  | 'presence'
  | 'custom'
  | string; // Permitir tipos personalizados para futuras features

export interface SocketEvent<T = any> {
  type: SocketEventType;
  payload: T;
  timestamp?: string;
  userId?: string;
}

export interface SocketUser {
  userId: string;
  socketId: string;
  connectedAt: Date;
}

export interface SocketRoom {
  roomId: string;
  userIds: string[];
  createdAt: Date;
}

