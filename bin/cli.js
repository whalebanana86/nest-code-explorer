#!/usr/bin/env node
/**
 * nest-code-explorer CLI
 *   nest-code-explorer                      # 기본: 파일을 남기지 않고 기동 때 한 번 분석해 http://localhost:4545/ 로 열어 준다
 *   nest-code-explorer --open               # 파일 생성(docs/code-explorer.html, code-map.md, diagrams) 후 생성한 파일을 연다
 *   nest-code-explorer --write [--no-svg]   # 파일 생성만 (CI)
 *   nest-code-explorer --init [--force]     # 기본 설정 파일 생성
 * - --no-open: 브라우저를 열지 않는다 (기본 모드면 주소만 출력)
 * - --port:    기본 모드 포트 (4545)
 * - --config:  설정 파일 (없으면 기본값)
 */
const path = require('path');
const http = require('http');
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

const USAGE = [
  'usage: nest-code-explorer [--port <n>] [--no-open] [--config <file>] [--cwd <dir>]   # 기본: 파일 없이 http://localhost:4545 로 열기',
  '       nest-code-explorer --open [--no-svg]                                     # 파일 생성 후 생성한 파일 열기',
  '       nest-code-explorer --write [--no-svg]                                    # 파일 생성만 (CI)',
  '       nest-code-explorer --init [--force]                                      # 기본 설정 파일 생성',
].join('\n');

const args = process.argv.slice(2);
const opt = { config: 'code-explorer.config.json', explicitConfig: false, svg: true, open: false, write: false, noOpen: false, init: false, force: false, port: 4545, cwd: process.cwd() };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config' || a === '-c') { opt.config = args[++i]; opt.explicitConfig = true; }
  else if (a.startsWith('--config=')) { opt.config = a.slice('--config='.length); opt.explicitConfig = true; }
  else if (a === '--init') opt.init = true;
  else if (a === '--serve') { console.error('--serve 는 0.5.0 부터 기본 동작입니다. 옵션 없이 실행하세요: npx nest-code-explorer'); process.exit(1); }
  else if (a === '--write') opt.write = true;
  else if (a === '--no-open') opt.noOpen = true;
  else if (a === '--port') opt.port = Number(args[++i]);
  else if (a.startsWith('--port=')) opt.port = Number(a.slice('--port='.length));
  else if (a === '--force') opt.force = true;
  else if (a === '--no-svg') opt.svg = false;
  else if (a === '--open') opt.open = true;
  else if (a === '--cwd') opt.cwd = args[++i];
  else if (a === '-h' || a === '--help') {
    console.log(USAGE);
    process.exit(0);
  } else {
    console.error(`unknown option: ${a}\n${USAGE}`);
    process.exit(1);
  }
}

const { run, initConfig } = require(path.join(__dirname, '../dist/analyze.js'));
const configPath = path.resolve(opt.cwd, opt.config);

if (opt.init) {
  const r = initConfig(configPath, { force: opt.force });
  if (r.created) console.log(`created ${path.relative(process.cwd(), r.file) || r.file} — 필요한 줄만 고친 뒤 npx nest-code-explorer --open`);
  else console.log(`already exists: ${path.relative(process.cwd(), r.file) || r.file} (덮어쓰려면 --force)`);
  process.exit(0);
}

if (!existsSync(configPath)) {
  if (opt.explicitConfig) {
    console.error(`config not found: ${configPath}`);
    process.exit(1);
  }
  console.log(`설정 파일 없음 (${opt.config}) → 기본값으로 실행. 프로젝트 규약에 맞추려면: npx nest-code-explorer --init`);
}
const openUrl = (target) => {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawnSync(cmd, [target], { stdio: 'ignore', shell: process.platform === 'win32' });
};

if (!opt.open && !opt.write) {
  // 기동 때 한 번 분석해 메모리에 들고, 파일은 쓰지 않는다. 다시 분석하려면 서버를 다시 띄운다.
  const started = Date.now();
  const { html, classes } = run({ cwd: path.resolve(opt.cwd), configPath: existsSync(configPath) ? configPath : undefined, svg: false, write: false, packageDir: path.join(__dirname, '..') });
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?') || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
    } else { res.writeHead(404); res.end('not found'); }
  });
  server.listen(opt.port, '127.0.0.1', () => {
    const url = `http://localhost:${server.address().port}/`;
    console.log(`serving ${classes} classes at ${url}  (analyzed in ${((Date.now() - started) / 1000).toFixed(1)}s, no files written — Ctrl+C to stop)`);
    if (!opt.noOpen) openUrl(url);
  });
  server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `port ${opt.port} is in use — try --port <n>` : String(e)); process.exit(1); });
  return;
}

const result = run({ cwd: path.resolve(opt.cwd), configPath: existsSync(configPath) ? configPath : undefined, svg: opt.svg, packageDir: path.join(__dirname, '..') });

if (opt.open && !opt.noOpen) openUrl(result.explorer);
