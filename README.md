# nextcw.com 웹사이트 — 운영 가이드

## 1. 구성

정적 HTML/CSS/JS (프레임워크·빌드 불필요). 폴더 그대로 Vercel에 올리면 작동합니다.

```
index.html            메인          /flexoffice /ai-campus /public /coaching
/about /insights /contact           css/style.css (디자인 토큰·컴포넌트)
js/main.js (모션·폼)  js/insights-data.js (최신 콘텐츠 목록 — 직접 편집)
llms.txt · robots.txt · sitemap.xml · vercel.json · img/og.png
```

## 2. 배포 (Vercel)

1. vercel.com → Add New Project → 이 폴더 업로드(또는 GitHub 연결)
2. Framework Preset: **Other** (빌드 명령 없음) → Deploy
3. 도메인 연결: Settings → Domains → nextcw.com 추가 → DNS를 Vercel 안내대로 변경

✅ 노션 자료실 링크는 nextcw.notion.site 주소로 교체 완료 — DNS를 전환해도 자료실이 유지됩니다. (아카이브 루트: https://nextcw.notion.site/NEXT-COWORK-12f87cb032f88076b330cb6cc049d3ed)

## 3. 콘텐츠 업데이트 (살아있는 사이트 운영법)

- **새 글 발행 시**: `js/insights-data.js` 배열 맨 위에 한 줄 추가 → 인사이트 허브 '최신 콘텐츠'에 자동 노출 (커밋/재배포)
- **가격 변경**: `/ai-campus/index.html`, `/coaching/index.html`의 price-card + JSON-LD Offer 두 곳 수정
- **문의 채널**: 카카오톡 오픈채팅(open.kakao.com/o/sfxwSCvf) + 구글폼(bit.ly/edu_cowork) 연동 완료. 구글폼 주소가 바뀌면 `contact/index.html`에서 교체

## 4. 확정 현황

| 항목 | 값 | 상태 |
|---|---|---|
| 네이버 블로그 | blog.naver.com/chancenote | ✅ 확정 |
| 노션 자료실 | nextcw.notion.site (플레이북·포트폴리오) | ✅ 교체 완료 |
| 문의 채널 | 카카오톡 + 구글폼 | ✅ 연동 완료 |
| CEO 코칭 가격 | 200만원 (2h×5회) | ✅ 기존 공개가 |
| AI Campus 가격 | 특강 150만원~ / 워크샵 300만원~ | 제안값 — 변경 시 두 곳 수정(본문+JSON-LD) |
