import { Module } from '@nestjs/common';
import { OrdersController } from './contexts/orders/orders.controller';
import { OrdersUsecase } from './contexts/orders/orders.usecase';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { ApiKeyService } from './domains/auth/api-key.service';
import { OrderService } from './domains/order/order.service';
import { OrderRepository } from './domains/order/order.repository';
import { PaymentService } from './domains/payment/payment.service';
import { PaymentGateway } from './domains/payment/payment-gateway.provider';
import { NotificationService } from './domains/notification/notification.service';
import { MailProvider } from './domains/notification/mail.provider';
import { CarrierClient } from './domains/carrier/carrier.client';
import { OrderQueueService } from './domains/queue/order-queue.service';
import { OrderWorkerManager } from './worker/order-worker.manager';
import { ShipmentProcessor } from './worker/shipment.processor';
import { NotifyProcessor } from './worker/notify.processor';
import { CleanupService } from './worker/cleanup.service';

/** 예시라서 모듈 하나에 전부 등록한다 (실제 프로젝트는 컨텍스트별 모듈) */
@Module({
  controllers: [OrdersController],
  providers: [
    OrdersUsecase, ApiKeyGuard, ApiKeyService,
    OrderService, OrderRepository, PaymentService, PaymentGateway,
    NotificationService, MailProvider, CarrierClient, OrderQueueService,
    OrderWorkerManager, ShipmentProcessor, NotifyProcessor, CleanupService,
  ],
})
export class AppModule {}
