export type SupportCaseType =
  | 'NOT_RECEIVED'
  | 'DAMAGED'
  | 'DELAY'
  | 'WRONG_ITEM'
  | 'INCOMPLETE'

export type SupportCaseStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'WAITING_USER'
  | 'RESOLVED'
  | 'CLOSED'

export type SupportCaseEventKind =
  | 'CREATED'
  | 'CASE_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PUBLIC_MESSAGE'
  | 'USER_MESSAGE'
  | 'INTERNAL_NOTE'
  | 'DROPI_REFRESH'

export type SupportCaseAssignedAdmin = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

export type SupportCaseLinkedOrderItem = {
  id: string
  dropiOrderId: number | null
  dropiStatus: string | null
  shippingGuide: string | null
  shippingCompany: string | null
}

export type SupportCaseSnapshot = {
  orderId: string
  orderRef?: string | null
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
    productImageUrl?: string | null
  }>
  focusedOrderItemId?: string | null
  contactPhone?: string | null
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
  ref: string | null
  userId: string
  orderId: string
  orderRef: string | null
  orderItemId: string | null
  caseType: SupportCaseType
  status: SupportCaseStatus
  description: string
  snapshot: SupportCaseSnapshot
  assignedAdminUserId: string | null
  assignedAt: string | null
  createdAt: string
  updatedAt: string
  userEmail: string
  userFirstName: string | null
  userLastName: string | null
  assignedAdmin: SupportCaseAssignedAdmin | null
}

export type SupportCaseAttachment = {
  id: string
  fileName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export type SupportCaseEvidenceNotice = {
  purged: true
  retentionDays: number
  purgedAt: string
}

export type SupportCaseDropiOrderItem = {
  orderItemId: string
  productTitle: string
  variantTitle: string
  dropiOrderId: number
  dropiStatus: string | null
  productImageUrl?: string | null
  dropiSupplierId?: number | null
  dropiSupplierName?: string | null
  shippingCompany?: string | null
  shippingGuide?: string | null
}

export type SupportCaseDropiPreview = {
  orderItemId: string
  dropiOrderId: number
  preview: Record<string, unknown>
  dropiSupplierId?: number | null
}

export type SupportCaseDetail = SupportCaseListItem & {
  events: SupportCaseEvent[]
  attachments: SupportCaseAttachment[]
  evidenceNotice: SupportCaseEvidenceNotice | null
  linkedOrderItem: SupportCaseLinkedOrderItem | null
  dropiOrderItems: SupportCaseDropiOrderItem[]
}

export function supportCaseHasPublicReply(events: SupportCaseEvent[]): boolean {
  return events.some((e) => e.kind === 'PUBLIC_MESSAGE')
}

export const CASE_TYPE_LABELS: Record<SupportCaseType, string> = {
  NOT_RECEIVED: 'No recibido',
  DAMAGED: 'Dañado',
  DELAY: 'Demora',
  WRONG_ITEM: 'Producto incorrecto',
  INCOMPLETE: 'Incompleto',
}

export function assignedAdminDisplayName(admin: SupportCaseAssignedAdmin | null): string {
  if (!admin) return ''
  const name = [admin.firstName, admin.lastName].filter(Boolean).join(' ').trim()
  return name || admin.email
}

export const CASE_STATUS_LABELS: Record<SupportCaseStatus, string> = {
  OPEN: 'Pendiente',
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

/** Flujo visual en detalle ERP (sin «Esperando usuario»). */
export const FLOW_STATUSES: SupportCaseStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'CLOSED',
]

export function statusForFlowDisplay(status: SupportCaseStatus): SupportCaseStatus {
  if (status === 'WAITING_USER') return 'IN_REVIEW'
  return status
}

export type StatusTransition = {
  next: SupportCaseStatus
  label: string
  variant: 'primary' | 'secondary'
}

/** Transiciones permitidas desde el estado actual (flujo operativo por pasos). */
export function getNextStatusTransitions(current: SupportCaseStatus): StatusTransition[] {
  switch (current) {
    case 'OPEN':
      return []
    case 'IN_REVIEW':
      return [{ next: 'RESOLVED', label: 'Marcar como resuelto', variant: 'primary' }]
    case 'WAITING_USER':
      return [{ next: 'RESOLVED', label: 'Marcar como resuelto', variant: 'primary' }]
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
