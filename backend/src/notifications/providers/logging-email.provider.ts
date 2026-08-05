import { Injectable, Logger } from '@nestjs/common'
import { EmailProvider, EmailMessage } from '../interfaces/email-provider.interface'

@Injectable()
export class LoggingEmailProvider implements EmailProvider {
  private readonly logger = new Logger(LoggingEmailProvider.name)

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`Delivering email to ${message.to} with subject "${message.subject}"`)
    this.logger.debug(`Email HTML body for ${message.to}: ${message.html}`)
    this.logger.debug(`Email text body for ${message.to}: ${message.text}`)
  }
}
