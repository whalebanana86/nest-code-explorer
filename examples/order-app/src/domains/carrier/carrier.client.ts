import { Injectable } from '@nestjs/common';

/** 택배사 API 클라이언트 (탐색기: externals 로 말단 노드) */
@Injectable()
export class CarrierClient {
  async requestPickup(orderId: string): Promise<{ trackingNo: string }> {
    return { trackingNo: `TRK-${orderId}` };
  }
}
