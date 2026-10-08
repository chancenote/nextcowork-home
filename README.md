# nextcw.com 웹사이트 — 운영 가이드

## 1. 구성

정적 HTML/CSS/JS 기반입니다. 인사이트 글만 Markdown(`.md`)으로 작성하고 `npm run build`로 HTML을 생성합니다.

```
index.html            메인          /flexoffice /ai-campus /public /coaching
/about /insights /contact           css/style.css (디자인 토큰·컴포넌트)
js/main.js (모션·폼)  js/insights-data.js (최신 콘텐츠 목록 — 자동 생성)
content/insights/*.md (인사이트 원고)  scripts/build-insights.mjs (MD → HTML 변환)
llms.txt · robots.txt · sitemap.xml · vercel.json · img/og.png
```

## 2. 배포 (Vercel)

1. vercel.com → Add New Project → 이 폴더 업로드(또는 GitHub 연결)
2. Framework Preset: **Other** (빌드 명령 없음) → Deploy
3. 도메인 연결: Settings → Domains → nextcw.com 추가 → DNS를 Vercel 안내대로 변경

✅ 노션 자료실 링크는 nextcw.notion.site 주소로 교체 완료 — DNS를 전환해도 자료실이 유지됩니다. (아카이브 루트: https://nextcw.notion.site/NEXT-COWORK-12f87cb032f88076b330cb6cc049d3ed)

## 3. 콘텐츠 업데이트 (살아있는 사이트 운영법)

- **새 글 발행 시**: `content/insights/`에 Markdown 파일 추가 → `npm run build` 실행 → `/insights/글주소/` HTML, `js/insights-data.js`, `sitemap.xml` 자동 생성 → 커밋/재배포
- **가격 변경**: `/ai-campus/index.html`, `/coaching/index.html`의 price-card + JSON-LD Offer 두 곳 수정
- **문의 채널**: 카카오톡 오픈채팅(open.kakao.com/o/sfxwSCvf) + 구글폼(bit.ly/edu_cowork) 연동 완료. 구글폼 주소가 바뀌면 `contact/index.html`에서 교체

### 인사이트 Markdown 발행법

1. `content/insights/_template.md`를 복사해 새 파일을 만듭니다.
2. 파일명은 `YYYY-MM-DD-english-slug.md`처럼 씁니다.
3. 상단 front matter의 `title`, `description`, `date`, `category`, `tags`, `slug`를 채웁니다.
4. 본문은 일반 Markdown으로 작성합니다.
5. 터미널에서 `npm run build`를 실행합니다.
6. 생성된 글 주소는 `/insights/{slug}/`입니다.
7. `npm run build`는 최신 콘텐츠 목록, 글 상세 HTML, 사이트맵, CSS/JS 캐시 방지용 버전값을 함께 갱신합니다.

### 옵시디언에서 발행하기 (권장 — 모바일 작성 가능)

옵시디언 "NEXT COWORK" 볼트의 `08. 브랜드ㆍ콘텐츠엔진/03. 발행_인사이트/`에 글을 쓰고 동기화합니다.

1. 볼트에서 `_템플릿 — 인사이트 발행.md`를 복사해 새 노트를 만듭니다.
2. front matter에서 `publish: true`로 바꾸고 `slug`·`publish_date`를 채웁니다.
3. `npm run sync:dry` — 무엇이 발행될지, 미지원 문법은 없는지 미리 봅니다.
4. `npm run sync` — 변환 + 빌드까지 한 번에 실행합니다.

동기화가 자동으로 처리하는 것:

- 볼트 frontmatter(`service`·`summary` 등) → 사이트 frontmatter(`cta_service`·`description` 등) 변환
- `![[이미지.png]]` 임베드 → `첨부_이미지/`에서 `img/insights/`로 복사 후 표준 마크다운으로 교체
- `[[위키링크]]` → 일반 텍스트 (웹에 대응 URL이 없으므로. 링크가 필요하면 `[표시](/flexoffice/)`로 직접 씁니다)
- `> [!note]` 콜아웃 → 일반 인용문
- 중첩 목록·이탤릭·H4·체크박스 등 미지원 문법 경고

볼트는 **읽기 전용**으로만 다룹니다. 동기화가 볼트 노트를 고치지 않습니다.
볼트 경로가 다르면 `NCW_VAULT` 환경변수로 지정합니다.

운영 메모:

- 인사이트 목록은 `insights/index.html`의 `FEED:START`/`FEED:END` 사이에 **정적 HTML로 생성**됩니다. AI 크롤러는 JS를 실행하지 않으므로 이 정적 목록이 원본이고, `js/insights-data.js`는 폴백입니다. 마커를 지우면 빌드가 중단됩니다.
- `llms.txt`도 `INSIGHTS:START`/`INSIGHTS:END` 마커 사이를 빌드가 자동 갱신합니다.
- `npm run build`는 글 HTML·최신 목록·`sitemap.xml`·`rss.xml`·`llms.txt`·캐시 버전값을 함께 갱신합니다.
- 본문에서 쓸 수 있는 문법: H2·H3, 목록, **표**, **이미지**, 인용, 코드블록, `**굵게**`, 링크. 중첩 목록·이탤릭·H4 이상은 미지원입니다.
- 본문에 `## 자주 묻는 질문` 섹션을 두고 `### 질문`을 쓰면 FAQPage 스키마가 자동 생성됩니다.
- 이미지 `alt`가 비어 있으면 빌드가 중단됩니다(접근성).
- iPad Safari처럼 캐시가 강한 브라우저에서도 새 발행분이 빨리 보이도록 `/js/*`는 Vercel에서 `must-revalidate`로 설정했습니다.
- 글을 새로 추가한 뒤에는 반드시 `npm run build` 결과까지 커밋합니다.

예시:

```md
---
title: "CEO가 ChatGPT를 업무에 붙이는 가장 쉬운 방법"
description: "대표님을 위한 AI 업무도입 실전 가이드"
date: "2026-07-09"
category: "AI 실무활용"
tags: ["ChatGPT", "CEO AI"]
slug: "ceo-chatgpt-start"
image: "/img/og.png"
---

첫 문단부터 바로 본문을 씁니다. 큰 제목은 front matter의 title로 자동 생성됩니다.
```

## 4. Google Analytics 연결

사이트에는 GA4 로더가 연결되어 있습니다. 현재 측정 ID는 `G-T2JVBW1JTD`입니다.

1. https://analytics.google.com 에서 넥스트코웍 속성을 만들거나 기존 속성을 엽니다.
2. 관리 → 데이터 스트림 → 웹 스트림에서 `nextcw.com`을 추가합니다.
3. `G-`로 시작하는 측정 ID를 복사합니다.
4. 측정 ID가 바뀌면 `js/analytics.js`의 `GA_MEASUREMENT_ID`를 새 값으로 교체합니다.
5. 배포 후 Google Analytics의 실시간 보고서에서 방문이 잡히는지 확인합니다.

측정 ID가 placeholder로 돌아가면 Google로 데이터가 전송되지 않습니다.

## 5. 확정 현황

| 항목 | 값 | 상태 |
|---|---|---|
| 네이버 블로그 | blog.naver.com/chancenote | ✅ 확정 |
| 노션 자료실 | nextcw.notion.site (플레이북·포트폴리오) | ✅ 교체 완료 |
| 문의 채널 | 카카오톡 + 구글폼 | ✅ 연동 완료 |
| CEO 코칭 가격 | 300만원 (2h×5회) | ✅ 공개가 (2026-10-07 4석 한정 할인 종료) |
| AI Campus 가격 | 특강 150만원~ / 워크샵 300만원~ | 제안값 — 변경 시 두 곳 수정(본문+JSON-LD) |

## 인사이트 썸네일 카드 운영 (시안 브랜치)

- 기존 페이지 구조를 유지하고 최신 콘텐츠 영역만 썸네일 카드로 표시합니다. PC 3열, 태블릿·모바일 2열입니다(360px 미만은 1열).
- 자체 글은 원고의 `thumbnail`(생략 시 `image`), `image_alt`, 제목·분류·날짜를 사용합니다. 외부 채널·자료실은 기존 링크와 전용 표지 구성을 사용하며 외부 링크임을 표시합니다.
- 출처(인사이트 / 채널·자료실 ↗)와 분류는 커버 이미지 위가 아니라 카드 본문 첫 줄(`.thumb-topline`)에 14px로 함께 표시합니다.
- `npm run build`가 목록을 생성합니다. 정적 HTML과 브라우저 폴백은 `js/insights-cards.js`의 동일 함수를 사용합니다. 현재 6개 카드를 모두 표시하며 새 글이 추가되면 목록이 늘어납니다.
- 글 상세 디자인은 기존 그대로입니다. Obsidian 동기화에서도 thumbnail/image_alt를 전달합니다.
- **선택 front matter `audience`(대상)·`takeaway`(가져갈 것)**: 값이 있을 때만 카드 제목 아래 `.thumb-brief`와 글 상세 요약 아래 `.post-brief`에 표시됩니다. 없으면 요소를 만들지 않습니다(자리표시 없음). 빈 문자열은 빌드 오류입니다. Obsidian 동기화는 같은 키를 그대로 넘깁니다.
- **글 상세 메타 줄 `.post-meta`**: `author`(선택, 있을 때만) · 읽기 시간(본문 평문 글자 수 ÷ 500자/분, 올림 — 빌드가 계산) · `updated`(선택, YYYY-MM-DD, 있을 때만 "갱신" 표시 + JSON-LD `dateModified`). 파일 수정 시각으로 갱신일을 만들지 않습니다.
- **홈 최신 글 마커**: `index.html`에 `<!-- HOME_LATEST:START -->`…`<!-- HOME_LATEST:END -->`를 두면 빌드가 자체 글 최신 3편을 허브와 같은 썸네일 카드로 채웁니다. 마커가 없으면 건너뜁니다(마커 주변에 `.thumbnail-feed` 컨테이너와 `css/insights-magazine.css` 로드가 필요).
- 운영용 `npm run deploy`는 전체 커밋·푸시·배포를 수행하므로 시안 확인에는 사용하지 않습니다.

### 최신 노트와 검색 (3차 시안)

- 헤더는 빌드 시 발행일순 첫 자체 글로 자동 생성됩니다. `HERO:START/END` 마커를 유지합니다.
- `topic`은 큰 주제, `category`는 카드의 분류 문구, `tags`는 세부 검색 태그입니다. topic 생략 시 기존 category·연결 서비스를 바탕으로 기본 분류합니다.
- 검색은 자체 글의 제목·요약·태그·본문을 대상으로 합니다. 외부 채널 4개는 기본 화면에만 표시하며 외부 글 본문을 검색하지 않습니다.
- 검색어/주제/태그/페이지는 URL로 공유·복원됩니다. 제목·태그 일치를 우선하고 ChatGPT의 한글 별칭을 지원합니다.
- 12개씩 페이지를 나누며 JavaScript 미사용 시 전체 정적 목록을 볼 수 있습니다. 현재 내용이 있는 주제만 메뉴로 노출합니다.

### 구독 패널 · 태그 탐색 · 글자 크기 기준

- 구독 패널은 목록·상세 모두 `</main>` 직전에 **1회만** 노출합니다(`#newsletter-form`도 페이지당 1개). 목록은 `insights/index.html`, 상세는 `scripts/build-insights.mjs`의 `renderArticle()` 템플릿이 원본입니다. 생성된 상세 HTML은 직접 수정하지 않습니다.
- 상세 페이지는 `css/style.css`와 함께 `css/insights-magazine.css`를 로드합니다(구독 패널 스타일이 여기 있음). 전송 처리는 기존 `js/main.js`의 `#newsletter-form` 바인딩을 그대로 사용하며, 발행 주기·혜택을 약속하는 문구는 넣지 않습니다.
- 태그 탐색: 기본 6개를 **현재 검색어·주제 조건에서의 노트 수 내림차순(동률은 이름 오름차순)**으로 보여주고, `전체 태그 보기` 이후에는 20개 단위로 확장합니다. 연결된 노트가 0개인 태그는 선택할 수 없게 비활성 처리하되, 이미 선택된 태그는 해제할 수 있도록 활성으로 둡니다. 초기화 버튼 문구는 `조건 초기화`로 통일합니다.
- 라벨은 역할이 다릅니다 — `콘텐츠 검색`은 글을, `태그 이름 검색`은 선택할 태그를 찾습니다.
- 상세 글의 태그 아래에는 `이 주제의 글 더 보기 →` 링크가 `/insights/?topic=…#latest-content`로 연결됩니다.
- 인사이트 글자 크기(모바일 기준): 상세 본문 18px·제목 30px·요약 19px, 카드 제목 18px, 검색/태그칩/입력/버튼 16px, 날짜·개수 등 보조 정보 14px. PC는 각각 19/44/21/22px입니다. 읽어야 하는 텍스트에 8~13px를 쓰지 않습니다.

## 디자인 컴포넌트 (라운드 13 · 간결·임팩트 기준)

공통 클래스는 `css/style.css` 끝의 "라운드 13 · 공통 디자인 컴포넌트" 블록에 있습니다. 새 블록을 만들 때 아래 6가지 중에서 고르고, 인라인 `style`·새 색은 쓰지 않습니다. 기준 문서: `_workspace/43_concise_impact_brief.md`.

| 역할 | 클래스 | 규칙 |
|---|---|---|
| 정보·준비물·경계 | `.note` | 회색 면, 테두리 없음, 굵은 첫 문장이 제목. 연속 2개 금지 |
| 오퍼·핵심 제안 | `.callout.callout--feature` | 흰 면 + 서비스 색 1px 테두리, 페이지당 최대 1개 |
| 인용 | `.testimonial` | 기존 그대로 |
| 단계·상품 비교 | `.compare-wrap > table.compare-table` | 행=기준, 열=상품, 첫 열 고정. 모바일은 `.compare-core` 행만, 나머지는 펼침 |
| 하위 블록 제목 | `.block-title` | 섹션(H2)당 영문 아이브로 1개, 그 아래 라벨은 이것 |
| 바로가기 줄 | `ul.quick-links` | 긴 서비스 페이지 히어로 아래, 이미 있는 앵커 4~5개 |

블록 사이 간격은 부모에 `.flow`를 붙이면 `--flow`(28px)로 통일됩니다. `.callout--spaced`, `.callout--spaced-lg`는 같은 간격의 별칭으로만 남아 있습니다(정리 예정).

```html
<div class="note"><b>준비해 주시면 좋은 자료</b><p>기본계획·예산 일정·부지 정보</p></div>

<div class="callout callout--feature"><b>8주 파일럿</b> — 한 팀의 실제 업무로 먼저 검증합니다.</div>

<h3 class="block-title">교육에서 만드는 것과 만들지 않는 것</h3>

<ul class="quick-links"><li><a href="#price">가격</a></li><li><a href="#process">진행 절차</a></li><li><a href="#faq">FAQ</a></li></ul>

<div class="compare-wrap">
  <table class="compare-table">
    <thead><tr><th scope="col">기준</th><th scope="col">특강<small>150만원부터</small></th><th scope="col">실무 워크샵<small>300만원부터</small></th></tr></thead>
    <tbody class="compare-core">
      <tr><th scope="row">이런 상황에</th><td>…</td><td>…</td></tr>
      <tr><th scope="row">받는 것</th><td>…</td><td>…</td></tr>
    </tbody>
    <tbody class="compare-detail">
      <tr><th scope="row">제외·선행</th><td>…</td><td>…</td></tr>
    </tbody>
  </table>
  <details class="compare-more"><summary>단계별 상세 비교</summary></details>
</div>
```

문의 버튼 문구: 문의 폼으로 가는 주 버튼은 "…문의하기"(헤더·푸터 "프로젝트 문의하기"), 페이지 안 이동·자료는 "…보기"/"…받기" 고스트 버튼.
