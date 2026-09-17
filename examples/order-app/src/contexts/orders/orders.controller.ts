import { Body, Controller, Get, Param, Post, Req, UseGuards, Version } from '@nestjs/common';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { OrdersUsecase } from './orders.usecase';
import { CreateOrderRequest, CreateOrderResponse } from './orders.dto';

/** 주문 API. 로직 없이 Usecase 만 부른다 */
@Controller('orders')
@UseGuards(ApiKeyGuard)
export class OrdersController {
  constructor(private readonly ordersUsecase: OrdersUsecase) {}

  @Version('1')
  @Post()
  create(@Req() req, @Body() body: CreateOrderRequest): Promise<CreateOrderResponse> {
    return this.ordersUsecase.create(req.tenantId, body);
  }

  @Version('1')
  @Get(':id')
  get(@Req() req, @Param('id') id: string) {
    return this.ordersUsecase.get(req.tenantId, id);
  }

  @Version('1')
  @Post(':id/cancel')
  cancel(@Req() req, @Param('id') id: string, @Body() body: { email: string }): Promise<void> {
    return this.ordersUsecase.cancel(req.tenantId, id, body.email);
  }
}
