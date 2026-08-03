import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  Get,
  HttpCode,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { VerifyDto } from './dto/verify.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const result = await this.authService.register(body)
    return result
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: VerifyDto) {
    return this.authService.verifyEmail(body.token)
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(body)
    this.authService.attachCookie(res, token)
    return { user, message: 'Authenticated' }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user)
    this.authService.clearCookie(res)
    return { message: 'Signed out successfully' }
  }
}
