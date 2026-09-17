import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderRepository } from './order.repository';
import { OrderSql } from './order.sql';
import { CreateOrderCommand, OrderDetail } from './order.types';
import { AppError } from '../../common/app-error';

/** 주문 도메인 규칙: 생성·상태 전이·조회 */
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly dataSource: DataSource,
  ) {}

  /** 금액을 합산해 DRAFT 주문을 만든다 */
  async create(cmd: CreateOrderCommand): Promise<string> {
    if (cmd.items.length === 0) throw new AppError('ORDER_EMPTY');
    const totalAmount = cmd.items.reduce((s, i) => s + i.qty * i.price, 0);
    const saved = await this.orderRepository.save({ tenantId: cmd.tenantId, statusCode: 'DRAFT', totalAmount });
    return String(saved.orderId);
  }

  /** 주문 상세 (테넌트로 한정) */
  async findDetail(tenantId: string, orderId: string): Promise<OrderDetail> {
    const rows = await this.dataSource.query(OrderSql.findDetail(), [orderId, tenantId]);
    if (rows.length === 0) throw new AppError('ORDER_NOT_FOUND');
    return { orderId, statusCode: rows[0].statusCode, totalAmount: rows[0].totalAmount, items: rows.map((r) => ({ sku: r.sku, qty: r.qty })) };
  }

  /** DRAFT → PAID */
  async markPaid(orderId: string): Promise<void> {
    const ok = await this.orderRepository.transitionStatus(orderId, 'DRAFT', 'PAID');
    if (!ok) throw new AppError('ORDER_INVALID_STATE');
  }

  /** PAID → SHIPPED */
  async markShipped(orderId: string): Promise<void> {
    const ok = await this.orderRepository.transitionStatus(orderId, 'PAID', 'SHIPPED');
    if (!ok) throw new AppError('ORDER_INVALID_STATE');
  }

  /** PAID → CANCELED. 이미 배송됐으면 실패 */
  async cancel(orderId: string): Promise<void> {
    const ok = await this.orderRepository.transitionStatus(orderId, 'PAID', 'CANCELED');
    if (!ok) throw new AppError('ORDER_ALREADY_SHIPPED');
  }

  /** 하루 지난 DRAFT 를 지운다. 지운 건수 반환 */
  async purgeStaleDrafts(): Promise<number> {
    const rows: { orderId: string }[] = await this.dataSource.query(OrderSql.findStaleDrafts());
    if (rows.length === 0) return 0;
    return this.orderRepository.deleteMany(rows.map((r) => r.orderId));
  }
}
