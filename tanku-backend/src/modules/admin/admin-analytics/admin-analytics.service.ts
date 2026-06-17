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
  UsersAnalytics,
  GiftsAnalytics,
  GiftsScalars,
  OverviewAnalytics,
  SupportAnalytics,
  OperationsAnalytics,
  CatalogAnalytics,
  SocialAnalytics,
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

/** Límites del rango como timestamp UTC wall, para comparar contra columnas `timestamp`. */
const FROM_BOUND = `($1::timestamptz AT TIME ZONE 'UTC')`;
const TO_BOUND = `($2::timestamptz AT TIME ZONE 'UTC')`;

export class AdminAnalyticsService {
  // ----------------------------------------------------------------------------
  // VENTAS
  // ----------------------------------------------------------------------------

  async getSales(range: ResolvedRange): Promise<SalesAnalytics> {
    const { from, to, granularity } = range;

    const [scalars, codPending, series, byStatus, byPaymentStatus, byPaymentMethod, topProducts, topCategories] =
      await Promise.all([
        this.salesScalars(from, to),
        this.codPending(from, to),
        this.getSalesSeries(from, to, granularity),
        this.ordersDistribution('status', from, to),
        this.ordersDistribution('paymentStatus', from, to),
        this.ordersDistribution('paymentMethod', from, to),
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
      topProducts,
      topCategories,
    };
  }

  private async salesScalars(from: Date, to: Date): Promise<SalesScalars> {
    const sql = `
      SELECT
        COUNT(*)::int AS orders,
        COALESCE(SUM(total), 0)::float8 AS revenue,
        COALESCE(SUM(profit), 0)::float8 AS profit,
        COALESCE(SUM(units), 0)::int AS units,
        COALESCE(SUM(shipping), 0)::float8 AS shipping
      FROM (${this.confirmedOrdersSubquery()}) sub
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const r = rows[0] ?? {};
    const orders = Number(r.orders ?? 0);
    const revenue = Number(r.revenue ?? 0);
    return {
      confirmedRevenue: revenue,
      confirmedOrders: orders,
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
      unitsSold: Number(r.units ?? 0),
      profit: Number(r.profit ?? 0),
      shippingCost: Number(r.shipping ?? 0),
    };
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
          COALESCE(SUM(total), 0)::float8 AS revenue,
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

  /** Subquery a nivel de orden confirmada con métricas agregadas de sus ítems. */
  private confirmedOrdersSubquery(): string {
    const inList = CONFIRMED_PAYMENT_STATUSES.map((s) => `'${s}'`).join(', ');
    return `
      SELECT o.id, o.created_at, o.total,
        (SELECT COALESCE(SUM(oi.dropi_dropshipper_win), 0) FROM order_items oi WHERE oi.order_id = o.id) AS profit,
        (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS units,
        (SELECT COALESCE(SUM(oi.dropi_shipping_cost), 0) FROM order_items oi WHERE oi.order_id = o.id) AS shipping
      FROM orders o
      WHERE o.created_at >= ${FROM_BOUND} AND o.created_at < ${TO_BOUND}
        AND o.payment_status IN (${inList})
    `;
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
    const sql = `
      SELECT p.id AS id, p.title AS title,
        SUM(oi.quantity)::int AS units,
        COALESCE(SUM(oi.final_price * oi.quantity), 0)::float8 AS revenue
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
      LIMIT ${TOP_LIMIT}
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

    const [scalars, avgHours, series, byEstadoRaw, topSenders] = await Promise.all([
      this.giftsScalars(from, to),
      this.giftAvgTimeToAcceptHours(from, to),
      this.getGiftsSeries(from, to, granularity),
      prisma.stalkerGift.groupBy({
        by: ['estado'],
        where: { createdAt: { gte: from, lt: to } },
        _count: { _all: true },
      }),
      this.topGiftSenders(from, to),
    ]);

    const acceptanceRate = scalars.created > 0 ? Number(((scalars.accepted / scalars.created) * 100).toFixed(2)) : 0;
    const paidRate = scalars.created > 0 ? Number(((scalars.paid / scalars.created) * 100).toFixed(2)) : 0;

    const byEstado: DistributionItem[] = byEstadoRaw
      .map((g: any) => ({ key: String(g.estado), count: g._count._all as number }))
      .sort((a, b) => b.count - a.count);

    return {
      range: this.rangeMeta(range),
      scalars: {
        created: scalars.created,
        accepted: scalars.accepted,
        acceptanceRate,
        avgTimeToAcceptHours: avgHours,
        paidRate,
      },
      series,
      byEstado,
      topSenders,
    };
  }

  private async giftsScalars(from: Date, to: Date): Promise<GiftsScalars> {
    const [created, accepted, paid] = await Promise.all([
      prisma.stalkerGift.count({ where: { createdAt: { gte: from, lt: to } } }),
      prisma.stalkerGift.count({ where: { createdAt: { gte: from, lt: to }, acceptedAt: { not: null } } }),
      prisma.stalkerGift.count({
        where: { createdAt: { gte: from, lt: to }, paymentStatus: { in: GIFT_PAID_STATUSES } },
      }),
    ]);
    return { created, accepted, paid };
  }

  private async giftAvgTimeToAcceptHours(from: Date, to: Date): Promise<number | null> {
    const sql = `
      SELECT EXTRACT(EPOCH FROM AVG(accepted_at - created_at)) / 3600.0 AS hours
      FROM stalker_gifts
      WHERE created_at >= ${FROM_BOUND} AND created_at < ${TO_BOUND}
        AND accepted_at IS NOT NULL
    `;
    const rows = await prisma.$queryRawUnsafe<any[]>(sql, from, to);
    const hours = rows[0]?.hours;
    return hours === null || hours === undefined ? null : Number(Number(hours).toFixed(1));
  }

  private async getGiftsSeries(from: Date, to: Date, granularity: Granularity): Promise<SeriesPoint[]> {
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

  private async topGiftSenders(from: Date, to: Date): Promise<RankingItem[]> {
    const sql = `
      SELECT u.id AS id, u.first_name AS first_name, u.last_name AS last_name,
        u.username AS username, u.email AS email, COUNT(*)::int AS value
      FROM stalker_gifts sg
      JOIN users u ON u.id = sg.sender_id
      WHERE sg.created_at >= ${FROM_BOUND} AND sg.created_at < ${TO_BOUND}
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
      this.giftsScalars(from, to),
      this.giftsScalars(previous.from, previous.to),
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
        giftsCreated: this.kpi(currentGifts.created, previousGifts.created),
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

  private rangeMeta(range: ResolvedRange): RangeMeta {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      granularity: range.granularity,
    };
  }
}
