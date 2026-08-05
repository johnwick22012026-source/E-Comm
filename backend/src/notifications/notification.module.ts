import { Module } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { EMAIL_PROVIDER_TOKEN } from './constants'
import { LoggingEmailProvider } from './providers/logging-email.provider'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useClass: LoggingEmailProvider,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
