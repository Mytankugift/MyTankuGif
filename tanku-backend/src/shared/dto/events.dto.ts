/**
 * DTOs para módulo de eventos
 * El frontend NUNCA debe recibir modelos Prisma directamente
 */

import { EventKind, RepeatType } from '@prisma/client';

/** Tipo de color guardado por el usuario (filtros + selector de eventos) */
export type EventColorPresetDTO = {
  id: string;
  label: string;
  hex: string;
};

export type CreateEventDTO = {
  title: string;
  description?: string;
  eventDate: string; // YYYY-MM-DD o ISO
  repeatType: RepeatType;
  kind?: EventKind;
  reminders: number[]; // Array de días antes: [30, 7, 3, 1, 0]
  color?: string; // #RRGGBB
};

export type UpdateEventDTO = {
  title?: string;
  description?: string;
  eventDate?: string;
  repeatType?: RepeatType;
  kind?: EventKind;
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
  kind: EventKind;
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
  kind: EventKind;
  reminders: number[];
  color: string;
  isActive: boolean;
};
