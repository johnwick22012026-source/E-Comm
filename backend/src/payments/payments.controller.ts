import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PaymentsService } from './payments.service'
import { CreatePaymentAuthorizationDto } from './dto/create-payment-authorization.dto'
import { PaymentAuthorizationResponseDto } from './dto/payment-response.dto'

interface AuthenticatedRequest extends Request {
  user?: { sub: number | string; sessionToken?: string }
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('authorizations')
  @HttpCode(200)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async authorize(
    @Req() req: AuthenticatedRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreatePaymentAuthorizationDto,
  ): Promise<PaymentAuthorizationResponseDto> {
    const userId = this.extractUserId(req)
    return this.paymentsService.authorize(userId, body, idempotencyKey)
  }

  private extractUserId(req: AuthenticatedRequest): number {
    const sub = req.user?.sub
    if (sub === undefined || sub === null) {
      throw new BadRequestException('Authenticated user missing')
    }
    const id = typeof sub === 'number' ? sub : Number.parseInt(String(sub), 10)
    if (isNaN(id)) {
      throw new BadRequestException(`Invalid user id in token: ${sub}`)
    }
    return id
  }
}
