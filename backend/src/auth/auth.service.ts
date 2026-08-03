import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { VerifyDto } from './dto/verify.dto'
import { NotificationService } from '../notifications/notification.service'
import * as bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'
import { Response } from 'express'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthService {
  private readonly sessionDurationMs: number
  private readonly jwtCookieName = 'auth_token'

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {
    const envValue = this.config.get<string>('SESSION_DURATION_MS')
    const parsedValue = envValue ? Number.parseInt(envValue, 10) : NaN
    const duration = Number.isFinite(parsedValue) ? parsedValue : 7 * 24 * 60 * 60 * 1000
    this.sessionDurationMs = duration
  }

  async register(body: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
      },
    })

    const verificationToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await this.prisma.emailVerificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    })

    await this.notificationService.sendVerificationEmail(user.email, verificationToken)

    return { message: 'Registration successful. Please verify your email.' }
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!verification) {
      throw new NotFoundException('Invalid verification token')
    }

    if (verification.usedAt) {
      throw new BadRequestException('Token has already been used')
    }

    if (verification.expiresAt < new Date()) {
      throw new BadRequestException('Verification token expired')
    }

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
    ])

    return { message: 'Email verified successfully' }
  }

  async login(body: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email has not been verified')
    }

    const passwordValid = await bcrypt.compare(body.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const sessionToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.sessionDurationMs)

    const session = await this.prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expiresAt,
      },
    })

    const token = this.jwtService.sign({ sub: user.id, sessionToken })

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      },
      token,
      session,
    }
  }

  attachCookie(res: Response, token: string) {
    const secure = this.config.get<string>('NODE_ENV') === 'production'
    res.cookie(this.jwtCookieName, token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: this.sessionDurationMs,
      path: '/',
    })
  }

  clearCookie(res: Response) {
    const secure = this.config.get<string>('NODE_ENV') === 'production'
    res.clearCookie(this.jwtCookieName, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
    })
  }

  async logout(payload: { sessionToken: string; sub: number | string }) {
    if (!payload || !payload.sessionToken) {
      throw new UnauthorizedException()
    }

    const updated = await this.prisma.session.updateMany({
      where: { sessionToken: payload.sessionToken, active: true },
      data: { active: false },
    })

    if (updated.count === 0) {
      throw new BadRequestException('Session already invalidated')
    }

    return { message: 'Logged out' }
  }
}
