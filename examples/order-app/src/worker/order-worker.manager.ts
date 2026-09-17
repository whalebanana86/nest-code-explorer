import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { OrderJobName } from '../domains/queue/order-queue.names';
import { ShipmentProcessor } from './shipment.processor';
import { NotifyProcessor } from './notify.processor';

/** orders 큐 Worker 를 띄우고 Job 이름별로 프로세서에 넘긴다 (탐색기: routerClass) */
@Injectable()
export class OrderWorkerManager implements OnModuleInit {
  private worker?: Worker;

  constructor(
    private readonly shipmentProcessor: ShipmentProcessor,
    private readonly notifyProcessor: NotifyProcessor,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker('orders', (job) => this.route(job), { concurrency: 4 });
  }

  /** Job 이름 → 프로세서 */
  private route(job: Job): Promise<void> {
    switch (job.name) {
      case OrderJobName.SHIP:
        return this.shipmentProcessor.process(job);
      case OrderJobName.NOTIFY:
        return this.notifyProcessor.process(job);
      default:
        throw new Error(`unknown job: ${job.name}`);
    }
  }
}
