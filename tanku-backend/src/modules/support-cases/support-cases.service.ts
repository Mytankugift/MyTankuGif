import {
  Prisma,
  SupportCaseActorType,
  SupportCaseEventKind,
  SupportCaseStatus,
  SupportCaseType,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/AppError';
import {
  CreateSupportCaseInput,
  ListSupportCasesAdminQuery,
  SupportCaseAdminDetailDTO,
  SupportCaseAdminListItemDTO,
  SupportCaseAssignedAdminDTO,
  SupportCaseAttachmentDTO,
  SupportCaseDetailDTO,
  SupportCaseDTO,
  SupportCaseEvidenceNoticeDTO,
  SupportCaseEventDTO,
  SupportCaseEventKindDTO,
  SupportCaseLinkedOrderItemDTO,
  SupportCaseDropiOrderItemDTO,
  SupportCaseDropiPreviewDTO,
  SupportCaseMessageInput,
  ResolveSupportCaseInput,
  SupportCaseNoteInput,
  SupportCaseUserReplyInput,
  SupportCaseSnapshotDTO,
  SupportCaseStatusDTO,
  SupportCaseTypeDTO,
  UpdateSupportCaseStatusInput,
} from '../../shared/dto/support-cases.dto';
import { OrdersService, OrderResponse } from '../orders/orders.service';
import { DropiOrdersService } from '../orders/dropi-orders.service';
import {
  dropiOrderSyncService,
  storedDataToDropiStatusResponse,
} from '../orders/dropi-order-sync.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatSupportCaseLabel,
  getSupportCaseRegisteredCopy,
  getSupportCaseReplyCopy,
  getSupportCaseStatusCopy,
} from '../notifications/support-notification-copy';
import { S3Service } from '../../shared/services/s3.service';
import { isValidColombiaPhone, normalizeColombiaPhone } from '../../shared/utils/colombia-phone';
import { allocateEntityRef, isEntityRef } from '../../shared/utils/entity-ref';
import { env } from '../../config/env';
import { SupportCasesConfigService } from './support-cases-config.service';
import { DEFAULT_SUPPORT_EVIDENCE_RETENTION_DAYS } from './support-case-evidence-retention.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendEmail } = require('../../email/email.service');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSupportCaseNewTemplate } = require('../../email/templates/support-case-new.template');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  getSupportCaseUserReplyTemplate,
} = require('../../email/templates/support-case-user-reply.template');

/** Estados que disparan `support_case_status` al usuario (sin CLOSED ni WAITING_USER). */
const USER_NOTIFY_STATUS_TRANSITIONS: SupportCaseStatusDTO[] = ['IN_REVIEW', 'RESOLVED'];

const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_ATTACHMENTS = 3;
const MAX_IMAGE_PDF_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const CASE_TYPES: SupportCaseTypeDTO[] = [
  'NOT_RECEIVED',
  'DAMAGED',
  'DELAY',
  'WRONG_ITEM',
  'INCOMPLETE',
];

const EVIDENCE_REQUIRED_TYPES = new Set<SupportCaseTypeDTO>([
  'DAMAGED',
  'WRONG_ITEM',
  'INCOMPLETE',
]);

const MIN_MESSAGE_LENGTH = 3;
const MAX_MESSAGE_LENGTH = 2000;
const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 5000;

const CASE_STATUSES: SupportCaseStatusDTO[] = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
];

/** Eventos visibles para el usuario en app (incluye CREATED como primer mensaje en historial). */
function userVisibleEventKinds(): SupportCaseEventKind[] {
  const kinds: SupportCaseEventKind[] = [
    SupportCaseEventKind.CREATED,
    SupportCaseEventKind.STATUS_CHANGED,
    SupportCaseEventKind.PUBLIC_MESSAGE,
  ];
  if (SupportCaseEventKind.USER_MESSAGE != null) {
    kinds.push(SupportCaseEventKind.USER_MESSAGE);
  }
  return kinds;
}

function resolveAdminFrontendBaseUrl(): string {
  const fromEnv = process.env.ADMIN_FRONTEND_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim());
  const adminOrigin = corsOrigins.find((o) => /:3001\b/.test(o) || o.includes('admin'));
  return (adminOrigin ?? 'http://localhost:3001').replace(/\/$/, '');
}

export class SupportCasesService {
  private ordersService = new OrdersService();
  private dropiOrdersService = new DropiOrdersService();
  private notificationsService = new NotificationsService();
  private s3Service = new S3Service();
  private supportCasesConfigService = new SupportCasesConfigService();

  private requiresEvidence(caseType: SupportCaseTypeDTO): boolean {
    return EVIDENCE_REQUIRED_TYPES.has(caseType);
  }

  private isValidCaseType(value: string): value is SupportCaseTypeDTO {
    return CASE_TYPES.includes(value as SupportCaseTypeDTO);
  }

  private isValidCaseStatus(value: string): value is SupportCaseStatusDTO {
    return CASE_STATUSES.includes(value as SupportCaseStatusDTO);
  }

