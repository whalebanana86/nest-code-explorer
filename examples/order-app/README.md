# order-app — nest-code-explorer 예시

작지만 실제 프로젝트 모양을 한 NestJS 주문 서비스다. 탐색기가 잡아내는 관례를 한 벌씩 담았다.

| 관례 | 파일 | 설정 키 |
| --- | --- | --- |
| Controller → Usecase → Service → Repository 계층 | `src/contexts/orders/*`, `src/domains/order/*` | `layers[]` |
| 조회는 RawSQL(`*.sql.ts` named query), 쓰기는 TypeORM(`@InjectRepository`) | `order.sql.ts`, `order.repository.ts` | `sql`, `orm` |
| 큐 경계: Job 이름 상수 + `switch` 라우터 → 프로세서 | `domains/queue/order-queue.names.ts`, `worker/order-worker.manager.ts` | `queue.type = manual-router` |
| Worker 가 다시 큐에 넣는 2단 경로 (ship → notify) | `worker/shipment.processor.ts` | (실행 경로 모드 "큐 건너 이어보기") |
| cron 진입점 | `worker/cleanup.service.ts` | `http.cronDecorator` |
| 도메인 예외 코드 | `common/app-error.ts`, `new AppError('…')` | `errors.className` |
| 외부 시스템 말단 노드 (PG, SMTP, 택배사) | `payment-gateway.provider.ts`, `mail.provider.ts`, `carrier.client.ts` | `externals[]` |
| Guard | `common/guards/api-key.guard.ts` | `layers[]` (Guard) |

## 실행

```bash
cd examples/order-app
npx nest-code-explorer                   # 파일 없이 http://localhost:4545 로 연다
npx nest-code-explorer --open --no-svg   # docs/code-explorer.html 로 남기고 연다
```

의존성 설치는 필요 없다. 탐색기는 소스만 읽는다(앱을 띄우지 않는다). `package.json` 의 의존성은 이 코드가 실제 NestJS 앱으로도 말이 되게 적어 둔 것이다.

## 볼 것

- 구조 모드: `HTTP (Controller)` 그룹에서 `OrdersController` 를 누르면 Usecase → Service → Repository 가 열리고, `Queue / Cron (Worker)` 그룹에는 `OrderWorkerManager`, `CleanupService` 가 있다.
- 실행 경로 모드: `POST /v1/orders` 를 고르면 결제(PG API) → `ship` Job 투입까지, "큐 건너 이어보기" 를 켜면 `ShipmentProcessor` → Carrier API → `notify` Job → `NotifyProcessor` → SMTP 까지 이어진다.
- 메서드 패널: `OrderService.findDetail` 은 `ORDERS`, `ORDER_ITEM` 테이블과 `ORDER_NOT_FOUND` 코드를 보여 준다.
