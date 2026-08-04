import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { PrismaModule } from '../prisma/prisma.module'
import { PAYMENT_PROVIDER_TOKEN } from './constants'
import { DummyPaymentProvider } from './strategies/dummy-payment.provider'
import { SavedPaymentPreferenceController } from './saved-payment-preference/saved-payment-preference.controller'
import { SavedPaymentPreferenceService } from './saved-payment-preference/saved-payment-preference.service'

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, SavedPaymentPreferenceController],
  providers: [
    PaymentsService,
    SavedPaymentPreferenceService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: DummyPaymentProvider,
    },
  ],
  exports: [SavedPaymentPreferenceService],
})
export class PaymentsModule {}
