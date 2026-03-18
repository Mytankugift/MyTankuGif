/**
 * Events Service
 * 
 * Servicio para gestionar eventos de usuarios con soporte para repeticiones
 */

import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../shared/errors/AppError';
import {
  CreateEventDTO,
  UpdateEventDTO,
  EventDTO,
  CalendarEventDTO,
} from '../../shared/dto/events.dto';
import { RepeatType } from '@prisma/client';

const DEFAULT_EVENT_COLOR = '#73FFA2';

export class EventsService {
  private normalizeColor(hex: string | undefined | null): string {
    if (!hex || typeof hex !== 'string') return DEFAULT_EVENT_COLOR;
    const h = hex.trim();
    if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toUpperCase();
    return DEFAULT_EVENT_COLOR;
  }

  /** Fecha calendario (sin hora relevante): mediodía local para evitar saltos TZ */
  private parseEventDateInput(input: string): Date {
    const dateOnly = input.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [y, m, d] = dateOnly.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const parsed = new Date(input);
    if (isNaN(parsed.getTime())) {
      throw new BadRequestError('Fecha inválida');
    }
    parsed.setHours(12, 0, 0, 0);
    return parsed;
  }

  /**
   * Mapear Event de Prisma a EventDTO
   */
  private mapEventToDTO(event: any): EventDTO {
    return {
      id: event.id,
      userId: event.userId,
      title: event.title,
      description: event.description,
      eventDate: event.eventDate.toISOString(),
      repeatType: event.repeatType,
      reminders: (event.reminders as number[]) || [],
      color: this.normalizeColor(event.color),
      isActive: event.isActive,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**
   * Crear un nuevo evento
   */
  async createEvent(userId: string, data: CreateEventDTO): Promise<EventDTO> {
    // Validar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const eventDate = this.parseEventDateInput(data.eventDate);

    // Crear evento
    const event = await prisma.event.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        eventDate,
        repeatType: data.repeatType,
        reminders: data.reminders || [],
        color: this.normalizeColor(data.color),
        isActive: true,
      },
    });

