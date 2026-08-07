import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

const mockPaymentsService = {
  authorize: jest.fn(),
}

describe('PaymentsController', () => {
  let controller: PaymentsController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile()

    controller = module.get<PaymentsController>(PaymentsController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('authorizes payment for valid authenticated user', async () => {
    const authorization = { authorizationId: 'auth-123' }
    mockPaymentsService.authorize.mockResolvedValue(authorization)

    const dto = {
      amount: 1000,
      currency: 'USD',
      paymentMethodId: 'pm_123',
    }

    const result = await controller.authorize(
      { user: { sub: '42' } } as any,
      'idem-key',
      dto as any,
    )

    expect(result).toBe(authorization)
    expect(mockPaymentsService.authorize).toHaveBeenCalledWith(42, dto, 'idem-key')
  })

  it('throws BadRequestException when authenticated user missing', async () => {
    await expect(
      controller.authorize({} as any, 'idem-key', {
        amount: 1000,
        currency: 'USD',
        paymentMethodId: 'pm_123',
      } as any),
    ).rejects.toThrow(BadRequestException)
  })

  it('throws BadRequestException when authenticated user id invalid', async () => {
    await expect(
      controller.authorize(
        { user: { sub: 'not-a-number' } } as any,
        'idem-key',
        {
          amount: 1000,
          currency: 'USD',
          paymentMethodId: 'pm_123',
        } as any,
      ),
    ).rejects.toThrow(BadRequestException)
  })
})
