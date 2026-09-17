import { Injectable } from '@nestjs/common';

/** 외부 PG HTTP 클라이언트 (탐색기: externals 로 말단 노드) */
@Injectable()
export class PaymentGateway {
  async authorize(orderId: string, amount: number): Promise<{ approved: boolean; txId: string }> {
    return { approved: amount > 0, txId: `tx-${orderId}` };
  }

  async refund(txId: string): Promise<void> {}
}
