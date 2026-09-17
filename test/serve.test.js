/**
 * 기본 모드: 파일을 쓰지 않고 HTTP 로 탐색기를 내주는지 확인한다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

const cli = path.join(__dirname, '../bin/cli.js');
const os = require('os');

test('CLI 기본 모드(--port 0 --no-open): 파일 없이 HTML 을 내준다', async () => {
  // 다른 테스트가 fixtures/bullmq-app/out 을 만들므로 임시 사본에서 돌려 "파일이 안 생김"을 확인한다
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nce-serve-'));
  fs.cpSync(path.join(__dirname, '../fixtures/bullmq-app'), fixture, { recursive: true, filter: (src) => !/[\/](out|docs)([\/]|$)/.test(src) });
  const child = spawn('node', [cli, '--port', '0', '--no-open', '--cwd', fixture]);
  try {
    const url = await new Promise((resolve, reject) => {
      let out = '';
      child.stdout.on('data', (d) => { out += d; const m = out.match(/at (http:\/\/localhost:\d+\/)/); if (m) resolve(m[1]); });
      child.stderr.on('data', (d) => { out += d; });
      child.on('exit', (code) => reject(new Error(`exited ${code}: ${out}`)));
      setTimeout(() => reject(new Error(`timeout: ${out}`)), 20000);
    });
    const body = await new Promise((resolve, reject) => http.get(url, (res) => { let b = ''; res.on('data', (d) => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], b })); }).on('error', reject));
    assert.equal(body.status, 200);
    assert.match(body.type, /text\/html/);
    assert.match(body.b, /<h1>nce-serve-[^<]* · code explorer<\/h1>/); // 제목 = 임시 폴더 이름
    assert.match(body.b, /const DATA = \{/);
    assert.ok(!fs.existsSync(path.join(fixture, 'out')), 'out/ 이 생기면 안 된다');
    assert.ok(!fs.existsSync(path.join(fixture, 'docs')), 'docs/ 가 생기면 안 된다');
    const nf = await new Promise((resolve) => http.get(url + 'nope', (res) => resolve(res.statusCode)));
    assert.equal(nf, 404);
  } finally {
    child.kill();
  }
});
