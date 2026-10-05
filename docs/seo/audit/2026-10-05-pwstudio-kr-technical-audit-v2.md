# PW Studio (`pwstudio.kr`) 테크니컬 SEO 오디트 및 개선 검증 리포트 (v2)

- **대상 사이트**: PW Studio (`https://pwstudio.kr`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO Site Audit Engine (재오디트 ID: `f081d9f8-18ff-4cef-9718-0ba52749a4e4`, 직전 오디트 ID: `89d5b674-222e-4a6a-b70d-4a06c417c090`)
- **개선 조치 배포**: Cloudflare Pages (`homepage-builder`, 커밋 `7269d29`)
- **크롤링 지표 (개선 후)**: 크롤링 페이지 4개, 평균 응답속도 109ms, 발견된 이슈 **1건 (Critical 0건, Warning 0건, Info 1건)**

---

## 1. 개선 전후 비교 요약

| 지표 | 1차 오디트 (조치 전) | 2차 오디트 (조치 후) | 변동 | 상태 |
| :--- | :---: | :---: | :---: | :--- |
| **총 발견 이슈** | **24건** | **1건** | **▼ 23건 (-95.8%)** | 대폭 개선 |
| **Critical (치명적)** | **4건** | **0건** | **▼ 4건 (-100%)** | **완전 해결** |
| **Warning (경고)** | **16건** | **0건** | **▼ 16건 (-100%)** | **완전 해결** |
| **Info (정보)** | **4건** | **1건** | **▼ 3건 (-75%)** | 1건 유지 (헤딩 순서) |
| **크롤링 대상 페이지** | 8개 (비공개 결제폼 포함) | 4개 (공개 정규 페이지만 수집) | 정규화 완료 | 크롤링 예산 절감 |

---

## 2. 적용된 조치 및 기술적 해결 내역

### ① [Critical 해결] 404 내부 깨진 링크 및 크롤러 낭비 차단
- **원인 분석**: 푸터 및 약관 페이지의 이메일 텍스트가 Cloudflare Scrape Shield를 통과하며 `/cdn-cgi/l/email-protection` (404)으로 링크 변환되어 크롤러가 404 링크를 반복 추적.
- **적용 조치**:
  - `public/robots.txt`를 생성하고 `Disallow: /cdn-cgi/` 규칙을 공식 배포하여 모든 검색 엔진 및 크롤러가 `/cdn-cgi/` 내부 경로를 수집하지 않도록 차단.
- **결과**: `broken-internal-link` 4건 및 `broken-page` 1건 전량 해소.

### ② [Warning 해결] 결제 퍼널(`/checkout`) 검색엔진 색인 제외(noindex) 및 중복 메타 태그 해결
- **원인 분석**: 결제/주문 페이지(`/checkout`, `?plan=package`, `?plan=setupOnly`)가 `"use client"` 및 `<Suspense>`로 감싸져 있어 정적 HTML 파싱 시 0단어(Thin content) 및 H1 누락으로 분류되고, 루트 레이아웃 타이틀/설명이 중복 적용됨.
- **적용 조치**:
  - `src/app/checkout/layout.tsx`를 신설하여 `robots: { index: false, follow: false }` 메타데이터 및 고유 타이틀/설명 적용.
  - `public/robots.txt`에 `Disallow: /checkout` 규칙 추가.
- **결과**:
  - `duplicate-title` (3건), `duplicate-meta-description` (3건), `missing-h1` (3건), `thin-content` (3건), `no-outgoing-links` (3건) 총 15건의 경고 플래그 완전 제거.
  - 비공개 결제 페이지가 검색 색인에서 제외되어 서비스 메인 페이지의 색인 가중치 보존.

### ③ [Info 해결] 약관/정책 페이지 메타 디스크립션 보강
- **원인 분석**: `/terms`, `/privacy`, `/refund` 3개 페이지의 설명문 길이가 32~33자로 최소 권장 길이(80자 이상)에 미달.
- **적용 조치**:
  - `/terms`: 87자 상세 설명문으로 확장.
  - `/privacy`: 89자 개인정보보호 방침 안내문으로 확장.
  - `/refund`: 83자 환불 규정 및 청약 철회 안내문으로 확장.
- **결과**: `meta-description-too-short` 3건 완전 해소.

---

## 3. 잔여 이슈 및 관리 가이드

- **잔여 이슈 (1건 - Info)**:
  - `heading-order-skip` (`https://pwstudio.kr/`): 메인 랜딩 페이지 섹션에서 H1 태그 이후 일부 부제목에 H2 없이 H3가 사용된 웹 접근성(A11y) 가이드성 안내.
  - **영향**: 검색 색인 및 순위에는 직접적 악영향이 없는 경미한 Info 항목이며, 향후 디자인 개편 시 태그 위계(H1 → H2 → H3)를 순차적으로 맞춰주면 자연스럽게 해소됩니다.
