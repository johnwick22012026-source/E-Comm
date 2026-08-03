import { Injectable, BadRequestException } from '@nestjs/common'
import { Prisma, Product } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CatalogQueryDto, CatalogSortOption } from './dto/catalog-query.dto'

type CatalogProductRecord = Product & {
  category: { id: number; name: string; slug: string } | null
  subcategory: { id: number; name: string; slug: string } | null
}

@Injectable()
export class CatalogService {
  private readonly defaultPageSize = 20
  private readonly maxPageSize = 100

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
    // Stable tied results by id
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
