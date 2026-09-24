# garmgoon

`garmgoon.com`에서 운영하는 개인 대시보드입니다. 매일 아침 비즈니스 아이디어 카드뉴스와 유튜브 요약을 모아 봅니다.

| 페이지 | 공개 | 내용 |
| --- | --- | --- |
| `/` 오늘의 카드 | 공개 | 여러 사이트에서 모은 글 중 AI가 고른 카드뉴스 (표지 → 3줄 요약 → 사업 포인트) |
| `/youtube` | 공개 | 등록한 채널의 새 영상 요약 (자막 기반, 실패하면 설명란 기반) |
| `/trends` | 공개 | 매주 일요일 18시 이후 생성되는 주간 트렌드 리포트 |
| `/tools` | 로그인 | 직접 만든 SaaS 도구 모음 (`app/tools/page.js`의 `TOOLS`에 추가) |
| `/scrap` | 로그인 | 스크랩과 아이디어 노트 |
| `/settings` | 로그인 | 유튜브 채널, 관심 키워드, 수집 상태와 수동 실행 |

## 구조

- `app/`, `components/`, `lib/`: Next.js 정적 페이지 (`out/`으로 빌드)
- `worker/`: Cloudflare Worker. `/api/*`와 비공개 페이지 로그인 확인, 10분마다 도는 크론 파이프라인
  - `sources.js`: 수집 출처 목록 (RSS 한 줄 추가로 확장)
  - `pipeline.js`: 수집 → AI 채점 → 카드 선정 → 카드 생성 → 유튜브 확인·요약 → 주간 리포트를 한 단계씩 처리
- `migrations/`: D1 데이터베이스 스키마

## 설정

Cloudflare Worker secrets:

```bash
npx wrangler secret put ADMIN_PASSWORD      # 비공개 페이지 로그인 비밀번호
npx wrangler secret put OPENROUTER_API_KEY  # AI 요약용 (없으면 원문만 표시)
```

`wrangler.jsonc`의 `vars`에서 모델(`OPENROUTER_MODEL`), 하루 카드 수(`DAILY_CARDS`), 기준 시간대(`TIMEZONE`, 기본 `America/Denver`), 수집 시각(`COLLECT_HOUR`)을 바꿀 수 있습니다.

GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (Workers 편집 + D1 편집 권한), `CLOUDFLARE_ACCOUNT_ID`. `main`에 push하면 D1 마이그레이션 후 배포됩니다.

## 로컬 개발

```bash
npm install
npx wrangler d1 migrations apply garmgoon --local
echo "ADMIN_PASSWORD=localtest" > .dev.vars   # OPENROUTER_API_KEY도 넣으면 AI 요약 사용
npm run preview                              # 빌드 후 http://localhost:8787
```

설정 페이지의 "다음 단계 실행" 버튼으로 크론을 기다리지 않고 파이프라인을 진행할 수 있습니다.
