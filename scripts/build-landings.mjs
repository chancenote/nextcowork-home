/* 오퍼 랜딩 생성기 — content/landings/<주소>.json 한 개가 /go/<주소>/ 한 장이 된다.
   틀은 8블록 고정(히어로 · 문제 3 · 받는 것 3 · 증거 · 가격·절차 · 대표 · FAQ 4 · 전용 폼).
   규칙: 상단 메뉴 없음, 다른 서비스 링크 0, 버튼 문구는 랜딩당 1종, 슬로건은 푸터 한 번.
   가격·실적·기관명은 원고(JSON)에만 있고, 서비스 페이지의 공개 표기와 같아야 한다.
   실행: node scripts/build-landings.mjs  (npm run build 가 인사이트 빌드보다 먼저 부른다) */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://www.nextcw.com";
const AI_NOTE = "이 페이지의 그림은 AI로 제작한 연출 이미지입니다.";

const esc = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* 절차 3단계의 작은 그림(F4). 글자는 HTML로 쓰고 그림에는 넣지 않는다. 색은 공식 팔레트만. */
const ICONS = {
  note: '<rect x="12" y="8" width="32" height="40" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M19 19h18M19 27h18M19 35h10" stroke="#B99EFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="41" cy="41" r="8" fill="#7950E8"/><path d="M37.5 41l2.5 2.5 4.5-5" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  mail: '<rect x="8" y="14" width="40" height="28" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M9.5 17.5L28 31l18.5-13.5" fill="none" stroke="#7950E8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
  screen: '<rect x="8" y="10" width="40" height="26" rx="4" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M16 28l7-7 6 5 10-9" fill="none" stroke="#7950E8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 36v8M19 47h18" stroke="#302D7C" stroke-width="2.5" stroke-linecap="round"/>',
  calendar: '<rect x="9" y="12" width="38" height="34" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M9 22h38" stroke="#302D7C" stroke-width="2.5"/><path d="M19 8v8M37 8v8" stroke="#302D7C" stroke-width="2.5" stroke-linecap="round"/><rect x="26" y="28" width="12" height="10" rx="2.5" fill="#7950E8"/><path d="M16 31h5M16 38h5" stroke="#B99EFF" stroke-width="2.5" stroke-linecap="round"/>',
  badge: '<rect x="10" y="8" width="30" height="38" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M17 18h16M17 26h16" stroke="#B99EFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="38" cy="36" r="8" fill="#7950E8"/><path d="M34 42l-2 8 6-3 6 3-2-8" fill="#7950E8"/><circle cx="38" cy="36" r="3" fill="#FFFFFF"/>',
  chat: '<path d="M9 13h38v25H25l-9 8v-8H9z" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5" stroke-linejoin="round"/><path d="M18 22h20M18 30h12" stroke="#7950E8" stroke-width="2.5" stroke-linecap="round"/>',
  report: '<rect x="12" y="8" width="32" height="40" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M19 17h18" stroke="#B99EFF" stroke-width="2.5" stroke-linecap="round"/><rect x="19" y="32" width="5" height="9" rx="1.5" fill="#B99EFF"/><rect x="26" y="27" width="5" height="14" rx="1.5" fill="#7950E8"/><rect x="33" y="23" width="5" height="18" rx="1.5" fill="#302D7C"/>',
  search: '<rect x="9" y="9" width="30" height="38" rx="5" fill="#FFFFFF" stroke="#302D7C" stroke-width="2.5"/><path d="M16 19h16M16 27h9" stroke="#B99EFF" stroke-width="2.5" stroke-linecap="round"/><circle cx="35" cy="35" r="8" fill="#FFFFFF" stroke="#7950E8" stroke-width="2.5"/><path d="M41 41l6 6" stroke="#7950E8" stroke-width="3" stroke-linecap="round"/>'
};

function icon(name) {
  if (!ICONS[name]) throw new Error(`알 수 없는 절차 그림: ${name}`);
  return `<svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

function figureImg(slug, name, fig, sizes, { hero = false } = {}) {
  const base = `/img/go/${slug}/${name}`;
  return `<img src="${base}.webp" srcset="${base}-720w.webp 720w, ${base}.webp ${fig.w}w" sizes="${sizes}" width="${fig.w}" height="${fig.h}" ${hero ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(fig.alt)}">`;
}

const SIZES_HALF = "(max-width: 900px) calc(100vw - 40px), 560px";
const SIZES_WIDE = "(max-width: 900px) calc(100vw - 40px), 620px";

