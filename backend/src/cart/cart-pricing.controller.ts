import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CartPricingService } from './cart-pricing.service'
import { CartPricingRequestDto } from './dto/cart-pricing-request.dto'

interface AuthenticatedRequest extends Request {
  user?: { sub: number | string }
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartPricingController {
  constructor(private readonly pricingService: CartPricingService) {}

  @Post('pricing')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async estimate(@Req() req: AuthenticatedRequest, @Body() body: CartPricingRequestDto) {
    const userId = this.extractUserId(req)
    return this.pricingService.estimatePricing(userId, body)
  }

  private extractUserId(req: AuthenticatedRequest): number {
    const sub = req.user?.sub
    if (sub === undefined || sub === null) {
      throw new UnauthorizedException('Authenticated user not found')
    }
    const parsed = typeof sub === 'number' ? sub : Number.parseInt(String(sub), 10)
    if (Number.isNaN(parsed)) {
      throw new UnauthorizedException('Invalid authenticated user')
    }
    return parsed
  }
}
