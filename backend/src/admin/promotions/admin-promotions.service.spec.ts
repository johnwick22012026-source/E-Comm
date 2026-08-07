import { BadRequestException } from '@nestjs/common'
import { CouponDiscountType } from '@prisma/client'
import { AdminPromotionsService } from './admin-promotions.service'

describe('AdminPromotionsService', () => {
  let service: AdminPromotionsService
  let prismaMock: any

  beforeEach(() => {
    prismaMock = {
      promotion: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaMock)),
    }

    service = new AdminPromotionsService(prismaMock)
  })

  it('throws when promotion expires before it starts', async () => {
    await expect(
      service.createPromotion({
        name: 'Bad window',
        discountType: CouponDiscountType.FIXED,
        discountValue: 10,
        startsAt: '2025-02-02T00:00:00Z',
        expiresAt: '2025-02-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('throws when usage limit is negative', async () => {
    await expect(
      service.createPromotion({
        name: 'Negative usage',
        discountType: CouponDiscountType.FIXED,
        discountValue: 5,
        usageLimit: -1,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('throws when coupon minimum purchase amount is negative', async () => {
    await expect(
      service.createCoupon({
        code: 'SAVE10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        minPurchaseAmount: -50,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('throws when coupon window is outside referenced promotion window', async () => {
    prismaMock.promotion.findUnique.mockResolvedValue({
      id: 101,
      startsAt: new Date('2025-01-01T00:00:00Z'),
      expiresAt: new Date('2025-12-31T00:00:00Z'),
    })

    await expect(
      service.createCoupon({
        code: 'PROMOWINDOW',
        discountType: CouponDiscountType.FIXED,
        discountValue: 5,
        promotionId: 101,
        startsAt: '2024-12-31T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException)

    expect(prismaMock.coupon.create).not.toHaveBeenCalled()
  })
})
