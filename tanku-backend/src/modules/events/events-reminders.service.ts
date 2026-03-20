/**
 * Events Reminders Service
 * 
 * Servicio para gestionar recordatorios de eventos
 * Ejecuta lógica para crear notificaciones según los días antes configurados
 */

import { prisma } from '../../config/database';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsService } from './events.service';
import {
  CronJobStateService,
  EVENT_REMINDERS_JOB_KEY,
} from '../cron-job-state/cron-job-state.service';
import {
  addCalendarMonth,
  calendarMonthYearInZone,
  getEventRemindersTimeZone,
  startOfZonedDay,
  zonedDayBoundsUtc,
} from './event-reminders-timezone';

export class EventsRemindersService {
  private notificationsService: NotificationsService;
  private eventsService: EventsService;

  constructor() {
    this.notificationsService = new NotificationsService();
    this.eventsService = new EventsService();
  }

  /**
   * Verificar y crear recordatorios para eventos
   * Este método debe ejecutarse diariamente (cron job) o manualmente desde el ERP
   */
  async checkAndCreateReminders(): Promise<{ remindersCreated: number }> {
    const cronJobState = new CronJobStateService();
    await cronJobState.markStarted(EVENT_REMINDERS_JOB_KEY);

    try {
      const result = await this.runRemindersLogic();
      await cronJobState.markSuccess(EVENT_REMINDERS_JOB_KEY, {
        remindersCreated: result.remindersCreated,
      });
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await cronJobState.markFailure(EVENT_REMINDERS_JOB_KEY, msg);
      throw err;
    }
  }

  private async runRemindersLogic(): Promise<{ remindersCreated: number }> {
    const tz = getEventRemindersTimeZone();
    const now = new Date();
    const todayStart = startOfZonedDay(now, tz);
    const { start: dedupeStart, end: dedupeEnd } = zonedDayBoundsUtc(now, tz);
    const { year: calYear, month: calMonth } = calendarMonthYearInZone(
      now,
      tz,
    );
    const nextYm = addCalendarMonth(calYear, calMonth);

    // Obtener todos los eventos activos que tengan recordatorios configurados
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        reminders: {
          not: [],
        },
      },
    });

    console.log(`[EVENTS-REMINDERS] Verificando ${events.length} eventos con recordatorios`);

    let remindersCreated = 0;

    for (const event of events) {
      const reminders = (event.reminders as number[]) || [];
      if (reminders.length === 0) continue;

      // Calcular fechas de recordatorio según el tipo de repetición
      let datesToCheck: Date[] = [];

      if (event.repeatType === 'NONE') {
        datesToCheck = [new Date(event.eventDate)];
      } else {
        const calendarEvents = await this.eventsService.getEventsForMonth(
          event.userId,
          calMonth,
          calYear,
        );

        const nextMonthEvents = await this.eventsService.getEventsForMonth(
          event.userId,
          nextYm.month,
          nextYm.year,
        );

        const allInstances = [...calendarEvents, ...nextMonthEvents]
          .filter((e) => e.id === event.id)
          .map((e) => new Date(e.date));

        datesToCheck = allInstances;
      }

      // Para cada fecha del evento, verificar si hoy corresponde a algún recordatorio
      for (const eventInstanceDate of datesToCheck) {
        const eventDayStart = startOfZonedDay(eventInstanceDate, tz);
        const daysUntilEvent = Math.round(
          (eventDayStart.getTime() - todayStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Verificar si hoy corresponde a algún recordatorio configurado
        if (reminders.includes(daysUntilEvent)) {
          const existingNotifications = await prisma.notification.findMany({
            where: {
              userId: event.userId,
              type: 'EVENT_REMINDER',
              createdAt: {
                gte: dedupeStart,
                lt: dedupeEnd,
              },
            },
          });

          // Verificar si ya existe una notificación para este evento y días antes
          const existingNotification = existingNotifications.find((n) => {
            const data = n.data as any
            return data?.eventId === event.id && data?.daysUntilEvent === daysUntilEvent
          });

          if (existingNotification) {
            console.log(
              `[EVENTS-REMINDERS] Notificación ya existe para evento ${event.id} - ${daysUntilEvent} días antes`
            );
            continue;
          }

          // Crear mensaje según días antes
          let message = '';
          if (daysUntilEvent === 0) {
            message = `Hoy tienes: ${event.title}`;
          } else if (daysUntilEvent === 1) {
            message = `Mañana tienes: ${event.title}`;
          } else {
            message = `En ${daysUntilEvent} días tienes: ${event.title}`;
          }

          // Crear notificación
          await this.notificationsService.createNotification({
            userId: event.userId,
            type: 'EVENT_REMINDER',
            title: 'Recordatorio de Evento',
            message,
            data: {
              eventId: event.id,
              eventTitle: event.title,
              eventDate: eventInstanceDate.toISOString(),
              daysUntilEvent,
            },
          });

          remindersCreated++;
          console.log(
            `[EVENTS-REMINDERS] Recordatorio creado para evento ${event.id} - ${daysUntilEvent} días antes`
          );
        }
      }
    }

    console.log(`[EVENTS-REMINDERS] Proceso completado. ${remindersCreated} recordatorios creados`);
    return { remindersCreated };
  }
}

