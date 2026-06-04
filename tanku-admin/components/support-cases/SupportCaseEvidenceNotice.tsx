'use client'

import type { SupportCaseEvidenceNotice } from '@/lib/types/support-cases'

interface SupportCaseEvidenceNoticeProps {
  notice: SupportCaseEvidenceNotice
  variant?: 'default' | 'compact'
}

export function SupportCaseEvidenceNoticeBlock({
  notice,
  variant = 'default',
}: SupportCaseEvidenceNoticeProps) {
  const compact = variant === 'compact'
  const purgedDate = new Date(notice.purgedAt).toLocaleDateString('es-CO', {
    dateStyle: 'medium',
  })

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 text-gray-700 ${
        compact ? 'p-3 text-xs' : 'p-4 text-sm'
      }`}
    >
      <p className={`font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
        Evidencias no disponibles
      </p>
      <p className={`mt-1 leading-relaxed ${compact ? 'text-[11px]' : ''}`}>
        Los archivos de este reporte se eliminaron automáticamente tras{' '}
        <strong>{notice.retentionDays} días</strong> por política de retención
        {purgedDate ? <> (última purga: {purgedDate})</> : null}. La descripción y el historial del
        caso se conservan.
      </p>
    </div>
  )
}
