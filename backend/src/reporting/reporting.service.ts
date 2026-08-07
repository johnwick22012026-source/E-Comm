import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ReportQueryDto, DashboardReportType, ReportGranularity } from './dto/report-query.dto'
import { RiskRegisterQueryDto } from './dto/risk-register-query.dto'
import { FinalAuditReportDto } from './dto/final-audit-report.dto'
import { Decimal } from '@prisma/client/runtime/library'
import {
  Prisma,
  RiskRegisterItem,
  RiskImpact,
  RiskLikelihood,
  RiskSeverity,
  RiskStatus,
} from '@prisma/client'

export type InventorySnapshot = {
  productId: number
  name: string
  stockQuantity: number
  availableQuantity: number
  reservedQuantity: number
  asOf: string
}

export type TopProduct = {
  productId: number
  name: string
  quantitySold: number
  revenue: number
}

export type TrendPoint = {
  period: string
  value: number
  revenue?: number
}

export type DashboardMetrics = {
  revenue: {
    total: number
    currency: string
    orders: number
    averageOrderValue: number
  }
  orders: {
    count: number
    trend: TrendPoint[]
  }
  topProducts: TopProduct[]
  inventory: InventorySnapshot[]
  customerGrowth: {
    totalNewCustomers: number
    trend: TrendPoint[]
  }
  salesTrends: TrendPoint[]
}

export type ExportRows = {
  title: string
  headers: string[]
  rows: Array<string[]>
}

export type RiskRegisterItemSummary = {
  id: number
  title: string
  description?: string | null
  severity: RiskSeverity
  impact: RiskImpact
  likelihood: RiskLikelihood
  classification: RiskStatus
  priority: number
  riskScore: number
  impactNotes: string
  likelihoodNotes: string
  sourceContext?: string | null
  metadata?: Prisma.JsonValue | null
  rootCause?: string | null
  fixSummary?: string | null
  modifiedFiles: string[]
  isTopRisk: boolean
}

export type TopRiskHighlight = {
  id: number
  title: string
  riskScore: number
  classification: RiskStatus
  priority: number
}

