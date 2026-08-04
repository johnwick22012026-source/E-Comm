import { Test, TestingModule } from '@nestjs/testing'
import { OrdersService } from './orders.service'
import { PrismaService } from '../prisma/prisma.service'
import { OrderStatus, PaymentStatus } from '@prisma/client'

const mockPrismaService = {
  order: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
  },
  paymentAttempt: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  cart: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('OrdersService', () => {
  let service: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<OrdersService>(OrdersService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should throw when user is missing for listing', async () => {
    await expect(service.listOrdersForCustomer(undefined, { page: 1, limit: 20, sortBy: undefined, sortDirection: undefined })).rejects.toThrow()
  })

  it('should throw when user is missing for order detail', async () => {
    await expect(service.getOrderDetailForCustomer(undefined, 1)).rejects.toThrow()
  })
})
