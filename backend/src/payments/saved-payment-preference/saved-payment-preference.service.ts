import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, SavedPaymentPreference, SavedPaymentPreferenceState } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateSavedPaymentMethodDto } from './dto/create-saved-payment-method.dto'

export type SavedPaymentMethodView = {
  id: number
  maskedDisplay: string
  brand: string | null
  method: Prisma.PaymentMethod | null
  expiryMonth: number | null
  expiryYear: number | null
  billingNickname: string | null
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

@Injectable()
export class SavedPaymentPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: number, dto: CreateSavedPaymentMethodDto): Promise<SavedPaymentMethodView> {
    const gatewayToken = dto.gatewayToken.trim()
    const maskedDisplay = dto.maskedDisplay.trim()

    if (!gatewayToken) {
      throw new BadRequestException('Gateway token is required when saving a payment method.')
    }

    if (!maskedDisplay) {
      throw new BadRequestException('Masked display value is required.')
    }

    if (dto.expiryMonth != null && (dto.expiryMonth < 1 || dto.expiryMonth > 12)) {
      throw new BadRequestException('Expiry month must be between 1 and 12.')
    }

    if (dto.expiryYear != null && dto.expiryYear < new Date().getFullYear()) {
      throw new BadRequestException('Expiry year cannot be in the past.')
    }

