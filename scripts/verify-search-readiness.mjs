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
// Compare feed dimensions with the image bytes, so new posts need no test fixture.
function imageDimensions(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      }
      const size = buf.readUInt16BE(i + 2);
      assert.ok(size >= 2, 'invalid JPEG segment');
      i += size + 2;
    }
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    for (let offset = 12; offset + 8 <= buf.length;) {
      const kind = buf.toString('ascii', offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4), data = offset + 8;
      assert.ok(data + size <= buf.length, 'invalid WebP chunk');
      if (kind === 'VP8X' && size >= 10) return [buf.readUIntLE(data + 4, 3) + 1, buf.readUIntLE(data + 7, 3) + 1];
      if (kind === 'VP8 ' && size >= 10) return [buf.readUInt16LE(data + 6) & 0x3fff, buf.readUInt16LE(data + 8) & 0x3fff];
      if (kind === 'VP8L' && size >= 5) {
        const bits = buf.readUInt32LE(data + 1);
        return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
      }
      offset = data + size + (size % 2);
    }
  }
  assert.fail('unsupported or invalid thumbnail image');
}
const feedJs = await read('js/insights-data.js');
const feed = JSON.parse(feedJs.match(/window\.NCW_FEED = ([\s\S]*);\s*$/)[1]);
const insightItems = feed.filter(item => item.src === 'insight');
for (const item of insightItems) {
  const slug = item.url.split('/').filter(Boolean).at(-1), dimensions = item.thumbnailCard ? item.thumbnailCardSize : item.thumbnailSize;
  const image = new URL(item.thumbnailCard || item.thumbnail, origin);
  assert.equal(image.origin, origin, slug + ': thumbnail must be a local asset');
  const actual = imageDimensions(await readFile(join(root, decodeURIComponent(image.pathname))));
  assert.deepEqual([dimensions?.width, dimensions?.height], actual, slug + ': thumbnail size');
  const rendered = renderMagazine([item]);
  assert.ok(rendered.includes('width="' + dimensions.width + '" height="' + dimensions.height + '"'));
}
const latestImage = renderLatestNote(feed).match(/<img\b[^>]*>/)?.[0];
assert.ok(latestImage, 'latest note: missing image');
const latestPath = new URL(latestImage.match(/\bsrc="([^"]+)"/)[1], origin);
assert.equal(latestPath.origin, origin, 'latest note: image must be local');
const latestActual = imageDimensions(await readFile(join(root, decodeURIComponent(latestPath.pathname))));
assert.deepEqual(['width', 'height'].map(key => Number(latestImage.match(new RegExp('\\b' + key + '="(\\d+)"'))?.[1])), latestActual, 'latest note: image dimensions');
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
console.log(JSON.stringify({result:'PASS',pages:pages.size,articles,internalLinks:links,thumbnailDimensions:insightItems.length,lastmodPolicyCases:4}));
