/**
 * --init 이 기본 설정 파일을 만들고, 설정 파일 없이도 기본값으로 분석이 도는지 확인한다.
 *   npm test  (node:test, 외부 의존 없음)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { run, initConfig, defaultConfig } = require('../dist/analyze.js');

const cli = path.join(__dirname, '../bin/cli.js');
const fixture = path.join(__dirname, '../fixtures/bullmq-app');

test('initConfig: 기본값 전체 + $comment 를 쓰고, 있으면 force 없이는 안 덮어쓴다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nce-init-'));
  const file = path.join(dir, 'code-explorer.config.json');

  assert.deepEqual(initConfig(file), { file, created: true });
  const written = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(typeof written.$comment, 'string');
  delete written.$comment;
  assert.deepEqual(written, defaultConfig());
  assert.equal(written.queue.type, 'none');
  assert.equal(written.errors.className, 'HttpException');

  fs.writeFileSync(file, '{"include":["lib"]}');
  assert.deepEqual(initConfig(file), { file, created: false });
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { include: ['lib'] });
  assert.equal(initConfig(file, { force: true }).created, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')).include, ['src']);
});

test('CLI --init: 파일을 만들고 두 번째는 already exists', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nce-cli-'));
  const out1 = execFileSync('node', [cli, '--init', '--cwd', dir], { encoding: 'utf8' });
  assert.match(out1, /^created /);
  assert.ok(fs.existsSync(path.join(dir, 'code-explorer.config.json')));
  const out2 = execFileSync('node', [cli, '--init', '--cwd', dir], { encoding: 'utf8' });
  assert.match(out2, /^already exists/);
});

test('설정 파일 없이 run: 기본값(큐 없음)으로 분석되고 output 은 기본 경로', () => {
  fs.rmSync(path.join(fixture, 'docs'), { recursive: true, force: true }); // 출력 디렉터리가 없어도 만들어야 한다
  const res = run({ cwd: fixture, configPath: undefined, svg: false });
  assert.equal(res.explorer, path.join(fixture, 'docs/code-explorer.html'));
  assert.ok(fs.existsSync(path.join(fixture, 'docs/code-map.md')));
  const html = fs.readFileSync(res.explorer, 'utf8');
  assert.match(html, /<h1>bullmq-app · code explorer<\/h1>/); // title 미설정, package.json 도 없음 → 폴더 이름
  const data = JSON.parse(html.match(/const DATA = (\{[\s\S]*?\});\nconst byName/)[1]);
  const names = data.classes.map((c) => c.name);
  // 기본 exclude 는 stubs.ts 를 빼지 않으므로 픽스처 설정(5개)보다 많다. 핵심 클래스와 라우트는 그대로 뽑혀야 한다
  assert.ok(res.classes >= 5, `classes=${res.classes}`);
  for (const n of ['AudioController', 'AudioService', 'AudioProcessor', 'AudioRepository', 'MailProvider']) assert.ok(names.includes(n), n);
  const transcode = data.classes.find((c) => c.name === 'AudioController').methods.find((m) => m.name === 'transcode');
  assert.deepEqual(transcode.route, { method: 'POST', path: '/v1/audio/transcode' });
  assert.deepEqual(data.jobHandlers, {}); // queue: none
  fs.rmSync(path.join(fixture, 'docs'), { recursive: true, force: true });
});