export type RiskRegisterResponse = {
  items: RiskRegisterItemSummary[]
  topRiskHighlights: TopRiskHighlight[]
  totalCount: number
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name)
  private readonly defaultGranularity = ReportGranularity.DAILY
  private readonly statuses = ['CONFIRMED', 'SHIPPED', 'FULFILLED']
  private readonly defaultRiskLimit = 25
  private readonly maxRiskLimit = 100
  private readonly topRiskHighlightCount = 3
  private readonly impactNotesMap: Record<RiskImpact, string> = {
    CATASTROPHIC: 'Catastrophic impact will halt critical services and demand an immediate fix.',
    MAJOR: 'Major impact risks degrading key customer journeys and merit priority reviews.',
    MODERATE: 'Moderate impact risks may cause measurable friction but can be contained.',
    MINOR: 'Minor impact risks are localized; regular observation is sufficient.',
    NEGLIGIBLE: 'Negligible impact risks are low priority and are often informational.',
  }
  private readonly likelihoodNotesMap: Record<RiskLikelihood, string> = {
    CERTAIN: 'Certain: the failure has already been observed and confirmed.',
    LIKELY: 'Likely: high probability of occurrence during upcoming releases.',
    POSSIBLE: 'Possible: could materialize without ongoing mitigation.',
    UNLIKELY: 'Unlikely: limited evidence for the event but keep monitoring.',
    RARE: 'Rare: extremely infrequent but document outcomes if triggered.',
  }

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: ReportQueryDto): Promise<DashboardMetrics> {
    const { start, end } = this.normalizeRange(query)
    const granularity = query.granularity ?? this.defaultGranularity

    const [revenueRow, trendRows, topProducts, inventory, growthRows] = await Promise.all([
      this.fetchRevenueSummary(start, end),
      this.fetchTrends(start, end, granularity),
      this.fetchTopProducts(start, end),
      this.fetchInventorySnapshots(),
      this.fetchCustomerGrowth(start, end, granularity),
    ])

    const revenue = revenueRow.totalRevenue
    const orders = revenueRow.orderCount
    const averageOrderValue = orders > 0 ? this.round(revenue / orders) : 0

    return {
      revenue: {
        total: revenue,
        currency: revenueRow.currency,
        orders,
        averageOrderValue,
      },
      orders: {
        count: orders,
        trend: trendRows,
      },
      topProducts,
      inventory,
      customerGrowth: {
        totalNewCustomers: growthRows.reduce((sum, entry) => sum + entry.value, 0),
        trend: growthRows,
      },
      salesTrends: trendRows,
    }
  }

  async loadExportRows(query: ReportQueryDto & { reportType: DashboardReportType }): Promise<ExportRows> {
    const { start, end } = this.normalizeRange(query)
    switch (query.reportType) {
      case DashboardReportType.REVENUE:
        return this.buildRevenueExport(start, end)
      case DashboardReportType.ORDERS:
        return this.buildOrderExport(start, end)
      case DashboardReportType.TOP_PRODUCTS:
        return this.buildTopProductsExport(start, end)
      case DashboardReportType.INVENTORY:
        return this.buildInventoryExport()
      case DashboardReportType.CUSTOMER_GROWTH:
        return this.buildCustomerGrowthExport(start, end, query.granularity ?? this.defaultGranularity)
      case DashboardReportType.SALES_TRENDS:
        return this.buildSalesTrendsExport(start, end, query.granularity ?? this.defaultGranularity)
    }
  }

  async getFinalAuditReport(): Promise<FinalAuditReportDto> {
    return {
      architectureSummary: {
        overview:
          'Monorepo-style ecommerce platform pairing a NestJS backend with a Vite + React storefront and Prisma-managed Postgres data access.',
        infrastructure: [
          'Backend organized by domain modules for auth, catalog, cart, checkout, orders, payments, customer profile, notifications, promotions, reporting, and admin workflows.',
          'Prisma schema and migrations capture relational models for users, products, carts, payments, orders, saved preferences, and reporting aggregates.',
          'Frontend mirrors backend domains with pages, shared components, context providers, and route-level tests to validate flows.',
        ],
        keyDecisions: [
          'Retain NestJS for the API layer to keep domain services testable while reusing the DI container for shared infrastructure.',
          'Use Prisma as the single source of truth for schema and migrations to keep data modeling aligned across services.',
          'Surface context-driven auth and checkout state on the frontend so cross-page flows remain centralized.',
        ],
      },
      reviewedScope: {
        domains: [
          'auth',
          'catalog',
          'cart',
          'checkout',
          'orders',
          'payments',
          'customer-profile',
          'notifications',
          'promotions',
          'reporting',
          'admin',
        ],
        timeframe: 'Rolling 30-day window by default, adjustable via report query parameters.',
        focusAreas: [
          'Dashboard metrics (revenue, orders, top products, inventory, customer growth, sales trends)',
          'Risk register filters and highlights',
          'Exports and audit-ready artifacts used by admin reporting workflows',
        ],
      },
      findingsApplicability: {
        summary:
          'Findings from dashboard analytics and the risk register map to the areas under review, enabling the UI to surface applicable audit narratives.',
        applicabilityNotes: [
          {
            area: 'Reporting dashboards',
            applicability: 'Revenues, orders, inventories, and growth trends support executive summary narratives and expose anomalies.',
          },
          {
            area: 'Risk register',
            applicability: 'Highlights top risks with severity, impact, likelihood, and classification aligning with audit findings.',
          },
          {
            area: 'Exports & reporting exports',
            applicability: 'CSV, Excel, and PDF exports provide artefacts for downstream auditors and stakeholders to validate reported numbers.',
          },
        ],
      },
    }
  }

  async getRiskRegister(query: RiskRegisterQueryDto): Promise<RiskRegisterResponse> {
    const where = this.buildWhereForRiskQuery(query)
    const requestedLimit = query.limit ?? this.defaultRiskLimit
    const limit = Math.min(Math.max(requestedLimit, 1), this.maxRiskLimit)
    const skip = Math.max(query.offset ?? 0, 0)

    const [items, totalCount, topRisks] = await Promise.all([
      this.prisma.riskRegisterItem.findMany({
        where,
        orderBy: [
          { riskScore: 'desc' },
          { priority: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: limit,
        skip,
      }),
      this.prisma.riskRegisterItem.count({ where }),
      this.prisma.riskRegisterItem.findMany({
        where,
        orderBy: [
          { riskScore: 'desc' },
          { priority: 'desc' },
          { updatedAt: 'desc' },
        ],
        take: this.topRiskHighlightCount,
      }),
    ])

    const topRiskIds = new Set(topRisks.map((r) => r.id))
    const mappedItems = items.map((item) => this.mapRiskItem(item, topRiskIds.has(item.id)))
    const topRiskHighlights: TopRiskHighlight[] = topRisks.map((r) => ({
      id: r.id,
      title: r.title,
      riskScore: this.round(Number(r.riskScore ?? 0)),
      classification: r.status,
      priority: r.priority,
    }))

    return {
      items: mappedItems,
      topRiskHighlights,
      totalCount,
    }
  }

  private mapRiskItem(item: RiskRegisterItem, isTopRisk: boolean): RiskRegisterItemSummary {
    return {
      id: item.id,
      title: item.title,
      description: item.description ?? null,
      severity: item.severity,
      impact: item.impact,
      likelihood: item.likelihood,
      classification: item.status,
      priority: item.priority,
      riskScore: this.round(Number(item.riskScore ?? 0)),
      impactNotes: this.impactNotesMap[item.impact] ?? 'Impact detail unavailable.',
      likelihoodNotes: this.likelihoodNotesMap[item.likelihood] ?? 'Likelihood detail unavailable.',
      sourceContext: item.sourceContext ?? null,
      metadata: item.metadata ?? null,
      rootCause: item.rootCause ?? null,
      fixSummary: item.fixSummary ?? null,
      modifiedFiles: Array.isArray(item.modifiedFiles) ? item.modifiedFiles : [],
      isTopRisk,
    }
  }

  private buildWhereForRiskQuery(query: RiskRegisterQueryDto): Prisma.RiskRegisterItemWhereInput {
    const where: Prisma.RiskRegisterItemWhereInput = {}
    if (query.status) {
      where.status = query.status
    }
    if (query.severity) {
      where.severity = query.severity
    }
    if (query.likelihood) {
      where.likelihood = query.likelihood
    }
    if (typeof query.minRiskScore === 'number') {
      where.riskScore = { gte: query.minRiskScore }
    }
    return where
  }

  private normalizeRange(query: ReportQueryDto): { start: Date; end: Date } {
    const end = query.endDate ? new Date(query.endDate) : new Date()
    const startFrom = query.startDate ? new Date(query.startDate) : new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30)
    if (startFrom > end) {
      return { start: end, end: startFrom }
    }
    return { start: startFrom, end }
  }

  private dateTrunc(granularity: ReportGranularity): 'day' | 'week' | 'month' {
    switch (granularity) {
      case ReportGranularity.WEEKLY:
        return 'week'
      case ReportGranularity.MONTHLY:
        return 'month'
      case ReportGranularity.DAILY:
      default:
        return 'day'
    }
  }

  private round(value: number) {
    return Number(value.toFixed(2))
  }
}
