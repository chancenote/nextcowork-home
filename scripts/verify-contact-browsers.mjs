/** RC2 webfont/browser checks. Only the localhost mock can receive form submissions. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium, webkit} from 'playwright';
import {createPreviewServer} from './preview-contact-flow.mjs';

const root = resolve(process.env.QA_SITE_ROOT || fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(process.env.QA_OUTPUT || resolve(root, 'output/playwright/contact-flow-rc2/browser'));
const engines = {chromium, webkit};
const requested = (process.env.QA_BROWSERS || 'chromium,webkit').split(',');
const widths = (process.env.QA_WIDTHS || '375,390,1440').split(',').map(Number);
const fontHosts = new Set(['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com']);
const preview = await createPreviewServer({port:0, root});
const origin = preview.origin;
const results = [];
await mkdir(output, {recursive:true});

async function control(mode, reset = false) {
  const response = await fetch(origin + '/__test__/control', {method:'POST', body:JSON.stringify({mode, reset})});
  assert.equal(response.status, 200);
}
async function mockState() { return fetch(origin + '/__test__/state').then(response => response.json()); }
async function fonts(page, engine) {
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const primary = await document.fonts.load('400 18px "Pretendard Variable"', '기업 워크샵 문의 접수');
    const numbers = await document.fonts.load('700 24px Inter', '300123');
    await document.fonts.ready;
    const families = {};
    for (const font of document.fonts) if (font.status === 'loaded') families[font.family] = (families[font.family] || 0) + 1;
    return {primaryFaces:primary.length, numberFaces:numbers.length, loadedFamilies:families, bodyFont:getComputedStyle(document.body).fontFamily, headingFont:getComputedStyle(document.querySelector('h1')).fontFamily};
  });
  assert.ok(loaded.primaryFaces > 0 && loaded.numberFaces > 0, 'Both configured webfonts must load, not just a fallback font: ' + JSON.stringify(loaded));
  assert.ok(Object.keys(loaded.loadedFamilies).some(name => name.includes('Pretendard')));
  assert.ok(Object.keys(loaded.loadedFamilies).some(name => name.includes('Inter')));
  if (engine === 'chromium') {
    const client = await page.context().newCDPSession(page);
    try {
      await client.send('DOM.enable'); await client.send('CSS.enable');
      const {root:doc} = await client.send('DOM.getDocument');
      const {nodeId} = await client.send('DOM.querySelector', {nodeId:doc.nodeId, selector:'h1'});
      loaded.renderedHeadingFonts = (await client.send('CSS.getPlatformFontsForNode', {nodeId})).fonts;
      assert.ok(loaded.renderedHeadingFonts.some(font => font.isCustomFont && /Pretendard|NCW Core Sans/i.test(font.familyName)), 'The heading must actually render with the downloaded font');
    } finally { await client.detach(); }
  }
  return loaded;
}
async function layout(page, selector, require44 = true) {
  const metrics = await page.evaluate(selector => {
    const visible = el => el.checkVisibility() && !el.closest('[aria-hidden="true"]');
    const targets = [...document.querySelectorAll(selector)].filter(visible).filter(el => !el.disabled).map(el => {
      let rect = el.getBoundingClientRect();
      if (el.matches('input[type=checkbox]') && el.labels.length) rect = el.labels[0].getBoundingClientRect();
      return {id:el.id || el.className, width:rect.width, height:rect.height};
    });
    return {viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth, targets};
  }, selector);
  assert.ok(metrics.scrollWidth <= metrics.viewport + 1, 'Horizontal page overflow: ' + JSON.stringify(metrics));
  if (require44 && metrics.viewport < 1024) for (const target of metrics.targets) assert.ok(target.width >= 43.99 && target.height >= 43.99, 'Target below 44px: ' + JSON.stringify(target));
  return metrics;
}

try {
  for (const engine of requested) {
    if (!engines[engine]) throw new Error('Unsupported browser: ' + engine);
    let browser;
    try { browser = await engines[engine].launch({headless:true}); }
    catch (error) { results.push({engine,status:'UNAVAILABLE',error:error.message}); process.exitCode = 1; continue; }
    try {
      for (const width of widths) {
        const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
        const blocked = new Set(), fontResponses = [], errors = [];
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          if (url.origin === origin) {
            if (request.method() === 'GET' || (request.method() === 'POST' && url.pathname === '/__test__/submit')) return route.continue();
          } else if (request.method() === 'GET' && fontHosts.has(url.hostname)) return route.continue();
          blocked.add(request.method() + ' ' + url.origin + url.pathname);
          return route.abort('blockedbyclient');
        });
        const page = await context.newPage();
        page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(45000);
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          const responseUrl = new URL(response.url());
          // Fonts are self-hosted under /fonts/ (css/fonts.css); external CDN hosts stay allowed for older pages.
          if (fontHosts.has(responseUrl.hostname) || (responseUrl.origin === origin && responseUrl.pathname.startsWith('/fonts/'))) fontResponses.push({url:response.url(),status:response.status(),type:response.request().resourceType()});
        });
        const result = {engine,version:browser.version(),width,device:'macOS headless browser, viewport emulation; not actual Safari/iOS/Android'};
        const prefix = engine + '-' + width;
        try {
          await control('saved', true);
          await page.goto(origin + '/ai-campus/?utm_source=qa&utm_medium=local&utm_campaign=rc2');
          result.userAgent = await page.evaluate(() => navigator.userAgent);
          result.campusFonts = await fonts(page, engine);
          // Existing quick links belong to the separate Task B accessibility rollout.
          result.campusLayout = await layout(page, '.quick-links a', false);
          result.programCtaLayout = await layout(page, '.price-card a');
          await page.screenshot({path:resolve(output, prefix + '-campus.png'),fullPage:true});
          const workshop = page.locator('a[href*="cta=price_workshop"]');
          await workshop.scrollIntoViewIfNeeded();
          await page.locator('.price-card.featured').screenshot({path:resolve(output, prefix + '-workshop.png')});
          await workshop.click();
          assert.match(page.url(), /\/contact\//);
          result.contactFonts = await fonts(page, engine);
          assert.match(await page.locator('#cf-service').inputValue(), /AI Campus/);
          assert.match(await page.locator('#cf-tier').inputValue(), /워크/);
          assert.equal(await page.locator('#cf-utm-source').inputValue(), 'qa');
          assert.equal(await page.locator('#cf-copy').getAttribute('aria-label'), '내용 복사: 입력한 문의 내용을 클립보드에 복사');
          result.contactLayout = await layout(page, '#contact-form input:not([type=hidden]), #contact-form select, #contact-form textarea, #contact-form button, #contact-form summary');
          await page.screenshot({path:resolve(output, prefix + '-contact.png'),fullPage:true});

          await page.locator('#cf-submit').click();
          assert.equal(await page.locator('#cf-name').evaluate(el => el === document.activeElement), true);
          assert.equal((await mockState()).requests.length, 0);
          await page.locator('#cf-name').fill('[TEST RC2] Browser verification');
          await page.locator('#cf-email').fill('invalid-email');
          await page.locator('#cf-message').fill('[TEST RC2] 실무 워크숍 문의 화면 검증입니다. 실제 고객 접수 아닙니다.');
          await page.locator('#cf-privacy').check();
          await page.locator('#cf-submit').click();
          assert.equal(await page.locator('#cf-email').evaluate(el => el === document.activeElement), true);
          assert.equal((await mockState()).requests.length, 0);
          await page.locator('#cf-email').fill('browser-test@example.com');
          await control('failed');
          const requestKey = await page.locator('#cf-request-key').inputValue();
          await page.locator('#cf-submit').click();
          await page.waitForFunction(() => !document.querySelector('#cf-submit').disabled && /실패/.test(document.querySelector('#cf-status').textContent));
          assert.equal(await page.locator('#cf-success').isVisible(), false);
          assert.match(await page.locator('#cf-message').inputValue(), /TEST RC2/);
          assert.equal(await page.locator('#cf-request-key').inputValue(), requestKey);
          await page.locator('#cf-status').scrollIntoViewIfNeeded();
          await page.screenshot({path:resolve(output, prefix + '-error.png')});
          await control('saved');
          await page.locator('#cf-submit').click();
          await page.locator('#cf-success').waitFor({state:'visible'});
          assert.equal(await page.locator('#cf-success').evaluate(el => el === document.activeElement), true);
          assert.match(await page.locator('#cf-inquiry-id').textContent(), /NCW-20990101-/);
          assert.equal(await page.locator('#cf-name').inputValue(), '');
          const state = await mockState();
          assert.equal(state.requests.length, 2); assert.equal(state.records, 1);
          assert.equal(state.requests[0].request_key, state.requests[1].request_key);
          result.mock = {failedRequests:1, successfulRequests:1, records:1,receipt:await page.locator('#cf-inquiry-id').textContent(),successFocused:true};
          // These unchanged inline links are measured; their separate Task B enlargement is not an RC2 dependency.
          result.successLayout = await layout(page, '#cf-success a', false);
          await page.screenshot({path:resolve(output, prefix + '-success.png')});
          if (width < 1024) {
            await page.locator('.nav-burger').click();
            result.openMenuLayout = await layout(page, '.nav-menu a, .nav-burger');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('.nav-burger').evaluate(el => el === document.activeElement), true);
          }
          assert.ok(fontResponses.some(response => response.type === 'font' && response.status === 200));
          assert.deepEqual(errors, []);
          result.status = 'PASS';
        } catch (error) { result.status = 'FAIL'; result.error = error.message; process.exitCode = 1; }
        finally {
          result.fontResponses = fontResponses;
          result.blockedExternal = [...blocked]; result.errors = errors;
          results.push(result); console.log(JSON.stringify({engine,width,status:result.status,error:result.error,downloadedFontResponses:fontResponses.filter(r => r.type === 'font').length}));
          await context.close();
        }
      }
    } finally { await browser.close(); }
  }
} finally {
  await preview.close();
  const hashes = {};
  for (const path of ['js/main.js','contact/index.html','ai-campus/index.html','css/style.css','css/page-ai-campus.css']) hashes[path] = createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
  await writeFile(resolve(output,'results.json'), JSON.stringify({checkedAt:new Date().toISOString(),scope:'Webfont-loaded mock browser verification; no real CRM/email submissions; RC1 timeout suite not repeated',hashes,results}, null, 2) + '\n');
}
