import { Controller, Get, Query, Param, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { CatalogQueryDto } from './dto/catalog-query.dto'
import { RelatedProductsQueryDto } from './dto/related-products-query.dto'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async browse(@Query() query: CatalogQueryDto) {
    return this.catalogService.browse(query)
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getProductDetail(id)
  }

  @Get('products/:id/related')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async getRelated(@Param('id', ParseIntPipe) id: number, @Query() query: RelatedProductsQueryDto) {
    const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined
    const items = await this.catalogService.getRelatedProducts(id, limit)
    return {
      items,
      metadata: {
        requestedLimit: limit ?? undefined,
        returned: items.length,
      },
    }
  }
}
