import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://www.nextcw.com";
const contentDir = join(root, "content", "insights");
const outputDir = join(root, "insights");

const externalFeed = [
  {
    src: "brunch",
    title: "일이 잘되는 공간과 방법을 연구합니다 — 찬스노트",
    url: "https://brunch.co.kr/@chancenote",
    date: "브런치"
  },
  {
    src: "threads",
    title: "매일 기록하는 AI 실무활용 노트 — @chancenote",
    url: "https://www.threads.com/@chancenote",
    date: "Threads"
  },
  {
    src: "notion",
    title: "AI 플레이북 — 실무에 바로 쓰는 AI Tool 가이드",
    url: "https://nextcw.notion.site/ai-cowork-book",
    date: "자료실"
  },
  {
    src: "notion",
    title: "포트폴리오 — 마케팅·교육·세미나 수행 레퍼런스",
    url: "https://nextcw.notion.site/portfolio",
    date: "자료실"
  }
];

/* 피드 항목 색상·라벨 — js/main.js의 폴백 렌더와 동일하게 유지할 것. */
const feedColors = {
  insight: { line: "var(--accent)", ink: "var(--accent-ink)" },
  brunch: { line: "var(--line-public)", ink: "var(--line-public-ink)" },
  naver: { line: "#03C75A", ink: "var(--naver-ink)" },
  threads: { line: "#1C1C22", ink: "#1C1C22" },
  notion: { line: "var(--violet)", ink: "var(--line-ai-ink)" },
  news: { line: "var(--point)", ink: "var(--point-action)" }
};

const feedNames = {
  insight: "인사이트",
  brunch: "브런치",
  naver: "네이버 블로그",
  threads: "Threads",
  notion: "노션 자료실",
  news: "소식"
};

/* 아티클 JSON-LD에 인라인으로 넣는 발행처 노드.
   홈(index.html)의 #org 노드를 페이지 단위로 해석 가능하게 만드는 용도 — 값이 홈과 어긋나면 안 된다. */
const orgNode = {
  "@type": "Organization",
  "@id": "https://www.nextcw.com/#org",
  name: "넥스트코웍",
  alternateName: "NEXT COWORK",
  url: "https://www.nextcw.com/",
  logo: "https://www.nextcw.com/img/og.png",
  email: "ceo@nextcw.com",
  telephone: "+82-10-9765-7749",
  sameAs: [
    "https://brunch.co.kr/@chancenote",
    "https://www.threads.com/@chancenote",
    "https://blog.naver.com/chancenote"
  ]
};

const staticRoutes = [
  { path: "/", lastmod: "2026-07-09", priority: "1.0" },
  { path: "/flexoffice/", lastmod: "2026-07-09", priority: "0.9" },
  { path: "/ai-campus/", lastmod: "2026-07-09", priority: "0.9" },
  { path: "/public/", lastmod: "2026-07-09", priority: "0.9" },
  { path: "/coaching/", lastmod: "2026-07-09", priority: "0.9" },
  { path: "/about/", lastmod: "2026-07-09", priority: "0.8" },
  { path: "/insights/", lastmod: "2026-07-09", priority: "0.8" },
  { path: "/contact/", lastmod: "2026-07-09", priority: "0.7" },
  { path: "/privacy/", lastmod: "2026-07-09", priority: "0.3" }
];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/\n/g, " ");
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return stripQuotes(trimmed);
}

