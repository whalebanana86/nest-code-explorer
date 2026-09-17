import { Injectable } from '@nestjs/common';
import { MailProvider } from './mail.provider';

/** 고객 알림 메일 */
@Injectable()
export class NotificationService {
  constructor(private readonly mail: MailProvider) {}

  /** 배송 시작 안내 */
  async sendShipped(email: string, orderId: string): Promise<void> {
    await this.mail.send(email, 'Your order has shipped', `Order ${orderId} is on its way.`);
  }

  /** 취소 안내 */
  async sendCanceled(email: string, orderId: string): Promise<void> {
    await this.mail.send(email, 'Order canceled', `Order ${orderId} was canceled.`);
  }
}
