import { NotFoundException } from '@nestjs/common'
import { Decimal } from '@prisma/client/runtime/library'
import { CatalogService } from './catalog.service'

describe('CatalogService', () => {
  let service: CatalogService
  let prismaMock: any

  beforeEach(() => {
    prismaMock = {
      product: { findUnique: jest.fn() },
      productRelationship: { findMany: jest.fn() },
      $transaction: jest.fn(),
    }
    service = new CatalogService(prismaMock)
  })

  it('returns a normalized product detail payload', async () => {
    const productRecord = {
      id: 1,
      name: 'Premium Headphones',
      slug: 'premium-headphones',
      description: 'Balanced sound signature',
      brand: 'AcousticCo',
      price: new Decimal('199.99'),
      currency: 'USD',
      listPrice: new Decimal('249.99'),
      salePrice: new Decimal('199.99'),
      saleStartsAt: new Date('2024-01-01T10:00:00Z'),
      saleEndsAt: new Date('2024-06-01T10:00:00Z'),
      priceUpdatedAt: new Date('2024-02-01T10:00:00Z'),
      stockQuantity: 25,
      availableQuantity: 18,
      reservedQuantity: 7,
      inventoryStatus: 'IN_STOCK',
      availabilityUpdatedAt: new Date('2024-02-10T10:00:00Z'),
      isAvailable: true,
      isActive: true,
      category: { id: 4, name: 'Audio', slug: 'audio' },
      subcategory: { id: 8, name: 'Headphones', slug: 'headphones' },
      images: [
        {
          id: 101,
          url: 'https://cdn.example.com/headphones-hero.jpg',
          altText: 'Premium headphones front view',
          focalPoint: 'center',
          provider: 's3',
          sortOrder: 0,
          isPrimary: true,
          metadata: { width: 1200, height: 800 },
        },
      ],
      specifications: [
        {
          id: 201,
          definitionId: 12,
          value: 'Active Noise Cancellation',
          displayName: 'ANC',
          groupName: 'Features',
          displayOrder: 1,
          definition: { id: 12, key: 'anc', label: 'Noise Cancellation', dataType: 'TEXT' },
        },
      ],
      ratingAggregate: {
        productId: 1,
        ratingAverage: new Decimal('4.8'),
        ratingCount: 342,
        ratingTotal: 1635,
        ratingDistribution: { '5': 280, '4': 42, '3': 12, '2': 5, '1': 3 },
        updatedAt: new Date('2024-02-11T10:00:00Z'),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const relatedRecords = [
      {
        type: 'ACCESSORY',
        toProduct: {
          id: 2,
          name: 'Luxury Carry Case',
          slug: 'luxury-carry-case',
          brand: 'AcousticCo',
          price: new Decimal('49.99'),
          currency: 'USD',
          isAvailable: true,
          inventoryStatus: 'IN_STOCK',
          images: [
            {
              url: 'https://cdn.example.com/case.jpg',
            },
          ],
        },
      },
    ]

    prismaMock.product.findUnique.mockResolvedValue(productRecord)
    prismaMock.productRelationship.findMany.mockResolvedValue(relatedRecords)

    const result = await service.getProductDetail(1)

    expect(prismaMock.product.findUnique).toHaveBeenCalled()
    expect(prismaMock.productRelationship.findMany).toHaveBeenCalled()
    expect(result).toMatchObject({
      id: 1,
      name: 'Premium Headphones',
      slug: 'premium-headphones',
      brand: 'AcousticCo',
      pricing: {
        price: 199.99,
        currency: 'USD',
        salePrice: 199.99,
      },
      availability: {
        isAvailable: true,
        inventoryStatus: 'IN_STOCK',
      },
      ratings: {
        average: 4.8,
        count: 342,
      },
      specifications: [
        {
          key: 'anc',
          label: 'ANC',
          value: 'Active Noise Cancellation',
          dataType: 'TEXT',
        },
      ],
      images: [
        {
          url: 'https://cdn.example.com/headphones-hero.jpg',
          metadata: { width: 1200, height: 800 },
        },
      ],
      relatedProducts: [
        {
          id: 2,
          name: 'Luxury Carry Case',
          type: 'ACCESSORY',
          primaryImageUrl: 'https://cdn.example.com/case.jpg',
        },
      ],
    })
  })

  it('throws NotFoundException when the product cannot be found', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)
    await expect(service.getProductDetail(999)).rejects.toThrow(NotFoundException)
  })

  it('returns only normalized related products within limits', async () => {
    prismaMock.productRelationship.findMany.mockResolvedValue([
      {
        type: 'SIMILAR',
        toProduct: {
          id: 5,
          name: 'Wireless Adapter',
          slug: 'wireless-adapter',
          brand: 'AudioWorks',
          price: new Decimal('29.99'),
          currency: 'USD',
          isAvailable: false,
          inventoryStatus: 'BACKORDER',
          images: [],
        },
      },
    ])

    const related = await service.getRelatedProducts(1, 3)

    expect(prismaMock.productRelationship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fromProductId: 1 },
        take: 3,
      }),
    )
    expect(related).toEqual([
      {
        id: 5,
        name: 'Wireless Adapter',
        slug: 'wireless-adapter',
        brand: 'AudioWorks',
        price: 29.99,
        currency: 'USD',
        isAvailable: false,
        inventoryStatus: 'BACKORDER',
        type: 'SIMILAR',
        primaryImageUrl: null,
      },
    ])
  })
})
