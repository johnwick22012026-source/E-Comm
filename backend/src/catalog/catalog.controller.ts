import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { CatalogQueryDto } from './dto/catalog-query.dto'

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
}
