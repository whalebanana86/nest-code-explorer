import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ORDERS')
export class OrderEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'ORDER_ID' })
  orderId: string;

  @Column({ name: 'TENANT_ID' })
  tenantId: string;

  @Column({ name: 'STATUS_CODE' })
  statusCode: string;

  @Column({ name: 'TOTAL_AMOUNT' })
  totalAmount: number;
}
