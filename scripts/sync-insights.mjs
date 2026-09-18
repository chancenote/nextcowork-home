/* ==========================================================
   sync-insights.mjs — 옵시디언 "NEXT COWORK" 볼트 → content/insights/

   볼트의 발행 폴더에서 `publish: true`인 노트를 읽어 사이트용 마크다운으로
   변환한다. 볼트는 절대 수정하지 않는다(읽기 전용).

     npm run sync     동기화 후 빌드까지
     npm run sync:dry 무엇이 바뀔지만 출력하고 파일은 안 씀

   볼트 경로는 환경변수 NCW_VAULT로 바꿀 수 있다.
   ========================================================== */

import { copyFile, mkdir, readdir, readFile, writeFile, access } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vaultRoot = process.env.NCW_VAULT || join(homedir(), "Documents", "Obsidian", "NEXT COWORK");
const publishDir = join(vaultRoot, "08. 브랜드ㆍ콘텐츠엔진", "03. 발행_인사이트");
const attachmentDir = join(vaultRoot, "첨부_이미지");
const contentDir = join(root, "content", "insights");
const imageDir = join(root, "img", "insights");

const dryRun = process.argv.includes("--dry");

/* 볼트 service 값 → 사이트 cta_service */
const SERVICE_MAP = {
  flexoffice: "flexoffice",
  "ai-campus": "ai-campus",
  public: "public",
  coaching: "coaching"
};

/* service별 기본 category (노트에 category가 없을 때) */
const CATEGORY_MAP = {
  flexoffice: "공간 컨설팅",
  "ai-campus": "AI 실무활용",
  public: "공공 자문",
  coaching: "경영자 AI"
};

const warnings = [];
const results = { written: [], skipped: [], images: [] };

function warn(note, message) {
  warnings.push(`  ${note}: ${message}`);
}

/* ---------- YAML frontmatter (볼트가 쓰는 부분집합) ---------- */

function stripQuotes(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function parseScalar(value) {
  const text = value.trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => stripQuotes(item)).filter(Boolean);
  }
  return stripQuotes(text);
}

