import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PAYMENT_PROVIDER_TOKEN } from './constants'
import { DummyPaymentProvider } from './strategies/dummy-payment.provider'

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: DummyPaymentProvider,
    },
  ],
})
export class PaymentsModule {}