function jsonLd(d) {
  const url = `${siteUrl}/go/${d.slug}/`;
  const offer = { "@type": "Offer", name: d.offer.name };
  if (d.offer.price) {
    offer.priceCurrency = "KRW";
    offer.price = String(d.offer.price);
    // 화면에 '부터'가 붙는 시작가는 최소가로, 단일 가격은 그대로 적는다.
    if (d.offer.from !== false) offer.priceSpecification = { "@type": "PriceSpecification", minPrice: d.offer.price, priceCurrency: "KRW" };
  }
  offer.description = d.offer.description;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#webpage`, url, name: d.pageName, inLanguage: "ko", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${url}#service` } },
      { "@type": "Service", "@id": `${url}#service`, url, name: d.serviceName, serviceType: d.serviceType, provider: { "@id": `${siteUrl}/#org` }, areaServed: "KR", description: d.serviceDescription, offers: offer },
      { "@type": "FAQPage", mainEntity: d.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) }
    ]
  }, null, 2);
}

function render(d, endpoint) {
  const url = `${siteUrl}/go/${d.slug}/`;
  const f = d.figures;
  const aiNoteAt = f.f3 ? "gets" : f.f2 ? "problems" : "hero";
  const aiNote = `<p class="lp-ai-note">${AI_NOTE}</p>`;
  const cta = esc(d.cta);
  const heroBase = `/img/go/${d.slug}/f1-scene`;

  const problems = `<ul class="lp-problems${f.f2 ? "" : " lp-problems--row"}">
${d.problems.map((p) => `          <li>${esc(p)}</li>`).join("\n")}
        </ul>`;
  const gets = `<ol class="lp-gets${f.f3 ? "" : " lp-gets--row"}">
${d.gets.map((g) => `          <li>${esc(g)}</li>`).join("\n")}
        </ol>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/js/analytics.js" defer></script>
<title>${esc(d.title)}</title>
<meta name="description" content="${esc(d.description)}">
<link rel="canonical" href="${url}">${d.index === false ? '\n<meta name="robots" content="noindex, follow">' : ""}
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(d.ogTitle)}">
<meta property="og:description" content="${esc(d.ogDescription)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${siteUrl}${d.ogImage}">
<meta property="og:site_name" content="넥스트코웍 NEXT COWORK">
<meta property="og:locale" content="ko_KR">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(d.ogTitle)}">
<meta name="twitter:description" content="${esc(d.ogDescription)}">
<meta name="twitter:image" content="${siteUrl}${d.ogImage}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#302D7C">
<link rel="preload" as="image" href="${heroBase}.webp" imagesrcset="${heroBase}-720w.webp 720w, ${heroBase}.webp ${f.f1.w}w" imagesizes="${SIZES_HALF}" fetchpriority="high">
<link rel="preload" as="style" href="/css/fonts.css" data-font-styles>
<noscript><link rel="stylesheet" href="/css/fonts.css"></noscript>
<script src="/js/fonts.js" defer></script>
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/page-landing.css">
<script type="application/ld+json">
${jsonLd(d)}
</script>
</head>
<body class="lp">
<!-- 이 파일은 scripts/build-landings.mjs 가 content/landings/${d.slug}.json 으로 만든다. 직접 고치지 말고 원고를 고친 뒤 npm run build. -->

<a class="skip-link" href="#main-content">본문 바로가기</a>
<header class="nav">
  <div class="nav-inner">
    <span class="nav-logo"><img class="nav-logo-img" src="/img/brand/nextcowork-logo-purple.svg" alt="NEXT COWORK" width="80" height="50"></span>
    <a class="btn btn-primary lp-nav-cta" href="#apply" data-landing-cta="header">${cta}</a>
  </div>
</header>

<main id="main-content">

  <!-- B1 히어로 -->
  <section class="lp-hero">
    <div class="container lp-hero-grid">
      <div>
        <p class="lp-voice">${esc(d.voice)}</p>
        <h1>${d.h1.map(esc).join("<br>")}</h1>
        <ul class="lp-terms" aria-label="조건">
${d.terms.map((t) => `          <li>${esc(t)}</li>`).join("\n")}
        </ul>
        <a class="btn btn-primary lp-cta" id="lp-hero-cta" href="#apply" data-landing-cta="hero">${cta} <span class="arr">→</span></a>
      </div>
      <figure class="lp-figure lp-figure--art">
        ${figureImg(d.slug, "f1-scene", f.f1, SIZES_HALF, { hero: true })}${aiNoteAt === "hero" ? `\n        <figcaption>${aiNote}</figcaption>` : ""}
      </figure>
    </div>
  </section>

  <!-- B2 문제 3가지 -->
  <section class="lp-section" aria-labelledby="lp-problem">
    <div class="container${f.f2 ? " lp-split" : ""}">
      <div>
        <h2 class="lp-h2" id="lp-problem">${esc(d.problemsTitle || "지금 겪는 문제")}</h2>
        ${problems}
      </div>${f.f2 ? `
      <figure class="lp-figure lp-figure--art">
        ${figureImg(d.slug, "f2-change", f.f2, SIZES_HALF)}
        <figcaption class="lp-change-labels"><span class="before">지금</span><span class="arr" aria-hidden="true">→</span><span>${esc(f.f2.after)}</span></figcaption>
      </figure>` : ""}${aiNoteAt === "problems" ? `\n      ${aiNote}` : ""}
    </div>
  </section>

  <!-- B3 받는 것 3가지 -->
  <section class="lp-section lp-section--paper" aria-labelledby="lp-gets">
    <div class="container">
      <h2 class="lp-h2" id="lp-gets">${esc(d.getsTitle)}</h2>${f.f3 ? `
      <div class="lp-split lp-split--gets">
        <figure class="lp-figure lp-figure--art">
          ${figureImg(d.slug, "f3-deliverable", f.f3, SIZES_WIDE)}
        </figure>
        ${gets}
      </div>` : `
      ${gets}`}${aiNoteAt === "gets" ? `\n      ${aiNote}` : ""}
    </div>
  </section>

  <!-- B4 증거 — 그림 자리가 아니라 실사진 자리 -->
  <section class="lp-section" aria-labelledby="lp-proof">
    <div class="container lp-split">
      <div>
        <h2 class="lp-h2" id="lp-proof">${esc(d.proofTitle)}</h2>
        <ul class="lp-proof-orgs">
${d.proofOrgs.map((o) => `          <li>${esc(o)}</li>`).join("\n")}
        </ul>${d.proofNum ? `
        <p class="lp-proof-num">${esc(d.proofNum.text)}${d.proofNum.strong ? ` <b>${esc(d.proofNum.strong)}</b>` : ""}</p>` : ""}${d.proofList ? `
        <ul class="lp-proof-list">
${d.proofList.map((p) => `          <li>${esc(p)}</li>`).join("\n")}
        </ul>` : ""}
      </div>
      <figure class="lp-figure lp-photo">
        <img src="${d.photo.src}" width="${d.photo.w}" height="${d.photo.h}" loading="lazy" decoding="async" alt="${esc(d.photo.alt)}">
        <figcaption>${esc(d.photo.caption)}</figcaption>
      </figure>
    </div>
  </section>

  <!-- B5 가격·절차 -->
  <section class="lp-section lp-section--paper" aria-labelledby="lp-steps">
    <div class="container">
      <h2 class="lp-h2" id="lp-steps">${esc(d.stepsTitle)}</h2>
      <ol class="lp-steps">
${d.steps.map((s) => `        <li>
          ${icon(s.icon)}
          ${esc(s.label)}
        </li>`).join("\n")}
      </ol>
      <p class="lp-price"><strong>${esc(d.price.strong)}</strong>${d.price.note ? `<span>${esc(d.price.note)}</span>` : ""}</p>
    </div>
  </section>

  <!-- B6 대표 -->
  <section class="lp-section" aria-labelledby="lp-person">
    <div class="container">
      <h2 class="lp-h2" id="lp-person">${esc(d.personTitle)}</h2>
      <div class="lp-person">
        <img src="/img/profile-jc-600w.webp" width="600" height="700" loading="lazy" decoding="async" alt="넥스트코웍 대표 이종찬 프로필 사진">
        <p><b>이종찬 · NextCowork 대표</b>${esc(d.personLine)}</p>
      </div>
    </div>
  </section>

  <!-- B7 FAQ -->
  <section class="lp-section lp-section--paper" aria-labelledby="lp-faq">
    <div class="container">
      <h2 class="lp-h2" id="lp-faq">자주 묻는 질문</h2>
      <div class="faq">
${d.faq.map((item) => `        <details>
          <summary>${esc(item.q)}</summary>
          <p class="faq-a">${esc(item.a)}</p>
        </details>`).join("\n")}
      </div>
    </div>
  </section>

  <!-- B8 전용 폼 — 접수 처리는 js/main.js의 문의 폼 로직을 그대로 쓴다(접수번호·중복 방지·Make) -->
  <section class="lp-apply" id="apply" aria-labelledby="lp-apply-title">
    <div class="container">
      <div class="lp-apply-inner">
        <form class="form-card" id="contact-form" data-landing="${d.slug}" data-service-key="${d.serviceKey}" data-tier-key="${d.tierKey}" data-endpoint="${endpoint}" action="${endpoint}" method="post">
          <input type="hidden" id="cf-form-type" name="form_type" value="inquiry">
          <input type="hidden" id="cf-request-key" name="request_key" value="">
          <input type="hidden" id="cf-consent-version" name="consent_version" value="2026-10">
          <div class="hp-field" aria-hidden="true"><label>회사 홈페이지<input type="text" name="company_url" tabindex="-1" autocomplete="off" value=""></label></div>
          <input type="hidden" id="cf-elapsed" name="form_elapsed_ms" value="">
          <input type="hidden" id="cf-service" name="service" value="${esc(d.service)}" data-s="${d.serviceKey}">
          <input type="hidden" id="cf-tier" name="tier" value="${esc(d.tier)}" data-t="${d.tierKey}">
          <input type="hidden" id="cf-landing" name="landing" value="${d.slug}">
          <input type="hidden" id="cf-source-page" name="source_page" value="/go/${d.slug}/">
          <input type="hidden" id="cf-cta-location" name="cta_location" value="landing_form">
          <input type="hidden" id="cf-landing-page" name="landing_page" value="">
          <input type="hidden" id="cf-referrer" name="referrer" value="">
          <input type="hidden" id="cf-utm-source" name="utm_source" value="">
          <input type="hidden" id="cf-utm-medium" name="utm_medium" value="">
          <input type="hidden" id="cf-utm-campaign" name="utm_campaign" value="">
          <input type="hidden" id="cf-utm-content" name="utm_content" value="">
          <input type="hidden" id="cf-origin-article" name="origin_article_slug" value="">
          <input type="hidden" id="cf-tracking-version" name="tracking_version" value="">
          <h2 class="form-card-title" id="lp-apply-title">${cta}</h2>
          <p class="form-card-lead">${esc(d.formLead)}</p>
          <div class="field"><label for="cf-name">이름 <em>*</em></label><input id="cf-name" name="name" maxlength="50" type="text" required autocomplete="name"></div>
          <div class="field"><label for="cf-org">소속 <em>*</em></label><input id="cf-org" name="org" maxlength="100" type="text" required autocomplete="organization" placeholder="${esc(d.orgPlaceholder)}"></div>
          <div class="field"><label for="cf-email">이메일 <em>*</em></label><input id="cf-email" name="email" maxlength="254" type="email" required autocomplete="email" placeholder="reply@example.com"></div>
          <div class="field"><label for="cf-message">한 줄 요청 <em>*</em></label><textarea id="cf-message" name="message" maxlength="3000" rows="2" required placeholder="${esc(d.messagePlaceholder)}"></textarea></div>
          <div class="consent-field">
            <input id="cf-privacy" name="privacy_agree" type="checkbox" value="동의" required>
            <label for="cf-privacy">문의 응대와 상담 안내를 위해 개인정보를 수집·이용하는 데 동의합니다. <em>*</em><br><span style="font-size:13px;color:var(--caption)">수집 항목: 이름·소속·이메일·요청 내용 · 보유 기간: 문의 처리 완료 후 3년 이내 파기 · 동의하지 않으시면 접수할 수 없습니다. <a href="/privacy/" target="_blank" rel="noopener">개인정보처리방침</a></span></label>
          </div>
          <button type="submit" class="btn btn-primary form-action" id="cf-submit">${cta} <span class="arr">→</span></button>
          <button type="button" class="btn btn-ghost btn-utility form-action" id="cf-copy" hidden aria-label="내용 복사: 입력한 요청 내용을 클립보드에 복사">내용 복사 <span aria-hidden="true">⧉</span></button>
          <p class="form-status" id="cf-status" role="status" aria-live="polite"></p>
        </form>

        <div class="lp-done" id="cf-success" tabindex="-1" role="region" aria-labelledby="cf-success-title" hidden>
          <p class="lp-done-title" id="cf-success-title">요청이 접수되었습니다.</p>
          <p class="lp-done-id" id="cf-inquiry-id" hidden></p>
          <p>${esc(d.donePromise)} 급하시면 <a href="mailto:ceo@nextcw.com">ceo@nextcw.com</a> 또는 <a href="tel:+821097657749">010-9765-7749</a>로 연락 주세요.</p>
        </div>
      </div>
    </div>
  </section>

</main>

<footer class="lp-footer">
  <div class="container lp-footer-inner">
    <div>
      <img src="/img/brand/nextcowork-logo-white.svg" alt="NEXT COWORK" width="90" height="56">
      <p class="lp-slogan">Build the Next Workspace</p>
    </div>
    <p>넥스트코웍 주식회사 · 대표 이종찬 · 사업자등록번호 722-88-02654<br>
    (본사) 전북특별자치도 전주시 덕진구 동부대로 687 3F · (서울) 서초구 강남대로97길 26 성원빌딩 4F<br>
    ceo@nextcw.com · 010-9765-7749 · <a href="/privacy/">개인정보처리방침</a><br>
    © 2026 NEXT COWORK Inc.</p>
  </div>
</footer>

<div class="lp-sticky is-hidden" id="lp-sticky">
  <a class="btn btn-primary" href="#apply" data-landing-cta="sticky">${cta} <span class="arr">→</span></a>
</div>

<script src="/js/main.js" defer></script>
</body>
</html>
`;
}

