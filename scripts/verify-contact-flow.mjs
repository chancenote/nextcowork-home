/** Contact journey regression checks using only local synthetic receipts. */
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createPreviewServer} from './preview-contact-flow.mjs';

const output = resolve(process.env.QA_OUTPUT || fileURLToPath(new URL('../output/playwright/contact-flow/', import.meta.url)));
await mkdir(output, {recursive:true});
const preview = await createPreviewServer({port:0});
const {origin} = preview;
const browser = await chromium.launch({headless:true});
const results = [], blockedExternal = new Set();
const filter = process.env.QA_FILTER;
async function control(mode='saved', reset=true) {
  const res = await fetch(origin + '/__test__/control', {method:'POST', body:JSON.stringify({mode,reset})});
  assert.equal(res.status,200);
}
async function state() { return fetch(origin + '/__test__/state').then(r=>r.json()); }
async function scene(options={}) {
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === origin || ['data:','blob:'].includes(u.protocol)) return route.continue();
    blockedExternal.add(u.hostname); return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors};
}
async function fill(page, overrides={}) {
  const values = {name:'[TEST] 고객 흐름', email:'journey@example.com', message:'[TEST] 워크숍 교육 문의입니다. 실제 접수하지 않습니다.', ...overrides};
  for (const [key,value] of Object.entries(values)) await page.locator('#cf-'+key).fill(value);
  await page.locator('#cf-privacy').check();
}
async function waitIdle(page, timeout=5500) { await page.waitForFunction(()=>!document.querySelector('#cf-submit').disabled, null, {timeout}); }
async function check(name, fn) {
  if (filter && !name.includes(filter)) return;
  const started = Date.now();
  try { await control(); const detail=await fn(); results.push({name,status:'PASS',ms:Date.now()-started,...detail}); }
  catch(error) { results.push({name,status:'FAIL',ms:Date.now()-started,error:error.message.slice(0,700)}); }
  console.log(results.at(-1).status + ' ' + name);
}
async function withPage(fn, options) { const s=await scene(options); try { return await fn(s); } finally { await s.context.close(); } }

