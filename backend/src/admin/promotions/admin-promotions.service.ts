import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Coupon, CouponDiscountType, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCouponDto } from './dto/create-coupon.dto'
import { CreatePromotionDto } from './dto/create-promotion.dto'
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto'
import { ListPromotionsQueryDto } from './dto/list-promotions-query.dto'
import { UpdateCouponDto } from './dto/update-coupon.dto'
import { UpdatePromotionDto } from './dto/update-promotion.dto'

@Injectable()
export class AdminPromotionsService {
  private readonly defaultLimit = 25
  private readonly maxLimit = 100

  constructor(private readonly prisma: PrismaService) {}

  async listPromotions(query: ListPromotionsQueryDto) {
    const { limit, page } = this.normalizePagination(query)
    const where: Prisma.PromotionWhereInput = {}

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive
    }

    this.applyDateFilters(where, 'startsAt', query.startsAfter, query.startsBefore)
    this.applyDateFilters(where, 'expiresAt', query.expiresAfter, query.expiresBefore)

    const skip = (page - 1) * limit

    const [total, items] = await this.prisma.$transaction([
      this.prisma.promotion.count({ where }),
      this.prisma.promotion.findMany({
        where,
        orderBy: { startsAt: 'desc' },
        take: limit,
        skip,
        include: { coupons: true },
      }),
    ])

