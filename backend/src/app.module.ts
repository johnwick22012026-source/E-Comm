import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { NotificationModule } from './notifications/notification.module'
import { CatalogModule } from './catalog/catalog.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
    }),
    PrismaModule,
    NotificationModule,
    AuthModule,
    CatalogModule,
  ],
})
export class AppModule {}
