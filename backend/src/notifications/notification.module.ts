import { Module } from '@nestjs/common'
import { NotificationService } from './notification.service'
import { LoggingEmailProvider } from './providers/logging-email.provider'
import { NotificationEventLogService } from './notification-event-log.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [NotificationService, LoggingEmailProvider, NotificationEventLogService],
  exports: [NotificationService, NotificationEventLogService],
})
export class NotificationModule {}