/* 글자 예산(landing-specs.md 0절). 넘으면 빌드를 멈춘다 — 랜딩은 짧아야 한다. */
function checkBudget(d) {
  const over = [];
  const limit = (label, text, max) => { if ([...text].length > max) over.push(`${label} ${[...text].length}/${max}자: ${text}`); };
  limit("속말", d.voice.replace(/[“”]/g, ""), 28); // 명세의 글자 수는 따옴표를 빼고 센다
  limit("약속", d.h1.join(" "), 24);
  limit("조건", d.terms.join(" · "), 40);
  limit("버튼", d.cta, 12);
  d.problems.forEach((p) => limit("문제", p, 18));
  d.gets.forEach((g) => limit("받는 것", g, 16));
  d.steps.forEach((s) => limit("절차", s.label, 14));
  limit("대표", `이종찬 · NextCowork 대표. ${d.personLine}`, 60);
  d.faq.forEach((item) => { limit("FAQ 질문", item.q, 24); limit("FAQ 답", item.a, 60); });
  limit("폼 안내", d.formLead, 44);
  if (d.problems.length !== 3 || d.gets.length !== 3 || d.steps.length !== 3 || d.faq.length !== 4) over.push("블록 개수(문제 3 · 받는 것 3 · 절차 3 · FAQ 4)");
  if (over.length) throw new Error(`${d.slug}: 글자 예산 초과\n  ${over.join("\n  ")}`);
}

