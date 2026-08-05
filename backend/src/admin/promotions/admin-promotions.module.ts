import { Module } from '@nestjs/common'
import { AdminPromotionsController } from './admin-promotions.controller'
import { AdminCouponsController } from './admin-coupons.controller'
import { AdminPromotionsService } from './admin-promotions.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [AdminPromotionsController, AdminCouponsController],
  providers: [AdminPromotionsService],
})
export class AdminPromotionsModule {}
