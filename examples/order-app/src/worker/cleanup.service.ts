import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrderService } from '../domains/order/order.service';

/** 새벽 배치: 하루 지난 DRAFT 주문 정리 (탐색기: cron 진입점) */
@Injectable()
export class CleanupService {
  constructor(private readonly orderService: OrderService) {}

  @Cron('0 3 * * *')
  async purgeStaleDrafts(): Promise<void> {
    await this.orderService.purgeStaleDrafts();
  }
}
