import { Module } from '@nestjs/common'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { PrismaModule } from '../prisma/prisma.module'
import { CartPricingController } from './cart-pricing.controller'
import { CartPricingService } from './cart-pricing.service'

@Module({
  imports: [PrismaModule],
  controllers: [CartController, CartPricingController],
  providers: [CartService, CartPricingService],
  exports: [CartPricingService],
})
export class CartModule {}
