import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma, Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export enum CatalogSortOption {
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  NEWEST = 'newest',
  NAME_ASC = 'name_asc',
  POPULARITY = 'popularity',
}

export class CatalogQueryDto {
  cursor?: string
  limit?: string
  page?: string
  perPage?: string
  sort?: CatalogSortOption
  available?: string
  brand?: string
  category?: string
  subcategory?: string
  minPrice?: string
  maxPrice?: string
  search?: string
}

type CatalogProductRecord = Product & {
  category: { id: number; name: string; slug: string } | null
  subcategory: { id: number; name: string; slug: string } | null
}

@Injectable()
export class CatalogService {
  private readonly defaultPageSize = 20
  private readonly maxPageSize = 100
  private readonly relatedProductsDefaultLimit = 8
  private readonly relatedProductsMaxLimit = 32

  constructor(private readonly prisma: PrismaService) {}

  async browse(query: CatalogQueryDto) {
    this.ensurePaginationParameters(query)

    const where = this.buildWhere(query)
    const orderBy = this.buildOrderBy(query.sort)

    if (query.cursor) {
      return this.fetchWithCursor(where, orderBy, query)
    }

    return this.fetchWithPage(where, orderBy, query)
  }

  async getProductDetail(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            altText: true,
            focalPoint: true,
            provider: true,
            sortOrder: true,
            isPrimary: true,
            metadata: true,
          },
        },
        specifications: {
          include: {
            definition: {
              select: {
                id: true,
                key: true,
                label: true,
                dataType: true,
              },
            },
          },
          orderBy: [
            { displayOrder: 'asc' },
            { id: 'asc' },
          ],
        },
        ratingAggregate: true,
      },
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    const relatedProducts = await this.getRelatedProducts(productId)

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      pricing: {
        price: Number(product.price),
        currency: product.currency,
        listPrice: Number(product.listPrice),
        salePrice: product.salePrice ? Number(product.salePrice) : null,
        saleStartsAt: product.saleStartsAt,
        saleEndsAt: product.saleEndsAt,
        priceUpdatedAt: product.priceUpdatedAt,
      },
      availability: {
        stockQuantity: product.stockQuantity,
        availableQuantity: product.availableQuantity,
        reservedQuantity: product.reservedQuantity,
        inventoryStatus: product.inventoryStatus,
        availabilityUpdatedAt: product.availabilityUpdatedAt,
        isAvailable: product.isAvailable,
        isActive: product.isActive,
      },
      ratings: product.ratingAggregate
        ? {
            average: Number(product.ratingAggregate.ratingAverage),
            count: product.ratingAggregate.ratingCount,
            distribution: product.ratingAggregate.ratingDistribution ?? {},
          }
        : { average: 0, count: 0, distribution: {} },
      specifications: product.specifications.map((spec) => ({
        id: spec.id,
        key: spec.definition.key,
        label: spec.displayName ?? spec.definition.label,
        value: spec.value,
        groupName: spec.groupName,
        dataType: spec.definition.dataType,
        displayOrder: spec.displayOrder,
      })),
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        focalPoint: image.focalPoint,
        provider: image.provider,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
        metadata: image.metadata ?? null,
      })),
      relatedProducts,
    }
  }

  async getRelatedProducts(productId: number, limit?: number) {
    const computedLimit = this.getSafeRelatedLimit(limit)

    const relationships = await this.prisma.productRelationship.findMany({
      where: { fromProductId: productId },
      take: computedLimit,
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        toProduct: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: true,
            price: true,
            currency: true,
            isAvailable: true,
            inventoryStatus: true,
            images: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        },
      },
    })

    return relationships
      .map((relationship) => {
        const toProduct = relationship.toProduct
        if (!toProduct) {
          return null
        }
        const image = toProduct.images?.[0]
        return {
          id: toProduct.id,
          name: toProduct.name,
          slug: toProduct.slug,
          brand: toProduct.brand,
          price: Number(toProduct.price),
          currency: toProduct.currency,
          isAvailable: toProduct.isAvailable,
          inventoryStatus: toProduct.inventoryStatus,
          type: relationship.type,
          primaryImageUrl: image?.url ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }

  private getSafeRelatedLimit(limit?: number) {
    if (limit && Number.isFinite(limit) && limit > 0) {
      return Math.min(limit, this.relatedProductsMaxLimit)
    }
    return this.relatedProductsDefaultLimit
  }

  private ensurePaginationParameters(query: CatalogQueryDto) {
    if (query.cursor && (query.page || query.perPage)) {
      throw new BadRequestException('Cursor-based and page-based pagination cannot be mixed in a single request.')
    }
  }

  private buildWhere(query: CatalogQueryDto): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    }

    if (query.available) {
      where.isAvailable = query.available.toLowerCase() === 'true'
    }

    if (query.brand) {
      where.brand = { equals: query.brand.trim(), mode: 'insensitive' }
    }

    if (query.category && !query.subcategory) {
      where.category = { slug: query.category }
    }

    if (query.subcategory) {
      where.subcategory = {
        slug: query.subcategory,
        ...(query.category ? { category: { slug: query.category } } : {}),
      }
    }

    const minPrice = query.minPrice ? Number.parseFloat(query.minPrice) : undefined
    const maxPrice = query.maxPrice ? Number.parseFloat(query.maxPrice) : undefined

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new BadRequestException('minPrice cannot be greater than maxPrice.')
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {}
      if (minPrice !== undefined) {
        where.price.gte = minPrice
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice
      }
    }

    const search = query.search?.trim()
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
      ]
    }

    return where
  }

  private buildOrderBy(sort?: CatalogSortOption): Prisma.ProductOrderByWithRelationInput[] {
    const base: Prisma.ProductOrderByWithRelationInput[] = []
    switch (sort ?? CatalogSortOption.POPULARITY) {
      case CatalogSortOption.PRICE_ASC:
        base.push({ price: 'asc' })
        break
      case CatalogSortOption.PRICE_DESC:
        base.push({ price: 'desc' })
        break
      case CatalogSortOption.NEWEST:
        base.push({ createdAt: 'desc' })
        break
      case CatalogSortOption.NAME_ASC:
        base.push({ name: 'asc' })
        break
      case CatalogSortOption.POPULARITY:
      default:
        base.push({ popularityScore: 'desc' })
        break
    }
    base.push({ id: 'asc' })
    return base
  }

  private async fetchWithPage(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    query: CatalogQueryDto,
  ) {
    const page = query.page ? Number.parseInt(query.page, 10) : 1
    const perPage = query.perPage ? Number.parseInt(query.perPage, 10) : this.defaultPageSize

    if (page < 1 || perPage < 1) {
      throw new BadRequestException('Pagination parameters must be positive integers.')
    }

    const safePerPage = Math.min(perPage, this.maxPageSize)
    const skip = (page - 1) * safePerPage

    const [totalCount, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: safePerPage,
        include: { category: true, subcategory: true },
      }),
    ])

    const hasNextPage = skip + products.length < totalCount

    return {
      items: this.normalizeProducts(products),
      metadata: {
        totalCount,
        page,
        perPage: safePerPage,
        hasNextPage,
        nextCursor: products.length ? products[products.length - 1].id : null,
        sort: query.sort ?? CatalogSortOption.POPULARITY,
      },
    }
  }

  private async fetchWithCursor(
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput[],
    query: CatalogQueryDto,
  ) {
    const limit = query.limit ? Number.parseInt(query.limit, 10) : this.defaultPageSize
    if (limit < 1) {
      throw new BadRequestException('limit must be a positive integer.')
    }

    const safeLimit = Math.min(limit, this.maxPageSize)
    const cursorId = query.cursor !== undefined ? Number.parseInt(query.cursor, 10) : undefined

    if (cursorId !== undefined && Number.isNaN(cursorId)) {
      throw new BadRequestException('cursor must be a valid integer.')
    }

    const findArgs: Prisma.ProductFindManyArgs = {
      where,
      orderBy,
      take: safeLimit + 1,
      include: { category: true, subcategory: true },
    }

    if (cursorId !== undefined) {
      findArgs.cursor = { id: cursorId }
      findArgs.skip = 1
    }

    const products = await this.prisma.product.findMany(findArgs)
    const hasNextPage = products.length > safeLimit
    const slicedProducts = hasNextPage ? products.slice(0, -1) : products

    return {
      items: this.normalizeProducts(slicedProducts),
      metadata: {
        hasNextPage,
        nextCursor: slicedProducts.length ? slicedProducts[slicedProducts.length - 1].id : null,
        limit: safeLimit,
        sort: query.sort ?? CatalogSortOption.POPULARITY,
      },
    }
  }

  private normalizeProducts(records: CatalogProductRecord[]) {
    return records.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      brand: product.brand,
      price: Number(product.price),
      currency: product.currency,
      stockQuantity: product.stockQuantity,
      isAvailable: product.isAvailable,
      isActive: product.isActive,
      popularityScore: product.popularityScore,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
          }
        : null,
      subcategory: product.subcategory
        ? {
            id: product.subcategory.id,
            name: product.subcategory.name,
            slug: product.subcategory.slug,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }))
  }
}
