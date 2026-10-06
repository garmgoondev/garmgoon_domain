"use client";

import Link from "next/link";
import { useState } from "react";

const AUTOMATIONS = [
  // --- [1] 활성 자동화 (Active) ---
  {
    id: "seo-hub",
    category: "비즈니스 SEO",
    title: "SEO Hub 주간 리마인더 & 분석",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동",
    domains: [
      "everydaytutor.net",
      "pwstudio.kr",
      "utahsays.com",
      "garmgoon.com",
      "new.ecocarpetutah.com",
    ],
    schedule: "매주 월요일 09:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity)",
    channel: "Telegram (Pixie 봇) + reports/",
    description:
      "관리 중인 5개 비즈니스 웹사이트의 GSC/GA4 지표를 자동 조회하고, 10~25위권 1페이지 진입 유력 키워드 리라이팅 가이드 및 주간 보고서를 생성합니다.",
    highlights: [
      "EverydayTutor: 대만 과외 시세 검색어(24~28위) 1페이지 진입 점검",
      "PW Studio: 신규 등록 도메인 구글 색인(Indexing) 여부 및 테크니컬 오디트",
      "Utah Says: 신규 여론조사/커뮤니티 콘텐츠 인덱싱 및 틈새 키워드 발굴",
    ],
    reactivation: null,
  },
  {
    id: "church-store",
    category: "일상 & 커머스",
    title: "Church Store 제품 재고 알림",
    icon: "🛒",
    status: "active",
    statusText: "정상 가동",
    domains: ["store.churchofjesuschrist.org"],
    schedule: "매일 아침 09:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity)",
    channel: "Telegram (입고 시에만 알림)",
    description:
      "지정된 의류 품목의 Regular M/Medium 사이즈 재고(배송 가능 및 Orem 매장 픽업)를 자동으로 확인하고, 재고 입고 시 즉시 텔레그램으로 알림을 보냅니다.",
    highlights: ["배송(Ship-to-me) & Orem 매장 픽업 동시 감시", "입고 시에만 알림 (스팸 방지)"],
    reactivation: null,
  },
  {
    id: "github-radar",
    category: "기술 & 트렌드",
    title: "GitHub 프로젝트 레이더",
    icon: "🚀",
    status: "active",
    statusText: "정상 가동",
    domains: ["github.com"],
    schedule: "매일 아침 08:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity)",
    channel: "Telegram (일일 요약 브리핑)",
    description:
      "AI 에이전트, LLMOps, MCP 서비스, AI SEO/GEO, RAG 등 관련 분야의 최신 급상승 인기 GitHub 오픈소스 저장소를 매일 아침 선별 브리핑합니다.",
    highlights: ["스타수 급상승 및 최근 업데이트 기준 10선 추천", "중복 알림 억제 상태 관리"],
    reactivation: null,
  },
  {
    id: "db-backup",
    category: "인프라 & 보안",
    title: "Pixie DB 백업 신선도 워치독",
    icon: "🛡️",
    status: "active",
    statusText: "정상 가동",
    domains: ["pixie.garmgoon.com"],
    schedule: "상시 감시 (이벤트 기반)",
    engine: "Pixie (n8n / Ubuntu VPS)",
    channel: "Telegram (지연/장애 시 긴급 알림)",
    description:
      "PostgreSQL 데이터베이스의 Cloudflare R2 암호화 백업 실행 주기를 감시하고, 백업이 지연되거나 실패하면 즉시 텔레그램 알림을 발송합니다.",
    highlights: ["Cloudflare R2 암호화 오프사이트 백업", "백업 지연 시간 실시간 계산"],
    reactivation: null,
  },
  {
    id: "clipper-youtube",
    category: "개인 생산성",
    title: "옵시디언 웹 클리퍼 & 영상 자막",
    icon: "📎",
    status: "active",
    statusText: "정상 가동",
    domains: ["pixie.garmgoon.com", "YouTube"],
    schedule: "요청 시 즉시 (온디맨드)",
    engine: "Pixie (n8n + FastAPI runner)",
    channel: "Obsidian 보관함 + Telegram",
    description:
      "텔레그램에 유튜브 링크를 보내면 자막을 자동 추출하고, 웹 기사 링크를 보내면 로컬 AI가 본문과 요약을 Obsidian 보관함에 자동 저장합니다.",
    highlights: ["텔레그램 봇 단축 명령어 (/youtube, /clip)", "로컬 Obsidian Vault 자동 연동"],
    reactivation: null,
  },
  {
    id: "everydaytutor-facebook-moderation",
    category: "SNS & 커뮤니티 관리",
    title: "Facebook 그룹 자동 승인 관리 (AI Moderation)",
    icon: "👥",
    status: "active",
    statusText: "정상 가동",
    domains: ["facebook.com (대만/한국 과외 그룹)"],
    schedule: "4시간 주기 (대만 시간 01, 05, 09, 13, 17, 21시)",
    engine: "Playwright + OpenAI GPT (Windows 작업 스케줄러)",
    channel: "Facebook Group + Telegram 결과 보고",
    description:
      "대만/한국 과외 페이스북 그룹의 신규 가입 질문과 게시글을 OpenAI GPT로 실시간 심사하여 스팸을 차단하고 자동 승인/거절 처리 후 텔레그램으로 결과를 보고합니다.",
    highlights: [
      "OpenAI GPT 기반 가입 질문 심사 및 스팸성 게시글 자동 차단",
      "APPROVE / DECLINE 자동 집행 및 거절 사유 피드백 자동 전송",
      "심사 내역 텔레그램 실시간 알림 및 로컬 로그(.data) 추적",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-crawler-dispatcher",
    category: "크롤링 & 데이터 수집",
    title: "EverydayTutor 크롤링 디스패처 (Facebook / 1111 / Chickpt)",
    icon: "🕷️",
    status: "active",
    statusText: "정상 가동",
    domains: ["facebook.com", "1111.com.tw", "chickpt.com.tw"],
    schedule: "매일 아침 10:05 AM (대만 시간)",
    engine: "EverydayTutor Crawler (Node.js / Windows 작업 스케줄러)",
    channel: "Supabase DB + Telegram 알림",
    description:
      "Facebook 그룹 과외 구인글 및 대만 1111, Chickpt 튜터 채용 공고를 정기 수집·정규화하여 중복을 검사하고 Supabase 데이터베이스에 적재합니다.",
    highlights: [
      "Facebook 그룹, 1111, Chickpt 3대 채널 통합 수집 파이프라인",
      "공고 중복 검사 및 표준 데이터 스키마 자동 정규화",
      "크롤링 수집 건수 및 에러 텔레그램 실시간 알림",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-facebook-distribution",
    category: "SNS & 마케팅",
    title: "Facebook 콘텐츠 자동 배포 스케줄러",
    icon: "📣",
    status: "active",
    statusText: "정상 가동",
    domains: ["facebook.com"],
    schedule: "매일 2회 (대만 시간 08:05 AM, 20:05 PM)",
    engine: "EverydayTutor Distribution Runner (Windows 작업 스케줄러)",
    channel: "Facebook Groups",
    description:
      "EverydayTutor 플랫폼의 승인된 튜터 및 학생 매칭 콘텐츠를 예약 일정에 맞춰 페이스북 타깃 그룹에 자동으로 배포합니다.",
    highlights: [
      "승인 대기열 기반 과외 매칭 콘텐츠 자동 포스팅",
      "대만 현지 피크 시간대 1일 2회 정기 자동 분배",
      "실행 로그 (.data/distribution.log) 로컬 자동 기록",
    ],
    reactivation: null,
  },
  {
    id: "hermes-sync",
    category: "디바이스 동기화",
    title: "Hermes Hub 스킬 동기화",
    icon: "🔄",
    status: "active",
    statusText: "정상 가동",
    domains: ["Windows PC ↔ Mac mini"],
    schedule: "5분 주기 (백그라운드)",
    engine: "OS 예약 작업 / Cron (Git)",
    channel: "비공개 GitHub 저장소",
    description:
      "Windows PC(Orca)와 Mac mini 간에 개발 중인 AI 에이전트 스킬 파일들을 5분마다 양방향으로 자동 커밋, 푸시, 풀하여 항상 동일한 상태를 유지합니다.",
    highlights: ["비밀 정보(API키) 자동 필터링", "무인 백그라운드 양방향 Git sync"],
    reactivation: null,
  },

  // --- [2] 비활성 / 준비 / 템플릿 상태 (Inactive / Standby) ---
  {
    id: "email-digest",
    category: "개인 생산성",
    title: "Gmail 아침 이메일 다이제스트",
    icon: "📬",
    status: "inactive",
    statusText: "비활성 (보류 중)",
    domains: ["gmail.com", "pixie.garmgoon.com"],
    schedule: "매일 아침 08:00 AM (예정)",
    engine: "Pixie (n8n + Ollama 로컬 LLM)",
    channel: "Telegram (한국어 요약 다이제스트)",
    description:
      "큐레이션된 수신함 메일을 읽고 로컬 LLM으로 핵심 내용만 3줄 요약하여 매일 아침 텔레그램으로 브리핑하는 워크플로우입니다.",
    highlights: ["수신함 최대 100건 제한 안전 장치", "로컬 Ollama 기반 개인정보 보호 요약"],
    reactivation:
      "Google OAuth 읽기 전용 권한 확인 후 Pixie n8n에서 email-digest.json 활성화 토글",
  },
  {
    id: "youtube-channel-monitor",
    category: "기술 & 트렌드",
    title: "유튜브 채널 신규 영상 모니터링",
    icon: "📺",
    status: "inactive",
    statusText: "비활성 (템플릿 준비)",
    domains: ["youtube.com", "pixie.garmgoon.com"],
    schedule: "6시간 주기 (예정)",
    engine: "Pixie (n8n + runner-api)",
    channel: "Telegram (새 영상 알림)",
    description:
      "관심 등록된 유튜브 채널들의 RSS 피드를 6시간마다 순회 확인하여, 새 영상이 올라오면 즉시 감지하고 자막 요약 큐에 등록합니다.",
    highlights: ["YouTube Data API 쿼터 절약을 위한 RSS 피드 폴링", "채널별 최신 동영상 자동 감지"],
    reactivation: "Pixie n8n 화면에서 youtube-channel-monitor 워크플로우를 Active로 전환",
  },
  {
    id: "product-scout",
    category: "기술 & 트렌드",
    title: "데일리 프로덕트 스카우트",
    icon: "🔍",
    status: "inactive",
    statusText: "비활성 (템플릿 준비)",
    domains: ["Product Hunt / IndieHackers"],
    schedule: "매일 아침 08:00 AM (예정)",
    engine: "Pixie (n8n + runner-api)",
    channel: "Telegram (신규 SaaS 브리핑)",
    description:
      "새로운 디지털 제품 및 마이크로 SaaS 출시 소식을 수집하여 비즈니스 모델과 차별점을 매일 아침 요약 브리핑하는 스카우터입니다.",
    highlights: ["신규 프로덕트 론칭 데이터 수집", "수익화 모델 및 타깃 분석"],
    reactivation: "Pixie n8n 화면에서 product-scout.json을 Import 후 Active 토글",
  },
  {
    id: "social-publisher",
    category: "SNS & 마케팅",
    title: "멀티 SNS 원스톱 소셜 퍼블리셔",
    icon: "📢",
    status: "inactive",
    statusText: "비활성 (CLI 대기)",
    domains: ["Facebook, Instagram, Threads, X"],
    schedule: "예약 발행 시 실행",
    engine: "Automation Hub (Python CLI)",
    channel: "Meta Graph API + X API",
    description:
      "한 번의 콘텐츠 작성으로 페이스북 페이지, 인스타그램 프로페셔널, 스레드, X(트위터)에 동시 크로스 포스팅하는 자동 발행 엔진입니다.",
    highlights: ["실수 방지를 위한 Dry-run 우선 정책", "플랫폼별 이미지 규격 및 텍스트 자동 정규화"],
    reactivation: "D:\\Dev\\Automations\\.env에서 SOCIAL_PUBLISHING_ENABLED=true 설정 후 CLI 실행",
  },
  {
    id: "site-audit-crawler",
    category: "비즈니스 SEO",
    title: "OpenSEO 정기 테크니컬 크롤러",
    icon: "🕷️",
    status: "inactive",
    statusText: "비활성 (수동 요청 중)",
    domains: ["5개 비즈니스 웹사이트 전체"],
    schedule: "주간/월간 예약 크롤링 (예정)",
    engine: "OpenSEO Worker (seo.garmgoon.com)",
    channel: "OpenSEO 대시보드 + Webhook",
    description:
      "사이트 전체 페이지를 주기적으로 자동 크롤링하여 404 깨진 링크, 중복 메타 태그, 색인 차단(noindex) 오류 등을 사전 탐지하는 테크니컬 오디트 크롤러입니다.",
    highlights: ["전수 링크 상태 코드(404, 500) 검사", "캐노니컬 및 사이트맵 자동 검증"],
    reactivation: "https://seo.garmgoon.com 프로젝트 설정에서 정기 Site Audit 스케줄 활성화",
  },
];

export default function AutomationsPage() {
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = ["all", ...new Set(AUTOMATIONS.map((a) => a.category))];

  const filtered = AUTOMATIONS.filter((item) => {
    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;
    const matchCategory =
      categoryFilter === "all" ? true : item.category === categoryFilter;
    return matchStatus && matchCategory;
  });

  const activeCount = AUTOMATIONS.filter((a) => a.status === "active").length;
  const inactiveCount = AUTOMATIONS.filter((a) => a.status === "inactive").length;

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚡ OPERATIONS &amp; AUTOMATION HUB</div>
          <h1 className="pageTitle">도메인 자동화 통합 현황판</h1>
          <p className="pageDesc">
            가동 중인 <b>활성 자동화 {activeCount}개</b>와 언제든 켤 수 있는{" "}
            <b>대기 자동화 {inactiveCount}개</b>의 상태 및 재활성화 가이드를 한눈에 점검합니다.
          </p>
        </div>
      </div>

      {/* 요약 메트릭 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            padding: "18px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            총 자동화 파이프라인
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {AUTOMATIONS.length}개
            <span
              style={{
                fontSize: "12px",
                color: "#00a676",
                background: "rgba(0, 166, 118, 0.12)",
                padding: "2px 8px",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              🟢 {activeCount} 활성
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            padding: "18px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            대기 / 보류 템플릿
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: "#e68a00",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {inactiveCount}개
            <span
              style={{
                fontSize: "12px",
                color: "#e68a00",
                background: "rgba(230, 138, 0, 0.12)",
                padding: "2px 8px",
                borderRadius: "999px",
                fontWeight: 700,
              }}
            >
              🟡 준비 완료
            </span>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            padding: "18px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            통합 알림 수신처
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
            }}
          >
            📱 Telegram Bot
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            padding: "18px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            보안 레벨
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
            }}
          >
            🔒 비공개 (내 계정 전용)
          </div>
        </div>
      </div>

      {/* 1단계 필터: 활성/비활성 상태 선택 */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "14px",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            color: "var(--text-2)",
            marginRight: "4px",
          }}
        >
          상태:
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "var(--fs-xs)",
            fontWeight: statusFilter === "all" ? 700 : 500,
            border: "1px solid",
            borderColor: statusFilter === "all" ? "var(--brand)" : "var(--line)",
            background: statusFilter === "all" ? "var(--brand-soft)" : "var(--surface)",
            color: statusFilter === "all" ? "var(--brand)" : "var(--text)",
            cursor: "pointer",
          }}
        >
          전체 ({AUTOMATIONS.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("active")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "var(--fs-xs)",
            fontWeight: statusFilter === "active" ? 700 : 500,
            border: "1px solid",
            borderColor: statusFilter === "active" ? "#00a676" : "var(--line)",
            background:
              statusFilter === "active" ? "rgba(0, 166, 118, 0.12)" : "var(--surface)",
            color: statusFilter === "active" ? "#00a676" : "var(--text)",
            cursor: "pointer",
          }}
        >
          🟢 활성 가동 중 ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("inactive")}
          style={{
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "var(--fs-xs)",
            fontWeight: statusFilter === "inactive" ? 700 : 500,
            border: "1px solid",
            borderColor: statusFilter === "inactive" ? "#e68a00" : "var(--line)",
            background:
              statusFilter === "inactive" ? "rgba(230, 138, 0, 0.12)" : "var(--surface)",
            color: statusFilter === "inactive" ? "#e68a00" : "var(--text)",
            cursor: "pointer",
          }}
        >
          🟡 비활성 / 대기 ({inactiveCount})
        </button>
      </div>

      {/* 2단계 필터: 카테고리 칩 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: "5px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: categoryFilter === cat ? 700 : 500,
              border: "1px solid",
              borderColor: categoryFilter === cat ? "var(--brand)" : "var(--line)",
              background: categoryFilter === cat ? "var(--brand)" : "var(--surface)",
              color: categoryFilter === cat ? "#fff" : "var(--text-2)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cat === "all" ? "모든 분야" : cat}
          </button>
        ))}
      </div>

      {/* 자동화 카드 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "18px",
        }}
      >
        {filtered.map((item) => {
          const isActive = item.status === "active";
          return (
            <div
              key={item.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius)",
                padding: "22px",
                boxShadow: "var(--shadow)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: isActive ? 1 : 0.92,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "28px" }}>{item.icon}</span>
                    <div>
                      <span
                        style={{
                          fontSize: "var(--fs-2xs)",
                          color: isActive ? "var(--brand)" : "var(--text-3)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {item.category}
                      </span>
                      <h2
                        style={{
                          fontSize: "var(--fs-lg)",
                          fontWeight: 800,
                          color: "var(--text)",
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </h2>
                    </div>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "var(--fs-2xs)",
                      fontWeight: 700,
                      color: isActive ? "#00a676" : "#e68a00",
                      background: isActive
                        ? "rgba(0, 166, 118, 0.12)"
                        : "rgba(230, 138, 0, 0.12)",
                      padding: "3px 9px",
                      borderRadius: "999px",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isActive ? "#00a676" : "#e68a00",
                      }}
                    />
                    {item.statusText}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-2)",
                    lineHeight: 1.6,
                    marginTop: "8px",
                    marginBottom: "14px",
                  }}
                >
                  {item.description}
                </p>

                {/* 하이라이트 */}
                <div
                  style={{
                    background: "var(--surface-2)",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--fs-2xs)",
                      color: "var(--text-3)",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}
                  >
                    주요 특징 &amp; 점검 포인트
                  </div>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "16px",
                      fontSize: "var(--fs-xs)",
                      color: "var(--text)",
                      lineHeight: 1.6,
                    }}
                  >
                    {item.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>

                {/* 비활성 자동화일 때 재활성화 가이드 */}
                {!isActive && item.reactivation ? (
                  <div
                    style={{
                      background: "rgba(230, 138, 0, 0.08)",
                      border: "1px solid rgba(230, 138, 0, 0.25)",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#e68a00",
                        marginBottom: "4px",
                      }}
                    >
                      💡 다시 켜고 싶을 때 (재활성화 방법)
                    </div>
                    <div
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: "var(--text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.reactivation}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* 메타 데이터 풋터 */}
              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: "12px",
                  fontSize: "var(--fs-xs)",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-3)", display: "block", fontSize: "11px" }}>
                    ⏰ 실행 주기
                  </span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.schedule}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-3)", display: "block", fontSize: "11px" }}>
                    🔔 알림 / 채널
                  </span>
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.channel}</span>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--text-3)", display: "block", fontSize: "11px" }}>
                    ⚙️ 실행 엔진
                  </span>
                  <span style={{ color: "var(--text-2)", fontFamily: "monospace" }}>
                    {item.engine}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 하단 안내 배너 */}
      <div
        style={{
          marginTop: "36px",
          padding: "18px 22px",
          background: "var(--surface)",
          border: "1px dashed var(--line)",
          borderRadius: "var(--radius)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>🔒</span>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
            <b>비공개 관리자 전용 페이지입니다.</b> 로그인한 계정에서만 접근할 수 있으며,
            외부 방문자에게는 노출되지 않습니다.
          </div>
        </div>
        <Link
          href="/tools"
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: 700,
            color: "var(--brand)",
            textDecoration: "none",
          }}
        >
          ← SaaS 도구함으로 돌아가기
        </Link>
      </div>
    </>
  );
}
