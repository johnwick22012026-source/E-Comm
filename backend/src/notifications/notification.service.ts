import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name)

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/verify-email?token=${token}`
    const message = `Please verify your email by visiting: ${verificationUrl}`
    // Replace this with a real email provider integration (SendGrid, SES, etc.)
    this.logger.log(`Sending verification email to ${email}. ${message}`)
    return { email, verificationUrl }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/auth/reset-password?token=${token}`
    const message = `You can reset your password by visiting: ${resetUrl}`
    // Replace the below log with integration to your email provider and include resetUrl in the message body.
    this.logger.log(`Sending password reset email to ${email}. ${message}`)
    return { email, resetUrl }
  }
}
