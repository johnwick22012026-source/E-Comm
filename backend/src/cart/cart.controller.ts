import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CartService, CartMutationResult } from './cart.service'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'

interface AuthenticatedRequest extends Request {
  user?: {
    sub: number | string
  }
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Patch('items/:id')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  )
  async updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCartItemDto,
  ): Promise<CartMutationResult> {
    return this.cartService.updateCartItemQuantity(this.extractUserId(req), id, body.quantity)
  }

  @Delete('items/:id')
  async removeItem(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number): Promise<CartMutationResult> {
    return this.cartService.removeCartItem(this.extractUserId(req), id)
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
