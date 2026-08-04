/* ==========================================================
   NCW_FEED — 인사이트 허브 '최신 콘텐츠' 목록
   이 파일은 npm run build 실행 시 content/insights/*.md에서 자동 생성됩니다.
   외부 채널 링크는 scripts/build-insights.mjs의 externalFeed에서 관리합니다.
   src: insight | brunch | naver | threads | notion | news

   주의: 허브 목록의 원본은 insights/index.html의 정적 HTML이다.
   이 파일은 그 영역이 비어 있을 때만 쓰이는 폴백 데이터다.
   ========================================================== */
window.NCW_FEED = [
  {
    "src": "insight",
    "title": "공유오피스 도입 타당성 검토, 무엇부터 봐야 하나요",
    "url": "/insights/flexoffice-feasibility-checklist/",
    "date": "2026.08.04"
  },
  {
    "src": "insight",
    "title": "넥스트코웍은 AI Workspace Builder입니다",
    "url": "/insights/ai-workspace-builder/",
    "date": "2026.07.09"
  },
  {
    "src": "brunch",
    "title": "일이 잘되는 공간과 방법을 연구합니다 — 찬스노트",
    "url": "https://brunch.co.kr/@chancenote",
    "date": "브런치"
  },
  {
    "src": "threads",
    "title": "매일 기록하는 AI 실무활용 노트 — @chancenote",
    "url": "https://www.threads.com/@chancenote",
    "date": "Threads"
  },
  {
    "src": "notion",
    "title": "AI 플레이북 — 실무에 바로 쓰는 AI Tool 가이드",
    "url": "https://nextcw.notion.site/ai-cowork-book",
    "date": "자료실"
  },
  {
    "src": "notion",
    "title": "포트폴리오 — 마케팅·교육·세미나 수행 레퍼런스",
    "url": "https://nextcw.notion.site/portfolio",
    "date": "자료실"
  }
];
