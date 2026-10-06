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

const CHANNEL_ICONS = [
  [/telegram/i, "✈️"],
  [/obsidian/i, "📓"],
  [/push/i, "🔔"],
  [/resend|이메일|email/i, "✉️"],
  [/webhook/i, "🔗"],
  [/dashboard|대시보드/i, "📊"],
  [/supabase|d1|sqlite|database/i, "🗄️"],
  [/github/i, "📦"],
  [/facebook|meta|instagram|threads|x api/i, "📣"],
  [/report|리포트|드래프트|로그/i, "📁"],
];

// "본문 (부연)" 형태를 본문과 부연으로 나눈다
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

// 정적 데이터와 실시간 하트비트를 합쳐 화면에 보여줄 상태를 만든다
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
    : item.lastRunText;
  const clock = hasHb ? formatClock(hb.last_run_at) : null;
  const relative = hasHb ? formatRelativeTime(hb.last_run_at) : null;
  const runAt = hasHb
    ? relative
    : item.lastRunAt && item.lastRunAt !== "—"
    ? item.lastRunAt
    : item.lastRunText;
  const runAtFull = hasHb ? `${relative}${clock ? ` (${clock})` : ""}` : item.lastRunAt;
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
        {run.runAt}
        {run.clock && <span style={{ color: "var(--text-3)" }}> · {run.clock}</span>}
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
  const [viewMode, setViewMode] = useState("compact"); // 'compact' (한눈에 보기) | 'cards' (상세 카드)
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
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

  // 칩 영역 좌우 끝에 더 볼 칩이 있으면 페이드와 화살표를 보여준다
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

  const categories = ["all", ...new Set(AUTOMATIONS.map((a) => a.category))];
  const categoryCounts = AUTOMATIONS.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

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
  const liveCount = Object.keys(liveHeartbeats).length;
  const uptimePct = Math.round((activeCount / AUTOMATIONS.length) * 100);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  const statusTabs = [
    { key: "all", label: "전체", count: AUTOMATIONS.length, tone: "all" },
    { key: "active", label: "정상 가동", count: activeCount, tone: "ok" },
    { key: "inactive", label: "대기", count: inactiveCount, tone: "warn" },
  ];

  return (
    <div className="ax">
      <div className="pageHead">
        <div>
          <div className="eyebrow">⚡ OPERATIONS &amp; AUTOMATION HUB</div>
          <h1 className="pageTitle">도메인 자동화 실시간 현황판</h1>
          <p className="pageDesc">
            전체 <b>{AUTOMATIONS.length}개 파이프라인</b>의 실시간 하트비트, 최근 작업 성공 여부, 실행 주기를 한눈에 모니터링합니다.
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
            가동 {activeCount} · 대기 {inactiveCount}
          </div>
        </div>

        <div className="axMetric" data-tone="ok">
          <div className="axMetricLabel">정상 가동</div>
          <div className="axMetricValue" data-tone="ok">
            {activeCount}
            <small>개</small>
          </div>
          <div className="axMetricSub">전체의 {uptimePct}% 활성</div>
        </div>

        <div className="axMetric" data-tone="warn">
          <div className="axMetricLabel">대기 / 보류</div>
          <div className="axMetricValue" data-tone="warn">
            {inactiveCount}
            <small>개</small>
          </div>
          <div className="axMetricSub">재활성화 절차 준비 완료</div>
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

      {/* 툴바: 상태 필터, 새로고침, 검색, 보기 모드 */}
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
              placeholder="자동화 검색..."
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
          <div className="axSeg" role="group" aria-label="보기 방식">
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

      {/* 카테고리 칩 필터 (스크롤바 숨김) */}
      <div className="axChipsWrap">
        {chipFade.l && (
          <button type="button" className="axChipsArrow" data-side="l" onClick={() => scrollChips(-1)} aria-label="이전 분야">
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
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="axChip"
              aria-pressed={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === "all" ? "모든 분야" : cat}
              <span className="axChipN">{cat === "all" ? AUTOMATIONS.length : categoryCounts[cat]}</span>
            </button>
          ))}
        </div>
        {chipFade.r && (
          <button type="button" className="axChipsArrow" data-side="r" onClick={() => scrollChips(1)} aria-label="다음 분야">
            <IconChevron dir="right" />
          </button>
        )}
      </div>

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
      {/* [1] 컴팩트 목록형 뷰 (High-Density Table View) - DEFAULT */}
      {/* ======================================================== */}
      {viewMode === "compact" && filtered.length > 0 && (
        <div className="axTable">
          <div className="axHead">
            <div>자동화 파이프라인 · {filtered.length}</div>
            <div>상태 · 최근 실행</div>
            <div>실행 주기 · 엔진</div>
            <div className="axColChannel">
              알림 · 출력처
            </div>
            <div />
          </div>

          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            const run = getRunState(item, liveHeartbeats[item.id]);
            const detailId = `ax-detail-${item.id}`;

            return (
              <div
                key={item.id}
                className="axRow"
               
                data-tone={run.tone}
                data-open={isExpanded ? "true" : "false"}
                data-inactive={run.isActive ? "false" : "true"}
              >
                <div className="axRowMain" onClick={() => toggleExpand(item.id)}>
                  {/* 파이프라인: 아이콘 + 제목 + 분야 + 설명 + 도메인 */}
                  <div className="axCell axColPipe">
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
                          <h3 className="axPanelTitle">⚙️ 구성</h3>
                          <dl className="axKv">
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
      {/* [2] 카드형 뷰 (Grid Cards View) - 옵션 선택 시 전환 */}
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

                <h2 className="axCardTitle">{item.title}</h2>
                <div className="axCardCat">
                  <span className="axTag" data-kind="cat">
                    {item.category}
                  </span>
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