  private normalizeProductImageUrl(imagePath: string | null | undefined): string | null {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const cdnBase = env.DROPI_CDN_BASE || 'https://d39ru7awumhhs2.cloudfront.net';
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${cdnBase}/${cleanPath}`;
  }

  private pickProductImageFromOrderItem(item: OrderResponse['items'][number]): string | null {
    const product = item.product as { images?: string[] } | undefined;
    const first = product?.images?.[0];
    return this.normalizeProductImageUrl(first);
  }

  private async enrichSnapshotWithProductImages(
    snapshot: SupportCaseSnapshotDTO
  ): Promise<SupportCaseSnapshotDTO> {
    const missingIds = snapshot.items
      .filter((i) => !i.productImageUrl)
      .map((i) => i.productId);
    if (missingIds.length === 0) return snapshot;

    const products = await prisma.product.findMany({
      where: { id: { in: [...new Set(missingIds)] } },
      select: { id: true, images: true },
    });
    const imageByProductId = new Map(
      products.map((p) => [p.id, this.normalizeProductImageUrl(p.images?.[0] ?? null)])
    );

    return {
      ...snapshot,
      items: snapshot.items.map((item) => ({
        ...item,
        productImageUrl:
          item.productImageUrl ?? imageByProductId.get(item.productId) ?? null,
      })),
    };
  }

  buildOrderSnapshot(
    order: OrderResponse,
    focusedOrderItemId?: string | null,
    contactPhone?: string | null
  ): SupportCaseSnapshotDTO {
    return {
      orderId: order.id,
      orderRef: order.ref ?? null,
      reportedAt: new Date().toISOString(),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      address: order.address
        ? {
            firstName: order.address.firstName,
            lastName: order.address.lastName,
            city: order.address.city,
            state: order.address.state,
            phone: order.address.phone,
          }
        : null,
      items: (order.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        productTitle: item.product?.title ?? '',
        variantTitle: item.variant?.title ?? '',
        quantity: item.quantity,
        dropiOrderId: item.dropiOrderId ?? null,
        dropiStatus: item.dropiStatus ?? null,
        productImageUrl: this.pickProductImageFromOrderItem(item),
      })),
      focusedOrderItemId: focusedOrderItemId ?? null,
      contactPhone: contactPhone ?? null,
    };
  }

  private mapEvent(event: {
    id: string;
    kind: SupportCaseEventKind;
    payload: Prisma.JsonValue;
    actorType: SupportCaseActorType;
    actorId: string | null;
    createdAt: Date;
  }): SupportCaseEventDTO {
    return {
      id: event.id,
      kind: event.kind as SupportCaseEventKindDTO,
      payload:
        event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
          ? (event.payload as Record<string, unknown>)
          : null,
      actorType: event.actorType,
      actorId: event.actorId,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private mapEvidenceNotice(record: {
    evidencePurgedAt: Date | null;
    evidencePurgedRetentionDays: number | null;
  }): SupportCaseEvidenceNoticeDTO | null {
    if (!record.evidencePurgedAt) return null;
    return {
      purged: true,
      retentionDays:
        record.evidencePurgedRetentionDays ?? DEFAULT_SUPPORT_EVIDENCE_RETENTION_DAYS,
      purgedAt: record.evidencePurgedAt.toISOString(),
    };
  }

  private async caseHasPublicMessageFromSupport(caseId: string): Promise<boolean> {
    const count = await prisma.supportCaseEvent.count({
      where: {
        supportCaseId: caseId,
        kind: SupportCaseEventKind.PUBLIC_MESSAGE,
      },
    });
    return count > 0;
  }

  private mapAttachment(record: {
    id: string;
    fileName: string;
    mimeType: string;
    size: number;
    url: string;
    createdAt: Date;
  }): SupportCaseAttachmentDTO {
    return {
      id: record.id,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      url: record.url,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private validateEvidenceFiles(files: Express.Multer.File[]): void {
    if (files.length > MAX_ATTACHMENTS) {
      throw new BadRequestError(`Máximo ${MAX_ATTACHMENTS} archivos por reporte`);
    }
    for (const file of files) {
      if (!ALLOWED_ATTACHMENT_MIMES.has(file.mimetype)) {
        throw new BadRequestError(
          'Solo se permiten imágenes (JPG, PNG), PDF o video (MP4, WebM, MOV)'
        );
      }
      const maxBytes = file.mimetype.startsWith('video/')
        ? MAX_VIDEO_BYTES
        : MAX_IMAGE_PDF_BYTES;
      if (file.size > maxBytes) {
        throw new BadRequestError(
          file.mimetype.startsWith('video/')
            ? 'Cada video debe pesar máximo 25 MB'
            : 'Cada archivo debe pesar máximo 10 MB'
        );
      }
    }
  }

  private mapAssignedAdmin(
    admin: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null
  ): SupportCaseAssignedAdminDTO | null {
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
  }

  private extractDropiSupplierId(data: Prisma.JsonValue | null): number | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const record = data as Record<string, unknown>;
    const top = record.supplier_id;
    if (typeof top === 'number' && Number.isFinite(top)) return top;
    if (typeof top === 'string' && /^\d+$/.test(top.trim())) return parseInt(top.trim(), 10);

    const supplier = record.supplier;
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) return null;
    const s = supplier as { id?: number; key_base_data?: number };
    const id = s.id ?? s.key_base_data;
    return id != null && Number.isFinite(Number(id)) ? Number(id) : null;
  }

  private extractDropiSupplierName(data: Prisma.JsonValue | null): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const supplier = (data as Record<string, unknown>).supplier;
    if (!supplier || typeof supplier !== 'object' || Array.isArray(supplier)) return null;
    const s = supplier as { name?: string; store_name?: string };
    const name = (s.store_name ?? s.name)?.trim();
    return name || null;
  }

  private extractDropiShippingCompany(data: Prisma.JsonValue | null): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const value = (data as Record<string, unknown>).shipping_company;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private extractDropiShippingGuide(data: Prisma.JsonValue | null): string | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const value = (data as Record<string, unknown>).shipping_guide;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private mapLinkedOrderItem(
    item: {
      id: string;
      dropiOrderId: number | null;
      dropiStatus: string | null;
      dropiWebhookData: Prisma.JsonValue;
    } | null
  ): SupportCaseLinkedOrderItemDTO | null {
    if (!item) return null;
    const webhook =
      item.dropiWebhookData &&
      typeof item.dropiWebhookData === 'object' &&
      !Array.isArray(item.dropiWebhookData)
        ? (item.dropiWebhookData as Record<string, unknown>)
        : null;
    return {
      id: item.id,
      dropiOrderId: item.dropiOrderId,
      dropiStatus: item.dropiStatus,
      shippingGuide:
        typeof webhook?.shipping_guide === 'string' ? webhook.shipping_guide : null,
      shippingCompany:
        typeof webhook?.shipping_company === 'string' ? webhook.shipping_company : null,
    };
  }

  private mapCase(record: {
    id: string;
    ref: string | null;
    userId: string;
    orderId: string;
    orderItemId: string | null;
    caseType: SupportCaseType;
    status: SupportCaseStatus;
    description: string;
    snapshot: Prisma.JsonValue;
    assignedAdminUserId: string | null;
    assignedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    order?: { ref: string | null } | null;
  }): SupportCaseDTO {
    return {
      id: record.id,
      ref: record.ref,
      userId: record.userId,
      orderId: record.orderId,
      orderRef: record.order?.ref ?? null,
      orderItemId: record.orderItemId,
      caseType: record.caseType,
      status: record.status,
      description: record.description,
      snapshot: record.snapshot as SupportCaseSnapshotDTO,
      assignedAdminUserId: record.assignedAdminUserId,
      assignedAt: record.assignedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private async resolveCaseRecord(caseId: string) {
    const existing = await prisma.supportCase.findFirst({
      where: isEntityRef(caseId) ? { ref: caseId } : { id: caseId },
    });
    if (!existing) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }
    return existing;
  }

  private async resolveLinkedOrderItemId(supportCase: {
    orderItemId: string | null;
    snapshot: Prisma.JsonValue;
  }): Promise<string | null> {
    if (supportCase.orderItemId) return supportCase.orderItemId;
    const snapshot = supportCase.snapshot as SupportCaseSnapshotDTO;
    return snapshot.focusedOrderItemId ?? null;
  }

  private async notifySupportTeamNewCase(params: {
    caseRef: string;
    caseId: string;
    caseType: string;
    orderId: string;
    orderRef?: string | null;
    description: string;
    evidenceCount: number;
  }): Promise<void> {
    try {
      const { notificationEmail } = await this.supportCasesConfigService.getConfig();
      if (!notificationEmail) {
        console.warn(
          '[SUPPORT-CASE] Sin correo de notificación configurado (support_cases_module); omitiendo email a soporte'
        );
        return;
      }

      const adminCaseUrl = `${resolveAdminFrontendBaseUrl()}/support-cases/${params.caseId}`;
      const { html, text, subject } = getSupportCaseNewTemplate({
        caseRef: params.caseRef,
        caseType: params.caseType,
        orderId: params.orderId,
        orderRef: params.orderRef,
        description: params.description,
        evidenceCount: params.evidenceCount,
        adminCaseUrl,
      });

      await sendEmail({ to: notificationEmail, subject, html, text });
    } catch (err) {
      console.error('[SUPPORT-CASE] Error enviando email a soporte:', err);
    }
  }

  private async notifySupportTeamUserReply(params: {
    caseRef: string;
    caseId: string;
    orderId: string;
    orderRef?: string | null;
    message: string;
  }): Promise<void> {
    try {
      const { notificationEmail } = await this.supportCasesConfigService.getConfig();
      if (!notificationEmail) {
        console.warn(
          '[SUPPORT-CASE] Sin correo de notificación configurado; omitiendo email por respuesta del cliente'
        );
        return;
      }

      const adminCaseUrl = `${resolveAdminFrontendBaseUrl()}/support-cases/${params.caseId}`;
      const { html, text, subject } = getSupportCaseUserReplyTemplate({
        caseRef: params.caseRef,
        orderId: params.orderId,
        orderRef: params.orderRef,
        message: params.message,
        adminCaseUrl,
      });

      await sendEmail({ to: notificationEmail, subject, html, text });
    } catch (err) {
      console.error('[SUPPORT-CASE] Error enviando email por respuesta del cliente:', err);
    }
  }

  private shouldNotifyUserStatusChange(status: SupportCaseStatusDTO): boolean {
    return USER_NOTIFY_STATUS_TRANSITIONS.includes(status);
  }

  private async notifySupportCaseUser(
    userId: string,
    type: 'support_case_status' | 'support_case_reply',
    title: string,
    message: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const orderId = data.orderId;
    if (typeof orderId !== 'string') {
      console.error('[SUPPORT-CASE] Notificación sin orderId en data');
      return;
    }
    try {
      await this.notificationsService.syncSupportCaseNotification({
        userId,
        type,
        orderId,
        title,
        message,
        data,
      });
    } catch (err) {
      console.error('[SUPPORT-CASE] Error enviando notificación:', err);
    }
  }

  private notificationDataForCase(supportCase: {
    id: string;
    ref: string | null;
    orderId: string;
  }) {
    return {
      supportCaseId: supportCase.id,
      supportCaseRef: supportCase.ref,
      orderId: supportCase.orderId,
    };
  }

  private statusNotificationCopy(
    status: SupportCaseStatusDTO,
    caseLabel: string
  ): {
    title: string;
    message: string;
  } {
    return getSupportCaseStatusCopy(status, caseLabel);
  }

  private caseLabelFor(supportCase: { id: string; ref: string | null }): string {
    return formatSupportCaseLabel(supportCase.ref, supportCase.id);
  }

  private async assertOrderOwnership(orderId: string, userId: string): Promise<OrderResponse> {
    const order = await this.ordersService.getOrderById(orderId);
    if (!order.userId || order.userId !== userId) {
      throw new BadRequestError('No tienes permiso para reportar problemas en esta orden');
    }
    return order;
  }

  private async assertOrderItemBelongsToOrder(
    orderItemId: string,
    orderId: string
  ): Promise<void> {
    const item = await prisma.orderItem.findFirst({
      where: { id: orderItemId, orderId },
    });
    if (!item) {
      throw new BadRequestError('El artículo no pertenece a esta orden');
    }
  }

  private async assertNoDuplicateOpenCase(
    orderId: string,
    orderItemId: string | null | undefined,
    caseType: SupportCaseType
  ): Promise<void> {
    const existing = await prisma.supportCase.findFirst({
      where: {
        orderId,
        orderItemId: orderItemId ?? null,
        caseType,
        status: { in: [SupportCaseStatus.OPEN, SupportCaseStatus.IN_REVIEW, SupportCaseStatus.WAITING_USER] },
      },
    });
    if (existing) {
      throw new BadRequestError(
        'Ya existe una solicitud abierta para este pedido, artículo y tipo de problema'
      );
    }
  }

  async createCase(
    userId: string,
    input: CreateSupportCaseInput,
    files: Express.Multer.File[] = []
  ): Promise<SupportCaseDetailDTO> {
    const { orderId, orderItemId, caseType, description, contactPhone: rawContactPhone } = input;

    if (!this.isValidCaseType(caseType)) {
      throw new BadRequestError('Tipo de caso inválido');
    }

    const contactPhone = normalizeColombiaPhone(rawContactPhone);
    if (!contactPhone || !isValidColombiaPhone(contactPhone)) {
      throw new BadRequestError(
        'Indica un número de celular válido de Colombia (+57, 10 dígitos comenzando en 3)'
      );
    }

    const trimmedDescription = description?.trim();
    if (!trimmedDescription || trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      throw new BadRequestError(
        `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`
      );
    }
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      throw new BadRequestError(
        `La descripción no puede superar ${MAX_DESCRIPTION_LENGTH} caracteres`
      );
    }

    this.validateEvidenceFiles(files);

    if (this.requiresEvidence(caseType) && files.length === 0) {
      throw new BadRequestError(
        'Para este tipo de problema debes adjuntar al menos una evidencia (foto o PDF)'
      );
    }

    const order = await this.assertOrderOwnership(orderId, userId);

    if (orderItemId) {
      await this.assertOrderItemBelongsToOrder(orderItemId, orderId);
    }

    await this.assertNoDuplicateOpenCase(orderId, orderItemId, caseType as SupportCaseType);

    const snapshot = this.buildOrderSnapshot(order, orderItemId, contactPhone);

    const created = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { phone: contactPhone },
      });

      const ref = await allocateEntityRef(tx, 'RCL');
      const supportCase = await tx.supportCase.create({
        data: {
          ref,
          userId,
          orderId,
          orderItemId: orderItemId ?? null,
          caseType: caseType as SupportCaseType,
          status: SupportCaseStatus.OPEN,
          description: trimmedDescription,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      const event = await tx.supportCaseEvent.create({
        data: {
          supportCaseId: supportCase.id,
          kind: SupportCaseEventKind.CREATED,
          actorType: SupportCaseActorType.USER,
          actorId: userId,
          payload: {
            caseType,
            description: trimmedDescription,
            orderItemId: orderItemId ?? null,
            contactPhone,
            attachments: [],
          },
        },
      });

      const events = await tx.supportCaseEvent.findMany({
        where: { supportCaseId: supportCase.id },
        orderBy: { createdAt: 'asc' },
      });

      return { supportCase, events, createdEventId: event.id };
    });

    const attachmentRecords: SupportCaseAttachmentDTO[] = [];
    for (const file of files) {
      const url = await this.s3Service.uploadFile(file, 'support-cases');
      const row = await prisma.supportCaseAttachment.create({
        data: {
          supportCaseId: created.supportCase.id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url,
        },
      });
      attachmentRecords.push(this.mapAttachment(row));
    }

    if (attachmentRecords.length > 0) {
      await prisma.supportCaseEvent.update({
        where: { id: created.createdEventId },
        data: {
          payload: {
            caseType,
            description: trimmedDescription,
            orderItemId: orderItemId ?? null,
            attachments: attachmentRecords.map((a) => ({
              id: a.id,
              fileName: a.fileName,
              url: a.url,
              mimeType: a.mimeType,
            })),
          },
        },
      });
    }

    void this.notifySupportTeamNewCase({
      caseRef: created.supportCase.ref ?? created.supportCase.id,
      caseId: created.supportCase.id,
      caseType,
      orderId,
      orderRef: snapshot.orderRef ?? order.ref ?? null,
      description: trimmedDescription,
      evidenceCount: attachmentRecords.length,
    });

    const caseLabel = formatSupportCaseLabel(created.supportCase.ref, created.supportCase.id);
    const registeredCopy = getSupportCaseRegisteredCopy(caseLabel);
    void this.notifySupportCaseUser(
      userId,
      'support_case_status',
      registeredCopy.title,
      registeredCopy.message,
      this.notificationDataForCase({
        id: created.supportCase.id,
        ref: created.supportCase.ref,
        orderId: created.supportCase.orderId,
      })
    );

    return this.getCaseByIdForUser(created.supportCase.id, userId);
  }

  async listCasesForUser(userId: string, orderId?: string): Promise<SupportCaseDTO[]> {
    const cases = await prisma.supportCase.findMany({
      where: {
        userId,
        ...(orderId ? { orderId } : {}),
      },
      include: { order: { select: { ref: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map((c) => this.mapCase(c));
  }

  async getCaseByIdForUser(caseId: string, userId: string): Promise<SupportCaseDetailDTO> {
    const supportCase = await prisma.supportCase.findFirst({
      where: {
        userId,
        ...(isEntityRef(caseId) ? { ref: caseId } : { id: caseId }),
      },
      include: {
        order: { select: { ref: true } },
        events: {
          where: { kind: { in: userVisibleEventKinds() } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!supportCase) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    const mapped = this.mapCase(supportCase);
    const snapshot = await this.enrichSnapshotWithProductImages(
      mapped.snapshot as SupportCaseSnapshotDTO
    );

    return {
      ...mapped,
      snapshot,
      events: supportCase.events.map((e) => this.mapEvent(e)),
      attachments: supportCase.attachments.map((a) => this.mapAttachment(a)),
      evidenceNotice: this.mapEvidenceNotice(supportCase),
    };
  }

  async addUserReply(
    caseId: string,
    userId: string,
    input: SupportCaseUserReplyInput
  ): Promise<SupportCaseDetailDTO> {
    const existing = await prisma.supportCase.findFirst({
      where: {
        userId,
        ...(isEntityRef(caseId) ? { ref: caseId } : { id: caseId }),
      },
    });

    if (!existing) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    if (existing.status !== SupportCaseStatus.WAITING_USER) {
      throw new BadRequestError(
        'Solo puedes responder cuando soporte solicita más información'
      );
    }

    const message = input.message?.trim();
    if (!message || message.length < MIN_MESSAGE_LENGTH) {
      throw new BadRequestError(
        `El mensaje debe tener al menos ${MIN_MESSAGE_LENGTH} caracteres`
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestError(
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: existing.id,
          kind: SupportCaseEventKind.USER_MESSAGE,
          actorType: SupportCaseActorType.USER,
          actorId: userId,
          payload: { message },
        },
      });

      if (existing.status === SupportCaseStatus.WAITING_USER) {
        await tx.supportCase.update({
          where: { id: existing.id },
          data: { status: SupportCaseStatus.IN_REVIEW },
        });

        await tx.supportCaseEvent.create({
          data: {
            supportCaseId: existing.id,
            kind: SupportCaseEventKind.STATUS_CHANGED,
            actorType: SupportCaseActorType.SYSTEM,
            actorId: null,
            payload: {
              from: SupportCaseStatus.WAITING_USER,
              to: SupportCaseStatus.IN_REVIEW,
            },
          },
        });
      }
    });

    const caseWithOrder = await prisma.supportCase.findUnique({
      where: { id: existing.id },
      include: { order: { select: { ref: true } } },
    });

    void this.notifySupportTeamUserReply({
      caseRef: caseWithOrder?.ref ?? existing.ref ?? existing.id,
      caseId: existing.id,
      orderId: existing.orderId,
      orderRef: caseWithOrder?.order?.ref ?? null,
      message,
    });

    return this.getCaseByIdForUser(existing.id, userId);
  }

  private parseCsvQuery<T extends string>(value: string | undefined): T[] {
    if (!value?.trim()) return [];
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as T[];
  }

  private expandAdminStatusFilter(statuses: SupportCaseStatus[]): SupportCaseStatus[] {
    const expanded = new Set(statuses);
    if (expanded.has(SupportCaseStatus.IN_REVIEW)) {
      expanded.add(SupportCaseStatus.WAITING_USER);
    }
    return [...expanded];
  }

  async listCasesAdmin(query: ListSupportCasesAdminQuery): Promise<SupportCaseAdminListItemDTO[]> {
    const where: Prisma.SupportCaseWhereInput = {};

    const statusList = this.parseCsvQuery<SupportCaseStatus>(
      typeof query.status === 'string' ? query.status : undefined
    );
    if (statusList.length >= 1) {
      const expanded = this.expandAdminStatusFilter(statusList);
      where.status = expanded.length === 1 ? expanded[0] : { in: expanded };
    }

    const caseTypeList = this.parseCsvQuery<SupportCaseType>(
      typeof query.caseType === 'string' ? query.caseType : undefined
    );
    if (caseTypeList.length === 1) {
      where.caseType = caseTypeList[0];
    } else if (caseTypeList.length > 1) {
      where.caseType = { in: caseTypeList };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      if (isEntityRef(term)) {
        if (term.startsWith('RCL-')) {
          where.ref = term;
        } else if (term.startsWith('ORD-')) {
          const order = await prisma.order.findFirst({
            where: { ref: term },
            select: { id: true },
          });
          where.orderId = order?.id ?? '__no_match__';
        } else {
          where.ref = term;
        }
      } else {
        where.OR = [
          { ref: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { order: { ref: { contains: term, mode: 'insensitive' } } },
          { id: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    if (query.orderId?.trim()) {
      const orderKey = query.orderId.trim();
      if (orderKey.startsWith('RCL-')) {
        where.ref = orderKey;
      } else if (isEntityRef(orderKey) && orderKey.startsWith('ORD-')) {
        const order = await prisma.order.findFirst({
          where: { ref: orderKey },
          select: { id: true },
        });
        where.orderId = order?.id ?? '__no_match__';
      } else {
        where.orderId = orderKey;
      }
    }
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    if (query.assignedTo === 'unassigned') {
      where.assignedAdminUserId = null;
    } else if (query.assignedTo === 'me') {
      // filled by controller with admin id
    } else if (query.assignedTo?.trim()) {
      where.assignedAdminUserId = query.assignedTo.trim();
    }

    const cases = await prisma.supportCase.findMany({
      where,
      include: {
        order: { select: { ref: true } },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedAdminUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return cases.map((c) => ({
      ...this.mapCase(c),
      userEmail: c.user.email,
      userFirstName: c.user.firstName,
      userLastName: c.user.lastName,
      assignedAdmin: this.mapAssignedAdmin(c.assignedAdminUser),
    }));
  }

  async getCaseByIdAdmin(caseId: string): Promise<SupportCaseAdminDetailDTO> {
    const supportCase = await prisma.supportCase.findFirst({
      where: isEntityRef(caseId) ? { ref: caseId } : { id: caseId },
      include: {
        order: { select: { ref: true } },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedAdminUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!supportCase) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    const linkedOrderItemId = await this.resolveLinkedOrderItemId(supportCase);
    const linkedOrderItem = linkedOrderItemId
      ? await prisma.orderItem.findUnique({
          where: { id: linkedOrderItemId },
          select: {
            id: true,
            dropiOrderId: true,
            dropiStatus: true,
            dropiWebhookData: true,
          },
        })
      : null;

    const dropiOrderItems = await this.loadDropiOrderItemsForCase(supportCase.orderId);
    const mapped = this.mapCase(supportCase);
    const snapshot = await this.enrichSnapshotWithProductImages(
      mapped.snapshot as SupportCaseSnapshotDTO
    );

    return {
      ...mapped,
      snapshot,
      userEmail: supportCase.user.email,
      userFirstName: supportCase.user.firstName,
      userLastName: supportCase.user.lastName,
      assignedAdmin: this.mapAssignedAdmin(supportCase.assignedAdminUser),
      linkedOrderItem: this.mapLinkedOrderItem(linkedOrderItem),
      dropiOrderItems,
      events: supportCase.events.map((e) => this.mapEvent(e)),
      attachments: supportCase.attachments.map((a) => this.mapAttachment(a)),
      evidenceNotice: this.mapEvidenceNotice(supportCase),
    };
  }

  private async loadDropiOrderItemsForCase(
    orderId: string
  ): Promise<SupportCaseDropiOrderItemDTO[]> {
    const items = await prisma.orderItem.findMany({
      where: { orderId, dropiOrderId: { not: null } },
      select: {
        id: true,
        dropiOrderId: true,
        dropiStatus: true,
        dropiWebhookData: true,
        product: { select: { title: true, images: true } },
        variant: { select: { title: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return items
      .filter((i): i is typeof i & { dropiOrderId: number } => i.dropiOrderId != null)
      .map((i) => ({
        orderItemId: i.id,
        productTitle: i.product.title,
        variantTitle: i.variant?.title ?? '',
        dropiOrderId: i.dropiOrderId,
        dropiStatus: i.dropiStatus,
        productImageUrl: this.normalizeProductImageUrl(i.product.images?.[0] ?? null),
        dropiSupplierId: this.extractDropiSupplierId(i.dropiWebhookData),
        dropiSupplierName: this.extractDropiSupplierName(i.dropiWebhookData),
        shippingCompany: this.extractDropiShippingCompany(i.dropiWebhookData),
        shippingGuide: this.extractDropiShippingGuide(i.dropiWebhookData),
      }));
  }

  async updateCaseStatusAdmin(
    caseId: string,
    adminUserId: string,
    input: UpdateSupportCaseStatusInput
  ): Promise<SupportCaseAdminDetailDTO> {
    const { status } = input;

    if (!this.isValidCaseStatus(status)) {
      throw new BadRequestError('Estado inválido');
    }

    const existing = await prisma.supportCase.findFirst({
      where: isEntityRef(caseId) ? { ref: caseId } : { id: caseId },
    });

    if (!existing) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    const resolvedCaseId = existing.id;

    if (existing.status === status) {
      return this.getCaseByIdAdmin(resolvedCaseId);
    }

    const oldStatus = existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.supportCase.update({
        where: { id: resolvedCaseId },
        data: { status: status as SupportCaseStatus },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: resolvedCaseId,
          kind: SupportCaseEventKind.STATUS_CHANGED,
          actorType: SupportCaseActorType.ADMIN,
          actorId: adminUserId,
          payload: {
            from: oldStatus,
            to: status,
          },
        },
      });
    });

    if (this.shouldNotifyUserStatusChange(status as SupportCaseStatusDTO)) {
      const copy = this.statusNotificationCopy(
        status as SupportCaseStatusDTO,
        this.caseLabelFor(existing)
      );
      await this.notifySupportCaseUser(
        existing.userId,
        'support_case_status',
        copy.title,
        copy.message,
        this.notificationDataForCase(existing)
      );
    }

    return this.getCaseByIdAdmin(resolvedCaseId);
  }

  async waitForUserAdmin(
    caseId: string,
    adminUserId: string
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);

    if (!existing.assignedAt || !existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de solicitar respuesta al usuario');
    }

    if (existing.assignedAdminUserId !== adminUserId) {
      throw new BadRequestError('Solo el agente asignado puede solicitar respuesta al usuario');
    }

    if (existing.status === SupportCaseStatus.WAITING_USER) {
      return this.getCaseByIdAdmin(existing.id);
    }

    if (existing.status !== SupportCaseStatus.IN_REVIEW) {
      throw new BadRequestError(
        'Solo se puede esperar respuesta del usuario cuando el caso está en revisión'
      );
    }

    return this.transitionCaseStatusAdmin(
      existing.id,
      adminUserId,
      SupportCaseStatus.WAITING_USER
    );
  }

  async takeCaseAdmin(caseId: string, adminUserId: string): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);

    if (
      existing.assignedAdminUserId &&
      existing.assignedAdminUserId !== adminUserId
    ) {
      throw new ConflictError('Este caso ya fue tomado por otro agente');
    }

    if (existing.assignedAdminUserId === adminUserId) {
      return this.getCaseByIdAdmin(existing.id);
    }

    const now = new Date();
    const moveToInReview = existing.status === SupportCaseStatus.OPEN;

    await prisma.$transaction(async (tx) => {
      await tx.supportCase.update({
        where: { id: existing.id },
        data: {
          assignedAdminUserId: adminUserId,
          assignedAt: now,
          ...(moveToInReview ? { status: SupportCaseStatus.IN_REVIEW } : {}),
        },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: existing.id,
          kind: SupportCaseEventKind.CASE_ASSIGNED,
          actorType: SupportCaseActorType.ADMIN,
          actorId: adminUserId,
          payload: {
            assignedAdminUserId: adminUserId,
            assignedAt: now.toISOString(),
          },
        },
      });

      if (moveToInReview) {
        await tx.supportCaseEvent.create({
          data: {
            supportCaseId: existing.id,
            kind: SupportCaseEventKind.STATUS_CHANGED,
            actorType: SupportCaseActorType.ADMIN,
            actorId: adminUserId,
            payload: {
              from: SupportCaseStatus.OPEN,
              to: SupportCaseStatus.IN_REVIEW,
            },
          },
        });
      }
    });

    if (moveToInReview) {
      const copy = this.statusNotificationCopy('IN_REVIEW', this.caseLabelFor(existing));
      await this.notifySupportCaseUser(
        existing.userId,
        'support_case_status',
        copy.title,
        copy.message,
        this.notificationDataForCase(existing)
      );
    }

    return this.getCaseByIdAdmin(existing.id);
  }

  async startReviewAdmin(
    caseId: string,
    adminUserId: string
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);

    if (!existing.assignedAt || !existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de pasarlo a revisión');
    }

    if (existing.assignedAdminUserId !== adminUserId) {
      throw new BadRequestError('Solo el agente asignado puede pasar este caso a revisión');
    }

    if (existing.status === SupportCaseStatus.IN_REVIEW) {
      return this.getCaseByIdAdmin(existing.id);
    }

    if (
      existing.status !== SupportCaseStatus.OPEN &&
      existing.status !== SupportCaseStatus.WAITING_USER
    ) {
      throw new BadRequestError(
        'Solo se puede pasar a revisión desde Abierto o Esperando usuario'
      );
    }

    return this.transitionCaseStatusAdmin(
      existing.id,
      adminUserId,
      SupportCaseStatus.IN_REVIEW
    );
  }

  async addPublicMessageAdmin(
    caseId: string,
    adminUserId: string,
    input: SupportCaseMessageInput
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);
    const message = input.message?.trim();

    if (!message || message.length < MIN_MESSAGE_LENGTH) {
      throw new BadRequestError(
        `El mensaje debe tener al menos ${MIN_MESSAGE_LENGTH} caracteres`
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestError(
        `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres`
      );
    }

    if (!existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de responder al usuario');
    }

    if (
      existing.status !== SupportCaseStatus.IN_REVIEW &&
      existing.status !== SupportCaseStatus.WAITING_USER
    ) {
      throw new BadRequestError(
        'Solo puedes responder cuando el caso está en revisión o esperando usuario'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: existing.id,
          kind: SupportCaseEventKind.PUBLIC_MESSAGE,
          actorType: SupportCaseActorType.ADMIN,
          actorId: adminUserId,
          payload: { message },
        },
      });

      // Pasa a WAITING_USER sin evento en historial: el mensaje de soporte ya implica que puede responder.
      if (existing.status === SupportCaseStatus.IN_REVIEW) {
        await tx.supportCase.update({
          where: { id: existing.id },
          data: { status: SupportCaseStatus.WAITING_USER },
        });
      }
    });

    const caseLabel = this.caseLabelFor(existing);
    const replyCopy = getSupportCaseReplyCopy(caseLabel, message);
    await this.notifySupportCaseUser(
      existing.userId,
      'support_case_reply',
      replyCopy.title,
      replyCopy.message,
      this.notificationDataForCase(existing)
    );

    return this.getCaseByIdAdmin(existing.id);
  }

  async addInternalNoteAdmin(
    caseId: string,
    adminUserId: string,
    input: SupportCaseNoteInput
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);
    const note = input.note?.trim();

    if (!note || note.length < MIN_NOTE_LENGTH) {
      throw new BadRequestError(
        `La nota debe tener al menos ${MIN_NOTE_LENGTH} caracteres`
      );
    }
    if (note.length > MAX_NOTE_LENGTH) {
      throw new BadRequestError(
        `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres`
      );
    }

    if (!existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de agregar notas internas');
    }

    await prisma.supportCaseEvent.create({
      data: {
        supportCaseId: existing.id,
        kind: SupportCaseEventKind.INTERNAL_NOTE,
        actorType: SupportCaseActorType.ADMIN,
        actorId: adminUserId,
        payload: { note },
      },
    });

    return this.getCaseByIdAdmin(existing.id);
  }

  async resolveCaseAdmin(
    caseId: string,
    adminUserId: string,
    input?: ResolveSupportCaseInput
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);

    if (!existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de resolverlo');
    }

    if (
      existing.status !== SupportCaseStatus.IN_REVIEW &&
      existing.status !== SupportCaseStatus.WAITING_USER
    ) {
      throw new BadRequestError(
        'Solo se puede resolver un caso en revisión o esperando usuario'
      );
    }

    if (!input?.acknowledgeNoReply) {
      const hasPublicReply = await this.caseHasPublicMessageFromSupport(existing.id);
      if (!hasPublicReply) {
        throw new ConflictError(
          'No hay mensaje público de soporte en este caso. Envía una respuesta al usuario o confirma la resolución sin mensaje.'
        );
      }
    }

    return this.transitionCaseStatusAdmin(
      existing.id,
      adminUserId,
      SupportCaseStatus.RESOLVED
    );
  }

  async closeCaseAdmin(
    caseId: string,
    adminUserId: string
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);

    if (!existing.assignedAdminUserId) {
      throw new BadRequestError('Debes tomar el caso antes de cerrarlo');
    }

    if (existing.status !== SupportCaseStatus.RESOLVED) {
      throw new BadRequestError('Solo se puede cerrar un caso resuelto');
    }

    return this.transitionCaseStatusAdmin(
      existing.id,
      adminUserId,
      SupportCaseStatus.CLOSED
    );
  }

  private async transitionCaseStatusAdmin(
    caseId: string,
    adminUserId: string,
    newStatus: SupportCaseStatus
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await prisma.supportCase.findUnique({ where: { id: caseId } });
    if (!existing) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    if (existing.status === newStatus) {
      return this.getCaseByIdAdmin(caseId);
    }

    const oldStatus = existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.supportCase.update({
        where: { id: caseId },
        data: { status: newStatus },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: caseId,
          kind: SupportCaseEventKind.STATUS_CHANGED,
          actorType: SupportCaseActorType.ADMIN,
          actorId: adminUserId,
          payload: {
            from: oldStatus,
            to: newStatus,
          },
        },
      });
    });

    if (this.shouldNotifyUserStatusChange(newStatus as SupportCaseStatusDTO)) {
      const copy = this.statusNotificationCopy(
        newStatus as SupportCaseStatusDTO,
        this.caseLabelFor(existing)
      );
      await this.notifySupportCaseUser(
        existing.userId,
        'support_case_status',
        copy.title,
        copy.message,
        this.notificationDataForCase(existing)
      );
    }

    return this.getCaseByIdAdmin(caseId);
  }

  async previewDropiAdmin(
    caseId: string,
    orderItemId?: string | null
  ): Promise<SupportCaseDropiPreviewDTO> {
    const existing = await this.resolveCaseRecord(caseId);
    const resolvedItemId =
      orderItemId?.trim() ||
      (await this.resolveLinkedOrderItemId(existing)) ||
      (await this.loadDropiOrderItemsForCase(existing.orderId))[0]?.orderItemId;

    if (!resolvedItemId) {
      throw new BadRequestError(
        'No hay artículos con orden Dropi en este pedido. Indica el producto a consultar.'
      );
    }

    const orderItem = await prisma.orderItem.findFirst({
      where: { id: resolvedItemId, orderId: existing.orderId },
      select: {
        id: true,
        dropiOrderId: true,
        dropiWebhookData: true,
      },
    });

    if (!orderItem?.dropiOrderId) {
      throw new BadRequestError('El artículo no tiene orden Dropi asociada');
    }

    const cached = storedDataToDropiStatusResponse(
      orderItem.dropiWebhookData,
      orderItem.dropiOrderId
    );
    const dropiData =
      cached ??
      (await this.dropiOrdersService.getDropiOrderStatus(orderItem.dropiOrderId));

    const previewRecord = dropiData as Record<string, unknown>;
    const nested =
      previewRecord.full_data &&
      typeof previewRecord.full_data === 'object' &&
      !Array.isArray(previewRecord.full_data)
        ? (previewRecord.full_data as Record<string, unknown>)
        : previewRecord;

    return {
      orderItemId: orderItem.id,
      dropiOrderId: orderItem.dropiOrderId,
      preview: previewRecord,
      dropiSupplierId:
        this.extractDropiSupplierId(nested as Prisma.JsonValue) ??
        this.extractDropiSupplierId(orderItem.dropiWebhookData),
    };
  }

  async refreshDropiAdmin(
    caseId: string,
    adminUserId: string
  ): Promise<SupportCaseAdminDetailDTO> {
    const existing = await this.resolveCaseRecord(caseId);
    const orderItemId = await this.resolveLinkedOrderItemId(existing);

    if (!orderItemId) {
      throw new BadRequestError('Este caso no tiene un artículo de pedido asociado');
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem?.dropiOrderId) {
      throw new BadRequestError('El artículo no tiene orden Dropi asociada');
    }

    const dropiStatus = await dropiOrderSyncService.syncOrderItem(
      orderItemId,
      orderItem.dropiOrderId,
      { source: 'admin_refresh', refreshedByAdminId: adminUserId }
    );

    const status =
      typeof dropiStatus.status === 'string' ? dropiStatus.status : 'N/A';
    const refreshedAt = new Date().toISOString();

    await prisma.$transaction(async (tx) => {
      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: existing.id,
          kind: SupportCaseEventKind.DROPI_REFRESH,
          actorType: SupportCaseActorType.ADMIN,
          actorId: adminUserId,
          payload: {
            dropiOrderId: orderItem.dropiOrderId,
            orderItemId,
            status,
            shipping_guide: dropiStatus.shipping_guide,
            shipping_company: dropiStatus.shipping_company,
            refreshedAt,
          },
        },
      });
    });

    return this.getCaseByIdAdmin(existing.id);
  }
}
