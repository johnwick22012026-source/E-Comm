import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CustomerProfileService } from './customer-profile.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'
import { CommunicationPreferencesUpdateDto } from './dto/communication-preference-input.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

interface AuthenticatedRequest extends Request {
  user?: { sub: number | string }
}

@Controller('customer-profile')
@UseGuards(JwtAuthGuard)
export class CustomerProfileController {
  constructor(private readonly service: CustomerProfileService) {}

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const profile = await this.service.getProfile(this.extractUserId(req))
    return { profile }
  }

  @Patch('me')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() body: UpdateProfileDto) {
    const profile = await this.service.updateProfile(this.extractUserId(req), body)
    return { profile }
  }

  @Get('addresses')
  async listAddresses(@Req() req: AuthenticatedRequest) {
    return { addresses: await this.service.listAddresses(this.extractUserId(req)) }
  }

  @Post('addresses')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async createAddress(@Req() req: AuthenticatedRequest, @Body() body: CreateAddressDto) {
    const address = await this.service.createAddress(this.extractUserId(req), body)
    return { address }
  }

  @Patch('addresses/:id')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateAddressDto,
  ) {
    const address = await this.service.updateAddress(this.extractUserId(req), Number.parseInt(id, 10), body)
    return { address }
  }

  @Delete('addresses/:id')
  async deleteAddress(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.deleteAddress(this.extractUserId(req), Number.parseInt(id, 10))
  }

  @Get('preferences')
  async listPreferences(@Req() req: AuthenticatedRequest) {
    return { preferences: await this.service.listPreferences(this.extractUserId(req)) }
  }

  @Patch('preferences')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updatePreferences(@Req() req: AuthenticatedRequest, @Body() body: CommunicationPreferencesUpdateDto) {
    return { preferences: await this.service.updatePreferences(this.extractUserId(req), body) }
  }

  @Patch('password')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async changePassword(@Req() req: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    return this.service.changePassword(this.extractUserId(req), body)
  }

  private extractUserId(request: AuthenticatedRequest): number {
    const sub = request.user?.sub
    if (sub === undefined || sub === null) {
      throw new UnauthorizedException('Authenticated user missing')
    }
    const parsed = typeof sub === 'number' ? sub : Number.parseInt(String(sub), 10)
    if (Number.isNaN(parsed)) {
      throw new UnauthorizedException('Invalid authenticated user id')
    }
    return parsed
  }
}
