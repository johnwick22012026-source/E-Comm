import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { CartModule } from './cart/cart.module'
import { CatalogModule } from './catalog/catalog.module'
import { CheckoutModule } from './checkout/checkout.module'
import { CustomerProfileModule } from './customer-profile/customer-profile.module'
import { NotificationModule } from './notifications/notification.module'
import { OrdersModule } from './orders/orders.module'
import { PaymentsModule } from './payments/payments.module'
import { AdminCatalogModule } from './admin/catalog/admin-catalog.module'
import { AdminPromotionsModule } from './admin/promotions/admin-promotions.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    AuthModule,
    CartModule,
    CatalogModule,
    CheckoutModule,
    CustomerProfileModule,
    NotificationModule,
    OrdersModule,
    PaymentsModule,
    AdminCatalogModule,
    AdminPromotionsModule,
    PrismaModule,
  ],
})
export class AppModule {}