    return this.prisma.$transaction(async (tx) => {
      const existingDefault = await tx.savedPaymentPreference.findFirst({
        where: {
          userId,
          state: SavedPaymentPreferenceState.ACTIVE,
          isDefault: true,
        },
      })

      const existingToken = await tx.savedPaymentPreference.findFirst({
        where: {
          userId,
          state: SavedPaymentPreferenceState.ACTIVE,
          gatewayToken,
        },
      })

      const shouldDefault = dto.setAsDefault ?? !Boolean(existingDefault)

      const normalizedBrand = dto.brand !== undefined ? this.normalizeOptionalString(dto.brand) : undefined
      const normalizedBillingNickname = dto.billingNickname !== undefined ? this.normalizeOptionalString(dto.billingNickname) : undefined

      const expiryMonth = dto.expiryMonth ?? null
      const expiryYear = dto.expiryYear ?? null

      const prepareData = (isDefault: boolean) => ({
        userId,
        gatewayToken,
        maskedDisplay,
        brand: dto.brand !== undefined ? this.normalizeOptionalString(dto.brand) : undefined,
        method: dto.method ?? undefined,
        expiryMonth,
        expiryYear,
        billingNickname: normalizedBillingNickname ?? undefined,
        isDefault,
        state: SavedPaymentPreferenceState.ACTIVE,
      })

      const activePreference = existingToken
        ? await this.updateExistingPreference(tx, existingToken, {
            maskedDisplay,
            gatewayToken,
            brand: normalizedBrand ?? existingToken.brand,
            method: dto.method ?? existingToken.method,
            expiryMonth: dto.expiryMonth ?? existingToken.expiryMonth,
            expiryYear: dto.expiryYear ?? existingToken.expiryYear,
            billingNickname: normalizedBillingNickname ?? existingToken.billingNickname,
            shouldDefault,
            hasExistingDefault: Boolean(existingDefault),
          })
        : await this.createNewPreference(tx, userId, gatewayToken, maskedDisplay, dto, {
            shouldDefault,
            hasExistingDefault: Boolean(existingDefault),
          })

      return this.mapToView(activePreference)
    })
  }

  async listForUser(userId: number): Promise<SavedPaymentMethodView[]> {
    const records = await this.prisma.savedPaymentPreference.findMany({
      where: {
        userId,
        state: SavedPaymentPreferenceState.ACTIVE,
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return records.map((record) => this.mapToView(record))
  }

  async setDefault(userId: number, preferenceId: number): Promise<SavedPaymentMethodView> {
    const preference = await this.ensureActivePreference(userId, preferenceId)
    if (preference.isDefault) {
      return this.mapToView(preference)
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.savedPaymentPreference.updateMany({
        where: {
          userId,
          state: SavedPaymentPreferenceState.ACTIVE,
          isDefault: true,
        },
        data: { isDefault: false },
      })

      await tx.savedPaymentPreference.update({
        where: { id: preferenceId },
        data: { isDefault: true },
      })

      const updated = await tx.savedPaymentPreference.findUnique({ where: { id: preferenceId } })
      if (!updated) {
        throw new NotFoundException('Saved payment method not found after update')
      }
      return this.mapToView(updated)
    })
  }

  async remove(userId: number, preferenceId: number) {
    await this.ensureActivePreference(userId, preferenceId)
    await this.prisma.savedPaymentPreference.update({
      where: { id: preferenceId },
      data: {
        state: SavedPaymentPreferenceState.DELETED,
        deletedAt: new Date(),
        isDefault: false,
      },
    })
    return { deleted: true }
  }

  async getActivePreferenceForUser(userId: number, preferenceId: number) {
    const preference = await this.prisma.savedPaymentPreference.findFirst({
      where: {
        id: preferenceId,
        userId,
        state: SavedPaymentPreferenceState.ACTIVE,
      },
    })

    if (!preference) {
      throw new NotFoundException('Saved payment method not found')
    }

    return preference
  }

  private async ensureActivePreference(userId: number, preferenceId: number) {
    const preference = await this.prisma.savedPaymentPreference.findFirst({
      where: {
        id: preferenceId,
        userId,
        state: SavedPaymentPreferenceState.ACTIVE,
      },
    })

    if (!preference) {
      throw new NotFoundException('Saved payment method not found')
    }

    return preference
  }

  private async updateExistingPreference(
    tx: Prisma.TransactionClient,
    existing: SavedPaymentPreference,
    options: {
      shouldDefault: boolean
      hasExistingDefault: boolean
      maskedDisplay: string
      gatewayToken: string
      brand: string | null | undefined
      method: Prisma.PaymentMethod | undefined
      expiryMonth: number | null | undefined
      expiryYear: number | null | undefined
      billingNickname: string | null | undefined
    },
  ) {
    const willBecomeDefault = existing.isDefault || options.shouldDefault

    if (willBecomeDefault && !existing.isDefault) {
      await tx.savedPaymentPreference.updateMany({
        where: {
          userId: existing.userId,
          state: SavedPaymentPreferenceState.ACTIVE,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const updateData: Prisma.SavedPaymentPreferenceUpdateInput = {
      maskedDisplay: options.maskedDisplay,
      brand: options.brand ?? null,
      gatewayToken: options.gatewayToken,
      method: options.method ?? existing.method,
      expiryMonth: options.expiryMonth ?? existing.expiryMonth,
      expiryYear: options.expiryYear ?? existing.expiryYear,
      billingNickname: options.billingNickname ?? existing.billingNickname,
      isDefault: willBecomeDefault,
    }

    return tx.savedPaymentPreference.update({
      where: { id: existing.id },
      data: updateData,
    })
  }

  private async createNewPreference(
    tx: Prisma.TransactionClient,
    userId: number,
    gatewayToken: string,
    maskedDisplay: string,
    dto: CreateSavedPaymentMethodDto,
    options: { shouldDefault: boolean; hasExistingDefault: boolean },
  ) {
    const willBecomeDefault = options.shouldDefault

    if (willBecomeDefault) {
      await tx.savedPaymentPreference.updateMany({
        where: {
          userId,
          state: SavedPaymentPreferenceState.ACTIVE,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    return tx.savedPaymentPreference.create({
      data: {
        userId,
        gatewayToken,
        maskedDisplay,
        brand: this.normalizeOptionalString(dto.brand),
        method: dto.method ?? null,
        expiryMonth: dto.expiryMonth ?? null,
        expiryYear: dto.expiryYear ?? null,
        billingNickname: this.normalizeOptionalString(dto.billingNickname),
        isDefault: willBecomeDefault,
        state: SavedPaymentPreferenceState.ACTIVE,
      },
    })
  }

  private mapToView(record: SavedPaymentPreference) {
    return {
      id: record.id,
      maskedDisplay: record.maskedDisplay,
      brand: record.brand ?? null,
      method: record.method ?? null,
      expiryMonth: record.expiryMonth ?? null,
      expiryYear: record.expiryYear ?? null,
      billingNickname: record.billingNickname ?? null,
      isDefault: Boolean(record.isDefault),
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    }
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) {
      return undefined
    }
    if (value === null) {
      return null
    }
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
}
