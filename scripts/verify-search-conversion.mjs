import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { searchNotes } from '../js/insights-cards.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFile(join(root, rel), 'utf8');
const src = await read('js/insights-magazine.js');
const main = await read('js/main.js');
const block = src.match(/const serviceIntents = [\s\S]*?\nfunction link\(/)[0].replace(/\nfunction link\($/, '');
const { matchServiceIntent } = runInNewContext(block + '\n({matchServiceIntent})');
const cases = [['기업교육','ai-campus'],['AI 교육','ai-campus'],['교육 견적','ai-campus','proposal'],['공간 컨설팅','flexoffice'],['공유오피스','flexoffice'],['공유 오피스','flexoffice'],['대표 코칭','coaching'],['공공 기관 자문','public'],['기관 자문','public']];
for (const [q, s, t] of cases) { const m = matchServiceIntent(q); assert.equal(m?.s, s, q); if (t) assert.equal(m.t, t, q); }
for (const q of ['', '   ', 'ChatGPT', '프롬프트', 'zzzz없는검색어', '공공데이터']) assert.equal(matchServiceIntent(q), null, 'non-purchase: ' + q);
// s/t exist in main.js service mapping
const tiers = main.match(/var tierOptions = \{([\s\S]*?)\n  \};/)[1];
for (const q of cases.map(c => c[0])) {
  const m = matchServiceIntent(q);
  assert.ok(new RegExp('(^|\\n)\\s*"?' + m.s.replace('-', '\\-') + '"?: \\[[\\s\\S]*?\\["' + m.t + '"').test(tiers), q + ': s/t not in main.js');
  assert.ok(main.includes(m.inquiry), m.inquiry + ' label not in main.js');
}
// CTA ids, safety, preserved behavior
for (const cta of ['insights_search_service', 'insights_search_inquiry', 'insights_zero_inquiry']) assert.ok(src.includes(cta), cta);
assert.ok(!/utm_/.test(src), 'no UTM');
assert.ok(!/innerHTML\s*=[^;]*(state\.q|intent)/.test(src.replace(/root\.innerHTML=pageItems\.length\?[^;]*;/, '')), 'q not injected via innerHTML');
assert.ok(src.includes('state.page===1') && src.includes('if(zero && !intent)'), 'empty search/zero gating');
for (const keep of ['popstate', 'insights-pagination', 'empty-reset', 'searchNotes(data,state)', "saveState(true)"]) assert.ok(src.includes(keep), 'preserved: ' + keep);
// search regression with feed
const feed = JSON.parse((await read('js/insights-data.js')).match(/window\.NCW_FEED = ([\s\S]*);\s*$/)[1]);
const posts = feed.filter(i => i.src === 'insight');
assert.equal(searchNotes(feed, {}).length, posts.length);
assert.equal(searchNotes(feed, {q: 'zzzz없는검색어'}).length, 0);
const tag = posts.flatMap(p => p.tags || [])[0];
assert.ok(searchNotes(feed, {tag}).every(p => p.tags.includes(tag)));
console.log('verify-search-conversion: OK');
