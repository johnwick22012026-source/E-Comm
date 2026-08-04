import {
  BadRequestException,
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
  Body,
  ParseIntPipe,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { SavedPaymentPreferenceService } from './saved-payment-preference.service'
import { CreateSavedPaymentMethodDto } from './dto/create-saved-payment-method.dto'

interface AuthenticatedRequest extends Request {
  user?: {
    sub: number | string
  }
}

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class SavedPaymentPreferenceController {
  constructor(private readonly service: SavedPaymentPreferenceService) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateSavedPaymentMethodDto,
  ) {
    const userId = this.extractUserId(req)
    const preference = await this.service.createForUser(userId, body)
    return { paymentMethod: preference }
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    const userId = this.extractUserId(req)
    const items = await this.service.listForUser(userId)
    return { items }
  }

  @Patch(':id/default')
  async setDefault(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.extractUserId(req)
    const preference = await this.service.setDefault(userId, id)
    return { paymentMethod: preference }
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = this.extractUserId(req)
    return this.service.remove(userId, id)
  }

  private extractUserId(req: AuthenticatedRequest): number {
    const sub = req.user?.sub
    if (sub === undefined || sub === null) {
      throw new UnauthorizedException('Authenticated user missing')
    }
    const parsed = typeof sub === 'number' ? sub : Number.parseInt(String(sub), 10)
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('Invalid authenticated user id')
    }
    return parsed
  }
}
