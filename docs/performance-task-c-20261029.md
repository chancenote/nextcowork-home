# Task C — 성능 개선 검증 (2026-10-29)

기준 커밋: `ba386f915cf8cc010139e1166089445244419d22`. 콘텐츠·링크·폼 계약·검색·메뉴 기능을 유지한 성능 변경입니다.

## Lighthouse

Lighthouse 13.5.0, Chrome headless, 기본 모바일 시뮬레이션, 동일 Mac의 로컬 HTTP 서버에서 비교했습니다. 서버는 HTML/CSS/JS gzip과 운영 CSP를 적용했습니다. 운영 Vercel의 HTTP/2·CDN·사용자 실측 결과는 아닙니다.

| 페이지 | 성능 점수 전 → 후 | LCP 전 → 후 | FCP 전 → 후 | 최종 CLS |
|---|---:|---:|---:|---:|
| 홈 — 각 3회 중앙값 | 64 → 92 | 7.04 → 2.93초 | 5.05 → 2.41초 | 0 |
| 대표 소개 — 각 1회 | 64 → 94 | 7.36 → 2.71초 | 4.83 → 2.26초 | 0.01 |
| 인사이트 목록 — 각 1회 | 64 → 85 | 7.93 → 4.36초 | 4.63 → 1.21초 | 0 |

홈 개별 점수는 이전 62/64/96, 이후 92/99/92였습니다. 측정 편차가 있으므로 중앙값을 사용하며, 특정 운영 점수를 보장하지 않습니다. 모든 기록에 Lighthouse 실행 경고와 리소스 로딩 오류가 없습니다. 홈의 글꼴 요청은 22개에서 2개, 글꼴 전송량은 약608KB에서204KB로 줄었습니다.

## 변경

- 프로필 JPEG를 원본 크기 및600w WebP로 제공합니다. 원본 JPEG는 공유 메타데이터용으로 보존했습니다.
- 기존 카드 축소본 규칙에 맞춘720w WebP8개와 모바일 홈 배경을 추가했습니다. 카드8개 합계536,434 →173,490B, 모바일 배경133,808 →50,930B, 프로필221,690 →44,034B입니다.
- 본문 이미지의 실제 PNG/JPEG/WebP/SVG 크기를 빌드에서 기록하며 기존 lazy loading을 유지합니다. 외부 채널 카드도 크기를 지정합니다. 첫 화면 이미지는 지연 로딩하지 않습니다.
- 사용하지 않는 구형 Public CSS와 내비게이션 추적 JS를 제거했습니다. 인사이트 검색 데이터는 `defer`로 읽으며 전체 검색 내용을 유지합니다.
- Pretendard·Inter를 같은 출처에서 제공하고 모든 선언에 `font-display: swap`을 유지했습니다. 외부 스크립트가 preload된 폰트 CSS를 적용하므로 CSP에서 금지하는 인라인 onload가 없습니다. JavaScript 비활성 시 noscript CSS를 사용합니다.
- 핵심9개 경로의737개 문자를153,668B 가변 폰트로 묶었습니다. 원본92개 부분 폰트가 나머지 문자를 지원합니다. 글리프 모양·문자 폭을 원본과 굵기45/400/800/920에서 대조했습니다. 콘텐츠가 바뀌어도 새 문자는 원본 부분 폰트로 표시됩니다.
- 공통 폰트 URL은 내용 해시를 포함하고 폰트만1년 immutable 캐시를 사용합니다. 재생성 방법과 OFL은 `fonts/pretendard-v1.3.9/README.md`에 있습니다. Python/fontTools는 선택적인 재생성 도구이며 사이트 빌드 의존성이 아닙니다.
- 독립 레이아웃 `anthropic-ipo-s1`의 별도 서체는 변경하지 않았습니다.

## 검증

```sh
npm run build
node scripts/verify-contact-context.mjs
node scripts/verify-search-conversion.mjs
node scripts/verify-search-readiness.mjs
git diff --check
```

24페이지·15개 글·내부 링크737개와 문의 문맥18개 검사가 통과했습니다. 기존 이미지 크기 검사는 신규 글2개가 기대값에서 빠져 기준 커밋에서도 실패했으며, 실제 이미지 크기로 기대값을 갱신했습니다. 재빌드는 의도적인 RSS `lastBuildDate` 외 동일합니다.

390px·1440px 브라우저 화면에서 홈·프로필·문의·인사이트·Public·글 상세를 확인했습니다. 문의4개 서비스의 자동 입력, 서비스/상품 변경, 검색/필터/뒤로가기, 모바일 메뉴/Escape, Public 고정 내비게이션/탭/기존 해시, 글 공유 패널/링크 복사가 통과했습니다. 최종 모바일 재검사에서 이미지51개가 정상 로드됐고 가로 넘침·JS 예외·CSP 위반·로컬 HTTP 오류가 없었습니다. JavaScript 비활성 홈·정적 인사이트 목록과 공통 폰트 범위 밖 문자 폴백을 확인했습니다. 실제 문의 발송·결제·운영 배포는 수행하지 않았습니다.

Lighthouse 재현 명령(기준/변경본을 별도 로컬 포트에서 제공):

```sh
npx lighthouse@13.5.0 http://127.0.0.1:4317/ --only-categories=performance --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --output=json --output-path=after-home.json
```
