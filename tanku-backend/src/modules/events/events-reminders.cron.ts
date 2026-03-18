/**
 * Events Reminders Cron Job
 * 
 * Cron job para ejecutar recordatorios de eventos diariamente
 */

import cron from 'node-cron';
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

  // Ejecutar cada día a las 00:00
  // Formato: minuto hora día mes día-semana
  cron.schedule('0 0 * * *', async () => {
    console.log('[EVENTS-REMINDERS-CRON] Ejecutando verificación de recordatorios...');
    try {
      await remindersService!.checkAndCreateReminders();
      console.log('[EVENTS-REMINDERS-CRON] Verificación de recordatorios completada');
    } catch (error) {
      console.error('[EVENTS-REMINDERS-CRON] Error ejecutando recordatorios:', error);
    }
  });

  console.log('[EVENTS-REMINDERS-CRON] Cron job de recordatorios inicializado (00:00 diario)');
}

