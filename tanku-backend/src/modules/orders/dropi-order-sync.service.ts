import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { DropiOrdersService } from './dropi-orders.service';

const MAX_CONCURRENT_DROPI_SYNCS = 8;

type DropiOrderStatusResult = Awaited<ReturnType<DropiOrdersService['getDropiOrderStatus']>>;

export type DropiOrderSyncMeta = {
  guideUrl?: string | null;
  refreshedByAdminId?: string;
  source?: 'webhook' | 'webhook_backfill' | 'order_created' | 'user_refresh' | 'admin_refresh';
};

/** JSON guardado en order_items.dropi_webhook_data incluye history[] tras sync con myorders. */
export function hasDropiHistoryInStoredData(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  return Array.isArray((data as Record<string, unknown>).history);
}

export function buildDropiStoredPayload(
  dropiStatus: DropiOrderStatusResult,
  extras?: DropiOrderSyncMeta & { receivedAt?: string }
): Prisma.InputJsonValue {
  const fullData = dropiStatus.full_data ?? dropiStatus;
  const status = typeof dropiStatus.status === 'string' ? dropiStatus.status : 'N/A';
  return {
    ...(typeof fullData === 'object' && fullData !== null && !Array.isArray(fullData)
      ? fullData
      : {}),
    id: dropiStatus.id,
    status,
    shipping_guide: dropiStatus.shipping_guide ?? null,
    shipping_company: dropiStatus.shipping_company ?? null,
    sticker: dropiStatus.sticker ?? null,
    receivedAt: extras?.receivedAt ?? new Date().toISOString(),
    ...(extras?.guideUrl ? { guideUrl: extras.guideUrl } : {}),
    ...(extras?.refreshedByAdminId ? { refreshedByAdminId: extras.refreshedByAdminId } : {}),
    ...(extras?.source ? { syncSource: extras.source } : {}),
  } as Prisma.InputJsonValue;
}

/** Formato compatible con getDropiOrderStatus para el front y APIs. */
export function storedDataToDropiStatusResponse(
  stored: unknown,
  dropiOrderId?: number | null
): DropiOrderStatusResult | null {
  if (!hasDropiHistoryInStoredData(stored)) return null;
  const row = stored as Record<string, unknown>;
  return {
    id: (typeof row.id === 'number' ? row.id : dropiOrderId) ?? undefined,
    status: typeof row.status === 'string' ? row.status : 'N/A',
    shipping_company:
      typeof row.shipping_company === 'string' ? row.shipping_company : null,
    shipping_guide: typeof row.shipping_guide === 'string' ? row.shipping_guide : null,
    sticker: typeof row.sticker === 'string' ? row.sticker : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    total_order: typeof row.total_order === 'number' ? row.total_order : 0,
    shipping_cost: typeof row.shipping_cost === 'number' ? row.shipping_cost : 0,
    client_name: typeof row.name === 'string' ? row.name : null,
    client_surname: typeof row.surname === 'string' ? row.surname : null,
    city: typeof row.city === 'string' ? row.city : null,
    state: typeof row.state === 'string' ? row.state : null,
    full_data: row,
  } as DropiOrderStatusResult;
}

class DropiSyncSemaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

const syncSemaphore = new DropiSyncSemaphore(MAX_CONCURRENT_DROPI_SYNCS);

export class DropiOrderSyncService {
  private dropiOrdersService = new DropiOrdersService();

  /**
   * GET myorders en background (no bloquea el webhook).
   */
  scheduleSyncOrderItem(
    orderItemId: string,
    dropiOrderId: number,
    meta?: DropiOrderSyncMeta
  ): void {
    setImmediate(() => {
      void this.syncOrderItem(orderItemId, dropiOrderId, meta).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `❌ [DROPI-SYNC] Error en sync background item=${orderItemId} dropi=${dropiOrderId}: ${message}`
        );
      });
    });
  }

  /**
   * Consulta Dropi y persiste full_data + history en dropiWebhookData.
   */
  async syncOrderItem(
    orderItemId: string,
    dropiOrderId: number,
    meta?: DropiOrderSyncMeta
  ): Promise<DropiOrderStatusResult> {
    return syncSemaphore.run(async () => {
      console.log(
        `📦 [DROPI-SYNC] Sync item=${orderItemId} dropi=${dropiOrderId} source=${meta?.source ?? 'unknown'}`
      );

      const dropiStatus = await this.dropiOrdersService.getDropiOrderStatus(dropiOrderId);
      const status =
        typeof dropiStatus.status === 'string' ? dropiStatus.status : 'N/A';
      const payload = buildDropiStoredPayload(dropiStatus, {
        ...meta,
        receivedAt: new Date().toISOString(),
      });

      await prisma.orderItem.update({
        where: { id: orderItemId },
        data: {
          dropiStatus: status,
          dropiWebhookData: payload,
        },
      });

      console.log(`✅ [DROPI-SYNC] Guardado full_data con historial para item=${orderItemId}`);
      return dropiStatus;
    });
  }
}

export const dropiOrderSyncService = new DropiOrderSyncService();
