import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { CommunicationChannel, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { CommunicationPreferencesUpdateDto } from './dto/communication-preference-input.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import * as bcrypt from 'bcrypt'

@Injectable()
export class CustomerProfileService {
  private readonly logger = new Logger(CustomerProfileService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: {
        addresses: true,
        preferences: true,
      },
    })

    if (profile) {
      this.logger.debug(`Loaded profile for user ${userId}`)
      return profile
    }

    await this.prisma.customerProfile.create({ data: { userId } })
    const created = await this.prisma.customerProfile.findUnique({
      where: { userId },
      include: { addresses: true, preferences: true },
    })

    if (!created) {
      throw new NotFoundException('Unable to load customer profile')
    }
    this.logger.debug(`Initialized profile for user ${userId}`)
    return created
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const profile = await this.ensureProfile(userId)
    const updateData: Prisma.CustomerProfileUpdateInput = {
      firstName: this.normalizeOptionalString(dto.firstName),
      lastName: this.normalizeOptionalString(dto.lastName),
      phone: this.normalizeOptionalString(dto.phone),
    }

    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null
    }

    await this.prisma.customerProfile.update({
      where: { id: profile.id },
      data: updateData,
    })
    this.logger.log(`User ${userId} updated profile fields: ${Object.keys(dto).join(', ')}`)
    return this.getProfile(userId)
  }

  async listAddresses(userId: number) {
    const profile = await this.ensureProfile(userId)
    const addresses = await this.prisma.address.findMany({
      where: { profileId: profile.id }, orderBy: { updatedAt: 'desc' },
    })
    this.logger.debug(`User ${userId} fetched ${addresses.length} addresses`)
    return addresses
  }

  async createAddress(userId: number, dto: CreateAddressDto) {
    const profile = await this.ensureProfile(userId)
    const createPayload = { ...dto, profileId: profile.id }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId: profile.id },
          data: { isDefault: false },
        })
      }

      const newAddr = await tx.address.create({ data: createPayload })
      this.logger.log(`User ${userId} added new address id=${newAddr.id}`)
      return newAddr
    })
  }

  async updateAddress(userId: number, addressId: number, dto: UpdateAddressDto) {
    const profile = await this.ensureProfile(userId)
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } })
    if (!existing || existing.profileId !== profile.id) {
      throw new NotFoundException('Address not found')
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId: profile.id, id: { not: addressId } },
          data: { isDefault: false },
        })
      }

      const updatePayload: Prisma.AddressUpdateInput = {
        label: this.normalizeOptionalString(dto.label),
        fullName: this.normalizeOptionalString(dto.fullName),
        company: this.normalizeOptionalString(dto.company),
        streetLine1: this.normalizeOptionalString(dto.streetLine1),
        streetLine2: this.normalizeOptionalString(dto.streetLine2),
        city: this.normalizeOptionalString(dto.city),
        state: this.normalizeOptionalString(dto.state),
        postalCode: this.normalizeOptionalString(dto.postalCode),
        country: this.normalizeOptionalString(dto.country),
        phone: this.normalizeOptionalString(dto.phone),
        isDefault: dto.isDefault,
      }

      const updatedAddr = await tx.address.update({ where: { id: addressId }, data: updatePayload })
      this.logger.log(`User ${userId} updated address id=${addressId}`)
      return updatedAddr
    })
  }

  async deleteAddress(userId: number, addressId: number) {
    const profile = await this.ensureProfile(userId)
    const existing = await this.prisma.address.findUnique({ where: { id: addressId } })
    if (!existing || existing.profileId !== profile.id) {
      throw new NotFoundException('Address not found')
    }
    await this.prisma.address.delete({ where: { id: addressId } })
    this.logger.log(`User ${userId} deleted address id=${addressId}`)
    return { deleted: true }
  }

  async listPreferences(userId: number) {
    const profile = await this.ensureProfile(userId)
    const prefs = await this.prisma.communicationPreference.findMany({
      where: { profileId: profile.id }, orderBy: [{ channel: 'asc' }, { preference: 'asc' }],
    })
    this.logger.debug(`User ${userId} fetched ${prefs.length} communication preferences`)
    return prefs
  }

  async updatePreferences(userId: number, dto: CommunicationPreferencesUpdateDto) {
    const profile = await this.ensureProfile(userId)
    const operations = dto.preferences.map((entry) =>
      this.prisma.communicationPreference.upsert({
        where: { profileId_channel_preference: { profileId: profile.id, channel: entry.channel, preference: entry.preference } },
        create: { profileId: profile.id, channel: entry.channel, preference: entry.preference, enabled: entry.enabled },
        update: { enabled: entry.enabled },
      }),
    )
    await Promise.all(operations)
    this.logger.log(`User ${userId} updated communication preferences: ${JSON.stringify(dto.preferences)}`)
    return this.listPreferences(userId)
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    const validCurrent = await bcrypt.compare(dto.currentPassword, user.passwordHash)
    if (!validCurrent) {
      throw new UnauthorizedException('Current password is incorrect')
    }
    const newHash = await bcrypt.hash(dto.newPassword, 12)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } })
    this.logger.log(`User ${userId} changed their password`)
    return { message: 'Password changed successfully' }
  }

  private async ensureProfile(userId: number) {
    const profile = await this.prisma.customerProfile.findUnique({ where: { userId } })
    if (profile) return profile
    const newProfile = await this.prisma.customerProfile.create({ data: { userId } })
    this.logger.debug(`Auto-created missing profile for user ${userId}`)
    return newProfile
  }

  private normalizeOptionalString(value?: string | null) {
    if (value === undefined) return undefined
    if (value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }
}
