import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { CatalogController } from './catalog.controller'
import { CatalogService } from './catalog.service'

describe('CatalogController', () => {
  let controller: CatalogController
  let service: CatalogService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            getProductDetail: jest.fn(),
            getRelatedProducts: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<CatalogController>(CatalogController)
    service = module.get<CatalogService>(CatalogService)
  })

  it('delegates to CatalogService for product detail', async () => {
    const expected = { id: 1, name: 'Product' }
    jest.spyOn(service, 'getProductDetail').mockResolvedValue(expected)

    expect(await controller.getProduct(1)).toBe(expected)
    expect(service.getProductDetail).toHaveBeenCalledWith(1)
  })

  it('propagates NotFoundException from service when product missing', async () => {
    jest.spyOn(service, 'getProductDetail').mockRejectedValue(new NotFoundException())
    await expect(controller.getProduct(999)).rejects.toThrow(NotFoundException)
  })

  it('returns related products metadata and items', async () => {
    const related = [{ id: 2, name: 'Accessory' }]
    jest.spyOn(service, 'getRelatedProducts').mockResolvedValue(related)

    const response = await controller.getRelated(1, {})

    expect(service.getRelatedProducts).toHaveBeenCalledWith(1, undefined)
    expect(response).toEqual({
      items: related,
      metadata: {
        requestedLimit: undefined,
        returned: related.length,
      },
    })
  })
})
