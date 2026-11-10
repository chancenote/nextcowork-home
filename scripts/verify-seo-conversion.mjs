import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFile(join(root, rel), 'utf8');
const article = await read('insights/chatgpt-space-10-features/index.html');
const source = await read('content/insights/2026-10-11-chatgpt-space-10-features.md');
assert.ok(source.includes('cta_service: "ai-campus"'));
assert.ok(!source.includes('[CEO AI 코칭](/coaching/)'));
assert.ok(source.includes('[AI Campus 기업·공공기관 AI 교육](/ai-campus/)'));
assert.ok(article.includes('<title>ChatGPT 스페이스 사용법: 핵심 기능 10가지와 고객제안서 예시'));
assert.ok(article.includes('<link rel="canonical" href="https://www.nextcw.com/insights/chatgpt-space-10-features/">'));
const schemas = [...article.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => { const s = JSON.parse(m[1]); return s['@graph'] || [s]; });
const posting = schemas.find(s => s['@type'] === 'BlogPosting');
assert.equal(posting.datePublished, '2026-10-11');
assert.equal(posting.dateModified, '2026-10-11');
const faq = schemas.find(s => s['@type'] === 'FAQPage');
assert.equal(faq.mainEntity.length, 3);
assert.ok(faq.mainEntity.every(q => !q.acceptedAnswer.text.includes('CEO AI 코칭') && !q.acceptedAnswer.text.includes('AI Campus 기업교육')));
const cta = article.match(/<div class="post-cta reveal">([\s\S]*?)<\/div>/)?.[1];
assert.ok(cta.includes('href="/ai-campus/"'));
assert.ok(cta.includes('기업·공공기관 AI 교육 살펴보기'));
assert.ok(!cta.includes('무료 사전진단'));
const campus = await read('ai-campus/index.html');
assert.ok(campus.includes('기업·공공기관 AI 실무교육 / <b>AI Campus</b>'));
const briefIndex = campus.indexOf('href="/insights/ai-training-request-brief/"');
assert.ok(briefIndex >= 0 && briefIndex < campus.indexOf('<video'));
const flex = await read('flexoffice/index.html');
assert.match(flex, /<title>공유오피스 도입·전환 컨설팅/);
assert.ok(flex.match(/<ul class="quick-links[\s\S]*?<\/ul>/)?.[0].includes('/insights/flexoffice-feasibility-checklist/'));
const pub = await read('public/index.html');
assert.match(pub, /<title>공공 공유공간 건립·운영 자문 · 공공기관 AI 교육/);
for (const [rel, h1] of [
  ['ai-campus/index.html', 'AI를 배우는 자리에서,<br><span class="accent">우리 업무에 쓰는 과정으로.</span>'],
  ['flexoffice/index.html', '보고서가 아니라,<br><span class="accent">작동하는 공간</span>을 설계합니다.'],
  ['public/index.html', '일이 잘되는 <span class="accent">공간</span>을 만들고,<br>일이 잘되는 <span class="accent">방식</span>을 정착시킵니다.']
]) {
  const html = await read(rel);
  assert.equal(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1], h1);
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
}
console.log('SEO conversion checks passed: article metadata, dated facts, FAQ scope, service CTA, early guide links, and preserved service H1s.');
