// Shared by the static publisher and the browser fallback.
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const safeImage = value => /^\/(?!\/)/.test(value || "") || /^https?:\/\//.test(value || "") ? value : "/img/og.png";
const externalCovers = {
  brunch: { label: "브런치 · 에세이", image: "/img/flexoffice/space-lounge.webp", kicker: "SPACE & WORK", headline: "일이 잘되는 공간과 방법", type: "space" },
  threads: { label: "Threads · 기록", image: "/img/ai-campus/dashboard-desk.webp", kicker: "DAILY NOTE", headline: "일하는 방식의 작은 발견", type: "ai" },
  notion: { label: "노션 · 자료실", kicker: "AI PLAYBOOK", headline: "업무에 바로 쓰는 AI", type: "playbook" }
};
export function renderMagazine(feed) {
  if (!feed.length) return '<p>첫 번째 인사이트를 준비하고 있습니다.</p>';
  return feed.map((item, index) => {
    const external = /^https?:\/\//.test(item.url);
    let cover = external ? (externalCovers[item.src] || {label:"외부 콘텐츠",type:"ai"}) : { label:item.category || "인사이트", type:"article" };
    if (external && /portfolio/.test(item.url)) cover = { label:"노션 · 포트폴리오", image:"/img/ai-campus/workshop-session.webp", kicker:"IN PRACTICE", headline:"현장에서 쌓아 온 경험", type:"space" };
    const image = external ? cover.image : (item.thumbnail || item.image || "/img/og.png");
    const coverHtml = (image ? `<img src="${esc(safeImage(image))}" alt="${external ? "" : esc(item.imageAlt || "")}" width="1600" height="900" ${index < 6 ? 'loading="eager"' : 'loading="lazy"'}>` : '<span class="thumb-monogram" aria-hidden="true">AI<span>↗</span></span>') + (external ? `<span class="thumb-editorial"><small>${esc(cover.kicker || "CHANCENOTE")}</small><strong>${esc(cover.headline || item.title)}</strong></span>` : '');
    return `<article class="thumb-card"><a href="${esc(item.url)}"${external ? ' target="_blank" rel="noopener"' : ''}><div class="thumb-cover thumb-${cover.type}">${coverHtml}</div><div class="thumb-body"><div class="thumb-topline"><span class="thumb-source">${external ? "채널·자료실 ↗" : "인사이트"}</span><span class="sep" aria-hidden="true">·</span><span class="thumb-category">${esc(cover.label)}</span></div><h3>${esc(item.title)}</h3>${!external && (item.audience || item.takeaway) ? `<p class="thumb-brief">${item.audience ? `<span><b>대상</b> ${esc(item.audience)}</span>` : ""}${item.takeaway ? `<span><b>가져갈 것</b> ${esc(item.takeaway)}</span>` : ""}</p>` : ""}<div class="thumb-meta"><span>${external ? "외부 채널에서 보기" : esc(item.date)}</span><span aria-hidden="true">${external ? "↗" : "→"}</span></div></div></a></article>`;
  }).join("\n");
}

export function renderLatestNote(feed) {
  const post = feed.find(item => item.src === 'insight');
  if (!post) return '';
  return `<a class="latest-note" href="${esc(post.url)}"><div class="latest-note-cover"><img src="${esc(safeImage(post.thumbnail || post.image))}" alt="${esc(post.imageAlt || '')}" width="1600" height="900" fetchpriority="high"></div><div class="latest-note-copy"><span class="eyebrow">Latest Note · ${esc(post.topic || post.category)}</span><h2>${esc(post.title)}</h2><p>${esc(post.description)}</p><div class="latest-note-meta"><span>${esc(post.date)}</span><strong>노트 읽기 <span aria-hidden="true">→</span></strong></div></div></a>`;
}
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/챗지피티|챗gpt/gi,'chatgpt').replace(/클로드/gi,'claude').replace(/공유\s*오피스/g,'공유오피스').replace(/\s+/g,'');
export function searchNotes(feed, {q='', topic='', tag=''} = {}) {
  const terms = q.trim().split(/\s+/).filter(Boolean).map(normalize);
  return feed.filter(item => item.src === 'insight').map((item,index) => {
    const title = normalize(item.title), tags = normalize((item.tags || []).join(' '));
    const description = normalize(item.description), body = normalize(item.searchText);
    const matches = (!topic || item.topic === topic) && (!tag || (item.tags || []).includes(tag)) && terms.every(term => (title+tags+description+body).includes(term));
    const score = terms.reduce((sum,term)=>sum+(title.includes(term)?8:0)+(tags.includes(term)?5:0)+(description.includes(term)?3:0)+(body.includes(term)?1:0),0);
    return {item,index,matches,score};
  }).filter(row=>row.matches).sort((a,b)=>b.score-a.score || a.index-b.index).map(row=>row.item);
}
