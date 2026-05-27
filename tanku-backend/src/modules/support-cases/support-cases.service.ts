import {
  Prisma,
  SupportCaseActorType,
  SupportCaseEventKind,
  SupportCaseStatus,
  SupportCaseType,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError';
import {
  CreateSupportCaseInput,
  ListSupportCasesAdminQuery,
  SupportCaseAdminDetailDTO,
  SupportCaseAdminListItemDTO,
  SupportCaseDetailDTO,
  SupportCaseDTO,
  SupportCaseEventDTO,
  SupportCaseEventKindDTO,
  SupportCaseSnapshotDTO,
  SupportCaseStatusDTO,
  SupportCaseTypeDTO,
  UpdateSupportCaseStatusInput,
} from '../../shared/dto/support-cases.dto';
import { OrdersService, OrderResponse } from '../orders/orders.service';

const CASE_TYPES: SupportCaseTypeDTO[] = [
  'NOT_RECEIVED',
  'DAMAGED',
  'DELAY',
  'WRONG_ITEM',
  'OTHER',
];

const CASE_STATUSES: SupportCaseStatusDTO[] = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_USER',
  'RESOLVED',
  'CLOSED',
];

const PUBLIC_EVENT_KINDS: SupportCaseEventKind[] = [
  SupportCaseEventKind.CREATED,
  SupportCaseEventKind.STATUS_CHANGED,
  SupportCaseEventKind.PUBLIC_MESSAGE,
  SupportCaseEventKind.DROPI_REFRESH,
];

export class SupportCasesService {
  private ordersService = new OrdersService();

  private isValidCaseType(value: string): value is SupportCaseTypeDTO {
    return CASE_TYPES.includes(value as SupportCaseTypeDTO);
  }

  private isValidCaseStatus(value: string): value is SupportCaseStatusDTO {
    return CASE_STATUSES.includes(value as SupportCaseStatusDTO);
  }

  buildOrderSnapshot(
    order: OrderResponse,
    focusedOrderItemId?: string | null
  ): SupportCaseSnapshotDTO {
    return {
      orderId: order.id,
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
      })),
      focusedOrderItemId: focusedOrderItemId ?? null,
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

  private mapCase(record: {
    id: string;
    userId: string;
    orderId: string;
    orderItemId: string | null;
    caseType: SupportCaseType;
    status: SupportCaseStatus;
    description: string;
    snapshot: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): SupportCaseDTO {
    return {
      id: record.id,
      userId: record.userId,
      orderId: record.orderId,
      orderItemId: record.orderItemId,
      caseType: record.caseType,
      status: record.status,
      description: record.description,
      snapshot: record.snapshot as SupportCaseSnapshotDTO,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
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

  async createCase(userId: string, input: CreateSupportCaseInput): Promise<SupportCaseDetailDTO> {
    const { orderId, orderItemId, caseType, description } = input;

    if (!this.isValidCaseType(caseType)) {
      throw new BadRequestError('Tipo de caso inválido');
    }

    const trimmedDescription = description?.trim();
    if (!trimmedDescription || trimmedDescription.length < 10) {
      throw new BadRequestError('La descripción debe tener al menos 10 caracteres');
    }

    const order = await this.assertOrderOwnership(orderId, userId);

    if (orderItemId) {
      await this.assertOrderItemBelongsToOrder(orderItemId, orderId);
    }

    await this.assertNoDuplicateOpenCase(orderId, orderItemId, caseType as SupportCaseType);

    const snapshot = this.buildOrderSnapshot(order, orderItemId);

    const created = await prisma.$transaction(async (tx) => {
      const supportCase = await tx.supportCase.create({
        data: {
          userId,
          orderId,
          orderItemId: orderItemId ?? null,
          caseType: caseType as SupportCaseType,
          status: SupportCaseStatus.OPEN,
          description: trimmedDescription,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: supportCase.id,
          kind: SupportCaseEventKind.CREATED,
          actorType: SupportCaseActorType.USER,
          actorId: userId,
          payload: {
            caseType,
            description: trimmedDescription,
            orderItemId: orderItemId ?? null,
          },
        },
      });

      const events = await tx.supportCaseEvent.findMany({
        where: { supportCaseId: supportCase.id },
        orderBy: { createdAt: 'asc' },
      });

      return { supportCase, events };
    });

    return {
      ...this.mapCase(created.supportCase),
      events: created.events.map((e) => this.mapEvent(e)),
    };
  }

  async listCasesForUser(userId: string, orderId?: string): Promise<SupportCaseDTO[]> {
    const cases = await prisma.supportCase.findMany({
      where: {
        userId,
        ...(orderId ? { orderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases.map((c) => this.mapCase(c));
  }

  async getCaseByIdForUser(caseId: string, userId: string): Promise<SupportCaseDetailDTO> {
    const supportCase = await prisma.supportCase.findFirst({
      where: { id: caseId, userId },
      include: {
        events: {
          where: { kind: { in: PUBLIC_EVENT_KINDS } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!supportCase) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    return {
      ...this.mapCase(supportCase),
      events: supportCase.events.map((e) => this.mapEvent(e)),
    };
  }

  async listCasesAdmin(query: ListSupportCasesAdminQuery): Promise<SupportCaseAdminListItemDTO[]> {
    const where: Prisma.SupportCaseWhereInput = {};

    if (query.status) {
      where.status = query.status as SupportCaseStatus;
    }
    if (query.caseType) {
      where.caseType = query.caseType as SupportCaseType;
    }
    if (query.orderId?.trim()) {
      where.orderId = query.orderId.trim();
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

    const cases = await prisma.supportCase.findMany({
      where,
      include: {
        user: {
          select: {
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
    }));
  }

  async getCaseByIdAdmin(caseId: string): Promise<SupportCaseAdminDetailDTO> {
    const supportCase = await prisma.supportCase.findUnique({
      where: { id: caseId },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!supportCase) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    return {
      ...this.mapCase(supportCase),
      userEmail: supportCase.user.email,
      userFirstName: supportCase.user.firstName,
      userLastName: supportCase.user.lastName,
      events: supportCase.events.map((e) => this.mapEvent(e)),
    };
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

    const existing = await prisma.supportCase.findUnique({
      where: { id: caseId },
    });

    if (!existing) {
      throw new NotFoundError('Solicitud de soporte no encontrada');
    }

    if (existing.status === status) {
      return this.getCaseByIdAdmin(caseId);
    }

    const oldStatus = existing.status;

    await prisma.$transaction(async (tx) => {
      await tx.supportCase.update({
        where: { id: caseId },
        data: { status: status as SupportCaseStatus },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: caseId,
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

    return this.getCaseByIdAdmin(caseId);
  }
}
