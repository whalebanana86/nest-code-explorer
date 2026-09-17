import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationService } from '../domains/notification/notification.service';

/** notify Job: 배송 시작 메일 */
@Injectable()
export class NotifyProcessor {
  constructor(private readonly notificationService: NotificationService) {}

  async process(job: Job<{ orderId: string; email: string }>): Promise<void> {
    await this.notificationService.sendShipped(job.data.email, job.data.orderId);
  }
}
