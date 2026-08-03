import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common'
import { PaymentAttemptStatus, Prisma, PaymentMethod as PrismaPaymentMethod } from '@prisma/client'
import { CreatePaymentAuthorizationDto } from './dto/create-payment-authorization.dto'
import {
  PaymentAuthorizationResponseDto,
} from './dto/payment-response.dto'
import { PaymentMethod } from './payment-method.enum'
import {
  PaymentProvider,
  PaymentAuthorizationRequest,
  PaymentAuthorizationResult,
} from './interfaces/payment-provider.interface'
import { PAYMENT_PROVIDER_TOKEN } from './constants'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)
  private readonly supportedMethods = new Set(Object.values(PaymentMethod))

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider,
  ) {}

  async authorize(
    userId: number,
    input: CreatePaymentAuthorizationDto,
    idempotencyKey: string | undefined,
  ): Promise<PaymentAuthorizationResponseDto> {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey)

    const existing = await this.prisma.paymentAttempt.findUnique({
      where: { idempotencyKey: normalizedKey },
    })

    if (existing) {
      const isSameRequest =
        existing.cartId === input.cartId &&
        existing.selectedPaymentMethod === input.method &&
        existing.currency === input.currency &&
        new Prisma.Decimal(input.amount).equals(existing.amount)
      if (!isSameRequest) {
        throw new BadRequestException(
          'Idempotency key conflict: previous request data differs from current request',
        )
      }
      return this.replayExistingAttempt(existing)
    }

    if (!this.supportedMethods.has(input.method)) {
      throw new BadRequestException('Unsupported payment method')
    }

    const providerRequest = this.buildProviderRequest(userId, input)

    const attempt = await this.prisma.paymentAttempt.create({
      data: {
        selectedPaymentMethod: input.method,
        cartId: input.cartId,
        status: PaymentAttemptStatus.PENDING,
        idempotencyKey: normalizedKey,
        currency: input.currency,
        amount: new Prisma.Decimal(input.amount),
        metadata: this.buildMetadata(input, providerRequest),
      },
    })

    try {
      const providerResult = await this.provider.authorizePayment(providerRequest)
      return this.completeAttempt(attempt.id, providerResult)
    } catch (error) {
      this.logger.warn('Payment provider invocation failed', (error as Error).message)
      const normalized = this.normalizeProviderError(error)
      await this.prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: PaymentAttemptStatus.FAILED,
          failureReason: normalized.message,
          metadata: { ...(attempt.metadata ?? {}), response: normalized },
        },
      })
      return normalized
    }
  }

  private buildProviderRequest(
    userId: number,
    input: CreatePaymentAuthorizationDto,
  ): PaymentAuthorizationRequest {
    return {
      userId,
      cartId: input.cartId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      method: input.method,
      details: this.extractDetails(input),
    }
  }

  private extractDetails(input: CreatePaymentAuthorizationDto) {
    const details: Record<string, unknown> = {
      metadata: input.metadata ?? {},
    }

    if (input.cardToken) {
      details.cardToken = input.cardToken
      if (input.cardScheme) {
        details.cardScheme = input.cardScheme
      }
    }

    if (input.upiId) {
      details.upiId = input.upiId
    }

    if (input.bankCode) {
      details.bankCode = input.bankCode
      if (input.returnUrl) {
        details.returnUrl = input.returnUrl
      }
    }

    if (input.walletProvider) {
      details.walletProvider = input.walletProvider
      if (input.walletAccount) {
        details.walletAccount = input.walletAccount
      }
    }

    return details
  }

  private buildMetadata(
    input: CreatePaymentAuthorizationDto,
    providerRequest: PaymentAuthorizationRequest,
  ): Prisma.JsonValue {
    return {
      method: providerRequest.method,
      cartId: providerRequest.cartId,
      amount: providerRequest.amount,
      currency: providerRequest.currency,
      details: providerRequest.details,
    }
  }

  private async completeAttempt(
    attemptId: number,
    providerResult: PaymentAuthorizationResult,
  ): Promise<PaymentAuthorizationResponseDto> {
    const normalized = this.normalizeProviderResult(providerResult)
    await this.prisma.paymentAttempt.update({
      where: { id: attemptId },
      data: {
        status:
          normalized.status === 'authorized'
            ? PaymentAttemptStatus.AUTHORIZED
            : PaymentAttemptStatus.FAILED,
        providerReference: providerResult.providerReference ?? null,
        failureReason:
          normalized.status === 'failed' ? normalized.message : null,
        metadata: { response: normalized },
        completedAt: new Date(),
      },
    })
    return normalized
  }

  private normalizeProviderResult(result: PaymentAuthorizationResult): PaymentAuthorizationResponseDto {
    if (result.authorized) {
      return {
        success: true,
        status: 'authorized',
        code: 'PAYMENT_AUTHORIZED',
        message: 'Payment has been authorized.',
        providerReference: result.providerReference,
      }
    }

    return {
      success: false,
      status: 'failed',
      code: result.errorCode ?? 'PAYMENT_DECLINED',
      message: result.errorMessage ?? 'Payment was declined by the provider.',
      providerReference: result.providerReference,
    }
  }

  private normalizeProviderError(error: unknown): PaymentAuthorizationResponseDto {
    const message = (error as Error).message ?? 'Unable to reach payment provider.'
    return {
      success: false,
      status: 'failed',
      code: 'PROVIDER_UNAVAILABLE',
      message:
        message || 'Payment provider is temporarily unavailable. Please try again later.',
    }
  }

  private replayExistingAttempt(
    attempt: { status: PaymentAttemptStatus; metadata: Prisma.JsonValue | null; providerReference: string | null; failureReason: string | null },
  ): PaymentAuthorizationResponseDto {
    if (attempt.status === PaymentAttemptStatus.AUTHORIZED) {
      return {
        success: true,
        status: 'authorized',
        code: 'PAYMENT_AUTHORIZED',
        message: 'Payment attempt already authorized.',
        providerReference: attempt.providerReference ?? undefined,
      }
    }

    const metadata = (attempt.metadata ?? {}) as { response?: PaymentAuthorizationResponseDto }
    const response = metadata.response

    return {
      success: false,
      status: 'failed',
      code: response?.code ?? 'PAYMENT_FAILED',
      message: response?.message ?? attempt.failureReason ?? 'Previous payment attempt failed.',
      providerReference: attempt.providerReference ?? undefined,
    }
  }

  private normalizeIdempotencyKey(key: string | undefined) {
    const trimmed = key?.trim()
    if (!trimmed) {
      throw new BadRequestException('Idempotency-Key header is required and must be non-empty')
    }
    return trimmed
  }
}
