import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { AdminGuard } from '../guards/admin.guard'
import { adminValidationPipe } from '../admin-validation.pipe'
import { AdminPromotionsService } from './admin-promotions.service'
import { ChangeStatusDto } from './dto/change-status.dto'
import { CreatePromotionDto } from './dto/create-promotion.dto'
import { ListPromotionsQueryDto } from './dto/list-promotions-query.dto'
import { UpdatePromotionDto } from './dto/update-promotion.dto'

@Controller('admin/promotions')
@UseGuards(AdminGuard)
export class AdminPromotionsController {
  constructor(private readonly adminPromotionsService: AdminPromotionsService) {}

  @Post()
  @UsePipes(adminValidationPipe)
  create(@Body() body: CreatePromotionDto) {
    return this.adminPromotionsService.createPromotion(body)
  }

  @Get()
  list(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: ListPromotionsQueryDto) {
    return this.adminPromotionsService.listPromotions(query)
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.adminPromotionsService.getPromotion(id)
  }

  @Patch(':id')
  @UsePipes(adminValidationPipe)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdatePromotionDto) {
    return this.adminPromotionsService.updatePromotion(id, body)
  }

  @Patch(':id/status')
  @UsePipes(adminValidationPipe)
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() body: ChangeStatusDto) {
    return this.adminPromotionsService.changePromotionStatus(id, body.isActive)
  }
}
