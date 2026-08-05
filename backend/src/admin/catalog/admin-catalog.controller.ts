import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { CatalogService } from '../../catalog/catalog.service'
import { AdminCatalogService } from './admin-catalog.service'
import { AdminGuard } from '../guards/admin.guard'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto'
import { CreateProductImageDto } from './dto/create-product-image.dto'

const adminValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
})

@Controller('admin/catalog')
@UseGuards(AdminGuard)
export class AdminCatalogController {
  constructor(
    private readonly adminCatalogService: AdminCatalogService,
    private readonly catalogService: CatalogService,
  ) {}

  @Post('categories')
  @UsePipes(adminValidationPipe)
  async createCategory(@Body() body: CreateCategoryDto) {
    return this.adminCatalogService.createCategory(body)
  }

  @Patch('categories/:id')
  @UsePipes(adminValidationPipe)
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCategoryDto) {
    return this.adminCatalogService.updateCategory(id, body)
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminCatalogService.deleteCategory(id)
  }

  @Post('products')
  @UsePipes(adminValidationPipe)
  async createProduct(@Body() body: CreateProductDto) {
    return this.adminCatalogService.createProduct(body)
  }

  @Get('products/:id')
  async getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.getProductDetail(id)
  }

  @Patch('products/:id')
  @UsePipes(adminValidationPipe)
  async updateProduct(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductDto) {
    return this.adminCatalogService.updateProduct(id, body)
  }

  @Patch('products/:id/inventory')
  @UsePipes(adminValidationPipe)
  async updateInventory(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateProductInventoryDto) {
    return this.adminCatalogService.updateInventory(id, body)
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.adminCatalogService.softDeleteProduct(id)
  }

  @Post('products/:id/images')
  @UsePipes(adminValidationPipe)
  async addProductImage(@Param('id', ParseIntPipe) id: number, @Body() body: CreateProductImageDto) {
    return this.adminCatalogService.addProductImage(id, body)
  }

  @Delete('products/:id/images/:imageId')
  async removeProductImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.adminCatalogService.removeProductImage(id, imageId)
  }
}
