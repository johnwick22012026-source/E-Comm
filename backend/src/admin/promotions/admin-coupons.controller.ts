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
import { CreateCouponDto } from './dto/create-coupon.dto'
import { ListCouponsQueryDto } from './dto/list-coupons-query.dto'
import { UpdateCouponDto } from './dto/update-coupon.dto'

@Controller('admin/coupons')
@UseGuards(AdminGuard)
export class AdminCouponsController {
  constructor(private readonly adminPromotionsService: AdminPromotionsService) {}

  @Post()
  @UsePipes(adminValidationPipe)
  create(@Body() body: CreateCouponDto) {
    return this.adminPromotionsService.createCoupon(body)
  }

  @Get()
  list(@Query(new ValidationPipe({ transform: true, whitelist: true })) query: ListCouponsQueryDto) {
    return this.adminPromotionsService.listCoupons(query)
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.adminPromotionsService.getCoupon(id)
  }

  @Patch(':id')
  @UsePipes(adminValidationPipe)
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCouponDto) {
    return this.adminPromotionsService.updateCoupon(id, body)
  }

  @Patch(':id/status')
  @UsePipes(adminValidationPipe)
  changeStatus(@Param('id', ParseIntPipe) id: number, @Body() body: ChangeStatusDto) {
    return this.adminPromotionsService.changeCouponStatus(id, body.isActive)
  }
}