    return this.mapEventToDTO(event);
  }

  /**
   * Obtener evento por ID
   */
  async getEventById(eventId: string, userId: string): Promise<EventDTO> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    if (event.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para acceder a este evento');
    }

    return this.mapEventToDTO(event);
  }

  /**
   * Actualizar evento
   */
  async updateEvent(eventId: string, userId: string, data: UpdateEventDTO): Promise<EventDTO> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    if (event.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para actualizar este evento');
    }

    // Preparar datos de actualización
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.eventDate !== undefined) {
      updateData.eventDate = this.parseEventDateInput(data.eventDate);
    }
    if (data.repeatType !== undefined) updateData.repeatType = data.repeatType;
    if (data.color !== undefined) updateData.color = this.normalizeColor(data.color);
    if (data.reminders !== undefined) updateData.reminders = data.reminders;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    return this.mapEventToDTO(updatedEvent);
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento no encontrado');
    }

    if (event.userId !== userId) {
      throw new ForbiddenError('No tienes permiso para eliminar este evento');
    }

    await prisma.event.delete({
      where: { id: eventId },
    });
  }

  /**
   * Calcular fechas de repetición para un evento
   * Esta función calcula las fechas virtuales según el tipo de repetición
   */
  private calculateRecurrences(
    eventDate: Date,
    repeatType: RepeatType,
    startDate: Date,
    endDate: Date
  ): Date[] {
    const dates: Date[] = [];
    const originalDate = new Date(eventDate);

    // Si el evento original está fuera del rango, no incluir
    if (originalDate < startDate || originalDate > endDate) {
      // Solo continuar si es repetición
      if (repeatType === 'NONE') {
        return [];
      }
    } else {
      // Si está en el rango y es NONE, solo devolver esta fecha
      if (repeatType === 'NONE') {
        return [originalDate];
      }
    }

    // En este punto repeatType nunca es NONE (ya devuelto arriba)
    switch (repeatType) {
      case 'DAILY': {
        // Cada día desde eventDate hasta endDate
        let currentDate = new Date(Math.max(originalDate.getTime(), startDate.getTime()));
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        break;
      }

      case 'WEEKLY': {
        // Mismo día de la semana
        const dayOfWeek = originalDate.getDay();
        let currentDate = new Date(startDate);
        
        // Ir al primer día de la semana correspondiente en el rango
        const daysUntilTarget = (dayOfWeek - currentDate.getDay() + 7) % 7;
        if (daysUntilTarget > 0) {
          currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        }
        
        // Si la fecha calculada es antes del evento original, avanzar una semana
        if (currentDate < originalDate) {
          currentDate.setDate(currentDate.getDate() + 7);
        }

        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 7);
        }
        break;
      }

      case 'MONTHLY': {
        // Mismo día del mes
        const dayOfMonth = originalDate.getDate();
        let currentDate = new Date(startDate);
        currentDate.setDate(dayOfMonth);

        // Si la fecha calculada es antes del evento original, avanzar un mes
        if (currentDate < originalDate) {
          currentDate.setMonth(currentDate.getMonth() + 1);
          currentDate.setDate(dayOfMonth);
        }

        while (currentDate <= endDate) {
          // Verificar que el día existe en el mes (ej: 31 de febrero)
          const testDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayOfMonth);
          if (testDate.getDate() === dayOfMonth) {
            dates.push(new Date(testDate));
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
          currentDate.setDate(dayOfMonth);
        }
        break;
      }

      case 'YEARLY': {
        // Mismo día y mes cada año
        const month = originalDate.getMonth();
        const day = originalDate.getDate();
        
        let currentYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();

        // Si el evento original es en el futuro, empezar desde ese año
        if (originalDate > startDate) {
          currentYear = originalDate.getFullYear();
        }

        while (currentYear <= endYear) {
          const testDate = new Date(currentYear, month, day);
          // Verificar que el día existe (ej: 29 de febrero en años no bisiestos)
          if (testDate.getMonth() === month && testDate.getDate() === day) {
            if (testDate >= startDate && testDate <= endDate) {
              dates.push(testDate);
            }
          }
          currentYear++;
        }
        break;
      }
    }

    return dates;
  }

  /**
   * Obtener eventos para un mes específico
   * Calcula las repeticiones y devuelve eventos virtuales
   */
  async getEventsForMonth(
    userId: string,
    month: number,
    year: number
  ): Promise<CalendarEventDTO[]> {
    // Validar mes y año
    if (month < 1 || month > 12) {
      throw new BadRequestError('Mes inválido (debe ser 1-12)');
    }
    if (year < 2000 || year > 2100) {
      throw new BadRequestError('Año inválido');
    }

    // Calcular rango del mes
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Último día del mes

    // Obtener todos los eventos activos del usuario
    // Buscar eventos que puedan tener instancias en este mes
    const events = await prisma.event.findMany({
      where: {
        userId,
        isActive: true,
        // Buscar eventos que:
        // 1. Su fecha original está en este mes, O
        // 2. Son repeticiones que pueden caer en este mes
        OR: [
          {
            // Evento original en este mes
            eventDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            // Repeticiones que pueden caer en este mes
            repeatType: {
              not: 'NONE',
            },
            // El evento original debe ser anterior o igual al fin del mes
            eventDate: {
              lte: endDate,
            },
          },
        ],
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    // Calcular instancias virtuales para cada evento
    const calendarEvents: CalendarEventDTO[] = [];

    for (const event of events) {
      const eventDate = new Date(event.eventDate);
      const recurrences = this.calculateRecurrences(eventDate, event.repeatType, startDate, endDate);

      for (const recurrenceDate of recurrences) {
        calendarEvents.push({
          id: event.id,
          title: event.title,
          description: event.description,
          date: recurrenceDate.toISOString(),
          originalEventDate: eventDate.toISOString(),
          repeatType: event.repeatType,
          reminders: (event.reminders as number[]) || [],
          color: this.normalizeColor(event.color),
          isActive: event.isActive,
        });
      }
    }

    // Ordenar por fecha
    calendarEvents.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return calendarEvents;
  }

  /**
   * Obtener todos los eventos del usuario (sin cálculo de repeticiones)
   * Útil para listar eventos originales
   */
  async getUserEvents(userId: string): Promise<EventDTO[]> {
    const events = await prisma.event.findMany({
      where: {
        userId,
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    return events.map(event => this.mapEventToDTO(event));
  }
}

