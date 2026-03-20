'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { showNotification } from '@/components/notifications'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  PlayIcon,
  BellAlertIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface ServerClock {
  nowIsoUtc: string
  utcCalendarDate: string
  processTimezoneOffsetMinutes: number
  nodeTzEnv: string | null
}

interface EventRemindersStatus {
  jobKey: string
  cronExpression: string
  cronDescription: string
  timezoneEnv: string | null
  processTZ: string | null
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastStatus: string | null
  lastError: string | null
  metadata: unknown
  updatedAt: string | null
}

/** Igual que en el navegador: minutos que hay que sumar a la hora local del proceso para obtener UTC. */
function formatOffsetLabel(offsetMin: number): string {
  const h = offsetMin / 60
  return `${offsetMin} min — si es positivo, la “hora local” del servidor va por detrás de UTC (≈ UTC − ${h} h)`
}

export default function CronSettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [serverClock, setServerClock] = useState<ServerClock | null>(null)
  const [job, setJob] = useState<EventRemindersStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningJob, setRunningJob] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testUserId, setTestUserId] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<{
        success: boolean
        data: { serverClock: ServerClock; eventReminders: EventRemindersStatus }
      }>(API_ENDPOINTS.ADMIN.SYSTEM.CRON_STATUS)
      if (res.data.success) {
        setServerClock(res.data.data.serverClock)
        setJob(res.data.data.eventReminders)
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined
      showNotification(msg || 'Error al cargar estado del cron', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadStatus()
  }, [hasHydrated, isAuthenticated, loadStatus])

  const handleRunReminders = async () => {
    try {
      setRunningJob(true)
      const res = await apiClient.post<{
        success: boolean
        data: { remindersCreated: number; message: string }
      }>(API_ENDPOINTS.ADMIN.SYSTEM.CRON_RUN_EVENT_REMINDERS)
      if (res.data.success) {
        showNotification(res.data.data.message, 'success')
        await loadStatus()
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined
      showNotification(msg || 'Error al ejecutar recordatorios', 'error')
    } finally {
      setRunningJob(false)
    }
  }

  const handleTestNotification = async () => {
    const id = testUserId.trim()
    if (!id) {
      showNotification('Indica el ID de usuario de la app (Tanku)', 'error')
      return
    }
    try {
      setSendingTest(true)
      const res = await apiClient.post<{
        success: boolean
        data: { message: string }
      }>(API_ENDPOINTS.ADMIN.SYSTEM.NOTIFICATIONS_TEST, { userId: id })
      if (res.data.success) {
        showNotification(res.data.data.message, 'success')
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined
      showNotification(msg || 'Error al enviar notificación de prueba', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  const statusLabel =
    job?.lastStatus === 'success'
      ? 'Correcto (última pasada OK)'
      : job?.lastStatus === 'running'
        ? 'En ejecución'
        : job?.lastStatus === 'error'
          ? 'Error en la última pasada'
          : '—'

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver a ajustes
          </Link>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-expanded={showHelp}
            aria-controls="cron-help-panel"
            title="Cómo leer esta pantalla"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <InformationCircleIcon className="h-6 w-6" aria-hidden />
            <span className="sr-only">Cómo leer esta pantalla</span>
          </button>
        </div>

        {showHelp ? (
          <div
            id="cron-help-panel"
            className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-950"
            role="region"
            aria-label="Ayuda para leer esta pantalla"
          >
            <p className="font-medium text-blue-900 mb-2">Cómo leer esta pantalla</p>
            <ul className="list-disc pl-5 space-y-1 text-blue-900/90">
              <li>
                <strong>Reloj del API</strong> es la hora del proceso Node en el servidor (en ISO siempre en UTC). Sirve
                para comparar con los timestamps del job.
              </li>
              <li>
                El job <strong>“recordatorios de eventos”</strong> corre una vez al día a medianoche según{' '}
                <code className="text-xs bg-white/80 px-1 rounded">EVENT_REMINDERS_CRON_TZ</code> o la zona por defecto
                del proceso.
              </li>
              <li>
                <strong>Último inicio / fin</strong> son de la última ejecución (automática o el botón “Ejecutar
                ahora”).
              </li>
              <li>
                <strong>Metadatos</strong> (si aparecen) suelen incluir p. ej. cuántos recordatorios se crearon en esa
                pasada.
              </li>
            </ul>
          </div>
        ) : null}

        {serverClock ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Reloj del servidor (API)</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Hora actual (UTC, ISO)</dt>
                <dd className="font-mono text-gray-900 break-all">{serverClock.nowIsoUtc}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Día en calendario UTC</dt>
                <dd className="font-mono text-gray-900">{serverClock.utcCalendarDate}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Zona del proceso (variable TZ)</dt>
                <dd className="text-gray-900">{serverClock.nodeTzEnv ?? '— no definida (usa la del sistema)'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Desfase del proceso</dt>
                <dd className="text-gray-800">{formatOffsetLabel(serverClock.processTimezoneOffsetMinutes)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Cron y recordatorios de eventos</h1>
          <p className="text-sm text-gray-600 mb-6">
            Estado del job que crea notificaciones cuando un evento cumple los días de anticipación configurados.
          </p>

          {loading && !job ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : job ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <dt className="text-gray-500">Expresión cron</dt>
                <dd className="font-mono text-gray-900">{job.cronExpression}</dd>
                <dd className="text-xs text-gray-500 mt-1">Cada día a las 00:00 en la zona configurada</dd>
              </div>
              <div>
                <dt className="text-gray-500">Zona del cron (EVENT_REMINDERS_CRON_TZ)</dt>
                <dd className="text-gray-900">{job.timezoneEnv ?? '— (usa TZ del proceso o la del sistema)'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">TZ del proceso Node</dt>
                <dd className="text-gray-900">{job.processTZ ?? '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Qué hace</dt>
                <dd className="text-gray-700">{job.cronDescription}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Inicio de la última ejecución</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">{job.lastStartedAt ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Fin de la última ejecución</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">{job.lastCompletedAt ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Estado registrado</dt>
                <dd className="text-gray-900">
                  {job.lastStatus ? (
                    <>
                      <span className="font-mono">{job.lastStatus}</span>
                      <span className="text-gray-600"> — {statusLabel}</span>
                    </>
                  ) : (
                    '— (aún no se ha ejecutado o no hay fila en BD)'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Fila actualizada en BD</dt>
                <dd className="font-mono text-xs text-gray-900 break-all">{job.updatedAt ?? '—'}</dd>
              </div>
              {job.metadata != null && JSON.stringify(job.metadata) !== 'null' ? (
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Metadatos (última pasada)</dt>
                  <dd className="font-mono text-xs text-gray-800 bg-gray-50 rounded p-2 break-all">
                    {typeof job.metadata === 'string' ? job.metadata : JSON.stringify(job.metadata)}
                  </dd>
                </div>
              ) : null}
              {job.lastError ? (
                <div className="sm:col-span-2">
                  <dt className="text-red-600">Último error</dt>
                  <dd className="text-red-800 whitespace-pre-wrap break-words">{job.lastError}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadStatus()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar estado
            </button>
            <button
              type="button"
              onClick={handleRunReminders}
              disabled={runningJob}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <PlayIcon className="w-4 h-4" />
              {runningJob ? 'Ejecutando…' : 'Ejecutar recordatorios ahora'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <BellAlertIcon className="w-5 h-5 text-amber-600" />
            Notificación de prueba
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Crea una notificación de tipo <code className="text-xs bg-gray-100 px-1 rounded">admin_test</code>{' '}
            para el usuario indicado (ID de la base de datos de la app Tanku).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label htmlFor="test-user-id" className="block text-xs font-medium text-gray-500 mb-1">
                User ID (app)
              </label>
              <input
                id="test-user-id"
                type="text"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                placeholder="cuid o uuid del usuario"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={sendingTest}
              className="inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              {sendingTest ? 'Enviando…' : 'Enviar prueba'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
