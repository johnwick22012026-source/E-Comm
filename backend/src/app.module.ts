import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { CartModule } from './cart/cart.module'
import { CatalogModule } from './catalog/catalog.module'
import { CheckoutModule } from './checkout/checkout.module'
import { CustomerProfileModule } from './customer-profile/customer-profile.module'
import { NotificationModule } from './notifications/notification.module'
import { OrdersModule } from './orders/orders.module'
import { PaymentsModule } from './payments/payments.module'
import { PrismaModule } from './prisma/prisma.module'
import { AdminCatalogModule } from './admin/catalog/admin-catalog.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    NotificationModule,
    CartModule,
    CatalogModule,
    CheckoutModule,
    CustomerProfileModule,
    OrdersModule,
    PaymentsModule,
    AdminCatalogModule,
  ],
})
export class AppModule {}
