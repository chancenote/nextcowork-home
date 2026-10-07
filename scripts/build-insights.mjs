import { renderMagazine, renderLatestNote } from "../js/insights-cards.js";
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

/* lastmod는 하드코딩하지 않는다. 각 페이지의 실제 내용이 바뀐 날을
   scripts/lastmod.json에 기록해 두고 재사용한다(계산 방식은 resolveLastmod 참고). */
const staticRoutes = [
  { path: "/", file: "index.html", priority: "1.0" },
  { path: "/flexoffice/", file: "flexoffice/index.html", priority: "0.9" },
  { path: "/ai-campus/", file: "ai-campus/index.html", priority: "0.9" },
  { path: "/public/", file: "public/index.html", priority: "0.9" },
  { path: "/coaching/", file: "coaching/index.html", priority: "0.9" },
  { path: "/about/", file: "about/index.html", priority: "0.8" },
  { path: "/insights/", file: "insights/index.html", priority: "0.8" },
  { path: "/contact/", file: "contact/index.html", priority: "0.7" },
  { path: "/privacy/", file: "privacy/index.html", priority: "0.3" }
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
  // 이미지가 링크보다 먼저 — 순서가 바뀌면 ![alt](src)가 "!" + 링크로 깨진다.
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, src) => {
    const url = src.replace(/&amp;/g, "&");
    return `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async">`;
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
    const url = href.replace(/&amp;/g, "&");
    const external = /^https?:\/\//.test(url);
    return `<a href="${escapeAttr(url)}"${external ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
  });
  return text;
}

/* ---------- 표 ---------- */

function splitTableRow(line) {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|")) text = text.slice(0, -1);
  return text.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line) {
  if (!line || !line.trim().startsWith("|")) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function tableAlignments(separatorCells) {
  return separatorCells.map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "";
  });
}

function renderTable(headCells, alignments, bodyRows) {
  const align = (index) => (alignments[index] ? ` style="text-align:${alignments[index]}"` : "");
  const head = headCells.map((cell, i) => `<th${align(i)}>${renderInline(cell)}</th>`).join("");
  const body = bodyRows
    .map((row) => `<tr>${row.map((cell, i) => `<td${align(i)}>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("\n");
  // 모바일에서 표가 페이지를 밀지 않도록 스크롤 래퍼로 감싼다.
  return `<div class="post-table"><table><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table></div>`;
}

function renderMarkdown(markdown, label = "") {
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

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
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

    // 표 — 헤더 행 다음 줄이 구분선일 때만 표로 본다.
    if (trimmed.startsWith("|") && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      closeList();
      const headCells = splitTableRow(trimmed);
      const alignments = tableAlignments(splitTableRow(lines[index + 1]));
      const bodyRows = [];
      let cursor = index + 2;
      while (cursor < lines.length && lines[cursor].trim().startsWith("|")) {
        bodyRows.push(splitTableRow(lines[cursor]));
        cursor += 1;
      }
      html.push(renderTable(headCells, alignments, bodyRows));
      index = cursor - 1;
      continue;
    }

    // 단독 줄 이미지 → figure. 제목 문법 ![alt](src "캡션")을 쓰면 figcaption이 붙는다.
    const standaloneImage = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (standaloneImage) {
      flushParagraph();
      closeList();
      const [, alt, src, caption] = standaloneImage;
      if (!alt.trim()) {
        throw new Error(`${label || "본문"}: 이미지 alt 텍스트가 비어 있습니다 (${src}). 접근성상 alt는 필수입니다.`);
      }
      html.push(
        `<figure class="post-figure"><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async">`
        + (caption ? `<figcaption>${renderInline(caption)}</figcaption>` : "")
        + "</figure>"
      );
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

/* ---------- FAQ → FAQPage 스키마 ----------
   본문에 "## FAQ" 또는 "## 자주 묻는 질문" 섹션을 두고 그 아래 "### 질문"을 쓰면
   화면에는 평범한 소제목으로 렌더되고, 동시에 FAQPage JSON-LD가 생성된다.
   구글 가이드상 스키마의 Q&A는 화면에도 보여야 하므로 본문에서 지우지 않는다. */

// 제목 전체가 일치해야 한다. /^FAQ/ 같은 접두 매칭이면 "FAQ 작성법" 같은 제목까지 FAQ로 오인한다.
const FAQ_HEADING = /^(FAQ|Q&A|자주\s*묻는\s*질문)$/i;

function toPlainText(markdown) {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 목록 항목은 "· "로 구분해 붙인다. 그냥 이으면 문장 경계가 사라져 답변이 뭉개진다.
      if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        return `· ${line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")}`;
      }
      return line.replace(/^>\s*/, "");
    })
    .join(" ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFaq(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const collected = [];
  let inFaqSection = false;
  let current = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const h3 = trimmed.match(/^###\s+(.+)$/);
    const h2 = trimmed.match(/^##\s+(.+)$/);

    if (h3) {
      if (!inFaqSection) continue;
      if (current) collected.push(current);
      current = { question: h3[1].trim(), lines: [] };
      continue;
    }
    if (h2) {
      if (current) { collected.push(current); current = null; }
      inFaqSection = FAQ_HEADING.test(h2[1].trim());
      continue;
    }
    if (current) current.lines.push(rawLine);
  }
  if (current) collected.push(current);

  return collected
    .map((item) => ({ question: item.question, answer: toPlainText(item.lines.join("\n")) }))
    .filter((item) => item.question && item.answer);
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
    topic: meta.topic || (meta.category === "Company" ? "넥스트코웍 이야기" : ({flexoffice:"공간 비즈니스",public:"공공공간·지역",coaching:"AI 업무전환","ai-campus":"AI 업무전환"}[meta.cta_service] || "넥스트코웍 이야기")),
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    image: meta.image || "/img/og.png",
    thumbnail: meta.thumbnail || meta.image || "/img/og.png",
    imageAlt: meta.image_alt || "",
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

  for (const path of ["css/style.css", "js/main.js", "js/analytics.js", "scripts/build-insights.mjs", "css/insights-magazine.css", "js/insights-cards.js", "js/insights-magazine.js"]) {
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
      .replace(/\/css\/insights-magazine\.css(?:\?v=[^"]*)?/g, versioned("/css/insights-magazine.css", assetVersion))
      .replace(/\/js\/insights-magazine\.js(?:\?v=[^"]*)?/g, versioned("/js/insights-magazine.js", assetVersion))
      .replace(/\/js\/main\.js(?:\?v=[^"]*)?/g, versioned("/js/main.js", assetVersion));
    if (html !== before) await writeFile(file, html, "utf8");
  }
}

// 문의 폼 tierOptions(js/main.js)의 서비스별 기본 상품 키. 서비스에 없는 값을 쓰면 유료 첫 옵션으로 떨어진다.
const CTA_TIER_BY_SERVICE = { "ai-campus": "diagnosis", flexoffice: "precheck", public: "advisory", coaching: "consult" };

function renderArticle(post, assetVersion) {
  const articleBody = renderMarkdown(post.body, `content/insights/${post.slug}`);
  const tagHtml = post.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const faq = extractFaq(post.body);
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
  const faqPage = faq.length ? {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(post.url)}#faq`,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer }
    }))
  } : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [orgNode, blogPosting, breadcrumb, ...(faqPage ? [faqPage] : [])]
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
<link rel="alternate" type="application/rss+xml" title="넥스트코웍 인사이트" href="/rss.xml">
<meta name="theme-color" content="#302D7C">
<script src="${versioned("/js/analytics.js", assetVersion)}" defer></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap">
<link rel="stylesheet" href="${versioned("/css/style.css", assetVersion)}">
<link rel="stylesheet" href="${versioned("/css/insights-magazine.css", assetVersion)}">
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
  <article class="post post--${escapeAttr(post.slug)}">
    <header class="post-hero">
      <div class="container post-container">
        <a class="post-back reveal" href="/insights/">← 인사이트로 돌아가기</a>
        <div class="post-kicker reveal" data-delay="1">${escapeHtml(post.category)} · ${formatDate(post.date)}</div>
        <h1 class="reveal" data-delay="2">${escapeHtml(post.title)}</h1>
        <p class="post-lead reveal" data-delay="3">${escapeHtml(post.description)}</p>
        ${tagHtml ? `<div class="post-tags reveal" data-delay="3">${tagHtml}</div>` : ""}
        ${post.topic ? `<a class="post-topic-link reveal" data-delay="3" href="/insights/?topic=${encodeURIComponent(post.topic)}#latest-content">이 주제의 글 더 보기 <span class="arr">→</span></a>` : ""}
      </div>
    </header>
    <div class="container post-container">
      <div class="post-body">
${articleBody}
      </div>
      <div class="post-cta reveal">
        <strong>이 주제를 조직에 맞게 적용하고 싶다면</strong>
        <p>${post.slug === "ai-fast-failure" ? "팀의 실제 업무에 AI를 적용하고 싶다면, AI Campus 교육에서 우리 조직에 맞는 활용 방법을 함께 살펴보세요." : "AI 실무교육, CEO 코칭, 워크스페이스 컨설팅으로 연결해 드립니다."}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/contact/?s=${post.ctaService}&amp;t=${CTA_TIER_BY_SERVICE[post.ctaService] || "diagnosis"}&amp;cta=insight_article">${post.slug === "ai-fast-failure" ? "우리 팀 AI 교육 문의" : "프로젝트 문의"} <span class="arr">→</span></a>
          <a class="btn btn-ghost" href="/insights/">인사이트 더 보기 <span class="arr">→</span></a>
        </div>
      </div>
    </div>
  </article>
  <section class="insights-subscribe" aria-labelledby="subscribe-heading" id="insights-subscribe">
    <div class="container post-container"><div class="subscribe-panel">
      <div class="subscribe-copy"><h2 id="subscribe-heading">AI 실무 인사이트를 이메일로 받아보세요</h2><p>업무에 적용할 AI 활용법과 넥스트코웍의 새로운 글을 전합니다. 광고성 메일은 보내지 않습니다.</p></div>
      <form class="insights-subscribe-form" id="newsletter-form" data-endpoint="https://hook.us1.make.com/li5ucmemlr73l6hfuwcx27hb861zaemg" action="https://hook.us1.make.com/li5ucmemlr73l6hfuwcx27hb861zaemg" method="post">
        <input type="hidden" name="form_type" value="newsletter">
        <input type="hidden" name="interest" value="general">
        <input type="hidden" name="consent_version" value="2026-10">
        <label class="subscribe-label" for="insights-subscribe-email">이메일 주소</label>
        <div class="newsletter-row">
          <input class="newsletter-input" id="insights-subscribe-email" type="email" name="email" required autocomplete="email" placeholder="name@company.com" aria-label="구독할 이메일 주소">
          <button type="submit" class="btn btn-primary">인사이트 받아보기 <span class="arr">→</span></button>
        </div>
        <div class="consent-field newsletter-consent">
          <input id="insights-subscribe-agree" name="newsletter_agree" type="checkbox" value="동의" required>
          <label for="insights-subscribe-agree">소식 수신에 동의합니다 (언제든 메일의 수신거부 또는 ceo@nextcw.com으로 해지)</label>
        </div>
        <p class="form-status" id="newsletter-status" role="status" aria-live="polite"></p>
        <p class="newsletter-note">이메일 구독이 어려우면 <a class="link-accent" href="mailto:ceo@nextcw.com">ceo@nextcw.com</a>으로 메일 주시면 등록해 드립니다.</p>
      </form>
    </div></div>
  </section>
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
    date: formatDate(post.date),
    description: post.description, category: post.category, image: post.image,
    thumbnail: post.thumbnail, imageAlt: post.imageAlt,
    topic: post.topic, tags: post.tags, searchText: toPlainText(post.body)
  }));
  return [...generated, ...externalFeed];
}

/* 허브의 '최신 콘텐츠' 목록을 정적 HTML로 생성한다.
   AI 크롤러(GPTBot·ClaudeBot·PerplexityBot 등)는 JS를 실행하지 않으므로
   목록이 원본 HTML에 없으면 글이 발견되지 않는다.
   마크업은 js/main.js의 폴백 렌더와 동일해야 한다. */
function renderFeedHtml(feed) {
  return renderMagazine(feed);
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

async function updateInsightsHub(feedHtml, heroHtml) {
  const file = join(outputDir, "index.html");
  const html = await readFile(file, "utf8");
  const startMark = "<!-- FEED:START -->";
  const endMark = "<!-- FEED:END -->";
  const start = html.indexOf(startMark);
  const end = html.indexOf(endMark);

  if (start === -1 || end === -1 || end < start) {
    throw new Error("insights/index.html: FEED:START / FEED:END 마커를 찾을 수 없습니다. 마커를 복구한 뒤 다시 빌드하세요.");
  }

  let next = html.slice(0, start + startMark.length)
    + `\n        ${feedHtml}\n        `
    + html.slice(end);

  if (!next.includes("<!-- HERO:START -->") || !next.includes("<!-- HERO:END -->")) throw new Error("Missing hero markers");
  next = next.replace(/<!-- HERO:START -->[\s\S]*?<!-- HERO:END -->/, () => "<!-- HERO:START -->" + heroHtml + "<!-- HERO:END -->");
  if (next !== html) await writeFile(file, next, "utf8");
}

/* ---------- RSS ----------
   자사 발행 글만 싣는다(외부 채널 링크는 우리 콘텐츠가 아니므로 제외). */

const RSS_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const RSS_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toRfc822(date) {
  // 요일은 UTC 자정 기준으로 뽑는다. KST 자정(+09:00)으로 만들면 UTC에서 전날이 되어 요일이 하루 밀린다.
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`날짜 형식이 잘못되었습니다: ${date} (YYYY-MM-DD로 적어주세요)`);
  }
  const [year, month, day] = String(date).split("-").map(Number);
  return `${RSS_WEEKDAYS[parsed.getUTCDay()]}, ${String(day).padStart(2, "0")} ${RSS_MONTHS[month - 1]} ${year} 00:00:00 +0900`;
}

function renderRss(posts) {
  const items = posts.map((post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${absoluteUrl(post.url)}</link>
      <guid isPermaLink="true">${absoluteUrl(post.url)}</guid>
      <pubDate>${toRfc822(post.date)}</pubDate>
      <category>${escapeHtml(post.category)}</category>
      <description>${escapeHtml(post.description)}</description>
    </item>`).join("\n");

  const latest = posts.length ? toRfc822(posts[0].date) : toRfc822("2026-07-09");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>넥스트코웍 인사이트 — 찬스노트 ChanceNote</title>
    <link>${siteUrl}/insights/</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>AI 실무활용과 워크스페이스 인사이트 — 넥스트코웍이 발행하는 콘텐츠.</description>
    <language>ko</language>
    <lastBuildDate>${latest}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

/* ---------- llms.txt ----------
   AI에게 최신 글 목록을 넘기는 통로. 마커 사이만 자동 생성한다. */

function renderLlmsInsights(posts) {
  if (!posts.length) return "- (발행된 인사이트 아티클이 없습니다)";
  return posts
    .map((post) => `- ${post.title} (${post.date}): ${absoluteUrl(post.url)}\n  ${post.description}`)
    .join("\n");
}

/* ---------- 서비스 페이지 ↔ 인사이트 글 상호 링크 ----------
   글은 서비스 페이지로 나가는 링크를 갖는데 받는 링크가 허브 하나뿐이면
   크롤러의 발견 경로도, 검토 중인 방문자가 읽을 경로도 끊긴다.
   각 서비스 페이지의 "Not Ready Yet?" 콜아웃 안에 마커를 두고,
   cta_service가 일치하는 최신 글을 최대 2개까지 빌드가 채운다.
   일치하는 글이 없으면 아무것도 넣지 않는다(분량 0). */

const RELATED_LIMIT = 2;

const relatedTargets = [
  { file: "flexoffice/index.html", service: "flexoffice" },
  { file: "ai-campus/index.html", service: "ai-campus" },
  { file: "public/index.html", service: "public" },
  { file: "coaching/index.html", service: "coaching" }
];

function renderRelatedHtml(posts) {
  if (!posts.length) return "";
  const items = posts.map((post) =>
    `<a class="related-post" href="${escapeAttr(post.url)}"><span class="related-post-label">인사이트</span>`
    + `<span>${escapeHtml(post.title)}</span><span class="arr">→</span></a>`
  ).join("\n          ");
  return `<div class="related-posts">\n          ${items}\n        </div>`;
}

async function updateRelatedLinks(posts) {
  const startMark = "<!-- RELATED:START -->";
  const endMark = "<!-- RELATED:END -->";
  let filled = 0;

  for (const target of relatedTargets) {
    const file = join(root, target.file);
    let html;
    try {
      html = await readFile(file, "utf8");
    } catch {
      continue;
    }

    const start = html.indexOf(startMark);
    if (start === -1) continue; // 마커를 아직 안 넣은 페이지는 조용히 건너뛴다
    const end = html.indexOf(endMark);
    if (end === -1 || end < start) {
      throw new Error(`${target.file}: RELATED:START는 있는데 RELATED:END가 없습니다.`);
    }

    const matched = posts.filter((post) => post.ctaService === target.service).slice(0, RELATED_LIMIT);
    const block = renderRelatedHtml(matched);
    let next = html.slice(0, start + startMark.length)
      + (block ? `\n        ${block}\n        ` : "\n        ")
      + html.slice(end);

    if (next !== html) await writeFile(file, next, "utf8");
    filled += matched.length;
  }
  return filled;
}

async function updateLlmsTxt(posts) {
  const file = join(root, "llms.txt");
  const text = await readFile(file, "utf8");
  const startMark = "<!-- INSIGHTS:START -->";
  const endMark = "<!-- INSIGHTS:END -->";
  const start = text.indexOf(startMark);
  const end = text.indexOf(endMark);

  if (start === -1 || end === -1 || end < start) {
    throw new Error("llms.txt: INSIGHTS:START / INSIGHTS:END 마커를 찾을 수 없습니다. 마커를 복구한 뒤 다시 빌드하세요.");
  }

  const next = text.slice(0, start + startMark.length)
    + `\n${renderLlmsInsights(posts)}\n`
    + text.slice(end);

  if (next !== text) await writeFile(file, next, "utf8");
}

/* ---------- lastmod ----------
   빌드는 매번 전 페이지의 캐시 버전값(?v=ncw-…)을 갱신한다. 그것까지 "수정"으로 치면
   글 하나를 발행할 때마다 개인정보처리방침까지 바뀐 것으로 신고하게 되므로,
   버전값을 제거한 내용 해시로 실제 변경만 판별해 날짜를 갱신한다. */

const lastmodFile = join(root, "scripts", "lastmod.json");

function contentHash(text) {
  return createHash("sha1")
    .update(String(text).replace(/\?v=ncw-[0-9a-f]+/g, ""))
    .digest("hex")
    .slice(0, 12);
}

function todayInSeoul() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function loadLastmodState() {
  try {
    return JSON.parse(await readFile(lastmodFile, "utf8"));
  } catch {
    return {};
  }
}

/* entries: [{ path, source, fallback }]
   source = 그 URL의 "의미 있는 내용", fallback = 기록이 아예 없을 때 쓸 날짜.
   글은 발행일이 곧 최초 수정일이므로 fallback으로 발행일을 넘긴다 — 안 그러면
   기존 글이 처음 빌드하는 날 전부 "오늘 수정"으로 잘못 신고된다. */
function resolveLastmod(state, entries, today) {
  const next = {};
  for (const { path, source, fallback } of entries) {
    const hash = contentHash(source);
    const previous = state[path];
    if (previous && previous.hash === hash) {
      next[path] = { hash, date: previous.date };
    } else if (!previous && fallback) {
      next[path] = { hash, date: fallback };
    } else {
      next[path] = { hash, date: today };
    }
  }
  return next;
}

function renderSitemap(routes) {
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
    // 원문을 들고 다닌다 — lastmod 판정에 쓴다(생성된 HTML이 아니라 원고가 바뀐 날이 기준).
    posts.push({ ...normalizePost(meta, body, filePath), source });
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
  await writeFile(join(root, "rss.xml"), renderRss(posts), "utf8");
  // 허브·llms.txt를 먼저 갱신해야 그 내용 변화가 lastmod에 반영된다.
  await updateInsightsHub(renderFeedHtml(feed), renderLatestNote(feed));
  const relatedCount = await updateRelatedLinks(posts);
  await updateLlmsTxt(posts);

  const today = todayInSeoul();
  const previousState = await loadLastmodState();
  const entries = [
    ...await Promise.all(staticRoutes.map(async (route) => ({
      path: route.path,
      source: await readFile(join(root, route.file), "utf8")
    }))),
    ...posts.map((post) => ({ path: post.url, source: post.source, fallback: post.date }))
  ];
  const lastmodState = resolveLastmod(previousState, entries, today);
  const routes = [
    ...staticRoutes.map((route) => ({ ...route, lastmod: lastmodState[route.path].date })),
    ...posts.map((post) => ({ path: post.url, lastmod: lastmodState[post.url].date, priority: "0.7" }))
  ];
  await writeFile(join(root, "sitemap.xml"), renderSitemap(routes), "utf8");
  await writeFile(lastmodFile, `${JSON.stringify(lastmodState, null, 2)}\n`, "utf8");

  await updateHtmlAssetVersions(assetVersion);

  const faqCount = posts.reduce((sum, post) => sum + extractFaq(post.body).length, 0);
  console.log(
    `Built ${posts.length} insight post(s), ${feed.length} thumbnail card(s) static, `
    + `${faqCount} FAQ entr(ies), ${relatedCount} related link(s) on service pages, `
    + `rss.xml + llms.txt updated. Asset version: ${assetVersion}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
