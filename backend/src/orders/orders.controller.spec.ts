import { Test, TestingModule } from '@nestjs/testing'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ExecutionContext } from '@nestjs/common'

const mockOrdersService = {
  listOrdersForCustomer: jest.fn(),
  getOrderDetailForCustomer: jest.fn(),
}

const mockAuthGuard = {
  canActivate: jest.fn((context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest()
    req.user = { id: 1 }
    return true
  }),
}

describe('OrdersController', () => {
  let controller: OrdersController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile()

    controller = module.get<OrdersController>(OrdersController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should list orders for authenticated customer', async () => {
    mockOrdersService.listOrdersForCustomer.mockResolvedValue({
      meta: { total: 1, page: 1, limit: 20 },
      data: [],
    })

    const result = await controller.listOrders({ user: { id: 1 } } as any, { page: 1, limit: 20 })

    expect(result.meta.total).toBe(1)
    expect(mockOrdersService.listOrdersForCustomer).toHaveBeenCalledWith(1, expect.any(Object))
  })

  it('should fetch order detail for authenticated customer', async () => {
    const detail = {
      id: 1,
      referenceId: 'ORD-123',
      status: 'CONFIRMED',
      createdAt: new Date(),
      payment: null,
      lineItems: [],
      shipments: [],
      invoices: [],
      totals: { amount: 0, currency: 'USD' },
      cancellable: true,
    }
    mockOrdersService.getOrderDetailForCustomer.mockResolvedValue(detail)

    const result = await controller.getOrderDetail({ user: { id: 1 } } as any, 1)

    expect(result).toBe(detail)
    expect(mockOrdersService.getOrderDetailForCustomer).toHaveBeenCalledWith(1, 1)
  })
})