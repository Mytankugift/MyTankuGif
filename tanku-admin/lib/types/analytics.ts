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
}

export interface Kpi {
  current: number
  previous: number
  delta: number | null
}

export interface SalesAnalytics {
  range: RangeMeta
  scalars: {
    confirmedRevenue: number
    confirmedOrders: number
    averageOrderValue: number
    unitsSold: number
    profit: number
    shippingCost: number
  }
  codPending: { orders: number; amount: number }
  series: SeriesPoint[]
  byStatus: DistributionItem[]
  byPaymentStatus: DistributionItem[]
  byPaymentMethod: DistributionItem[]
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

export interface GiftsAnalytics {
  range: RangeMeta
  scalars: {
    created: number
    accepted: number
    acceptanceRate: number
    avgTimeToAcceptHours: number | null
    paidRate: number
  }
  series: SeriesPoint[]
  byEstado: DistributionItem[]
  topSenders: RankingItem[]
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