function parseFrontMatter(source, file) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${file}: frontmatter가 없습니다.`);
  }
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) throw new Error(`${file}: frontmatter 닫는 ---가 없습니다.`);

  const meta = {};
  const lines = normalized.slice(4, end).split("\n");
  let listKey = null;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // "- 항목" 형태의 블록 리스트 (옵시디언 기본 출력)
    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && listKey) {
      meta[listKey].push(stripQuotes(listItem[1]));
      continue;
    }

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rawValue = line.slice(idx + 1);

    if (!rawValue.trim()) {
      listKey = key;
      meta[key] = [];
      continue;
    }
    listKey = null;
    meta[key] = parseScalar(rawValue);
  }

  return { meta, body: normalized.slice(end + 4).trim() };
}

/* ---------- 옵시디언 문법 → 사이트 마크다운 ---------- */

function slugifyAsset(name) {
  const ext = extname(name).toLowerCase();
  const base = basename(name, extname(name))
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // 한글 파일명은 URL에서 인코딩되므로 로마자 대신 해시 접미사로 고유성만 확보한다.
  const ascii = base.replace(/[^a-z0-9-]/g, "");
  const stem = ascii.length >= 3 ? ascii : `img-${hash(name)}`;
  return `${stem}-${hash(name)}${ext}`;
}

function hash(text) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value.toString(36).slice(0, 6);
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

/* ![[이미지.png]] / ![[이미지.png|캡션]] → 첨부를 img/insights/로 복사하고 표준 마크다운으로 */
async function convertEmbeds(body, noteName) {
  const pattern = /!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g;
  const jobs = [];
  let output = body;

  for (const match of body.matchAll(pattern)) {
    const [full, target, label] = match;
    const fileName = target.trim();
    const source = join(attachmentDir, fileName);

    if (!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(fileName)) {
      warn(noteName, `이미지가 아닌 임베드는 옮길 수 없습니다 — ${fileName} (본문에서 제거하거나 링크로 바꿔주세요)`);
      output = output.replace(full, "");
      continue;
    }
    if (!await exists(source)) {
      warn(noteName, `첨부를 찾을 수 없습니다 — 첨부_이미지/${fileName}`);
      output = output.replace(full, "");
      continue;
    }

    const assetName = slugifyAsset(fileName);
    const alt = (label || basename(fileName, extname(fileName))).trim();
    jobs.push({ source, assetName });
    output = output.replace(full, `![${alt}](/img/insights/${assetName})`);
  }

  for (const job of jobs) {
    if (!dryRun) {
      await mkdir(imageDir, { recursive: true });
      await copyFile(job.source, join(imageDir, job.assetName));
    }
    if (!results.images.includes(job.assetName)) results.images.push(job.assetName);
  }
  return output;
}

/* [[노트]] / [[노트|표시]] → 표시 텍스트만 남긴다. 웹에 대응 URL이 없기 때문. */
function convertWikiLinks(body, noteName) {
  const found = [];
  const output = body.replace(/\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_m, target, label) => {
    found.push(target.trim());
    return (label || target).trim();
  });
  if (found.length) {
    warn(noteName, `내부 위키링크 ${found.length}개를 일반 텍스트로 바꿨습니다 — ${[...new Set(found)].slice(0, 3).join(", ")}${found.length > 3 ? " 외" : ""}. 웹 링크가 필요하면 [표시](/경로/) 형태로 직접 써주세요.`);
  }
  return output;
}

/* > [!note] 제목 → 일반 인용문 */
function convertCallouts(body) {
  return body.replace(/^>\s*\[!\w+\][-+]?\s*(.*)$/gm, (_m, title) => (title.trim() ? `> ${title.trim()}` : ">"));
}

function checkUnsupported(body, noteName) {
  if (/^\s{2,}[-*]\s+/m.test(body)) warn(noteName, "중첩 목록은 평탄화됩니다(렌더러 미지원).");
  if (/^#{4,}\s/m.test(body)) warn(noteName, "H4 이상 제목은 본문 텍스트로 나옵니다. H2·H3만 써주세요.");
  if (/^\s*[-*]\s+\[[ x]\]/m.test(body)) warn(noteName, "체크박스 목록은 '[ ]' 문자가 그대로 보입니다.");
  if (/(^|[^*])\*[^*\n]+\*([^*]|$)/m.test(body)) warn(noteName, "이탤릭(*텍스트*)은 미지원입니다. **굵게**를 써주세요.");
}

/* ---------- 변환 ---------- */

function toSiteFrontMatter(meta, noteName) {
  const slug = String(meta.slug || "").trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`slug가 없거나 형식이 틀립니다 (영문 소문자·숫자·하이픈만): "${slug}"`);
  }

  const date = String(meta.publish_date || meta.created || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`publish_date가 없거나 형식이 틀립니다 (YYYY-MM-DD): "${date}"`);
  }

  const title = String(meta.title || "").trim();
  const description = String(meta.description || meta.summary || "").trim();
  if (!title) throw new Error("title이 비어 있습니다.");
  if (!description) throw new Error("description(또는 summary)이 비어 있습니다.");

  const service = String(meta.service || "").trim();
  const ctaService = SERVICE_MAP[service] || "general";
  const category = String(meta.category || CATEGORY_MAP[service] || "Insight").trim();
  const tags = Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []);

  if (!SERVICE_MAP[service]) {
    warn(noteName, `service "${service}"가 사이트 서비스에 대응하지 않아 CTA를 general로 둡니다.`);
  }

  const quoted = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
  return [
    "---",
    `title: ${quoted(title)}`,
    `description: ${quoted(description)}`,
    `date: ${quoted(date)}`,
    `category: ${quoted(category)}`,
    `tags: [${tags.map((tag) => quoted(tag)).join(", ")}]`,
    `slug: ${quoted(slug)}`,
    `image: ${quoted(meta.image || "/img/og.png")}`,
    `thumbnail: ${quoted(meta.thumbnail || meta.image || "/img/og.png")}`,
    `image_alt: ${quoted(meta.image_alt || "")}`,
    `topic: ${quoted(meta.topic || "")}`,
    `cta_service: ${quoted(ctaService)}`,
    "---",
    ""
  ].join("\n");
}

async function main() {
  if (!await exists(publishDir)) {
    console.error(`발행 폴더가 없습니다: ${publishDir}`);
    console.error("볼트에 '08. 브랜드ㆍ콘텐츠엔진/03. 발행_인사이트' 폴더를 만들고 노트를 넣어주세요.");
    process.exit(1);
  }

  const entries = (await readdir(publishDir)).filter((name) => name.endsWith(".md") && !name.startsWith("_"));

  for (const entry of entries) {
    const noteName = basename(entry, ".md");
    try {
      const source = await readFile(join(publishDir, entry), "utf8");
      const { meta, body } = parseFrontMatter(source, entry);

      if (meta.publish !== true) {
        results.skipped.push({ note: noteName, reason: "publish: true 아님" });
        continue;
      }

      const frontMatter = toSiteFrontMatter(meta, noteName);
      let converted = convertCallouts(body);
      converted = await convertEmbeds(converted, noteName);
      converted = convertWikiLinks(converted, noteName);
      checkUnsupported(converted, noteName);

      const date = String(meta.publish_date || meta.created).trim();
      const target = join(contentDir, `${date}-${meta.slug}.md`);
      const next = `${frontMatter}${converted.trim()}\n`;

      const previous = await exists(target) ? await readFile(target, "utf8") : null;
      if (previous === next) {
        results.skipped.push({ note: noteName, reason: "변경 없음" });
        continue;
      }
      if (!dryRun) await writeFile(target, next, "utf8");
      results.written.push({ note: noteName, target: `content/insights/${date}-${meta.slug}.md`, isNew: previous === null });
    } catch (error) {
      results.skipped.push({ note: noteName, reason: error.message });
    }
  }

  console.log(dryRun ? "[미리보기 — 파일을 쓰지 않았습니다]\n" : "");
  console.log(`볼트: ${publishDir}`);
  console.log(`대상 노트 ${entries.length}개 → 발행 ${results.written.length}개, 건너뜀 ${results.skipped.length}개\n`);

  if (results.written.length) {
    console.log("발행:");
    results.written.forEach((item) => console.log(`  ${item.isNew ? "신규" : "갱신"}  ${item.note} → ${item.target}`));
    console.log("");
  }
  if (results.images.length) {
    console.log(dryRun
      ? `이미지 ${results.images.length}개가 img/insights/로 복사될 예정입니다.\n`
      : `이미지 ${results.images.length}개를 img/insights/로 복사했습니다.\n`);
  }
  if (results.skipped.length) {
    console.log("건너뜀:");
    results.skipped.forEach((item) => console.log(`  ${item.note} — ${item.reason}`));
    console.log("");
  }
  if (warnings.length) {
    console.log("확인이 필요한 항목:");
    warnings.forEach((line) => console.log(line));
    console.log("");
  }
  if (results.written.length && !dryRun) {
    console.log("다음: npm run build 로 사이트를 생성하세요.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
