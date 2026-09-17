import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity } from './order.entity';

/** ORDERS 쓰기 (TypeORM). 조회는 OrderSql */
@Injectable()
export class OrderRepository {
  constructor(@InjectRepository(OrderEntity) private readonly repo: Repository<OrderEntity>) {}

  /** 새 주문 저장 */
  async save(entity: Partial<OrderEntity>): Promise<OrderEntity> {
    return this.repo.save(this.repo.create(entity));
  }

  /** 조건부 상태 전이. 바뀐 행이 없으면 false */
  async transitionStatus(orderId: string, from: string, to: string): Promise<boolean> {
    const r = await this.repo.update({ orderId, statusCode: from }, { statusCode: to });
    return (r.affected ?? 0) > 0;
  }

  /** 오래된 DRAFT 삭제 */
  async deleteMany(orderIds: string[]): Promise<number> {
    const r = await this.repo.delete(orderIds);
    return r.affected ?? 0;
  }
}
