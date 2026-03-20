/**

 * Events Service

 *

 * Servicio para gestionar eventos de usuarios con soporte para repeticiones.

 * Fechas de calendario: ancla UTC mediodía para evitar desfases por zona horaria.

 */

import { prisma } from "../../config/database";

import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from "../../shared/errors/AppError";

import {
  CreateEventDTO,
  UpdateEventDTO,
  EventDTO,
  CalendarEventDTO,
  EventColorPresetDTO,
} from "../../shared/dto/events.dto";

import { RepeatType } from "@prisma/client";

const DEFAULT_EVENT_COLOR = "#73FFA2";

export class EventsService {
  private normalizeColor(hex: string | undefined | null): string {
    if (!hex || typeof hex !== "string") return DEFAULT_EVENT_COLOR;

    const h = hex.trim();

    if (/^#[0-9A-Fa-f]{6}$/.test(h)) return h.toUpperCase();

    return DEFAULT_EVENT_COLOR;
  }

  /** Día civil en UTC a mediodía (comparaciones y serialización estables). */

  private utcNoon(y: number, month0: number, day: number): Date {
    return new Date(Date.UTC(y, month0, day, 12, 0, 0));
  }

  /** Parse YYYY-MM-DD o ISO → instante UTC mediodía de ese día civil. */

  private parseEventDateInput(input: string): Date {
    const dateOnly = input.slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const [y, m, d] = dateOnly.split("-").map(Number);

      return this.utcNoon(y, m - 1, d);
    }

    const parsed = new Date(input);

    if (isNaN(parsed.getTime())) {
      throw new BadRequestError("Fecha inválida");
    }

    return this.utcNoon(
      parsed.getUTCFullYear(),

      parsed.getUTCMonth(),

      parsed.getUTCDate(),
    );
  }

  private mapEventToDTO(event: any): EventDTO {
    return {
      id: event.id,

      userId: event.userId,

      title: event.title,

      description: event.description,

      eventDate: event.eventDate.toISOString(),

      repeatType: event.repeatType,

      kind: event.kind ?? "EVENT",

      reminders: (event.reminders as number[]) || [],

      color: this.normalizeColor(event.color),

      isActive: event.isActive,

      createdAt: event.createdAt.toISOString(),

      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**

   * Calcular fechas de repetición (todas en UTC mediodía del día civil).

   */

  private calculateRecurrences(
    eventDate: Date,

    repeatType: RepeatType,

    rangeStart: Date,

    rangeEnd: Date,
  ): Date[] {
    const dates: Date[] = [];

    const originalDate = new Date(eventDate.getTime());

    if (repeatType === "NONE") {
      if (originalDate < rangeStart || originalDate > rangeEnd) return [];

      return [originalDate];
    }

    if (originalDate > rangeEnd) {
      return [];
    }

    switch (repeatType) {
      case "DAILY": {
        let cur = new Date(
          Math.max(originalDate.getTime(), rangeStart.getTime()),
        );

        cur = this.utcNoon(
          cur.getUTCFullYear(),

          cur.getUTCMonth(),

          cur.getUTCDate(),
        );

        if (cur < rangeStart) {
          cur = new Date(rangeStart);
        }

        while (cur <= rangeEnd) {
          dates.push(new Date(cur.getTime()));

          cur = new Date(cur.getTime());

          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        break;
      }

      case "WEEKLY": {
        const targetDow = originalDate.getUTCDay();

        let cur = this.utcNoon(
          rangeStart.getUTCFullYear(),

          rangeStart.getUTCMonth(),

          rangeStart.getUTCDate(),
        );

        let dow = cur.getUTCDay();

        const add = (targetDow - dow + 7) % 7;

        if (add > 0) {
          cur.setUTCDate(cur.getUTCDate() + add);
        }

        while (cur.getTime() < originalDate.getTime()) {
          cur.setUTCDate(cur.getUTCDate() + 7);
        }

        while (cur <= rangeEnd) {
          dates.push(new Date(cur.getTime()));

          cur.setUTCDate(cur.getUTCDate() + 7);
        }

        break;
      }

      case "MONTHLY": {
        const dom = originalDate.getUTCDate();

        let y = rangeStart.getUTCFullYear();

        let m0 = rangeStart.getUTCMonth();

        const endY = rangeEnd.getUTCFullYear();

        const endM = rangeEnd.getUTCMonth();

        while (y < endY || (y === endY && m0 <= endM)) {
          const cand = this.utcNoon(y, m0, dom);

          if (
            cand.getUTCDate() === dom &&
            cand.getTime() >= originalDate.getTime() &&
            cand >= rangeStart &&
            cand <= rangeEnd
          ) {
            dates.push(cand);
          }

          m0++;

          if (m0 > 11) {
            m0 = 0;

            y++;
          }
        }

        break;
      }

      case "YEARLY": {
        const m0 = originalDate.getUTCMonth();

        const dom = originalDate.getUTCDate();

        let y = rangeStart.getUTCFullYear();

        const endY = rangeEnd.getUTCFullYear();

        if (originalDate > rangeStart) {
          y = Math.max(y, originalDate.getUTCFullYear());
        }

        while (y <= endY) {
          const cand = this.utcNoon(y, m0, dom);

          if (
            cand.getUTCMonth() === m0 &&
            cand.getUTCDate() === dom &&
            cand.getTime() >= originalDate.getTime() &&
            cand >= rangeStart &&
            cand <= rangeEnd
          ) {
            dates.push(cand);
          }

          y++;
        }

        break;
      }
    }

    return dates;
  }

  async createEvent(userId: string, data: CreateEventDTO): Promise<EventDTO> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado");
    }

    const kind = data.kind ?? "EVENT";

    const repeatType = kind === "EVENT" ? "NONE" : data.repeatType;

    const eventDate = this.parseEventDateInput(data.eventDate);

    const event = await prisma.event.create({
      data: {
        userId,

        title: data.title,

        description: data.description || null,

        eventDate,

        repeatType,

        reminders: data.reminders || [],

        color: this.normalizeColor(data.color),

        kind,

        isActive: true,
      },
    });

    return this.mapEventToDTO(event);
  }

  async getEventById(eventId: string, userId: string): Promise<EventDTO> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (event.userId !== userId) {
      throw new ForbiddenError("No tienes permiso para acceder a este evento");
    }

    return this.mapEventToDTO(event);
  }

