import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { randomBytes } from 'crypto'
import {
  CartPricingRequestDto,
  ShippingDestinationDto,
} from '../cart/dto/cart-pricing-request.dto'
import { CartPricingService } from '../cart/cart-pricing.service'
import { PrismaService } from '../prisma/prisma.service'
import { CustomerDetailsDto } from './dto/customer-details.dto'
import { ShippingAddressDto } from './dto/shipping-address.dto'
import { SelectShippingMethodDto } from './dto/select-shipping-method.dto'
import {
  CheckoutSessionStatus,
  CheckoutShippingAddress,
  CheckoutSelectedShippingMethod,
} from '@prisma/client'

type ShippingMethodOption = {
  provider: string
  serviceLevel: string
  optionCode: string
  cost: number
  currency: string
  estimatedDeliveryDays: number
  description?: string
}

@Injectable()
export class CheckoutService {
  private readonly domesticCountry = 'US'
  private readonly shippingCurrency = 'USD'

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: CartPricingService,
  ) {}

  async createSession(userId: number, body?: { referenceId?: string }) {
    const sessionToken = randomBytes(32).toString('hex')
    const metadata = body?.referenceId ? { referenceId: body.referenceId } : undefined
    const session = await this.prisma.checkoutSession.create({
      data: {
        sessionToken,
        userId,
        metadata,
        status: CheckoutSessionStatus.DRAFT,
      },
    })
    await this.upsertDraftState(session.id, 'session_created')
    return {
      sessionToken: session.sessionToken,
      status: session.status,
      startedAt: session.createdAt,
    }
  }

  async saveCustomerDetails(token: string, userId: number, body: CustomerDetailsDto) {
    const session = await this.loadSession(token, userId)
    this.ensureEditable(session)

    await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        customerFirstName: body.firstName.trim(),
        customerLastName: body.lastName.trim(),
        customerEmail: body.email.toLowerCase(),
        customerPhone: body.phone?.trim() || null,
        customerNotes: body.notes?.trim() || null,
        status: CheckoutSessionStatus.DRAFT,
      },
    })

    await this.upsertDraftState(session.id, 'customer_details')
  }

  async saveShippingAddress(token: string, userId: number, body: ShippingAddressDto) {
    const session = await this.loadSession(token, userId)
    this.ensureEditable(session)
    if (!session.customerFirstName || !session.customerEmail) {
      throw new BadRequestException('Customer details must be saved before shipping address.')
    }

    await this.prisma.checkoutShippingAddress.upsert({
      where: { checkoutSessionId: session.id },
      create: {
        checkoutSessionId: session.id,
        fullName: body.fullName.trim(),
        company: body.company?.trim() || null,
        attention: body.attention?.trim() || null,
        streetLine1: body.streetLine1.trim(),
        streetLine2: body.streetLine2?.trim() || null,
        city: body.city.trim(),
        state: body.state?.trim() || null,
        postalCode: body.postalCode.trim(),
        country: body.country.trim(),
        phone: body.phone?.trim() || null,
      },
      update: {
        fullName: body.fullName.trim(),
        company: body.company?.trim() || null,
        attention: body.attention?.trim() || null,
        streetLine1: body.streetLine1.trim(),
        streetLine2: body.streetLine2?.trim() || null,
        city: body.city.trim(),
        state: body.state?.trim() || null,
        postalCode: body.postalCode.trim(),
        country: body.country.trim(),
        phone: body.phone?.trim() || null,
        updatedAt: new Date(),
      },
    })

    await this.upsertDraftState(session.id, 'shipping_address')
  }

  async fetchShippingMethods(token: string, userId: number) {
    const session = await this.loadSession(token, userId)
    if (!session.shippingAddress) {
      throw new BadRequestException('Shipping address is required to fetch shipping methods.')
    }

    return this.buildShippingMethods(session.shippingAddress)
  }

  async selectShippingMethod(token: string, userId: number, body: SelectShippingMethodDto) {
    const session = await this.loadSession(token, userId)
    this.ensureEditable(session)
    const address = session.shippingAddress
    if (!address) {
      throw new BadRequestException('Shipping address is required before selecting a shipping method.')
    }

    const availableOptions = this.buildShippingMethods(address)
    const selected = availableOptions.find((option) => {
      if (option.provider !== body.provider || option.serviceLevel !== body.serviceLevel) {
        return false
      }
      if (body.optionCode && option.optionCode !== body.optionCode) {
        return false
      }
      return true
    })

    if (!selected) {
      throw new BadRequestException('Shipping method not available for the provided address.')
    }

    await this.prisma.checkoutSelectedShippingMethod.upsert({
      where: { checkoutSessionId: session.id },
      create: {
        checkoutSessionId: session.id,
        provider: selected.provider,
        serviceLevel: selected.serviceLevel,
        optionCode: selected.optionCode,
        cost: selected.cost,
        currency: selected.currency,
        estimatedDeliveryDays: selected.estimatedDeliveryDays,
      },
      update: {
        provider: selected.provider,
        serviceLevel: selected.serviceLevel,
        optionCode: selected.optionCode,
        cost: selected.cost,
        currency: selected.currency,
        estimatedDeliveryDays: selected.estimatedDeliveryDays,
        updatedAt: new Date(),
      },
    })

    await this.upsertDraftState(session.id, 'shipping_method')
  }

  async reviewSession(token: string, userId: number) {
    const session = await this.loadSession(token, userId)
    if (!session.shippingAddress) {
      throw new BadRequestException('Shipping address is required for review.')
    }
    if (!session.selectedShippingMethod) {
      throw new BadRequestException('A shipping method must be selected before review.')
    }

    const shippingDestination: ShippingDestinationDto = {
      country: session.shippingAddress.country,
      state: session.shippingAddress.state ?? undefined,
      postalCode: session.shippingAddress.postalCode ?? undefined,
    }

    const pricingRequest: CartPricingRequestDto = {
      shippingDestination,
      checkoutSessionId: session.id,
    }

    const totals = await this.pricingService.estimatePricing(userId, pricingRequest)

    const updated = await this.prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: CheckoutSessionStatus.REVIEW,
      },
      include: {
        shippingAddress: true,
        selectedShippingMethod: true,
      },
    })

    await this.upsertDraftState(session.id, 'review')

    return {
      sessionToken: updated.sessionToken,
      status: updated.status,
      customer: {
        firstName: updated.customerFirstName,
        lastName: updated.customerLastName,
        email: updated.customerEmail,
        phone: updated.customerPhone,
      },
      shippingAddress: this.serializeAddress(updated.shippingAddress),
      shippingMethod: this.serializeSelectedMethod(updated.selectedShippingMethod),
      totals,
    }
  }

  private serializeAddress(address: CheckoutShippingAddress | null | undefined) {
    if (!address) {
      return null
    }
    return {
      fullName: address.fullName,
      company: address.company,
      attention: address.attention,
      streetLine1: address.streetLine1,
      streetLine2: address.streetLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
    }
  }

  private serializeSelectedMethod(method: CheckoutSelectedShippingMethod | null | undefined) {
    if (!method) {
      return null
    }
    return {
      provider: method.provider,
      serviceLevel: method.serviceLevel,
      optionCode: method.optionCode,
      cost: Number(method.cost ?? 0),
      currency: method.currency,
      estimatedDeliveryDays: method.estimatedDeliveryDays,
    }
  }

  private buildShippingMethods(address: CheckoutShippingAddress): ShippingMethodOption[] {
    const countryCode = address.country.trim().toUpperCase()
    const isDomestic = countryCode === this.domesticCountry

    if (isDomestic) {
      return [
        {
          provider: 'Commerce Logistics',
          serviceLevel: 'Ground',
          optionCode: 'CL_GROUND',
          cost: 7.5,
          currency: this.shippingCurrency,
          estimatedDeliveryDays: 5,
          description: 'Economy ground delivery within the continental US',
        },
        {
          provider: 'Commerce Logistics',
          serviceLevel: 'Priority',
          optionCode: 'CL_PRIORITY',
          cost: 12,
          currency: this.shippingCurrency,
          estimatedDeliveryDays: 2,
          description: 'Priority next-day delivery within the US',
        },
      ]
    }

    return [
      {
        provider: 'Commerce Logistics',
        serviceLevel: 'International Economy',
        optionCode: 'CL_INTL_ECON',
        cost: 18,
        currency: this.shippingCurrency,
        estimatedDeliveryDays: 12,
        description: 'Cost-effective shipping worldwide',
      },
      {
        provider: 'Commerce Logistics',
        serviceLevel: 'International Express',
        optionCode: 'CL_INTL_EXP',
        cost: 32,
        currency: this.shippingCurrency,
        estimatedDeliveryDays: 6,
        description: 'Faster international delivery with customs support',
      },
    ]
  }

  private async loadSession(token: string, userId: number) {
    const session = await this.prisma.checkoutSession.findUnique({
      where: { sessionToken: token },
      include: {
        shippingAddress: true,
        selectedShippingMethod: true,
        draftOrderState: true,
      },
    })

    if (!session) {
      throw new NotFoundException('Checkout session not found')
    }
    if (session.userId !== userId) {
      throw new NotFoundException('Checkout session not found for the current user')
    }

    return session
  }

  private ensureEditable(session: { status: CheckoutSessionStatus }) {
    if (
      session.status === CheckoutSessionStatus.COMPLETED ||
      session.status === CheckoutSessionStatus.PENDING_PAYMENT ||
      session.status === CheckoutSessionStatus.ABANDONED
    ) {
      throw new BadRequestException('Checkout session is no longer editable')
    }
  }

  private async upsertDraftState(checkoutSessionId: number, lastCompletedStep: string) {
    await this.prisma.checkoutDraftOrderState.upsert({
      where: { checkoutSessionId },
      create: { checkoutSessionId, lastCompletedStep },
      update: { lastCompletedStep, updatedAt: new Date() },
    })
  }
}