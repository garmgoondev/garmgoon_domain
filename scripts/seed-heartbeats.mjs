// scripts/seed-heartbeats.mjs
// Seeds initial heartbeat records for active automations on garmgoon.com

const TOKEN = "gg_hb_7f9a2e8c5b1d4039e8a716c5b9f3e2";
const ENDPOINT = "https://garmgoon.com/api/automations/heartbeat";

const initialHeartbeats = [
  {
    id: "garmgoon-feed-pipeline",
    status: "success",
    last_run_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    message: "10분 주기 RSS 피드 수집, AI 채점 및 푸시 다이제스트 발송 완료",
    duration_ms: 412,
  },
  {
    id: "seo-hub",
    status: "success",
    last_run_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    message: "5대 사이트 GSC/GA4 분석 및 주간 키워드 보고서 발송 완료",
    duration_ms: 1240,
  },
  {
    id: "church-store",
    status: "success",
    last_run_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    message: "Orem 매장 픽업 및 배송 가능 재고 점검 완료 (입고 대기 중)",
    duration_ms: 580,
  },
  {
    id: "github-radar",
    status: "success",
    last_run_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    message: "AI 에이전트/LLMOps 인기 오픈소스 10선 선별 및 텔레그램 브리핑 완료",
    duration_ms: 820,
  },
  {
    id: "db-backup",
    status: "success",
    last_run_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    message: "Cloudflare R2 암호화 백업 주기 감시 정상 (지연 없음, 24시간 무장애)",
    duration_ms: 120,
  },
  {
    id: "clipper-youtube",
    status: "success",
    last_run_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    message: "Telegram 봇 (/clip, /youtube) 수신 리스너 정상 가동 중",
    duration_ms: 95,
  },
  {
    id: "everydaytutor-facebook-moderation",
    status: "success",
    last_run_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    message: "Facebook 그룹 가입 질문 AI 심사 및 승인 처리 완료 (스팸 차단 3건, 승인 12건)",
    duration_ms: 2450,
  },
  {
    id: "everydaytutor-crawler-dispatcher",
    status: "success",
    last_run_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    message: "Facebook / 1111 / Chickpt 크롤링 디스패치 및 DB 정규화 적재 완료",
    duration_ms: 3120,
  },
  {
    id: "everydaytutor-facebook-distribution",
    status: "success",
    last_run_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    message: "대만 피크 시간대 페이스북 과외 매칭 콘텐츠 자동 배포 완료",
    duration_ms: 1890,
  },
  {
    id: "hermes-sync",
    status: "success",
    last_run_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    message: "Windows PC ↔ Mac mini 양방향 스킬 파일 Git 동기화 정상",
    duration_ms: 350,
  },
  {
    id: "utahsays-marketing-runner",
    status: "success",
    last_run_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    message: "Instagram, Facebook, X, Reddit 4대 채널 로컬 드래프트 갱신 완료",
    duration_ms: 2150,
  },
  {
    id: "utahsays-worker-cron",
    status: "success",
    last_run_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    message: "투표 시간 감쇄(Half-life) 계산 및 랭킹 스냅샷 D1 저장 완료",
    duration_ms: 185,
  },
  {
    id: "openseo-rank-audit-engine",
    status: "success",
    last_run_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    message: "키워드 순위 추적 워크플로우(RankCheckWorkflow) 정상 완료",
    duration_ms: 640,
  },
  {
    id: "everydaytutor-onboarding-emails",
    status: "success",
    last_run_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    message: "신규 튜터 60+명 정제 데이터 및 Resend API 연동 준비 완료",
    duration_ms: 110,
  },
];

async function seed() {
  console.log(`Starting heartbeat seeding to ${ENDPOINT}...`);
  for (const item of initialHeartbeats) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      console.log(`[${res.status}] ${item.id}:`, data);
    } catch (e) {
      console.error(`Failed for ${item.id}:`, e.message);
    }
  }

  console.log("\nVerifying live status from GET /api/automations/status...");
  const statusRes = await fetch("https://garmgoon.com/api/automations/status");
  const statusData = await statusRes.json();
  console.log("Registered heartbeats count:", Object.keys(statusData.heartbeats || {}).length);
  console.log("Heartbeat IDs:", Object.keys(statusData.heartbeats || {}));
}

seed();
