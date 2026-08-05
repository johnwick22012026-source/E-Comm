import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { Response } from 'express'
import { Readable } from 'stream'
import { ReportingService } from './reporting.service'
import { ReportQueryDto, ExportReportQueryDto, DashboardReportType, ReportExportFormat } from './dto/report-query.dto'
import { AdminGuard } from '../admin/guards/admin.guard'

@Controller('admin/reporting')
@UseGuards(AdminGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async dashboard(@Query() query: ReportQueryDto) {
    return this.reportingService.getDashboard(query)
  }

  @Get('exports')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async export(
    @Query() query: ExportReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const rows = await this.reportingService.loadExportRows(query)
    const fileName = this.buildFileName(query.reportType, query.format)
    const contentType = this.contentTypeForFormat(query.format)

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    switch (query.format) {
      case ReportExportFormat.CSV:
        return new StreamableFile(this.createCsvStream(rows.headers, rows.rows))
      case ReportExportFormat.EXCEL:
        return new StreamableFile(await this.createExcelStream(rows))
      case ReportExportFormat.PDF:
        return new StreamableFile(await this.createPdfBuffer(rows))
    }
  }

  private buildFileName(reportType: DashboardReportType, format: ReportExportFormat) {
    const timestamp = new Date().toISOString().replace(/[:-]/g, '').replace(/\..+$/, '')
    return `${reportType}-${timestamp}.${format === ReportExportFormat.EXCEL ? 'xlsx' : format}`
  }

  private contentTypeForFormat(format: ReportExportFormat) {
    switch (format) {
      case ReportExportFormat.CSV:
        return 'text/csv'
      case ReportExportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case ReportExportFormat.PDF:
        return 'application/pdf'
    }
  }

  private createCsvStream(headers: string[], rows: string[][]) {
    const generator = (function* () {
      yield headers.map((value) => ReportingController.escapeCsv(value)).join(',') + '\n'
      for (const row of rows) {
        yield row.map((value) => ReportingController.escapeCsv(value)).join(',') + '\n'
      }
    })()
    return Readable.from(generator)
  }

  private static escapeCsv(value: string) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private async createExcelStream(rows: ReturnType<ReportingService['loadExportRows']>) {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()
    const data = [rows.headers, ...rows.rows]
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
    const buffer: Buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)
    return stream
  }

  private async createPdfBuffer(rows: ReturnType<ReportingService['loadExportRows']>) {
    const PDFDocument = (await import('pdfkit')).default as typeof import('pdfkit')
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const buffers: Buffer[] = []
    doc.on('data', (chunk) => buffers.push(chunk))

    doc.fontSize(14).text(rows.title, { align: 'left' })
    doc.moveDown(0.8)
    doc.fontSize(10)

    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const { left: marginLeft, right: marginRight, top: marginTop, bottom: marginBottom } = doc.page.margins
    const usableWidth = pageWidth - marginLeft - marginRight
    const columnCount = rows.headers.length
    const columnWidths = Array(columnCount).fill(usableWidth / columnCount)
    const rowHeight = 20

    let currentY = doc.y

    const renderRow = (row: string[]) => {
      let x = marginLeft
      row.forEach((cell, i) => {
        doc.text(cell, x, currentY, { width: columnWidths[i], lineBreak: false })
        x += columnWidths[i]
      })
      currentY += rowHeight
    }

    const renderTable = () => {
      // Header
      renderRow(rows.headers)
      // Rows
      for (const row of rows.rows) {
        if (currentY + rowHeight > pageHeight - marginBottom) {
          doc.addPage()
          currentY = marginTop
          renderRow(rows.headers)
        }
        renderRow(row)
      }
    }

    renderTable()
    doc.end()
    await new Promise<void>((resolve) => doc.on('end', resolve))
    return Buffer.concat(buffers)
  }
}
