import { Module } from '@nestjs/common'
import { CustomerProfileController } from './customer-profile.controller'
import { CustomerProfileService } from './customer-profile.service'
import { PrismaModule } from '../prisma/prisma.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [CustomerProfileService],
  controllers: [CustomerProfileController],
})
export class CustomerProfileModule {}
