"use client";

import Link from "next/link";
import { useState } from "react";

const AUTOMATIONS = [
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
  },
];

export default function AutomationsPage() {
  const [filter, setFilter] = useState("all");

  const categories = ["all", ...new Set(AUTOMATIONS.map((a) => a.category))];
  const filtered =
    filter === "all" ? AUTOMATIONS : AUTOMATIONS.filter((a) => a.category === filter);

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚡ OPERATIONS &amp; AUTOMATION HUB</div>
          <h1 className="pageTitle">도메인 자동화 통합 현황판</h1>
          <p className="pageDesc">
            내 도메인, 서버, PC에서 실제로 가동 중인 정기 자동화와 알림 상태를 한눈에 점검합니다.
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
            총 가동 중 자동화
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            6개
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
              100% 정상
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
            모바일 알림 채널
          </div>
          <div
            style={{
              fontSize: "22px",
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
            핵심 스케줄 엔진
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
            }}
          >
            Orca + Pixie
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
            모니터링 비즈니스 사이트
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
            }}
          >
            5개 도메인
          </div>
        </div>
      </div>

      {/* 카테고리 필터 탭 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            style={{
              padding: "7px 14px",
              borderRadius: "999px",
              fontSize: "var(--fs-xs)",
              fontWeight: filter === cat ? 700 : 500,
              border: "1px solid",
              borderColor: filter === cat ? "var(--brand)" : "var(--line)",
              background: filter === cat ? "var(--brand)" : "var(--surface)",
              color: filter === cat ? "#fff" : "var(--text-2)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {cat === "all" ? "전체 보기 (6)" : cat}
          </button>
        ))}
      </div>

      {/* 자동화 카드 리스트 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "18px",
        }}
      >
        {filtered.map((item) => (
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
                        color: "var(--brand)",
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
                    color: "#00a676",
                    background: "rgba(0, 166, 118, 0.12)",
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
                      background: "#00a676",
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
                  주요 점검 &amp; 동작
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
                  🔔 알림 / 산출물
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
        ))}
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
          <span style={{ fontSize: "24px" }}>💡</span>
          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)" }}>
            <b>읽기 전용 상태판입니다.</b> 별도 조작 없이도 스케줄에 따라 자동 실행되며, 중요한 알림은
            모두 <b>스마트폰 텔레그램</b>으로 수신됩니다.
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
