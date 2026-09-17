#!/usr/bin/env node
/**
 * nest-code-explorer CLI
 *   nest-code-explorer [--config code-explorer.config.json] [--no-svg] [--open]
 *   nest-code-explorer --init [--force]
 *   nest-code-explorer --serve [--port 4545] [--open]
 * - --serve:  파일을 남기지 않고 기동 때 한 번 분석해 http://localhost:<port>/ 로 보여 준다 (온보딩용, gitignore 불필요)
 * - 프로젝트 루트(cwd)의 tsconfig.json 과 설정 파일을 읽어 docs/code-explorer.html 과 code-map.md 를 만든다
 * - 설정 파일이 없으면(그리고 --config 로 지정하지 않았으면) 기본값으로 돈다
 * - --init:   기본값 전체를 code-explorer.config.json 으로 쓴다 (이미 있으면 --force 없이는 건드리지 않음)
 * - --no-svg: mermaid-cli 로 SVG 를 그리지 않는다 (빠름)
 * - --open:   생성한 탐색기 HTML 을 기본 브라우저로 연다
 */
const path = require('path');
const http = require('http');
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

const USAGE = [
  'usage: nest-code-explorer [--config <file>] [--no-svg] [--open] [--cwd <dir>]',
  '       nest-code-explorer --init [--config <file>] [--force]   # 기본 설정 파일 생성',
  '       nest-code-explorer --serve [--port <n>] [--open]          # 파일 없이 로컬 서버로 보기 (기본 포트 4545)',
].join('\n');

const args = process.argv.slice(2);
const opt = { config: 'code-explorer.config.json', explicitConfig: false, svg: true, open: false, init: false, force: false, serve: false, port: 4545, cwd: process.cwd() };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config' || a === '-c') { opt.config = args[++i]; opt.explicitConfig = true; }
  else if (a.startsWith('--config=')) { opt.config = a.slice('--config='.length); opt.explicitConfig = true; }
  else if (a === '--init') opt.init = true;
  else if (a === '--serve') opt.serve = true;
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

if (opt.serve) {
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
    if (opt.open) openUrl(url);
  });
  server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `port ${opt.port} is in use — try --port <n>` : String(e)); process.exit(1); });
  return;
}

const result = run({ cwd: path.resolve(opt.cwd), configPath: existsSync(configPath) ? configPath : undefined, svg: opt.svg, packageDir: path.join(__dirname, '..') });

if (opt.open) openUrl(result.explorer);
