// 관리 중인 전체 사이트의 통계 및 SEO 지표 메타데이터
// [절대 원칙] 일체의 가상(Mock/Fake) 수치를 배제하고 100% 실측치 및 시장 조사 데이터만 표기한다.
// 데이터가 없는 신규 서비스나 미수집 항목은 0, -, 또는 '데이터 수집 대기 중'으로 명확히 표기한다.
// 시장 조사 키워드는 '공략 타깃 키워드 (시장 검색량)'로 분리 표기한다.
// 이 파일은 SEO_Hub 주간 리포트 발행 시 scripts/sync-garmgoon-seo-tab.mjs에 의해 자동 동기화됩니다.

export const PERIODS = [
  { id: "7d", label: "최근 7일", shortLabel: "7일", days: 7 },
  { id: "28d", label: "최근 28일", shortLabel: "28일", days: 28, isDefault: true },
  { id: "90d", label: "최근 90일", shortLabel: "90일", days: 90 },
];

export const SEO_SYNC_META = {
  "lastSyncedAt": "2026-10-15T18:33:41.230Z",
  "latestReportDate": "2026-10-12",
  "latestReportFile": "2026-10-12-all-sites-summary-v1.md",
  "gscRange": {
    "startDate": "2026-09-13",
    "endDate": "2026-10-10"
  },
  "totalActionItems": 21
};

