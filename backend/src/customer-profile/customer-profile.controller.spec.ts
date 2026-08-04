import { Test, TestingModule } from '@nestjs/testing'
import { CustomerProfileController } from './customer-profile.controller'
import { CustomerProfileService } from './customer-profile.service'
import { CommunicationChannel } from '@prisma/client'

describe('CustomerProfileController', () => {
  let controller: CustomerProfileController
  let service: CustomerProfileService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerProfileController],
      providers: [
        {
          provide: CustomerProfileService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            listAddresses: jest.fn(),
            createAddress: jest.fn(),
            updateAddress: jest.fn(),
            deleteAddress: jest.fn(),
            listPreferences: jest.fn(),
            updatePreferences: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<CustomerProfileController>(CustomerProfileController)
    service = module.get<CustomerProfileService>(CustomerProfileService)
  })

  const req = { user: { sub: '100' } } as any

  it('fetches profile for authenticated user', async () => {
    const profile = { id: 1 }
    jest.spyOn(service, 'getProfile').mockResolvedValue(profile)

    const response = await controller.getProfile(req)

    expect(response).toEqual({ profile })
    expect(service.getProfile).toHaveBeenCalledWith(100)
  })

  it('creates an address when payload is valid', async () => {
    const address = { id: 5 }
    jest.spyOn(service, 'createAddress').mockResolvedValue(address)

    const response = await controller.createAddress(req, {
      fullName: 'Test',
      streetLine1: '1 Main',
      city: 'City',
      postalCode: '12345',
      country: 'US',
      label: 'Home',
    } as any)

    expect(response).toEqual({ address })
    expect(service.createAddress).toHaveBeenCalledWith(100, expect.any(Object))
  })

  it('updates preferences through service', async () => {
    const preferences = [
      { channel: CommunicationChannel.EMAIL, preference: 'NEWS', enabled: true },
    ]
    jest.spyOn(service, 'updatePreferences').mockResolvedValue(preferences)

    const response = await controller.updatePreferences(req, { preferences } as any)

    expect(response).toEqual({ preferences })
    expect(service.updatePreferences).toHaveBeenCalledWith(100, { preferences })
  })

  it('changes password for authenticated user', async () => {
    jest.spyOn(service, 'changePassword').mockResolvedValue({ message: 'ok' })

    const response = await controller.changePassword(req, {
      currentPassword: 'current',
      newPassword: 'newPassword123',
    })

    expect(response).toEqual({ message: 'ok' })
    expect(service.changePassword).toHaveBeenCalledWith(100, expect.any(Object))
  })
})
