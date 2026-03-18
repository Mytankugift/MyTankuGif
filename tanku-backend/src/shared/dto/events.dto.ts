/**
 * DTOs para módulo de eventos
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

import { RepeatType } from '@prisma/client';

export type CreateEventDTO = {
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD o ISO
  repeatType: RepeatType;
  reminders: number[]; // Array de días antes: [7, 3, 1, 0]
  color?: string; // #RRGGBB
};

export type UpdateEventDTO = {
  title?: string;
  description?: string;
  eventDate?: string;
  repeatType?: RepeatType;
  reminders?: number[];
  isActive?: boolean;
  color?: string;
};

export type EventDTO = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  eventDate: string;
  repeatType: RepeatType;
  reminders: number[];
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * DTO para eventos en el calendario
 * Incluye la fecha calculada (puede ser diferente de eventDate si es repetición)
 */
export type CalendarEventDTO = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  originalEventDate: string;
  repeatType: RepeatType;
  reminders: number[];
  color: string;
  isActive: boolean;
};

