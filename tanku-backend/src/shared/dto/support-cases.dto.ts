/**
 * DTOs para módulo de postventa / casos de soporte
 */

export type SupportCaseTypeDTO =
  | 'NOT_RECEIVED'
  | 'DAMAGED'
  | 'DELAY'
  | 'WRONG_ITEM'
  | 'INCOMPLETE';

export type SupportCaseStatusDTO =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'WAITING_USER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportCaseEventKindDTO =
  | 'CREATED'
  | 'CASE_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'PUBLIC_MESSAGE'
  | 'USER_MESSAGE'
  | 'INTERNAL_NOTE'
  | 'DROPI_REFRESH';

export type SupportCaseActorTypeDTO = 'USER' | 'ADMIN' | 'SYSTEM';

export type SupportCaseSnapshotDTO = {
  orderId: string;
  orderRef: string | null;
  reportedAt: string;
  paymentStatus: string;
  paymentMethod: string | null;
  address: {
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    phone: string;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    dropiOrderId: number | null;
    dropiStatus: string | null;
    productImageUrl?: string | null;
  }>;
  focusedOrderItemId?: string | null;
  /** Teléfono de contacto del usuario al reportar (perfil, E.164 +57…) */
  contactPhone?: string | null;
};

export type SupportCaseLinkedOrderItemDTO = {
  id: string;
  dropiOrderId: number | null;
  dropiStatus: string | null;
  shippingGuide: string | null;
  shippingCompany: string | null;
};

export type SupportCaseAssignedAdminDTO = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

export type SupportCaseEventDTO = {
  id: string;
  kind: SupportCaseEventKindDTO;
  payload: Record<string, unknown> | null;
  actorType: SupportCaseActorTypeDTO;
  actorId: string | null;
  createdAt: string;
};

export type SupportCaseDTO = {
  id: string;
  ref: string | null;
  userId: string;
  orderId: string;
  orderRef: string | null;
  orderItemId: string | null;
  caseType: SupportCaseTypeDTO;
  status: SupportCaseStatusDTO;
  description: string;
  snapshot: SupportCaseSnapshotDTO;
  assignedAdminUserId: string | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportCaseAttachmentDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

/** Aviso cuando las evidencias fueron eliminadas por retención automática. */
export type SupportCaseEvidenceNoticeDTO = {
  purged: true;
  retentionDays: number;
  purgedAt: string;
};

export type SupportCaseDetailDTO = SupportCaseDTO & {
  events: SupportCaseEventDTO[];
  attachments: SupportCaseAttachmentDTO[];
  evidenceNotice: SupportCaseEvidenceNoticeDTO | null;
};

export type ResolveSupportCaseInput = {
  /** Requerido si no hay ningún mensaje público de soporte en el caso. */
  acknowledgeNoReply?: boolean;
};

export type SupportCaseAdminListItemDTO = SupportCaseDTO & {
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  assignedAdmin: SupportCaseAssignedAdminDTO | null;
};

export type SupportCaseAdminDetailDTO = SupportCaseDetailDTO & {
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  assignedAdmin: SupportCaseAssignedAdminDTO | null;
  linkedOrderItem: SupportCaseLinkedOrderItemDTO | null;
  dropiOrderItems: SupportCaseDropiOrderItemDTO[];
};

export type CreateSupportCaseInput = {
  orderId: string;
  orderItemId?: string | null;
  caseType: SupportCaseTypeDTO;
  description: string;
  contactPhone: string;
};

export type ListSupportCasesAdminQuery = {
  /** Un estado o varios separados por coma (p. ej. OPEN,IN_REVIEW) */
  status?: SupportCaseStatusDTO | string;
  /** Un tipo o varios separados por coma */
  caseType?: SupportCaseTypeDTO | string;
  orderId?: string;
  /** Ref de caso (RCL-…), ref de pedido (ORD-…) o texto libre */
  search?: string;
  from?: string;
  to?: string;
  assignedTo?: 'me' | 'unassigned' | string;
};

export type UpdateSupportCaseStatusInput = {
  status: SupportCaseStatusDTO;
};

export type SupportCaseMessageInput = {
  message: string;
};

export type SupportCaseNoteInput = {
  note: string;
};

export type SupportCaseUserReplyInput = {
  message: string;
};

export type SupportCaseDropiOrderItemDTO = {
  orderItemId: string;
  productTitle: string;
  variantTitle: string;
  dropiOrderId: number;
  dropiStatus: string | null;
  productImageUrl?: string | null;
  /** ID proveedor Dropi (webhook o datos guardados en order_item). */
  dropiSupplierId?: number | null;
  dropiSupplierName?: string | null;
  shippingCompany?: string | null;
  shippingGuide?: string | null;
};

export type SupportCaseDropiPreviewDTO = {
  orderItemId: string;
  dropiOrderId: number;
  preview: Record<string, unknown>;
  dropiSupplierId?: number | null;
};
