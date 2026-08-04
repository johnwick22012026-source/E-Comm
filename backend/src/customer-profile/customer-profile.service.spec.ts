import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { CommunicationChannel } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { CustomerProfileService } from './customer-profile.service'

describe('CustomerProfileService', () => {
  let service: CustomerProfileService
  let prismaMock: any

  beforeEach(() => {
    prismaMock = {
      customerProfile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      address: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      communicationPreference: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prismaMock)),
    }

    service = new CustomerProfileService(prismaMock)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('creates profile when missing while fetching', async () => {
    const expectedWithRelations = {
      id: 1,
      userId: 10,
      addresses: [],
      preferences: [],
    }

    prismaMock.customerProfile.findUnique
      .mockResolvedValueOnce(null) // initial lookup
      .mockResolvedValueOnce(expectedWithRelations) // after create
    prismaMock.customerProfile.create.mockResolvedValue({ id: 1, userId: 10 })

    const result = await service.getProfile(10)

    expect(prismaMock.customerProfile.create).toHaveBeenCalledWith({ data: { userId: 10 } })
    expect(result).toBe(expectedWithRelations)
  })

  it('updates profile values and returns refreshed data', async () => {
    const profile = { id: 2, userId: 11 }
    prismaMock.customerProfile.findUnique
      .mockResolvedValueOnce(profile) // ensureProfile
      .mockResolvedValueOnce({ ...profile, firstName: 'Anne' }) // getProfile after update
    prismaMock.customerProfile.update.mockResolvedValue({ ...profile })

    const payload = { firstName: ' Anne ', dateOfBirth: '1984-04-12' }

    const result = await service.updateProfile(11, payload)

    expect(prismaMock.customerProfile.update).toHaveBeenCalledWith({
      where: { id: profile.id },
      data: expect.objectContaining({
        firstName: 'Anne',
        dateOfBirth: new Date('1984-04-12'),
      }),
    })
    expect(result.firstName).toBe('Anne')
  })

  it('creates an address and clears previous defaults when needed', async () => {
    const profile = { id: 3, userId: 12 }
    prismaMock.customerProfile.findUnique.mockResolvedValue(profile)
    prismaMock.address.create.mockResolvedValue({ id: 7, profileId: profile.id })

    const payload = {
      fullName: 'Test User',
      streetLine1: '123 Main St',
      city: 'Testville',
      postalCode: '12345',
      country: 'US',
      label: 'Home',
      isDefault: true,
    }

    const created = await service.createAddress(12, payload)

    expect(prismaMock.address.updateMany).toHaveBeenCalledWith({
      where: { profileId: profile.id },
      data: { isDefault: false },
    })
    expect(prismaMock.address.create).toHaveBeenCalledWith({ data: { ...payload, profileId: profile.id } })
    expect(created).toEqual({ id: 7, profileId: profile.id })
  })

  it('updates preferences with upsert for each entry', async () => {
    const profile = { id: 4, userId: 13 }
    prismaMock.customerProfile.findUnique.mockResolvedValue(profile)
    prismaMock.communicationPreference.upsert.mockResolvedValue({ id: 1 })
    prismaMock.communicationPreference.findMany.mockResolvedValue([])

    const payload = {
      preferences: [
        { channel: CommunicationChannel.EMAIL, preference: 'NEWSLETTER', enabled: false },
        { channel: CommunicationChannel.SMS, preference: 'TRANSACTIONAL', enabled: true },
      ],
    }

    const result = await service.updatePreferences(13, payload)

    expect(prismaMock.communicationPreference.upsert).toHaveBeenCalledTimes(2)
    expect(result).toEqual([])
  })

  it('changes password when current matches and rejects otherwise', async () => {
    const userRecord = { id: 14, passwordHash: 'old-hash' }
    prismaMock.user.findUnique.mockResolvedValue(userRecord)
    prismaMock.user.update.mockResolvedValue({})

    const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true)
    const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash')

    const payload = { currentPassword: 'current123', newPassword: 'newPassword123' }
    const response = await service.changePassword(14, payload)

    expect(compareSpy).toHaveBeenCalledWith('current123', userRecord.passwordHash)
    expect(hashSpy).toHaveBeenCalledWith('newPassword123', 12)
    expect(response).toEqual({ message: 'Password changed successfully' })
  })

  it('throws when current password is invalid', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 15, passwordHash: 'hash' })
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false)

    await expect(
      service.changePassword(15, { currentPassword: 'wrong', newPassword: 'newPassword123' }),
    ).rejects.toThrow(UnauthorizedException)
  })
})