    return {
      items,
      meta: {
        total,
        page,
        limit,
      },
    }
  }

  async getPromotion(id: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: { coupons: true },
    })

    if (!promotion) {
      throw new NotFoundException('Promotion not found.')
    }

    return promotion
  }

  async createPromotion(dto: CreatePromotionDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined

    this.validateTimeRange('Promotion', startsAt, expiresAt)
    this.ensureNonNegative(dto.minPurchaseAmount, 'Promotion minimum purchase amount')
    this.ensureNonNegative(dto.usageLimit, 'Promotion usage limit')
    this.ensureDiscount(dto.discountValue)

    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minPurchaseAmount: dto.minPurchaseAmount ?? 0,
        usageLimit: dto.usageLimit,
        usageCount: 0,
        startsAt,
        expiresAt,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata,
      },
    })
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto) {
    const existing = await this.ensurePromotionExists(id)

    const candidateStart = dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : existing.startsAt
    const candidateExpires = dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : existing.expiresAt

    this.validateTimeRange('Promotion', candidateStart ?? undefined, candidateExpires ?? undefined)

    if (dto.minPurchaseAmount !== undefined) {
      this.ensureNonNegative(dto.minPurchaseAmount, 'Promotion minimum purchase amount')
    }

    if (dto.usageLimit !== undefined) {
      this.ensureNonNegative(dto.usageLimit, 'Promotion usage limit')
    }

    if (dto.discountValue !== undefined) {
      this.ensureDiscount(dto.discountValue)
    }

    const updatePayload: Prisma.PromotionUpdateInput = {
      name: dto.name,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minPurchaseAmount: dto.minPurchaseAmount,
      usageLimit: dto.usageLimit,
      ...(dto.startsAt !== undefined && { startsAt: candidateStart }),
      ...(dto.expiresAt !== undefined && { expiresAt: candidateExpires }),
      isActive: dto.isActive,
      metadata: dto.metadata,
      updatedAt: new Date(),
    }

    return this.prisma.promotion.update({
      where: { id },
      data: updatePayload,
    })
  }

  async changePromotionStatus(id: number, isActive: boolean) {
    await this.ensurePromotionExists(id)

    return this.prisma.promotion.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
    })
  }

  async listCoupons(query: ListCouponsQueryDto) {
    const { limit, page } = this.normalizePagination(query)
    const where: Prisma.CouponWhereInput = {}

    if (query.code) {
      where.code = { contains: query.code, mode: 'insensitive' }
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive
    }

    if (query.promotionId) {
      where.promotionId = query.promotionId
    }

    const skip = (page - 1) * limit

    const [total, items] = await this.prisma.$transaction([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { promotion: true },
      }),
    ])

    return {
      items,
      meta: {
        total,
        page,
        limit,
      },
    }
  }

  async getCoupon(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { promotion: true },
    })

    if (!coupon) {
      throw new NotFoundException('Coupon not found.')
    }

    return coupon
  }

  async createCoupon(dto: CreateCouponDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined

    this.validateTimeRange('Coupon', startsAt, expiresAt)
    this.ensureNonNegative(dto.minPurchaseAmount, 'Coupon minimum purchase amount')
    this.ensureNonNegative(dto.usageLimit, 'Coupon usage limit')
    this.ensureDiscount(dto.discountValue)

    const promotion = await this.resolveCouponPromotion(dto.promotionId)
    this.ensureCouponFitsPromotion({ startsAt, expiresAt }, promotion)

    return this.prisma.coupon.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minPurchaseAmount: dto.minPurchaseAmount ?? 0,
        usageLimit: dto.usageLimit,
        usageCount: 0,
        startsAt,
        expiresAt,
        isActive: dto.isActive ?? true,
        promotionId: dto.promotionId,
        metadata: dto.metadata,
      },
    })
  }

  async updateCoupon(id: number, dto: UpdateCouponDto) {
    const existing = await this.ensureCouponExists(id)

    const candidateStart = dto.startsAt !== undefined ? (dto.startsAt ? new Date(dto.startsAt) : null) : existing.startsAt
    const candidateExpires = dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : existing.expiresAt

    this.validateTimeRange('Coupon', candidateStart ?? undefined, candidateExpires ?? undefined)

    if (dto.minPurchaseAmount !== undefined) {
      this.ensureNonNegative(dto.minPurchaseAmount, 'Coupon minimum purchase amount')
    }

    if (dto.usageLimit !== undefined) {
      this.ensureNonNegative(dto.usageLimit, 'Coupon usage limit')
    }

    if (dto.discountValue !== undefined) {
      this.ensureDiscount(dto.discountValue)
    }

    const finalPromotionId = dto.promotionId !== undefined ? dto.promotionId : existing.promotionId
    const promotion = await this.resolveCouponPromotion(finalPromotionId)
    this.ensureCouponFitsPromotion({ startsAt: candidateStart ?? undefined, expiresAt: candidateExpires ?? undefined }, promotion)

    const updatePayload: Prisma.CouponUpdateInput = {
      code: dto.code ? dto.code.trim().toUpperCase() : undefined,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minPurchaseAmount: dto.minPurchaseAmount,
      usageLimit: dto.usageLimit,
      ...(dto.startsAt !== undefined && { startsAt: candidateStart }),
      ...(dto.expiresAt !== undefined && { expiresAt: candidateExpires }),
      isActive: dto.isActive,
      ...(dto.promotionId !== undefined && { promotionId: finalPromotionId }),
      metadata: dto.metadata,
      updatedAt: new Date(),
    }

    return this.prisma.coupon.update({
      where: { id },
      data: updatePayload,
    })
  }

  async changeCouponStatus(id: number, isActive: boolean) {
    await this.ensureCouponExists(id)

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive, updatedAt: new Date() },
    })
  }

  private normalizePagination(query: Pick<ListPromotionsQueryDto, 'page' | 'limit'> | Pick<ListCouponsQueryDto, 'page' | 'limit'>) {
    const page = query.page && query.page > 0 ? query.page : 1
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, this.maxLimit) : this.defaultLimit
    return { page, limit }
  }

  private applyDateFilters(where: Prisma.PromotionWhereInput, field: 'startsAt' | 'expiresAt', after?: string, before?: string) {
    const hasAfter = Boolean(after)
    const hasBefore = Boolean(before)

    if (!hasAfter && !hasBefore) {
      return
    }

    const filter: Prisma.DateTimeFilter = {}

    if (after) {
      filter.gte = new Date(after)
    }

    if (before) {
      filter.lte = new Date(before)
    }

    where[field] = filter
  }

  private validateTimeRange(label: string, startsAt?: Date, expiresAt?: Date) {
    if (startsAt && expiresAt && startsAt > expiresAt) {
      throw new BadRequestException(`${label} start date must be before expiration date.`)
    }
  }

  private ensureNonNegative(value: number | undefined, label: string) {
    if (value !== undefined && value < 0) {
      throw new BadRequestException(`${label} cannot be negative.`)
    }
  }

  private ensureDiscount(value: number) {
    if (value <= 0) {
      throw new BadRequestException('Discount value must be greater than zero.')
    }
  }

  private async ensurePromotionExists(id: number) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } })
    if (!promotion) {
      throw new NotFoundException('Promotion not found.')
    }
    return promotion
  }

  private async ensureCouponExists(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } })
    if (!coupon) {
      throw new NotFoundException('Coupon not found.')
    }
    return coupon
  }

  private async resolveCouponPromotion(promotionId?: number | null) {
    if (promotionId === undefined || promotionId === null) {
      return undefined
    }

    const promotion = await this.prisma.promotion.findUnique({ where: { id: promotionId } })

    if (!promotion) {
      throw new NotFoundException('Referenced promotion not found.')
    }

    return promotion
  }

  private ensureCouponFitsPromotion(window: { startsAt?: Date; expiresAt?: Date }, promotion?: { startsAt?: Date | null; expiresAt?: Date | null }) {
    if (!promotion) {
      return
    }

    if (window.startsAt && promotion.startsAt && window.startsAt < promotion.startsAt) {
      throw new BadRequestException('Coupon start date cannot be earlier than its promotion start date.')
    }

    if (window.expiresAt && promotion.expiresAt && window.expiresAt > promotion.expiresAt) {
      throw new BadRequestException('Coupon expiration date cannot be later than its promotion expiration date.')
    }
  }
}
