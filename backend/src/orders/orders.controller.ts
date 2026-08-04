import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrdersService, OrderCreationSummary } from './orders.service'
import { CreateOrderFromPaymentDto } from './dto/create-order-from-payment.dto'
import { OrderDetailResponseDto } from './dto/order-response.dto'
import { ListOrdersQueryDto } from './dto/order-query.dto'
import { Request } from 'express'

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

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOrders(
    @Req() request: Request,
    @Query(new ValidationPipe({ transform: true })) query: ListOrdersQueryDto,
  ) {
    const userId = (request.user as { id?: number } | undefined)?.id
    return this.ordersService.listOrdersForCustomer(userId, query)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrderDetail(
    @Req() request: Request,
    @Param('id', ParseIntPipe) orderId: number,
  ): Promise<OrderDetailResponseDto> {
    const userId = (request.user as { id?: number } | undefined)?.id
    return this.ordersService.getOrderDetailForCustomer(userId, orderId)
  }
}
