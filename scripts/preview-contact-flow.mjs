/** Local-only contact preview. Never forwards a request to CRM, Make or email. */
import http from 'node:http';
import {readFile, stat, realpath} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const siteRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedDirs = new Set(['about','ai-campus','coaching','contact','flexoffice','insights','public','privacy','img','css','js','files','fonts','media','video']);
const allowedRootFiles = new Set(['index.html','404.html','favicon.ico','favicon.svg','favicon-16.png','favicon-32.png','favicon-48.png','apple-touch-icon.png','site.webmanifest','robots.txt','sitemap.xml','rss.xml','llms.txt']);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.pdf':'application/pdf','.mp4':'video/mp4','.woff2':'font/woff2'};
const modes = new Set(['saved','saved-unconfirmed','failed','unconfirmed','timeout','body-hang','invalid-id']);
const previewCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";
const banner = '<aside data-test-preview role="note" style="position:fixed;bottom:0;left:0;right:0;z-index:1001;pointer-events:none;background:#302D7C;color:white;padding:8px 16px;text-align:center;font:13px/1.5 sans-serif">테스트 미리보기 · 실제 CRM·메일로 전송되지 않습니다. 이메일은 test@example.com을 사용하세요.</aside>';

async function body(req) {
  let data = ''; for await (const chunk of req) { data += chunk; if (data.length > 65536) throw new Error('too_large'); }
  return data;
}
function fields(raw, type) {
  if (!type?.includes('multipart/form-data')) return Object.fromEntries(new URLSearchParams(raw));
  const boundary = type.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.slice(1).find(Boolean);
  if (!boundary) return {};
  const result = {};
  for (const part of raw.split('--' + boundary)) {
    const name = part.match(/name="([^"]+)"/)?.[1];
    if (name) result[name] = part.slice(part.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '');
  }
  return result;
}
function json(res, status, value) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }

export async function createPreviewServer({port = 8769, root = siteRoot} = {}) {
  const config = JSON.parse(await readFile(resolve(root, 'vercel.json'), 'utf8'));
  let mode = 'saved', requests = [], records = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const expected = '127.0.0.1:' + server.address().port;
      if (![expected, 'localhost:' + server.address().port].includes(req.headers.host)) return json(res, 403, {error:'local_only'});
      if (req.headers.origin && !['http://' + expected,'http://localhost:' + server.address().port].includes(req.headers.origin)) return json(res, 403, {error:'origin'});
      const url = new URL(req.url, 'http://' + expected);
      res.setHeader('Cache-Control','no-store');
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
      res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
      res.setHeader('Content-Security-Policy', previewCsp);
      if (url.pathname === '/__test__/control' && req.method === 'POST') {
        const input = JSON.parse(await body(req));
        if (input.reset) { requests = []; records.clear(); }
        if (input.mode && !modes.has(input.mode)) return json(res, 400, {error:'unknown_mode'});
        mode = input.mode || 'saved'; return json(res, 200, {mode});
      }
      if (url.pathname === '/__test__/state' && req.method === 'GET') return json(res, 200, {mode, requests, records: records.size});
      if (url.pathname === '/__test__/submit' && req.method === 'POST') {
        const data = fields(await body(req), req.headers['content-type']);
        if (!/^[^@]+@example\.com$/i.test(data.email || '')) return json(res, 400, {error:'use_test_email_example_com'});
        requests.push(data);
        if (mode === 'timeout') return;
        if (mode === 'body-hang') { res.writeHead(200, {'Content-Type':'application/json'}); res.write('{"status":'); return; }
        if (mode === 'failed') return json(res, 500, {status:'failed'});
        if (mode === 'unconfirmed') { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end('Accepted'); }
        if (mode === 'invalid-id') return json(res, 200, {status:'saved', inquiry_id:{unexpected:true}});
        const key = data.request_key || 'no-js-' + requests.length;
        const duplicate = records.has(key);
        if (!duplicate) records.set(key, (data.form_type === 'newsletter' ? 'NL' : 'NCW') + '-20990101-' + String(records.size + 1).padStart(6,'0'));
        if (mode === 'saved-unconfirmed') { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end('Accepted'); }
        const payload = {status:'saved', inquiry_id:records.get(key), duplicate};
        return setTimeout(() => { if (!res.destroyed) json(res, 200, payload); }, 180);
      }
      if (!['GET','HEAD'].includes(req.method)) return json(res, 405, {error:'method'});
      // Disable GA transport while retaining a local event ledger for assertions.
      if (url.pathname === '/js/analytics.js') {
        res.writeHead(200, {'Content-Type':'text/javascript'});
        return res.end('window.NCW_ANALYTICS_ENABLED=true;window.__testEvents=[];window.gtag=function(){window.__testEvents.push(Array.from(arguments))};');
      }
      const redirect = config.redirects.find(item => item.source === url.pathname);
      if (redirect) { res.writeHead(redirect.permanent ? 308 : 307, {Location:redirect.destination + (redirect.destination.includes('?') ? '' : url.search)}); return res.end(); }
      let pathname;
      try { pathname = decodeURIComponent(url.pathname); } catch { return json(res, 400, {error:'path'}); }
      const segments = pathname.split('/').filter(Boolean);
      const privatePath = segments.some(p => p.startsWith('.') || p.startsWith('_')) || (segments.length > 1 && !allowedDirs.has(segments[0]));
      if (privatePath) return json(res, 404, {error:'not_found'});
      let path = resolve(root, '.' + pathname), status = 200;
      if (segments.length === 1 && !allowedDirs.has(segments[0]) && !allowedRootFiles.has(segments[0])) {
        path = resolve(root,'404.html'); status = 404;
      }
      if (!path.startsWith(resolve(root) + sep) && path !== resolve(root)) return json(res, 404, {error:'not_found'});
      let info = await stat(path).catch(() => null);
      if (info?.isDirectory()) {
        if (!pathname.endsWith('/')) { res.writeHead(308, {Location:url.pathname + '/' + url.search}); return res.end(); }
        path = resolve(path, 'index.html'); info = await stat(path).catch(() => null);
      }
      if (!info?.isFile() || !mime[extname(path).toLowerCase()]) { path = resolve(root,'404.html'); status = 404; }
      const actual = await realpath(path);
      if (!actual.startsWith(resolve(root) + sep)) return json(res, 404, {error:'not_found'});
      let data = await readFile(actual);
      const type = mime[extname(actual).toLowerCase()] || 'application/octet-stream';
      if (type.startsWith('text/html')) {
        data = Buffer.from(data.toString().replace(/(data-endpoint|action)="https:\/\/hook\.[^"]+"/g, '$1="/__test__/submit"').replace(/<body([^>]*)>/, '<body$1>' + banner));
      }
      res.writeHead(status, {'Content-Type':type,'Content-Length':data.length});
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { if (!res.headersSent) json(res, 500, {error:'preview_server'}); else res.destroy(); }
  });
  await new Promise((done, fail) => { server.once('error',fail); server.listen(port,'127.0.0.1',done); });
  return {server, origin:'http://127.0.0.1:' + server.address().port, close:async () => { server.closeAllConnections(); await new Promise(done => server.close(done)); }};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preview = await createPreviewServer({port:Number(process.env.PORT || 8769)});
  console.log('Local test preview: ' + preview.origin + '/ai-campus/');
  console.log('CRM / email delivery: disabled. Test email: test@example.com');
}
