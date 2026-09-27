# garmgoon

`garmgoon.com`에서 운영하는 개인 대시보드입니다. 매일 아침 비즈니스 아이디어 카드뉴스와 유튜브 요약을 모아 봅니다.

| 페이지 | 공개 | 내용 |
| --- | --- | --- |
| `/` 오늘의 카드 | 공개 | 니치 수익 사례·새로운 사업 형태·호응 큰 아이디어 검증 글을 AI가 골라 요약한 카드 갤러리 (유형, 검증 신호, 3줄 요약, 응용 아이디어). 누르면 원문. 피드에는 추천 상위 `FEED_CARDS`장만 보이고, 로그인하면 👍/👎로 평가할 수 있음 |
| `/cards` 전체 카드 | 공개 | 그날 만든 카드 전체 (하루 최대 `DAILY_CARDS`장). 추천순·최신순 정렬, 👎 카드 숨기기 |
| `/youtube` | 공개 | 등록한 채널의 새 영상 요약 (자막 기반, 실패하면 설명란 기반) |
| `/trends` | 공개 | 매주 일요일 18시 이후 생성되는 주간 트렌드 리포트 |
| `/games` | 공개 | 게임 모음 (한국어/영어 전환). 얼음과 불의 춤(`/games/adofai`): 기본 레벨 6개(`lib/adofai/levels.js`), 원작 `.adofai` 커스텀 레벨 불러오기, 기록은 브라우저에 저장. 타자 레이스(`/games/typing`, 예전 `/typing` 주소는 자동 이동). 말랑 배구(`/games/volley`): 피카츄 배구 물리 재현(`lib/volley/physics.js`), 컴퓨터·한 키보드 2인·온라인(PeerJS 락스텝) 대전, 캐릭터 5종과 얼굴 사진 붙이기 |
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

Reddit 기본 설정은 `REDDIT_MODE=rss`이며 Reddit API 키가 필요하지 않습니다. 서브레딧별 주간 Top 100을 매일, 월간 Top 100을 7일마다 순차 확인하고 처음 발견한 글만 저장·채점합니다. `api` 모드에서만 Reddit secrets를 사용합니다. 배포 전에 `0004_reddit_discussion.sql`과 `0005_reddit_top.sql` 적용이 필요합니다. 자세한 동작과 운영 절차는 [docs/REDDIT_RSS.md](docs/REDDIT_RSS.md)를 참고하세요.

Cloudflare Worker secrets:

```bash
npx wrangler secret put ADMIN_PASSWORD      # 비공개 페이지 로그인 비밀번호
npx wrangler secret put OPENROUTER_API_KEY  # AI 요약용 (없으면 원문만 표시)
npx wrangler secret put HUB_API_KEY         # 맥미니 Residential Hub 자막 API 인증 키
npx wrangler secret put REDDIT_CLIENT_ID    # 선택: REDDIT_MODE=api 사용 시
npx wrangler secret put REDDIT_CLIENT_SECRET
```

- **맥미니 Residential Hub**: 유튜브 데이터센터 IP 차단 우회 및 AI 비디오 과금 방지를 위해 맥미니 집 인터넷 회선을 Cloudflare Tunnel(`hub.garmgoon.com`)로 연결해 자막을 수집합니다. 자세한 구조와 신규 기능 확장 방법은 [docs/RESIDENTIAL_HUB.md](docs/RESIDENTIAL_HUB.md)를 참고하세요.

수집 출처와 하루 상한은 `worker/sources.js`의 `SOURCES`, 서브레딧은 `REDDIT_SUBS`에서 바꿉니다. 네이버 검색 API는 약관(2026-09-07 개정)이 저장·AI 입력을 금지해 쓰지 않습니다.

`wrangler.jsonc`의 `vars`에서 모델(`OPENROUTER_MODEL`), 허브 주소(`HUB_BASE_URL`), 하루 카드 수(`DAILY_CARDS`, 기본 100), 피드 카드 수(`FEED_CARDS`, 기본 30), 카드 최소 점수(`MIN_CARD_SCORE`, 기본 5), 기준 시간대(`TIMEZONE`, 기본 `America/Denver`), 수집 기준 시각(`COLLECT_HOUR`)과 간격(`COLLECT_INTERVAL_HOURS`, 기본 4시간)을 바꿀 수 있습니다.

GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (Workers 편집 + D1 편집 권한), `CLOUDFLARE_ACCOUNT_ID`. `main`에 push하면 D1 마이그레이션 후 배포됩니다.

## 로컬 개발

```bash
npm install
npx wrangler d1 migrations apply garmgoon --local
echo "ADMIN_PASSWORD=localtest" > .dev.vars   # OPENROUTER_API_KEY도 넣으면 AI 요약 사용
npm run preview                              # 빌드 후 http://localhost:8787
```

설정 페이지의 "다음 단계 실행" 버튼으로 크론을 기다리지 않고 파이프라인을 진행할 수 있습니다.

### 카드 취향 학습

로그인한 상태에서 카드에 👍/👎를 누르면 `card_feedback`에 저장됩니다. 평가가 3개 이상 쌓이면 다음처럼 반영됩니다.

- **AI 채점:** 최근 좋아요·싫어요 카드 제목(각 15개)을 프롬프트에 넣어 비슷한 방향의 글에 ±1~2점을 줍니다.
- **카드 선정:** 출처(서브레딧 포함)별 좋아요 비율로 가산점(최대 ±2)을 더해 고릅니다.
- **피드 순서:** 선정 점수에 출처·분야·유형별 가산점을 최신 평가로 다시 계산해 상위 카드를 고르고, 👎 카드는 피드에서 뺍니다.

커뮤니티 글이 30일 보관 기간 뒤 지워져도 학습이 이어지도록, 평가 기록에는 카드 분류(출처·분야·유형·태그)와 AI가 쓴 한국어 제목만 남기고 원문 본문·댓글은 남기지 않습니다. 배포 전에 `0006_card_feedback.sql` 적용이 필요합니다.
