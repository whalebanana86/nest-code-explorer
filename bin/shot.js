#!/usr/bin/env node
/**
 * 코드 탐색기를 headless Chrome 으로 열어 원하는 폭에서 스크린샷과 헤더 레이아웃 수치를 찍는다 (반응형 확인용).
 *   node scripts/explorer-shot.js <url> <width> <outfile.png>
 * puppeteer 는 mermaid-cli 가 npx 캐시에 받아 둔 것을 쓴다 (별도 설치 없음).
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

function findPuppeteer() {
  const base = path.join(os.homedir(), '.npm/_npx');
  for (const d of fs.readdirSync(base)) {
    const p = path.join(base, d, 'node_modules/puppeteer');
    if (fs.existsSync(p)) return p;
  }
  throw new Error('puppeteer not found in ~/.npm/_npx (run mermaid-cli once)');
}

(async () => {
  const [url, width = '1000', out = 'shot.png'] = process.argv.slice(2);
  const puppeteer = require(findPuppeteer());
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: Number(width), height: 800 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  const info = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      header: r(document.querySelector('header')),
      modeBtn: r(document.querySelector('#modeStructure')),
      expandBtn: r(document.querySelector('#expandAll')),
      search: r(document.querySelector('#search')),
      hintVisible: getComputedStyle(document.getElementById('modeHint')).display !== 'none',
      legendVisible: getComputedStyle(document.querySelector('.legend')).display !== 'none',
      main: r(document.querySelector('main')),
      aside: r(document.querySelector('aside')),
      bodyScrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight,
    };
  });
  await page.screenshot({ path: out });
  await browser.close();
  console.log(JSON.stringify(info));
})().catch((e) => { console.error(e); process.exit(1); });
