import { IsDateString, IsEnum, IsOptional } from 'class-validator'

export enum ReportGranularity {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum DashboardReportType {
  REVENUE = 'revenue',
  ORDERS = 'orders',
  TOP_PRODUCTS = 'top_products',
  INVENTORY = 'inventory',
  CUSTOMER_GROWTH = 'customer_growth',
  SALES_TRENDS = 'sales_trends',
}

export enum ReportExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class ReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @IsEnum(ReportGranularity)
  granularity?: ReportGranularity
}

export class ExportReportQueryDto extends ReportQueryDto {
  @IsEnum(DashboardReportType)
  reportType!: DashboardReportType

  @IsEnum(ReportExportFormat)
  format!: ReportExportFormat
}
