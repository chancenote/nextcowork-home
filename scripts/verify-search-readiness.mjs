import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { renderMagazine, renderLatestNote } from '../js/insights-cards.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://www.nextcw.com';
const read = rel => readFile(join(root, rel), 'utf8');
const xml = await read('sitemap.xml');
const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => ({ url: m[1].match(/<loc>(.*?)<\/loc>/)[1], lastmod: m[1].match(/<lastmod>(.*?)<\/lastmod>/)[1] }));
const pages = new Map();
const titles = new Set(), descriptions = new Set();
let articles = 0;
for (const entry of entries) {
  const url = new URL(entry.url);
  assert.equal(url.origin, origin);
  const html = await read(join(url.pathname, 'index.html'));
  pages.set(entry.url, html);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  assert.ok(title && description, entry.url + ': missing meta');
  assert.ok(!titles.has(title), entry.url + ': duplicate title');
  assert.ok(!descriptions.has(description), entry.url + ': duplicate description');
  titles.add(title); descriptions.add(description);
  assert.equal(html.match(/<link rel="canonical" href="([^"]*)"/)?.[1], entry.url);
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const schema = JSON.parse(match[1]);
    const nodes = schema['@graph'] || [schema];
    const article = nodes.find(node => ['BlogPosting', 'Article'].includes(node['@type']));
    if (article) { assert.equal(article.dateModified, entry.lastmod, entry.url + ': date mismatch'); articles++; }
  }
}
let links = 0;
for (const [from, html] of pages) {
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), from);
    if (url.origin !== origin) continue;
    const target = pages.get(url.origin + url.pathname);
    if (url.hash && target) {
      const ids = [...target.matchAll(/\b(?:id|name)="([^"]*)"/g)].map(m => m[1]);
      assert.ok(ids.includes(decodeURIComponent(url.hash.slice(1))), from + ': missing ' + url.href);
    }
    const rel = url.pathname.endsWith('/') ? join(url.pathname, 'index.html') : url.pathname;
    await access(join(root, rel)); links++;
  }
}
assert.ok((await read('about/index.html')).includes('href="/public/#scope-space"'));
const expected = { 'aside-browser-workflow':[1200,630], 'ax-one-workflow-playbook':[720,405], 'development-finance-ai-review-im':[1200,675], 'chatgpt-space-10-features':[1600,910], 'ai-cowork-six-conditions':[1600,900], 'frontier-model-settings-skills-update':[1672,941], 'ai-training-vendor-selection':[720,405], 'gpt6-intelligent-ui':[1672,941], 'ai-training-request-brief':[720,406], 'ai-fast-failure':[720,406], 'flexoffice-feasibility-checklist':[720,406], 'ai-workspace-builder':[720,405] };
const feedJs = await read('js/insights-data.js');
const feed = JSON.parse(feedJs.match(/window\.NCW_FEED = ([\s\S]*);\s*$/)[1]);
for (const item of feed.filter(item => item.src === 'insight')) {
  const slug = item.url.split('/').filter(Boolean).at(-1), dimensions = item.thumbnailCard ? item.thumbnailCardSize : item.thumbnailSize;
  assert.deepEqual([dimensions.width, dimensions.height], expected[slug], slug + ': thumbnail size');
  const rendered = renderMagazine([item]);
  assert.ok(rendered.includes('width="' + dimensions.width + '" height="' + dimensions.height + '"'));
}
assert.ok(renderLatestNote(feed).includes('width="1200" height="630"'));
const build = await read('scripts/build-insights.mjs');
const hashSource = build.match(/function contentHash\(text\) \{[\s\S]*?\n\}/)[0];
const resolveSource = build.match(/function resolveLastmod\(state, entries, today\) \{[\s\S]*?\n\}/)[0];
const resolve = runInNewContext(hashSource + '\n' + resolveSource + '\nresolveLastmod', {createHash});
const stale = {'/article/':{hash:'old',date:'2026-10-08'}};
assert.equal(resolve(stale,[{path:'/article/',source:'tracking edit',modified:'2026-08-04'}],'2026-10-13')['/article/'].date,'2026-08-04');
assert.equal(resolve(stale,[{path:'/article/',source:'real correction',modified:'2026-10-10'}],'2026-10-13')['/article/'].date,'2026-10-10');
const first = resolve({},[{path:'/static/',source:'cache?v=ncw-ab12'}],'2026-10-10');
assert.equal(resolve(first,[{path:'/static/',source:'cache?v=ncw-ff34'}],'2026-10-13')['/static/'].date,'2026-10-10');
assert.equal(resolve(first,[{path:'/static/',source:'meaningful link edit'}],'2026-10-13')['/static/'].date,'2026-10-13');
console.log(JSON.stringify({result:'PASS',pages:pages.size,articles,internalLinks:links,thumbnailDimensions:Object.keys(expected).length,lastmodPolicyCases:4}));
