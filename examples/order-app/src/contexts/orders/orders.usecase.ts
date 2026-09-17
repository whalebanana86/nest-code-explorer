import { Injectable } from '@nestjs/common';
import { OrderService } from '../../domains/order/order.service';
import { PaymentService } from '../../domains/payment/payment.service';
import { NotificationService } from '../../domains/notification/notification.service';
import { OrderQueueService } from '../../domains/queue/order-queue.service';
import { OrderDetail } from '../../domains/order/order.types';
import { CreateOrderRequest, CreateOrderResponse } from './orders.dto';

/** 주문 API 유스케이스. 트랜잭션 경계는 여기서만 연다 */
@Injectable()
export class OrdersUsecase {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly orderQueue: OrderQueueService,
  ) {}

  /** 주문 생성 → 결제 승인 → PAID → 배송 Job 투입 */
  async create(tenantId: string, req: CreateOrderRequest): Promise<CreateOrderResponse> {
    const orderId = await this.orderService.create({ tenantId, items: req.items });
    const total = req.items.reduce((s, i) => s + i.qty * i.price, 0);
    await this.paymentService.authorize(orderId, total);
    await this.orderService.markPaid(orderId);
    await this.orderQueue.enqueueShip(orderId);
    return { orderId };
  }

  /** 주문 상세 */
  async get(tenantId: string, orderId: string): Promise<OrderDetail> {
    return this.orderService.findDetail(tenantId, orderId);
  }

  /** 취소 → 환불 → 취소 메일 */
  async cancel(tenantId: string, orderId: string, email: string): Promise<void> {
    const detail = await this.orderService.findDetail(tenantId, orderId);
    await this.orderService.cancel(orderId);
    await this.paymentService.refund(`tx-${detail.orderId}`);
    await this.notificationService.sendCanceled(email, orderId);
  }
}
