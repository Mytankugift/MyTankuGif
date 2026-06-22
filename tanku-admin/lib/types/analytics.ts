export type Granularity = 'day' | 'week' | 'month'

export interface RangeMeta {
  from: string
  to: string
  granularity: Granularity
}

export interface SeriesPoint {
  date: string
  [key: string]: string | number
}

export interface DistributionItem {
  key: string
  count: number
}

export interface RankingItem {
  id: string
  label: string
  value: number
  extra?: number
  supplierCost?: number
  shippingCost?: number
}

export interface Kpi {
  current: number
  previous: number
  delta: number | null
}

export interface SalesSegment {
  orders: number
  revenue: number
}

export interface SalesAnalytics {
  range: RangeMeta
  scalars: {
    confirmedRevenue: number
    confirmedOrders: number
    averageOrderValue: number
    unitsSold: number
    profit: number
    supplierCost: number
    realShippingCost: number
    dropiFees: number
    shippingCost: number
    bySegment: {
      normal: SalesSegment
      directGift: SalesSegment
      stalkerGift: SalesSegment
    }
  }
  codPending: { orders: number; amount: number }
  series: SeriesPoint[]
  byStatus: DistributionItem[]
  byPaymentStatus: DistributionItem[]
  byPaymentMethod: DistributionItem[]
  byOrderType: DistributionItem[]
  topProducts: RankingItem[]
  topCategories: RankingItem[]
}

export interface UsersAnalytics {
  range: RangeMeta
  scalars: { newUsers: number; totalUsers: number }
  series: SeriesPoint[]
  emailVerified: { verified: number; unverified: number }
  profileVisibility: { public: number; private: number; noProfile: number }
  registrationOrigin: { google: number; email: number }
}

export interface StalkerGiftAnalytics {
  scalars: {
    activeInPeriod: number
    created: number
    paid: number
    accepted: number
    shipped: number
    shippedRevenue: number
    acceptanceRate: number
    paidRate: number
    avgTimeToAcceptHours: number | null
  }
  series: SeriesPoint[]
  byEstado: DistributionItem[]
  topSenders: RankingItem[]
}

export interface DirectGiftAnalytics {
  scalars: {
    orders: number
    revenue: number
    averageOrderValue: number
    unitsSold: number
  }
  series: SeriesPoint[]
  topSenders: RankingItem[]
  topRecipients: RankingItem[]
}

export interface GiftsAnalytics {
  range: RangeMeta
  stalkerGift: StalkerGiftAnalytics
  directGift: DirectGiftAnalytics
}

export interface OverviewAnalytics {
  range: RangeMeta
  kpis: {
    newUsers: Kpi
    confirmedRevenue: Kpi
    profit: Kpi
    confirmedOrders: Kpi
    averageOrderValue: Kpi
    giftsCreated: Kpi
  }
  giftAcceptanceRate: number
  usersSeries: SeriesPoint[]
  revenueSeries: SeriesPoint[]
  ordersByStatus: DistributionItem[]
  topProducts: RankingItem[]
}

// ---------------------------------------------------------------------------
// Fase 2
// ---------------------------------------------------------------------------

export interface SupportAnalytics {
  range: RangeMeta
  scalars: {
    created: number
    open: number
    resolved: number
    caseRateOverOrders: number
    avgResolutionHours: number | null
  }
  series: SeriesPoint[]
  byStatus: DistributionItem[]
  byType: DistributionItem[]
  byAdmin: RankingItem[]
}

export interface OperationsAnalytics {
  range: RangeMeta
  scalars: {
    totalJobs: number
    failed: number
    failureRate: number
    avgDurationSeconds: number | null
  }
  series: SeriesPoint[]
  byType: DistributionItem[]
  byStatus: DistributionItem[]
  crons: {
    jobKey: string
    lastStatus: string | null
    lastCompletedAt: string | null
    lastError: string | null
  }[]
}

export interface CatalogAnalytics {
  range: RangeMeta
  scalars: {
    totalProducts: number
    activeProducts: number
    outOfStockVariants: number
    lockedProducts: number
    adultProducts: number
    outOfDropiCatalog: number
    totalCategories: number
  }
  newProductsSeries: SeriesPoint[]
  topCategoriesByProducts: RankingItem[]
  stockByWarehouse: RankingItem[]
}

export interface SocialAnalytics {
  range: RangeMeta
  scalars: {
    posters: number
    reactions: number
    comments: number
    productLikes: number
    stories: number
    storyViews: number
  }
  series: SeriesPoint[]
  postersActivity: { active: number; inactive: number }
  storiesActivity: { active: number; inactive: number }
  topCreators: RankingItem[]
}

// ---------------------------------------------------------------------------
// Fase 3 - Comportamiento (analytics_events)
// ---------------------------------------------------------------------------

export interface FunnelStep {
  key: string
  label: string
  actors: number
  events: number
  conversionFromPrev: number | null
  conversionFromStart: number | null
}

export interface DauPoint {
  date: string
  dau: number
  events: number
}

export interface RetentionCohort {
  cohort: string
  size: number
  values: (number | null)[]
}

export interface BehaviorAnalytics {
  range: RangeMeta
  scalars: {
    totalEvents: number
    activeActors: number
    registeredUsers: number
    anonymousEvents: number
    eventsPerActor: number
  }
  eventsByType: DistributionItem[]
  dauSeries: DauPoint[]
  stickiness: { avgDau: number; mau: number; ratio: number }
  funnel: FunnelStep[]
  outcomes: {
    openActors: number
    items: { key: string; label: string; actors: number; conversionFromOpen: number | null }[]
  }
  retention: { cohorts: RetentionCohort[]; weekOffsets: number[] }
  topOpenedProducts: RankingItem[]
}
