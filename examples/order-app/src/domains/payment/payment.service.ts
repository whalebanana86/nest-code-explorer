import { Injectable } from '@nestjs/common';
import { PaymentGateway } from './payment-gateway.provider';
import { AppError } from '../../common/app-error';

/** 결제 승인·환불 */
@Injectable()
export class PaymentService {
  constructor(private readonly gateway: PaymentGateway) {}

  /** PG 승인. 거절되면 PAYMENT_DECLINED */
  async authorize(orderId: string, amount: number): Promise<string> {
    const r = await this.gateway.authorize(orderId, amount);
    if (!r.approved) throw new AppError('PAYMENT_DECLINED');
    return r.txId;
  }

  /** 취소 시 전액 환불 */
  async refund(txId: string): Promise<void> {
    await this.gateway.refund(txId);
  }
}
