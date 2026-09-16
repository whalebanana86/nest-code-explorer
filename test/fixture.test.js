/**
 * fixtures/bullmq-app 을 분석해 라우트·큐 경계(nestjs-bullmq 어댑터)·호출·에러코드·외부 시스템이 뽑히는지 확인한다.
 *   npm test  (node:test, 외부 의존 없음)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { run } = require('../dist/analyze.js');

const fixture = path.join(__dirname, '../fixtures/bullmq-app');

function dataOf(html) {
  const m = html.match(/const DATA = (\{[\s\S]*?\});\nconst byName/);
  return JSON.parse(m[1]);
}

test('bullmq fixture: 라우트, 큐 경계, 호출, 에러코드, 외부 시스템', () => {
  fs.mkdirSync(path.join(fixture, 'out'), { recursive: true });
  const res = run({ cwd: fixture, configPath: path.join(fixture, 'code-explorer.config.json'), svg: false });
  assert.equal(res.classes, 5);
  const data = dataOf(fs.readFileSync(res.explorer, 'utf8'));
  const by = Object.fromEntries(data.classes.map((c) => [c.name, c]));

  // 라우트: @Controller('audio') + @Post('transcode') + @Version('1')
  const transcode = by.AudioController.methods.find((m) => m.name === 'transcode');
  assert.deepEqual(transcode.route, { method: 'POST', path: '/v1/audio/transcode' });
  assert.deepEqual(transcode.calls, [{ cls: 'AudioService', method: 'enqueueTranscode' }]);

  // 큐 경계: @InjectQueue('audio').add('transcode') → 핸들러는 @Processor('audio').process (WorkerHost)
  assert.deepEqual(data.jobHandlers, { audio: { cls: 'AudioProcessor', method: 'process' } });
  const enq = by.AudioService.methods.find((m) => m.name === 'enqueueTranscode');
  assert.deepEqual(enq.jobs, ['audio']);
  assert.deepEqual(enq.errors, ['AUDIO.FILE_REQUIRED']);
  assert.deepEqual(by.AudioService.methods.find((m) => m.name === 'enqueueMany').jobs, ['audio']);

  // 계층·주입·외부
  assert.equal(by.AudioProcessor.layer, 'Worker');
  assert.deepEqual(by.AudioProcessor.deps, ['AudioRepository', 'MailProvider']);
  assert.equal(by.MailProvider.external, 'SMTP');
  assert.equal(by.MailProvider.externalTerminal, true);
  assert.ok(!('Controller' in by), '스텁 파일(skip 계층)은 제외');

  // 기본값: errors.className 을 설정으로 덮었고, 생략한 sql/orm 은 기본값으로 동작 (테이블 없음)
  assert.deepEqual(by.AudioRepository.methods.map((m) => m.tables), [[], []]);
  assert.ok(fs.existsSync(res.markdown));
});
