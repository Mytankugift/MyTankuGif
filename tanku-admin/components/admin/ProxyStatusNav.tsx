'use client'

import { usePathname } from 'next/navigation'
import { CheckCircleIcon, ServerIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { config } from '@/lib/config'
import { useProxyStatus } from '@/lib/hooks/useProxyStatus'

function truncateUrl(url: string, max = 28): string {
  if (url.length <= max) return url
  return `${url.slice(0, max)}…`
}

export function ProxyStatusNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const isWorkersRoute =
    pathname === '/workers' || (pathname?.startsWith('/workers/') ?? false)

  const { proxyStatus } = useProxyStatus(isWorkersRoute)

  if (!isWorkersRoute) return null

  const proxyLabel =
    proxyStatus?.status === 'not_configured'
      ? 'No configurado'
      : proxyStatus?.status === 'active_with_errors'
        ? 'Activo con errores'
        : proxyStatus?.isActive
          ? 'Activo'
          : 'Inactivo'

  const proxyBadgeClass = proxyStatus?.isActive
    ? proxyStatus.status === 'active_with_errors'
      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
      : 'bg-green-50 text-green-700 border-green-200'
    : proxyStatus?.status === 'not_configured'
      ? 'bg-gray-50 text-gray-700 border-gray-200'
      : 'bg-red-50 text-red-700 border-red-200'

  if (compact) {
    return (
      <div className="text-xs space-y-1.5 text-gray-600">
        <div className="flex items-center gap-1.5 font-mono truncate">
          <ServerIcon className="w-3.5 h-3.5 shrink-0" />
          {truncateUrl(config.apiUrl, 36)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              config.isProduction
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            {config.isProduction ? 'PROD' : 'LOCAL'}
          </span>
          {proxyStatus ? (
            <span className={`px-2 py-0.5 rounded border font-medium ${proxyBadgeClass}`}>
              Proxy: {proxyLabel}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className="hidden lg:flex flex-col items-end gap-0.5 max-w-md"
      title={
        proxyStatus?.message
          ? `${proxyStatus.proxyUrl ? `URL: ${proxyStatus.proxyUrl}\n` : ''}${proxyStatus.message}`
          : config.apiUrl
      }
    >
      <div className="flex items-center gap-2 flex-wrap justify-end text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <ServerIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono truncate max-w-[140px]">{truncateUrl(config.apiUrl)}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            config.isProduction
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          {config.isProduction ? 'PROD' : 'LOCAL'}
        </span>
        {proxyStatus ? (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-medium ${proxyBadgeClass}`}
          >
            {proxyStatus.isActive && proxyStatus.status !== 'active_with_errors' ? (
              <CheckCircleIcon className="w-3.5 h-3.5" />
            ) : (
              <XCircleIcon className="w-3.5 h-3.5" />
            )}
            Proxy: {proxyLabel}
            {proxyStatus.responseTime != null ? (
              <span className="opacity-75">({proxyStatus.responseTime}ms)</span>
            ) : null}
            {proxyStatus.httpStatus != null ? (
              <span className="opacity-75">[HTTP {proxyStatus.httpStatus}]</span>
            ) : null}
          </span>
        ) : (
          <span className="text-gray-400">Proxy: …</span>
        )}
      </div>
    </div>
  )
}
