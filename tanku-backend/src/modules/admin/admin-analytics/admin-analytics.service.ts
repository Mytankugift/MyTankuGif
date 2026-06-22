import { prisma } from '../../../config/database';
import {
  ResolvedRange,
  Granularity,
  bucketsCte,
  localBucketExpr,
  computeDelta,
} from './analytics-range.util';
import type {
  SalesAnalytics,
  SalesScalars,
  SalesSegment,
  UsersAnalytics,
  GiftsAnalytics,
  StalkerGiftAnalytics,
  DirectGiftAnalytics,
  OverviewAnalytics,
  SupportAnalytics,
  OperationsAnalytics,
  CatalogAnalytics,
  SocialAnalytics,
  BehaviorAnalytics,
  RetentionCohort,
  SeriesPoint,
  DistributionItem,
  RankingItem,
  RangeMeta,
  Kpi,
} from './analytics.dto';

/** Estados de `orders.payment_status` que cuentan como ingreso confirmado (ePayco). */
const CONFIRMED_PAYMENT_STATUSES = ['paid', 'captured'];
/** Estado de contraentrega pendiente de cobro. */
const COD_PENDING_STATUS = 'not_paid';
/** Estados de pago exitoso para regalos (StalkerGift). */
const GIFT_PAID_STATUSES = ['paid', 'approved', 'success', 'captured'];

const TOP_LIMIT = 10;
const TOP_CATEGORIES_LIMIT = 5;

/** Límites del rango como timestamp UTC wall, para comparar contra columnas `timestamp`. */
const FROM_BOUND = `($1::timestamptz AT TIME ZONE 'UTC')`;
const TO_BOUND = `($2::timestamptz AT TIME ZONE 'UTC')`;

/** Actor de comportamiento: usuario autenticado o, en su defecto, sesión anónima. */
const BEHAVIOR_ACTOR = `COALESCE(user_id, session_id)`;

/** Pasos del embudo de adquisición (lineal: cada paso es subconjunto del anterior). */
const BEHAVIOR_FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: 'product_view', label: 'Vio en feed (impresión)' },
  { key: 'product_click', label: 'Abrió detalle' },
  { key: 'add_to_cart', label: 'Agregó al carrito' },
];

export class AdminAnalyticsService {
  // ----------------------------------------------------------------------------
  // VENTAS
  // ----------------------------------------------------------------------------

  async getSales(range: ResolvedRange): Promise<SalesAnalytics> {
    const { from, to, granularity } = range;

    const [scalars, codPending, series, byStatus, byPaymentStatus, byPaymentMethod, byOrderType, topProducts, topCategories] =
      await Promise.all([
        this.salesScalars(from, to),
        this.codPending(from, to),
        this.getSalesSeries(from, to, granularity),
        this.ordersDistribution('status', from, to),
        this.ordersDistribution('paymentStatus', from, to),
        this.ordersDistribution('paymentMethod', from, to),
        this.salesByOrderType(from, to),
        this.topProducts(from, to),
        this.topCategories(from, to),
      ]);

    return {
      range: this.rangeMeta(range),
      scalars,
      codPending,
      series,
      byStatus,
      byPaymentStatus,
      byPaymentMethod,
      byOrderType,
      topProducts,
      topCategories,
    };
  }

