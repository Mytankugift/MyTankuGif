'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminAuthStore } from '@/lib/stores/admin-auth-store'
import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { showNotification } from '@/components/notifications'
import { AdminSettingsLayout } from '@/components/admin/AdminSettingsLayout'
import { AdminCollapsibleCard } from '@/components/admin/AdminCollapsibleCard'
import {
  ArrowPathIcon,
  PlayIcon,
  BellAlertIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'

const DROPI_CRON_DEFAULT = '*/10 * * * *'

const CRON_PRESETS = [
  { value: '*/10 * * * *', label: 'Cada 10 minutos (recomendado)' },
  { value: '*/15 * * * *', label: 'Cada 15 minutos' },
  { value: 'custom', label: 'Personalizada (editar expresión)' },
] as const

interface ServerClock {
  nowIsoUtc: string
  utcCalendarDate: string
  processTimezoneOffsetMinutes: number
  nodeTzEnv: string | null
}

interface DropiSyncStockStatus {
  jobKey: string
  cronExpression: string
  cronDescription: string
  enabled: boolean
  timezone: string
  configUpdatedAt: string | null
  scheduledInProcess: boolean
  workersRequired: boolean
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastStatus: string | null
  lastError: string | null
  metadata: unknown
  latestDropiJob: {
    id: string
    status: string
    progress: number
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
    error: string | null
  } | null
}

interface EventRemindersStatus {
  jobKey: string
  cronExpression: string
  cronDescription: string
  timezoneEnv: string | null
  effectiveTimezone?: string
  processTZ: string | null
  lastStartedAt: string | null
  lastCompletedAt: string | null
  lastStatus: string | null
  lastError: string | null
  metadata: unknown
  updatedAt: string | null
}

interface CronStatusPayload {
  enableCronJobsEnv: boolean
  serverClock: ServerClock
  eventReminders: EventRemindersStatus
  dropiSyncStock: DropiSyncStockStatus
}

function formatOffsetLabel(offsetMin: number): string {
  const h = offsetMin / 60
  return `${offsetMin} min — si es positivo, la “hora local” del servidor va por detrás de UTC (≈ UTC − ${h} h)`
}

function presetFromExpression(expr: string): string {
  const found = CRON_PRESETS.find((p) => p.value === expr)
  return found ? found.value : 'custom'
}

function formatIso(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-ES')
  } catch {
    return iso
  }
}

