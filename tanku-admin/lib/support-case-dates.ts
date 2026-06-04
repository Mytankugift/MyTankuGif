import type { SupportCaseDetail } from '@/lib/types/support-cases'

/** Fecha en que el caso pasó a CLOSED (evento STATUS_CHANGED o updatedAt de respaldo). */
export function getSupportCaseClosedAt(
  detail: Pick<SupportCaseDetail, 'status' | 'updatedAt' | 'events'>
): string | null {
  if (detail.status !== 'CLOSED') return null

  const closedEvents = detail.events
    .filter(
      (e) =>
        e.kind === 'STATUS_CHANGED' &&
        e.payload &&
        typeof e.payload === 'object' &&
        (e.payload as { to?: string }).to === 'CLOSED'
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

  return closedEvents[0]?.createdAt ?? detail.updatedAt ?? null
}
