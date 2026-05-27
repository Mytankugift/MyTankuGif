export type SupportCaseType =
  | 'NOT_RECEIVED'
  | 'DAMAGED'
  | 'DELAY'
  | 'WRONG_ITEM'
  | 'OTHER'

export type SupportCaseStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'WAITING_USER'
  | 'RESOLVED'
  | 'CLOSED'

export type SupportCaseEventKind =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PUBLIC_MESSAGE'
  | 'INTERNAL_NOTE'
  | 'DROPI_REFRESH'

export type SupportCaseSnapshot = {
  orderId: string
  reportedAt: string
  paymentStatus: string
  paymentMethod: string | null
  address: {
    firstName: string
    lastName: string
    city: string
    state: string
    phone: string
  } | null
  items: Array<{
    id: string
    productId: string
    productTitle: string
    variantTitle: string
    quantity: number
    dropiOrderId: number | null
    dropiStatus: string | null
  }>
  focusedOrderItemId?: string | null
}

export type SupportCaseEvent = {
  id: string
  kind: SupportCaseEventKind
  payload: Record<string, unknown> | null
  actorType: string
  actorId: string | null
  createdAt: string
}

export type SupportCaseListItem = {
  id: string
  userId: string
  orderId: string
  orderItemId: string | null
  caseType: SupportCaseType
  status: SupportCaseStatus
  description: string
  snapshot: SupportCaseSnapshot
  createdAt: string
  updatedAt: string
  userEmail: string
  userFirstName: string | null
  userLastName: string | null
}

export type SupportCaseDetail = SupportCaseListItem & {
  events: SupportCaseEvent[]
}

export const CASE_TYPE_LABELS: Record<SupportCaseType, string> = {
  NOT_RECEIVED: 'No recibido',
  DAMAGED: 'Dañado',
  DELAY: 'Demora',
  WRONG_ITEM: 'Producto incorrecto',
  OTHER: 'Otro',
}

export const CASE_STATUS_LABELS: Record<SupportCaseStatus, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  WAITING_USER: 'Esperando usuario',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
}

export const KANBAN_STATUSES: SupportCaseStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
]

export type StatusTransition = {
  next: SupportCaseStatus
  label: string
  variant: 'primary' | 'secondary'
}

/** Transiciones permitidas desde el estado actual (flujo operativo por pasos). */
export function getNextStatusTransitions(current: SupportCaseStatus): StatusTransition[] {
  switch (current) {
    case 'OPEN':
      return [{ next: 'IN_REVIEW', label: 'Pasar a en revisión', variant: 'primary' }]
    case 'IN_REVIEW':
      return [
        { next: 'WAITING_USER', label: 'Esperar respuesta del usuario', variant: 'secondary' },
        { next: 'RESOLVED', label: 'Marcar como resuelto', variant: 'primary' },
      ]
    case 'WAITING_USER':
      return [
        { next: 'IN_REVIEW', label: 'Retomar revisión', variant: 'secondary' },
        { next: 'RESOLVED', label: 'Marcar como resuelto', variant: 'primary' },
      ]
    case 'RESOLVED':
      return [{ next: 'CLOSED', label: 'Cerrar caso', variant: 'primary' }]
    case 'CLOSED':
    default:
      return []
  }
}

export function statusBadgeClass(status: SupportCaseStatus): string {
  switch (status) {
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-800'
    case 'IN_REVIEW':
      return 'bg-blue-100 text-blue-800'
    case 'WAITING_USER':
      return 'bg-orange-100 text-orange-800'
    case 'RESOLVED':
      return 'bg-green-100 text-green-800'
    case 'CLOSED':
      return 'bg-gray-100 text-gray-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
