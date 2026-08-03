import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { NotificationModule } from './notifications/notification.module'
import { CatalogModule } from './catalog/catalog.module'
import { CartModule } from './cart/cart.module'
import { CheckoutModule } from './checkout/checkout.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),
    PrismaModule,
    NotificationModule,
    AuthModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
  ],
})
export class AppModule {}
