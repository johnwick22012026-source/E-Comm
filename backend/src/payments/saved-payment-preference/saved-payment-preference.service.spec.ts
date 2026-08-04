import { Prisma, SavedPaymentPreferenceState } from '@prisma/client'
import { SavedPaymentPreferenceService } from './saved-payment-preference.service'
import { CreateSavedPaymentMethodDto } from './dto/create-saved-payment-method.dto'
import { PaymentMethod } from '../payment-method.enum'

describe('SavedPaymentPreferenceService', () => {
  let service: SavedPaymentPreferenceService
  let prismaMock: any
  let txClient: any
  let preferenceOps: {
    findFirst: jest.Mock<any, any>
    findMany: jest.Mock<any, any>
    updateMany: jest.Mock<any, any>
    create: jest.Mock<any, any>
    update: jest.Mock<any, any>
    findUnique: jest.Mock<any, any>
  }

  beforeEach(() => {
    preferenceOps = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    }

    txClient = {
      savedPaymentPreference: preferenceOps,
    }

    prismaMock = {
      savedPaymentPreference: preferenceOps,
      $transaction: jest.fn(async (fn: any) => fn(txClient)),
    }

    service = new SavedPaymentPreferenceService(prismaMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates a new default preference when no default exists', async () => {
    preferenceOps.findFirst
      .mockResolvedValueOnce(null) // no default
      .mockResolvedValueOnce(null)
    preferenceOps.create.mockResolvedValue({
      id: 3,
      userId: 5,
      gatewayToken: 'tok_1',
      maskedDisplay: '**** 4242',
      brand: 'Visa',
      method: PaymentMethod.CARD,
      expiryMonth: 12,
      expiryYear: 2030,
      billingNickname: 'Business card',
      isDefault: true,
      state: SavedPaymentPreferenceState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const dto: CreateSavedPaymentMethodDto = {
      gatewayToken: 'tok_1',
      maskedDisplay: '**** 4242',
      brand: 'Visa',
      method: PaymentMethod.CARD,
      expiryMonth: 12,
      expiryYear: 2030,
      billingNickname: 'Business card',
    }

    const result = await service.createForUser(5, dto)

    expect(result.isDefault).toBe(true)
    expect(preferenceOps.updateMany).toHaveBeenCalledWith({
      where: { userId: 5, state: SavedPaymentPreferenceState.ACTIVE, isDefault: true },
      data: { isDefault: false },
    })
    expect(preferenceOps.create).toHaveBeenCalled()
  })

  it('sets an explicit default with setDefault endpoint', async () => {
    preferenceOps.findFirst
      .mockResolvedValueOnce({
        id: 7,
        userId: 8,
        gatewayToken: 'tok_x',
        maskedDisplay: '**** 1111',
        brand: 'Mastercard',
        method: PaymentMethod.CARD,
        expiryMonth: 1,
        expiryYear: 2030,
        billingNickname: 'Work',
        isDefault: false,
        state: SavedPaymentPreferenceState.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    preferenceOps.updateMany.mockResolvedValue({ count: 1 })
    preferenceOps.update.mockResolvedValue({
      id: 7,
      userId: 8,
      mask: '**** 1111',
      maskedDisplay: '**** 1111',
      brand: 'Mastercard',
      method: PaymentMethod.CARD,
      expiryMonth: 1,
      expiryYear: 2030,
      billingNickname: 'Work',
      isDefault: true,
      state: SavedPaymentPreferenceState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    preferenceOps.findUnique.mockResolvedValue({
      id: 7,
      userId: 8,
      maskedDisplay: '**** 1111',
      brand: 'Mastercard',
      method: PaymentMethod.CARD,
      expiryMonth: 1,
      expiryYear: 2030,
      billingNickname: 'Work',
      isDefault: true,
      state: SavedPaymentPreferenceState.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const preference = await service.setDefault(8, 7)

    expect(preference.isDefault).toBe(true)
    expect(preferenceOps.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { isDefault: true },
    })
  })

  it('removes the preference by marking it deleted', async () => {
    preferenceOps.findFirst.mockResolvedValue({
      id: 11,
      userId: 9,
      state: SavedPaymentPreferenceState.ACTIVE,
    })

    await service.remove(9, 11)

    expect(preferenceOps.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        state: SavedPaymentPreferenceState.DELETED,
        deletedAt: expect.any(Date),
        isDefault: false,
      },
    })
  })

  it('returns gateway token for internal checkout use', async () => {
    preferenceOps.findFirst.mockResolvedValue({
      id: 20,
      userId: 10,
      gatewayToken: 'tok-storage',
      state: SavedPaymentPreferenceState.ACTIVE,
    })

    const preference = await service.getActivePreferenceForUser(10, 20)

    expect(preference.gatewayToken).toBe('tok-storage')
  })
})
