import { Test, TestingModule } from '@nestjs/testing'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { CreateOrderFromPaymentDto, PaymentCaptureStatus } from './dto/create-order-from-payment.dto'

describe('OrdersController', () => {
  let controller: OrdersController
  let service: OrdersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            createFromPayment: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<OrdersController>(OrdersController)
    service = module.get<OrdersService>(OrdersService)
  })

  it('forwards creation to OrdersService', async () => {
    const payload: CreateOrderFromPaymentDto = {
      paymentAttemptId: 1,
      paymentReference: 'pay-ref',
      gatewayReference: 'gw-ref',
      status: PaymentCaptureStatus.CAPTURED,
      amount: 199.99,
      currency: 'USD',
    }
    const summary = {
      id: 1,
      referenceId: 'ORD-123',
      status: 'CONFIRMED',
      paymentReference: 'pay-ref',
      paymentGatewayTransactionId: 'gw-ref',
      paymentStatus: 'CAPTURED',
      amount: 199.99,
      currency: 'USD',
      createdAt: new Date(),
    }
    jest.spyOn(service, 'createFromPayment').mockResolvedValue(summary)

    const result = await controller.createFromPayment('idem-key', payload)

    expect(result).toBe(summary)
    expect(service.createFromPayment).toHaveBeenCalledWith(payload, 'idem-key')
  })
})