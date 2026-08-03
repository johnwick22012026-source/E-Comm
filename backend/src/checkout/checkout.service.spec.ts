import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CheckoutService } from './checkout.service'
import { CartPricingService } from '../cart/cart-pricing.service'
import { PrismaService } from '../prisma/prisma.service'
import * as crypto from 'crypto'

describe('CheckoutService', () => {
  let prismaMock: any
  let pricingMock: CartPricingService
  let service: CheckoutService

  beforeEach(() => {
    prismaMock = {
      checkoutSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      checkoutShippingAddress: {
        upsert: jest.fn(),
      },
      checkoutSelectedShippingMethod: {
        upsert: jest.fn(),
      },
      checkoutDraftOrderState: {
        upsert: jest.fn(),
      },
    }

    pricingMock = {
      estimatePricing: jest.fn(),
    } as unknown as CartPricingService

    service = new CheckoutService(prismaMock as PrismaService, pricingMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates checkout session and initializes draft state', async () => {
    jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 'a'))
    prismaMock.checkoutSession.create.mockResolvedValue({
      id: 1,
      sessionToken: 'abcd',
      userId: 5,
      status: 'DRAFT',
      createdAt: new Date(),
    })

    await service.createSession(5, { referenceId: 'cart-123' })

    expect(prismaMock.checkoutSession.create).toHaveBeenCalled()
    expect(prismaMock.checkoutDraftOrderState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastCompletedStep: 'session_created' }),
      }),
    )
  })

  it('rejects saving shipping address before customer info', async () => {
    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: 10,
      sessionToken: 'tok',
      userId: 9,
      customerFirstName: null,
      customerEmail: null,
      status: 'DRAFT',
    })

    await expect(
      service.saveShippingAddress('tok', 9, {
        fullName: 'Jane Doe',
        streetLine1: '1 Market St',
        city: 'SF',
        postalCode: '94105',
        country: 'US',
        attention: undefined,
        company: undefined,
      } as any),
    ).rejects.toThrow(BadRequestException)
  })

  it('fails to fetch shipping methods when address is missing', async () => {
    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: 11,
      sessionToken: 'tok2',
      userId: 3,
      customerFirstName: 'Jane',
      customerEmail: 'jane@example.com',
      status: 'DRAFT',
      shippingAddress: null,
    })

    await expect(service.fetchShippingMethods('tok2', 3)).rejects.toThrow(BadRequestException)
  })

  it('rejects selecting a shipping method that does not exist for the provided address', async () => {
    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: 12,
      sessionToken: 'tok3',
      userId: 4,
      customerFirstName: 'Jane',
      customerEmail: 'jane@example.com',
      status: 'DRAFT',
      shippingAddress: {
        country: 'US',
        city: 'Test',
        streetLine1: '123',
        postalCode: '12345',
        fullName: 'Jane',
        state: 'CA',
        phone: null,
        company: null,
        attention: null,
        streetLine2: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        checkoutSessionId: 12,
        id: 22,
      },
    })

    await expect(
      service.selectShippingMethod('tok3', 4, {
        provider: 'Fake Carrier',
        serviceLevel: 'Super Fast',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('returns review payload with pricing totals', async () => {
    const shippingAddress = {
      country: 'US',
      city: 'SF',
      streetLine1: '1 Market',
      postalCode: '94105',
      fullName: 'John',
      state: 'CA',
      phone: '555',
      company: 'Acme',
      attention: null,
      streetLine2: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      checkoutSessionId: 13,
      id: 23,
    }

    const selectedMethod = {
      provider: 'Commerce Logistics',
      serviceLevel: 'Ground',
      optionCode: 'CL_GROUND',
      cost: 7.5,
      currency: 'USD',
      estimatedDeliveryDays: 5,
      checkoutSessionId: 13,
      id: 19,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    prismaMock.checkoutSession.findUnique.mockResolvedValue({
      id: 13,
      sessionToken: 'tok4',
      userId: 7,
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'john@example.com',
      customerPhone: '555-1234',
      status: 'DRAFT',
      shippingAddress,
      selectedShippingMethod: selectedMethod,
    })

    prismaMock.checkoutSession.update.mockResolvedValue({
      id: 13,
      sessionToken: 'tok4',
      userId: 7,
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'john@example.com',
      customerPhone: '555-1234',
      status: 'REVIEW',
      shippingAddress,
      selectedShippingMethod: selectedMethod,
    })

    ;(pricingMock.estimatePricing as jest.Mock).mockResolvedValue({
      subtotal: 100,
      currency: 'USD',
      discountTotal: 0,
      totalAfterDiscount: 100,
      shippingEstimate: { cost: 7.5, currency: 'USD', provider: 'Commerce Logistics', serviceLevel: 'Ground', estimatedDeliveryDays: 5, destination: { country: 'US' } },
      estimatedTotal: 107.5,
      items: [],
    })

    const result = await service.reviewSession('tok4', 7)

    expect(result.totals.subtotal).toBe(100)
    expect(result.shippingAddress).toMatchObject({ city: 'SF' })
    expect(result.shippingMethod).toMatchObject({ serviceLevel: 'Ground' })
    expect(pricingMock.estimatePricing).toHaveBeenCalled()
  })
})
