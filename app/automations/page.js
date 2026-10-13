"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./automations.css";

function formatRelativeTime(dateStr) {
  if (!dateStr || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 60) return "방금 전";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;
  return `${Math.floor(diffSec / 86400)}일 전`;
}

// 7대 연관 파이프라인 그룹 정의 (Grouped Pipeline View)
const GROUP_DEFINITIONS = [
  {
    id: "pixie-youtube",
    title: "유튜브 요약 파이프라인 · 개인 웹사이트(Active) vs 텔레그램(비활성)",
    shortTitle: "유튜브 요약",
    icon: "🎬",
    flow: "[웹사이트 표시용: garmgoon.com Cloudflare Worker (정상 가동)] / [텔레그램 발송용: Pixie n8n 3종 + Windows 로컬 요약 워커 (모두 비활성화됨)]",
    description: "개인 웹사이트(garmgoon.com/youtube) 표시용 요약 파이프라인은 정상 가동 중이며, 텔레그램으로 발송하던 Pixie 연동 작업 4종은 모두 비활성화되었습니다.",
  },
  {
    id: "pixie-obsidian",
    title: "Pixie · 옵시디언 웹 클리퍼 & 세컨드 브레인 위키 파이프라인 (전체 비활성)",
    shortTitle: "Pixie 옵시디언",
    icon: "📓",
    flow: "[1단계: 로컬 클리퍼 워커(비활성)] → [2단계: 1분 완료 알림(비활성)] + [5초 진행률 폴링(비활성)] + [3시간 위키 인제스트(비활성)]",
    warning: null,
    description: "옵시디언 관련 로컬 Windows 워커 2종 및 Pixie VPS n8n 폴링 워크플로 2종(총 4개)이 모두 안전하게 비활성화되었습니다.",
  },
  {
    id: "pixie-alerts-infra",
    title: "Pixie · 일일 레이더 · 스토어 알림 & R2 백업 인프라",
    shortTitle: "Pixie 레이더 & 인프라",
    icon: "🛡️",
    flow: "[Orca 스케줄러 / VPS systemd 타이머] → [Pixie VPS n8n 웹훅 수신] → [Telegram 알림 발송 / Cloudflare R2 백업]",
    description: "매일 아침 GitHub 인기 트렌드 선별, Church Store 입고 감시, PostgreSQL 암호화 오프사이트 R2 백업 및 지연 감시 체계입니다.",
  },
  {
    id: "everydaytutor",
    title: "EverydayTutor · 대만 과외 크롤링 · 페이스북 운영 · 온보딩",
    shortTitle: "EverydayTutor 과외",
    icon: "🎓",
    flow: "[크롤링: Windows FB 디스패처 + VPS 1111/ChickPT n8n + 헬스체크] → [운영: 하루 6회 FB AI 심사 + 1일 2회 배포] → [온보딩: 맞춤 메일 발송]",
    description: "대만 과외 플랫폼 구인구직 데이터 수집, 페이스북 그룹 자동 심사/배포 및 신규 튜터 온보딩까지 전 과정을 자동화합니다.",
  },
  {
    id: "seo-open-seo",
    title: "SEO Hub & OpenSEO · 검색 최적화 & 순위 추적",
    shortTitle: "SEO Hub & OpenSEO",
    icon: "📈",
    flow: "[주간 GSC/GA4 분석(Orca+Pixie)] + [5분 주기 순위 추적(Cloudflare Workflows)] + [격주 로컬/맵스 순위 템플릿] + [온디맨드 사이트 크롤러]",
    description: "5대 운영 웹사이트의 구글 검색 콘솔 분석, 키워드 랭킹 추적, 로컬 맵스 순위 및 사이트 테크니컬 오디트를 담당합니다.",
  },
  {
    id: "utahsays-social",
    title: "Utah Says & 멀티 SNS 마케팅 자동화",
    shortTitle: "Utah Says & SNS",
    icon: "🏔️",
    flow: "[10분 주기 D1 랭킹/트렌딩 산출(Cloudflare Worker Cron)] → [1시간 주기 SNS 로컬 마케팅 드래프트 준비(Windows)] → [멀티 SNS 소셜 퍼블리셔(CLI)]",
    description: "Utah Says 실시간 여론조사 랭킹 산출부터 인스타그램/페이스북/X/레딧 4대 SNS 마케팅 드래프트 자동 준비까지 연결된 파이프라인입니다.",
  },
  {
    id: "garmgoon-hermes",
    title: "Garmgoon 피드 & Hermes 디바이스 동기화",
    shortTitle: "Garmgoon & Hermes",
    icon: "⚙️",
    flow: "[10분 주기 Reddit RSS 수집 + AI 채점 + 웹 푸시(Cloudflare Workers)] + [5분 주기 Windows ↔ GitHub / Mac mini Git 스킬 동기화]",
    description: "garmgoon.com 개인 도메인의 백그라운드 피드 큐레이션과 Windows/Mac mini 디바이스 간의 양방향 Git/스킬 동기화 자동화입니다.",
  },
];

// 실행 위치(Surface) 필터 정의
const SURFACE_FILTERS = [
  { key: "all", label: "전체 실행 위치 (All Surfaces)", match: () => true },
  { key: "windows", label: "Windows 작업 스케줄러", match: (s) => s.includes("Windows") },
  { key: "pixie-n8n", label: "Pixie VPS · n8n", match: (s) => s.includes("n8n") },
  { key: "orca", label: "Orca Scheduler", match: (s) => s.includes("Orca") },
  { key: "cloudflare", label: "Cloudflare Workers / Workflows", match: (s) => s.includes("Cloudflare") || s.includes("OpenSEO") },
  { key: "systemd", label: "Pixie VPS · systemd", match: (s) => s.includes("systemd") },
  { key: "cli-template", label: "CLI / 템플릿 / 온디맨드", match: (s) => s.includes("CLI") || s.includes("템플릿") || s.includes("온디맨드") },
];