export async function loadLandings() {
  const dir = join(root, "content", "landings");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  const landings = [];
  for (const name of names) {
    const data = JSON.parse(await readFile(join(dir, name), "utf8"));
    if (`${data.slug}.json` !== name) throw new Error(`${name}: slug(${data.slug})와 파일 이름이 다릅니다.`);
    landings.push(data);
  }
  return landings.sort((a, b) => a.order - b.order);
}

async function updateLlmsTxt(landings) {
  const file = join(root, "llms.txt");
  const text = await readFile(file, "utf8");
  const startMark = "<!-- LANDINGS:START -->";
  const endMark = "<!-- LANDINGS:END -->";
  const start = text.indexOf(startMark);
  const end = text.indexOf(endMark);
  if (start === -1 || end === -1 || end < start) throw new Error("llms.txt: LANDINGS:START / LANDINGS:END 마커를 찾을 수 없습니다.");
  const block = landings.filter((d) => d.index !== false)
    .map((d) => `### ${d.llmsTitle}\n${siteUrl}/go/${d.slug}/\n${d.llms}`).join("\n\n");
  const next = `${text.slice(0, start + startMark.length)}\n${block}\n${text.slice(end)}`;
  if (next !== text) await writeFile(file, next, "utf8");
}

async function main() {
  const contact = await readFile(join(root, "contact", "index.html"), "utf8");
  const endpoint = contact.match(/id="contact-form"[^>]*data-endpoint="([^"]+)"/)?.[1];
  if (!endpoint) throw new Error("contact/index.html에서 접수 주소(data-endpoint)를 찾지 못했습니다.");
  const landings = await loadLandings();
  for (const d of landings) {
    checkBudget(d);
    const dir = join(root, "go", d.slug);
    await mkdir(dir, { recursive: true });
    const html = render(d, endpoint);
    const file = join(dir, "index.html");
    let before = "";
    try { before = await readFile(file, "utf8"); } catch { /* 새 랜딩 */ }
    // 캐시 버전값(?v=)은 인사이트 빌드가 뒤에서 붙인다 — 버전값만 다른 경우는 다시 쓰지 않는다.
    if (before.replace(/\?v=ncw-[0-9a-f]+/g, "") !== html) await writeFile(file, html, "utf8");
  }
  await updateLlmsTxt(landings);
  console.log(`Built ${landings.length} offer landing(s): ${landings.map((d) => d.slug).join(", ")}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => { console.error(error.message || error); process.exit(1); });
}