function stripQuotes(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontMatter(source, filePath) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${relative(root, filePath)}: front matter가 필요합니다.`);
  }
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) {
    throw new Error(`${relative(root, filePath)}: front matter 닫는 ---가 없습니다.`);
  }
  const rawMeta = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).trim();
  const meta = {};
  rawMeta.split("\n").forEach((line) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    meta[key] = parseScalar(value);
  });
  return { meta, body };
}

function renderInline(raw) {
  let text = escapeHtml(raw);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const url = href.replace(/&amp;/g, "&");
    const external = /^https?:\/\//.test(url);
    return `<a href="${escapeAttr(url)}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  return text;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listType = null;
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function closeList() {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  }

  function openList(type) {
    if (listType === type) return;
    closeList();
    listType = type;
    html.push(`<${type}>`);
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code${codeLang ? ` class="language-${escapeAttr(codeLang)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        inCode = false;
        codeLang = "";
        codeLines = [];
      } else {
        flushParagraph();
        closeList();
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length <= 2 ? 2 : 3;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      closeList();
      html.push("<hr>");
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInline(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      openList("ul");
      html.push(`<li>${renderInline(unordered[1])}</li>`);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      openList("ol");
      html.push(`<li>${renderInline(ordered[1])}</li>`);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("\n");
}

function formatDate(date) {
  return String(date || "").replaceAll("-", ".");
}

function normalizePost(meta, body, filePath) {
  const slug = meta.slug || filePath.split("/").pop().replace(/\.md$/, "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`${relative(root, filePath)}: slug는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.`);
  }
  if (!meta.title || !meta.description || !meta.date) {
    throw new Error(`${relative(root, filePath)}: title, description, date가 필요합니다.`);
  }
  return {
    slug,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    category: meta.category || "Insight",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    image: meta.image || "/img/og.png",
    ctaService: meta.cta_service || "general",
    body,
    url: `/insights/${slug}/`
  };
}

function absoluteUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function versioned(path, assetVersion) {
  return `${path}?v=${assetVersion}`;
}

async function computeAssetVersion(posts) {
  const hash = createHash("sha1");
  hash.update(JSON.stringify(posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.date,
    category: post.category,
    tags: post.tags
  }))));

  for (const path of ["css/style.css", "js/main.js", "js/analytics.js", "scripts/build-insights.mjs"]) {
    hash.update(await readFile(join(root, path), "utf8"));
  }

  return `ncw-${hash.digest("hex").slice(0, 10)}`;
}

async function listHtmlFiles(dir) {
  const skip = new Set([".git", ".vercel", "node_modules", "content", "_workspace", "tmp"]);
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (skip.has(entry.name)) continue;
      files.push(...await listHtmlFiles(join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(join(dir, entry.name));
    }
  }

  return files;
}

async function updateHtmlAssetVersions(assetVersion) {
  const files = await listHtmlFiles(root);
  for (const file of files) {
    let html = await readFile(file, "utf8");
    const before = html;
    html = html
      .replace(/\/css\/style\.css(?:\?v=[^"]*)?/g, versioned("/css/style.css", assetVersion))
      .replace(/\/js\/analytics\.js(?:\?v=[^"]*)?/g, versioned("/js/analytics.js", assetVersion))
      .replace(/\/js\/insights-data\.js(?:\?v=[^"]*)?/g, versioned("/js/insights-data.js", assetVersion))
      .replace(/\/js\/main\.js(?:\?v=[^"]*)?/g, versioned("/js/main.js", assetVersion));
    if (html !== before) await writeFile(file, html, "utf8");
  }
}

function renderArticle(post, assetVersion) {
  const articleBody = renderMarkdown(post.body);
  const tagHtml = post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const blogPosting = {
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    url: absoluteUrl(post.url),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(post.url) },
    inLanguage: "ko",
    image: absoluteUrl(post.image),
    author: { "@type": "Person", "@id": "https://www.nextcw.com/about/#person", name: "이종찬" },
    publisher: { "@id": "https://www.nextcw.com/#org" }
  };
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: "https://www.nextcw.com/" },
      { "@type": "ListItem", position: 2, name: "인사이트", item: "https://www.nextcw.com/insights/" },
      { "@type": "ListItem", position: 3, name: post.title, item: absoluteUrl(post.url) }
    ]
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [orgNode, blogPosting, breadcrumb]
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(post.title)} — 넥스트코웍 인사이트</title>
<meta name="description" content="${escapeAttr(post.description)}">
<link rel="canonical" href="${absoluteUrl(post.url)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeAttr(post.title)}">
<meta property="og:description" content="${escapeAttr(post.description)}">
<meta property="og:url" content="${absoluteUrl(post.url)}">
<meta property="og:image" content="${absoluteUrl(post.image)}">
<meta property="og:site_name" content="넥스트코웍 NEXT COWORK">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(post.title)}">
<meta name="twitter:description" content="${escapeAttr(post.description)}">
<meta name="twitter:image" content="${absoluteUrl(post.image)}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#302D7C">
<script src="${versioned("/js/analytics.js", assetVersion)}" defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="${versioned("/css/style.css", assetVersion)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body class="theme-ai">
<a class="skip-link" href="#main-content">본문 바로가기</a>
<header class="nav">
  <div class="nav-inner">
    <a class="nav-logo" href="/"><strong>NEXT COWORK</strong><span>AI Workspace Builder</span></a>
    <nav aria-label="주요 메뉴">
      <ul class="nav-menu" id="nav-menu">
        <li class="has-sub">
          <a href="/#services" aria-haspopup="true">서비스</a>
          <ul class="sub">
            <li style="--sub-c:var(--line-space)"><a href="/flexoffice/"><b><span class="dot"></span>FlexOffice 컨설팅</b><small>공유오피스 도입·전환·개발 컨설팅</small></a></li>
            <li style="--sub-c:var(--line-ai)"><a href="/ai-campus/"><b><span class="dot"></span>AI Campus</b><small>기업 AI 실무교육 · 사내 AI 캠퍼스 구축</small></a></li>
            <li style="--sub-c:var(--line-public)"><a href="/public/"><b><span class="dot"></span>Public Advisory</b><small>공공 공유공간·AI 역량강화 자문</small></a></li>
            <li style="--sub-c:var(--line-coaching)"><a href="/coaching/"><b><span class="dot"></span>CEO AI 코칭</b><small>경영자 1:1 시그니처 프로그램</small></a></li>
          </ul>
        </li>
        <li><a href="/about/">대표 스토리</a></li>
        <li><a href="/insights/" class="active" aria-current="page">인사이트</a></li>
        <li><a class="nav-cta" href="/contact/">프로젝트 문의</a></li>
      </ul>
    </nav>
    <button class="nav-burger" aria-label="메뉴 열기" aria-expanded="false" aria-controls="nav-menu"><span></span><span></span><span></span></button>
  </div>
</header>
<main id="main-content">
  <article class="post">
    <header class="post-hero">
      <div class="container post-container">
        <a class="post-back reveal" href="/insights/">← 인사이트로 돌아가기</a>
        <div class="post-kicker reveal" data-delay="1">${escapeHtml(post.category)} · ${formatDate(post.date)}</div>
        <h1 class="reveal" data-delay="2">${escapeHtml(post.title)}</h1>
        <p class="post-lead reveal" data-delay="3">${escapeHtml(post.description)}</p>
        ${tagHtml ? `<div class="post-tags reveal" data-delay="3">${tagHtml}</div>` : ""}
      </div>
    </header>
    <div class="container post-container">
      <div class="post-body reveal">
${articleBody}
      </div>
      <div class="post-cta reveal">
        <strong>이 주제를 조직에 맞게 적용하고 싶다면</strong>
        <p>AI 실무교육, CEO 코칭, 워크스페이스 컨설팅으로 연결해 드립니다.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/contact/?s=${post.ctaService}&amp;t=diagnosis&amp;cta=insight_article">프로젝트 문의 <span class="arr">→</span></a>
          <a class="btn btn-ghost" href="/insights/">인사이트 더 보기 <span class="arr">→</span></a>
        </div>
      </div>
    </div>
  </article>
</main>
<footer class="footer">
  <div class="footer-main">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <strong>NEXT COWORK</strong>
          <p>넥스트코웍 주식회사 · 대표 이종찬<br>
          일이 잘되는 공간을 만들고,<br>일이 잘되는 방식을 설계합니다.<br><br>
          ceo@nextcw.com · <a class="footer-phone" href="tel:+821097657749">010-9765-7749</a></p>
          <p class="footer-legal">사업자등록번호 722-88-0265<br>(본사) 전북특별자치도 전주시 덕진구 동부대로 687 3F<br>(서울) 서초구 강남대로97길 26 성원빌딩 4F</p>
        </div>
        <div>
          <h5>Services</h5>
          <a href="/flexoffice/">FlexOffice 컨설팅</a>
          <a href="/ai-campus/">AI Campus</a>
          <a href="/public/">Public Advisory</a>
          <a href="/coaching/">CEO AI 코칭</a>
        </div>
        <div>
          <h5>Company</h5>
          <a href="/about/">대표 스토리</a>
          <a href="/insights/">인사이트</a>
          <a href="/contact/">문의하기</a>
          <a href="https://www.spacecw.com/" target="_blank" rel="noopener">스페이스코웍 ↗</a>
        </div>
        <div>
          <h5>Channels</h5>
          <a href="https://brunch.co.kr/@chancenote" target="_blank" rel="noopener">브런치 · 찬스노트</a>
          <a href="https://blog.naver.com/chancenote" target="_blank" rel="noopener">네이버 블로그</a>
          <a href="https://www.threads.com/@chancenote" target="_blank" rel="noopener">Threads</a>
          <a href="https://open.kakao.com/o/sfxwSCvf" target="_blank" rel="noopener">카카오톡 채널</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 NEXT COWORK Inc. All rights reserved.</span>
        <span><a href="/privacy/">개인정보처리방침</a> · AI Workspace Builder — 일하는 공간과 방식의 진화</span>
      </div>
    </div>
  </div>
</footer>
<script src="${versioned("/js/main.js", assetVersion)}" defer></script>
</body>
</html>
`;
}

function buildFeed(posts) {
  const generated = posts.map((post) => ({
    src: "insight",
    title: post.title,
    url: post.url,
    date: formatDate(post.date)
  }));
  return [...generated, ...externalFeed];
}

/* 허브의 '최신 콘텐츠' 목록을 정적 HTML로 생성한다.
   AI 크롤러(GPTBot·ClaudeBot·PerplexityBot 등)는 JS를 실행하지 않으므로
   목록이 원본 HTML에 없으면 글이 발견되지 않는다.
   마크업은 js/main.js의 폴백 렌더와 동일해야 한다. */
function renderFeedHtml(feed) {
  return feed.slice(0, 8).map((item) => {
    const color = feedColors[item.src] || feedColors.insight;
    const external = /^https?:\/\//.test(item.url);
    return `<a class="feed-item" href="${escapeAttr(item.url)}"${external ? ' target="_blank" rel="noopener"' : ""} style="--fc: ${color.line}; --fc-ink: ${color.ink};">`
      + `<span class="feed-src">${escapeHtml(feedNames[item.src] || item.src)}</span>`
      + `<h4>${escapeHtml(item.title)}</h4>`
      + `<span class="date">${escapeHtml(item.date || "")}</span></a>`;
  }).join("\n        ");
}

function renderFeedJs(feed) {
  return `/* ==========================================================
   NCW_FEED — 인사이트 허브 '최신 콘텐츠' 목록
   이 파일은 npm run build 실행 시 content/insights/*.md에서 자동 생성됩니다.
   외부 채널 링크는 scripts/build-insights.mjs의 externalFeed에서 관리합니다.
   src: insight | brunch | naver | threads | notion | news

   주의: 허브 목록의 원본은 insights/index.html의 정적 HTML이다.
   이 파일은 그 영역이 비어 있을 때만 쓰이는 폴백 데이터다.
   ========================================================== */
window.NCW_FEED = ${JSON.stringify(feed, null, 2)};
`;
}

async function updateInsightsHub(feedHtml) {
  const file = join(outputDir, "index.html");
  const html = await readFile(file, "utf8");
  const startMark = "<!-- FEED:START -->";
  const endMark = "<!-- FEED:END -->";
  const start = html.indexOf(startMark);
  const end = html.indexOf(endMark);

  if (start === -1 || end === -1 || end < start) {
    throw new Error("insights/index.html: FEED:START / FEED:END 마커를 찾을 수 없습니다. 마커를 복구한 뒤 다시 빌드하세요.");
  }

  const next = html.slice(0, start + startMark.length)
    + `\n        ${feedHtml}\n        `
    + html.slice(end);

  if (next !== html) await writeFile(file, next, "utf8");
}

function renderSitemap(posts) {
  const routes = [
    ...staticRoutes,
    ...posts.map((post) => ({ path: post.url, lastmod: post.date, priority: "0.7" }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${siteUrl}${route.path}</loc><lastmod>${route.lastmod}</lastmod><priority>${route.priority}</priority></url>`).join("\n")}
</urlset>
`;
}

async function loadPosts() {
  const files = await readdir(contentDir);
  const posts = [];
  for (const file of files) {
    if (!file.endsWith(".md") || file.startsWith("_")) continue;
    const filePath = join(contentDir, file);
    const source = await readFile(filePath, "utf8");
    const { meta, body } = parseFrontMatter(source, filePath);
    posts.push(normalizePost(meta, body, filePath));
  }
  return posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

async function main() {
  const posts = await loadPosts();
  const feed = buildFeed(posts);
  const assetVersion = await computeAssetVersion(posts);

  for (const post of posts) {
    const dir = join(outputDir, post.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), renderArticle(post, assetVersion), "utf8");
  }
  await writeFile(join(root, "js", "insights-data.js"), renderFeedJs(feed), "utf8");
  await writeFile(join(root, "sitemap.xml"), renderSitemap(posts), "utf8");
  await updateInsightsHub(renderFeedHtml(feed));
  await updateHtmlAssetVersions(assetVersion);
  console.log(`Built ${posts.length} insight post(s), ${Math.min(feed.length, 8)} feed item(s) rendered statically. Asset version: ${assetVersion}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