// 2026-10-13 기준 실제 감사된 전체 자동화 목록 (총 30개 항목, 7개 연관 파이프라인 그룹)
const AUTOMATIONS = [
  // =========================================================================
  // [그룹 1] pixie-youtube — 🎬 유튜브 요약 파이프라인 (개인 웹사이트 표시용 Active / 텔레그램 연동 4종 비활성)
  // =========================================================================
  {
    id: "garmgoon-youtube-web",
    groupId: "pixie-youtube",
    title: "garmgoon.com 개인 웹사이트 유튜브 요약 파이프라인",
    category: "콘텐츠 & 미디어",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동 (웹사이트 표시)",
    lastSuccess: true,
    lastRunText: "크론 파이프라인 정상",
    lastRunAt: "10분 주기 크론 (채널 3시간 주기)",
    lastRunDetail: "구독 채널 신규 영상 RSS 확인 후 자막/메타데이터 기반 AI 요약 카드 생성 및 garmgoon.com/youtube 게시",
    surface: "Cloudflare Workers",
    targetId: "garmgoon.com/youtube (worker/youtube.js · pipeline.js)",
    pipelineStep: "웹사이트 표시 (Active)",
    schedule: "채널 확인 3시간 주기 · 요약 10분 크론",
    engine: "Cloudflare Worker + Hub/Android 자막 + LLM",
    channel: "garmgoon.com/youtube (Cloudflare D1)",
    domains: ["garmgoon.com", "youtube.com"],
    description: "개인 도메인(garmgoon.com/youtube)에 표시되는 유튜브 요약 파이프라인입니다. 텔레그램 연동 없이 웹사이트 D1 데이터베이스에 직접 한줄평·3줄 요약·핵심 포인트를 저장합니다.",
    highlights: [
      "텔레그램 발송 없이 garmgoon.com/youtube 탭에 직접 카드 형태로 게시",
      "3시간 주기로 등록 채널의 새 영상을 감지하고 10분 주기 크론에서 순차 요약",
      "자막(Android/Hub) 우선 추출 후 자막 부재 시 설명란/제목 기반 안전 요약",
    ],
    reactivation: null,
  },
  {
    id: "pixie-telegram-menu",
    groupId: "pixie-youtube",
    title: "Pixie 텔레그램 자동화 콘솔 & 자막 라우터",
    category: "개인 생산성",
    icon: "🤖",
    status: "inactive",
    statusText: "비활성 (텔레그램 연동 중지)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (n8n Unpublished)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 Pixie VPS n8n에서 워크플로 비활성화(unpublish) 완료",
    surface: "Pixie VPS · n8n",
    targetId: "p8CV6lZ3OmGBCz0D (Pixie - Telegram Automation Menu)",
    pipelineStep: "텔레그램 라우터 (비활성)",
    schedule: "비활성화됨 (Telegram Webhook 중지)",
    engine: "Pixie (n8n + FastAPI runner-api)",
    channel: "Telegram (@garmgoon_pixie_bot)",
    domains: ["pixie.garmgoon.com", "youtube.com"],
    description: "텔레그램 /menu 콘솔 및 유튜브 URL 자막 추출, 채널 구독(/channel), 웹 클리핑(/clip) 요청을 라우팅하던 워크플로입니다. 현재 비활성화되어 있습니다.",
    highlights: [
      "Pixie VPS n8n에서 unpublish 완료 (active = false)",
      "개인 웹사이트(garmgoon.com/youtube) 요약 파이프라인에는 영향 없음",
    ],
    reactivation: "Pixie VPS에서 docker compose exec -T n8n n8n publish:workflow --id=p8CV6lZ3OmGBCz0D 실행 후 n8n 재시작",
  },
  {
    id: "youtube-channel-monitor",
    groupId: "pixie-youtube",
    title: "유튜브 구독 채널 신규 영상 탐색 (텔레그램 요약용 Discovery)",
    category: "기술 & 트렌드",
    icon: "📺",
    status: "inactive",
    statusText: "비활성 (텔레그램 연동 중지)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (n8n Unpublished)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 Pixie VPS n8n에서 6시간 주기 채널 탐색 워크플로 비활성화 완료",
    surface: "Pixie VPS · n8n",
    targetId: "ny0w9UpMpl8MLLhp (Pixie - YouTube Channel Discovery)",
    pipelineStep: "1단계 · 채널 탐색 (비활성)",
    schedule: "비활성화됨 (기존 6시간 주기)",
    engine: "Pixie (n8n + runner-api RSS/채널 파서)",
    channel: "PostgreSQL 요약 대기열 (platform)",
    domains: ["youtube.com", "pixie.garmgoon.com"],
    description: "텔레그램 요약 발송을 위해 구독 채널의 신규 영상을 6시간마다 탐색하던 Pixie n8n 워크플로입니다. 현재 비활성화되어 있습니다.",
    highlights: [
      "Pixie VPS n8n에서 unpublish 완료 (active = false)",
      "웹사이트 표시용 유튜브 요약(garmgoon-youtube-web)은 별도로 정상 가동 중",
    ],
    reactivation: "Pixie VPS에서 docker compose exec -T n8n n8n publish:workflow --id=ny0w9UpMpl8MLLhp 실행 후 n8n 재시작",
  },
  {
    id: "pixie-youtube-summary-worker",
    groupId: "pixie-youtube",
    title: "유튜브 영상 로컬 AI 요약 워커 (텔레그램 요약용)",
    category: "개인 생산성",
    icon: "🧠",
    status: "inactive",
    statusText: "비활성 (Disabled)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (Windows 스케줄러 중지)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 Windows 작업 스케줄러에서 중지(Stop) 및 비활성화(Disabled) 완료",
    surface: "Windows 작업 스케줄러",
    targetId: "Pixie YouTube Video Summary Worker",
    pipelineStep: "2단계 · 로컬 LLM 요약 (비활성)",
    schedule: "비활성화됨 (기존 15초 주기 폴링)",
    engine: "Windows Local Worker + Ollama (qwen3:14b)",
    channel: "Pixie PostgreSQL (요약본 저장 · 원문 삭제)",
    domains: ["Windows PC (Local)", "pixie.garmgoon.com"],
    description: "텔레그램 발송용 유튜브 요약 대기열을 폴링하여 로컬 Ollama(qwen3:14b)로 요약하던 Windows 백그라운드 워커입니다. 현재 비활성화되어 로컬 GPU/CPU 리소스를 사용하지 않습니다.",
    highlights: [
      "Windows 작업 스케줄러 State = Disabled 및 백그라운드 Python 프로세스 종료 완료",
      "로컬 PC의 불필요한 15초 주기 폴링 및 Ollama 리소스 점유 해제",
    ],
    reactivation: "PowerShell에서 Enable-ScheduledTask -TaskName 'Pixie YouTube Video Summary Worker'; Start-ScheduledTask 실행",
  },
  {
    id: "pixie-youtube-summary-delivery",
    groupId: "pixie-youtube",
    title: "유튜브 영상 요약 텔레그램 전송 (Delivery)",
    category: "콘텐츠 & 미디어",
    icon: "📤",
    status: "inactive",
    statusText: "비활성 (텔레그램 연동 중지)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (n8n Unpublished)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 Pixie VPS n8n에서 1분 주기 텔레그램 전송 워크플로 비활성화 완료",
    surface: "Pixie VPS · n8n",
    targetId: "Uqp9sKRVyWranIz3 (Pixie - YouTube Summary Delivery)",
    pipelineStep: "3단계 · 텔레그램 발송 (비활성)",
    schedule: "비활성화됨 (기존 매 1분 주기 폴링)",
    engine: "Pixie (n8n MarkdownV2 Delivery)",
    channel: "Telegram (한국어 영상 요약 브리핑)",
    domains: ["pixie.garmgoon.com", "Telegram"],
    description: "완료된 유튜브 영상 요약을 1분마다 폴링하여 텔레그램으로 전송하던 워크플로입니다. 현재 비활성화되어 있습니다.",
    highlights: [
      "Pixie VPS n8n에서 unpublish 완료 (active = false)",
      "1분 주기 텔레그램 발송 폴링 완전 중지",
    ],
    reactivation: "Pixie VPS에서 docker compose exec -T n8n n8n publish:workflow --id=Uqp9sKRVyWranIz3 실행 후 n8n 재시작",
  },

  // =========================================================================
  // [그룹 2] pixie-obsidian — 📓 Pixie · 옵시디언 웹 클리퍼 & 세컨드 브레인 위키 파이프라인 (전체 비활성)
  // =========================================================================
  {
    id: "pixie-obsidian-capture-worker",
    groupId: "pixie-obsidian",
    title: "옵시디언 웹 클리퍼 로컬 워커 (Capture Worker)",
    category: "개인 생산성",
    icon: "📎",
    status: "inactive",
    statusText: "비활성 (Disabled)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (Windows 스케줄러 중지)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "Windows 작업 스케줄러에서 비활성화(Disabled) 완료",
    surface: "Windows 작업 스케줄러",
    targetId: "Pixie Obsidian Capture Worker",
    pipelineStep: "1단계 · 로컬 클리핑 워커 (비활성)",
    schedule: "비활성화됨 (로그온 시 상시)",
    engine: "Windows Local Worker + Ollama (qwen3:14b)",
    channel: "Obsidian Vault + Pixie runner-api",
    domains: ["Windows PC (Local)", "Obsidian Vault"],
    description: "텔레그램으로 요청된 웹 페이지 본문을 추출하고 로컬 LLM(qwen3:14b)으로 요약해 로컬 Obsidian 보관함에 저장하는 워커입니다. 현재 비활성화(Disabled)되어 있습니다.",
    highlights: [
      "Windows 작업 스케줄러에서 비활성화(Disabled) 상태 확인 완료",
      "로컬 Obsidian Vault 클리핑 워커 대기 중",
    ],
    reactivation: "Windows 작업 스케줄러에서 'Pixie Obsidian Capture Worker' 작업을 사용(Enable)으로 변경",
  },
  {
    id: "pixie-obsidian-capture-delivery",
    groupId: "pixie-obsidian",
    title: "옵시디언 캡처 완료 알림 전송 (Capture Delivery)",
    category: "개인 생산성",
    icon: "📨",
    status: "inactive",
    statusText: "비활성 (n8n Unpublished)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (n8n Unpublished)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 Pixie VPS n8n에서 1분 주기 캡처 알림 폴링 워크플로 비활성화 완료",
    surface: "Pixie VPS · n8n",
    targetId: "5cywia6fChzL2850 (Pixie - Obsidian Capture Delivery)",
    pipelineStep: "2단계 · 완료 알림 폴링 (비활성)",
    schedule: "비활성화됨 (기존 매 1분 주기 폴링)",
    engine: "Pixie (n8n Delivery Polling)",
    channel: "Telegram (클리핑 완료/실패 알림)",
    domains: ["pixie.garmgoon.com", "Telegram"],
    description: "완료된 옵시디언 웹 클리핑 작업을 1분마다 폴링하여 텔레그램으로 결과를 알리던 워크플로입니다. 현재 비활성화되어 있습니다.",
    highlights: [
      "Pixie VPS n8n에서 unpublish 완료 (active = false)",
      "불필요한 1분 주기 완료 알림 폴링 중지",
    ],
    reactivation: "Pixie VPS에서 docker compose exec -T n8n n8n publish:workflow --id=5cywia6fChzL2850 실행 후 n8n 재시작",
  },
  {
    id: "pixie-obsidian-capture-progress",
    groupId: "pixie-obsidian",
    title: "옵시디언 캡처 실시간 진행률 폴링 (Capture Progress)",
    category: "개인 생산성",
    icon: "⏱️",
    status: "inactive",
    statusText: "비활성 (n8n Unpublished)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (5초 폴링 중지 완료)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "2026-10-13 요청에 따라 5초마다 실행되던 진행률 폴링 워크플로를 Pixie VPS n8n에서 비활성화 완료",
    surface: "Pixie VPS · n8n",
    targetId: "kzbJcpswznHukHa7 (Pixie - Capture Progress (inactive))",
    pipelineStep: "진행률 5초 폴링 (비활성)",
    schedule: "비활성화됨 (기존 매 5초 주기 폴링)",
    engine: "Pixie (n8n 5s Progress Updater)",
    channel: "Telegram (진행 상태 메시지 수정)",
    domains: ["pixie.garmgoon.com", "Telegram"],
    description: "이름에 '(inactive)'가 적혀 있었으나 실제로는 5초마다 실행 중이던 옵시디언 캡처 진행률 폴링 워크플로입니다. 현재 안전하게 비활성화(active = false)되었습니다.",
    highlights: [
      "Pixie VPS n8n에서 unpublish 및 컨테이너 재시작으로 5초 폴링 루프 완전 중지",
      "VPS CPU 및 PostgreSQL 쿼리 부하 절감",
    ],
    reactivation: "Pixie VPS에서 docker compose exec -T n8n n8n publish:workflow --id=kzbJcpswznHukHa7 실행 후 n8n 재시작",
  },
  {
    id: "pixie-obsidian-wiki-worker",
    groupId: "pixie-obsidian",
    title: "Obsidian 세컨드 브레인 위키 인제스트 워커 (Wiki Worker)",
    category: "개인 생산성",
    icon: "📓",
    status: "inactive",
    statusText: "비활성 (Disabled)",
    lastSuccess: null,
    lastRunText: "비활성화됨 (Windows 스케줄러 중지)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "Windows 작업 스케줄러에서 비활성화(Disabled) 상태 확인 완료",
    surface: "Windows 작업 스케줄러",
    targetId: "Pixie Obsidian Wiki Worker",
    pipelineStep: "3시간 주기 위키 인제스트 (비활성)",
    schedule: "비활성화됨 (기존 3시간 주기 + 로그온 시)",
    engine: "Windows Local Worker + Ollama (wiki_worker)",
    channel: "Obsidian Vault (Sources / Index / Archive)",
    domains: ["Windows PC (Local)", "Obsidian Vault"],
    description: "Obsidian 인박스 노트를 3시간마다 읽어 로컬 LLM JSON 스키마 검증을 거쳐 세컨드 브레인 위키 문서로 구조화하고 원본을 아카이빙하는 워커입니다. 현재 비활성화되어 있습니다.",
    highlights: [
      "Windows 작업 스케줄러에서 비활성화(Disabled) 상태 확인 완료",
      "로컬 Ollama JSON Schema 기반 위키 인제스트 대기 중",
    ],
    reactivation: "Windows 작업 스케줄러에서 'Pixie Obsidian Wiki Worker' 작업을 사용(Enable)으로 변경",
  },

  // =========================================================================
  // [그룹 3] pixie-alerts-infra — 🛡️ Pixie · 일일 레이더 · 스토어 알림 & R2 백업 인프라
  // =========================================================================
  {
    id: "church-store",
    groupId: "pixie-alerts-infra",
    title: "Church Store 제품 재고 알림 (Orca + n8n)",
    category: "일상 & 커머스",
    icon: "🛒",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "스케줄 가동 중",
    lastRunAt: "매일 09:00 AM",
    lastRunDetail: "Orca 스케줄러가 매일 09:00 AM 점검 후 입고 시 Pixie n8n 웹훅으로 알림",
    surface: "Orca Scheduler + Pixie n8n",
    targetId: "Orca: c2a82538-6f72-46aa-a37c-94452341f58b / n8n: nsOdjMUiNtJmQtCD",
    pipelineStep: "매일 09:00 점검 → 웹훅 알림",
    schedule: "매일 아침 09:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity) + Pixie n8n Webhook",
    channel: "Telegram (입고 시에만 알림)",
    domains: ["store.churchofjesuschrist.org", "pixie.garmgoon.com"],
    description: "Orca 스케줄러가 매일 아침 9시에 Orem 매장 픽업 및 배송 재고를 점검하고, 입고 시 Pixie n8n 웹훅(Pixie - Church Store Stock Alert)을 통해 텔레그램 알림을 보냅니다.",
    highlights: [
      "배송(Ship-to-me) & Orem 매장 픽업 동시 감시",
      "입고 시에만 알림 (스팸 방지)",
      "Orca 네이티브 스케줄러 → Pixie n8n 웹훅 분산 아키텍처",
    ],
    reactivation: null,
  },
  {
    id: "github-radar",
    groupId: "pixie-alerts-infra",
    title: "Daily GitHub 프로젝트 레이더 (Orca + n8n)",
    category: "기술 & 트렌드",
    icon: "🚀",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "스케줄 가동 중",
    lastRunAt: "매일 08:00 AM",
    lastRunDetail: "Orca 스케줄러가 매일 08:00 AM 인기 저장소 선별 후 Pixie n8n 웹훅 브리핑 발송",
    surface: "Orca Scheduler + Pixie n8n",
    targetId: "Orca: 30fe98bb-13fa-48d0-8647-31b0812d9790 / n8n: vpS7wnfHPRJw47RV",
    pipelineStep: "매일 08:00 탐색 → 웹훅 브리핑",
    schedule: "매일 아침 08:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity) + Pixie n8n Webhook",
    channel: "Telegram (일일 오픈소스 브리핑)",
    domains: ["github.com", "pixie.garmgoon.com"],
    description: "Orca 스케줄러가 매일 아침 8시에 AI 에이전트·LLMOps·MCP 급상승 GitHub 저장소를 선별하고 Pixie n8n 웹훅(Pixie - GitHub Project Radar)으로 텔레그램 브리핑을 발송합니다.",
    highlights: [
      "AI 에이전트, LLMOps, MCP 서비스 급상승 오픈소스 10선 선별",
      "중복 알림 억제 상태 관리 및 일일 텔레그램 브리핑",
      "Orca 네이티브 스케줄러와 n8n 웹훅 브리지 연동",
    ],
    reactivation: null,
  },
  {
    id: "db-backup",
    groupId: "pixie-alerts-infra",
    title: "PostgreSQL 암호화 백업 & 감시 타이머 (R2 + n8n)",
    category: "인프라 & 보안",
    icon: "🛡️",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "실시간 감시 정상",
    lastRunAt: "03:15 백업 · 4시간 감시",
    lastRunDetail: "Ubuntu systemd 타이머 + restic 암호화 R2 백업 및 4시간 주기 감시 정상",
    surface: "Pixie VPS · systemd + n8n",
    targetId: "systemd: pixie-backup.timer, pixie-backup-watchdog.timer / n8n: sHMZylDExq1yBqjw",
    pipelineStep: "03:15 백업 + 4시간 감시",
    schedule: "매일 03:15 AM 백업 · 4시간 주기 감시",
    engine: "Ubuntu systemd timer + restic + Pixie n8n",
    channel: "Cloudflare R2 + Telegram (장애 알림)",
    domains: ["pixie.garmgoon.com", "Cloudflare R2"],
    description: "매일 새벽 PostgreSQL 및 n8n 설정을 암호화하여 Cloudflare R2에 백업(pixie-backup.timer)하고, 4시간마다 백업 지연을 감시(pixie-backup-watchdog.timer)하여 이상 시 n8n(Pixie - Database Backup Events)으로 즉시 알림을 보냅니다.",
    highlights: [
      "Restic 기반 AES-256 종단간 암호화 Cloudflare R2 오프사이트 백업",
      "4시간 주기 watchdog timer로 백업 신선도 실시간 검증",
      "백업 실패 또는 지연 발생 시 n8n 웹훅을 통한 텔레그램 비상 경보",
    ],
    reactivation: null,
  },
  {
    id: "email-digest",
    groupId: "pixie-alerts-infra",
    title: "Gmail 아침 이메일 다이제스트 (워커 + n8n)",
    category: "개인 생산성",
    icon: "📬",
    status: "inactive",
    statusText: "비활성 (보류 중)",
    lastSuccess: null,
    lastRunText: "실행 대기 (비활성)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "Gmail 읽기 전용 범위 메일 요약 파이프라인 (n8n 워크플로 및 Windows 로컬 워커 모두 비활성)",
    surface: "Pixie VPS · n8n + Windows 스케줄러",
    targetId: "n8n: IkjFtL8r1UjyrGdLfuZrY / Windows: Pixie Email Digest Worker",
    pipelineStep: "보류 (비활성 템플릿)",
    schedule: "매일 아침 08:00 AM (비활성)",
    engine: "Pixie (n8n gmail.readonly + 로컬 Ollama 워커)",
    channel: "Telegram (한국어 요약 다이제스트)",
    domains: ["gmail.com", "pixie.garmgoon.com"],
    description: "Gmail 읽기 전용(gmail.readonly) 범위로 최근 수신함 메일을 요약하는 파이프라인입니다. 현재 n8n 워크플로와 Windows 로컬 워커 모두 안전을 위해 비활성화되어 있습니다.",
    highlights: [
      "안전한 gmail.readonly 스코프 제한",
      "로컬 Ollama LLM을 통한 민감 이메일 프라이버시 보호 요약",
      "현재 n8n 워크플로 및 로컬 작업 스케줄러 안전 비활성화 상태",
    ],
    reactivation: "Google OAuth 승인 확인 후 Pixie n8n 및 Windows 작업 스케줄러에서 활성화 토글",
  },
  {
    id: "product-scout",
    groupId: "pixie-alerts-infra",
    title: "데일리 프로덕트 스카우트",
    category: "기술 & 트렌드",
    icon: "🔍",
    status: "inactive",
    statusText: "비활성 (템플릿)",
    lastSuccess: null,
    lastRunText: "실행 대기 (비활성)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "신규 디지털 제품 및 마이크로 SaaS 출시 소식 수집 n8n 워크플로 템플릿",
    surface: "Pixie VPS · n8n",
    targetId: "6Sqhk07juPllItQ3 (Pixie - Daily Product Scout)",
    pipelineStep: "비활성 템플릿",
    schedule: "매일 아침 08:00 AM (비활성)",
    engine: "Pixie (n8n + runner-api)",
    channel: "Telegram (신규 SaaS 브리핑)",
    domains: ["Product Hunt / IndieHackers", "pixie.garmgoon.com"],
    description: "신규 디지털 제품 및 마이크로 SaaS 출시 소식을 수집·요약하는 n8n 워크플로 템플릿입니다.",
    highlights: [
      "신규 프로덕트 론칭 데이터 스카우트 워크플로",
      "수익화 모델 및 차별점 자동 추출 요약 템플릿",
      "필요 시 Pixie n8n에서 활성화 가능",
    ],
    reactivation: "Pixie n8n 화면에서 product-scout 워크플로우 활성화",
  },

  // =========================================================================
  // [그룹 4] everydaytutor — 🎓 EverydayTutor · 대만 과외 크롤링 · 페이스북 운영 · 온보딩
  // =========================================================================
  {
    id: "everydaytutor-crawler-dispatcher",
    groupId: "everydaytutor",
    title: "EverydayTutor Facebook 과외 그룹 크롤러 디스패처",
    category: "크롤링 & 데이터",
    icon: "🕷️",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "스케줄 가동 중",
    lastRunAt: "매일 20:05 PM",
    lastRunDetail: "대만 과외 페이스북 그룹 구인구직 게시글 수집 및 Supabase DB 적재 예약 작업",
    surface: "Windows 작업 스케줄러",
    targetId: "EverydayTutor-Facebook-Dispatcher",
    pipelineStep: "FB 그룹 크롤링 디스패처",
    schedule: "매일 20:05 PM (유타) / 10:05 AM (대만)",
    engine: "Node.js Crawler Dispatcher (Windows 작업 스케줄러)",
    channel: "Supabase DB + Telegram 알림",
    domains: ["facebook.com", "everydaytutor.net"],
    description: "대만 과외 페이스북 그룹 구인·구직 게시글을 수집·정규화하여 Supabase DB에 적재하는 로컬 예약 작업입니다.",
    highlights: [
      "페이스북 그룹 과외 구인/구직 게시글 파싱 및 중복 필터링",
      "표준 데이터 스키마 자동 정규화 및 Supabase DB 적재",
      "수집 결과 및 오류 텔레그램 실시간 알림",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-1111-crawl",
    groupId: "everydaytutor",
    title: "EverydayTutor 1111 채용공고 시간별 크롤러",
    category: "크롤링 & 데이터",
    icon: "📋",
    status: "active",
    statusText: "정상 가동 (1시간 주기)",
    lastSuccess: true,
    lastRunText: "1시간 주기 가동 중",
    lastRunAt: "매 1시간 주기",
    lastRunDetail: "대만 1111 과외/교육 공고 1시간 주기 자동 수집 워크플로 정상",
    surface: "Pixie VPS · n8n",
    targetId: "EDT1111Hourly01 (EverydayTutor 1111 Hourly Crawl)",
    pipelineStep: "1111.com.tw 크롤링",
    schedule: "매 1시간 주기",
    engine: "Pixie VPS (n8n Scheduled Workflow)",
    channel: "EverydayTutor DB 적재",
    domains: ["1111.com.tw", "everydaytutor.net"],
    description: "대만 1111 구인구직 사이트의 과외·교육 공고를 1시간마다 자동 수집하는 VPS n8n 워크플로입니다.",
    highlights: [
      "대만 1111 인력은행 과외/튜터 공고 실시간 모니터링",
      "1시간 주기 자동 인제스트 및 중복 방지 적재",
      "Pixie VPS n8n 클라우드 독립 워크플로 가동",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-chickpt-crawl",
    groupId: "everydaytutor",
    title: "EverydayTutor ChickPT 채용공고 4시간 크롤러",
    category: "크롤링 & 데이터",
    icon: "🐥",
    status: "active",
    statusText: "정상 가동 (4시간 주기)",
    lastSuccess: true,
    lastRunText: "4시간 주기 가동 중",
    lastRunAt: "매 4시간 주기",
    lastRunDetail: "대만 ChickPT 단기 과외/교육 공고 4시간 주기 자동 수집 워크플로 정상",
    surface: "Pixie VPS · n8n",
    targetId: "EDTChickPT4Hourly01 (EverydayTutor ChickPT 4-Hour Crawl)",
    pipelineStep: "ChickPT 크롤링",
    schedule: "매 4시간 주기",
    engine: "Pixie VPS (n8n Scheduled Workflow)",
    channel: "EverydayTutor DB 적재",
    domains: ["chickpt.com.tw", "everydaytutor.net"],
    description: "대만 ChickPT 플랫폼의 튜터·단기 교육 공고를 4시간마다 자동 수집하는 VPS n8n 워크플로입니다.",
    highlights: [
      "ChickPT 대학생/단기 튜터 구인 데이터 정기 수집",
      "4시간 주기 배치 크롤링 및 DB 정규화 적재",
      "EverydayTutor DB 자동 인제스트 연동",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-crawl-health",
    groupId: "everydaytutor",
    title: "EverydayTutor 크롤러 상태 모니터 (Health Monitor)",
    category: "인프라 & 보안",
    icon: "🩺",
    status: "active",
    statusText: "정상 가동 (15분 주기)",
    lastSuccess: true,
    lastRunText: "15분 주기 감시 중",
    lastRunAt: "매 15분 주기",
    lastRunDetail: "크롤링 파이프라인 수집 상태 및 오류 15분마다 감시 정상",
    surface: "Pixie VPS · n8n",
    targetId: "EDTCrawlHealth15m01 (EverydayTutor Crawl Health Monitor)",
    pipelineStep: "크롤러 헬스체크",
    schedule: "매 15분 주기",
    engine: "Pixie VPS (n8n Health Monitor)",
    channel: "Telegram 장애 알림",
    domains: ["everydaytutor.net", "pixie.garmgoon.com"],
    description: "EverydayTutor 크롤링 파이프라인의 수집 상태와 오류 여부를 15분마다 감시하는 VPS n8n 워크플로입니다.",
    highlights: [
      "15분 주기 수집 대기열 지연 및 크롤러 오류 자동 감지",
      "파이프라인 비정상 중단 시 텔레그램 긴급 알림",
      "지속적인 데이터 신선도 보증 헬스체크",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-facebook-distribution",
    groupId: "everydaytutor",
    title: "EverydayTutor Facebook 콘텐츠 자동 배포 스케줄러",
    category: "SNS & 마케팅",
    icon: "📣",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "스케줄 가동 중",
    lastRunAt: "매일 2회 (06:05, 18:05)",
    lastRunDetail: "승인된 과외 매칭 콘텐츠 대만 현지 피크 시간대 페이스북 그룹 자동 배포",
    surface: "Windows 작업 스케줄러",
    targetId: "EverydayTutor-Facebook-Distribution",
    pipelineStep: "FB 그룹 콘텐츠 배포",
    schedule: "매일 2회 · 06:05, 18:05 (유타) / 08:05, 20:05 (대만)",
    engine: "EverydayTutor Distribution Runner (Windows 작업 스케줄러)",
    channel: "Facebook Groups + 로컬 로그",
    domains: ["facebook.com", "everydaytutor.net"],
    description: "승인된 과외 매칭 콘텐츠를 대만 현지 피크 시간대(1일 2회)에 맞춰 페이스북 그룹에 자동 배포합니다.",
    highlights: [
      "승인 대기열 기반 과외 매칭 콘텐츠 자동 포스팅",
      "대만 현지 피크 시간대 1일 2회 정기 자동 분배",
      "실행 로그 (.data/distribution.log) 로컬 자동 기록",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-facebook-moderation",
    groupId: "everydaytutor",
    title: "EverydayTutor Facebook 그룹 AI 승인 관리 (Moderation)",
    category: "SNS & 커뮤니티",
    icon: "👥",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "스케줄 가동 중",
    lastRunAt: "하루 6회 (4시간 주기)",
    lastRunDetail: "대만/한국 과외 페이스북 그룹 가입 질문 및 게시글 하루 6회 AI 자동 심사",
    surface: "Windows 작업 스케줄러",
    targetId: "EverydayTutor-Facebook-Moderation",
    pipelineStep: "FB 가입/게시글 AI 심사",
    schedule: "하루 6회 · 03, 07, 11, 15, 19, 23시 (유타)",
    engine: "Playwright + OpenAI GPT (Windows 작업 스케줄러)",
    channel: "Facebook Group + Telegram 보고",
    domains: ["facebook.com", "everydaytutor.net"],
    description: "대만/한국 과외 페이스북 그룹의 가입 질문과 게시글을 하루 6회(4시간 주기) AI로 심사하여 스팸을 차단하고 자동 승인/거절합니다.",
    highlights: [
      "Playwright + OpenAI GPT 기반 가입 질문 심사 및 스팸 차단",
      "APPROVE / DECLINE 자동 집행 및 거절 사유 피드백 자동 전송",
      "심사 내역 텔레그램 실시간 알림 및 로컬 로그 추적",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-onboarding-emails",
    groupId: "everydaytutor",
    title: "EverydayTutor 신규 튜터 맞춤 온보딩 이메일 발송기",
    category: "CRM & 온보딩",
    icon: "✉️",
    status: "active",
    statusText: "러너 준비 완료 (온디맨드)",
    lastSuccess: true,
    lastRunText: "러너 준비 완료",
    lastRunAt: "온디맨드",
    lastRunDetail: "신규 튜터 적재 시 다국어 맞춤 호칭 및 UTM 링크 온보딩 메일 발송 러너",
    surface: "Node.js CLI (온디맨드)",
    targetId: "send-onboarding-emails.js",
    pipelineStep: "온보딩 이메일 발송",
    schedule: "온디맨드 (신규 튜터 적재 시)",
    engine: "Node.js + Resend API",
    channel: "Resend 이메일 + 로컬 로그",
    domains: ["everydaytutor.net"],
    description: "수집·정제된 신규 튜터에게 다국어 호칭 및 UTM 링크가 포함된 온보딩 안내 메일을 발송합니다.",
    highlights: [
      "다국어 호칭(한국어/대만 번체/일본어/영어) 및 맞춤 UTM 링크 생성",
      "Resend API 연동 및 발송 결과 실시간 로깅",
      "Dry-run 모드 지원으로 안전한 사전 검증 가능",
    ],
    reactivation: null,
  },

  // =========================================================================
  // [그룹 5] seo-open-seo — 📈 SEO Hub & OpenSEO · 검색 최적화 & 순위 추적
  // =========================================================================
  {
    id: "seo-hub",
    groupId: "seo-open-seo",
    title: "SEO Hub 주간 리마인더 & 분석 (Orca + Pixie)",
    category: "비즈니스 SEO",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "주간 스케줄 가동 중",
    lastRunAt: "매주 월요일 09:00 AM",
    lastRunDetail: "5대 운영 사이트 GSC/GA4 지표 자동 분석 및 텔레그램 주간 브리핑",
    surface: "Orca Scheduler + Pixie 웹훅",
    targetId: "Orca: cda1bdd8-3886-4ceb-a67f-3e16d11f1740",
    pipelineStep: "주간 GSC/GA4 리포트",
    schedule: "매주 월요일 09:00 AM (유타)",
    engine: "Orca Native Scheduler (antigravity)",
    channel: "Telegram (Pixie 봇) + reports/",
    domains: ["everydaytutor.net", "pwstudio.kr", "utahsays.com", "garmgoon.com", "new.ecocarpetutah.com"],
    description: "관리 중인 5대 웹사이트의 GSC/GA4 지표를 매주 월요일 아침 분석하여 1페이지 진입 유력 키워드와 액션 가이드를 브리핑합니다.",
    highlights: [
      "관리 중인 5대 비즈니스 도메인 GSC/GA4 통합 분석",
      "10~25위권 1페이지 진입 유력 타깃 키워드 리라이팅 가이드 도출",
      "독립 중앙 관제소(SEO_Hub) 연계 주간 보고서 발행",
    ],
    reactivation: null,
  },
  {
    id: "seo-hub-local-maps-tracker",
    groupId: "seo-open-seo",
    title: "SEO Hub 로컬 & Google Maps 순위 추적기",
    category: "비즈니스 SEO",
    icon: "📍",
    status: "active",
    statusText: "정상 가동 (격주 스케줄)",
    lastSuccess: true,
    lastRunText: "격주 스케줄 가동 중",
    lastRunAt: "매월 1일 · 15일 09:30 AM",
    lastRunDetail: "Pixie VPS n8n (2EoofwxwXv6mf2QK)에서 매월 1일·15일 격주 스케줄 및 웹훅 활성 가동 중",
    surface: "Pixie VPS · n8n",
    targetId: "2EoofwxwXv6mf2QK (Pixie - SEO Hub Local & Google Maps Rank Tracker)",
    pipelineStep: "격주 로컬/맵스 순위 점검",
    schedule: "매월 1일 · 15일 09:30 AM (예정)",
    engine: "Pixie n8n + SEO Hub",
    channel: "Telegram (로컬 SEO 리포트)",
    domains: ["new.ecocarpetutah.com", "utahsays.com", "everydaytutor.net"],
    description: "유타 로컬 비즈니스 및 주요 서비스의 지역 검색(Local Pack)과 Google Maps 노출 순위를 격주로 점검하는 워크플로 템플릿입니다.",
    highlights: [
      "Google Local 3-Pack 및 Maps 검색 노출 순위 트래킹",
      "지역 비즈니스(EcoCarpet Utah 등) 격주 순위 변동 감지",
      "SEO Hub 리포트 연계 n8n 워크플로 템플릿 준비 완료",
    ],
    reactivation: "Pixie n8n에서 seo-hub-local-maps-rank-tracker.json 등록 후 활성화",
  },
  {
    id: "openseo-rank-audit-engine",
    groupId: "seo-open-seo",
    title: "OpenSEO 순위 추적 & 테크니컬 감사 크롤러",
    category: "비즈니스 SEO",
    icon: "🔍",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "5분 주기 가동 중",
    lastRunAt: "5분 주기 & 03:17",
    lastRunDetail: "Cloudflare Workflows(RankCheckWorkflow) 5분 주기 순위 추적 및 테크니컬 SEO 진단 정상",
    surface: "Cloudflare Workflows",
    targetId: "seo.garmgoon.com (RankCheckWorkflow)",
    pipelineStep: "5분 주기 순위 추적",
    schedule: "매 5분 주기 & 매일 새벽 03:17",
    engine: "Cloudflare Workflows + Durable Objects",
    channel: "OpenSEO Dashboard + SQLite",
    domains: ["seo.garmgoon.com", "everydaytutor.net", "utahsays.com", "pwstudio.kr"],
    description: "Cloudflare Workflows를 통해 등록된 비즈니스 사이트의 키워드 검색 순위를 자동 추적하고 테크니컬 SEO 상태를 진단합니다.",
    highlights: [
      "5분 주기 키워드 순위 추적 워크플로우 (RankCheckWorkflow)",
      "Durable Objects 기반 분산 사이트 크롤링 및 테크니컬 진단",
      "세션 KV 가비지 컬렉션 및 SQLite 스크래치패드 적재",
    ],
    reactivation: null,
  },
  {
    id: "site-audit-crawler",
    groupId: "seo-open-seo",
    title: "OpenSEO 정기 전체 사이트 테크니컬 크롤러",
    category: "비즈니스 SEO",
    icon: "🕷️",
    status: "inactive",
    statusText: "비활성 (수동 요청 전용)",
    lastSuccess: null,
    lastRunText: "수동 실행 전용",
    lastRunAt: "수동 요청 시",
    lastRunDetail: "사이트 전체 페이지 404 깨진 링크, 중복 메타 태그, 색인 차단 전수 검사 크롤러",
    surface: "OpenSEO Worker",
    targetId: "seo.garmgoon.com (Site Audit)",
    pipelineStep: "온디맨드 전체 크롤링",
    schedule: "수동 실행 (정기 스케줄 대기)",
    engine: "OpenSEO Worker",
    channel: "OpenSEO 대시보드 + Webhook",
    domains: ["5개 비즈니스 웹사이트 전체"],
    description: "사이트 전체 페이지의 404 깨진 링크, 중복 메타 태그, 색인 차단 오류를 전수 검사하는 크롤러입니다.",
    highlights: [
      "전체 페이지 404/500 상태 코드 및 캐노니컬 전수 검사",
      "중복 메타 태그 및 robots/noindex 색인 차단 오류 탐지",
      "OpenSEO 콘솔 온디맨드 실행 지원, 정기 스케줄 대기",
    ],
    reactivation: "https://seo.garmgoon.com 콘솔에서 정기 Site Audit 크롤링 스케줄 활성화",
  },

  // =========================================================================
  // [그룹 6] utahsays-social — 🏔️ Utah Says & 멀티 SNS 마케팅 자동화
  // =========================================================================
  {
    id: "utahsays-marketing-runner",
    groupId: "utahsays-social",
    title: "Utah Says 로컬 마케팅 콘텐츠/드래프트 준비",
    category: "SNS & 마케팅",
    icon: "🏔️",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "1시간 주기 가동 중",
    lastRunAt: "매 1시간 주기",
    lastRunDetail: "투표 트렌드 기반 Instagram/Facebook/X/Reddit 4대 채널 드래프트 자동 준비 정상",
    surface: "Windows 작업 스케줄러",
    targetId: "Utah Says - local content preparation",
    pipelineStep: "1시간 주기 로컬 드래프트",
    schedule: "매 1시간 주기 (PT1H)",
    engine: "WhatsBestInUtah Marketing Runner (Windows 작업 스케줄러)",
    channel: "로컬 드래프트 (.data/marketing) + 리포트",
    domains: ["utahsays.com", "Instagram", "Facebook", "X", "Reddit"],
    description: "Utah Says 실시간 투표 트렌드를 바탕으로 4대 SNS 채널용 마케팅 초안과 디렉터 리포트를 1시간마다 로컬에서 준비합니다.",
    highlights: [
      "4대 SNS(Instagram, Facebook, X, Reddit) 맞춤 포스트 자동 생성",
      "투표 트렌드 기반 콘텐츠 큐레이션 및 점수 알고리즘 연동",
      "Windows 작업 스케줄러(Utah Says - local content preparation) 상시 가동",
    ],
    reactivation: null,
  },
  {
    id: "utahsays-worker-cron",
    groupId: "utahsays-social",
    title: "Utah Says 실시간 랭킹 & 트렌딩 산출 엔진",
    category: "데이터 & 랭킹",
    icon: "📊",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "10분 주기 가동 중",
    lastRunAt: "매 10분 주기",
    lastRunDetail: "투표 시간 감쇄(Half-life) 반영 실시간 랭킹 및 설문 생애주기 산출 D1 저장 정상",
    surface: "Cloudflare Workers",
    targetId: "utahsays.com (/api/cron/refresh)",
    pipelineStep: "10분 주기 랭킹 산출",
    schedule: "매 10분 주기",
    engine: "Cloudflare Worker Cron",
    channel: "Cloudflare D1 Database",
    domains: ["utahsays.com"],
    description: "투표 데이터의 시간 감쇄(Half-life)를 반영해 실시간 트렌딩 점수와 설문 생애주기를 10분마다 재산출합니다.",
    highlights: [
      "투표 반감기(Half-life 30일) 기반 점수 감쇄 및 실시간 트렌딩 산출",
      "설문 생애주기(new/rising/archived) 자동 갱신 및 10분 주기 스냅샷",
      "Cloudflare D1 Database 기반 서버리스 크론 파이프라인",
    ],
    reactivation: null,
  },
  {
    id: "social-publisher",
    groupId: "utahsays-social",
    title: "멀티 SNS 원스톱 소셜 퍼블리셔",
    category: "SNS & 마케팅",
    icon: "📢",
    status: "inactive",
    statusText: "비활성 (CLI 대기)",
    lastSuccess: null,
    lastRunText: "CLI 대기 (비활성)",
    lastRunAt: "비활성화됨",
    lastRunDetail: "Facebook, Instagram, Threads, X 동시 크로스 포스팅 엔진 (CLI 토큰 재발급 대기)",
    surface: "Automation Hub CLI",
    targetId: "D:\\Dev\\Automations (SOCIAL_PUBLISHING_ENABLED)",
    pipelineStep: "크로스 포스팅 엔진",
    schedule: "예약 발행 시 실행 (비활성)",
    engine: "Automation Hub (Python CLI)",
    channel: "Meta Graph API + X API",
    domains: ["Facebook", "Instagram", "Threads", "X"],
    description: "페이스북, 인스타그램, 스레드, X에 동시 크로스 포스팅하는 자동 발행 엔진입니다.",
    highlights: [
      "실수 방지를 위한 Dry-run 우선 정책",
      "플랫폼별 이미지 규격 및 텍스트 자동 정규화",
      "CLI 기반 배치 및 스케줄러 등록 지원",
    ],
    reactivation: "D:\\Dev\\Automations\\.env에서 SOCIAL_PUBLISHING_ENABLED=true 설정 후 CLI 실행",
  },

  // =========================================================================
  // [그룹 7] garmgoon-hermes — ⚙️ Garmgoon 피드 & Hermes 디바이스 동기화
  // =========================================================================
  {
    id: "garmgoon-feed-pipeline",
    groupId: "garmgoon-hermes",
    title: "Garmgoon Reddit 트렌드 피드 수집 & 백그라운드 파이프라인",
    category: "콘텐츠 & 인프라",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "10분 주기 가동 중",
    lastRunAt: "매 10분 주기",
    lastRunDetail: "Reddit RSS 아이디어 수집, DeepSeek AI 채점 피드 카드 생성 및 웹 푸시 정상",
    surface: "Cloudflare Workers",
    targetId: "garmgoon.com (Scheduled Handler)",
    pipelineStep: "10분 주기 피드/정리",
    schedule: "매 10분 주기",
    engine: "Cloudflare Worker Scheduled Handler",
    channel: "Cloudflare D1 / R2 + Web Push",
    domains: ["garmgoon.com", "Reddit"],
    description: "Reddit RSS 아이디어 수집 및 AI 채점 카드 생성, 가족 임시 파일 정리, 웹 푸시 다이제스트 발송을 수행합니다.",
    highlights: [
      "Reddit RSS 자동 수집 및 AI 품질/취향 점수 산정 피드 카드 생성",
      "R2 버킷 임시 가족 첨부 파일 자동 정리 (cleanupFamilyFiles)",
      "웹 푸시 다이제스트 자동 발송 파이프라인 (sendDigests)",
    ],
    reactivation: null,
  },
  {
    id: "hermes-git-sync",
    groupId: "garmgoon-hermes",
    title: "Hermes Git 저장소 동기화 (HermesGitSync)",
    category: "디바이스 동기화",
    icon: "🔄",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "5분 주기 가동 중",
    lastRunAt: "매 5분 주기",
    lastRunDetail: "Hermes 작업 저장소 변경사항 5분마다 GitHub 자동 동기화 정상",
    surface: "Windows 작업 스케줄러",
    targetId: "HermesGitSync",
    pipelineStep: "5분 주기 Git Sync",
    schedule: "매 5분 주기 (PT5M)",
    engine: "Windows 작업 스케줄러 (Git)",
    channel: "GitHub 저장소",
    domains: ["Windows PC ↔ GitHub"],
    description: "Hermes 작업 저장소의 변경사항을 5분마다 자동으로 동기화하는 로컬 예약 작업입니다.",
    highlights: [
      "Windows 작업 스케줄러(PT5M) 기반 무인 백그라운드 Git 동기화",
      "변경사항 자동 감지 커밋 및 GitHub 원격 저장소 동기화",
      "실행 실패 시 윈도우 이벤트 로그 기록",
    ],
    reactivation: null,
  },
  {
    id: "hermes-skills-sync",
    groupId: "garmgoon-hermes",
    title: "Hermes Hub 스킬 동기화 (HermesHubSkillsSync)",
    category: "디바이스 동기화",
    icon: "🔄",
    status: "active",
    statusText: "정상 가동 (Ready)",
    lastSuccess: true,
    lastRunText: "5분 주기 가동 중",
    lastRunAt: "매 5분 주기",
    lastRunDetail: "커밋된 Hermes Hub 스킬 파일 Windows ↔ Mac mini 양방향 동기화 정상",
    surface: "Windows 작업 스케줄러",
    targetId: "HermesHubSkillsSync",
    pipelineStep: "5분 주기 Skills Sync",
    schedule: "매 5분 주기 (PT5M)",
    engine: "Windows 작업 스케줄러 (Git)",
    channel: "비공개 GitHub 저장소",
    domains: ["Windows PC ↔ Mac mini"],
    description: "커밋된 Hermes Hub 스킬 변경사항을 5분마다 안전하게 풀/푸시하여 디바이스 간 동일한 스킬 상태를 유지합니다.",
    highlights: [
      "Windows PC와 Mac mini 간의 양방향 스킬 파일 자동 풀/푸시",
      "비공개 GitHub 저장소 기반 무인 백그라운드 Git sync",
      "디바이스 간 상시 동일한 AI 스킬 런타임 환경 유지",
    ],
    reactivation: null,
  },
];

const CHANNEL_ICONS = [
  [/telegram/i, "✈️"],
  [/obsidian/i, "📓"],
  [/push/i, "🔔"],
  [/resend|이메일|email/i, "✉️"],
  [/webhook/i, "🔗"],
  [/dashboard|대시보드/i, "📊"],
  [/supabase|d1|sqlite|database|postgresql/i, "🗄️"],
  [/github/i, "📦"],
  [/facebook|meta|instagram|threads|x api/i, "📣"],
  [/report|리포트|드래프트|로그/i, "📁"],
];

function splitParen(text) {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(text || "");
  return m ? { main: m[1], note: m[2] } : { main: text || "", note: "" };
}

function parseChannels(channel) {
  return channel.split(/\s+\+\s+/).map((part) => {
    const { main, note } = splitParen(part);
    const icon = CHANNEL_ICONS.find(([re]) => re.test(part))?.[1] || "📤";
    return { label: main, note, icon };
  });
}

function formatDuration(ms) {
  const n = Number(ms);
  if (!n || n <= 0) return null;
  if (n < 1000) return `${Math.round(n)}ms`;
  if (n < 60000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n / 60000)}m`;
}

function formatClock(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

// 정적 데이터와 실시간 D1 하트비트를 합성 (엄격한 No-Mock 정책 준수)
function getRunState(item, hb) {
  const hasHb = Boolean(hb);
  const isActive = item.status === "active";
  const isRunning = hasHb && hb.status === "running";
  const isFailure = hasHb && hb.status === "failure";
  const isSuccess = hasHb ? hb.status === "success" : item.lastSuccess === true;
  const tone = isFailure ? "bad" : isRunning ? "run" : isActive ? "ok" : "warn";
  const statusText = isRunning ? "실행 중..." : isFailure ? "실행 실패" : item.statusText;
  const runText = isRunning
    ? "현재 실행 중"
    : isFailure
    ? "최근 실행 실패"
    : hasHb
    ? "실시간 실행 성공"
    : item.lastRunText || item.statusText;
  const clock = hasHb ? formatClock(hb.last_run_at) : null;
  const relative = hasHb ? formatRelativeTime(hb.last_run_at) : null;
  const runAt = hasHb
    ? relative
    : item.lastRunAt && item.lastRunAt !== "—"
    ? item.lastRunAt
    : "—";
  const runAtFull = hasHb ? `${relative}${clock ? ` (${clock})` : ""}` : item.lastRunAt || "—";
  const runDetail = hasHb ? hb.message || item.lastRunDetail : item.lastRunDetail;
  const runTone = isFailure ? "bad" : isRunning ? "run" : isSuccess ? "ok" : "idle";
  const runIcon = isFailure ? "✕" : isRunning ? "◌" : isSuccess ? "✓" : "—";
  return {
    hasHb,
    isActive,
    isRunning,
    isFailure,
    isSuccess,
    tone,
    statusText,
    runText,
    runAt,
    runAtFull,
    clock,
    runDetail,
    runTone,
    runIcon,
    duration: hasHb ? formatDuration(hb.duration_ms) : null,
  };
}

const Svg = ({ children, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const IconRefresh = () => (
  <Svg>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Svg>
);
const IconSearch = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);
const IconLayers = () => (
  <Svg>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </Svg>
);
const IconRows = () => (
  <Svg>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </Svg>
);
const IconGrid = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
);
const IconClock = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
const IconCpu = () => (
  <Svg>
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <path d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
  </Svg>
);
const IconChevron = ({ dir = "down" }) => (
  <Svg>
    {dir === "down" && <path d="m6 9 6 6 6-6" />}
    {dir === "left" && <path d="m15 6-6 6 6 6" />}
    {dir === "right" && <path d="m9 6 6 6-6 6" />}
  </Svg>
);

function StatusPills({ run }) {
  return (
    <div className="axStatusTop">
      <span className="axPill" data-tone={run.tone}>
        <span className="axDot" data-pulse={run.isRunning ? "true" : "false"} />
        {run.statusText}
      </span>
      {run.hasHb && (
        <span className="axLive" title="D1 실시간 하트비트 연동됨">
          <span className="axDot" data-pulse="true" />
          LIVE
        </span>
      )}
    </div>
  );
}

function RunLine({ run }) {
  return (
    <div className="axRunLine" title={`${run.runText} · ${run.runAtFull}`}>
      <b data-tone={run.runTone}>{run.runIcon}</b>
      <span className="axRunAt">
        {run.hasHb ? (
          <>
            {run.runAt}
            {run.clock && <span style={{ color: "var(--text-3)" }}> · {run.clock}</span>}
          </>
        ) : (
          <span>{run.runText}</span>
        )}
      </span>
      {run.duration && <span className="axMs">{run.duration}</span>}
    </div>
  );
}

function ScheduleMeta({ item }) {
  const sched = splitParen(item.schedule);
  const engine = splitParen(item.engine);
  return (
    <div className="axStack">
      <div className="axMeta" data-strong="true" title={item.schedule}>
        <IconClock />
        <span>
          {sched.main}
          {sched.note && <span style={{ color: "var(--text-3)", fontWeight: 500 }}> · {sched.note}</span>}
        </span>
      </div>
      <div className="axMeta" data-mono="true" title={item.engine}>
        <IconCpu />
        <span>
          {engine.main}
          {engine.note && <span style={{ color: "var(--text-3)" }}> · {engine.note}</span>}
        </span>
      </div>
    </div>
  );
}

function ChannelBadges({ item, withNote = true }) {
  const channels = parseChannels(item.channel);
  const notes = channels.map((c) => c.note).filter(Boolean).join(" · ");
  return (
    <div title={item.channel}>
      <div className="axChannels">
        {channels.map((c) => (
          <span key={c.label} className="axChannel">
            <span className="axChannelIcon" aria-hidden="true">
              {c.icon}
            </span>
            <span>{c.label}</span>
          </span>
        ))}
      </div>
      {withNote && notes && <div className="axNote">{notes}</div>}
    </div>
  );
}

function DomainTags({ domains, max = 3 }) {
  const shown = domains.slice(0, max);
  const rest = domains.length - shown.length;
  return (
    <div className="axDomains">
      {shown.map((d) => (
        <span key={d} className="axTag" data-kind="domain">
          {d}
        </span>
      ))}
      {rest > 0 && (
        <span className="axTag" data-kind="more" title={domains.slice(max).join(", ")}>
          +{rest}
        </span>
      )}
    </div>
  );
}

function RunCallout({ run }) {
  if (!run.runDetail) return null;
  const title = run.isFailure
    ? "✕ 실행 오류 보고"
    : run.isRunning
    ? "◌ 현재 실행 중"
    : run.isSuccess
    ? "✓ 최근 실행 내역"
    : "⏸ 현재 상태";
  return (
    <div className="axCallout" data-tone={run.isFailure ? "bad" : run.isRunning ? "run" : run.isSuccess ? "ok" : "warn"}>
      <b>
        {title}
        {run.runAtFull && run.runAtFull !== "—" ? ` · ${run.runAtFull}` : ""}
        {run.duration ? ` · ${run.duration}` : ""}
      </b>
      {run.runDetail}
    </div>
  );
}

function ReactivationCallout({ item, run }) {
  if (run.isActive || !item.reactivation) return null;
  return (
    <div className="axCallout" data-tone="warn">
      <b>💡 재활성화 방법</b>
      <span>{item.reactivation}</span>
    </div>
  );
}

function Highlights({ items, className }) {
  return (
    <ul className={className}>
      {items.map((h, i) => (
        <li key={i}>{h}</li>
      ))}
    </ul>
  );
}

export default function AutomationsPage() {
  // 기본 뷰 모드는 'grouped' (파이프라인 묶음 보기)
  const [viewMode, setViewMode] = useState("grouped"); // 'grouped' | 'compact' | 'cards'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [surfaceFilter, setSurfaceFilter] = useState("all"); // 'all' | surface key
  const [groupFilter, setGroupFilter] = useState("all"); // 'all' | group id
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [liveHeartbeats, setLiveHeartbeats] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const chipsRef = useRef(null);
  const [chipFade, setChipFade] = useState({ l: false, r: false });

  const fetchLiveStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/automations/status");
      if (res.ok) {
        const data = await res.json();
        if (data?.heartbeats) {
          setLiveHeartbeats(data.heartbeats);
          setLastSyncTime(new Date());
        }
      }
    } catch (err) {
      console.warn("Could not fetch real-time heartbeats:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  const updateChipFade = () => {
    const el = chipsRef.current;
    if (!el) return;
    const l = el.scrollLeft > 4;
    const r = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setChipFade((prev) => (prev.l === l && prev.r === r ? prev : { l, r }));
  };

  useEffect(() => {
    updateChipFade();
    window.addEventListener("resize", updateChipFade);
    return () => window.removeEventListener("resize", updateChipFade);
  }, []);

  const scrollChips = (dir) => {
    const el = chipsRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
  };

  // 필터링 적용
  const filtered = AUTOMATIONS.filter((item) => {
    const hb = liveHeartbeats[item.id];
    const matchStatus = statusFilter === "all" ? true : item.status === statusFilter;
    const matchGroup = groupFilter === "all" ? true : item.groupId === groupFilter;
    const surfaceObj = SURFACE_FILTERS.find((s) => s.key === surfaceFilter);
    const matchSurface = surfaceObj ? surfaceObj.match(item.surface) : true;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.surface.toLowerCase().includes(q) ||
      item.targetId.toLowerCase().includes(q) ||
      item.pipelineStep.toLowerCase().includes(q) ||
      item.engine.toLowerCase().includes(q) ||
      item.channel.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.domains.some((d) => d.toLowerCase().includes(q)) ||
      (item.lastRunText || "").toLowerCase().includes(q) ||
      (hb?.message || "").toLowerCase().includes(q);
    return matchStatus && matchGroup && matchSurface && matchSearch;
  });

  // 그룹화 데이터
  const groupedData = GROUP_DEFINITIONS.map((group) => {
    const items = filtered.filter((item) => item.groupId === group.id);
    const totalGroupItems = AUTOMATIONS.filter((item) => item.groupId === group.id);
    return {
      ...group,
      items,
      totalCount: totalGroupItems.length,
      activeCount: totalGroupItems.filter((i) => i.status === "active").length,
    };
  }).filter((group) => group.items.length > 0);

  const activeCount = AUTOMATIONS.filter((a) => a.status === "active").length;
  const inactiveCount = AUTOMATIONS.filter((a) => a.status === "inactive").length;
  const liveFailures = Object.values(liveHeartbeats).filter((h) => h.status === "failure").length;
  const liveCount = Object.keys(liveHeartbeats).length;
  const uptimePct = Math.round((activeCount / AUTOMATIONS.length) * 100);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setSurfaceFilter("all");
    setGroupFilter("all");
    setSearchQuery("");
  };

  const isFiltered =
    statusFilter !== "all" ||
    surfaceFilter !== "all" ||
    groupFilter !== "all" ||
    Boolean(searchQuery.trim());

  const statusTabs = [
    { key: "all", label: "전체", count: AUTOMATIONS.length, tone: "all" },
    { key: "active", label: "정상 가동", count: activeCount, tone: "ok" },
    { key: "inactive", label: "대기", count: inactiveCount, tone: "warn" },
  ];

  const groupChips = [
    { id: "all", label: "전체 그룹", count: AUTOMATIONS.length },
    ...GROUP_DEFINITIONS.map((g) => ({
      id: g.id,
      label: `${g.icon} ${g.shortTitle}`,
      count: AUTOMATIONS.filter((a) => a.groupId === g.id).length,
    })),
  ];

  return (
    <div className="ax">
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚡ OPERATIONS &amp; AUTOMATION HUB</div>
          <h1 className="pageTitle">도메인 자동화 실시간 현황판</h1>
          <p className="pageDesc">
            전체 <b>{AUTOMATIONS.length}개 자동화 파이프라인</b> (7대 연관 그룹)의 실시간 하트비트, 실행 위치, 스케줄을 한눈에 모니터링합니다.
          </p>
        </div>
      </div>

      {/* 요약 메트릭 */}
      <div className="axMetrics">
        <div className="axMetric" data-tone="brand">
          <div className="axMetricLabel">총 파이프라인</div>
          <div className="axMetricValue">
            {AUTOMATIONS.length}
            <small>개</small>
          </div>
          <div className="axBar" aria-hidden="true">
            <span style={{ width: `${uptimePct}%` }} />
            <span style={{ width: `${100 - uptimePct}%` }} />
          </div>
          <div className="axMetricSub">
            가동 {activeCount} · 대기 {inactiveCount} (7개 그룹)
          </div>
        </div>

        <div className="axMetric" data-tone="ok">
          <div className="axMetricLabel">정상 가동</div>
          <div className="axMetricValue" data-tone="ok">
            {activeCount}
            <small>개</small>
          </div>
          <div className="axMetricSub">전체의 {uptimePct}% 활성 가동 중</div>
        </div>

        <div className="axMetric" data-tone="warn">
          <div className="axMetricLabel">대기 / 보류</div>
          <div className="axMetricValue" data-tone="warn">
            {inactiveCount}
            <small>개</small>
          </div>
          <div className="axMetricSub">재활성화 절차 및 템플릿 준비</div>
        </div>

        <div className="axMetric" data-tone={liveFailures > 0 ? "bad" : "ok"}>
          <div className="axMetricLabel">
            실시간 헬스체크
            {lastSyncTime && (
              <span className="axLive">
                <span className="axDot" data-pulse="true" />
                LIVE
              </span>
            )}
          </div>
          <div className="axMetricValue" data-tone={liveFailures > 0 ? "bad" : "ok"}>
            {liveFailures > 0 ? (
              <>
                {liveFailures}
                <small>건 실패</small>
              </>
            ) : (
              <>
                정상<small>{liveCount ? `${liveCount}개 수신` : ""}</small>
              </>
            )}
          </div>
          <div className="axMetricSub">
            {lastSyncTime
              ? `${lastSyncTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} 동기화 · 25초 주기`
              : "하트비트 연결 대기 중"}
          </div>
        </div>
      </div>

      {/* 툴바: 상태 필터, 실행 위치(Surface) 필터, 새로고침, 검색, 보기 모드 */}
      <div className="axToolbar">
        <div className="axToolGroup">
          <div className="axSeg" role="group" aria-label="상태 필터">
            {statusTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className="axSegBtn"
                aria-pressed={statusFilter === t.key}
                onClick={() => setStatusFilter(t.key)}
              >
                {t.label}
                <span className="axCount" data-tone={t.tone}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* 실행 위치(Surface) 필터 */}
          <div className="axSelectWrap" title="실행 위치(Surface) 필터">
            <IconCpu />
            <select
              className="axSelect"
              value={surfaceFilter}
              onChange={(e) => setSurfaceFilter(e.target.value)}
              aria-label="실행 위치 필터"
            >
              {SURFACE_FILTERS.map((sf) => {
                const count =
                  sf.key === "all"
                    ? AUTOMATIONS.length
                    : AUTOMATIONS.filter((a) => sf.match(a.surface)).length;
                return (
                  <option key={sf.key} value={sf.key}>
                    {sf.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            className="axIconBtn"
            onClick={fetchLiveStatus}
            disabled={isRefreshing}
            data-busy={isRefreshing ? "true" : "false"}
            title="실시간 하트비트 동기화"
          >
            <IconRefresh />
            {isRefreshing ? "갱신 중..." : "실시간 동기화"}
          </button>
        </div>

        <div className="axToolGroup">
          <label className="axSearch">
            <IconSearch />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="자동화 · 서버 · ID 검색..."
              aria-label="자동화 검색"
            />
            {searchQuery && (
              <button
                type="button"
                className="axSearchClear"
                onClick={() => setSearchQuery("")}
                aria-label="검색어 지우기"
              >
                ✕
              </button>
            )}
          </label>

          {/* 보기 모드 (기본: 묶음 보기) */}
          <div className="axSeg" role="group" aria-label="보기 방식">
            <button
              type="button"
              className="axSegBtn"
              aria-pressed={viewMode === "grouped"}
              onClick={() => setViewMode("grouped")}
              title="연관 파이프라인별 묶음 보기 (기본 뷰)"
            >
              <IconLayers />
              묶음 보기
            </button>
            <button
              type="button"
              className="axSegBtn"
              aria-pressed={viewMode === "compact"}
              onClick={() => setViewMode("compact")}
              title="한 화면에 많이 볼 수 있는 컴팩트 목록형"
            >
              <IconRows />
              한눈에 보기
            </button>
            <button
              type="button"
              className="axSegBtn"
              aria-pressed={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
              title="상세 카드형 보기"
            >
              <IconGrid />
              카드형
            </button>
          </div>
        </div>
      </div>

      {/* 파이프라인 그룹 칩 필터 */}
      <div className="axChipsWrap">
        {chipFade.l && (
          <button type="button" className="axChipsArrow" data-side="l" onClick={() => scrollChips(-1)} aria-label="이전 그룹">
            <IconChevron dir="left" />
          </button>
        )}
        <div
          ref={chipsRef}
          className="axChips"
          data-fade-l={chipFade.l ? "true" : "false"}
          data-fade-r={chipFade.r ? "true" : "false"}
          onScroll={updateChipFade}
        >
          {groupChips.map((g) => (
            <button
              key={g.id}
              type="button"
              className="axChip"
              aria-pressed={groupFilter === g.id}
              onClick={() => setGroupFilter(g.id)}
            >
              {g.label}
              <span className="axChipN">{g.count}</span>
            </button>
          ))}
        </div>
        {chipFade.r && (
          <button type="button" className="axChipsArrow" data-side="r" onClick={() => scrollChips(1)} aria-label="다음 그룹">
            <IconChevron dir="right" />
          </button>
        )}
      </div>

      {/* 필터 활성 상태 알림 및 초기화 버튼 */}
      {isFiltered && (
        <div className="axFilterStatusRow">
          <span>
            현재 조건에 맞는 자동화 <b>{filtered.length}개</b> 표시 중
          </span>
          <button type="button" className="axResetBtn" onClick={resetFilters}>
            필터 전체 초기화
          </button>
        </div>
      )}

      {/* 빈 검색 결과 */}
      {filtered.length === 0 && (
        <div className="axTable">
          <div className="axEmpty">
            <div>🔎</div>
            조건에 맞는 자동화가 없습니다.
            <br />
            <button type="button" className="axIconBtn" onClick={resetFilters}>
              필터 초기화
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* [1] 프로젝트/파이프라인 묶음 보기 (Grouped View) - DEFAULT */}
      {/* ======================================================== */}
      {viewMode === "grouped" && filtered.length > 0 && (
        <div className="axGroupedList">
          {groupedData.map((group) => {
            const isGroupCollapsed = collapsedGroups[group.id];
            return (
              <section
                key={group.id}
                className="axGroupCard"
                data-tone={group.activeCount === group.totalCount ? "ok" : "warn"}
              >
                {/* 그룹 헤더 */}
                <div
                  className="axGroupHeader"
                  onClick={() => toggleGroupCollapse(group.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroupCollapse(group.id);
                    }
                  }}
                >
                  <div className="axGroupHeaderLeft">
                    <span className="axGroupIcon" aria-hidden="true">
                      {group.icon}
                    </span>
                    <div className="axGroupTitleWrap">
                      <div className="axGroupTitleRow">
                        <h2 className="axGroupTitle">{group.title}</h2>
                        <span
                          className="axGroupBadge"
                          data-tone={group.activeCount === group.totalCount ? "ok" : "warn"}
                        >
                          가동 {group.activeCount} / 전체 {group.totalCount}
                        </span>
                      </div>
                      <p className="axGroupDesc">{group.description}</p>
                      <div className="axGroupFlow">
                        <span className="axFlowLabel">연결 흐름</span>
                        <span className="axFlowText">{group.flow}</span>
                      </div>
                      {group.warning && (
                        <div className="axGroupWarning">
                          <span className="axWarningIcon" aria-hidden="true">
                            ⚠️
                          </span>
                          <span>{group.warning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="axChevron axGroupChevron"
                    aria-expanded={!isGroupCollapsed}
                    aria-label={isGroupCollapsed ? "그룹 펼치기" : "그룹 접기"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGroupCollapse(group.id);
                    }}
                  >
                    <IconChevron />
                  </button>
                </div>

                {/* 그룹 내부 항목들 (파이프라인 순서) */}
                {!isGroupCollapsed && (
                  <div className="axGroupBody">
                    {group.items.map((item) => {
                      const isExpanded = expandedId === item.id;
                      const run = getRunState(item, liveHeartbeats[item.id]);
                      const detailId = `ax-detail-grp-${item.id}`;

                      return (
                        <div
                          key={item.id}
                          className="axPipelineItem"
                          data-tone={run.tone}
                          data-open={isExpanded ? "true" : "false"}
                          data-inactive={run.isActive ? "false" : "true"}
                        >
                          {/* 상단 메타 바: 단계 배지 + 실행 위치 배지 + 식별자 코드 + 상태 필 */}
                          <div className="axPipelineItemMetaRow">
                            <span className="axStepBadge">{item.pipelineStep}</span>
                            <span className="axSurfaceBadge">
                              <IconCpu />
                              {item.surface}
                            </span>
                            <code className="axTargetIdCode" title={`작업 식별자: ${item.targetId}`}>
                              {item.targetId}
                            </code>
                            <div className="axPipelineStatusWrap">
                              <StatusPills run={run} />
                            </div>
                          </div>

                          {/* 본체 클릭 시 아코디언 토글 */}
                          <div className="axPipelineMainRow" onClick={() => toggleExpand(item.id)}>
                            <div className="axPipelineContent">
                              <div className="axPipe">
                                <span className="axIconTile" aria-hidden="true">
                                  {item.icon}
                                </span>
                                <div className="axPipeBody">
                                  <div className="axPipeTitle">
                                    <strong>{item.title}</strong>
                                    <span className="axTag" data-kind="cat">
                                      {item.category}
                                    </span>
                                  </div>
                                  <p className="axDesc">{item.description}</p>
                                  <DomainTags domains={item.domains} />
                                </div>
                              </div>
                            </div>

                            <div className="axPipelineRightMeta">
                              <ScheduleMeta item={item} />
                              <ChannelBadges item={item} withNote={false} />
                              <RunLine run={run} />
                            </div>

                            <div className="axPipelineChev">
                              <button
                                type="button"
                                className="axChevron"
                                aria-expanded={isExpanded}
                                aria-controls={detailId}
                                aria-label={isExpanded ? "상세 닫기" : "상세 보기"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(item.id);
                                }}
                              >
                                <IconChevron />
                              </button>
                            </div>
                          </div>

                          {/* 세부 패널 */}
                          <div
                            className="axCollapse"
                            data-open={isExpanded ? "true" : "false"}
                            id={detailId}
                            inert={!isExpanded}
                          >
                            <div>
                              <div className="axDetail">
                                <div className="axPanel">
                                  <h3 className="axPanelTitle">📌 상세 설명</h3>
                                  <p>{item.description}</p>
                                  <RunCallout run={run} />
                                  <ReactivationCallout item={item} run={run} />
                                </div>

                                <div className="axDetailSide">
                                  <div className="axPanel">
                                    <h3 className="axPanelTitle">🎯 점검 포인트 &amp; 주요 특징</h3>
                                    <Highlights items={item.highlights} />
                                  </div>
                                  <div className="axPanel">
                                    <h3 className="axPanelTitle">⚙️ 기술 구성 &amp; 실행 대상</h3>
                                    <dl className="axKv">
                                      <dt>파이프라인</dt>
                                      <dd>
                                        <span className="axStepBadge">{item.pipelineStep}</span>
                                      </dd>
                                      <dt>실행 위치</dt>
                                      <dd>
                                        <span className="axSurfaceBadge">{item.surface}</span>
                                      </dd>
                                      <dt>작업 식별자</dt>
                                      <dd>
                                        <code className="axTargetIdCode">{item.targetId}</code>
                                      </dd>
                                      <dt>실행 주기</dt>
                                      <dd>{item.schedule}</dd>
                                      <dt>엔진</dt>
                                      <dd className="mono">{item.engine}</dd>
                                      <dt>출력 채널</dt>
                                      <dd>{item.channel}</dd>
                                      <dt>연관 도메인</dt>
                                      <dd>
                                        <DomainTags domains={item.domains} max={item.domains.length} />
                                      </dd>
                                    </dl>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* [2] 컴팩트 목록형 뷰 (High-Density Table View) */}
      {/* ======================================================== */}
      {viewMode === "compact" && filtered.length > 0 && (
        <div className="axTable">
          <div className="axHead">
            <div>자동화 파이프라인 · {filtered.length}</div>
            <div>상태 · 최근 실행</div>
            <div>실행 주기 · 엔진</div>
            <div className="axColChannel">알림 · 출력처</div>
            <div />
          </div>

          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            const run = getRunState(item, liveHeartbeats[item.id]);
            const detailId = `ax-detail-comp-${item.id}`;

            return (
              <div
                key={item.id}
                className="axRow"
                data-tone={run.tone}
                data-open={isExpanded ? "true" : "false"}
                data-inactive={run.isActive ? "false" : "true"}
              >
                <div className="axRowMain" onClick={() => toggleExpand(item.id)}>
                  {/* 파이프라인: 아이콘 + 제목 + 단계 배지 + 실행 위치 + 설명 + 도메인 */}
                  <div className="axCell axColPipe">
                    <div className="axPipe">
                      <span className="axIconTile" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="axPipeBody">
                        <div className="axPipeTitle">
                          <strong>{item.title}</strong>
                          <span className="axTag axStepTag" title="파이프라인 단계">
                            {item.pipelineStep}
                          </span>
                          <span className="axTag axSurfaceTag" title="실행 위치">
                            {item.surface}
                          </span>
                          <span className="axTag" data-kind="cat">
                            {item.category}
                          </span>
                        </div>
                        <p className="axDesc">{item.description}</p>
                        <DomainTags domains={item.domains} />
                      </div>
                    </div>
                  </div>

                  {/* 상태 + 최근 실행 결과 */}
                  <div className="axCell axColStatus">
                    <div className="axStack axStatusCell">
                      <StatusPills run={run} />
                      <RunLine run={run} />
                    </div>
                  </div>

                  {/* 주기 & 엔진 */}
                  <div className="axCell axColSched">
                    <ScheduleMeta item={item} />
                  </div>

                  {/* 알림 / 채널 */}
                  <div className="axCell axColChannel">
                    <ChannelBadges item={item} />
                  </div>

                  {/* 펼치기 버튼 */}
                  <div className="axCell axColChev">
                    <button
                      type="button"
                      className="axChevron"
                      aria-expanded={isExpanded}
                      aria-controls={detailId}
                      aria-label={isExpanded ? "상세 닫기" : "상세 보기"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                    >
                      <IconChevron />
                    </button>
                  </div>
                </div>

                {/* 펼쳤을 때 나타나는 세부 정보 */}
                <div className="axCollapse" data-open={isExpanded ? "true" : "false"} id={detailId} inert={!isExpanded}>
                  <div>
                    <div className="axDetail">
                      <div className="axPanel">
                        <h3 className="axPanelTitle">📌 상세 설명</h3>
                        <p>{item.description}</p>
                        <RunCallout run={run} />
                        <ReactivationCallout item={item} run={run} />
                      </div>

                      <div className="axDetailSide">
                        <div className="axPanel">
                          <h3 className="axPanelTitle">🎯 점검 포인트 &amp; 주요 특징</h3>
                          <Highlights items={item.highlights} />
                        </div>
                        <div className="axPanel">
                          <h3 className="axPanelTitle">⚙️ 기술 구성 &amp; 실행 대상</h3>
                          <dl className="axKv">
                            <dt>파이프라인</dt>
                            <dd>
                              <span className="axStepBadge">{item.pipelineStep}</span>
                            </dd>
                            <dt>실행 위치</dt>
                            <dd>
                              <span className="axSurfaceBadge">{item.surface}</span>
                            </dd>
                            <dt>작업 식별자</dt>
                            <dd>
                              <code className="axTargetIdCode">{item.targetId}</code>
                            </dd>
                            <dt>주기</dt>
                            <dd>{item.schedule}</dd>
                            <dt>엔진</dt>
                            <dd className="mono">{item.engine}</dd>
                            <dt>출력처</dt>
                            <dd>{item.channel}</dd>
                            <dt>도메인</dt>
                            <dd>
                              <DomainTags domains={item.domains} max={item.domains.length} />
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* [3] 카드형 뷰 (Grid Cards View) */}
      {/* ======================================================== */}
      {viewMode === "cards" && filtered.length > 0 && (
        <div className="axGrid">
          {filtered.map((item) => {
            const run = getRunState(item, liveHeartbeats[item.id]);

            return (
              <article key={item.id} className="axCard" data-tone={run.tone}>
                <div className="axCardHead">
                  <span className="axIconTile" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div className="axCardStatus">
                    <StatusPills run={run} />
                  </div>
                </div>

                <div className="axCardStepRow">
                  <span className="axStepBadge">{item.pipelineStep}</span>
                  <span className="axSurfaceBadge">{item.surface}</span>
                </div>

                <h2 className="axCardTitle">{item.title}</h2>
                <div className="axCardCat">
                  <span className="axTag" data-kind="cat">
                    {item.category}
                  </span>
                  <code className="axTargetIdCode axCardTarget" title={item.targetId}>
                    {item.targetId}
                  </code>
                </div>

                <p className="axDesc">{item.description}</p>

                <div className="axCardRun">
                  <RunLine run={run} />
                  <span style={{ color: "var(--text-3)", whiteSpace: "nowrap" }}>{run.runText}</span>
                </div>

                <Highlights items={item.highlights} className="axCardHl" />

                <ReactivationCallout item={item} run={run} />

                <DomainTags domains={item.domains} />

                <div className="axCardSpacer" />

                <div className="axCardFoot">
                  <ScheduleMeta item={item} />
                  <ChannelBadges item={item} withNote={false} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 하단 안내 */}
      <div className="axFoot">
        <div>
          🔒 <b>비공개 관리자 전용 페이지입니다.</b> D1 데이터베이스와 실시간 하트비트로 연동되어 있습니다.
        </div>
        <Link href="/tools">← SaaS 도구함으로 돌아가기</Link>
      </div>
    </div>
  );
}
