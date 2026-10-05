# Utah Says (`utahsays.com`) 테크니컬 SEO 오디트 리포트

- **대상 사이트**: Utah Says (`https://utahsays.com`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO Site Audit Crawler (50개 페이지 전수 크롤링) & HTTP 실시간 헤더 검사
- **크롤링 지표**: 크롤링 페이지 50개, 평균 응답속도 154ms, 발견된 이슈 87건 (Warning 5건, Info 82건)
- **분석 한계**: 크롤러 페이지 예산(50페이지) 내에서 수행되었으며, 인증이 필요한 비공개 페이지는 제외됨.

---

## 1. 종합 진단 요약 및 긴급 조치 사항 (P0)

> [!CAUTION]
> **긴급 (P0): 전 페이지 Canonical 태그가 `http://localhost:3000`으로 하드코딩되어 색인 차단 중**
> 
> Utah Says의 최근 28일 Google Search Console 노출 및 클릭이 0건이었던 직접적인 원인이 확인되었습니다.
> 현재 배포된 프로덕션 사이트의 전 페이지(50개 페이지 전수)에 `<link rel="canonical" href="http://localhost:3000/..."/>`이 출력되고 있습니다.
> Google 봇은 이 태그를 읽고 `https://utahsays.com`의 모든 문서를 로컬호스트의 중복 페이지로 취급하여 **검색 색인(Indexing) 대상에서 제외**하고 있습니다.

---

## 2. Action Items 및 권장 수정 방법

### [P0] 전 페이지 Canonical URL 기준 도메인 수정

- **영향받는 URL**: 전체 URL (예: `/`, `/about`, `/explore`, `/best-of-utah`, `/best-hikes-in-utah`, 각 설문 페이지 등 50개 이상 전 페이지)
- **문제 근거**:
  ```html
  <!-- 현재 출력 중인 태그 -->
  <link rel="canonical" href="http://localhost:3000/best-hikes-in-utah"/>
  ```
- **SEO 영향**: Google 및 Bing 검색 로봇이 사이트 전체를 유효한 검색 결과로 등록하지 않고 누락 처리함.
- **권장 수정 방법**:
  - 사이트의 메타데이터 생성 로직(Next.js의 `metadataBase` 또는 프레임워크 환경변수)에서 기준 URL을 환경변수로 관리하거나, 프로덕션 배포 시 `https://utahsays.com`으로 지정되도록 수정.
  - Next.js의 경우 `app/layout.tsx`:
    ```typescript
    export const metadata = {
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://utahsays.com'),
      // ...
    };
    ```
- **수정 후 확인 방법**:
  - `curl -s https://utahsays.com | grep canonical` 실행 시 `<link rel="canonical" href="https://utahsays.com"/>`로 반환되는지 확인.
  - Google Search Console URL 검사 도구에서 실시간 URL 테스트 시 "사용자 선언 표준 URL: https://utahsays.com/..."으로 정상 인식되는지 확인 후 '색인 생성 요청' 클릭.

---

### [P1] 타이틀 태그 길이 최적화 (27개 페이지)

- **영향받는 URL**: 
  - `/best-beginner-hike-in-utah` (`Best Beginner Hike in Utah (2026) — Voted by Utah Locals | Utah Says` - 68자)
  - `/best-coffee-shop-in-salt-lake-city` (`Best Coffee Shops in Salt Lake City (2026) — Local Vote | Utah Says` - 66자)
  - `/best-national-park-in-utah` (`Best National Park in Utah (2026) — The Mighty 5 Ranked by Locals | Utah Says` - 77자)
  - `/which-utah-city-would-survive-a-zombie-apocalypse` (94자) 외 총 27개 페이지
- **문제 근거**: 데스크톱 및 모바일 검색 결과 스니펫의 타이틀 표시 한도(약 60자, 580px)를 초과하여 검색 결과에서 말줄임표(`...`)로 잘림.
- **SEO 영향**: 핵심 키워드나 브랜딩이 잘려 노출되어 검색자의 신뢰도 및 클릭률(CTR) 저하 유발.
- **권장 수정 방법**:
  - 타이틀 공통 접미사 포맷 간소화:
    - 기존: `Best National Park in Utah (2026) — The Mighty 5 Ranked by Locals | Utah Says`
    - 권장: `Best National Parks in Utah (2026) Ranked | Utah Says` (53자)
- **수정 후 확인 방법**: SERP 시뮬레이터 또는 OpenSEO 오디트 재실행 시 'Title too long' 경고 해소 여부 확인.

---

### [P2] 씬 콘텐츠(Thin Content) 및 메타 설명문 보강 (5개 페이지)

- **영향받는 URL**:
  - `/people` (단어 수: 121단어)
  - `/provo` (단어 수: 125단어)
  - `/right-now` (단어 수: 128단어)
  - `/sports` (단어 수: 129단어)
  - `/st-george` (단어 수: 135단어)
- **문제 근거**: 페이지 내 유의미한 본문 텍스트가 150단어 미만으로 매우 적고, 메타 설명문(Meta Description)이 누락되었거나 너무 짧음.
- **SEO 영향**: 검색 엔진이 품질 낮은 페이지(Low Quality Thin Content)로 분류하여 크롤링 우선순위를 낮춤.
- **권장 수정 방법**:
  - 각 카테고리/지역 페이지 상단에 해당 주제 소개문 및 투표 참여 안내 텍스트(2~3문장, 약 80~100단어) 추가.
  - 고유한 120~150자 분량의 영문 메타 설명문 작성.
- **수정 후 확인 방법**: OpenSEO 재오디트 시 'Thin content' 경고 제거 확인.

---

## 3. 사이트맵 및 색인 복구 로드맵

1. **배포**: Canonical 태그 `http://localhost:3000` 버그 핫픽스 배포.
2. **사이트맵 점검**: `https://utahsays.com/sitemap.xml`이 정상 응답하는지 확인하고 GSC에 제출.
3. **GSC 색인 요청**: Search Console URL 검사 도구를 통해 홈(`/`), 주요 허브(`/explore`, `/best-of-utah`), 상위 인기 투표 5개 페이지에 대해 수동 색인 생성 요청(Request Indexing).
4. **추적**: 일주일 후 OpenSEO 대시보드에서 `utahsays.com`의 노출 및 클릭 상승 추이 모니터링.
