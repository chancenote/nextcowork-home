/** Local mobile/accessibility audit. No analytics, CRM, or newsletter requests. */
import {createServer} from 'node:http';
import {readFile, stat, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'output/playwright/task-b');
const phase = process.env.QA_PHASE || 'after';
const widths = (process.env.QA_WIDTHS || '375').split(',').map(Number);
const axePath = process.env.AXE_PATH;
if (!axePath) throw new Error('Set AXE_PATH to a local axe-core browser bundle (4.10.3 used for this audit).');
const axeSource = await readFile(axePath, 'utf8');
const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
const routes = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
routes.push('/404.html', '/img/insights/gpt6-intelligent-ui/video.html',
  '/img/insights/ai-cowork-six-conditions/cardnews.html',
  '/img/insights/claude-motion-dashboards-workflow/cardnews.html',
  '/img/insights/nextcowork-space-ai-intersection/deck.html',
  '/img/insights/aside-browser-workflow/demo.html',
  '/img/insights/ax-one-workflow-playbook/demo.html');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.woff2':'font/woff2'};
const server = createServer(async(req,res)=>{
  try {
    if(req.method!=='GET') {res.writeHead(405);return res.end();}
    const pathname = new URL(req.url,'http://localhost').pathname;
    if(pathname==='/js/analytics.js') {res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('');}
    let path = resolve(root, '.' + decodeURIComponent(pathname));
    if(!path.startsWith(root + sep) && path!==root) {res.writeHead(403);return res.end();}
    if((await stat(path)).isDirectory()) path=resolve(path,'index.html');
    res.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream'});
    res.end(await readFile(path));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const width of widths) {
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
    await context.route('**/*',route=>{
      const u=new URL(route.request().url());
      const fonts=['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname);
      return route.request().method()==='GET' && (u.origin===origin || fonts || ['data:','blob:'].includes(u.protocol)) ? route.continue() : route.abort();
    });
    for(const path of routes.filter(p=>!process.env.QA_FILTER || p.includes(process.env.QA_FILTER))) {
      const page=await context.newPage();
      const response=await page.goto(origin+path,{waitUntil:'networkidle'});
      if(response.status()!==200) throw new Error(`${path}: HTTP ${response.status()}`);
      await page.evaluate(()=>document.fonts.ready);
      await page.addScriptTag({content:axeSource});
      const metrics=await page.evaluate(()=>{
        const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && !el.closest('[inert],[aria-hidden="true"]');};
        const identify=el=>el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string' && el.className?'.'+el.className.trim().replace(/\s+/g,'.'):'');
        const targets=[...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab]')].filter(visible).filter(el=>!el.disabled && !el.classList.contains('skip-link'));
        const small=targets.flatMap(el=>{
          let r=el.getBoundingClientRect();
          // An associated wrapping label is part of the checkbox/radio hit target.
          if(el.matches('input[type=checkbox],input[type=radio]') && el.labels?.length) r=el.labels[0].getBoundingClientRect();
          if(r.width>=43.99 && r.height>=43.99) return [];
          return [{selector:identify(el),text:(el.innerText || el.getAttribute('aria-label') || '').trim().slice(0,70),width:+r.width.toFixed(1),height:+r.height.toFixed(1),inline: getComputedStyle(el).display==='inline'}];
        });
        const overflow=[...document.querySelectorAll('main *,header *,footer *')].filter(visible).filter(el=>{
          const r=el.getBoundingClientRect();
          if(r.right<=innerWidth+1 && r.left>=-1) return false;
          if(el.closest('.skip-link')) return false;
          for(let p=el.parentElement;p && p!==document.body;p=p.parentElement) if(/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)) return false;
          return true;
        }).map(el=>({selector:identify(el),width:+el.getBoundingClientRect().width.toFixed(1)}));
        return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,small,overflow};
      });
      const axe=await page.evaluate(async()=>{
        const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}});
        return {violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html}))})),incomplete:result.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};
      });
      const result={path,width,...metrics,...axe};results.push(result);
      console.log(JSON.stringify({path,width,scroll:metrics.scroll,small:metrics.small.length,overflow:metrics.overflow.length,violations:axe.violations.map(v=>v.id+':'+v.nodes.length)}));
      if(['/','/flexoffice/','/public/','/contact/','/insights/','/insights/anthropic-ipo-s1/'].includes(path)) {
        const slug=path==='/'?'home':path.replaceAll('/','-').replace(/^-|-$/g,'');
        await page.screenshot({path:resolve(output,`${phase}-${slug}-${width}.png`),fullPage:true});
      }
      await page.close();
    }
    await context.close();
  }
} finally {await browser.close();await new Promise(r=>server.close(r));}
await writeFile(resolve(output,`${phase}.json`),JSON.stringify(results,null,2)+'\n');
if(phase!=='before' && results.some(r=>r.scroll>r.width+1 || r.overflow.length || (r.width<=720 && r.small.length) || r.violations.length)) process.exitCode=1;