export default function CronSettingsPage() {
  const { isAuthenticated, _hasHydrated: hasHydrated } = useAdminAuthStore()
  const [enableCronJobsEnv, setEnableCronJobsEnv] = useState(false)
  const [serverClock, setServerClock] = useState<ServerClock | null>(null)
  const [eventJob, setEventJob] = useState<EventRemindersStatus | null>(null)
  const [dropiStatus, setDropiStatus] = useState<DropiSyncStockStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [runningReminders, setRunningReminders] = useState(false)
  const [runningDropi, setRunningDropi] = useState(false)
  const [savingDropi, setSavingDropi] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [testUserId, setTestUserId] = useState('')
  const [dropiPreset, setDropiPreset] = useState(DROPI_CRON_DEFAULT)
  const [dropiCronCustom, setDropiCronCustom] = useState(DROPI_CRON_DEFAULT)
  const [dropiEnabled, setDropiEnabled] = useState(true)
  const [dropiTimezone, setDropiTimezone] = useState('America/Bogota')

  const dropiCronExpression = useMemo(
    () => (dropiPreset === 'custom' ? dropiCronCustom.trim() : dropiPreset),
    [dropiPreset, dropiCronCustom]
  )

  const applyDropiFromStatus = useCallback((d: DropiSyncStockStatus) => {
    setDropiStatus(d)
    const expr = d.cronExpression
    const preset = presetFromExpression(expr)
    setDropiPreset(preset)
    if (preset === 'custom') setDropiCronCustom(expr)
    setDropiEnabled(d.enabled)
    setDropiTimezone(d.timezone || 'America/Bogota')
  }, [])

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<{ success: boolean; data: CronStatusPayload }>(
        API_ENDPOINTS.ADMIN.SYSTEM.CRON_STATUS
      )
      if (res.data.success) {
        const data = res.data.data
        setEnableCronJobsEnv(data.enableCronJobsEnv)
        setServerClock(data.serverClock)
        setEventJob(data.eventReminders)
        applyDropiFromStatus(data.dropiSyncStock)
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
  }, [applyDropiFromStatus])

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return
    loadStatus()
  }, [hasHydrated, isAuthenticated, loadStatus])

  const handleSaveDropiConfig = async () => {
    try {
      setSavingDropi(true)
      const res = await apiClient.patch<{
        success: boolean
        data: { message: string; cronExpression: string; enabled: boolean; timezone: string }
      }>(API_ENDPOINTS.ADMIN.SYSTEM.CRON_DROPI_SYNC_STOCK_CONFIG, {
        cronExpression: dropiCronExpression,
        enabled: dropiEnabled,
        timezone: dropiTimezone.trim() || 'America/Bogota',
      })
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
      showNotification(msg || 'Error al guardar configuración Dropi', 'error')
    } finally {
      setSavingDropi(false)
    }
  }

  const handleRunDropiSync = async () => {
    try {
      setRunningDropi(true)
      const res = await apiClient.post<{
        success: boolean
        data: { message: string; skipped?: boolean }
      }>(API_ENDPOINTS.ADMIN.SYSTEM.CRON_DROPI_SYNC_STOCK_RUN)
      if (res.data.success) {
        showNotification(res.data.data.message, res.data.data.skipped ? 'info' : 'success')
        await loadStatus()
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
              ?.message
          : undefined
      showNotification(msg || 'Error al encolar sincronización Dropi', 'error')
    } finally {
      setRunningDropi(false)
    }
  }

  const handleRunReminders = async () => {
    try {
      setRunningReminders(true)
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
      setRunningReminders(false)
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

  const remindersStatusLabel =
    eventJob?.lastStatus === 'success'
      ? 'Correcto (última pasada OK)'
      : eventJob?.lastStatus === 'running'
        ? 'En ejecución'
        : eventJob?.lastStatus === 'error'
          ? 'Error en la última pasada'
          : '—'

  const dropiStatusLabel =
    dropiStatus?.lastStatus === 'success'
      ? 'Correcto'
      : dropiStatus?.lastStatus === 'running'
        ? 'En ejecución'
        : dropiStatus?.lastStatus === 'error'
          ? 'Error'
          : '—'

  return (
    <AdminSettingsLayout>
      <AdminCollapsibleCard
        title="Cómo leer esta pantalla"
        summary="ENABLE_CRON_JOBS, workers y zonas IANA"
        defaultOpen={false}
        className="mb-6"
      >
        <ul className="list-disc pl-5 space-y-2 text-sm text-blue-900/90">
          <li>
            <strong>ENABLE_CRON_JOBS</strong> en el servidor ({enableCronJobsEnv ? 'activo' : 'inactivo'}
            ): sin esto el API no programa crons aunque actives el checkbox aquí.
          </li>
          <li>
            <strong>Sincronización Dropi</strong> encola un job{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">SYNC_STOCK</code>. Debes tener{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">npm run workers:start</code> en otra terminal.
          </li>
          <li>Al guardar frecuencia/zona, el cron se reprograma en el proceso API actual.</li>
          <li>
            <strong>Recordatorios de eventos</strong> usan la zona IANA efectiva (p. ej. America/Bogota).
          </li>
        </ul>
      </AdminCollapsibleCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6 min-w-0">
      {serverClock ? (
        <AdminCollapsibleCard
          title="Reloj del servidor (API)"
          summary={serverClock.utcCalendarDate}
          defaultOpen={false}
        >
          <p className="text-xs text-gray-500 mb-3">
            Referencia UTC del proceso. La zona del cron Dropi y de recordatorios puede ser distinta.
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Hora actual (UTC, ISO)</dt>
              <dd className="font-mono text-gray-900 break-all">{serverClock.nowIsoUtc}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Día UTC</dt>
              <dd className="font-mono text-gray-900">{serverClock.utcCalendarDate}</dd>
            </div>
            <div>
              <dt className="text-gray-500">TZ proceso</dt>
              <dd className="text-gray-900">{serverClock.nodeTzEnv ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Desfase</dt>
              <dd className="text-gray-800">{formatOffsetLabel(serverClock.processTimezoneOffsetMinutes)}</dd>
            </div>
          </dl>
        </AdminCollapsibleCard>
      ) : null}

      <AdminCollapsibleCard
        title="Cron — sincronización Dropi (stock)"
        summary={dropiStatus?.cronDescription ?? 'Pipeline RAW → Estados'}
        defaultOpen
      >
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <ServerStackIcon className="w-5 h-5 text-indigo-600 shrink-0" />
          Programa la ejecución automática del pipeline. La configuración se guarda en BD y reprograma el cron en
          este proceso API.
        </p>

        {loading && !dropiStatus ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="dropi-preset" className="block text-xs font-medium text-gray-500 mb-1">
                  Frecuencia
                </label>
                <select
                  id="dropi-preset"
                  value={dropiPreset}
                  onChange={(e) => setDropiPreset(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {CRON_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dropi-tz" className="block text-xs font-medium text-gray-500 mb-1">
                  Zona IANA (node-cron)
                </label>
                <input
                  id="dropi-tz"
                  type="text"
                  value={dropiTimezone}
                  onChange={(e) => setDropiTimezone(e.target.value)}
                  placeholder="America/Bogota"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              {dropiPreset === 'custom' ? (
                <div className="lg:col-span-2">
                  <label htmlFor="dropi-cron-custom" className="block text-xs font-medium text-gray-500 mb-1">
                    Expresión cron
                  </label>
                  <input
                    id="dropi-cron-custom"
                    type="text"
                    value={dropiCronCustom}
                    onChange={(e) => setDropiCronCustom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
              ) : null}
              <div className="lg:col-span-2 flex items-center gap-2">
                <input
                  id="dropi-enabled"
                  type="checkbox"
                  checked={dropiEnabled}
                  onChange={(e) => setDropiEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="dropi-enabled" className="text-sm text-gray-800">
                  Cron activo (requiere ENABLE_CRON_JOBS=true en el servidor)
                </label>
              </div>
            </div>

            {dropiStatus ? (
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-6 border-t border-gray-100 pt-4">
                <div>
                  <dt className="text-gray-500">Programado en este proceso</dt>
                  <dd className="text-gray-900">
                    {dropiStatus.scheduledInProcess ? 'Sí' : 'No'}
                    {!enableCronJobsEnv ? (
                      <span className="block text-xs text-amber-700 mt-1">ENABLE_CRON_JOBS=false en API</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Descripción</dt>
                  <dd className="text-gray-800">{dropiStatus.cronDescription}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Último estado cron</dt>
                  <dd className="text-gray-900">
                    {dropiStatus.lastStatus ? (
                      <>
                        <span className="font-mono">{dropiStatus.lastStatus}</span>
                        <span className="text-gray-600"> — {dropiStatusLabel}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Último inicio (cron)</dt>
                  <dd className="text-gray-900">{formatIso(dropiStatus.lastStartedAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Último fin (cron)</dt>
                  <dd className="text-gray-900">{formatIso(dropiStatus.lastCompletedAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Config guardada</dt>
                  <dd className="text-gray-900">{formatIso(dropiStatus.configUpdatedAt)}</dd>
                </div>
                {dropiStatus.latestDropiJob ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-gray-500">Último job SYNC_STOCK</dt>
                    <dd className="text-gray-800 text-xs font-mono break-all">
                      {dropiStatus.latestDropiJob.id} — {dropiStatus.latestDropiJob.status} (
                      {dropiStatus.latestDropiJob.progress}%)
                      {dropiStatus.latestDropiJob.startedAt
                        ? ` · iniciado ${formatIso(dropiStatus.latestDropiJob.startedAt)}`
                        : ` · encolado ${formatIso(dropiStatus.latestDropiJob.createdAt)}`}
                    </dd>
                  </div>
                ) : null}
                {dropiStatus.lastError ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-red-600">Último error</dt>
                    <dd className="text-red-800 whitespace-pre-wrap break-words">{dropiStatus.lastError}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveDropiConfig}
                disabled={savingDropi}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingDropi ? 'Guardando…' : 'Guardar y reprogramar'}
              </button>
              <button
                type="button"
                onClick={handleRunDropiSync}
                disabled={runningDropi}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-300 text-indigo-800 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4" />
                {runningDropi ? 'Encolando…' : 'Encolar sync ahora'}
              </button>
              <button
                type="button"
                onClick={() => loadStatus()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </>
        )}
      </AdminCollapsibleCard>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
      <AdminCollapsibleCard
        title="Cron — recordatorios de eventos"
        summary={eventJob?.cronExpression ?? 'Diario en zona efectiva'}
        defaultOpen
      >
        <p className="text-sm text-gray-600 mb-4">
          Notificaciones cuando un evento cumple los días de anticipación configurados.
        </p>

        {loading && !eventJob ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : eventJob ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-6">
            <div>
              <dt className="text-gray-500">Expresión cron</dt>
              <dd className="font-mono text-gray-900">{eventJob.cronExpression}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Zona efectiva</dt>
              <dd className="font-mono text-gray-900">{eventJob.effectiveTimezone ?? 'America/Bogota'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado</dt>
              <dd className="text-gray-900">
                {eventJob.lastStatus ? (
                  <>
                    <span className="font-mono">{eventJob.lastStatus}</span>
                    <span className="text-gray-600"> — {remindersStatusLabel}</span>
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-gray-500">Qué hace</dt>
              <dd className="text-gray-700">{eventJob.cronDescription}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Último inicio</dt>
              <dd>{formatIso(eventJob.lastStartedAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Último fin</dt>
              <dd>{formatIso(eventJob.lastCompletedAt)}</dd>
            </div>
            {eventJob.lastError ? (
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="text-red-600">Último error</dt>
                <dd className="text-red-800 whitespace-pre-wrap">{eventJob.lastError}</dd>
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
            disabled={runningReminders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <PlayIcon className="w-4 h-4" />
            {runningReminders ? 'Ejecutando…' : 'Ejecutar recordatorios ahora'}
          </button>
        </div>
      </AdminCollapsibleCard>

      <AdminCollapsibleCard
        title="Notificación de prueba"
        summary="admin_test para un userId"
        defaultOpen={false}
      >
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
          <BellAlertIcon className="w-5 h-5 text-amber-600 shrink-0" />
          Crea una notificación <code className="text-xs bg-gray-100 px-1 rounded">admin_test</code> para el
          usuario indicado (ID en la app Tanku).
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
      </AdminCollapsibleCard>
        </div>
      </div>
    </AdminSettingsLayout>
  )
}
