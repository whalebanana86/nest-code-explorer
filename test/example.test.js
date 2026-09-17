/**
 * examples/order-app 이 README 에 적은 대로 분석되는지 고정한다 (manual-router 큐, SQL 테이블, 엔티티 테이블, 에러코드, 외부 시스템, cron).
 *   npm test  (node:test, 외부 의존 없음 — 예시 프로젝트의 npm 의존성은 설치하지 않아도 된다)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { run } = require('../dist/analyze.js');

const example = path.join(__dirname, '../examples/order-app');

test('order-app 예시: 계층·라우트·큐 경계·테이블·에러·외부 시스템·cron', () => {
  const res = run({ cwd: example, configPath: path.join(example, 'code-explorer.config.json'), svg: false });
  const html = fs.readFileSync(res.explorer, 'utf8');
  assert.match(html, /<title>order-app 코드 탐색기<\/title>/);
  assert.match(html, /<h1>order-app 코드 탐색기<\/h1>/);
  const data = JSON.parse(html.match(/const DATA = (\{[\s\S]*?\});\nconst byName/)[1]);
  const by = Object.fromEntries(data.classes.map((c) => [c.name, c]));
  const method = (cls, name) => by[cls].methods.find((m) => m.name === name);

  // 계층 (DTO/SQL/Entity/AppError/모듈/main 은 제외)
  assert.deepEqual(
    Object.fromEntries(data.classes.map((c) => [c.name, c.layer])),
    {
      OrdersController: 'Controller', OrdersUsecase: 'Usecase', ApiKeyGuard: 'Guard', ApiKeyService: 'Service',
      OrderRepository: 'Repository', OrderService: 'Service', PaymentGateway: 'Service', PaymentService: 'Service',
      MailProvider: 'Service', NotificationService: 'Service', CarrierClient: 'Service', OrderQueueService: 'Service',
      OrderWorkerManager: 'Worker', ShipmentProcessor: 'Worker', NotifyProcessor: 'Worker', CleanupService: 'Worker',
    },
  );
  assert.deepEqual(data.layers.filter((l) => l.entry).map((l) => l.name), ['Controller', 'Worker']);

  // 라우트: @Controller('orders') + @Version('1') + @Post()/@Get(':id')
  assert.deepEqual(method('OrdersController', 'create').route, { method: 'POST', path: '/v1/orders' });
  assert.deepEqual(method('OrdersController', 'get').route, { method: 'GET', path: '/v1/orders/:id' });
  assert.deepEqual(method('OrdersController', 'cancel').route, { method: 'POST', path: '/v1/orders/:id/cancel' });

  // 호출 사슬 + 큐 투입: Usecase.create 는 결제 승인 후 ship Job 을 넣는다
  const create = method('OrdersUsecase', 'create');
  assert.deepEqual(create.calls.map((c) => `${c.cls}.${c.method}`),
    ['OrderService.create', 'PaymentService.authorize', 'OrderService.markPaid', 'OrderQueueService.enqueueShip']);
  assert.deepEqual(method('OrderQueueService', 'enqueueShip').jobs, ['ship']);
  assert.deepEqual(method('OrderQueueService', 'enqueueNotify').jobs, ['notify']);

  // 큐 경계 (manual-router): switch (job.name) { case OrderJobName.SHIP: this.shipmentProcessor.process(job) }
  assert.deepEqual(data.jobHandlers, {
    ship: { cls: 'ShipmentProcessor', method: 'process' },
    notify: { cls: 'NotifyProcessor', method: 'process' },
  });
  // Worker 가 다시 큐에 넣는 2단 경로
  assert.deepEqual(method('ShipmentProcessor', 'process').calls.map((c) => c.cls), ['CarrierClient', 'OrderService', 'OrderQueueService']);

  // 테이블: RawSQL(FROM/JOIN) 과 @InjectRepository(OrderEntity) → @Entity('ORDERS')
  assert.deepEqual(method('OrderService', 'findDetail').sql, ['OrderSql.findDetail']);
  assert.deepEqual(method('OrderService', 'findDetail').tables, ['ORDERS', 'ORDER_ITEM']);
  assert.deepEqual(method('ApiKeyService', 'verify').tables, ['API_KEY']);
  assert.equal(by.OrderRepository.table, 'ORDERS');

  // 에러 코드
  assert.deepEqual(method('OrderService', 'findDetail').errors, ['ORDER_NOT_FOUND']);
  assert.deepEqual(method('PaymentService', 'authorize').errors, ['PAYMENT_DECLINED']);
  assert.deepEqual(method('ApiKeyGuard', 'canActivate').errors, ['AUTH_KEY_MISSING']);

  // 외부 시스템 (말단)
  for (const [cls, label] of [['PaymentGateway', 'PG API'], ['MailProvider', 'SMTP'], ['CarrierClient', 'Carrier API']]) {
    assert.equal(by[cls].external, label, cls);
    assert.equal(by[cls].externalTerminal, true, cls);
  }

  // cron 진입점
  assert.equal(method('CleanupService', 'purgeStaleDrafts').cron, '0 3 * * *');

  // 한글 JSDoc 이 설명으로 붙는다
  assert.equal(method('OrderService', 'markPaid').description, 'DRAFT → PAID');

  fs.rmSync(path.join(example, 'docs'), { recursive: true, force: true });
});