  async updateEvent(
    eventId: string,
    userId: string,
    data: UpdateEventDTO,
  ): Promise<EventDTO> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (event.userId !== userId) {
      throw new ForbiddenError("No tienes permiso para actualizar este evento");
    }

    const nextKind =
      data.kind !== undefined ? data.kind : (event.kind ?? "EVENT");

    if (
      nextKind === "EVENT" &&
      data.repeatType !== undefined &&
      data.repeatType !== "NONE"
    ) {
      throw new BadRequestError(
        "Los eventos de una sola vez no admiten repetición",
      );
    }

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;

    if (data.description !== undefined)
      updateData.description = data.description;

    if (data.eventDate !== undefined) {
      updateData.eventDate = this.parseEventDateInput(data.eventDate);
    }

    if (data.kind !== undefined) {
      updateData.kind = data.kind;
    }

    if (data.repeatType !== undefined || data.kind !== undefined) {
      if (nextKind === "EVENT") {
        updateData.repeatType = "NONE";
      } else if (data.repeatType !== undefined) {
        updateData.repeatType = data.repeatType;
      }
    }

    if (data.color !== undefined)
      updateData.color = this.normalizeColor(data.color);

    if (data.reminders !== undefined) updateData.reminders = data.reminders;

    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },

      data: updateData,
    });

    return this.mapEventToDTO(updatedEvent);
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    if (event.userId !== userId) {
      throw new ForbiddenError("No tienes permiso para eliminar este evento");
    }

    await prisma.event.delete({
      where: { id: eventId },
    });
  }

  async getEventsForMonth(
    userId: string,

    month: number,

    year: number,
  ): Promise<CalendarEventDTO[]> {
    if (month < 1 || month > 12) {
      throw new BadRequestError("Mes inválido (debe ser 1-12)");
    }

    if (year < 2000 || year > 2100) {
      throw new BadRequestError("Año inválido");
    }

    const rangeStartDb = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

    const rangeEndDb = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const rangeStart = this.utcNoon(year, month - 1, 1);

    const rangeEnd = this.utcNoon(year, month, 0);

    const events = await prisma.event.findMany({
      where: {
        userId,

        isActive: true,

        OR: [
          {
            eventDate: {
              gte: rangeStartDb,

              lte: rangeEndDb,
            },
          },

          {
            repeatType: {
              not: "NONE",
            },

            eventDate: {
              lte: rangeEndDb,
            },
          },
        ],
      },

      orderBy: {
        eventDate: "asc",
      },
    });

    const calendarEvents: CalendarEventDTO[] = [];

    for (const event of events) {
      const eventDate = new Date(event.eventDate);

      const recurrences = this.calculateRecurrences(
        eventDate,

        event.repeatType,

        rangeStart,

        rangeEnd,
      );

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

          kind: event.kind ?? "EVENT",

          isActive: event.isActive,
        });
      }
    }

    calendarEvents.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return calendarEvents;
  }

  async getUserEvents(userId: string): Promise<EventDTO[]> {
    const events = await prisma.event.findMany({
      where: {
        userId,
      },

      orderBy: {
        eventDate: "asc",
      },
    });

    return events.map((event) => this.mapEventToDTO(event));
  }

  async getEventColorPresets(userId: string): Promise<EventColorPresetDTO[]> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { eventColorPresets: true },
    });
    return this.parseStoredColorPresets(profile?.eventColorPresets);
  }

  async saveEventColorPresets(
    userId: string,
    presets: EventColorPresetDTO[]
  ): Promise<EventColorPresetDTO[]> {
    const normalized: EventColorPresetDTO[] = presets.map((p) => ({
      id: p.id.trim(),
      label: p.label.trim().slice(0, 40),
      hex: this.normalizeColor(p.hex),
    }));

    await prisma.userProfile.upsert({
      where: { userId },
      update: { eventColorPresets: normalized },
      create: { userId, eventColorPresets: normalized },
    });

    return normalized;
  }

  private parseStoredColorPresets(json: unknown): EventColorPresetDTO[] {
    if (json == null) return [];
    try {
      const raw = Array.isArray(json) ? json : JSON.parse(String(json));
      if (!Array.isArray(raw)) return [];
      const out: EventColorPresetDTO[] = [];
      for (const item of raw) {
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const label = String(o.label ?? "").trim().slice(0, 40);
          const hex = this.normalizeColor(String(o.hex ?? ""));
          const id = String(o.id ?? "").trim() || `${hex}-${label}`;
          if (label) out.push({ id, label, hex });
        }
      }
      return out;
    } catch {
      return [];
    }
  }
}
