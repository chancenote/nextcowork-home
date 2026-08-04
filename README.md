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
| CEO 코칭 가격 | 200만원 (2h×5회) | ✅ 기존 공개가 |
| AI Campus 가격 | 특강 150만원~ / 워크샵 300만원~ | 제안값 — 변경 시 두 곳 수정(본문+JSON-LD) |
