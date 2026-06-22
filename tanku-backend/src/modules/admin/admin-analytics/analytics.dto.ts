import type { Granularity } from './analytics-range.util';

export interface RangeMeta {
  from: string;
  to: string;
  granularity: Granularity;
}

export interface SeriesPoint {
  date: string;
  [key: string]: string | number;
}

export interface DistributionItem {
  key: string;
  count: number;
}

export interface RankingItem {
  id: string;
  label: string;
  value: number;
  extra?: number;
  supplierCost?: number;
  shippingCost?: number;
}

/** KPI con valor actual, valor del periodo anterior y delta %. */
export interface Kpi {
  current: number;
  previous: number;
  /** Variación %; null cuando no hay base de comparación. */
  delta: number | null;
}

export interface SalesSegment {
  orders: number;
  revenue: number;
}

export interface SalesScalars {
  confirmedRevenue: number;
  confirmedOrders: number;
  averageOrderValue: number;
  unitsSold: number;
  profit: number;
  /** Pago al proveedor (supplier_price de Dropi). */
  supplierCost: number;
  /** Envío puro de la transportadora (shipping_amount). */
  realShippingCost: number;
  /** Fees Dropi = discounted_amount − proveedor − envío. */
  dropiFees: number;
  /** Costo TOTAL descontado por Dropi (discounted_amount). */
  shippingCost: number;
  /** Desglose de pedidos confirmados por tipo de venta. */
  bySegment: {
    normal: SalesSegment;
    directGift: SalesSegment;
    stalkerGift: SalesSegment;
  };
}

export interface SalesAnalytics {
  range: RangeMeta;
  scalars: SalesScalars;
  codPending: { orders: number; amount: number };
  series: SeriesPoint[];
  byStatus: DistributionItem[];
  byPaymentStatus: DistributionItem[];
  byPaymentMethod: DistributionItem[];
  /** Pedidos confirmados por tipo: normal | direct_gift | stalker_gift */
  byOrderType: DistributionItem[];
  topProducts: RankingItem[];
  topCategories: RankingItem[];
}

export interface UsersScalars {
  newUsers: number;
}

export interface UsersAnalytics {
  range: RangeMeta;
  scalars: { newUsers: number; totalUsers: number };
  series: SeriesPoint[];
  emailVerified: { verified: number; unverified: number };
  profileVisibility: { public: number; private: number; noProfile: number };
  registrationOrigin: { google: number; email: number };
}

/** Métricas del flujo StalkerGift (anónimo, tabla stalker_gifts). */
export interface StalkerGiftAnalytics {
  scalars: {
    /** Regalos con actividad en el periodo (creado, aceptado o enviado). */
    activeInPeriod: number;
    created: number;
    paid: number;
    accepted: number;
    /** Regalos con orden de envío creada en el periodo. */
    shipped: number;
    shippedRevenue: number;
    acceptanceRate: number;
    paidRate: number;
    avgTimeToAcceptHours: number | null;
  };
  series: SeriesPoint[];
  byEstado: DistributionItem[];
  topSenders: RankingItem[];
}

/** Métricas del carrito regalo (no anónimo, orders.is_gift_order). */
export interface DirectGiftAnalytics {
  scalars: {
    orders: number;
    revenue: number;
    averageOrderValue: number;
    unitsSold: number;
  };
  series: SeriesPoint[];
  topSenders: RankingItem[];
  topRecipients: RankingItem[];
}

export interface GiftsAnalytics {
  range: RangeMeta;
  stalkerGift: StalkerGiftAnalytics;
  directGift: DirectGiftAnalytics;
}

export interface OverviewAnalytics {
  range: RangeMeta;
  kpis: {
    newUsers: Kpi;
    confirmedRevenue: Kpi;
    profit: Kpi;
    confirmedOrders: Kpi;
    averageOrderValue: Kpi;
    giftsCreated: Kpi;
  };
  giftAcceptanceRate: number;
  usersSeries: SeriesPoint[];
  revenueSeries: SeriesPoint[];
  ordersByStatus: DistributionItem[];
  topProducts: RankingItem[];
}

