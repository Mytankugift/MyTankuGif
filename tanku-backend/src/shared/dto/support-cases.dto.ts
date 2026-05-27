/**
 * DTOs para módulo de postventa / casos de soporte
 */

export type SupportCaseTypeDTO =
  | 'NOT_RECEIVED'
  | 'DAMAGED'
  | 'DELAY'
  | 'WRONG_ITEM'
  | 'OTHER';

export type SupportCaseStatusDTO =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'WAITING_USER'
  | 'RESOLVED'
  | 'CLOSED';

export type SupportCaseEventKindDTO =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PUBLIC_MESSAGE'
  | 'INTERNAL_NOTE'
  | 'DROPI_REFRESH';

export type SupportCaseActorTypeDTO = 'USER' | 'ADMIN' | 'SYSTEM';

export type SupportCaseSnapshotDTO = {
  orderId: string;
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
  }>;
  focusedOrderItemId?: string | null;
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
  userId: string;
  orderId: string;
  orderItemId: string | null;
  caseType: SupportCaseTypeDTO;
  status: SupportCaseStatusDTO;
  description: string;
  snapshot: SupportCaseSnapshotDTO;
  createdAt: string;
  updatedAt: string;
};

export type SupportCaseDetailDTO = SupportCaseDTO & {
  events: SupportCaseEventDTO[];
};

export type SupportCaseAdminListItemDTO = SupportCaseDTO & {
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
};

export type SupportCaseAdminDetailDTO = SupportCaseDetailDTO & {
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
};

export type CreateSupportCaseInput = {
  orderId: string;
  orderItemId?: string | null;
  caseType: SupportCaseTypeDTO;
  description: string;
};

export type ListSupportCasesAdminQuery = {
  status?: SupportCaseStatusDTO;
  caseType?: SupportCaseTypeDTO;
  orderId?: string;
  from?: string;
  to?: string;
};

export type UpdateSupportCaseStatusInput = {
  status: SupportCaseStatusDTO;
};
