import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { OrderJobName } from './order-queue.names';

/** BullMQ 큐에 Job 을 넣는다. 결정적 jobId 로 중복 투입을 막는다 */
@Injectable()
export class OrderQueueService {
  private readonly queue = new Queue('orders');

  /** 배송 요청 Job */
  async enqueueShip(orderId: string): Promise<void> {
    await this.queue.add(OrderJobName.SHIP, { orderId }, { jobId: `ship:${orderId}` });
  }

  /** 알림 Job */
  async enqueueNotify(orderId: string, email: string): Promise<void> {
    await this.queue.add(OrderJobName.NOTIFY, { orderId, email }, { jobId: `notify:${orderId}` });
  }
}
