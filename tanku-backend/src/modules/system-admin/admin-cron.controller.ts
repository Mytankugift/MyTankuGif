import { Request, Response, NextFunction } from 'express';
import { DropiJobType } from '@prisma/client';
import cron from 'node-cron';
import { BadRequestError } from '../../shared/errors/AppError';
import { prisma } from '../../config/database';
import { APP_CONSTANTS } from '../../config/constants';
import { EventsRemindersService } from '../events/events-reminders.service';
import {
  CronJobStateService,
  EVENT_REMINDERS_JOB_KEY,
} from '../cron-job-state/cron-job-state.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getEventRemindersTimeZone } from '../events/event-reminders-timezone';
import {
  DropiSyncStockCronConfigService,
  describeCronExpression,
  DROPI_SYNC_STOCK_CRON_JOB_KEY,
} from '../dropi-jobs/dropi-sync-stock-cron-config.service';
import {
  enqueueDropiSyncStockJob,
  rescheduleDropiSyncStockCron,
} from '../dropi-jobs/dropi-sync-stock.cron';

const CRON_EXPRESSION = '0 0 * * *';

const dropiCronConfigService = new DropiSyncStockCronConfigService();

export class AdminCronController {
  /**
   * GET /api/v1/admin/system/cron/status
   */
  getCronStatus = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stateService = new CronJobStateService();
      const state = await stateService.getByKey(EVENT_REMINDERS_JOB_KEY);
      const dropiCronState = await stateService.getByKey(DROPI_SYNC_STOCK_CRON_JOB_KEY);
      const dropiConfig = await dropiCronConfigService.getConfig();
      const latestSyncStockJob = await prisma.dropiJob.findFirst({
        where: { type: DropiJobType.SYNC_STOCK },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          progress: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
          error: true,
        },
      });
      const now = new Date();

      res.status(200).json({
        success: true,
        data: {
          enableCronJobsEnv: APP_CONSTANTS.ENABLE_CRON_JOBS,
          /** Reloj del proceso Node (útil para interpretar el cron y los timestamps guardados). */
          serverClock: {
            nowIsoUtc: now.toISOString(),
            utcCalendarDate: now.toISOString().slice(0, 10),
            /** Minutos que hay que sumar a la hora “local del proceso” para llegar a UTC (igual que Date#getTimezoneOffset en el navegador). */
            processTimezoneOffsetMinutes: now.getTimezoneOffset(),
            nodeTzEnv: process.env.TZ ?? null,
          },
          eventReminders: {
            jobKey: EVENT_REMINDERS_JOB_KEY,
            cronExpression: CRON_EXPRESSION,
            cronDescription:
              'Diario a las 00:00 (medianoche) en la zona IANA efectiva (EVENT_REMINDERS_CRON_TZ o America/Bogota por defecto); la lógica de recordatorios usa la misma zona',
            timezoneEnv: process.env.EVENT_REMINDERS_CRON_TZ?.trim() || null,
            effectiveTimezone: getEventRemindersTimeZone(),
            processTZ: process.env.TZ || null,
            lastStartedAt: state?.lastStartedAt?.toISOString() ?? null,
            lastCompletedAt: state?.lastCompletedAt?.toISOString() ?? null,
            lastStatus: state?.lastStatus ?? null,
            lastError: state?.lastError ?? null,
            metadata: state?.metadata ?? null,
            updatedAt: state?.updatedAt?.toISOString() ?? null,
          },
          dropiSyncStock: {
            jobKey: DROPI_SYNC_STOCK_CRON_JOB_KEY,
            cronExpression: dropiConfig.cronExpression,
            cronDescription: describeCronExpression(dropiConfig.cronExpression),
            enabled: dropiConfig.enabled,
            timezone: dropiConfig.timezone,
            configUpdatedAt: dropiConfig.updatedAt,
            scheduledInProcess: APP_CONSTANTS.ENABLE_CRON_JOBS && dropiConfig.enabled,
            workersRequired: true,
            lastStartedAt: dropiCronState?.lastStartedAt?.toISOString() ?? null,
            lastCompletedAt: dropiCronState?.lastCompletedAt?.toISOString() ?? null,
            lastStatus: dropiCronState?.lastStatus ?? null,
            lastError: dropiCronState?.lastError ?? null,
            metadata: dropiCronState?.metadata ?? null,
            latestDropiJob: latestSyncStockJob
              ? {
                  id: latestSyncStockJob.id,
                  status: latestSyncStockJob.status,
                  progress: latestSyncStockJob.progress,
                  createdAt: latestSyncStockJob.createdAt.toISOString(),
                  startedAt: latestSyncStockJob.startedAt?.toISOString() ?? null,
                  finishedAt: latestSyncStockJob.finishedAt?.toISOString() ?? null,
                  error: latestSyncStockJob.error,
                }
              : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/v1/admin/system/cron/dropi-sync-stock/config
   * body: { cronExpression?: string, enabled?: boolean, timezone?: string }
   */
  patchDropiSyncStockConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cronExpression, enabled, timezone } = req.body ?? {};

      if (cronExpression !== undefined) {
        const expr = String(cronExpression).trim();
        if (!cron.validate(expr)) {
          throw new BadRequestError(`Expresión cron inválida: ${expr}`);
        }
      }

      const saved = await dropiCronConfigService.saveConfig({
        cronExpression:
          cronExpression !== undefined ? String(cronExpression).trim() : undefined,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
        timezone: timezone !== undefined ? String(timezone).trim() : undefined,
      });

      await rescheduleDropiSyncStockCron();

      res.status(200).json({
        success: true,
        data: {
          ...saved,
          cronDescription: describeCronExpression(saved.cronExpression),
          message: 'Configuración guardada y cron reprogramado en este proceso',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/system/cron/dropi-sync-stock/run
   * Encola un job SYNC_STOCK (requiere workers activos).
   */
  runDropiSyncStock = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await enqueueDropiSyncStockJob('manual');
      res.status(200).json({
        success: true,
        data: {
          ...result,
          message: result.skipped
            ? result.reason
            : `Job SYNC_STOCK encolado (${result.jobId}). Los workers deben estar en ejecución.`,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/system/cron/event-reminders/run
   * Ejecuta el mismo flujo que el cron (crea notificaciones si corresponde hoy).
   */
  runEventReminders = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const service = new EventsRemindersService();
      const { remindersCreated } = await service.checkAndCreateReminders();
      res.status(200).json({
        success: true,
        data: {
          remindersCreated,
          message:
            remindersCreated > 0
              ? `Se crearon ${remindersCreated} notificación(es) de recordatorio (si aún no existían hoy).`
              : 'Ejecución correcta: no había recordatorios nuevos que crear para hoy (o ya existían).',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/admin/system/notifications/test
   * body: { userId: string } — usuario Tanku (app) que recibirá la notificación ficticia
   */
  postTestNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.body?.userId;
      if (!userId || typeof userId !== 'string' || !userId.trim()) {
        throw new BadRequestError('userId es requerido (ID de usuario de la app Tanku)');
      }

      const notificationsService = new NotificationsService();
      const notification = await notificationsService.createNotification({
        userId: userId.trim(),
        type: 'admin_test',
        title: 'Prueba desde ERP Tanku',
        message:
          'Si ves esta notificación al instante (o al abrir la campana), el flujo de notificaciones funciona correctamente.',
        data: {
          source: 'tanku_admin',
          sentAt: new Date().toISOString(),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          notification,
          message:
            'Notificación creada. El usuario debe verla en la app (tiempo real si tiene sesión abierta).',
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
