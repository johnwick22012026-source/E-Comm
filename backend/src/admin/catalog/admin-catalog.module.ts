import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AdminCatalogController } from './admin-catalog.controller'
import { AdminCatalogService } from './admin-catalog.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { AuthModule } from '../../auth/auth.module'
import { AdminGuard } from '../guards/admin.guard'
import { CatalogModule } from '../../catalog/catalog.module'

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule, CatalogModule],
  controllers: [AdminCatalogController],
  providers: [AdminCatalogService, AdminGuard],
})
export class AdminCatalogModule {}
