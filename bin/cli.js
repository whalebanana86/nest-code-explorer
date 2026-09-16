#!/usr/bin/env node
/**
 * nest-code-explorer CLI
 *   nest-code-explorer [--config code-explorer.config.json] [--no-svg] [--open]
 * - 프로젝트 루트(cwd)의 tsconfig.json 과 설정 파일을 읽어 docs/code-explorer.html 과 code-map.md 를 만든다
 * - --no-svg: mermaid-cli 로 SVG 를 그리지 않는다 (빠름)
 * - --open:   생성한 탐색기 HTML 을 기본 브라우저로 연다
 */
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const opt = { config: 'code-explorer.config.json', svg: true, open: false, cwd: process.cwd() };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--config' || a === '-c') opt.config = args[++i];
  else if (a.startsWith('--config=')) opt.config = a.slice('--config='.length);
  else if (a === '--no-svg') opt.svg = false;
  else if (a === '--open') opt.open = true;
  else if (a === '--cwd') opt.cwd = args[++i];
  else if (a === '-h' || a === '--help') {
    console.log('usage: nest-code-explorer [--config <file>] [--no-svg] [--open] [--cwd <dir>]');
    process.exit(0);
  } else {
    console.error(`unknown option: ${a}`);
    process.exit(1);
  }
}

const { run } = require(path.join(__dirname, '../dist/analyze.js'));
const result = run({ cwd: path.resolve(opt.cwd), configPath: path.resolve(opt.cwd, opt.config), svg: opt.svg, packageDir: path.join(__dirname, '..') });

if (opt.open) {
  const target = result.explorer;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawnSync(cmd, [target], { stdio: 'ignore', shell: process.platform === 'win32' });
}
