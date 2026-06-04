'use client'

import {
  CASE_STATUS_LABELS,
  FLOW_STATUSES,
  statusForFlowDisplay,
  type SupportCaseStatus,
} from '@/lib/types/support-cases'

interface SupportCaseStatusStepperProps {
  status: SupportCaseStatus
  className?: string
}

function stepState(
  flowStatus: SupportCaseStatus,
  step: SupportCaseStatus
): 'done' | 'current' | 'pending' {
  const currentIdx = FLOW_STATUSES.indexOf(flowStatus)
  const stepIdx = FLOW_STATUSES.indexOf(step)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  return 'pending'
}

/** Flujo del caso: solo etiquetas; el paso actual resaltado. */
export function SupportCaseStatusStepper({ status, className = '' }: SupportCaseStatusStepperProps) {
  const flowStatus = statusForFlowDisplay(status)

  return (
    <div className={`min-w-0 ${className}`} aria-label="Progreso del caso">
      <ol
        className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-xs sm:text-sm"
        role="list"
      >
        {FLOW_STATUSES.map((step, index) => {
          const state = stepState(flowStatus, step)
          const label = CASE_STATUS_LABELS[step]

          return (
            <li key={step} className="flex items-center gap-2" role="listitem">
              {index > 0 ? (
                <span className="text-slate-300 select-none" aria-hidden>
                  /
                </span>
              ) : null}
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={
                  state === 'current'
                    ? 'rounded-md bg-slate-900 px-2.5 py-1 font-semibold text-white'
                    : state === 'done'
                      ? 'font-medium text-slate-600'
                      : 'text-slate-400'
                }
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
