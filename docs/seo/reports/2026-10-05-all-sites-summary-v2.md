# 전체 사이트 SEO 현황 요약 리포트 (v2)

- **작성일**: 2026-10-05
- **중앙 허브**: `https://seo.garmgoon.com`
- **데이터 출처**: OpenSEO Self-hosted (Google Search Console API, DataForSEO API, OpenSEO Site Audit Engine)
- **조회 대상**: OpenSEO 워크스페이스 내 전체 활성 프로젝트 (5개 사이트)
- **GSC 데이터 기준 기간**: 최근 28일 (OpenSEO 대시보드 동기화 기준)

---

## 1. 사이트별 현황 종합 요약

| 프로젝트 | 도메인 | Project ID | GSC 연결 속성 / 소유 계정 | 최근 28일 클릭 | 최근 28일 노출 | 평균 CTR | 평균 순위 | 백링크 / 참조 도메인 | 오디트 상태 | 상태 요약 |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Garmgoon** | `garmgoon.com` | `e0206a78-8f7f-48d6-a056-d885028c14e5` | `sc-domain:garmgoon.com`<br>(`garmgoon@gmail.com`) | 1 | 18 | 5.6% | 10.1 | 454 / 451 | 완료 (56건) | 정상 연동, 노출 대비 높은 CTR(5.6%) 기록 중 |
| **Utah Says** | `utahsays.com` | `992bdb6c-b0eb-480a-b6c2-3238f26c8a52` | `sc-domain:utahsays.com`<br>(`garmgoondev@gmail.com`) | 0 | 0 | 0.0% | - | - | 완료 (14건) | 정상 연동, 최근 검색 유입 및 노출 데이터 부재 |
| **EverydayTutor** | `everydaytutor.net` | `629af3c0-2782-4d60-a13b-104c7cf1e6b6` | `sc-domain:everydaytutor.net`<br>(`garmgoon@gmail.com`) | 1 | 66 | 1.5% | 16.7 | 43 / 40 | 완료 (17건) | 정상 연동, 66회 노출 발생, 대만 시장 타겟 리라이팅 가이드 작성 완료 |
| **PW Studio** | `pwstudio.kr` | `0aa884bf-1249-4a89-b8c9-e215f64bdb31` | `sc-domain:pwstudio.kr`<br>(`garmgoon@gmail.com`) | 0 | 0 | 0.0% | 0.0 | - | **완료 (1건)** | **신규 연동 및 테크니컬 개선 완료**: 404 링크 및 결제폼 noindex 배포로 이슈 24건→1건(Info) 개선 검증 |
| **EcoCarpet Utah** | `new.ecocarpetutah.com` | `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e` | 인증 보류 (데모 사이트) | - | - | - | - | - | 대기 | 프로젝트 등록 완료, 본 도메인(`ecocarpetutah.com`) 정식 오픈 시 일괄 연동 예정 |

---

## 2. 세부 분석 및 최근 업데이트

### ① PW Studio (`pwstudio.kr`) - 신규 연동 & 테크니컬 개선 배포 완료
- **GSC 인증 및 연동**: Orca 브라우저 및 Cloudflare Domain Connect를 통해 `pwstudio.kr` 도메인 소유권(TXT: `google-site-verification=aONOHw2o1gX26u_r5EqrN5bt-seI9t3w9bkuyz-WZq4`) 자동 인증 완료 및 OpenSEO 프로젝트 연결 완료.
- **테크니컬 개선 배포 및 재검증 완료 (Audit ID: `f081d9f8-18ff-4cef-9718-0ba52749a4e4`)**:
  - `public/robots.txt` 신설 및 `Disallow: /checkout`, `Disallow: /cdn-cgi/` 적용 완료.
  - `src/app/checkout/layout.tsx` 신설로 결제 퍼널에 `noindex, nofollow` 및 고유 메타데이터 적용 완료.
  - `/terms`, `/privacy`, `/refund` 3개 정책 페이지 메타 디스크립션을 80자 이상으로 보강 완료.
  - **오디트 재검증 결과**: Critical 0건 (4건 전량 해결), Warning 0건 (16건 전량 해결), 잔여 이슈는 헤딩 순서(Info) 1건만 존재 (-95.8% 이슈 감소).
  - 상세 보고서: [docs/seo/audit/2026-10-05-pwstudio-kr-technical-audit-v2.md](file:///D:/Dev/garmgoon_domain/docs/seo/audit/2026-10-05-pwstudio-kr-technical-audit-v2.md)

### ② EverydayTutor (`everydaytutor.net`)
- **타겟 시장 최적화**: OpenSEO D1 DB를 통해 타겟 국가를 대만(Location Code: 2158, Language: zh-TW)으로 전면 교정 완료.
- **콘텐츠 리라이팅 가이드 (v2)**: 대만 현지 표기법(繁體中文) 및 구글 2026 최신 검색 스펙(FAQ 스키마 리치 결과 폐지)을 반영한 최신 가이드 수립 완료.
- 상세 보고서: [docs/seo/content/2026-10-05-everydaytutor-net-rewrite-guide.md](file:///D:/Dev/garmgoon_domain/docs/seo/content/2026-10-05-everydaytutor-net-rewrite-guide.md)

### ③ Garmgoon (`garmgoon.com`)
- **성과**: 28일 기준 클릭 1회, 노출 18회(CTR 5.6%), 평균 순위 10.1위.
- **백링크 프로필**: 백링크 454개, 참조 도메인 451개로 높은 기초 도메인 점수 유지 중.
- **오디트 제안**: 서브페이지 고유 타이틀 및 메타 디스크립션 보강 필요.
- 상세 보고서: [docs/seo/audit/2026-10-05-garmgoon-com-technical-audit.md](file:///D:/Dev/garmgoon_domain/docs/seo/audit/2026-10-05-garmgoon-com-technical-audit.md)

### ④ Utah Says (`utahsays.com`)
- **성과**: 노출 및 클릭 0건. 심층 진단 리포트 작성 완료.
- **인덱싱 진단**: 사이트맵 및 초기 색인 요청 진행 필요.
- 상세 보고서: [docs/seo/reports/2026-10-05-seo-utahsays-review-report.md](file:///D:/Dev/garmgoon_domain/docs/seo/reports/2026-10-05-seo-utahsays-review-report.md)

### ⑤ EcoCarpet Utah (`new.ecocarpetutah.com`)
- **상태 합의**: 현재 도메인은 데모 사이트이므로 서브도메인 단계에서 불필요하게 DNS/GSC를 변경하지 않고, 향후 본 웹사이트(`ecocarpetutah.com`) 교체 런칭(Cutover) 시점에 한 번에 인증·연동 진행하기로 합의.

---

## 3. 향후 권장 Action Items

1. **[PW Studio 테크니컬 조치]**:
   - 푸터/문의 이메일 링크의 Cloudflare Email Obfuscation 404 링크 해결 (`robots.txt` Disallow `/cdn-cgi/` 적용 권장).
   - 결제 퍼널(`/checkout`)에 `noindex` 메타 태그 삽입하여 품질 평가 저하 방지.
2. **[EverydayTutor 대만 시장 스니펫 적용]**:
   - `docs/seo/content/2026-10-05-everydaytutor-net-rewrite-guide.md` 권장안에 따라 메타 타이틀 및 디스크립션 개편.
3. **[EcoCarpet Utah 런칭 모니터링]**:
   - 향후 `ecocarpetutah.com` 본 도메인으로의 DNS 전환 시점에 즉시 GSC 도메인 속성 인증 및 OpenSEO 연동 실행.
