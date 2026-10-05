# PW Studio (`pwstudio.kr`) 테크니컬 SEO 오디트 리포트

- **대상 사이트**: PW Studio (`https://pwstudio.kr`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO Site Audit Crawler (Audit ID: `89d5b674-222e-4a6a-b70d-4a06c417c090`)
- **크롤링 지표**: 크롤링 페이지 8개, 평균 응답속도 76ms, 발견된 이슈 24건 (Critical 4건, Warning 16건, Info 4건)
- **분석 한계**: 크롤러는 자바스크립트 비렌더링 모드로 실행되어 정적 HTML 기반 링크와 메타 태그 위주로 분석됨. 클라이언트 사이드 단독 렌더링(CSR) 폼 요소는 텍스트 분량에서 제외될 수 있음.

---

## 1. 종합 진단 요약

`pwstudio.kr`은 평균 응답속도 76ms로 가볍고 신속한 초기 로딩 속도를 유지하고 있습니다.
그러나 주요 페이지 전반에 걸쳐 Cloudflare 이메일 보호 링크(`/cdn-cgi/l/email-protection`)가 404 에러를 유발하는 치명적 내부 링크 깨짐 이슈(Critical)가 존재하며, 결제/주문 퍼널 페이지(`/checkout` 및 쿼리스트링 파생 URL)가 중복 메타 태그, H1 누락, 본문 텍스트 부족 상태로 인덱싱에 무방비 노출되어 있어 색인 효율을 저해하고 있습니다.

---

## 2. Action Items 및 권장 수정 방법

### [P0 - Critical] 404 내부 깨진 링크 (Broken Internal Link) 해결

- **영향받는 URL**:
  - `https://pwstudio.kr/`
  - `https://pwstudio.kr/terms`
  - `https://pwstudio.kr/privacy`
  - `https://pwstudio.kr/refund`
- **문제 근거**: 푸터나 문의처 영역의 이메일 주소 링크가 Cloudflare의 이메일 난독화(Email Obfuscation) 처리되면서 크롤러가 `https://pwstudio.kr/cdn-cgi/l/email-protection`으로 이동하여 404 HTTP 상태 코드를 반환받음.
- **SEO 영향**: 검색 엔진 봇이 사이트 내부 탐색 중 404 링크를 반복해서 방문하여 크롤링 예산이 낭비되고 사이트 전반의 테크니컬 신뢰도가 하락함.
- **권장 수정 방법**:
  1. Cloudflare 대시보드(Scrape Shield → Email Address Obfuscation) 설정을 확인하거나, 해당 이메일 링크를 일반 `mailto:contact@pwstudio.kr`로 명시적 구성.
  2. 필요 시 `<!--email_off-->contact@pwstudio.kr<!--/email_off-->` 태그를 적용하여 의도치 않은 cdn-cgi 링크 생성을 방지.
  3. `robots.txt`에 `/cdn-cgi/` 경로 크롤링 차단 규칙 추가:
     ```txt
     Disallow: /cdn-cgi/
     ```
- **수정 후 확인 방법**: OpenSEO 재오디트 시 'Broken internal link' 0건 확인.

---

### [P1 - High] 결제 퍼널(`/checkout`) 검색엔진 색인 제외(noindex) 및 Canonical 정비

- **영향받는 URL**:
  - `https://pwstudio.kr/checkout`
  - `https://pwstudio.kr/checkout?plan=package`
  - `https://pwstudio.kr/checkout?plan=setupOnly`
- **문제 근거**:
  - `duplicate-title`: 3개 URL 모두 동일한 타이틀 공유
  - `duplicate-meta-description`: 동일한 메타 설명 공유
  - `missing-h1`: 3개 URL 모두 `<h1>` 태그 누락
  - `thin-content`: 검색 엔진 관점에서 본문 텍스트 0단어(Thin Content)로 분류
  - `no-outgoing-links`: 외부 및 내부 탈출 링크 부재
- **SEO 영향**: 검색 의도가 없는 비공개 결제 폼 페이지가 중복 색인되어 핵심 서비스/랜딩 페이지의 검색 점수를 희석(Cannibalization)시키고 구글 품질 평가에 부정적 영향.
- **권장 수정 방법**:
  - `/checkout` 및 하위 파라미터 페이지의 `<head>`에 `noindex` 메타 태그 추가:
    ```html
    <meta name="robots" content="noindex, nofollow" />
    ```
  - 또는 `robots.txt`에 체크아웃 경로 차단 추가:
    ```txt
    Disallow: /checkout
    ```
  - 정규 URL 설정이 필요한 경우 대표 URL(`https://pwstudio.kr/checkout`)로 canonical 링크 통일:
    ```html
    <link rel="canonical" href="https://pwstudio.kr/checkout" />
    ```
- **수정 후 확인 방법**: OpenSEO 재오디트 시 Duplicate title/description 및 Thin content 경고 해소 확인.

---

### [P2 - Medium] 정책/약관 페이지 메타 디스크립션 보강 (3개 페이지)

- **영향받는 URL**:
  - `https://pwstudio.kr/terms` (길이: 33자)
  - `https://pwstudio.kr/privacy` (길이: 32자)
  - `https://pwstudio.kr/refund` (길이: 32자)
- **문제 근거**: 메타 디스크립션 길이가 30자 내외로 권장 최소 길이(80자 이상)에 미달하여 'Meta description too short' 플래그 발생.
- **SEO 영향**: 검색 엔진 결과 화면(SERP)에서 약관 페이지가 검색될 때 신뢰도 있는 스니펫 제공 실패.
- **권장 수정 방법**:
  - 각 법적 고지 페이지별로 서비스명과 핵심 규정을 포함한 80~120자 수준의 설명문 작성:
    - `/terms`: `PW Studio 웹사이트 제작 및 솔루션 이용에 관한 기본 약관, 서비스 제공 범위, 권리와 의무 사항을 투명하게 안내합니다.`
    - `/privacy`: `PW Studio는 고객의 개인정보를 소중히 보호하며, 개인정보보호법에 준수한 수집 목적 및 처리 방침을 안내합니다.`
    - `/refund`: `PW Studio 솔루션 구매 및 맞춤형 제작 의뢰 시 적용되는 환불 규정 및 청약 철회 절차를 상세히 안내합니다.`
- **수정 후 확인 방법**: 각 페이지의 `<meta name="description">` 수정 후 OpenSEO 재오디트.

---

### [P3 - Low] 메인 페이지 헤딩 계층 구조(Heading Hierarchy) 개선

- **영향받는 URL**: `https://pwstudio.kr/`
- **문제 근거**: `<h1>` 다음 레벨로 `<h2>`를 거치지 않고 곧바로 `<h3>`로 건너뛰는 구조(`heading-order-skip`)가 발견됨.
- **SEO 영향**: 웹 접근성(A11y) 기준 위배 및 스크린 리더/검색 엔진의 문서 구조 파악 효율 저하.
- **권장 수정 방법**:
  - 페이지 상단 헤딩을 `<h1>` (사이트 메인 타이틀) → `<h2>` (주요 기능/포트폴리오 섹션) → `<h3>` (개별 플랜/아이템) 순서대로 계층을 엄격히 준수하도록 HTML 태그 레벨 조정.
- **수정 후 확인 방법**: Lighthouse 접근성 및 OpenSEO Heading order 진단 통과 확인.
