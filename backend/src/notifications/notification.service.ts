import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/verify-email?token=${token}`
    // Replace this with a real email provider integration (SendGrid, SES, etc.)
    this.logger.log(`Sending verification email to ${email}: ${verificationUrl}`)
  }
}
