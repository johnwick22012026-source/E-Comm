import { Body, Controller, Headers, HttpCode, Post, UsePipes, ValidationPipe } from '@nestjs/common'
import { OrdersService, OrderCreationSummary } from './orders.service'
import { CreateOrderFromPaymentDto } from './dto/create-order-from-payment.dto'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('from-payment')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createFromPayment(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreateOrderFromPaymentDto,
  ): Promise<OrderCreationSummary> {
    return this.ordersService.createFromPayment(body, idempotencyKey)
  }
}