try {
  await check('workshop CTA → contact context / UTM → saved',()=>withPage(async ({page,errors})=>{
    await page.goto(origin+'/ai-campus/?utm_source=qa&utm_medium=test&utm_campaign=workshop');
    await page.locator('a[href*="t=workshop"]').first().click();
    await page.waitForURL(/\/contact\//); await page.waitForLoadState('load');
    assert.match(page.url(),/\/contact\//);
    assert.match(await page.locator('#cf-service').inputValue(),/AI Campus/);
    assert.match(await page.locator('#cf-tier').inputValue(),/워크/);
    assert.equal(await page.locator('#cf-utm-source').inputValue(),'qa');
    await fill(page); const key=await page.locator('#cf-request-key').inputValue();
    await page.locator('#cf-submit').click();
    await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
    assert.match(await page.locator('#cf-inquiry-id').textContent(),/NCW-20990101-/);
    assert.equal(await page.locator('#cf-name').inputValue(),'');
    assert.equal(await page.locator('#cf-success').evaluate(el=>el===document.activeElement),true);
    assert.notEqual(await page.locator('#cf-request-key').inputValue(),key);
    const sent=await state(); assert.equal(sent.requests.length,1); assert.equal(sent.records,1);
    assert.equal(sent.requests[0].utm_campaign,'workshop');
    assert.equal(sent.requests[0].source_page,'/ai-campus/');
    assert.equal(sent.requests[0].form_type,'inquiry');
    const events=await page.evaluate(()=>window.__testEvents.filter(e=>e[0]==='event').map(e=>e[1]));
    assert.equal(events.filter(e=>e==='inquiry_saved').length,1); assert.equal(events.filter(e=>e==='generate_lead').length,1);
    assert.deepEqual(errors,[]);
    await page.locator('#cf-success').screenshot({path:resolve(output,'success-desktop.png')});
    return {requests:1,receipts:1,events};
  }));
  await check('required fields / malformed email / consent block transmission',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/');
    await page.locator('#cf-submit').click();
    assert.equal(await page.locator('#cf-name').evaluate(el=>el===document.activeElement),true);
    await fill(page,{email:'not-an-email'}); await page.locator('#cf-submit').click();
    assert.equal(await page.locator('#cf-email').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#cf-email').getAttribute('aria-invalid'),'true');
    assert.match(await page.locator('#cf-email').getAttribute('aria-describedby'),/\bcf-status\b/);
    assert.match(await page.locator('#cf-status').textContent(),/이메일 주소 형식/);
    await page.locator('#cf-email').fill('journey@example.com');
    assert.equal(await page.locator('#cf-email').getAttribute('aria-invalid'),null);
    assert.equal(await page.locator('#cf-email').getAttribute('aria-describedby'),null);
    assert.equal(await page.locator('#cf-timeline').getAttribute('aria-describedby'),'cf-timeline-help');
    await page.locator('#cf-privacy').uncheck();
    await page.locator('#cf-submit').click();
    assert.equal(await page.locator('#cf-privacy').evaluate(el=>el===document.activeElement),true);
    assert.match(await page.locator('#cf-privacy').getAttribute('aria-describedby'),/\bcf-status\b/);
    assert.equal((await state()).requests.length,0);
  }));
  await check('service summary shows passed service, changes with select, matches payload',()=>withPage(async ({page,errors})=>{
    const cases=[
      ['','',null,'일반 문의','선택 안 함'],
      ['?s=ai-campus&t=workshop','AI Campus — 기업 AI 교육 · 실무 워크샵','ai-campus','AI Campus 기업 AI 교육','실무 워크샵'],
      ['?s=flexoffice&t=precheck','FlexOffice 컨설팅 · 무료 사전 진단','flexoffice','FlexOffice 컨설팅','무료 사전 진단'],
      ['?s=coaching','CEO AI 코칭 · CEO AI 코칭 (2h×5회)','coaching','CEO AI 코칭','CEO AI 코칭 (2h×5회)'],
      ['?s=zzz&t=%22','',null,'일반 문의','선택 안 함']
    ];
    for (const [query,summary,,service,tier] of cases) {
      await page.goto(origin+'/contact/'+query);
      assert.equal(await page.locator('#cf-context').isVisible(),!!summary,query);
      if (summary) assert.equal(await page.locator('#cf-context-text').textContent(),summary);
      assert.equal(await page.locator('#cf-service').inputValue(),service);
      assert.equal(await page.locator('#cf-tier').inputValue(),tier);
    }
    await page.goto(origin+'/contact/?s=ai-campus&t=workshop');
    await page.locator('#cf-context-change').click();
    assert.equal(await page.locator('#cf-service').evaluate(el=>el===document.activeElement),true);
    await page.locator('#cf-service').selectOption({label:'FlexOffice 컨설팅'});
    await page.locator('#cf-tier').selectOption({label:'② 컨셉·운영모델 설계'});
    assert.equal(await page.locator('#cf-context-text').textContent(),'FlexOffice 컨설팅 · ② 컨셉·운영모델 설계');
    await fill(page); await page.locator('#cf-submit').click();
    await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
    const sent=(await state()).requests[0];
    assert.equal(sent.service,'FlexOffice 컨설팅'); assert.equal(sent.tier,'② 컨셉·운영모델 설계');
    const events=await page.evaluate(()=>window.__testEvents.filter(e=>e[0]==='event'));
    const leaked=events.filter(e=>JSON.stringify(e[2]||{}).match(/journey@example\.com|고객 흐름|워크숍 교육 문의/));
    assert.deepEqual(leaked,[]);
    const saved=events.find(e=>e[1]==='inquiry_saved'); assert.equal(saved[2].service_key,'flexoffice'); assert.equal(saved[2].tier_key,'design');
    assert.deepEqual(errors,[]);
    await page.locator('#contact-form').screenshot({path:resolve(output,'contact-summary-after-submit.png')});
    return {cases:cases.length,payload:{service:sent.service,tier:sent.tier}};
  }));
  await check('whitespace-only name and message block transmission',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/'); await fill(page,{name:'   ',message:'   '});
    await page.locator('#cf-submit').click(); await page.waitForTimeout(250);
    assert.equal((await state()).requests.length,0);
    assert.equal(await page.locator('#cf-name').evaluate(el=>el===document.activeElement),true);
    await page.locator('#cf-name').fill('[TEST] 고객 흐름'); await page.locator('#cf-submit').click();
    assert.equal((await state()).requests.length,0);
    assert.equal(await page.locator('#cf-message').evaluate(el=>el===document.activeElement),true);
  }));
  await check('rapid double submit sends one request',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/?s=ai-campus&t=workshop'); await fill(page);
    await page.evaluate(()=>{const f=document.querySelector('#contact-form');f.requestSubmit();f.requestSubmit();});
    await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
    assert.equal((await state()).requests.length,1);
  }));
  await check('pending input locks / edited retry gets a new request key',()=>withPage(async ({page})=>{
    await control('unconfirmed'); await page.goto(origin+'/contact/?s=ai-campus&t=workshop'); await fill(page);
    await page.locator('#cf-submit').click(); await waitIdle(page);
    const oldKey=await page.locator('#cf-request-key').inputValue();
    await page.locator('#cf-message').fill('[TEST] 추가 문의: 실무 워크숍 일정 변경');
    assert.match(await page.locator('#cf-status').textContent(),/새 문의/);
    await control('body-hang',false); await page.locator('#cf-submit').click();
    await page.waitForFunction(()=>document.querySelector('#cf-submit').disabled);
    assert.equal(await page.locator('#cf-name').isDisabled(),true);
    assert.equal(await page.locator('#cf-message').isDisabled(),true);
    assert.equal(await page.locator('#cf-service').isDisabled(),true);
    assert.equal(await page.locator('#cf-copy').isDisabled(),true);
    assert.notEqual(await page.locator('#cf-request-key').inputValue(),oldKey);
    const sent=await state(); assert.equal(sent.requests.length,2);
    assert.notEqual(sent.requests[0].request_key,sent.requests[1].request_key);
    assert.match(sent.requests[1].message,/일정 변경/);
  }));
  await check('service and tier selection refresh customer context',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/?s=ai-campus&t=workshop');
    await page.locator('#cf-tier').selectOption({label:'사내 AI 캠퍼스 구축'});
    assert.match(await page.locator('#cf-message').getAttribute('placeholder'),/캠퍼스/);
    await page.locator('#cf-service').selectOption({label:'일반 문의'});
    assert.match(await page.locator('#contact-crumb').textContent(),/프로젝트/);
    assert.doesNotMatch(await page.locator('#cf-message').getAttribute('placeholder'),/워크샵|캠퍼스/);
  }));
  for (const mode of ['failed','unconfirmed']) {
    await check(mode+' preserves input and retry key',()=>withPage(async ({page})=>{
      await control(mode); await page.goto(origin+'/contact/?s=ai-campus&t=workshop'); await fill(page);
      const key=await page.locator('#cf-request-key').inputValue();
      await page.locator('#cf-submit').click(); await waitIdle(page);
      assert.equal(await page.locator('#cf-success').isVisible(),false);
      assert.match(await page.locator('#cf-message').inputValue(),/TEST/);
      assert.equal(await page.locator('#cf-request-key').inputValue(),key);
      assert.match(await page.locator('#cf-status').textContent(),/실패|확인 중/);
      await control('saved',false); await page.locator('#cf-submit').click();
      await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
      const sent=await state(); assert.equal(sent.requests.length,2);
      assert.equal(sent.requests[0].request_key,sent.requests[1].request_key);
    }));
  }
  for (const edited of [false,true]) {
    await check('stored but receipt lost / '+(edited?'edited new inquiry':'same inquiry deduplicated'),()=>withPage(async ({page})=>{
      await control('saved-unconfirmed');await page.goto(origin+'/contact/?s=ai-campus&t=workshop');await fill(page);
      await page.locator('#cf-submit').click();await waitIdle(page);
      assert.equal((await state()).records,1);assert.equal(await page.locator('#cf-success').isVisible(),false);
      if(edited)await page.locator('#cf-message').fill('[TEST] 이전 접수의 추가·정정 문의입니다.');
      await control('saved',false);await page.locator('#cf-submit').click();
      await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
      const sent=await state();assert.equal(sent.records,edited?2:1);assert.equal(sent.requests.length,2);
      assert.equal(sent.requests[0].request_key===sent.requests[1].request_key,!edited);
      assert.match(await page.locator('#cf-inquiry-id').textContent(),edited?/NCW-20990101-000002/:/NCW-20990101-000001/);
    }));
  }
  for (const mode of ['timeout','body-hang']) {
    await check(mode+' releases submit button within timeout',()=>withPage(async ({page})=>{
      await control(mode); await page.goto(origin+'/contact/'); await fill(page);
      const key=await page.locator('#cf-request-key').inputValue();
      const submittedAt = Date.now();
      await page.locator('#cf-submit').click(); await waitIdle(page,18000);
      const elapsed = Date.now() - submittedAt;
      const sent = await state();
      assert.equal(sent.requests.length,1,'The mock server must receive exactly one request.');
      assert.ok(elapsed >= 14000 && elapsed <= 20000,'Expected the 15-second abort, observed ' + elapsed + 'ms.');
      assert.equal(await page.locator('#cf-success').isVisible(),false);
      assert.match(await page.locator('#cf-status').textContent(),/확인|실패/);
      assert.match(await page.locator('#cf-message').inputValue(),/TEST/);
      assert.equal(await page.locator('#cf-request-key').inputValue(),key);
      return {requests:sent.requests.length,elapsedMs:elapsed};
    }));
  }
  await check('invalid receipt object cannot show success',()=>withPage(async ({page})=>{
    await control('invalid-id'); await page.goto(origin+'/contact/'); await fill(page);
    await page.locator('#cf-submit').click(); await waitIdle(page);
    assert.equal(await page.locator('#cf-success').isVisible(),false);
    assert.match(await page.locator('#cf-message').inputValue(),/TEST/);
  }));
  await check('malformed and unknown service/tier links remain usable',async()=>{
    for (const query of ['s=%22','s=ai-campus&t=%22','s=unknown&t=unknown','s=__proto__&t=constructor']) {
      await withPage(async ({page,errors})=>{
        await page.goto(origin+'/contact/?'+query); await fill(page);
        assert.deepEqual(errors,[]);
        await page.locator('#cf-submit').click();
        await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
        assert.match(page.url(),/\/contact\//);
      });
    }
  });
  await check('mobile and desktop layout / menu / focus',async()=>{
    const sizes=[];
    for (const width of [360,390,768,1440]) {
      await withPage(async ({page,errors})=>{
        for (const path of ['/ai-campus/','/contact/?s=ai-campus&t=workshop']) {
          await page.goto(origin+path);
          const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
          assert.ok(metrics.scroll<=metrics.width+1,JSON.stringify({path,...metrics}));
          sizes.push({path,width,overflow:metrics.scroll-metrics.width});
          if (width===390 || width===1440) await page.screenshot({path:resolve(output,(path.includes('ai-campus/')?'campus':'contact')+'-'+width+'.png'),fullPage:true});
        }
        if (width<1000 && await page.locator('.nav-burger').isVisible()) {
          await page.locator('.nav-burger').click(); assert.equal(await page.locator('.nav-burger').getAttribute('aria-expanded'),'true');
          await page.keyboard.press('Escape'); assert.equal(await page.locator('.nav-burger').getAttribute('aria-expanded'),'false');
          assert.equal(await page.locator('.nav-burger').evaluate(el=>el===document.activeElement),true);
        }
        assert.deepEqual(errors,[]);
      },{viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});
    }
    return {sizes,fontNote:'External fonts blocked in browser; system fallback fonts used.'};
  });
  await check('in-scope internal links / assets / anchors / actual 404',()=>withPage(async ({page})=>{
    const urls=new Set(), anchors=[], pages=['/ai-campus/','/contact/','/404.html'];
    for (const path of pages) {
      await page.goto(origin+path);
      const found=await page.evaluate(()=>Array.from(document.querySelectorAll('[href],[src],[poster]')).flatMap(el=>['href','src','poster'].map(attr=>el.getAttribute(attr)).filter(Boolean)));
      for (const raw of found) {
        const u=new URL(raw,origin+path);
        if (u.origin!==origin) continue;
        urls.add(u.pathname+u.search);
        if (u.hash) anchors.push({path:u.pathname,hash:decodeURIComponent(u.hash.slice(1))});
      }
    }
    const failures=[];
    for (const path of urls) { const res=await fetch(origin+path); if(res.status>=400)failures.push({path,status:res.status}); }
    assert.deepEqual(failures,[]);
    for (const item of anchors) {
      const html=await fetch(origin+item.path).then(r=>r.text());
      assert.ok(html.includes('id="'+item.hash+'"')||html.includes("id='"+item.hash+"'"),item.path+'#'+item.hash);
    }
    const missing=await fetch(origin+'/missing-page-qa-20261029/');assert.equal(missing.status,404);assert.match(await missing.text(),/찾으시는 페이지/);
    const privatePaths=['/.env','/.git/config','/scripts/preview-contact-flow.mjs','/AGENTS.md','/files/_src/ai-campus-program-guide.html','/package.json','/package-lock.json','/vercel.json'];
    for (const path of privatePaths) assert.equal((await fetch(origin+path)).status,404,path);
    return {internalUrls:urls.size,anchors:anchors.length,missingStatus:404,privatePathsDenied:privatePaths.length};
  }));
  await check('JavaScript disabled uses local POST, no URL personal fields',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/');await fill(page);
    await Promise.all([page.waitForURL('**/__test__/submit'),page.locator('#cf-submit').click()]);
    assert.equal(page.url(),origin+'/__test__/submit');
    const sent=await state();assert.equal(sent.requests.length,1);assert.equal(sent.requests[0].email,'journey@example.com');
  },{javaScriptEnabled:false}));
  await check('mobile completion card and next-step guidance',()=>withPage(async ({page})=>{
    await page.goto(origin+'/contact/?s=ai-campus&t=workshop');await fill(page);
    await page.locator('#cf-submit').click();await page.waitForFunction(()=>!document.querySelector('#cf-success').hidden);
    assert.equal(await page.locator('#cf-success').evaluate(el=>el===document.activeElement),true);
    assert.match(await page.locator('#cf-success').textContent(),/영업일 1일/);
    assert.match(await page.locator('#cf-success').textContent(),/접수번호/);
    await page.screenshot({path:resolve(output,'success-mobile-390.png')});
  },{viewport:{width:390,height:844},isMobile:true,hasTouch:true}));
  await check('AI Campus newsletter consent and inquiry separation',()=>withPage(async ({page})=>{
    await page.goto(origin+'/ai-campus/');
    const news=page.locator('form[data-newsletter]');
    await news.locator('input[type=email]').fill('newsletter@example.com');
    await news.locator('button[type=submit]').click();assert.equal((await state()).requests.length,0);
    await news.locator('input[name=newsletter_agree]').check();await news.locator('button[type=submit]').click();
    await page.waitForFunction(()=>!document.querySelector('form[data-newsletter] button[type=submit]').disabled);
    const sent=await state();assert.equal(sent.requests.length,1);assert.equal(sent.requests[0].form_type,'newsletter');
    const names=await page.evaluate(()=>window.__testEvents.filter(e=>e[0]==='event').map(e=>e[1]));
    assert.equal(names.filter(n=>n==='generate_lead'||n==='inquiry_saved').length,0);
  }));
} finally {
  await browser.close(); await preview.close();
  const report={date:'2026-10-29',scope:filter?'filtered':'full',filter:filter||null,environment:'Local Chromium; synthetic Make responses; no production requests',results,matched:results.length,passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,blockedExternalHosts:[...blockedExternal],limitations:['Real Make execution, Notion persistence and operator email delivery not exercised.','Real Safari/iOS and Android devices not exercised.','External fonts blocked; layout tested using local system fallback fonts.']};
  if (!results.length) report.error='No test names matched QA_FILTER.';
  const reportFile=filter?'contact-flow-results.filtered-'+createHash('sha256').update(filter).digest('hex').slice(0,12)+'.json':'contact-flow-results.json';
  await writeFile(resolve(output,reportFile),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({scope:report.scope,filter:report.filter,matched:report.matched,passed:report.passed,failed:report.failed,reportFile:resolve(output,reportFile)}));
  if(report.failed || !results.length)process.exitCode=1;
}
