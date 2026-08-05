import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class NotificationEventLogService {
  private readonly logger = new Logger(NotificationEventLogService.name)

  constructor(private readonly prisma: PrismaService) {}

  async recordEventIfNew(eventId: string, type: string): Promise<boolean> {
    try {
      await this.prisma.notificationEventLog.create({
        data: {
          eventId,
          type,
        },
      })
      return true
    } catch (error) {
      if (error instanceof Error && /unique constraint/.test(error.message)) {
        this.logger.debug(`Skipping duplicate notification event ${eventId}`)
        return false
      }
      throw error
    }
  }
}
