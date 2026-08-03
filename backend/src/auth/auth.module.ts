import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { NotificationModule } from '../notifications/notification.module'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'change-this-secret',
        signOptions: {
          expiresIn: configService.get<string | number>('JWT_EXPIRATION') ?? '7d',
        },
      }),
    }),
  ],
  providers: [AuthService, JwtAuthGuard],
  controllers: [AuthController],
})
export class AuthModule {}