export const SITES_METRICS = [
  {
    "id": "everydaytutor",
    "name": "EverydayTutor",
    "shortName": "EverydayTutor",
    "domain": "everydaytutor.net",
    "url": "https://www.everydaytutor.net",
    "category": "과외 매칭 플랫폼 / 글로벌 에듀테크",
    "badge": "실측 연동",
    "icon": "🎓",
    "accentColor": "#3b82f6",
    "stack": "Next.js 14 · Cloudflare Pages · Vercel DNS",
    "dataStatus": "real",
    "telemetrySource": "D1 엣지 실측 비콘 + GSC/GA4",
    "integrations": {
      "gsc": {
        "connected": true,
        "property": "sc-domain:everydaytutor.net",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": true,
        "property": "properties/554632841",
        "stream": "EverydayTutor Web (향상된 측정 ON)"
      },
      "cloudflare": {
        "connected": true,
        "type": "Pages + Email Routing"
      },
      "audit": {
        "status": "완료",
        "issues": 17
      }
    },
    "overview": {
      "clicks28d": 3,
      "impressions28d": 126,
      "ctr": 2.4,
      "avgPosition": 14.6,
      "users28d": 84,
      "sessions28d": 283,
      "engagementRate": 41.3,
      "avgDuration": "-",
      "indexedPages": 24,
      "conversions": {
        "label": "전환 이벤트",
        "count": 0,
        "unit": "건"
      },
      "periods": {
        "7d": {
          "clicks": 2,
          "impressions": 54,
          "ctr": 3.7,
          "avgPosition": 11.4,
          "users": 14,
          "sessions": 44,
          "engagementRate": 25,
          "avgDuration": "-",
          "conversions": 0
        },
        "28d": {
          "clicks": 3,
          "impressions": 126,
          "ctr": 2.4,
          "avgPosition": 14.6,
          "users": 84,
          "sessions": 283,
          "engagementRate": 41.3,
          "avgDuration": "-",
          "conversions": 0
        },
        "90d": {
          "clicks": 3,
          "impressions": 126,
          "ctr": 2.4,
          "avgPosition": 14.6,
          "users": 84,
          "sessions": 283,
          "engagementRate": 41.3,
          "avgDuration": "-",
          "conversions": 0
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/07",
          "impressions": 8,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 7,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 13,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/10",
          "impressions": 9,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ],
      "28d": [
        {
          "date": "09/30",
          "impressions": 15,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/01",
          "impressions": 12,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/02",
          "impressions": 4,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/03",
          "impressions": 6,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/04",
          "impressions": 4,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/05",
          "impressions": 6,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/06",
          "impressions": 7,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 8,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 7,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 13,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/10",
          "impressions": 9,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ],
      "90d": [
        {
          "date": "09/30",
          "impressions": 15,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/01",
          "impressions": 12,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/02",
          "impressions": 4,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/03",
          "impressions": 6,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/04",
          "impressions": 4,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/05",
          "impressions": 6,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/06",
          "impressions": 7,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 8,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 7,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 13,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/10",
          "impressions": 9,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ]
    },
    "queryType": "real",
    "topQueries": [
      {
        "query": "高中英文家教行情",
        "rank": 25.5,
        "clicks": 1,
        "impressions": 14,
        "ctr": 7.1,
        "status": "클릭 발생 🔥"
      },
      {
        "query": "國中英文家教時薪",
        "rank": 25,
        "clicks": 0,
        "impressions": 6,
        "ctr": 0,
        "status": "2페이지 상위"
      },
      {
        "query": "高中英文家教時薪",
        "rank": 25.3,
        "clicks": 0,
        "impressions": 6,
        "ctr": 0,
        "status": "2페이지 중위"
      },
      {
        "query": "國中英文家教行情",
        "rank": 28,
        "clicks": 0,
        "impressions": 4,
        "ctr": 0,
        "status": "2페이지 중위"
      },
      {
        "query": "高中英文家教費用",
        "rank": 15,
        "clicks": 0,
        "impressions": 2,
        "ctr": 0,
        "status": "1페이지 문턱"
      },
      {
        "query": "台北家教行情",
        "rank": 18,
        "clicks": 0,
        "impressions": 2,
        "ctr": 0,
        "status": "2페이지 상위"
      },
      {
        "query": "家教老師",
        "rank": 4,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "Top 5 진입 🔥"
      }
    ],
    "topPages": [
      {
        "path": "/insights/taipei-english-tutor-rates",
        "title": "대만 타이베이 영어 과외 시세 인사이트",
        "views": 78,
        "clicks": 1
      },
      {
        "path": "/insights/taipei-new-taipei-tutor-rates",
        "title": "타이베이·신베이 과외 시급 총정리 (4.9위)",
        "views": 11,
        "clicks": 1
      },
      {
        "path": "/",
        "title": "EverydayTutor 메인 홈",
        "views": 10,
        "clicks": 1
      },
      {
        "path": "/tutors/kaohsiung",
        "title": "가오슝 과외 튜터 목록 (6.8위)",
        "views": 4,
        "clicks": 0
      },
      {
        "path": "/tutors/taichung",
        "title": "타이중 과외 튜터 목록",
        "views": 4,
        "clicks": 0
      }
    ],
    "actionItems": [
      "대만 영어 과외 핵심 칼럼 CTR 리라이팅 적용: 최근 28일 78회 노출(평균 17.7위)에도 클릭 1회(CTR 1.3%)에 머문 /insights/taipei-english-tutor-rates 페이지에 高中英文家教行情(25.5위)·國中英文家教時薪(25.0위)·高中英文家教費用(15.0위) 타깃 메타 타이틀(NT$500~1,200 시세표) 및 H2/H3 학년별 비교표 리라이팅 적용",
      "1페이지 안착 칼럼 기반 내부 링크 클러스터링: 평균 순위 4.9위(CTR 9.1%)에 진입한 /insights/taipei-new-taipei-tutor-rates 본문 상·하단에서 지역·과목별 튜터 랜딩(/tutors/kaohsiung/english, /tutors/taichung/english, /tutors/mathematics)으로 양방향 내부 링크 연결",
      "FAQPage 스키마 배포 및 매칭 신청 전환(CTA) 추적: 대만 학부모 핵심 검색 의도(전공생 vs 전임 강사 시급 차이)를 반영한 FAQPage JSON-LD 마크업을 삽입하고, 칼럼 내 '튜터 무료 매칭 신청' CTA 클릭의 GA4·D1 전환 이벤트 추적 연동"
    ],
    "targetMarket": "대만(zh-TW) 및 글로벌(en)"
  },
  {
    "id": "pwstudio",
    "name": "PW Studio",
    "shortName": "PW Studio",
    "domain": "pwstudio.kr",
    "url": "https://pwstudio.kr",
    "category": "웹 개발 / 디지털 솔루션 스튜디오",
    "badge": "실측 연동",
    "icon": "💻",
    "accentColor": "#8b5cf6",
    "stack": "Next.js App Router · Cloudflare Pages · Turbopack",
    "dataStatus": "real",
    "telemetrySource": "D1 엣지 실측 비콘 + GSC/GA4",
    "integrations": {
      "gsc": {
        "connected": true,
        "property": "sc-domain:pwstudio.kr",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": true,
        "property": "properties/557301461",
        "stream": "PW Studio (G-B2EWMRBHTN)"
      },
      "cloudflare": {
        "connected": true,
        "type": "Pages Custom Domain + DNS"
      },
      "audit": {
        "status": "완료 (이슈 95.8% 감소)",
        "issues": 1
      }
    },
    "overview": {
      "clicks28d": 0,
      "impressions28d": 5,
      "ctr": 0,
      "avgPosition": 3.2,
      "users28d": 29,
      "sessions28d": 30,
      "engagementRate": 13.3,
      "avgDuration": "-",
      "indexedPages": 8,
      "conversions": {
        "label": "문의 폼",
        "count": 0,
        "unit": "건"
      },
      "periods": {
        "7d": {
          "clicks": 0,
          "impressions": 5,
          "ctr": 0,
          "avgPosition": 3.2,
          "users": 22,
          "sessions": 22,
          "engagementRate": 9.1,
          "avgDuration": "-",
          "conversions": 0
        },
        "28d": {
          "clicks": 0,
          "impressions": 5,
          "ctr": 0,
          "avgPosition": 3.2,
          "users": 29,
          "sessions": 30,
          "engagementRate": 13.3,
          "avgDuration": "-",
          "conversions": 0
        },
        "90d": {
          "clicks": 0,
          "impressions": 5,
          "ctr": 0,
          "avgPosition": 3.2,
          "users": 29,
          "sessions": 30,
          "engagementRate": 13.3,
          "avgDuration": "-",
          "conversions": 0
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "28d": [
        {
          "date": "10/06",
          "impressions": 2,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 3,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "90d": [
        {
          "date": "10/06",
          "impressions": 2,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 3,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ]
    },
    "queryType": "real",
    "topQueries": [
      {
        "query": "pw studio",
        "rank": 1,
        "clicks": 0,
        "impressions": 2,
        "ctr": 0,
        "status": "GSC 실측 Top 3 진입 🔥"
      },
      {
        "query": "소상공인 웹사이트 제작",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "공략 목표 키워드"
      },
      {
        "query": "반응형 웹 구축 스튜디오",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "공략 목표 키워드"
      }
    ],
    "topPages": [
      {
        "path": "/",
        "title": "PW Studio 메인 (평균 1.5위)",
        "views": 38,
        "clicks": 0
      },
      {
        "path": "/refund",
        "title": "환불 및 취소 정책 (평균 10.0위 색인)",
        "views": 11,
        "clicks": 0
      }
    ],
    "actionItems": [
      "비브랜드 상업성 키워드 랜딩·비교 칼럼 발행: 현재 GSC 노출(5회, 평균 3.2위)이 브랜드명(pw studio 1.0위)에 집중되어 있으므로, 소상공인 홈페이지 제작 비용, 반응형 웹사이트 외주 견적 등 고의도 상업 키워드 타깃 인사이트 글 3편 발행",
      "GSC 핵심 페이지 수동 색인 요청 및 네이버 서치어드바이저 연동: 포트폴리오(/portfolio) 및 서비스 소개 페이지의 Google Search Console URL 검사 색인 생성 요청과 함께, 국내 소상공인 검색 비중이 높은 네이버 서치어드바이저 사이트맵(sitemap.xml) 제출",
      "문의 전환(Lead) 퍼널 이벤트 실측 트래킹 고도화: GA4(G-B2EWMRBHTN) 최근 28일 유입(29명, 30세션) 및 D1 실측 방문(14명) 대비 참여율 개선을 위해 히어로 섹션 포트폴리오 미리보기 배치 및 상담 문의 폼 제출(generate_lead) 전환 이벤트 연동"
    ],
    "targetMarket": "한국(ko-KR) 소상공인 & 비즈니스"
  },
  {
    "id": "utahsays",
    "name": "Utah Says",
    "shortName": "Utah Says",
    "domain": "utahsays.com",
    "url": "https://utahsays.com",
    "category": "유타 로컬 커뮤니티 & 리서치 미디어",
    "badge": "실측 연동",
    "icon": "🏔️",
    "accentColor": "#10b981",
    "stack": "Next.js 16 · Cloudflare Workers / D1 / KV",
    "dataStatus": "real",
    "telemetrySource": "Cloudflare D1 엣지 비콘 (1st-Party) + GSC/GA4",
    "integrations": {
      "gsc": {
        "connected": true,
        "property": "sc-domain:utahsays.com",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": true,
        "property": "properties/557341522",
        "stream": "Utah Says (G-QL3BW0J3KY)"
      },
      "cloudflare": {
        "connected": true,
        "type": "Worker Custom Domain + KV"
      },
      "audit": {
        "status": "완료",
        "issues": 14
      }
    },
    "overview": {
      "clicks28d": 1,
      "impressions28d": 84,
      "ctr": 1.2,
      "avgPosition": 27,
      "users28d": 126,
      "sessions28d": 141,
      "engagementRate": 24.8,
      "avgDuration": "-",
      "indexedPages": 25,
      "conversions": {
        "label": "설문 투표",
        "count": 29,
        "unit": "건"
      },
      "periods": {
        "7d": {
          "clicks": 1,
          "impressions": 84,
          "ctr": 1.2,
          "avgPosition": 27,
          "users": 74,
          "sessions": 83,
          "engagementRate": 18.1,
          "avgDuration": "-",
          "conversions": 29
        },
        "28d": {
          "clicks": 1,
          "impressions": 84,
          "ctr": 1.2,
          "avgPosition": 27,
          "users": 126,
          "sessions": 141,
          "engagementRate": 24.8,
          "avgDuration": "-",
          "conversions": 29
        },
        "90d": {
          "clicks": 1,
          "impressions": 84,
          "ctr": 1.2,
          "avgPosition": 27,
          "users": 126,
          "sessions": 141,
          "engagementRate": 24.8,
          "avgDuration": "-",
          "conversions": 29
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/07",
          "impressions": 31,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 20,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 12,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/10",
          "impressions": 10,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "28d": [
        {
          "date": "10/06",
          "impressions": 11,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 31,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 20,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 12,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/10",
          "impressions": 10,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "90d": [
        {
          "date": "10/06",
          "impressions": 11,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/07",
          "impressions": 31,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/08",
          "impressions": 20,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 12,
          "clicks": 1,
          "users": 0
        },
        {
          "date": "10/10",
          "impressions": 10,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 4
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ]
    },
    "queryType": "real",
    "topQueries": [
      {
        "query": "best of utah 2026",
        "rank": 8.3,
        "clicks": 0,
        "impressions": 3,
        "ctr": 0,
        "status": "1페이지 진입 🔥"
      },
      {
        "query": "utah slang",
        "rank": 10.7,
        "clicks": 0,
        "impressions": 3,
        "ctr": 0,
        "status": "1페이지 문턱"
      },
      {
        "query": "midway ut",
        "rank": 71,
        "clicks": 0,
        "impressions": 2,
        "ctr": 0,
        "status": "GSC 실측 노출"
      },
      {
        "query": "best ski mountains in utah",
        "rank": 75,
        "clicks": 0,
        "impressions": 2,
        "ctr": 0,
        "status": "GSC 실측 노출"
      },
      {
        "query": "best sunset spot",
        "rank": 5,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "Top 5 진입 🔥"
      },
      {
        "query": "best burger place",
        "rank": 11,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "1페이지 문턱"
      },
      {
        "query": "best places to watch the sunset",
        "rank": 11,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "1페이지 문턱"
      }
    ],
    "topPages": [
      {
        "path": "/best-of-utah",
        "title": "Best of Utah 2026 (평균 7.0위, 첫 클릭)",
        "views": 42,
        "clicks": 1
      },
      {
        "path": "/best-pro-sports-team-in-utah",
        "title": "Best Pro Sports Team in Utah (17.3위)",
        "views": 28,
        "clicks": 0
      },
      {
        "path": "/best-utah-slang",
        "title": "Best Utah Slang (10.3위)",
        "views": 24,
        "clicks": 0
      },
      {
        "path": "/best-utah-snack",
        "title": "Best Utah Snack (6.3위)",
        "views": 19,
        "clicks": 0
      },
      {
        "path": "/best-sunset-spot-in-utah",
        "title": "Best Sunset Spot in Utah (8.0위)",
        "views": 16,
        "clicks": 0
      }
    ],
    "actionItems": [
      "1페이지 문턱(5~17위) 인기 투표 페이지 CTR 스니펫 최적화: 노출이 빠르게 증가 중인 /best-pro-sports-team-in-utah(17.3위, 9회 노출), /best-utah-slang(10.3위), /best-utah-snack(6.3위), /best-sunset-spot-in-utah(8.0위) 타이틀에 실시간 투표수와 연도(2026 Live Ranking)를 반영해 클릭률 제고",
      "고수요 레저·관광 타깃 페이지(40~80위권) 로컬 컨텍스트 보강: 평균 69~79위권에 머문 /best-ski-resorts-in-utah(8회 노출, 69.1위) 및 /best-national-park-in-utah(79.7위) 하단에 유타 현지인 투표 근거 요약, 시즌 팁, 후보지(/c/park-city, /c/sundance-mountain-resort) 내부 링크 추가",
      "시즌성 키워드 선점 및 로컬 커뮤니티 바이럴 루프 확대: 연말 검색 급증 키워드인 /best-christmas-lights-in-utah(현재 29.0위) 2026 일정을 선제 업데이트하고, 투표 완료 직후 Reddit(r/Utah, r/SaltLakeCity) 공유 카드 생성을 유도해 누적 실측 투표(29건) 및 GA4 오가닉 세션(30건) 상승세 가속"
    ],
    "targetMarket": "미국 유타주 로컬 (en-US)"
  },
  {
    "id": "webomok",
    "name": "WebOmok (웹오목)",
    "shortName": "WebOmok",
    "domain": "webomok.com",
    "url": "https://webomok.com",
    "category": "무설치 글로벌 2인용 온라인 오목 웹앱",
    "badge": "실측 연동",
    "icon": "⚪⚫",
    "accentColor": "#6366f1",
    "stack": "WebGame Network · Cloudflare Pages · PeerJS P2P",
    "dataStatus": "real",
    "telemetrySource": "D1 엣지 실측 비콘 + GSC",
    "integrations": {
      "gsc": {
        "connected": true,
        "property": "sc-domain:webomok.com",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": false,
        "property": "D1 1st-Party 비콘 실측 중",
        "stream": "WebOmok Web"
      },
      "cloudflare": {
        "connected": true,
        "type": "Pages + Edge Caching"
      },
      "audit": {
        "status": "완료",
        "issues": 4
      }
    },
    "overview": {
      "clicks28d": 1,
      "impressions28d": 7,
      "ctr": 14.3,
      "avgPosition": 5.9,
      "users28d": 75,
      "sessions28d": 89,
      "engagementRate": 0,
      "avgDuration": "-",
      "indexedPages": 1,
      "conversions": {
        "label": "대국 플레이",
        "count": 3,
        "unit": "판"
      },
      "periods": {
        "7d": {
          "clicks": 1,
          "impressions": 7,
          "ctr": 14.3,
          "avgPosition": 5.9,
          "users": 75,
          "sessions": 89,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 3
        },
        "28d": {
          "clicks": 1,
          "impressions": 7,
          "ctr": 14.3,
          "avgPosition": 5.9,
          "users": 75,
          "sessions": 89,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 3
        },
        "90d": {
          "clicks": 1,
          "impressions": 7,
          "ctr": 14.3,
          "avgPosition": 5.9,
          "users": 75,
          "sessions": 89,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 3
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/09",
          "impressions": 2,
          "clicks": 0,
          "users": 17
        },
        {
          "date": "10/10",
          "impressions": 3,
          "clicks": 1,
          "users": 14
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 16
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 11
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 9
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ],
      "28d": [
        {
          "date": "10/08",
          "impressions": 2,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 2,
          "clicks": 0,
          "users": 17
        },
        {
          "date": "10/10",
          "impressions": 3,
          "clicks": 1,
          "users": 14
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 16
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 11
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 9
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ],
      "90d": [
        {
          "date": "10/08",
          "impressions": 2,
          "clicks": 0,
          "users": 0
        },
        {
          "date": "10/09",
          "impressions": 2,
          "clicks": 0,
          "users": 17
        },
        {
          "date": "10/10",
          "impressions": 3,
          "clicks": 1,
          "users": 14
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 16
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 11
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 8
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 9
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        }
      ]
    },
    "queryType": "real",
    "topQueries": [
      {
        "query": "온라인 대전 오목",
        "rank": 3,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "GSC 실측 Top 3 진입 🔥"
      },
      {
        "query": "웹 오목",
        "rank": 8,
        "clicks": 0,
        "impressions": 1,
        "ctr": 0,
        "status": "1페이지 진입 🔥"
      },
      {
        "query": "오목게임 (공략 타깃 · 시장 검색량)",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 7710,
        "ctr": 0,
        "status": "네이버 월 7,710회 (경쟁도 낮음)"
      },
      {
        "query": "2인용 오목 (공략 타깃 · 시장 검색량)",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 4500,
        "ctr": 0,
        "status": "네이버 월 4,500회 (공략 타깃)"
      }
    ],
    "topPages": [
      {
        "path": "/",
        "title": "WebOmok - 무설치 온라인 2인용 오목 메인 (평균 5.9위)",
        "views": 89,
        "clicks": 1
      }
    ],
    "actionItems": [
      "GSC 첫 실측 유입 키워드(온라인 대전 오목 3위·웹 오목 8위) 타이틀/H1 고정 및 확장: GSC에서 첫 실측 노출(7회)·클릭(1회, 평균 5.9위)이 확인된 핵심 키워드와 네이버 월간 검색량 7,710회(경쟁도 낮음)인 오목게임, 2인용 오목을 결합한 메타 태그·소개 섹션 고도화",
      "대국 완주(game_finish) 전환율 개선 및 재대국 유도: D1 엣지 비콘 기준 실측 방문자 58명(66세션) 중 대국 완료 전환이 1건으로 집계됨에 따라, AI 난이도별 즉시 대국 시작 버튼 가시성 개선 및 P2P 방 생성 대기 경험 점검",
      "글로벌 다국어(ja, zh-TW, en) hreflang 및 렌주룰 FAQ 스키마 적용: 경쟁이 희박한 일본(五目並べ オンライン)·대만 시장 검색 유입 선점을 위해 언어별 고유 메타 디스크립션과 오목 금수 규칙(3·3, 4·4, 장목) FAQPage 구조화 데이터 적용"
    ],
    "targetMarket": "한국, 일본, 대만, 미국 4개 국어 지원"
  },
  {
    "id": "ecocarpet",
    "name": "EcoCarpet Utah",
    "shortName": "EcoCarpet",
    "domain": "new.ecocarpetutah.com",
    "targetDomain": "ecocarpetutah.com",
    "url": "https://new.ecocarpetutah.com",
    "category": "로컬 카펫 & 실내 클리닝 비즈니스",
    "badge": "전환 대기",
    "icon": "✨",
    "accentColor": "#059669",
    "stack": "Next.js · Tailwind CSS · Cloudflare Pages",
    "dataStatus": "staging",
    "telemetrySource": "Cloudflare Pages (본 도메인 전환 대기)",
    "integrations": {
      "gsc": {
        "connected": false,
        "property": "전환 대기 (본 도메인 이전 시)",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": false,
        "property": "전환 대기",
        "stream": "EcoCarpet New Web"
      },
      "cloudflare": {
        "connected": true,
        "type": "Pages Staging Domain"
      },
      "audit": {
        "status": "데모 오디트 완료",
        "issues": 5
      }
    },
    "overview": {
      "clicks28d": 0,
      "impressions28d": 0,
      "ctr": 0,
      "avgPosition": 0,
      "users28d": 0,
      "sessions28d": 0,
      "engagementRate": 0,
      "avgDuration": "-",
      "indexedPages": 14,
      "conversions": {
        "label": "견적 문의",
        "count": 0,
        "unit": "건"
      },
      "periods": {
        "7d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 0,
          "sessions": 0,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "28d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 0,
          "sessions": 0,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "90d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 0,
          "sessions": 0,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        }
      }
    },
    "history": {
      "7d": [],
      "28d": [],
      "90d": []
    },
    "queryType": "market_research",
    "topQueries": [
      {
        "query": "carpet cleaning utah county",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 2400,
        "ctr": 0,
        "status": "유타 카운티 월 2,400회"
      },
      {
        "query": "eco friendly carpet cleaning orem",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 580,
        "ctr": 0,
        "status": "Orem 친환경 월 580회"
      },
      {
        "query": "upholstery cleaning provo",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 720,
        "ctr": 0,
        "status": "Provo 소파/매트리스 월 720회"
      }
    ],
    "topPages": [
      {
        "path": "/",
        "title": "EcoCarpet Utah 친환경 카펫 클리닝 메인",
        "views": 0,
        "clicks": 0
      }
    ],
    "actionItems": [
      "본 도메인(ecocarpetutah.com) DNS 컷오버 및 301 리다이렉트 적용: 기존 워드프레스 사이트의 레거시 URL을 신규 Cloudflare Pages 경로와 1:1 매핑하여 기존 검색 자산 손실 없는 정식 도메인 전환 완료",
      "GSC(sc-domain:ecocarpetutah.com)·GA4·D1 비콘 즉시 개통: 도메인 전환 직후 Google Search Console 사이트맵 제출, GA4 스트림 연결 및 garmgoon.com D1 엣지 텔레메트리 비콘(site: \"ecocarpet\") 삽입으로 견적 문의 전환 실측 개시",
      "유타 카운티 로컬 맵팩(Google Maps) 및 도시별 랜딩 최적화: Google Business Profile(GBP) 웹사이트 링크를 신규 도메인으로 동기화하고, Orem·Provo·Lehi 등 핵심 서비스 지역별 LocalBusiness 스키마 및 시공 전후(Before/After) 리뷰 섹션 보강"
    ],
    "targetMarket": "미국 유타주 (Utah County, Orem, Provo, Salt Lake)"
  },
  {
    "id": "mine98",
    "name": "웹지뢰찾기 (mine98)",
    "shortName": "웹지뢰찾기",
    "domain": "mine98.com",
    "url": "https://mine98.com",
    "category": "무설치 클래식 웹 게임 / 엔터테인먼트",
    "badge": "실측 연동",
    "icon": "💣",
    "accentColor": "#ef4444",
    "stack": "WebGame Network · Next.js 16 · Cloudflare Pages",
    "dataStatus": "real",
    "telemetrySource": "D1 엣지 실측 비콘 + GSC",
    "integrations": {
      "gsc": {
        "connected": true,
        "property": "sc-domain:mine98.com",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": false,
        "property": "D1 1st-Party 비콘 실측 중",
        "stream": "mine98 Web"
      },
      "cloudflare": {
        "connected": true,
        "type": "Pages + Edge Caching (mine98.pages.dev)"
      },
      "audit": {
        "status": "완료",
        "issues": 2
      }
    },
    "overview": {
      "clicks28d": 0,
      "impressions28d": 0,
      "ctr": 0,
      "avgPosition": 0,
      "users28d": 30,
      "sessions28d": 39,
      "engagementRate": 0,
      "avgDuration": "-",
      "indexedPages": 1,
      "conversions": {
        "label": "게임 클리어",
        "count": 0,
        "unit": "판"
      },
      "periods": {
        "7d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 30,
          "sessions": 39,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "28d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 30,
          "sessions": 39,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "90d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 30,
          "sessions": 39,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 5
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 6
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "28d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 5
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 6
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ],
      "90d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 5
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 6
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        }
      ]
    },
    "queryType": "market_research",
    "topQueries": [
      {
        "query": "지뢰찾기",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 436300,
        "ctr": 0,
        "status": "국내 월 43.6만회 (구글 36.8만 + 네이버 6.8만) 🔥"
      },
      {
        "query": "웹 지뢰찾기",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 14200,
        "ctr": 0,
        "status": "무설치 브라우저 타깃 (공략 1순위)"
      },
      {
        "query": "구글 지뢰찾기",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 38000,
        "ctr": 0,
        "status": "공략 타깃 키워드"
      },
      {
        "query": "minesweeper online",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "글로벌 영문 틈새 공략"
      }
    ],
    "topPages": [
      {
        "path": "/",
        "title": "웹지뢰찾기 - Classic Windows 98 Minesweeper",
        "views": 39,
        "clicks": 0
      }
    ],
    "actionItems": [
      "GSC(sc-domain:mine98.com) 색인 가속화 및 고검색량 스니펫 최적화: GSC 소유권 인증 완료 상태에서 sitemap.xml 제출 및 메인 URL 색인 생성을 요청하고, 국내 월 43.6만 회 검색어(지뢰찾기, 웹 지뢰찾기)와 직장인 보스 키(ESC 엑셀 위장) 특장점을 메타 디스크립션에 반영",
      "게임 클리어 전환(game_clear) 텔레메트리 이벤트 연동 점검: D1 비콘 기준 최근 5일간 실측 방문자 28명(32히트)이 정상 유입 중이나 클리어 전환이 0건이므로, 초급·중급·고급 난이도별 게임 클리어 시점의 telemetry_events 전송 로직 점검",
      "지뢰찾기 공략 가이드 섹션 추가 및 WebGame Network 교차 링크: 게임 화면 하단에 검색엔진 봇이 텍스트 맥락을 색인할 수 있도록 지뢰찾기 규칙·패턴 공략(1-2-1, 1-2-2-1 공식) 아코디언 콘텐츠를 추가하고 형제 서비스 webomok.com과 상호 내부 링크 구축"
    ],
    "targetMarket": "한국 (PC 비중 80.8% 압도적) 및 글로벌"
  },
  {
    "id": "kimedit",
    "name": "KimEdit (vfeed)",
    "shortName": "KimEdit",
    "domain": "vfeed.vercel.app",
    "url": "https://vfeed.vercel.app",
    "category": "영상 협업 & 타임코드 피드백 SaaS",
    "badge": "실측 연동",
    "icon": "🎬",
    "accentColor": "#a855f7",
    "stack": "Next.js 15 · Supabase · Cloudflare R2 · Vercel",
    "dataStatus": "real",
    "telemetrySource": "D1 엣지 실측 비콘 (1st-Party)",
    "integrations": {
      "gsc": {
        "connected": false,
        "property": "커스텀 도메인 연결 준비",
        "account": "garmgoondev@gmail.com"
      },
      "ga4": {
        "connected": false,
        "property": "D1 1st-Party 비콘 실측 중",
        "stream": "KimEdit Web"
      },
      "cloudflare": {
        "connected": true,
        "type": "R2 Video Bucket + CDN"
      },
      "audit": {
        "status": "완료",
        "issues": 3
      }
    },
    "overview": {
      "clicks28d": 0,
      "impressions28d": 0,
      "ctr": 0,
      "avgPosition": 0,
      "users28d": 63,
      "sessions28d": 147,
      "engagementRate": 0,
      "avgDuration": "-",
      "indexedPages": 1,
      "conversions": {
        "label": "피드백 룸 생성",
        "count": 0,
        "unit": "개"
      },
      "periods": {
        "7d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 63,
          "sessions": 147,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "28d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 63,
          "sessions": 147,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        },
        "90d": {
          "clicks": 0,
          "impressions": 0,
          "ctr": 0,
          "avgPosition": 0,
          "users": 63,
          "sessions": 147,
          "engagementRate": 0,
          "avgDuration": "-",
          "conversions": 0
        }
      }
    },
    "history": {
      "7d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 30
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 15
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        }
      ],
      "28d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 30
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 15
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        }
      ],
      "90d": [
        {
          "date": "10/09",
          "impressions": 0,
          "clicks": 0,
          "users": 30
        },
        {
          "date": "10/10",
          "impressions": 0,
          "clicks": 0,
          "users": 10
        },
        {
          "date": "10/11",
          "impressions": 0,
          "clicks": 0,
          "users": 15
        },
        {
          "date": "10/12",
          "impressions": 0,
          "clicks": 0,
          "users": 2
        },
        {
          "date": "10/13",
          "impressions": 0,
          "clicks": 0,
          "users": 7
        },
        {
          "date": "10/14",
          "impressions": 0,
          "clicks": 0,
          "users": 3
        },
        {
          "date": "10/15",
          "impressions": 0,
          "clicks": 0,
          "users": 1
        }
      ]
    },
    "queryType": "target",
    "topQueries": [
      {
        "query": "영상 피드백 플랫폼",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "공략 목표 키워드"
      },
      {
        "query": "유튜브 타임코드 코멘트",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "공략 목표 키워드"
      },
      {
        "query": "video collaboration review tool",
        "rank": "타깃",
        "clicks": 0,
        "impressions": 0,
        "ctr": 0,
        "status": "글로벌 SaaS 타깃"
      }
    ],
    "topPages": [
      {
        "path": "/",
        "title": "KimEdit - 간편한 영상 피드백 & 협업",
        "views": 147,
        "clicks": 0
      }
    ],
    "actionItems": [
      "커스텀 도메인 확정 및 GSC·GA4 정식 연동: 현재 vfeed.vercel.app 기준 D1 실측 방문자 61명(137히트, 방문자당 평균 2.25히트로 활성도 상위)이 발생하고 있으므로, 정식 브랜드 도메인 연결 및 Google Search Console·GA4 속성 등록 추진",
      "영상 편집 피드백 핵심 전환(room_created) 이벤트 실측 연동: 높은 페이지 열람(61명 / 137히트)이 실제 프로젝트 생성 및 타임코드 코멘트 작성으로 이어지는지 측정하기 위해 피드백 룸 생성 시 D1 텔레메트리 전환 이벤트 호출 추가",
      "타깃 직군(유튜브 편집자·외주 PD) 검색 유입용 유스케이스 랜딩 보강: 영상 타임코드 피드백 툴, 유튜브 편집 수정 요청 정리, Frame.io 대안 무료 협업툴 키워드를 타깃으로 한 기능 비교 섹션과 SoftwareApplication JSON-LD 구조화 데이터 마크업 적용"
    ],
    "targetMarket": "영상 크리에이터, PD, 프리랜서 편집자 (한국/글로벌)"
  }
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
