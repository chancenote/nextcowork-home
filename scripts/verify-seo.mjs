import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://www.nextcw.com';
const read = path => readFile(join(root, path), 'utf8');
const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (_, entity) => {
  if (entity[0] === '#') return String.fromCodePoint(entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
  return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[entity.toLowerCase()];
});
const attributes = tag => Object.fromEntries([...tag.matchAll(/([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(([, key, double, single, bare]) => [key.toLowerCase(), decode(double ?? single ?? bare)]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match => attributes(match[0]));
const types = node => [].concat(node?.['@type'] || []);
function objects(value) {
  if (!value || typeof value !== 'object') return [];
  return Array.isArray(value) ? value.flatMap(objects) : [value, ...Object.values(value).flatMap(objects)];
}
function one(values, label) {
  assert.equal(values.length, 1, `${label}: expected exactly one, found ${values.length}`);
  assert.ok(values[0]?.trim(), `${label}: empty value`);
  return values[0];
}
function localUrl(value, label) {
  assert.match(value, /^https:\/\//, `${label}: use an absolute HTTPS URL`);
  const url = new URL(value);
  assert.equal(url.origin, origin, `${label}: wrong site origin`);
  assert.equal(url.search, '', `${label}: tracking queries are not canonical`);
  return url;
}
async function localImage(value, label) {
  const url = localUrl(value, label);
  const info = await stat(join(root, decodeURIComponent(url.pathname)));
  assert.ok(info.isFile() && info.size > 0, `${label}: missing/empty image`);
  return url.pathname;
}

// Audit Git's public HTML inventory, not just the URLs already in the sitemap.
// files/_src contains PDF source HTML and is explicitly excluded from deployment.
const ignoredSourcePrefixes = ['files/_src/'];
const vercelIgnore = (await read('.vercelignore')).split(/\r?\n/).map(line => line.trim());
for (const prefix of ignoredSourcePrefixes) assert.ok(vercelIgnore.includes(prefix.slice(0, -1)), `${prefix}: deployment exclusion missing`);
const tracked = execFileSync('git', ['ls-files', '-z', '--', '*.html'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const files = tracked.filter(path => !ignoredSourcePrefixes.some(prefix => path.startsWith(prefix)));
assert.ok(files.length > 0, 'no public HTML found');
const pages = new Map(), definitions = new Map(), crawlPaths = new Set();
const uniqueTitles = new Set(), uniqueDescriptions = new Set();
for (const file of files) {
  const html = (await read(file)).replace(/<!--[\s\S]*?-->/g, '');
  // HTML permits omitted head tags; existing compact cardnews uses that form.
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]
    ?? html.split(/<(?:body|main|section|div|header|article)\b/i)[0];
  assert.ok(head, `${file}: missing head`);
  const language = one(tags(html, 'html').map(tag => tag.lang), `${file}: html lang`);
  assert.match(language, /^ko(?:-KR)?$/i, `${file}: Korean language required`);
  const meta = tags(head, 'meta'), links = tags(head, 'link');
  const title = decode(one([...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)].map(match => match[1]), `${file}: title`));
  const description = one(meta.filter(tag => tag.name?.toLowerCase() === 'description').map(tag => tag.content), `${file}: description`);
  const image = one(meta.filter(tag => tag.property?.toLowerCase() === 'og:image').map(tag => tag.content), `${file}: og:image`);
  crawlPaths.add(await localImage(image, `${file}: og:image`));
  const canonical = one(links.filter(tag => tag.rel?.toLowerCase().split(/\s+/).includes('canonical')).map(tag => tag.href), `${file}: canonical`);
  assert.equal(localUrl(canonical, `${file}: canonical`).hash, '', `${file}: canonical contains a fragment`);
  const route = '/' + file.replace(/(?:^|\/)index\.html$/, '/').replace(/^\//, '');
  const url = origin + route;
  const robots = meta.filter(tag => tag.name?.toLowerCase() === 'robots');
  assert.ok(robots.length <= 1, `${file}: duplicate robots directives`);
  const noindex = robots.some(tag => /(?:^|[\s,])noindex(?:$|[\s,])/i.test(tag.content || ''));
  const auxiliary = file.startsWith('img/');
  if (auxiliary || file === '404.html') assert.ok(noindex, `${file}: auxiliary/error page must be noindex`);
  else assert.ok(!noindex, `${file}: primary page is unexpectedly noindex`);
  if (!auxiliary) assert.equal(canonical, url, `${file}: canonical must match deployed route`);
  if (!noindex) {
    assert.ok(!uniqueTitles.has(title), `${file}: duplicate title`);
    assert.ok(!uniqueDescriptions.has(description), `${file}: duplicate description`);
    uniqueTitles.add(title); uniqueDescriptions.add(description);
  }
  const nodes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (attributes(match[1]).type?.toLowerCase() !== 'application/ld+json') continue;
    let json;
    try { json = JSON.parse(match[2]); } catch (error) { assert.fail(`${file}: invalid JSON-LD: ${error.message}`); }
    nodes.push(...objects(json).filter(node => node['@type']));
  }
  for (const node of nodes) if (node['@id']) {
    const id = new URL(node['@id'], url).href;
    definitions.set(id, [...(definitions.get(id) || []), node]);
  }
  pages.set(url, { file, url, canonical, noindex, auxiliary, nodes, image, description });
  crawlPaths.add(route);
  for (const asset of [...tags(html, 'img').map(tag => tag.src), ...tags(head, 'script').map(tag => tag.src), ...links.filter(tag => tag.rel === 'stylesheet').map(tag => tag.href)].filter(Boolean)) {
    const assetUrl = new URL(asset, url);
    if (assetUrl.origin === origin) crawlPaths.add(assetUrl.pathname);
  }
}
for (const page of pages.values()) if (page.auxiliary) {
  const parent = pages.get(page.canonical);
  assert.ok(parent && !parent.noindex, `${page.file}: canonical parent must be an indexable page`);
}
const hasType = (node, type) => types(node).includes(type);
const resolveEntity = (reference, type, label) => {
  assert.ok(reference && typeof reference === 'object' && !Array.isArray(reference), `${label}: missing entity`);
  const definitionsForId = definitions.get(reference['@id']) || [];
  assert.ok(reference['@id'] && definitionsForId.some(node => hasType(node, type) && node.name), `${label}: unresolved ${type} @id`);
};
const home = pages.get(origin + '/');
assert.ok(home?.nodes.some(node => hasType(node, 'Organization') && node.name && node.url === origin + '/' && node['@id']), 'home: Organization missing or incomplete');
let localBusiness;
for (const path of ['/', '/contact/']) {
  const local = pages.get(origin + path)?.nodes.filter(node => hasType(node, 'LocalBusiness')) || [];
  assert.equal(local.length, 1, `${path}: expected one Jeonju LocalBusiness`);
  const business = local[0], address = business.address;
  assert.ok(business['@id'] && business.name && business.url, `${path}: LocalBusiness identity incomplete`);
  assert.match(address?.addressLocality || '', /전주/, `${path}: LocalBusiness locality must be Jeonju`);
  assert.ok(address.streetAddress && address.addressCountry === 'KR', `${path}: LocalBusiness postal address incomplete`);
  localBusiness ||= business;
  assert.deepEqual(business, localBusiness, `${path}: LocalBusiness identity/contact/address mismatch`);
  resolveEntity(business.parentOrganization, 'Organization', `${path}: parentOrganization`);
}
let services = 0;
const serviceIds = new Set();
for (const path of ['/flexoffice/', '/ai-campus/', '/public/', '/coaching/']) {
  const nodes = pages.get(origin + path)?.nodes.filter(node => hasType(node, 'Service')) || [];
  assert.ok(nodes.length, `${path}: missing Service`);
  for (const service of nodes) {
    assert.ok(service.name && service.description, `${path}: incomplete Service`);
    resolveEntity(service.provider, 'Organization', `${path}: provider`);
    assert.ok(service['@id'] && !serviceIds.has(service['@id']), `${path}: missing/duplicate Service @id`);
    serviceIds.add(service['@id']);
    assert.equal(localUrl(service.url, `${path}: Service URL`).pathname, path, `${path}: incorrect Service URL`);
    services++;
  }
}
const articleTypes = new Set(['Article', 'BlogPosting', 'NewsArticle', 'TechArticle']);
const articlePages = [...pages.values()].filter(page => /^insights\/[^/]+\/index\.html$/.test(page.file));
for (const page of articlePages) {
  const articles = page.nodes.filter(node => types(node).some(type => articleTypes.has(type)));
  assert.equal(articles.length, 1, `${page.file}: expected one Article subtype`);
  const article = articles[0];
  assert.ok(article['@id'] && article.headline && article.description, `${page.file}: incomplete Article identity`);
  assert.equal(article.url, page.canonical, `${page.file}: Article URL differs from canonical`);
  assert.equal(article.mainEntityOfPage?.['@id'] || article.mainEntityOfPage, page.canonical, `${page.file}: mainEntityOfPage differs from canonical`);
  assert.match(article.inLanguage || '', /^ko(?:-KR)?$/i, `${page.file}: Article language`);
  for (const key of ['datePublished', 'dateModified']) assert.ok(typeof article[key] === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(article[key]) && !Number.isNaN(Date.parse(article[key])), `${page.file}: invalid ${key}`);
  assert.ok(Date.parse(article.dateModified) >= Date.parse(article.datePublished), `${page.file}: modification precedes publication`);
  assert.equal(article.image, page.image, `${page.file}: Article/OG image mismatch`);
  resolveEntity(article.author, 'Person', `${page.file}: author`);
  assert.ok(pages.has(localUrl(article.author.url, `${page.file}: author URL`).href), `${page.file}: author page is missing`);
  resolveEntity(article.publisher, 'Organization', `${page.file}: publisher`);
}

const sitemap = await read('sitemap.xml');
assert.match(sitemap, /<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/);
const sitemapEntries = [...sitemap.matchAll(/<url>\s*([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  url: decode(one([...entry.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), 'sitemap loc')),
  lastmod: one([...entry.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(match => match[1]), 'sitemap lastmod')
}));
assert.equal(new Set(sitemapEntries.map(entry => entry.url)).size, sitemapEntries.length, 'sitemap has duplicate URLs');
const expectedUrls = [...pages.values()].filter(page => !page.noindex).map(page => page.canonical).sort();
assert.deepEqual(sitemapEntries.map(entry => entry.url).sort(), expectedUrls, 'sitemap must include every indexable public page and no auxiliary/error pages');
for (const entry of sitemapEntries) {
  assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!Number.isNaN(Date.parse(entry.lastmod)), `${entry.url}: invalid sitemap date`);
  const article = pages.get(entry.url).nodes.find(node => types(node).some(type => articleTypes.has(type)));
  if (article) assert.equal(entry.lastmod, article.dateModified.slice(0, 10), `${entry.url}: Article/sitemap date mismatch`);
}

const robots = await read('robots.txt');
assert.ok(robots.split(/\r?\n/).some(line => /^sitemap\s*:/i.test(line) && line.replace(/^sitemap\s*:\s*/i, '').trim() === origin + '/sitemap.xml'), 'robots: sitemap declaration missing');
assert.ok(!/^noindex\s*:/im.test(robots), 'robots.txt does not support noindex; use meta robots');
const groups = [];
let group;
for (const raw of robots.split(/\r?\n/)) {
  const line = raw.replace(/#.*/, '').trim(), match = line.match(/^([^:]+):\s*(.*)$/);
  if (!match) continue;
  const key = match[1].toLowerCase().trim(), value = match[2].trim();
  if (key === 'user-agent') {
    if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
    group.agents.push(value);
  } else if (group && ['allow', 'disallow'].includes(key) && value) group.rules.push({ allow: key === 'allow', pattern: value });
}
assert.ok(groups.some(group => group.agents.includes('*')), 'robots: default user-agent group missing');
for (const group of groups) for (const path of crawlPaths) {
  const matches = group.rules.filter(rule => {
    const pattern = rule.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$');
    return new RegExp('^' + pattern).test(path);
  }).sort((a, b) => b.pattern.replace(/[*$]/g, '').length - a.pattern.replace(/[*$]/g, '').length || Number(b.allow) - Number(a.allow));
  assert.ok(!matches.length || matches[0].allow, `robots: ${group.agents.join(', ')} blocks public page/asset ${path}`);
}
console.log(JSON.stringify({ result: 'PASS', trackedHtml: tracked.length, publicHtml: pages.size, indexablePages: expectedUrls.length, noindexPages: pages.size - expectedUrls.length, articlePages: articlePages.length, services, localBusinessPages: 2, crawlPaths: crawlPaths.size }));
