import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CheckoutService } from './checkout.service'
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto'
import { CustomerDetailsDto } from './dto/customer-details.dto'
import { ShippingAddressDto } from './dto/shipping-address.dto'
import { SelectShippingMethodDto } from './dto/select-shipping-method.dto'

interface AuthenticatedRequest extends Request {
  user?: { sub: number | string }
}

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('sessions')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createSession(@Req() req: AuthenticatedRequest, @Body() body: CreateCheckoutSessionDto) {
    const userId = this.extractUserId(req)
    return this.checkoutService.createSession(userId, { referenceId: body.referenceId })
  }

  @Patch('sessions/:token/customer')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async saveCustomerDetails(
    @Req() req: AuthenticatedRequest,
    @Param('token') token: string,
    @Body() body: CustomerDetailsDto,
  ) {
    const userId = this.extractUserId(req)
    await this.checkoutService.saveCustomerDetails(token, userId, body)
    return { message: 'Customer details saved' }
  }

  @Patch('sessions/:token/address')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async saveShippingAddress(
    @Req() req: AuthenticatedRequest,
    @Param('token') token: string,
    @Body() body: ShippingAddressDto,
  ) {
    const userId = this.extractUserId(req)
    await this.checkoutService.saveShippingAddress(token, userId, body)
    return { message: 'Shipping address saved' }
  }

  @Get('sessions/:token/shipping-methods')
  async getShippingMethods(@Req() req: AuthenticatedRequest, @Param('token') token: string) {
    const userId = this.extractUserId(req)
    return this.checkoutService.fetchShippingMethods(token, userId)
  }

  @Post('sessions/:token/shipping-methods')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async setShippingMethod(
    @Req() req: AuthenticatedRequest,
    @Param('token') token: string,
    @Body() body: SelectShippingMethodDto,
  ) {
    const userId = this.extractUserId(req)
    await this.checkoutService.selectShippingMethod(token, userId, body)
    return { message: 'Shipping method stored' }
  }

  @Get('sessions/:token/review')
  async review(@Req() req: AuthenticatedRequest, @Param('token') token: string) {
    const userId = this.extractUserId(req)
    return this.checkoutService.reviewSession(token, userId)
  }

  private extractUserId(req: AuthenticatedRequest): number {
    const userId = req.user?.sub
    if (userId === undefined || userId === null) {
      throw new Error('Authenticated user missing')
    }
    return typeof userId === 'number' ? userId : Number.parseInt(String(userId), 10)
  }
}
