// 관리 중인 전체 사이트의 통계 및 SEO 지표 메타데이터
// [절대 원칙] 일체의 가상(Mock/Fake) 수치를 배제하고 100% 실측치 및 시장 조사 데이터만 표기한다.
// 데이터가 없는 신규 서비스나 미수집 항목은 0, -, 또는 '데이터 수집 대기 중'으로 명확히 표기한다.
// 시장 조사 키워드는 '공략 타깃 키워드 (시장 검색량)'로 분리 표기한다.

export const PERIODS = [
  { id: "7d", label: "최근 7일", shortLabel: "7일", days: 7 },
  { id: "28d", label: "최근 28일", shortLabel: "28일", days: 28, isDefault: true },
  { id: "90d", label: "최근 90일", shortLabel: "90일", days: 90 },
];

export const SITES_METRICS = [
  {
    id: "everydaytutor",
    name: "EverydayTutor",
    shortName: "EverydayTutor",
    domain: "everydaytutor.net",
    url: "https://www.everydaytutor.net",
    category: "과외 매칭 플랫폼 / 글로벌 에듀테크",
    badge: "실측 연동",
    icon: "🎓",
    accentColor: "#3b82f6",
    stack: "Next.js 14 · Cloudflare Pages · Vercel DNS",
    dataStatus: "real", // 실측 데이터
    telemetrySource: "D1 엣지 실측 비콘 + GSC/GA4",
    integrations: {
      gsc: { connected: true, property: "sc-domain:everydaytutor.net", account: "garmgoondev@gmail.com" },
      ga4: { connected: true, property: "properties/554632841", stream: "EverydayTutor Web (향상된 측정 ON)" },
      cloudflare: { connected: true, type: "Pages + Email Routing" },
      audit: { status: "완료", issues: 17 },
    },
    overview: {
      clicks28d: 1,
      impressions28d: 67,
      ctr: 1.5,
      avgPosition: 16.7,
      users28d: 2,
      sessions28d: 2,
      engagementRate: 100,
      avgDuration: "2분 14초",
      indexedPages: 24,
      conversions: { label: "전환 이벤트", count: 0, unit: "건" },
      periods: {
        "7d": {
          clicks: 0,
          impressions: 14,
          ctr: 0.0,
          avgPosition: 17.1,
          users: 1,
          sessions: 1,
          engagementRate: 100,
          avgDuration: "2분 30초",
          conversions: 0,
        },
        "28d": {
          clicks: 1,
          impressions: 67,
          ctr: 1.5,
          avgPosition: 16.7,
          users: 2,
          sessions: 2,
          engagementRate: 100,
          avgDuration: "2분 14초",
          conversions: 0,
        },
        "90d": {
          clicks: 2,
          impressions: 142,
          ctr: 1.4,
          avgPosition: 17.8,
          users: 5,
          sessions: 6,
          engagementRate: 95,
          avgDuration: "2분 08초",
          conversions: 0,
        },
      },
    },
    history: {
      "7d": [
        { date: "10/02", impressions: 2, clicks: 0, users: 0 },
        { date: "10/03", impressions: 3, clicks: 0, users: 0 },
        { date: "10/04", impressions: 2, clicks: 0, users: 1 },
        { date: "10/05", impressions: 1, clicks: 0, users: 0 },
        { date: "10/06", impressions: 2, clicks: 0, users: 0 },
        { date: "10/07", impressions: 1, clicks: 0, users: 0 },
        { date: "10/08", impressions: 3, clicks: 0, users: 0 },
      ],
      "28d": [
        { date: "09/16", impressions: 12, clicks: 0, users: 0 },
        { date: "09/23", impressions: 18, clicks: 0, users: 1 },
        { date: "09/30", impressions: 23, clicks: 1, users: 1 },
        { date: "10/08", impressions: 14, clicks: 0, users: 0 },
      ],
      "90d": [
        { date: "08/10", impressions: 24, clicks: 0, users: 1 },
        { date: "08/25", impressions: 32, clicks: 1, users: 1 },
        { date: "09/10", impressions: 28, clicks: 0, users: 1 },
        { date: "09/25", impressions: 35, clicks: 1, users: 1 },
        { date: "10/08", impressions: 23, clicks: 0, users: 1 },
      ],
    },
    queryType: "real", // GSC 실측 쿼리
    topQueries: [
      { query: "高中英文家教行情", rank: 25.3, clicks: 1, impressions: 12, ctr: 8.3, status: "1페이지 유력 🔥" },
      { query: "台北家教行情", rank: 18.2, clicks: 0, impressions: 22, ctr: 0.0, status: "2페이지 상위" },
      { query: "國中英文家教時薪", rank: 24.1, clicks: 0, impressions: 15, ctr: 0.0, status: "2페이지 중위" },
      { query: "대만 영어 과외 시세", rank: 14.5, clicks: 0, impressions: 9, ctr: 0.0, status: "10위권 진입" },
      { query: "taiwan english tutor rates", rank: 21.0, clicks: 0, impressions: 9, ctr: 0.0, status: "타깃 키워드" },
    ],
    topPages: [
      { path: "/insights/taipei-english-tutor-rates", title: "대만 타이베이 영어 과외 시세 인사이트", views: 1, clicks: 1 },
      { path: "/tutors", title: "튜터 검색 및 필터", views: 1, clicks: 0 },
    ],
    actionItems: [
      "현재 17~25위권에 위치한 '高中英文家教行情'(고교 영어 과외 시세) 검색어의 1페이지(5위 이내) 진입을 위한 메타 타이틀/디스크립션 리라이팅 가이드 적용",
      "대만(zh-TW) 학부모 검색 의도 반영한 FAQ 구조화 데이터(Schema.org) 마크업 추가",
      "과외 매칭 신청 전환(CTA) 버튼 가시성 강화 및 GA4 맞춤 이벤트 추적",
    ],
    targetMarket: "대만(zh-TW) 및 글로벌(en)",
  },
  {
    id: "pwstudio",
    name: "PW Studio",
    shortName: "PW Studio",
    domain: "pwstudio.kr",
    url: "https://pwstudio.kr",
    category: "웹 개발 / 디지털 솔루션 스튜디오",
    badge: "배포 초기",
    icon: "💻",
    accentColor: "#8b5cf6",
    stack: "Next.js App Router · Cloudflare Pages · Turbopack",
    dataStatus: "pending", // 색인 인입 대기 중
    telemetrySource: "D1 엣지 실측 비콘 + GA4",
    integrations: {
      gsc: { connected: true, property: "sc-domain:pwstudio.kr", account: "garmgoondev@gmail.com" },
      ga4: { connected: true, property: "properties/557301461", stream: "PW Studio (G-B2EWMRBHTN)" },
      cloudflare: { connected: true, type: "Pages Custom Domain + DNS" },
      audit: { status: "완료 (이슈 95.8% 감소)", issues: 1 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 0,
      sessions28d: 0,
      engagementRate: 0,
      avgDuration: "-",
      indexedPages: 8,
      conversions: { label: "문의 폼", count: 0, unit: "건" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
      },
    },
    history: {
      "7d": [],
      "28d": [],
      "90d": [],
    },
    queryType: "target", // 시장 분석 타깃 키워드
    topQueries: [
      { query: "소상공인 웹사이트 제작", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
      { query: "반응형 웹 구축 스튜디오", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
      { query: "PW Studio", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "브랜드 키워드" },
    ],
    topPages: [
      { path: "/", title: "PW Studio 메인", views: 0, clicks: 0 },
      { path: "/portfolio", title: "제작 포트폴리오", views: 0, clicks: 0 },
    ],
    actionItems: [
      "GA4(G-B2EWMRBHTN) 연동 완료 후 구글 및 네이버 검색 노출을 위한 소상공인/전문직 키워드 갭 분석 블로그 포스트 발행",
      "네이버 웹마스터 도구(서치어드바이저) 등록 및 사이트 구조 인덱싱 검증",
    ],
    targetMarket: "한국(ko-KR) 소상공인 & 비즈니스",
  },
  {
    id: "utahsays",
    name: "Utah Says",
    shortName: "Utah Says",
    domain: "utahsays.com",
    url: "https://utahsays.com",
    category: "유타 로컬 커뮤니티 & 리서치 미디어",
    badge: "실측 연동",
    icon: "🏔️",
    accentColor: "#10b981",
    stack: "Next.js 16 · Cloudflare Workers / D1 / KV",
    dataStatus: "real",
    telemetrySource: "Cloudflare D1 엣지 비콘 (1st-Party) + GA4",
    integrations: {
      gsc: { connected: true, property: "sc-domain:utahsays.com", account: "garmgoondev@gmail.com" },
      ga4: { connected: true, property: "properties/557341522", stream: "Utah Says (G-QL3BW0J3KY)" },
      cloudflare: { connected: true, type: "Worker Custom Domain + KV" },
      audit: { status: "완료", issues: 14 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 88,
      sessions28d: 88,
      engagementRate: 100,
      avgDuration: "3분 10초",
      indexedPages: 16,
      conversions: { label: "설문 투표", count: 29, unit: "건" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 88, sessions: 88, engagementRate: 100, avgDuration: "3분 10초", conversions: 29 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 88, sessions: 88, engagementRate: 100, avgDuration: "3분 10초", conversions: 29 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 88, sessions: 88, engagementRate: 100, avgDuration: "3분 10초", conversions: 29 },
      },
    },
    history: {
      "7d": [
        { date: "10/04", impressions: 0, clicks: 0, users: 31 },
        { date: "10/05", impressions: 0, clicks: 0, users: 6 },
        { date: "10/06", impressions: 0, clicks: 0, users: 39 },
        { date: "10/07", impressions: 0, clicks: 0, users: 9 },
        { date: "10/08", impressions: 0, clicks: 0, users: 3 },
      ],
      "28d": [
        { date: "10/04", impressions: 0, clicks: 0, users: 31 },
        { date: "10/05", impressions: 0, clicks: 0, users: 6 },
        { date: "10/06", impressions: 0, clicks: 0, users: 39 },
        { date: "10/07", impressions: 0, clicks: 0, users: 9 },
        { date: "10/08", impressions: 0, clicks: 0, users: 3 },
      ],
      "90d": [
        { date: "10/04", impressions: 0, clicks: 0, users: 31 },
        { date: "10/05", impressions: 0, clicks: 0, users: 6 },
        { date: "10/06", impressions: 0, clicks: 0, users: 39 },
        { date: "10/07", impressions: 0, clicks: 0, users: 9 },
        { date: "10/08", impressions: 0, clicks: 0, users: 3 },
      ],
    },
    queryType: "target",
    topQueries: [
      { query: "utah local surveys community", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
      { query: "utah public opinion polls", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
    ],
    topPages: [
      { path: "/", title: "Utah Says Home", views: 88, clicks: 0 },
    ],
    actionItems: [
      "D1 내부 비콘 기준 실측 방문 88건 및 유효 투표 29건 실측 집계 중 (Google 검색 색인 인입 가속화 진행)",
      "솔트레이크시티/유타 카운티 로컬 이슈 관련 주간 여론조사(Poll) 콘텐츠 지속 발행 및 사이트맵 자동 핑",
      "Reddit r/Utah 및 로컬 페이스북 커뮤니티 공유 연계로 초기 오가닉 유입 활성화",
    ],
    targetMarket: "미국 유타주 로컬 (en-US)",
  },
  {
    id: "webomok",
    name: "WebOmok (웹오목)",
    shortName: "WebOmok",
    domain: "webomok.com",
    url: "https://webomok.com",
    category: "무설치 글로벌 2인용 온라인 오목 웹앱",
    badge: "오늘 런칭",
    icon: "⚪⚫",
    accentColor: "#6366f1",
    stack: "WebGame Network · Cloudflare Pages · PeerJS P2P",
    dataStatus: "new", // 오늘 신규 생성
    telemetrySource: "D1 엣지 실측 비콘 (1st-Party)",
    integrations: {
      gsc: { connected: false, property: "신규 등록 (색인 진행 중)", account: "garmgoondev@gmail.com" },
      ga4: { connected: false, property: "신규 런칭 (측정 준비)", stream: "WebOmok Web" },
      cloudflare: { connected: true, type: "Pages + Edge Caching" },
      audit: { status: "완료", issues: 4 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 0,
      sessions28d: 0,
      engagementRate: 0,
      avgDuration: "-",
      indexedPages: 1,
      conversions: { label: "대국 플레이", count: 0, unit: "판" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
      },
    },
    history: {
      "7d": [],
      "28d": [],
      "90d": [],
    },
    queryType: "market_research", // 시장 조사 데이터 (네이버 검색광고 실측 검색량)
    topQueries: [
      { query: "오목게임", rank: "타깃", clicks: 0, impressions: 7710, ctr: 0.0, status: "네이버 월 7,710회 (경쟁도 낮음) 🔥" },
      { query: "2인용 오목", rank: "타깃", clicks: 0, impressions: 4500, ctr: 0.0, status: "네이버 월 4,500회 (공략 타깃)" },
      { query: "온라인 오목 무설치", rank: "타깃", clicks: 0, impressions: 1200, ctr: 0.0, status: "네이버 월 1,200회 (공략 타깃)" },
      { query: "五目並べ オンライン", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "일본 구글 틈새 공략 타깃" },
    ],
    topPages: [
      { path: "/", title: "WebOmok - 무설치 온라인 2인용 오목 메인", views: 0, clicks: 0 },
    ],
    actionItems: [
      "네이버 월 7,710회 검색량에 경쟁도 '낮음'인 '오목게임' 키워드 온페이지 최적화(Title, H1, FAQ 마크업)",
      "구글 서치 콘솔 속성 등록 및 사이트맵(sitemap.xml) 제출",
      "일본 구글 2위가 야후 지혜주머니일 정도로 경쟁이 희박하므로, 일본어 타깃 메타 태그 및 hreflang 보강",
    ],
    targetMarket: "한국, 일본, 대만, 미국 4개 국어 지원",
  },
  {
    id: "ecocarpet",
    name: "EcoCarpet Utah",
    shortName: "EcoCarpet",
    domain: "new.ecocarpetutah.com",
    targetDomain: "ecocarpetutah.com",
    url: "https://new.ecocarpetutah.com",
    category: "로컬 카펫 & 실내 클리닝 비즈니스",
    badge: "전환 대기",
    icon: "✨",
    accentColor: "#059669",
    stack: "Next.js · Tailwind CSS · Cloudflare Pages",
    dataStatus: "staging", // 본 도메인 전환 대기
    telemetrySource: "Cloudflare Pages (본 도메인 전환 대기)",
    integrations: {
      gsc: { connected: false, property: "전환 대기 (본 도메인 이전 시)", account: "garmgoondev@gmail.com" },
      ga4: { connected: false, property: "전환 대기", stream: "EcoCarpet New Web" },
      cloudflare: { connected: true, type: "Pages Staging Domain" },
      audit: { status: "데모 오디트 완료", issues: 5 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 0,
      sessions28d: 0,
      engagementRate: 0,
      avgDuration: "-",
      indexedPages: 14,
      conversions: { label: "견적 문의", count: 0, unit: "건" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
      },
    },
    history: {
      "7d": [],
      "28d": [],
      "90d": [],
    },
    queryType: "market_research",
    topQueries: [
      { query: "carpet cleaning utah county", rank: "타깃", clicks: 0, impressions: 2400, ctr: 0.0, status: "유타 카운티 월 2,400회" },
      { query: "eco friendly carpet cleaning orem", rank: "타깃", clicks: 0, impressions: 580, ctr: 0.0, status: "Orem 친환경 월 580회" },
      { query: "upholstery cleaning provo", rank: "타깃", clicks: 0, impressions: 720, ctr: 0.0, status: "Provo 소파/매트리스 월 720회" },
    ],
    topPages: [
      { path: "/", title: "EcoCarpet Utah 친환경 카펫 클리닝 메인", views: 0, clicks: 0 },
    ],
    actionItems: [
      "기존 워드프레스 사이트에서 신규 Cloudflare Pages 플랫폼으로 본 도메인(ecocarpetutah.com) 정식 DNS 이전(Cutover)",
      "전환 즉시 GSC 소유권 확인 및 구글 비즈니스 프로필(GBP) 링크 동기화",
    ],
    targetMarket: "미국 유타주 (Utah County, Orem, Provo, Salt Lake)",
  },
  {
    id: "mine98",
    name: "웹지뢰찾기 (mine98)",
    shortName: "웹지뢰찾기",
    domain: "mine98.com",
    url: "https://mine98.com",
    category: "무설치 클래식 웹 게임 / 엔터테인먼트",
    badge: "오늘 런칭",
    icon: "💣",
    accentColor: "#ef4444",
    stack: "WebGame Network · Next.js 16 · Cloudflare Pages",
    dataStatus: "new", // 오늘 신규 생성
    telemetrySource: "D1 엣지 실측 비콘 (1st-Party)",
    integrations: {
      gsc: { connected: false, property: "신규 등록 (색인 진행 중)", account: "garmgoondev@gmail.com" },
      ga4: { connected: false, property: "신규 런칭 (측정 준비)", stream: "mine98 Web" },
      cloudflare: { connected: true, type: "Pages + Edge Caching (mine98.pages.dev)" },
      audit: { status: "완료", issues: 2 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 0,
      sessions28d: 0,
      engagementRate: 0,
      avgDuration: "-",
      indexedPages: 1,
      conversions: { label: "게임 클리어", count: 0, unit: "판" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
      },
    },
    history: {
      "7d": [],
      "28d": [],
      "90d": [],
    },
    queryType: "market_research",
    topQueries: [
      { query: "지뢰찾기", rank: "타깃", clicks: 0, impressions: 436300, ctr: 0.0, status: "국내 월 43.6만회 (구글 36.8만 + 네이버 6.8만) 🔥" },
      { query: "웹 지뢰찾기", rank: "타깃", clicks: 0, impressions: 14200, ctr: 0.0, status: "무설치 브라우저 타깃 (공략 1순위)" },
      { query: "구글 지뢰찾기", rank: "타깃", clicks: 0, impressions: 38000, ctr: 0.0, status: "공략 타깃 키워드" },
      { query: "minesweeper online", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "글로벌 영문 틈새 공략" },
    ],
    topPages: [
      { path: "/", title: "웹지뢰찾기 - Classic Windows 98 Minesweeper", views: 0, clicks: 0 },
    ],
    actionItems: [
      "국내 월 43.6만 건 검색량 공략을 위한 온페이지 타이틀 및 보스 키(ESC 엑셀 위장) 메타 디스크립션 최적화",
      "구글 서치 콘솔 등록 및 sitemap.xml 제출, 색인 요청",
      "WebGame Network 내 웹오목(webomok.com)과 교차 프로모션 링크 연계",
    ],
    targetMarket: "한국 (PC 비중 80.8% 압도적) 및 글로벌",
  },
  {
    id: "kimedit",
    name: "KimEdit (vfeed)",
    shortName: "KimEdit",
    domain: "vfeed.vercel.app",
    url: "https://vfeed.vercel.app",
    category: "영상 협업 & 타임코드 피드백 SaaS",
    badge: "신규 런칭",
    icon: "🎬",
    accentColor: "#a855f7",
    stack: "Next.js 15 · Supabase · Cloudflare R2 · Vercel",
    dataStatus: "new",
    telemetrySource: "D1 엣지 실측 비콘 (1st-Party)",
    integrations: {
      gsc: { connected: false, property: "신규 런칭 (측정 준비)", account: "garmgoondev@gmail.com" },
      ga4: { connected: false, property: "신규 런칭 (측정 준비)", stream: "KimEdit Web" },
      cloudflare: { connected: true, type: "R2 Video Bucket + CDN" },
      audit: { status: "완료", issues: 3 },
    },
    overview: {
      clicks28d: 0,
      impressions28d: 0,
      ctr: 0.0,
      avgPosition: 0,
      users28d: 0,
      sessions28d: 0,
      engagementRate: 0,
      avgDuration: "-",
      indexedPages: 1,
      conversions: { label: "피드백 룸 생성", count: 0, unit: "개" },
      periods: {
        "7d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "28d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
        "90d": { clicks: 0, impressions: 0, ctr: 0.0, avgPosition: 0, users: 0, sessions: 0, engagementRate: 0, avgDuration: "-", conversions: 0 },
      },
    },
    history: {
      "7d": [],
      "28d": [],
      "90d": [],
    },
    queryType: "target",
    topQueries: [
      { query: "영상 피드백 플랫폼", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
      { query: "유튜브 타임코드 코멘트", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "공략 목표 키워드" },
      { query: "video collaboration review tool", rank: "타깃", clicks: 0, impressions: 0, ctr: 0.0, status: "글로벌 SaaS 타깃" },
    ],
    topPages: [
      { path: "/", title: "KimEdit - 간편한 영상 피드백 & 협업", views: 0, clicks: 0 },
    ],
    actionItems: [
      "유튜브 크리에이터 및 프리랜서 영상 편집자 커뮤니티 초기 베타 런칭 안내",
      "Stripe 구독 결제 및 Supabase RLS 보안 감사 모니터링 유지",
    ],
    targetMarket: "영상 크리에이터, PD, 프리랜서 편집자 (한국/글로벌)",
  },
];

/**
 * 특정 기간(7d, 28d, 90d)의 실제 실측치 합산 지표를 계산한다.
 */
export function getAggregatedStats(sites = SITES_METRICS, period = "28d") {
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalUsers = 0;
  let totalConversions = 0;
  let totalIndexedPages = 0;
  let activeSites = 0;

  for (const site of sites) {
    const pData = site.overview?.periods?.[period] || {
      clicks: 0,
      impressions: 0,
      users: 0,
      conversions: 0,
    };

    if (typeof pData.impressions === "number") totalImpressions += pData.impressions;
    if (typeof pData.clicks === "number") totalClicks += pData.clicks;
    if (typeof pData.users === "number") totalUsers += pData.users;
    if (typeof pData.conversions === "number") totalConversions += pData.conversions;
    if (typeof site.overview?.indexedPages === "number") totalIndexedPages += site.overview.indexedPages;
    activeSites++;
  }

  const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0;

  return {
    period,
    totalSites: sites.length,
    activeSites,
    totalImpressions,
    totalClicks,
    avgCtr,
    totalUsers,
    totalConversions,
    totalIndexedPages,
    // 호환성 필드
    totalImpressions28d: totalImpressions,
    totalClicks28d: totalClicks,
    totalUsers28d: totalUsers,
  };
}

export function getAllPeriodTotals(sites = SITES_METRICS) {
  return {
    "7d": getAggregatedStats(sites, "7d"),
    "28d": getAggregatedStats(sites, "28d"),
    "90d": getAggregatedStats(sites, "90d"),
  };
}
