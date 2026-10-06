"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const AUTOMATIONS = [
  // --- [1] 활성 자동화 (Active) ---
  {
    id: "seo-hub",
    category: "비즈니스 SEO",
    title: "SEO Hub 주간 리마인더 & 분석",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "최근 실행 성공",
    lastRunAt: "2026-10-05 09:00",
    lastRunDetail: "5대 사이트 GSC/GA4 분석 및 텔레그램 주간 보고서 발송 완료",
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
    lastSuccess: true,
    lastRunText: "최근 점검 성공",
    lastRunAt: "오늘 09:00 AM",
    lastRunDetail: "Orem 매장 픽업 및 배송 가능 재고 점검 완료 (입고 대기 중)",
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
    lastSuccess: true,
    lastRunText: "최근 브리핑 성공",
    lastRunAt: "오늘 08:00 AM",
    lastRunDetail: "AI 에이전트/LLMOps 인기 저장소 10선 선별 및 텔레그램 브리핑 완료",
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
    lastSuccess: true,
    lastRunText: "실시간 감시 정상",
    lastRunAt: "상시 가동 중",
    lastRunDetail: "Cloudflare R2 암호화 백업 주기 감시 정상 (지연 없음)",
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
    lastSuccess: true,
    lastRunText: "대기 및 수신 정상",
    lastRunAt: "요청 시 즉시",
    lastRunDetail: "Telegram 봇 (/clip, /youtube) 수신 리스너 정상 가동 중",
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
    lastSuccess: true,
    lastRunText: "최근 심사 성공",
    lastRunAt: "대만 09:00 AM (4시간 주기)",
    lastRunDetail: "OpenAI GPT 질문 심사 및 가입 요청 자동 승인/거절 처리 완료",
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
    lastSuccess: true,
    lastRunText: "최근 크롤링 성공",
    lastRunAt: "오늘 10:05 AM (대만)",
    lastRunDetail: "대만 과외 공고 및 채용 정보 수집/정규화 후 Supabase DB 적재 완료",
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
    lastSuccess: true,
    lastRunText: "최근 배포 성공",
    lastRunAt: "오늘 08:05 AM (대만)",
    lastRunDetail: "대만 피크 시간대 과외 매칭 콘텐츠 페이스북 그룹 자동 배포 완료",
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
    lastSuccess: true,
    lastRunText: "최근 동기화 성공",
    lastRunAt: "5분 주기 (상시)",
    lastRunDetail: "Windows ↔ Mac mini 양방향 스킬 파일 Git 자동 커밋 및 풀/푸시 완료",
    domains: ["Windows PC ↔ Mac mini"],
    schedule: "5분 주기 (백그라운드)",
    engine: "OS 예약 작업 / Cron (Git)",
    channel: "비공개 GitHub 저장소",
    description:
      "Windows PC(Orca)와 Mac mini 간에 개발 중인 AI 에이전트 스킬 파일들을 5분마다 양방향으로 자동 커밋, 푸시, 풀하여 항상 동일한 상태를 유지합니다.",
    highlights: ["비밀 정보(API키) 자동 필터링", "무인 백그라운드 양방향 Git sync"],
    reactivation: null,
  },
  {
    id: "utahsays-marketing-runner",
    category: "SNS & 마케팅",
    title: "Utah Says SNS 로컬 마케팅 드래프트 생성기",
    icon: "🏔️",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "최근 실행 성공",
    lastRunAt: "오늘 11:39 AM (매시간)",
    lastRunDetail: "Instagram, Facebook, X, Reddit 4대 채널 드래프트 갱신 및 반환코드 0 확인",
    domains: ["utahsays.com", "Instagram", "Facebook", "X", "Reddit"],
    schedule: "매 60분 (1시간 주기)",
    engine: "WhatsBestInUtah Marketing Runner (Windows 작업 스케줄러)",
    channel: "로컬 드래프트 (.data/marketing) + 디렉터 리포트",
    description:
      "Instagram, Facebook, X, Reddit 채널별로 Utah Says 실시간 설문 데이터를 바탕으로 소셜 마케팅 드래프트를 자동 생성하고 최적의 포스팅 의사결정 보고서를 작성합니다.",
    highlights: [
      "4대 SNS(Instagram, Facebook, X, Reddit) 채널별 맞춤 포스트 자동 생성",
      "투표 트렌드 기반 콘텐츠 큐레이션 및 점수 알고리즘 연동",
      "Windows 작업 스케줄러(Utah Says - local content preparation) 상시 가동",
    ],
    reactivation: null,
  },
  {
    id: "utahsays-worker-cron",
    category: "데이터 분석 & 랭킹",
    title: "Utah Says 실시간 랭킹 & 트렌딩 산출 엔진",
    icon: "📊",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "최근 크론 성공",
    lastRunAt: "10분 주기 (상시)",
    lastRunDetail: "투표 시간 감쇄(Half-life) 계산 및 랭킹 스냅샷 D1 저장 완료",
    domains: ["utahsays.com"],
    schedule: "매 10분 주기",
    engine: "Cloudflare Worker Cron (/api/cron/refresh)",
    channel: "Cloudflare D1 Database",
    description:
      "투표 데이터의 시간 감쇄(Half-life 30일)를 반영하여 실시간 트렌딩 점수를 재산출하고, 설문 생애주기(new/rising/archived)를 갱신하며 순위 스냅샷을 저장합니다.",
    highlights: [
      "투표 반감기(Half-life) 기반 점수 감쇄 및 실시간 트렌딩 지표 산출",
      "설문 생애주기 자동 전환 및 10분 주기 랭킹 스냅샷 생성",
      "Cloudflare Workers 서버리스 크론 파이프라인",
    ],
    reactivation: null,
  },
  {
    id: "garmgoon-feed-pipeline",
    category: "콘텐츠 큐레이션 & 인프라",
    title: "Reddit 트렌드 피드 수집 & 백그라운드 관리 파이프라인",
    icon: "🌐",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "최근 크론 성공",
    lastRunAt: "10분 주기 (상시)",
    lastRunDetail: "Reddit RSS 아이디어 수집, DeepSeek AI 채점 및 피드 카드 생성 완료",
    domains: ["garmgoon.com", "Reddit"],
    schedule: "매 10분 주기",
    engine: "Cloudflare Worker Scheduled Handler",
    channel: "Cloudflare D1 / R2 + Web Push",
    description:
      "서브레딧 RSS 피드에서 새 기술/스타트업 글을 수집하고 AI로 점수를 매겨 피드 카드로 발행하며, R2 임시 파일 정리 및 푸시 다이제스트를 자동 발송합니다.",
    highlights: [
      "Reddit RSS 자동 수집 및 AI 품질/취향 점수 산정 피드 카드 생성",
      "R2 버킷 임시 가족 첨부 파일 자동 정리 (cleanupFamilyFiles)",
      "웹 푸시 다이제스트 자동 발송 파이프라인 (sendDigests)",
    ],
    reactivation: null,
  },
  {
    id: "openseo-rank-audit-engine",
    category: "SEO & 검색 최적화",
    title: "OpenSEO 순위 추적 & 테크니컬 감사 크롤러",
    icon: "🔍",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "최근 크론 성공",
    lastRunAt: "5분 주기 (상시)",
    lastRunDetail: "키워드 순위 추적 워크플로우(RankCheckWorkflow) 정상 완료",
    domains: ["seo.garmgoon.com", "everydaytutor.net", "utahsays.com", "pwstudio.kr"],
    schedule: "매 5분 주기 & 매일 새벽 03:17",
    engine: "Cloudflare Workflows + Durable Objects",
    channel: "OpenSEO Dashboard + SQLite Scratchpad",
    description:
      "Cloudflare Workflows를 통해 등록된 비즈니스 사이트의 키워드 검색 순위를 자동 추적하고, Durable Objects 기반 테크니컬 SEO 크롤러로 사이트 상태를 심층 진단합니다.",
    highlights: [
      "5분 주기 키워드 순위 추적 워크플로우 (RankCheckWorkflow)",
      "Durable Objects(AuditScratchpad) 기반 분산 사이트 크롤링",
      "세션 KV 가비지 컬렉션 및 미완료 감사 자동 수습",
    ],
    reactivation: null,
  },
  {
    id: "everydaytutor-onboarding-emails",
    category: "CRM & 온보딩",
    title: "EverydayTutor 튜터 맞춤 온보딩 이메일 발송기",
    icon: "✉️",
    status: "active",
    statusText: "정상 가동",
    lastSuccess: true,
    lastRunText: "러너 준비 완료",
    lastRunAt: "오늘 11:52 AM 갱신",
    lastRunDetail: "신규 튜터 60+명 정제 데이터 및 Resend API 연동 준비 완료",
    domains: ["everydaytutor.net"],
    schedule: "온디맨드 (신규 튜터 DB 적재 시)",
    engine: "Node.js + Resend API (send-onboarding-emails.js)",
    channel: "Resend 이메일 발송 + 로컬 로그",
    description:
      "크롤링 및 수집된 신규 튜터 명단을 정제하여 다국어 호칭(한국어/대만 번체/일본어/영어) 및 맞춤 UTM 링크가 포함된 온보딩 안내 메일을 일괄 자동 발송합니다.",
    highlights: [
      "이름 특수문자/괄호 자동 정제 및 다국어 맞춤 호칭 생성",
      "Resend API 연동 및 발송 결과 실시간 로깅 (.data/email_dispatch_log.json)",
      "Dry-run 모드 지원으로 안전한 사전 검증 가능",
    ],
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
    lastSuccess: null,
    lastRunText: "실행 대기 (비활성)",
    lastRunAt: "—",
    lastRunDetail: "Google OAuth 승인 확인 후 n8n 토글 시 즉시 재가동",
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
    lastSuccess: null,
    lastRunText: "실행 대기 (비활성)",
    lastRunAt: "—",
    lastRunDetail: "Pixie n8n에서 활성화 시 유튜브 RSS 6시간 주기 폴링 시작",
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
    lastSuccess: null,
    lastRunText: "실행 대기 (비활성)",
    lastRunAt: "—",
    lastRunDetail: "Product Hunt / IndieHackers 론칭 데이터 스카우트 템플릿",
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
    lastSuccess: null,
    lastRunText: "CLI 대기 (비활성)",
    lastRunAt: "—",
    lastRunDetail: "SOCIAL_PUBLISHING_ENABLED 토큰 재발급 후 CLI 및 스케줄러 등록 가능",
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
    lastSuccess: null,
    lastRunText: "수동 크롤링 전용",
    lastRunAt: "—",
    lastRunDetail: "OpenSEO 콘솔에서 온디맨드로 실행 가능, 정기 스케줄은 대기 중",
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
  const [viewMode, setViewMode] = useState("compact"); // 'compact' (한눈에 보기) | 'cards' (상세 카드)
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [liveHeartbeats, setLiveHeartbeats] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

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

  const categories = ["all", ...new Set(AUTOMATIONS.map((a) => a.category))];

  const filtered = AUTOMATIONS.filter((item) => {
    const hb = liveHeartbeats[item.id];
    const matchStatus =
      statusFilter === "all" ? true : item.status === statusFilter;
    const matchCategory =
      categoryFilter === "all" ? true : item.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.engine.toLowerCase().includes(q) ||
      item.channel.toLowerCase().includes(q) ||
      (item.lastRunText || "").toLowerCase().includes(q) ||
      (hb?.message || "").toLowerCase().includes(q);
    return matchStatus && matchCategory && matchSearch;
  });

  const activeCount = AUTOMATIONS.filter((a) => a.status === "active").length;
  const inactiveCount = AUTOMATIONS.filter((a) => a.status === "inactive").length;
  const liveFailures = Object.values(liveHeartbeats).filter((h) => h.status === "failure").length;

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚡ OPERATIONS &amp; AUTOMATION HUB</div>
          <h1 className="pageTitle">도메인 자동화 실시간 현황판</h1>
          <p className="pageDesc">
            전체 <b>{AUTOMATIONS.length}개 파이프라인</b>의 실시간 하트비트, 최근 작업 성공 여부, 실행 주기를 한눈에 모니터링합니다.
          </p>
        </div>
      </div>

      {/* 요약 메트릭 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            padding: "16px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            총 파이프라인 수
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {AUTOMATIONS.length}개
            <span
              style={{
                fontSize: "11px",
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
            padding: "16px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            실시간 실행 건전성
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: liveFailures > 0 ? "var(--danger)" : "#00a676",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{liveFailures > 0 ? `⚠️ ${liveFailures}건 실패` : "✓ 100% 정상 가동"}</span>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "2px" }}>
            {lastSyncTime
              ? `실시간 연동됨 (${lastSyncTime.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})`
              : "하트비트 연결 대기 중"}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            padding: "16px 18px",
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
              fontSize: "24px",
              fontWeight: 800,
              color: "#e68a00",
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {inactiveCount}개
            <span
              style={{
                fontSize: "11px",
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
            padding: "16px 18px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "var(--fs-xs)", fontWeight: 600 }}>
            통합 알림 채널
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--text)",
              marginTop: "6px",
            }}
          >
            📱 Telegram Bot
          </div>
        </div>
      </div>

      {/* 툴바: 상태 필터, 새로고침, 검색, 보기 모드 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        {/* 상태 필터 버튼 & 새로고침 */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
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
              fontSize: "13px",
              fontWeight: statusFilter === "active" ? 700 : 500,
              border: "1px solid",
              borderColor: statusFilter === "active" ? "#00a676" : "var(--line)",
              background:
                statusFilter === "active" ? "rgba(0, 166, 118, 0.12)" : "var(--surface)",
              color: statusFilter === "active" ? "#00a676" : "var(--text)",
              cursor: "pointer",
            }}
          >
            🟢 정상 가동 ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: statusFilter === "inactive" ? 700 : 500,
              border: "1px solid",
              borderColor: statusFilter === "inactive" ? "#e68a00" : "var(--line)",
              background:
                statusFilter === "inactive" ? "rgba(230, 138, 0, 0.12)" : "var(--surface)",
              color: statusFilter === "inactive" ? "#e68a00" : "var(--text)",
              cursor: "pointer",
            }}
          >
            🟡 대기 ({inactiveCount})
          </button>

          <button
            type="button"
            onClick={fetchLiveStatus}
            disabled={isRefreshing}
            title="실시간 하트비트 동기화"
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--text-2)",
              cursor: isRefreshing ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: isRefreshing ? "rotate(180deg)" : "none",
                transition: "transform 0.4s ease",
              }}
            >
              ↻
            </span>
            <span>{isRefreshing ? "갱신 중..." : "실시간 동기화"}</span>
          </button>
        </div>

        {/* 뷰 모드 토글 (한눈에 보기 vs 카드형) + 검색 */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "4px 10px",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "14px", opacity: 0.6 }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="자동화 검색..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "var(--text)",
                width: "130px",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-3)",
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div
            style={{
              display: "inline-flex",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              title="한 화면에 많이 볼 수 있는 컴팩트 목록형"
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: viewMode === "compact" ? 700 : 500,
                border: "none",
                background: viewMode === "compact" ? "var(--brand)" : "transparent",
                color: viewMode === "compact" ? "#fff" : "var(--text-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <span>📋</span> 한눈에 보기
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              title="상세 카드형 보기"
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: viewMode === "cards" ? 700 : 500,
                border: "none",
                background: viewMode === "cards" ? "var(--brand)" : "transparent",
                color: viewMode === "cards" ? "#fff" : "var(--text-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                transition: "all 0.15s ease",
              }}
            >
              <span>🗂️</span> 카드형
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 칩 필터 */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
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
              padding: "4px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: categoryFilter === cat ? 700 : 500,
              border: "1px solid",
              borderColor: categoryFilter === cat ? "var(--brand)" : "var(--line)",
              background: categoryFilter === cat ? "var(--brand)" : "var(--surface)",
              color: categoryFilter === cat ? "#fff" : "var(--text-2)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {cat === "all" ? "모든 분야" : cat}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* [1] 컴팩트 목록형 뷰 (High-Density Table View) - DEFAULT */}
      {/* ======================================================== */}
      {viewMode === "compact" && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            boxShadow: "var(--shadow)",
          }}
        >
          <div
            style={{
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-2)",
                    borderBottom: "1px solid var(--line)",
                    color: "var(--text-2)",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "12px 16px", width: "210px" }}>상태 / 실시간 실행 결과</th>
                  <th style={{ padding: "12px 16px" }}>자동화 파이프라인</th>
                  <th style={{ padding: "12px 16px", width: "170px" }}>실행 주기 &amp; 엔진</th>
                  <th style={{ padding: "12px 16px", width: "160px" }}>알림 / 출력처</th>
                  <th style={{ padding: "12px 16px", width: "80px", textAlign: "center" }}>상세</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const isActive = item.status === "active";
                  const isExpanded = expandedId === item.id;
                  const hb = liveHeartbeats[item.id];
                  const hasHb = Boolean(hb);
                  const isSuccess = hasHb ? hb.status === "success" : item.lastSuccess === true;
                  const isFailure = hasHb ? hb.status === "failure" : false;
                  const isRunning = hasHb ? hb.status === "running" : false;
                  const displayStatusText = isRunning
                    ? "실행 중..."
                    : isFailure
                    ? "실행 실패"
                    : item.statusText;
                  const displayRunText = isRunning
                    ? "현재 실행 중"
                    : isFailure
                    ? "최근 실행 실패"
                    : hasHb
                    ? "실시간 실행 성공"
                    : item.lastRunText;
                  const displayRunAt = hasHb
                    ? `${formatRelativeTime(hb.last_run_at)} (${new Date(hb.last_run_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`
                    : item.lastRunAt;
                  const displayRunDetail = hasHb ? hb.message || item.lastRunDetail : item.lastRunDetail;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => toggleExpand(item.id)}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        cursor: "pointer",
                        background: isExpanded
                          ? "var(--surface-2)"
                          : idx % 2 === 1
                          ? "rgba(0,0,0,0.015)"
                          : "var(--surface)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* 상태 & 최근 성공 결과 */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              background: isFailure ? "var(--danger)" : isActive ? "#00a676" : "#e68a00",
                              flexShrink: 0,
                            }}
                          />
                          <strong
                            style={{
                              fontSize: "12px",
                              color: isFailure ? "var(--danger)" : isActive ? "#00a676" : "#e68a00",
                            }}
                          >
                            {displayStatusText}
                          </strong>
                          {hasHb && (
                            <span
                              style={{
                                fontSize: "9px",
                                color: "#00a676",
                                background: "rgba(0,166,118,0.12)",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                fontWeight: 700,
                              }}
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                        {isSuccess ? (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#00a676",
                                background: "rgba(0, 166, 118, 0.1)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              ✓ {displayRunText}
                            </span>
                            <div
                              style={{
                                fontSize: "10px",
                                color: "var(--text-3)",
                                marginTop: "2px",
                                paddingLeft: "2px",
                              }}
                            >
                              {displayRunAt}
                            </div>
                          </div>
                        ) : isFailure ? (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "var(--danger)",
                                background: "rgba(229, 72, 77, 0.1)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              ✕ {displayRunText}
                            </span>
                            <div style={{ fontSize: "10px", color: "var(--danger)", marginTop: "2px" }}>
                              {displayRunAt}
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: "4px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "var(--text-3)",
                                background: "var(--surface-2)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              — {displayRunText}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 자동화 명칭 & 분야 */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "20px", flexShrink: 0 }}>{item.icon}</span>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong
                                style={{
                                  fontSize: "14px",
                                  color: "var(--text)",
                                  lineHeight: 1.3,
                                }}
                              >
                                {item.title}
                              </strong>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  color: "var(--text-3)",
                                  background: "var(--surface-2)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                }}
                              >
                                {item.category}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-2)",
                                marginTop: "3px",
                                maxWidth: "520px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.description}
                            </div>
                          </div>
                        </div>

                        {/* 펼쳤을 때 나타나는 인라인 세부 정보 */}
                        {isExpanded && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: "12px",
                              padding: "14px",
                              background: "var(--surface)",
                              borderRadius: "10px",
                              border: "1px solid var(--line)",
                              cursor: "default",
                            }}
                          >
                            <div style={{ marginBottom: "8px" }}>
                              <strong style={{ fontSize: "12px", color: "var(--text)" }}>
                                📌 상세 설명:
                              </strong>
                              <p style={{ margin: "4px 0 0 0", color: "var(--text-2)", lineHeight: 1.5 }}>
                                {item.description}
                              </p>
                            </div>

                            {displayRunDetail && (
                              <div
                                style={{
                                  marginBottom: "10px",
                                  padding: "8px 10px",
                                  background: isFailure
                                    ? "rgba(229, 72, 77, 0.08)"
                                    : "rgba(0, 166, 118, 0.08)",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  color: "var(--text)",
                                }}
                              >
                                <strong style={{ color: isFailure ? "var(--danger)" : "#00a676" }}>
                                  {isFailure ? "✕ 실행 오류 보고: " : "✓ 최근 실행 내역: "}
                                </strong>
                                {displayRunDetail}
                              </div>
                            )}

                            <div>
                              <strong style={{ fontSize: "12px", color: "var(--text)" }}>
                                🎯 점검 포인트 &amp; 주요 특징:
                              </strong>
                              <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", color: "var(--text-2)", lineHeight: 1.5 }}>
                                {item.highlights.map((h, i) => (
                                  <li key={i}>{h}</li>
                                ))}
                              </ul>
                            </div>

                            {!isActive && item.reactivation && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  padding: "8px 10px",
                                  background: "rgba(230, 138, 0, 0.08)",
                                  border: "1px solid rgba(230, 138, 0, 0.25)",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                }}
                              >
                                <strong style={{ color: "#e68a00" }}>💡 재활성화 방법: </strong>
                                <span style={{ color: "var(--text)" }}>{item.reactivation}</span>
                              </div>
                            )}

                            <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--text-3)" }}>
                              <strong>연동 도메인: </strong>
                              {item.domains.join(", ")}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 주기 & 엔진 */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "12px" }}>
                          {item.schedule}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-3)",
                            fontFamily: "monospace",
                            marginTop: "2px",
                          }}
                        >
                          {item.engine}
                        </div>
                      </td>

                      {/* 알림 / 채널 */}
                      <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "12px" }}>
                          {item.channel}
                        </div>
                      </td>

                      {/* 펼치기 버튼 */}
                      <td style={{ padding: "12px 16px", textAlign: "center", verticalAlign: "middle" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(item.id);
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            background: isExpanded ? "var(--brand-soft)" : "var(--surface)",
                            color: isExpanded ? "var(--brand)" : "var(--text-2)",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? "▲ 닫기" : "▼ 상세"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* [2] 카드형 뷰 (Grid Cards View) - 옵션 선택 시 전환 */}
      {/* ======================================================== */}
      {viewMode === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "18px",
          }}
        >
          {filtered.map((item) => {
            const isActive = item.status === "active";
            const hb = liveHeartbeats[item.id];
            const hasHb = Boolean(hb);
            const isSuccess = hasHb ? hb.status === "success" : item.lastSuccess === true;
            const isFailure = hasHb ? hb.status === "failure" : false;
            const isRunning = hasHb ? hb.status === "running" : false;
            const displayStatusText = isRunning
              ? "실행 중..."
              : isFailure
              ? "실행 실패"
              : item.statusText;
            const displayRunText = isRunning
              ? "현재 실행 중"
              : isFailure
              ? "최근 실행 실패"
              : hasHb
              ? "실시간 실행 성공"
              : item.lastRunText;
            const displayRunAt = hasHb
              ? `${formatRelativeTime(hb.last_run_at)} (${new Date(hb.last_run_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})`
              : item.lastRunAt;

            return (
              <div
                key={item.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius)",
                  padding: "20px",
                  boxShadow: "var(--shadow)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: isActive ? 1 : 0.94,
                }}
              >
                <div>
                  {/* 카드 상단: 아이콘 + 제목 + 상태 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "28px" }}>{item.icon}</span>
                      <div>
                        <span
                          style={{
                            fontSize: "11px",
                            color: isActive ? "var(--brand)" : "var(--text-3)",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.category}
                        </span>
                        <h2
                          style={{
                            fontSize: "16px",
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

                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      {hasHb && (
                        <span
                          style={{
                            fontSize: "9px",
                            color: "#00a676",
                            background: "rgba(0,166,118,0.12)",
                            padding: "2px 5px",
                            borderRadius: "4px",
                            fontWeight: 700,
                          }}
                        >
                          LIVE
                        </span>
                      )}
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: isFailure ? "var(--danger)" : isActive ? "#00a676" : "#e68a00",
                          background: isFailure
                            ? "rgba(229, 72, 77, 0.12)"
                            : isActive
                            ? "rgba(0, 166, 118, 0.12)"
                            : "rgba(230, 138, 0, 0.12)",
                          padding: "3px 8px",
                          borderRadius: "999px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: isFailure ? "var(--danger)" : isActive ? "#00a676" : "#e68a00",
                          }}
                        />
                        {displayStatusText}
                      </span>
                    </div>
                  </div>

                  {/* 최근 실행 결과 띠지 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      marginBottom: "10px",
                      background: isFailure
                        ? "rgba(229, 72, 77, 0.08)"
                        : isSuccess
                        ? "rgba(0, 166, 118, 0.08)"
                        : "var(--surface-2)",
                      fontSize: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: isFailure ? "var(--danger)" : isSuccess ? "#00a676" : "var(--text-3)",
                      }}
                    >
                      {isSuccess ? "✓ " : isFailure ? "✕ " : "— "}
                      {displayRunText}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                      {displayRunAt}
                    </span>
                  </div>

                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-2)",
                      lineHeight: 1.5,
                      marginBottom: "12px",
                    }}
                  >
                    {item.description}
                  </p>

                  {/* 하이라이트 */}
                  <div
                    style={{
                      background: "var(--surface-2)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-3)",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      점검 포인트
                    </div>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "16px",
                        fontSize: "12px",
                        color: "var(--text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>

                  {!isActive && item.reactivation && (
                    <div
                      style={{
                        background: "rgba(230, 138, 0, 0.08)",
                        border: "1px solid rgba(230, 138, 0, 0.25)",
                        borderRadius: "10px",
                        padding: "8px 10px",
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#e68a00",
                          marginBottom: "2px",
                        }}
                      >
                        💡 재활성화 방법
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text)",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.reactivation}
                      </div>
                    </div>
                  )}
                </div>

                {/* 메타 풋터 */}
                <div
                  style={{
                    borderTop: "1px solid var(--line)",
                    paddingTop: "10px",
                    fontSize: "12px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-3)", display: "block", fontSize: "10px" }}>
                      ⏰ 주기
                    </span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.schedule}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-3)", display: "block", fontSize: "10px" }}>
                      🔔 채널
                    </span>
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>{item.channel}</span>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span style={{ color: "var(--text-3)", display: "block", fontSize: "10px" }}>
                      ⚙️ 엔진
                    </span>
                    <span style={{ color: "var(--text-2)", fontFamily: "monospace", fontSize: "11px" }}>
                      {item.engine}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 안내 배너 */}
      <div
        style={{
          marginTop: "28px",
          padding: "16px 20px",
          background: "var(--surface)",
          border: "1px dashed var(--line)",
          borderRadius: "var(--radius)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "20px" }}>🔒</span>
          <div style={{ fontSize: "13px", color: "var(--text-2)" }}>
            <b>비공개 관리자 전용 페이지입니다.</b> D1 데이터베이스와 실시간 하트비트로 연동되어 있습니다.
          </div>
        </div>
        <Link
          href="/tools"
          style={{
            fontSize: "12px",
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
