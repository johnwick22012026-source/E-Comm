import { Controller, Post, Body, Patch, HttpCode } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RequestPasswordResetDto } from './dto/request-password-reset.dto'
import { ValidatePasswordResetDto } from './dto/validate-password-reset.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'

@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('request')
  async request(@Body() body: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(body.email)
    return {
      message:
        'If an account exists with that email, password reset instructions will be sent shortly.',
    }
  }

  @HttpCode(200)
  @Post('validate')
  async validate(@Body() body: ValidatePasswordResetDto) {
    await this.authService.validatePasswordResetToken(body.token)
    return { valid: true }
  }

  @HttpCode(200)
  @Patch()
  async reset(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.password)
    return { message: 'Password updated successfully.' }
  }
}
