# 전체 사이트 SEO 현황 요약 리포트

- **작성일**: 2026-10-05
- **중앙 허브**: `https://seo.garmgoon.com`
- **데이터 출처**: OpenSEO Self-hosted (Google Search Console API & DataForSEO API)
- **조회 대상**: OpenSEO 워크스페이스 내 전체 활성 프로젝트 (5개 사이트)
- **GSC 데이터 기준 기간**: 최근 28일 (OpenSEO 대시보드 동기화 기준)

---

## 1. 사이트별 현황 종합 요약

| 프로젝트 | 도메인 | Project ID | GSC 연결 속성 | 최근 28일 클릭 | 최근 28일 노출 | 평균 CTR | 평균 순위 | 백링크 / 참조 도메인 | 상태 요약 |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Garmgoon** | `garmgoon.com` | `e0206a78-8f7f-48d6-a056-d885028c14e5` | `sc-domain:garmgoon.com` | 1 | 18 | 5.6% | 10.1 | 454 / 451 | 정상 연동, 노출 대비 높은 CTR(5.6%) 기록 중 |
| **Utah Says** | `utahsays.com` | `992bdb6c-b0eb-480a-b6c2-3238f26c8a52` | `sc-domain:utahsays.com` | 0 | 0 | 0.0% | - | - | 정상 연동, 최근 검색 유입 및 노출 데이터 부재 |
| **EverydayTutor** | `everydaytutor.net` | `629af3c0-2782-4d60-a13b-104c7cf1e6b6` | `sc-domain:everydaytutor.net` | 1 | 66 | 1.5% | 16.7 | 43 / 40 | 정상 연동, 66회 노출 발생, CTR 개선 여지 큼 |
| **PW Studio** | `pwstudio.kr` | `0aa884bf-1249-4a89-b8c9-e215f64bdb31` | 미연결 | - | - | - | - | - | 프로젝트 등록 완료, GSC 속성 소유권 인증 대기 |
| **EcoCarpet Utah** | `new.ecocarpetutah.com` | `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e` | 미연결 | - | - | - | - | - | 프로젝트 등록 완료, GSC 속성 소유권 인증 대기 |

---

## 2. 세부 분석 및 사이트별 현황

### ① Garmgoon (`garmgoon.com`)
- **성과**: 28일 기준 클릭 1회, 노출 18회로 노출 대비 5.6%의 양호한 클릭률 기록. 평균 게재 순위는 약 10.1위.
- **백링크 프로필**: 백링크 454개, 참조 도메인 451개로 안정적인 도메인 기본 신뢰도를 확보하고 있음.
- **개선점**: 전체 노출 볼륨이 낮으므로 주요 기술 아티클 및 프로젝트 페이지의 색인 대상 키워드 확장 필요.

### ② EverydayTutor (`everydaytutor.net`)
- **성과**: 28일 기준 노출 66회, 클릭 1회(CTR 1.5%), 평균 게재 순위 16.7위.
- **특징**: `www.everydaytutor.net`으로 301 리디렉션 처리되어 있으며, 대만 시장 대상 콘텐츠(제목: "每日家教｜全台家教資訊搜尋")로 노출량이 점진적으로 잡히고 있음.
- **개선점**: 노출 66회 대비 CTR(1.5%)이 다소 낮으므로 검색 결과에 나타나는 메타 타이틀 및 디스크립션 매핑 최적화 필요.

### ③ Utah Says (`utahsays.com`)
- **성과**: GSC 연결 정상 확인되었으나, 최근 28일간 클릭 0회, 노출 0회로 관측됨.
- **개선점**: 사이트맵 제출 여부, robots.txt 확인 및 Google 인덱싱(색인) 요청 상태 점검 필요.

### ④ PW Studio (`pwstudio.kr`) & EcoCarpet Utah (`new.ecocarpetutah.com`)
- **현재 상태**: OpenSEO 워크스페이스에 개별 독립 프로젝트로 정상 등록되었으나, 연결된 Google 계정(`garmgoon@gmail.com`, `garmgoondev@gmail.com`)에 해당 도메인의 GSC 속성 소유권이 없어 GSC 데이터가 연동되지 않음.
- **조치 필요**:
  1. Google Search Console 콘솔에서 속성 추가 (`sc-domain:pwstudio.kr`, `https://new.ecocarpetutah.com/`).
  2. DNS TXT 레코드 또는 Cloudflare HTML 메타태그를 통해 소유권 인증 완료.
  3. 인증 완료 후 `https://seo.garmgoon.com`의 각 프로젝트 Settings → Integrations에서 속성 연결.

---

## 3. 통합 SEO 우선순위 Action Items

1. **[GSC 소유권 인증] 미연결 2개 사이트 등록**
   - 대상: `pwstudio.kr`, `new.ecocarpetutah.com`
   - 내용: Google Search Console에서 속성 소유권 인증 후 OpenSEO에 연결하여 5개 전 사이트 통합 모니터링 체계 완성.
2. **[CTR 최적화] EverydayTutor 스니펫 정비**
   - 대상: `everydaytutor.net`
   - 내용: 상위 노출 쿼리에 대한 메타 타이틀과 설명문을 타겟 검색자의 탐색 의도에 맞게 리라이팅하여 CTR을 3% 이상으로 끌어올림.
3. **[색인 점검] Utah Says 인덱싱 진단**
   - 대상: `utahsays.com`
   - 내용: 사이트맵 제출 상태 및 주요 페이지 색인 누락 여부를 확인하고 Search Console을 통해 색인 생성 요청.
4. **[테크니컬 오디트] OpenSEO 크롤러 실행**
   - 대상: `garmgoon.com`, `utahsays.com`, `everydaytutor.net`
   - 내용: OpenSEO 대시보드 내 "Run an audit" 기능 또는 MCP 오디트 도구를 사용하여 깨진 링크(404), 누락된 메타 태그, canonical 설정 점검.
