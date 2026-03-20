/**
 * Events Reminders Cron Job
 * 
 * Cron job para ejecutar recordatorios de eventos diariamente
 */

import cron from 'node-cron';
import { getEventRemindersTimeZone } from './event-reminders-timezone';
import { EventsRemindersService } from './events-reminders.service';

let remindersService: EventsRemindersService | null = null;

/**
 * Inicializar el cron job de recordatorios
 * Ejecuta cada día a las 00:00
 */
export function initializeEventsRemindersCron(): void {
  if (remindersService === null) {
    remindersService = new EventsRemindersService();
  }

  const tz = getEventRemindersTimeZone();

  // Ejecutar cada día a las 00:00 en la misma TZ que usa el servicio de recordatorios
  cron.schedule(
    '0 0 * * *',
    async () => {
      console.log('[EVENTS-REMINDERS-CRON] Ejecutando verificación de recordatorios...');
      try {
        const { remindersCreated } = await remindersService!.checkAndCreateReminders();
        console.log(
          `[EVENTS-REMINDERS-CRON] Verificación completada (${remindersCreated} recordatorio(s) nuevos)`
        );
      } catch (error) {
        console.error('[EVENTS-REMINDERS-CRON] Error ejecutando recordatorios:', error);
      }
    },
    { timezone: tz }
  );

  console.log(
    `[EVENTS-REMINDERS-CRON] Cron inicializado: 0 0 * * * (timezone: ${tz})`
  );
}

