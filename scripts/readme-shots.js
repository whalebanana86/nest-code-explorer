#!/usr/bin/env node
/**
 * README 용 스크린샷: examples/order-app 탐색기를 headless Chrome 으로 열어 화면·기능별로 찍는다.
 *   node shots.js <explorer.html> <outDir>
 * puppeteer 는 mermaid-cli 가 npx 캐시에 받아 둔 것을 쓴다.
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
  throw new Error('puppeteer not found in ~/.npm/_npx');
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const [html, outDir] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const puppeteer = require(findPuppeteer());
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 780, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(html), { waitUntil: 'networkidle0' });
  await sleep(500);

  const shot = async (name, clip) => {
    await sleep(700); // fitAll 애니메이션(60ms 지연 + 250ms) 이후
    const opts = { path: path.join(outDir, name) };
    if (clip) {
      const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }, clip);
      opts.clip = r;
    }
    await page.screenshot(opts);
    console.log('shot', name);
  };

  // 1) 구조 모드 첫 화면: 진입점만
  await shot('01-structure-entries.png');

  // 2) 클릭해 내려가기: Controller → Usecase → Service → Repository (지나온 경로 강조)
  await page.evaluate(() => { goTo('OrdersController'); });
  await sleep(400);
  await page.evaluate(() => { goTo('OrdersUsecase'); });
  await sleep(400);
  await page.evaluate(() => { goTo('PaymentService'); });
  await sleep(400);
  await page.evaluate(() => { goTo('PaymentGateway'); });
  await shot('02-structure-trail.png');

  // 3) 전부 펼치기
  await page.evaluate(() => { expandAll(); });
  await sleep(300);
  await page.evaluate(() => { goTo('ShipmentProcessor'); });
  await shot('03-structure-expand-all.png');

  // 4) 검색 (클래스·메서드·설명·라우트·테이블·에러코드 전부)
  await page.evaluate(() => { reset(); });
  await page.click('#search');
  await page.type('#search', 'ORDER_ITEM');
  await sleep(300);
  await sleep(400);
  await page.screenshot({ path: path.join(outDir, '04-search.png'), clip: { x: 0, y: 0, width: 1280, height: 330 } });
  console.log('shot 04-search.png');

  // 5) 상세창: Overview / Methods / 메서드 상세
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const i = document.getElementById('search'); i.value = ''; document.getElementById('results').hidden = true; reset(); goTo('OrdersController'); });
  await sleep(300);
  await page.evaluate(() => { goTo('OrdersUsecase'); });
  await sleep(300);
  await page.evaluate(() => { goTo('OrderService'); });
  await shot('05-inspector-overview.png', '#panel');
  await page.evaluate(() => { insp.tab = 'methods'; insp.method = null; renderInspector(); });
  await shot('06-inspector-methods.png', '#panel');
  await page.evaluate(() => { goTo('OrderService', 'findDetail'); });
  await shot('07-inspector-method.png', '#panel');

  // 6) 실행 경로 모드: POST /v1/orders 가 큐 너머 Worker 까지
  await page.setViewport({ width: 1800, height: 820, deviceScaleFactor: 2 });
  await page.evaluate(() => { setMode('flow'); });
  await sleep(300);
  await page.evaluate(() => { showFlow('OrdersController', 'cancel'); });
  await shot('08-flow-cancel.png');
  await page.evaluate(() => { showFlow('ShipmentProcessor', 'process'); });
  await shot('09-flow-job-cross-queue.png');
  await page.evaluate(() => { showFlow('OrdersController', 'create'); });
  await shot('10-flow-summary.png', '#panel');

  // 7) cron 진입점 실행 경로
  await page.evaluate(() => { showFlow('CleanupService', 'purgeStaleDrafts'); });
  await shot('11-flow-cron.png');

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