  private async salesScalars(from: Date, to: Date): Promise<SalesScalars> {
    const sql = `
      SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(revenue), 0)::float8 AS revenue,
        COALESCE(SUM(profit), 0)::float8 AS profit,
        COALESCE(SUM(units), 0)::int AS units,
        COALESCE(SUM(shipping), 0)::float8 AS shipping,
        COALESCE(SUM(real_shipping), 0)::float8 AS real_shipping,
        COALESCE(SUM(supplier), 0)::float8 AS supplier,
        COALESCE(SUM(fees), 0)::float8 AS fees,
        COUNT(*) FILTER (WHERE order_type = 'normal')::int AS normal_orders,
        COALESCE(SUM(revenue) FILTER (WHERE order_type = 'normal'), 0)::float8 AS normal_revenue,
        COUNT(*) FILTER (WHERE order_type = 'direct_gift')::int AS direct_orders,
        COALESCE(SUM(revenue) FILTER (WHERE order_type = 'direct_gift'), 0)::float8 AS direct_revenue,
        COUNT(*) FILTER (WHERE order_type = 'stalker_gift')::int AS stalker_orders,
        COALESCE(SUM(revenue) FILTER (WHERE order_type = 'stalker_gift'), 0)::float8 AS stalker_revenue
      FROM (${this.confirmedOrdersSubquery()}) sub
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const r = rows[0] ?? {};
    const orders = Number(r.orders ?? 0);
    const revenue = Number(r.revenue ?? 0);
    const segment = (ordersKey: string, revenueKey: string): SalesSegment => ({
      orders: Number(r[ordersKey] ?? 0),
      revenue: Number(r[revenueKey] ?? 0),
    });
    return {
      confirmedRevenue: revenue,
      confirmedOrders: orders,
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
      unitsSold: Number(r.units ?? 0),
      profit: Number(r.profit ?? 0),
      supplierCost: Number(r.supplier ?? 0),
      realShippingCost: Number(r.real_shipping ?? 0),
      dropiFees: Number(r.fees ?? 0),
      shippingCost: Number(r.shipping ?? 0),
      bySegment: {
        normal: segment('normal_orders', 'normal_revenue'),
        directGift: segment('direct_orders', 'direct_revenue'),
        stalkerGift: segment('stalker_orders', 'stalker_revenue'),
      },
    };
  }

  private async salesByOrderType(from: Date, to: Date): Promise<DistributionItem[]> {
    const sql = `
      SELECT order_type AS key, COUNT(*)::int AS count
      FROM (${this.confirmedOrdersSubquery()}) sub
      GROUP BY order_type
      ORDER BY count DESC
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ key: String(r.key), count: Number(r.count) }));
  }

  private async codPending(from: Date, to: Date): Promise<{ orders: number; amount: number }> {
    const result = await prisma.order.aggregate({
      where: { createdAt: { gte: from, lt: to }, paymentStatus: COD_PENDING_STATUS },
      _count: { _all: true },
      _sum: { total: true },
    });
    return {
      orders: result._count._all,
      amount: result._sum.total ?? 0,
    };
  }

  private async getSalesSeries(from: Date, to: Date, granularity: Granularity): Promise<SeriesPoint[]> {
    const bucket = localBucketExpr('created_at', granularity);
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket,
          COUNT(*)::int AS orders,
          COALESCE(SUM(revenue), 0)::float8 AS revenue,
          COALESCE(SUM(profit), 0)::float8 AS profit
        FROM (${this.confirmedOrdersSubquery()}) sub
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date,
        COALESCE(a.orders, 0)::int AS orders,
        COALESCE(a.revenue, 0)::float8 AS revenue,
        COALESCE(a.profit, 0)::float8 AS profit
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({
      date: r.date,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
      profit: Number(r.profit),
    }));
  }

  /**
   * Subquery a nivel de orden confirmada con métricas agregadas de sus ítems.
   *
   * IMPORTANTE — el ingreso (`revenue`) sale de `o.subtotal`, NO de `o.total`:
   * el cliente paga el precio de producto (envío gratis, absorbido en el precio);
   * tras crear la orden en Dropi, `o.total` se sobrescribe a `subtotal + discounted_amount`
   * (costo de Dropi), por lo que usar `total` infla ingresos y ticket promedio con el
   * costo logístico. `subtotal` = lo que realmente pagó el cliente por los productos.
   * El costo de Dropi se reporta aparte en `shipping` (= `dropi_shipping_cost`).
   */
  private confirmedOrdersSubquery(): string {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const ship = this.dropiShippingAmountSql('oi');
    const supp = this.dropiSupplierCostSql('oi');
    const fees = this.dropiFeesSql('oi');
    return `
      SELECT o.id, o.created_at, o.subtotal AS revenue,
        CASE
          WHEN o.is_stalker_gift THEN 'stalker_gift'
          WHEN o.is_gift_order THEN 'direct_gift'
          ELSE 'normal'
        END AS order_type,
        (SELECT COALESCE(SUM(oi.dropi_dropshipper_win), 0) FROM order_items oi WHERE oi.order_id = o.id) AS profit,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS units,
        (SELECT COALESCE(SUM(oi.dropi_shipping_cost), 0) FROM order_items oi WHERE oi.order_id = o.id) AS shipping,
        (SELECT COALESCE(SUM(${ship}), 0) FROM order_items oi WHERE oi.order_id = o.id) AS real_shipping,
        (SELECT COALESCE(SUM(${supp}), 0) FROM order_items oi WHERE oi.order_id = o.id) AS supplier,
        (SELECT COALESCE(SUM(${fees}), 0) FROM order_items oi WHERE oi.order_id = o.id) AS fees
      FROM orders o
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
    `;
  }

  /** shipping_amount con fallback al JSON de Dropi (dropi_webhook_data). */
  private dropiShippingAmountSql(alias: string): string {
    const j = `${alias}.dropi_webhook_data`;
    return `COALESCE(
      NULLIF(${alias}.dropi_shipping_amount, 0),
      CASE
        WHEN ${j} IS NOT NULL AND (${j})::jsonb ? 'shipping_amount'
          AND (${j}->>'shipping_amount') ~ '^[0-9.]+$'
        THEN ROUND((${j}->>'shipping_amount')::numeric)::int
        ELSE 0
      END
    )`;
  }

  /** supplier_price con fallback al JSON de Dropi (orderdetails[0]). */
  private dropiSupplierCostSql(alias: string): string {
    const j = `${alias}.dropi_webhook_data`;
    return `COALESCE(
      NULLIF(${alias}.dropi_supplier_cost, 0),
      CASE
        WHEN ${j} IS NOT NULL
          AND (${j})::jsonb ? 'orderdetails'
          AND jsonb_array_length((${j})::jsonb->'orderdetails') > 0
          AND ((${j})::jsonb->'orderdetails'->0->>'supplier_price') ~ '^[0-9.]+$'
        THEN ROUND(((${j})::jsonb->'orderdetails'->0->>'supplier_price')::numeric)::int
        ELSE 0
      END
    )`;
  }

  /** Fees Dropi = discounted_amount − proveedor − envío (residual ≥ 0). */
  private dropiFeesSql(alias: string): string {
    return `GREATEST(
      COALESCE(${alias}.dropi_shipping_cost, 0)
      - ${this.dropiSupplierCostSql(alias)}
      - ${this.dropiShippingAmountSql(alias)},
      0
    )`;
  }

  private async ordersDistribution(
    field: 'status' | 'paymentStatus' | 'paymentMethod',
    from: Date,
    to: Date
  ): Promise<DistributionItem[]> {
    const grouped = await prisma.order.groupBy({
      by: [field],
      where: { createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    });
    return grouped
      .map((g: any) => ({
        key: g[field] === null || g[field] === '' ? 'desconocido' : String(g[field]),
        count: g._count._all as number,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async topProducts(from: Date, to: Date): Promise<RankingItem[]> {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const ship = this.dropiShippingAmountSql('oi');
    const supp = this.dropiSupplierCostSql('oi');
    const sql = `
      SELECT p.id AS id, p.title AS title,
        SUM(oi.quantity)::int AS units,
        COALESCE(SUM(oi.final_price * oi.quantity), 0)::float8 AS revenue,
        COALESCE(SUM(${supp}), 0)::float8 AS supplier_cost,
        COALESCE(SUM(${ship}), 0)::float8 AS shipping_cost
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
      GROUP BY p.id, p.title
      ORDER BY units DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({
      id: r.id,
      label: r.title,
      value: Number(r.units),
      extra: Number(r.revenue),
      supplierCost: Number(r.supplier_cost),
      shippingCost: Number(r.shipping_cost),
    }));
  }

  private async topCategories(from: Date, to: Date): Promise<RankingItem[]> {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const sql = `
      SELECT c.id AS id, c.name AS name,
        SUM(oi.quantity)::int AS units,
        COALESCE(SUM(oi.final_price * oi.quantity), 0)::float8 AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
      GROUP BY c.id, c.name
      ORDER BY units DESC
      LIMIT ${TOP_CATEGORIES_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({
      id: r.id,
      label: r.name,
      value: Number(r.units),
      extra: Number(r.revenue),
    }));
  }

  // ----------------------------------------------------------------------------
  // USUARIOS
  // ----------------------------------------------------------------------------

  async getUsers(range: ResolvedRange): Promise<UsersAnalytics> {
    const { from, to, granularity } = range;

    const [series, newUsers, totalUsers, verified, profilePublic, profilePrivate, googleUsers] =
      await Promise.all([
        this.getUsersSeries(from, to, granularity),
        prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.user.count(),
        prisma.user.count({ where: { emailVerified: true } }),
        prisma.userProfile.count({ where: { isPublic: true } }),
        prisma.userProfile.count({ where: { isPublic: false } }),
        prisma.user.count({ where: { password: null } }),
      ]);

    return {
      range: this.rangeMeta(range),
      scalars: { newUsers, totalUsers },
      series,
      emailVerified: { verified, unverified: totalUsers - verified },
      profileVisibility: {
        public: profilePublic,
        private: profilePrivate,
        noProfile: Math.max(totalUsers - profilePublic - profilePrivate, 0),
      },
      registrationOrigin: { google: googleUsers, email: Math.max(totalUsers - googleUsers, 0) },
    };
  }

  private async getUsersSeries(from: Date, to: Date, granularity: Granularity): Promise<SeriesPoint[]> {
    const bucket = localBucketExpr('created_at', granularity);
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket, COUNT(*)::int AS count
        FROM users
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date, COALESCE(a.count, 0)::int AS count
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async newUsersCount(from: Date, to: Date): Promise<number> {
    return prisma.user.count({ where: { createdAt: { gte: from, lt: to } } });
  }

  // ----------------------------------------------------------------------------
  // REGALOS
  // ----------------------------------------------------------------------------

  async getGifts(range: ResolvedRange): Promise<GiftsAnalytics> {
    const { from, to, granularity } = range;

    const [stalkerGift, directGift] = await Promise.all([
      this.buildStalkerGiftAnalytics(from, to, granularity),
      this.buildDirectGiftAnalytics(from, to, granularity),
    ]);

    return {
      range: this.rangeMeta(range),
      stalkerGift,
      directGift,
    };
  }

  /** Regalos StalkerGift con actividad en el periodo (creado, aceptado o enviado). */
  private stalkerGiftActivitySql(alias = 'sg'): string {
    return `(
      (${alias}.created_at >= ${FROM_BOUND} AND ${alias}.created_at < ${TO_BOUND})
      OR (${alias}.accepted_at >= ${FROM_BOUND} AND ${alias}.accepted_at < ${TO_BOUND})
      OR EXISTS (
        SELECT 1 FROM orders o
        WHERE o.id = ${alias}.order_id
          AND o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
      )
    )`;
  }

  private async buildStalkerGiftAnalytics(
    from: Date,
    to: Date,
    granularity: Granularity
  ): Promise<StalkerGiftAnalytics> {
    const activity = this.stalkerGiftActivitySql('sg');
    const paidList = GIFT_PAID_STATUSES.map((s) => `'${s}'`).join(', ');
    const confirmedList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');

    const scalarsSql = `
      SELECT
        COUNT(*) FILTER (WHERE ${activity})::int AS active_in_period,
        COUNT(*) FILTER (WHERE sg.created_at >= ${FROM_BOUND} AND sg.created_at < ${TO_BOUND})::int AS created,
        COUNT(*) FILTER (WHERE ${activity} AND sg.payment_status IN (${paidList}))::int AS paid,
        COUNT(*) FILTER (WHERE sg.accepted_at >= ${FROM_BOUND} AND sg.accepted_at < ${TO_BOUND})::int AS accepted,
        COUNT(*) FILTER (
          WHERE sg.order_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM orders o
              WHERE o.id = sg.order_id
                AND o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
                AND o.payment_status IN (${confirmedList})
            )
        )::int AS shipped,
        COALESCE((
          SELECT SUM(o.subtotal)
          FROM stalker_gifts sg2
          JOIN orders o ON o.id = sg2.order_id
          WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
            AND o.payment_status IN (${confirmedList})
            AND o.is_stalker_gift = true
        ), 0)::float8 AS shipped_revenue
      FROM stalker_gifts sg
    `;
    const scalarRows = await prisma.$queryRawUnsafe<any[]>(scalarsSql, from, to);
    const sr = scalarRows[0] ?? {};
    const created = Number(sr.created ?? 0);
    const accepted = Number(sr.accepted ?? 0);
    const paid = Number(sr.paid ?? 0);

    const [avgHours, series, byEstadoRaw, topSenders] = await Promise.all([
      this.giftAvgTimeToAcceptHours(from, to),
      this.getStalkerGiftSeries(from, to, granularity),
      prisma.stalkerGift.groupBy({
        by: ['estado'],
        where: {
          OR: [
            { createdAt: { gte: from, lt: to } },
            { acceptedAt: { gte: from, lt: to } },
            { order: { createdAt: { gte: from, lt: to } } },
          ],
        },
        _count: { _all: true },
      }),
      this.topStalkerGiftSenders(from, to),
    ]);

    const acceptanceRate = created > 0 ? Number(((accepted / created) * 100).toFixed(2)) : 0;
    const paidRate = created > 0 ? Number(((paid / created) * 100).toFixed(2)) : 0;

    const byEstado: DistributionItem[] = byEstadoRaw
      .map((g: any) => ({ key: String(g.estado), count: g._count._all as number }))
      .sort((a, b) => b.count - a.count);

    return {
      scalars: {
        activeInPeriod: Number(sr.active_in_period ?? 0),
        created,
        paid,
        accepted,
        shipped: Number(sr.shipped ?? 0),
        shippedRevenue: Number(sr.shipped_revenue ?? 0),
        acceptanceRate,
        paidRate,
        avgTimeToAcceptHours: avgHours,
      },
      series,
      byEstado,
      topSenders,
    };
  }

  private async buildDirectGiftAnalytics(
    from: Date,
    to: Date,
    granularity: Granularity
  ): Promise<DirectGiftAnalytics> {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const scalarsSql = `
      SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(o.subtotal), 0)::float8 AS revenue,
        COALESCE(SUM(oi.units), 0)::int AS units
      FROM orders o
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(quantity), 0)::int AS units FROM order_items WHERE order_id = o.id
      ) oi ON true
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
        AND o.is_gift_order = true
        AND o.is_stalker_gift = false
    `;
    const scalarRows = await prisma.$queryRawUnsafe<any[]>(scalarsSql, from, to);
    const r = scalarRows[0] ?? {};
    const orders = Number(r.orders ?? 0);
    const revenue = Number(r.revenue ?? 0);

    const [series, topSenders, topRecipients] = await Promise.all([
      this.getDirectGiftSeries(from, to, granularity),
      this.topDirectGiftSenders(from, to),
      this.topDirectGiftRecipients(from, to),
    ]);

    return {
      scalars: {
        orders,
        revenue,
        averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
        unitsSold: Number(r.units ?? 0),
      },
      series,
      topSenders,
      topRecipients,
    };
  }

  private async giftAvgTimeToAcceptHours(from: Date, to: Date): Promise<number | null> {
    const sql = `
      SELECT EXTRACT(EPOCH FROM AVG(accepted_at - created_at)) / 3600.0 AS hours
      FROM stalker_gifts
      WHERE accepted_at >= ${FROM_BOUND} AND accepted_at < ${TO_BOUND}
        AND accepted_at IS NOT NULL
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const hours = rows[0]?.hours;
    return hours === null || hours === undefined ? null : Number(Number(hours).toFixed(1));
  }

  private async getStalkerGiftSeries(from: Date, to: Date, granularity: Granularity): Promise<SeriesPoint[]> {
    const bucket = localBucketExpr('created_at', granularity);
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket, COUNT(*)::int AS count
        FROM stalker_gifts
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date, COALESCE(a.count, 0)::int AS count
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private async getDirectGiftSeries(from: Date, to: Date, granularity: Granularity): Promise<SeriesPoint[]> {
    const bucket = localBucketExpr('created_at', granularity);
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket,
          COUNT(*)::int AS count,
          COALESCE(SUM(subtotal), 0)::float8 AS revenue
        FROM orders
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
          AND payment_status IN (${inList})
          AND is_gift_order = true
          AND is_stalker_gift = false
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date,
        COALESCE(a.count, 0)::int AS count,
        COALESCE(a.revenue, 0)::float8 AS revenue
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ date: r.date, count: Number(r.count), revenue: Number(r.revenue) }));
  }

  private async topStalkerGiftSenders(from: Date, to: Date): Promise<RankingItem[]> {
    const activity = this.stalkerGiftActivitySql('sg');
    const sql = `
      SELECT u.id AS id, u.first_name AS first_name, u.last_name AS last_name,
        u.username AS username, u.email AS email, COUNT(*)::int AS value
      FROM stalker_gifts sg
      JOIN users u ON u.id = sg.sender_id
      WHERE ${activity}
      GROUP BY u.id, u.first_name, u.last_name, u.username, u.email
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => {
      const fullName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      const label = fullName || r.username || r.email || 'Usuario';
      return { id: r.id, label, value: Number(r.value) };
    });
  }

  private async topDirectGiftSenders(from: Date, to: Date): Promise<RankingItem[]> {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const sql = `
      SELECT u.id AS id, u.first_name AS first_name, u.last_name AS last_name,
        u.username AS username, u.email AS email, COUNT(*)::int AS value
      FROM orders o
      JOIN users u ON u.id = o.gift_sender_id
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
        AND o.is_gift_order = true
        AND o.is_stalker_gift = false
        AND o.gift_sender_id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name, u.username, u.email
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => {
      const fullName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      const label = fullName || r.username || r.email || 'Usuario';
      return { id: r.id, label, value: Number(r.value) };
    });
  }

  private async topDirectGiftRecipients(from: Date, to: Date): Promise<RankingItem[]> {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    const sql = `
      SELECT u.id AS id, u.first_name AS first_name, u.last_name AS last_name,
        u.username AS username, u.email AS email, COUNT(*)::int AS value
      FROM orders o
      JOIN users u ON u.id = o.gift_recipient_id
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
        AND o.is_gift_order = true
        AND o.is_stalker_gift = false
        AND o.gift_recipient_id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name, u.username, u.email
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => {
      const fullName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      const label = fullName || r.username || r.email || 'Usuario';
      return { id: r.id, label, value: Number(r.value) };
    });
  }

  /** Conteo simple de StalkerGift activos en periodo (para overview). */
  private async stalkerGiftActiveCount(from: Date, to: Date): Promise<number> {
    const activity = this.stalkerGiftActivitySql('sg');
    const sql = `SELECT COUNT(*)::int AS count FROM stalker_gifts sg WHERE ${activity}`;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return Number(rows[0]?.count ?? 0);
  }

  private async stalkerGiftOverviewCounts(
    from: Date,
    to: Date
  ): Promise<{ active: number; created: number; accepted: number }> {
    const activity = this.stalkerGiftActivitySql('sg');
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE ${activity})::int AS active,
        COUNT(*) FILTER (WHERE sg.created_at >= ${FROM_BOUND} AND sg.created_at < ${TO_BOUND})::int AS created,
        COUNT(*) FILTER (WHERE sg.accepted_at >= ${FROM_BOUND} AND sg.accepted_at < ${TO_BOUND})::int AS accepted
      FROM stalker_gifts sg
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const r = rows[0] ?? {};
    return {
      active: Number(r.active ?? 0),
      created: Number(r.created ?? 0),
      accepted: Number(r.accepted ?? 0),
    };
  }

  // ----------------------------------------------------------------------------
  // OVERVIEW
  // ----------------------------------------------------------------------------

  async getOverview(range: ResolvedRange): Promise<OverviewAnalytics> {
    const { from, to, previous, granularity } = range;

    const [
      currentSales,
      previousSales,
      currentNewUsers,
      previousNewUsers,
      currentGifts,
      previousGifts,
      usersSeries,
      salesSeries,
      ordersByStatus,
      topProducts,
    ] = await Promise.all([
      this.salesScalars(from, to),
      this.salesScalars(previous.from, previous.to),
      this.newUsersCount(from, to),
      this.newUsersCount(previous.from, previous.to),
      this.stalkerGiftOverviewCounts(from, to),
      this.stalkerGiftOverviewCounts(previous.from, previous.to),
      this.getUsersSeries(from, to, granularity),
      this.getSalesSeries(from, to, granularity),
      this.ordersDistribution('status', from, to),
      this.topProducts(from, to),
    ]);

    const giftAcceptanceRate =
      currentGifts.created > 0 ? Number(((currentGifts.accepted / currentGifts.created) * 100).toFixed(2)) : 0;

    return {
      range: this.rangeMeta(range),
      kpis: {
        newUsers: this.kpi(currentNewUsers, previousNewUsers),
        confirmedRevenue: this.kpi(currentSales.confirmedRevenue, previousSales.confirmedRevenue),
        profit: this.kpi(currentSales.profit, previousSales.profit),
        confirmedOrders: this.kpi(currentSales.confirmedOrders, previousSales.confirmedOrders),
        averageOrderValue: this.kpi(currentSales.averageOrderValue, previousSales.averageOrderValue),
        giftsCreated: this.kpi(currentGifts.active, previousGifts.active),
      },
      giftAcceptanceRate,
      usersSeries,
      revenueSeries: salesSeries,
      ordersByStatus,
      topProducts,
    };
  }

  // ----------------------------------------------------------------------------
  // POSTVENTA
  // ----------------------------------------------------------------------------

  async getSupport(range: ResolvedRange): Promise<SupportAnalytics> {
    const { from, to, granularity } = range;

    const [created, open, resolved, ordersInRange, avgResolutionHours, series, byStatusRaw, byTypeRaw, byAdmin] =
      await Promise.all([
        prisma.supportCase.count({ where: { createdAt: { gte: from, lt: to } } }),
        prisma.supportCase.count({
          where: { createdAt: { gte: from, lt: to }, status: { in: ['OPEN', 'IN_REVIEW', 'WAITING_USER'] } },
        }),
        prisma.supportCase.count({
          where: { createdAt: { gte: from, lt: to }, status: { in: ['RESOLVED', 'CLOSED'] } },
        }),
        prisma.order.count({ where: { createdAt: { gte: from, lt: to } } }),
        this.supportAvgResolutionHours(from, to),
        this.countSeries('support_cases', from, to, granularity),
        prisma.supportCase.groupBy({
          by: ['status'],
          where: { createdAt: { gte: from, lt: to } },
          _count: { _all: true },
        }),
        prisma.supportCase.groupBy({
          by: ['caseType'],
          where: { createdAt: { gte: from, lt: to } },
          _count: { _all: true },
        }),
        this.supportByAdmin(from, to),
      ]);

    const caseRateOverOrders = ordersInRange > 0 ? Number(((created / ordersInRange) * 100).toFixed(2)) : 0;

    return {
      range: this.rangeMeta(range),
      scalars: { created, open, resolved, caseRateOverOrders, avgResolutionHours },
      series,
      byStatus: this.mapDistribution(byStatusRaw, 'status'),
      byType: this.mapDistribution(byTypeRaw, 'caseType'),
      byAdmin,
    };
  }

  private async supportAvgResolutionHours(from: Date, to: Date): Promise<number | null> {
    // Aproximado: usa updated_at como momento de resolución para casos RESOLVED/CLOSED.
    const sql = `
      SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 3600.0 AS hours
      FROM support_cases
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        AND status IN ('RESOLVED', 'CLOSED')
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const hours = rows[0]?.hours;
    return hours === null || hours === undefined ? null : Number(Number(hours).toFixed(1));
  }

  private async supportByAdmin(from: Date, to: Date): Promise<RankingItem[]> {
    const sql = `
      SELECT a.id AS id, a.first_name AS first_name, a.last_name AS last_name, a.email AS email,
        COUNT(*)::int AS value
      FROM support_cases sc
      JOIN admin_users a ON a.id = sc.assigned_admin_user_id
      WHERE sc.created_at >= ${FROM_BOUND} AND sc.created_at < ${TO_BOUND}
      GROUP BY a.id
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => {
      const fullName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      return { id: r.id, label: fullName || r.email || 'Admin', value: Number(r.value) };
    });
  }

  // ----------------------------------------------------------------------------
  // OPERACIÓN DROPI
  // ----------------------------------------------------------------------------

  async getOperations(range: ResolvedRange): Promise<OperationsAnalytics> {
    const { from, to, granularity } = range;

    const [totalJobs, failed, avgDurationSeconds, series, byTypeRaw, byStatusRaw, crons] = await Promise.all([
      prisma.dropiJob.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.dropiJob.count({ where: { createdAt: { gte: from, lt: to }, status: 'FAILED' } }),
      this.jobsAvgDurationSeconds(from, to),
      this.countSeries('dropi_jobs', from, to, granularity),
      prisma.dropiJob.groupBy({ by: ['type'], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      prisma.dropiJob.groupBy({ by: ['status'], where: { createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
      prisma.cronJobState.findMany({
        select: { jobKey: true, lastStatus: true, lastCompletedAt: true, lastError: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const failureRate = totalJobs > 0 ? Number(((failed / totalJobs) * 100).toFixed(2)) : 0;

    return {
      range: this.rangeMeta(range),
      scalars: { totalJobs, failed, failureRate, avgDurationSeconds },
      series,
      byType: this.mapDistribution(byTypeRaw, 'type'),
      byStatus: this.mapDistribution(byStatusRaw, 'status'),
      crons: crons.map((c) => ({
        jobKey: c.jobKey,
        lastStatus: c.lastStatus,
        lastCompletedAt: c.lastCompletedAt ? c.lastCompletedAt.toISOString() : null,
        lastError: c.lastError,
      })),
    };
  }

  private async jobsAvgDurationSeconds(from: Date, to: Date): Promise<number | null> {
    const sql = `
      SELECT EXTRACT(EPOCH FROM AVG(finished_at - started_at)) AS seconds
      FROM dropi_jobs
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        AND finished_at IS NOT NULL AND started_at IS NOT NULL
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const seconds = rows[0]?.seconds;
    return seconds === null || seconds === undefined ? null : Number(Number(seconds).toFixed(1));
  }

  // ----------------------------------------------------------------------------
  // CATÁLOGO / INVENTARIO (estado actual, salvo "nuevos en el periodo")
  // ----------------------------------------------------------------------------

  async getCatalog(range: ResolvedRange): Promise<CatalogAnalytics> {
    const { from, to, granularity } = range;

    const [
      totalProducts,
      activeProducts,
      outOfStockVariants,
      lockedProducts,
      adultProducts,
      outOfDropiCatalog,
      totalCategories,
      newProductsSeries,
      topCategoriesByProducts,
      stockByWarehouse,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.productVariant.count({ where: { stock: 0 } }),
      prisma.product.count({ where: { lockedByAdmin: true } }),
      prisma.product.count({ where: { restrictToAdults: true } }),
      prisma.product.count({ where: { inDropiCatalog: false } }),
      prisma.category.count(),
      this.countSeries('products', from, to, granularity),
      this.topCategoriesByProducts(),
      this.stockByWarehouse(),
    ]);

    return {
      range: this.rangeMeta(range),
      scalars: {
        totalProducts,
        activeProducts,
        outOfStockVariants,
        lockedProducts,
        adultProducts,
        outOfDropiCatalog,
        totalCategories,
      },
      newProductsSeries,
      topCategoriesByProducts,
      stockByWarehouse,
    };
  }

  private async topCategoriesByProducts(): Promise<RankingItem[]> {
    const sql = `
      SELECT c.id AS id, c.name AS name, COUNT(p.id)::int AS value
      FROM products p
      JOIN categories c ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql);
    return rows.map((r) => ({ id: r.id, label: r.name, value: Number(r.value) }));
  }

  private async stockByWarehouse(): Promise<RankingItem[]> {
    const sql = `
      SELECT warehouse_id::text AS id,
        COALESCE(warehouse_name, 'Bodega ' || warehouse_id) AS name,
        SUM(stock)::int AS value
      FROM warehouse_variants
      GROUP BY warehouse_id, warehouse_name
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql);
    return rows.map((r) => ({ id: r.id, label: r.name, value: Number(r.value) }));
  }

  // ----------------------------------------------------------------------------
  // SOCIAL / ENGAGEMENT
  // ----------------------------------------------------------------------------

  async getSocial(range: ResolvedRange): Promise<SocialAnalytics> {
    const { from, to, granularity } = range;
    const where = { createdAt: { gte: from, lt: to } };

    const [
      posters,
      reactions,
      comments,
      productLikes,
      stories,
      storyViewsAgg,
      series,
      postersActive,
      postersInactive,
      storiesActive,
      storiesInactive,
      topCreators,
    ] = await Promise.all([
      prisma.poster.count({ where }),
      prisma.posterReaction.count({ where }),
      prisma.posterComment.count({ where }),
      prisma.productLike.count({ where }),
      prisma.storiesUser.count({ where }),
      prisma.storiesUser.aggregate({ where, _sum: { viewsCount: true } }),
      this.countSeries('posters', from, to, granularity),
      prisma.poster.count({ where: { isActive: true } }),
      prisma.poster.count({ where: { isActive: false } }),
      prisma.storiesUser.count({ where: { isActive: true } }),
      prisma.storiesUser.count({ where: { isActive: false } }),
      this.topCreators(from, to),
    ]);

    return {
      range: this.rangeMeta(range),
      scalars: {
        posters,
        reactions,
        comments,
        productLikes,
        stories,
        storyViews: storyViewsAgg._sum.viewsCount ?? 0,
      },
      series,
      postersActivity: { active: postersActive, inactive: postersInactive },
      storiesActivity: { active: storiesActive, inactive: storiesInactive },
      topCreators,
    };
  }

  private async topCreators(from: Date, to: Date): Promise<RankingItem[]> {
    const sql = `
      SELECT u.id AS id, u.first_name AS first_name, u.last_name AS last_name,
        u.username AS username, u.email AS email, COUNT(*)::int AS value
      FROM posters p
      JOIN users u ON u.id = p.customer_id
      WHERE p.created_at >= ${FROM_BOUND} AND p.created_at < ${TO_BOUND}
      GROUP BY u.id
      ORDER BY value DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => {
      const fullName = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim();
      const label = fullName || r.username || r.email || 'Usuario';
      return { id: r.id, label, value: Number(r.value) };
    });
  }

  // ----------------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------------

  /** Serie de conteo de registros por bucket para una tabla con columna `created_at`. */
  private async countSeries(
    table: string,
    from: Date,
    to: Date,
    granularity: Granularity
  ): Promise<SeriesPoint[]> {
    const bucket = localBucketExpr('created_at', granularity);
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket, COUNT(*)::int AS count
        FROM "${table}"
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date, COALESCE(a.count, 0)::int AS count
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }

  private mapDistribution(grouped: any[], field: string): DistributionItem[] {
    return grouped
      .map((g) => ({
        key: g[field] === null || g[field] === '' ? 'desconocido' : String(g[field]),
        count: g._count._all as number,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private kpi(current: number, previous: number): Kpi {
    return { current, previous, delta: computeDelta(current, previous) };
  }

  // ----------------------------------------------------------------------------
  // COMPORTAMIENTO (analytics_events) - Fase 3
  // ----------------------------------------------------------------------------

  async getBehavior(range: ResolvedRange): Promise<BehaviorAnalytics> {
    const { from, to, granularity } = range;

    const [scalars, eventsByType, dauSeries, stickiness, funnel, outcomes, retention, topOpenedProducts] =
      await Promise.all([
        this.behaviorScalars(from, to),
        this.behaviorEventsByType(from, to),
        this.behaviorDauSeries(from, to, granularity),
        this.behaviorStickiness(from, to),
        this.behaviorFunnel(from, to),
        this.behaviorOutcomes(from, to),
        this.behaviorRetention(from, to),
        this.behaviorTopOpenedProducts(from, to),
      ]);

    return {
      range: this.rangeMeta(range),
      scalars,
      eventsByType,
      dauSeries,
      stickiness,
      funnel,
      outcomes,
      retention,
      topOpenedProducts,
    };
  }

  private async behaviorScalars(from: Date, to: Date): Promise<BehaviorAnalytics['scalars']> {
    const sql = `
      SELECT
        COUNT(*)::int AS total_events,
        COUNT(DISTINCT ${BEHAVIOR_ACTOR})::int AS active_actors,
        COUNT(DISTINCT user_id)::int AS registered_users,
        COUNT(*) FILTER (WHERE user_id IS NULL)::int AS anonymous_events
      FROM analytics_events
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const r = rows[0] ?? {};
    const totalEvents = Number(r.total_events ?? 0);
    const activeActors = Number(r.active_actors ?? 0);
    return {
      totalEvents,
      activeActors,
      registeredUsers: Number(r.registered_users ?? 0),
      anonymousEvents: Number(r.anonymous_events ?? 0),
      eventsPerActor: activeActors > 0 ? Number((totalEvents / activeActors).toFixed(2)) : 0,
    };
  }

  private async behaviorEventsByType(from: Date, to: Date): Promise<DistributionItem[]> {
    const grouped = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    });
    return grouped
      .map((g: any) => ({ key: String(g.eventType), count: g._count._all as number }))
      .sort((a, b) => b.count - a.count);
  }

  private async behaviorDauSeries(
    from: Date,
    to: Date,
    granularity: Granularity,
  ): Promise<BehaviorAnalytics['dauSeries']> {
    const bucket = localBucketExpr('created_at', granularity);
    const sql = `
      WITH ${bucketsCte(granularity)},
      agg AS (
        SELECT ${bucket} AS bucket,
          COUNT(DISTINCT ${BEHAVIOR_ACTOR})::int AS dau,
          COUNT(*)::int AS events
        FROM analytics_events
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        GROUP BY 1
      )
      SELECT to_char(b.bucket, 'YYYY-MM-DD') AS date,
        COALESCE(a.dau, 0)::int AS dau,
        COALESCE(a.events, 0)::int AS events
      FROM buckets b
      LEFT JOIN agg a ON a.bucket = b.bucket
      ORDER BY b.bucket
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ date: r.date, dau: Number(r.dau), events: Number(r.events) }));
  }

  private async behaviorStickiness(from: Date, to: Date): Promise<BehaviorAnalytics['stickiness']> {
    // MAU: actores únicos en los 30 días previos a `to` (ventana móvil estándar).
    const mauFrom = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const bucket = localBucketExpr('created_at', 'day');
    const sql = `
      WITH daily AS (
        SELECT ${bucket} AS bucket, COUNT(DISTINCT ${BEHAVIOR_ACTOR})::int AS dau
        FROM analytics_events
        WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        GROUP BY 1
      )
      SELECT COALESCE(AVG(dau), 0)::float8 AS avg_dau FROM daily
    `;
    const mauSql = `
      SELECT COUNT(DISTINCT ${BEHAVIOR_ACTOR})::int AS mau
      FROM analytics_events
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
    `;
    const [avgRows, mauRows] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(sql, from, to),
      prisma.$queryRawUnsafe<any[]>(mauSql, mauFrom, to),
    ]);
    const avgDau = Number(avgRows[0]?.avg_dau ?? 0);
    const mau = Number(mauRows[0]?.mau ?? 0);
    return {
      avgDau: Number(avgDau.toFixed(2)),
      mau,
      ratio: mau > 0 ? Number(((avgDau / mau) * 100).toFixed(2)) : 0,
    };
  }

  private async behaviorFunnel(from: Date, to: Date): Promise<BehaviorAnalytics['funnel']> {
    const steps = BEHAVIOR_FUNNEL_STEPS;
    const inList = steps.map((s) => `'${s.key}'`).join(', ');
    const sql = `
      SELECT event_type,
        COUNT(DISTINCT ${BEHAVIOR_ACTOR})::int AS actors,
        COUNT(*)::int AS events
      FROM analytics_events
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        AND event_type IN (${inList})
      GROUP BY event_type
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const byType = new Map<string, { actors: number; events: number }>();
    for (const r of rows) {
      byType.set(String(r.event_type), { actors: Number(r.actors), events: Number(r.events) });
    }

    let prevActors: number | null = null;
    let startActors: number | null = null;
    return steps.map((step) => {
      const entry = byType.get(step.key) ?? { actors: 0, events: 0 };
      if (startActors === null) startActors = entry.actors;
      const conversionFromPrev =
        prevActors === null ? null : prevActors > 0 ? Number(((entry.actors / prevActors) * 100).toFixed(2)) : 0;
      const conversionFromStart =
        startActors === null || prevActors === null
          ? null
          : startActors > 0
          ? Number(((entry.actors / startActors) * 100).toFixed(2))
          : 0;
      prevActors = entry.actors;
      return {
        key: step.key,
        label: step.label,
        actors: entry.actors,
        events: entry.events,
        conversionFromPrev,
        conversionFromStart,
      };
    });
  }

  // Desenlaces alternativos desde "Abrió detalle" (no son secuenciales entre sí):
  // agregó a wishlist, compró para sí (purchase con isGift=false) e inició regalo.
  // La conversión es contra los actores que abrieron detalle (product_click).
  private async behaviorOutcomes(from: Date, to: Date): Promise<BehaviorAnalytics['outcomes']> {
    const actor = BEHAVIOR_ACTOR;
    const range = `created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}`;
    const sql = `
      SELECT
        (SELECT COUNT(DISTINCT ${actor}) FROM analytics_events
           WHERE ${range} AND event_type = 'product_click')::int AS open_actors,
        (SELECT COUNT(DISTINCT ${actor}) FROM analytics_events
           WHERE ${range} AND event_type = 'wishlist_add')::int AS wishlist_actors,
        (SELECT COUNT(DISTINCT ${actor}) FROM analytics_events
           WHERE ${range} AND event_type = 'purchase'
             AND COALESCE((metadata->>'isGift')::boolean, false) = false)::int AS self_purchase_actors,
        (SELECT COUNT(DISTINCT ${actor}) FROM analytics_events
           WHERE ${range} AND event_type = 'gift_cart_start')::int AS gift_actors
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const r = rows[0] ?? {};
    const openActors = Number(r.open_actors ?? 0);
    const pct = (n: number) =>
      openActors > 0 ? Number(((n / openActors) * 100).toFixed(2)) : null;

    const items: { key: string; actors: number }[] = [
      { key: 'wishlist_add', actors: Number(r.wishlist_actors ?? 0) },
      { key: 'self_purchase', actors: Number(r.self_purchase_actors ?? 0) },
      { key: 'gift_cart_start', actors: Number(r.gift_actors ?? 0) },
    ];
    const labels: Record<string, string> = {
      wishlist_add: 'Agregó a wishlist',
      self_purchase: 'Compró para sí',
      gift_cart_start: 'Inició regalo',
    };

    return {
      openActors,
      items: items.map((it) => ({
        key: it.key,
        label: labels[it.key],
        actors: it.actors,
        conversionFromOpen: pct(it.actors),
      })),
    };
  }

  private async behaviorRetention(from: Date, to: Date): Promise<BehaviorAnalytics['retention']> {
    const weekBucket = localBucketExpr('created_at', 'week');
    // Cohorte = semana del primer evento (solo usuarios registrados, identidad estable).
    const sql = `
      WITH scoped AS (
        SELECT user_id,
          ${weekBucket} AS week
        FROM analytics_events
        WHERE user_id IS NOT NULL
          AND created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
      ),
      first_seen AS (
        SELECT user_id, MIN(week) AS cohort_week FROM scoped GROUP BY user_id
      ),
      activity AS (
        SELECT DISTINCT user_id, week AS active_week FROM scoped
      )
      SELECT to_char(fs.cohort_week, 'YYYY-MM-DD') AS cohort,
        (EXTRACT(EPOCH FROM (act.active_week - fs.cohort_week)) / 604800)::int AS week_offset,
        COUNT(DISTINCT fs.user_id)::int AS users
      FROM first_seen fs
      JOIN activity act ON act.user_id = fs.user_id
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);

    // Tamaño de cada cohorte (offset 0).
    const sizeByCohort = new Map<string, number>();
    const cellByCohort = new Map<string, Map<number, number>>();
    let maxOffset = 0;
    for (const r of rows) {
      const cohort = String(r.cohort);
      const offset = Number(r.week_offset);
      const users = Number(r.users);
      if (offset > maxOffset) maxOffset = offset;
      if (!cellByCohort.has(cohort)) cellByCohort.set(cohort, new Map());
      cellByCohort.get(cohort)!.set(offset, users);
      if (offset === 0) sizeByCohort.set(cohort, users);
    }

    const weekOffsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);
    const cohorts: RetentionCohort[] = Array.from(cellByCohort.keys())
      .sort()
      .map((cohort) => {
        const size = sizeByCohort.get(cohort) ?? 0;
        const cells = cellByCohort.get(cohort)!;
        const values = weekOffsets.map((offset) => {
          const users = cells.get(offset);
          if (users === undefined) return null;
          return size > 0 ? Number(((users / size) * 100).toFixed(1)) : null;
        });
        return { cohort, size, values };
      });

    return { cohorts, weekOffsets };
  }

  // Productos con más aperturas de detalle (interés real): cuenta `product_click`,
  // que se emite al abrir el modal del feed o al entrar a la página del producto.
  // NO usa `product_view` (impresión por scroll), que mide exposición pasiva.
  private async behaviorTopOpenedProducts(from: Date, to: Date): Promise<RankingItem[]> {
    const sql = `
      SELECT p.id AS id, p.title AS title, COUNT(*)::int AS opens
      FROM analytics_events ae
      JOIN products p ON p.id = ae.entity_id
      WHERE ae.event_type = 'product_click'
        AND ae.entity_type = 'product'
        AND ae.created_at >= ${FROM_BOUND} AND ae.created_at < ${TO_BOUND}
      GROUP BY p.id, p.title
      ORDER BY opens DESC
      LIMIT ${TOP_LIMIT}
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    return rows.map((r) => ({ id: r.id, label: r.title, value: Number(r.opens) }));
  }

  private rangeMeta(range: ResolvedRange): RangeMeta {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: range.granularity,
    };
  }
}
