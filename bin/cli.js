#!/usr/bin/env node
/**
 * nest-code-explorer CLI
 *   nest-code-explorer [--config code-explorer.config.json] [--no-svg] [--open]
 *   nest-code-explorer --init [--force]
 * - 프로젝트 루트(cwd)의 tsconfig.json 과 설정 파일을 읽어 docs/code-explorer.html 과 code-map.md 를 만든다
 * - 설정 파일이 없으면(그리고 --config 로 지정하지 않았으면) 기본값으로 돈다
 * - --init:   기본값 전체를 code-explorer.config.json 으로 쓴다 (이미 있으면 --force 없이는 건드리지 않음)
 * - --no-svg: mermaid-cli 로 SVG 를 그리지 않는다 (빠름)
 * - --open:   생성한 탐색기 HTML 을 기본 브라우저로 연다
 */
const path = require('path');
const { existsSync } = require('fs');
const { spawnSync } = require('child_process');

const USAGE = [
  'usage: nest-code-explorer [--config <file>] [--no-svg] [--open] [--cwd <dir>]',
  '       nest-code-explorer --init [--config <file>] [--force]   # 기본 설정 파일 생성',
].join('\n');

const args = process.argv.slice(2);
const opt = { config: 'code-explorer.config.json', explicitConfig: false, svg: true, open: false, init: false, force: false, cwd: process.cwd() };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config' || a === '-c') { opt.config = args[++i]; opt.explicitConfig = true; }
  else if (a.startsWith('--config=')) { opt.config = a.slice('--config='.length); opt.explicitConfig = true; }
  else if (a === '--init') opt.init = true;
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
const result = run({ cwd: path.resolve(opt.cwd), configPath: existsSync(configPath) ? configPath : undefined, svg: opt.svg, packageDir: path.join(__dirname, '..') });

if (opt.open) {
  const target = result.explorer;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawnSync(cmd, [target], { stdio: 'ignore', shell: process.platform === 'win32' });
}
