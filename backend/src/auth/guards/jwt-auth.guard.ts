import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { Request } from 'express'

interface AuthenticatedRequest extends Request {
  user?: {
    sub: number
    sessionToken: string
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly cookieName = 'auth_token'

  constructor(private readonly jwtService: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = request.cookies?.[this.cookieName]
    if (!token) {
      throw new UnauthorizedException('Authentication cookie missing')
    }

    const payload = await this.jwtService.verifyAsync<{ sub: number; sessionToken: string }>(token, {
      ignoreExpiration: false,
    })

    const session = await this.prisma.session.findUnique({ where: { sessionToken: payload.sessionToken } })
    if (!session || !session.active || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session invalid or expired')
    }

    request.user = { sub: payload.sub, sessionToken: payload.sessionToken }
    return true
  }
}
