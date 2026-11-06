/** Local keyboard regression checks; external requests and real form submissions are blocked. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'output/playwright/task-b');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.woff2':'font/woff2'};
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/js/analytics.js') { res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(''); }
    let path = resolve(root, '.' + decodeURIComponent(pathname));
    if (!path.startsWith(resolve(root) + sep) && path !== resolve(root)) { res.writeHead(403); return res.end(); }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.writeHead(200, {'Content-Type':mime[extname(path)] || 'application/octet-stream'});
    res.end(await readFile(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({headless:true});
const results = [];
await mkdir(output, {recursive:true});

async function checkTargets(page, selector, name) {
  const metrics = await page.locator(selector).evaluateAll(elements => ({
    viewport:innerWidth,
    scrollWidth:document.documentElement.scrollWidth,
    targets:elements.filter(el => !el.disabled && el.checkVisibility()).map(el => {
      const rect = el.getBoundingClientRect();
      return {name:el.getAttribute('aria-label') || el.textContent.trim(), width:rect.width, height:rect.height};
    })
  }));
  assert.ok(metrics.targets.length, name + ': visible controls must be present');
  assert.ok(metrics.scrollWidth <= metrics.viewport + 1, name + ': horizontal page overflow');
  for (const target of metrics.targets) assert.ok(target.width >= 43.99 && target.height >= 43.99, name + ': target below 44px ' + JSON.stringify(target));
  return {count:metrics.targets.length, minWidth:Math.min(...metrics.targets.map(t => t.width)), minHeight:Math.min(...metrics.targets.map(t => t.height)), scrollWidth:metrics.scrollWidth};
}

try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({viewport:{width,height:900}, reducedMotion:'reduce'});
    await context.grantPermissions(['clipboard-read','clipboard-write'], {origin});
    await context.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const result = {width};
    try {
      if (width === 375) {
        await page.goto(origin + '/');
        await page.locator('.nav-burger').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('.nav-burger').getAttribute('aria-expanded'), 'true');
        result.menuTargets = await checkTargets(page, '.nav-menu a, .nav-burger', 'Open mobile menu');
        await page.keyboard.press('Enter');
        assert.equal(new URL(page.url()).hash, '#services');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.closest('#services') !== null), true);
        await page.locator('.nav-burger').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
        assert.equal(await page.locator('.nav-burger').getAttribute('aria-expanded'), 'false');
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('nav-burger')), true);
        result.mobileMenu = 'Anchor continues at its target; Escape returns to the menu button';
      }
      if (width === 1440) {
        await page.goto(origin + '/contact/');
        const trigger = page.locator('.has-sub > a');
        const firstSub = page.locator('.has-sub .sub a').first();
        await page.keyboard.press('Tab');
        for (let i = 0; i < 12 && !(await trigger.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Tab reaches the service menu');
        await page.waitForTimeout(100); // human key interval; the panel's CSS transition starts at visibility:hidden for one frame
        assert.equal(await trigger.evaluate(el => el.matches(':focus-visible')), true);
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        assert.equal(await firstSub.isVisible(), true);
        await page.keyboard.press('Tab');
        assert.equal(await firstSub.evaluate(el => el === document.activeElement), true, 'Tab moves into the open service menu');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Escape returns focus to the menu trigger');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        await page.waitForTimeout(100);
        assert.equal(await page.locator('.has-sub .sub').evaluate(el => getComputedStyle(el).visibility), 'hidden');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '/about/', 'Dismissed menu is skipped');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
        assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
        assert.equal(await trigger.getAttribute('aria-expanded'), 'true', 'Reopens on the next focus visit after focus left the menu');
        await page.waitForTimeout(100);
        assert.equal(await firstSub.isVisible(), true);
        await page.keyboard.press('Enter');
        await page.waitForURL(url => new URL(url).hash === '#services');
        assert.equal(new URL(page.url()).pathname, '/');
        await page.goto(origin + '/contact/');
        const cta = page.locator('.nav-cta');
        assert.equal((await cta.textContent()).trim(), '문의하기');
        await cta.focus(); assert.equal(await cta.evaluate(el => el.matches(':focus-visible')), true);
        result.desktopMenu = 'Tab opens, Tab enters, Escape closes and returns focus, Enter follows the link';
      }
      await page.goto(origin + '/insights/');
      await page.locator('#insights-discovery').waitFor({state:'visible'});
      result.paginationTargets = await checkTargets(page, '#insights-pagination a', 'Pagination');
      if (width === 375) {
        const thumbnail = page.locator('#feed .thumb-card > a').first();
        await page.keyboard.press('Tab'); await thumbnail.focus();
        await thumbnail.scrollIntoViewIfNeeded();
        assert.equal(await thumbnail.evaluate(el => el.matches(':focus-visible')), true);
        await page.screenshot({path:resolve(output, 'keyboard-thumbnail-focus-375.png')});
      }
      const pageLink = page.getByRole('link', {name:'2페이지', exact:true});
      await pageLink.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'insights-result-count');
      assert.equal(new URL(page.url()).searchParams.get('page'), '2');
      result.pagination = 'Updated results receive focus';

      await page.goto(origin + '/insights/');
      await page.locator('#insights-discovery').waitFor({state:'visible'});
      await page.locator('#tag-show-all').focus(); await page.keyboard.press('Enter');
      result.expandedTagTargets = [];
      let batches = 0;
      while (await page.locator('.tag-more').count()) {
        result.expandedTagTargets.push(await checkTargets(page, '#insights-tags button, #tag-show-all', 'Expanded tags'));
        await page.locator('.tag-more').focus(); await page.keyboard.press('Enter');
        assert.ok(++batches <= 100, 'Tag expansion must finish');
      }
      assert.ok(batches > 0, 'The dataset must exercise the final Load More batch');
      result.expandedTagTargets.push(await checkTargets(page, '#insights-tags button, #tag-show-all', 'Final tag batch'));
      assert.equal(await page.evaluate(() => document.activeElement.matches('.tag-choice, #tag-show-all, #insights-tag-query')), true);
      result.tagExpansion = {batches, focus:await page.evaluate(() => document.activeElement.className)};

      await page.goto(origin + '/insights/ai-fast-failure/');
      await page.evaluate(() => window.scrollTo(0, document.querySelector('.post-hero').getBoundingClientRect().bottom + window.scrollY + 50));
      await page.locator('.post-share-toggle').waitFor({state:'visible'});
      for (const legacyClipboard of [false, true]) {
        if (legacyClipboard) await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {value:undefined, configurable:true}));
        await page.locator('.post-share-toggle').focus(); await page.keyboard.press('Enter');
        result.shareTargets = await checkTargets(page, '.post-share-panel button, .post-share-panel a', 'Open share panel');
        if (width === 375 && !legacyClipboard) await page.screenshot({path:resolve(output, 'keyboard-open-share-375.png')});
        await page.locator('.post-share-panel [data-share="copy"]').focus(); await page.keyboard.press('Enter');
        assert.equal(await page.locator('.post-share-panel').evaluate(el => el.hidden), true);
        assert.equal(await page.evaluate(() => document.activeElement.classList.contains('post-share-toggle')), true);
      }
      await page.locator('.post-share-toggle').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('post-share-toggle')), true);
      result.share = 'Copy, legacy copy, and Escape restore the toggle focus';

      await page.goto(origin + '/public/');
      assert.equal(await page.locator('.pa-tabs').getAttribute('role'), 'group');
      await page.locator('.pa-tab[data-tab="work"]').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.pa-tab[data-tab="work"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.pa-tab[aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator('.pa-hist-group:visible').count(), 1);
      result.historyFilter = 'Native button group announces its active filter';

      await page.goto(origin + '/img/insights/ai-cowork-six-conditions/cardnews.html');
      const replay = page.getByRole('button', {name:'1번 카드 다시 재생', exact:true});
      await replay.focus();
      await replay.evaluate(el => el.parentElement.classList.remove('play'));
      await page.keyboard.press('Enter');
      assert.equal(await replay.evaluate(el => el.parentElement.classList.contains('play')), true);
      assert.equal(await replay.evaluate(el => el === document.activeElement), true);
      result.replay = 'Native replay button works with Enter and retains focus';

      assert.deepEqual(errors, []);
      result.status = 'PASS';
    } catch (error) {
      result.status = 'FAIL'; result.error = error.message; process.exitCode = 1;
    } finally {
      result.errors = errors; results.push(result); console.log(JSON.stringify(result)); await context.close();
    }
  }
} finally {
  await browser.close(); await new Promise(resolve => server.close(resolve));
  await mkdir(output, {recursive:true});
  await writeFile(resolve(output, 'keyboard-after.json'), JSON.stringify(results, null, 2) + '\n');
}
