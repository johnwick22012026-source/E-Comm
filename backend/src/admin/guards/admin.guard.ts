import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'

interface AuthenticatedRequest {
  user?: {
    sub: number
    sessionToken: string
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminUserIds: Set<number>

  constructor(private readonly jwtAuthGuard: JwtAuthGuard, private readonly configService: ConfigService) {
    const rawList = this.configService.get<string>('ADMIN_USER_IDS') ?? ''
    const parsed = rawList
      .split(',')
      .map((token) => Number.parseInt(token.trim(), 10))
      .filter((id) => Number.isInteger(id) && id > 0)
    this.adminUserIds = new Set(parsed)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const jwtCanActivate = await this.jwtAuthGuard.canActivate(context)

    if (!jwtCanActivate) {
      return false
    }

    if (!this.adminUserIds.size) {
      throw new ForbiddenException('No admin users are configured')
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const userId = request.user?.sub

    if (!userId || !this.adminUserIds.has(userId)) {
      throw new ForbiddenException('Admin privileges are required to access this resource.')
    }

    return true
  }
}