// ---------------------------------------------------------------------------
// Fase 2
// ---------------------------------------------------------------------------

export interface SupportAnalytics {
  range: RangeMeta;
  scalars: {
    created: number;
    open: number;
    resolved: number;
    caseRateOverOrders: number;
    avgResolutionHours: number | null;
  };
  series: SeriesPoint[];
  byStatus: DistributionItem[];
  byType: DistributionItem[];
  byAdmin: RankingItem[];
}

export interface OperationsAnalytics {
  range: RangeMeta;
  scalars: {
    totalJobs: number;
    failed: number;
    failureRate: number;
    avgDurationSeconds: number | null;
  };
  series: SeriesPoint[];
  byType: DistributionItem[];
  byStatus: DistributionItem[];
  crons: {
    jobKey: string;
    lastStatus: string | null;
    lastCompletedAt: string | null;
    lastError: string | null;
  }[];
}

export interface CatalogAnalytics {
  range: RangeMeta;
  scalars: {
    totalProducts: number;
    activeProducts: number;
    outOfStockVariants: number;
    lockedProducts: number;
    adultProducts: number;
    outOfDropiCatalog: number;
    totalCategories: number;
  };
  newProductsSeries: SeriesPoint[];
  topCategoriesByProducts: RankingItem[];
  stockByWarehouse: RankingItem[];
}

export interface SocialAnalytics {
  range: RangeMeta;
  scalars: {
    posters: number;
    reactions: number;
    comments: number;
    productLikes: number;
    stories: number;
    storyViews: number;
  };
  series: SeriesPoint[];
  postersActivity: { active: number; inactive: number };
  storiesActivity: { active: number; inactive: number };
  topCreators: RankingItem[];
}

// ---------------------------------------------------------------------------
// Fase 3 - Comportamiento (analytics_events): embudos, DAU/MAU, retención
// ---------------------------------------------------------------------------

/** Un paso del embudo de conversión. */
export interface FunnelStep {
  key: string;
  label: string;
  /** Actores únicos (usuario o sesión) que dispararon el evento. */
  actors: number;
  events: number;
  /** Conversión respecto al paso anterior (%); null en el primer paso. */
  conversionFromPrev: number | null;
  /** Conversión respecto al primer paso (%); null en el primer paso. */
  conversionFromStart: number | null;
}

/** Punto de actividad diaria (DAU). */
export interface DauPoint {
  date: string;
  dau: number;
  events: number;
}

/** Fila de la matriz de retención por cohorte semanal. */
export interface RetentionCohort {
  /** Semana de la cohorte (primer contacto), YYYY-MM-DD. */
  cohort: string;
  /** Tamaño de la cohorte (usuarios que aparecieron por primera vez esa semana). */
  size: number;
  /** Retención por offset de semana (índice 0 = semana 0). % o null si fuera de rango. */
  values: (number | null)[];
}

export interface BehaviorAnalytics {
  range: RangeMeta;
  scalars: {
    totalEvents: number;
    activeActors: number;
    registeredUsers: number;
    anonymousEvents: number;
    eventsPerActor: number;
  };
  eventsByType: DistributionItem[];
  dauSeries: DauPoint[];
  /** Pegajosidad: DAU promedio / MAU (usuarios únicos en 30 días hasta `to`). */
  stickiness: { avgDau: number; mau: number; ratio: number };
  funnel: FunnelStep[];
  /** Desenlaces alternativos desde "Abrió detalle" (wishlist, compra propia, regalo). */
  outcomes: {
    openActors: number;
    items: { key: string; label: string; actors: number; conversionFromOpen: number | null }[];
  };
  retention: { cohorts: RetentionCohort[]; weekOffsets: number[] };
  /** Productos con más aperturas de detalle (product_click: modal o página). */
  topOpenedProducts: RankingItem[];
}
