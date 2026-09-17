import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from '../domains/order/order.service';
import { CarrierClient } from '../domains/carrier/carrier.client';
import { OrderQueueService } from '../domains/queue/order-queue.service';

/** ship Job: 택배 수거 요청 → SHIPPED 전이 → notify Job 투입 */
@Injectable()
export class ShipmentProcessor {
  constructor(
    private readonly orderService: OrderService,
    private readonly carrier: CarrierClient,
    private readonly orderQueue: OrderQueueService,
  ) {}

  async process(job: Job<{ orderId: string; email: string }>): Promise<void> {
    const { orderId, email } = job.data;
    await this.carrier.requestPickup(orderId);
    await this.orderService.markShipped(orderId);
    await this.orderQueue.enqueueNotify(orderId, email);
  }
}
