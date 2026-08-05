import { Module } from '@nestjs/common'
import { ReportingController } from './reporting.controller'
import { ReportingService } from './reporting.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { AdminGuard } from '../admin/guards/admin.guard'

@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [ReportingController],
  providers: [ReportingService, AdminGuard],
})
export class ReportingModule {}
