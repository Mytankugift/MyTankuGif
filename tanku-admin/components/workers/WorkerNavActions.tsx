'use client'

import { usePathname } from 'next/navigation'
import { ArrowPathIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline'
import { useWorkerToolbarStore } from '@/lib/stores/worker-toolbar-store'

export function WorkerNavActions() {
  const pathname = usePathname()
  const workerId = pathname?.startsWith('/workers/')
    ? pathname.replace('/workers/', '').split('/')[0]
    : null

  const executing = useWorkerToolbarStore((s) => s.executing)
  const activeJob = useWorkerToolbarStore((s) => s.activeJob)
  const storeWorkerId = useWorkerToolbarStore((s) => s.workerId)
  const executeRef = useWorkerToolbarStore((s) => s.executeRef)
  const cancelRef = useWorkerToolbarStore((s) => s.cancelRef)

  if (!workerId || storeWorkerId !== workerId || !executeRef) {
    return null
  }

  if (activeJob) {
    return (
      <div className="flex items-center gap-2 max-w-[min(100%,14rem)] lg:max-w-none">
        <span className="text-xs text-gray-700 font-medium truncate min-w-0">
          {activeJob.statusLabel}
        </span>
        <span className="text-xs text-gray-500 tabular-nums shrink-0">{activeJob.progressText}</span>
        <button
          type="button"
          onClick={() => cancelRef?.(activeJob.id)}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
        >
          <StopIcon className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => executeRef()}
      disabled={executing}
      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {executing ? (
        <>
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
          Ejecutando...
        </>
      ) : (
        <>
          <PlayIcon className="w-4 h-4" />
          Ejecutar
        </>
      )}
    </button>
  )
}
