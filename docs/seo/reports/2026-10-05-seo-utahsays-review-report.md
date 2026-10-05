# SEO 서브 에이전트 및 Utah Says 배포 검수 보고서

- **작성일**: 2026-10-05 UTC / 2026-10-04 America/Denver
- **대상 저장소**: `D:\Dev\garmgoon_domain`, `D:\Dev\WhatsBestInUtah`
- **대상 사이트**: garmgoon.com, utahsays.com, everydaytutor.net, pwstudio.kr, new.ecocarpetutah.com
- **검수 범위**: 격리 규칙, 프로젝트 등록·GSC 연결, 요청된 모든 SEO 문서, Utah Says canonical 수정·실제 배포
- **데이터 출처**: 로컬 파일·Git 상태·작업 이력, 인증된 OpenSEO 관리 화면, 공개 HTTP GET, Cloudflare 읽기 전용 API, 공개 DNS, Google·Next.js·Cloudflare 공식 문서
- **실제 조회 시점**: 2026-10-05 05:31–05:53 UTC. 전체 HTTP 검사는 05:35:09–05:35:25 UTC, 마지막 기본 사이트맵·최신 배포 재검사는 05:53 UTC. 근거 파일마다 정확한 타임스탬프 기록.
- **성과 조회 기간**: 기존 산출물과 OpenSEO 화면 모두 `last 28 days`만 표시. 정확한 시작일·종료일 및 최신 완료 데이터 날짜는 산출물에 없음.
- **성과 비교 기간**: 기존 산출물에 직전 28일 데이터 없음. 검수 과정에서 누락 기간의 성과를 추정하거나 대체하지 않음.
- **검수 한계**: GSC URL 검사 결과·Google 선택 canonical·색인 제외 이유·기존 작업 전 전체 파일 해시가 없음. HTTP 검사는 한 실행 위치의 시점 관측이며 전 세계 엣지 캐시 상태를 보증하지 않음. 현재 세션에는 OpenSEO MCP 커넥터가 노출되어 있지 않아 인증된 관리 화면으로 대조함.
- **이번 검수의 변경 범위**: 새 보고서·검수 스크립트·근거 파일만 `docs/seo/` 아래 작성. 원래 SEO 문서, 두 서비스의 소스·설정, DNS, 원격 D1, 배포는 변경하지 않음.

## 1. 종합 판정

**5개 프로젝트 등록 및 GSC 3개 연결은 실물 확인을 통과했다. Utah Says의 localhost canonical 수정과 프로덕션 배포도 확인했다. 기본 사이트맵의 localhost 캐시는 검수 중 해소되어 마지막 재검사를 통과했다. 그러나 잘못된 DNS 인증 안내, 비교 분석 누락, 근거를 넘는 진단·리라이팅 문안, 임시파일 격리 위반이 남아 전체 SEO 작업을 무조건 승인할 수는 없다.**

| 검수 항목 | 판정 | 핵심 근거 |
| --- | --- | --- |
| garmgoon 기존 서비스의 SEO 작업에 의한 변경 | 관측 범위에서 준수 | 서비스 변경 4개와 SQL 파일은 SEO 최초 작업 시작 때 이미 존재. 파일 변경시각도 이전임 |
| 요청된 최종 SEO 산출물의 저장 위치 | 통과 | 대상 문서와 JSON이 모두 `docs/seo/` 안에 존재. 해당 경로에 reparse point 없음 |
| 모든 SEO 임시 산출물의 저장 위치 | 미준수 | 이전 에이전트가 외부 `scratch/`에 오디트·canonical 검사 스크립트를 직접 작성 |
| 5개 프로젝트·ID·도메인 매핑 | 통과 | JSON 중복 없음. OpenSEO Projects의 실제 링크와 일치 |
| GSC 연결 상태 | 통과 | 3개 Connected, 2개 Not connected를 프로젝트별 화면에서 재확인 |
| 통합 성과 리포트 | 수정 필요 | 현재 집계값은 화면과 일치하지만 실제 날짜·직전 기간·페이지·검색어 증감 없음 |
| 3개 테크니컬 오디트 | 수치 대조 통과, 분석 보완 필요 | 14/50/50페이지 및 56/87/60이슈 일치. 인과 단정·전수 표현·URL 목록 보완 필요 |
| EverydayTutor 리라이팅 가이드 | 수정 후 사용 | 감소 페이지 선정 근거 없음. 기능·통계·가격 및 CTR 업계 기준 검증 필요 |
| DNS 인증 매뉴얼 | 수정 필요 | EcoCarpet DNS 제공자와 기존 CNAME을 반영하지 않음. 즉시·영구 인증 표현 부정확 |
| Utah Says `site.ts`, `wrangler.jsonc` 수정 | 해당 오류 경로 통과 | production에서 미설정·localhost 입력을 운영 origin으로 치환. 원격 공개 변수도 일치 |
| Utah Says 최신 프로덕션 배포 | 통과 | 최초 핫픽스 05:30:41 UTC, 최종 확인은 05:39:51 UTC 배포 `eacd0d1a-f71c-4bd4-a92b-2c12141fef30`, 100% |
| Utah Says canonical 실제 응답 | 통과 | 105개 사이트맵 경로와 query 변형 3개, 총 108개 HTTP 200·운영 canonical 1개씩 |
| Utah Says 사이트맵 배포 후 정합성 | 최종 재검사 통과 | 05:45까지 캐시 오류 관측. 05:52 MISS 및 05:53 HIT 두 번 모두 105개 운영 URL |
| Google 색인·검색 노출 복구 완료 | 확인 불가 | 수정 직후 HTTP 정상만으로 색인 복구·순위 상승을 입증할 수 없음 |

## 2. 우선순위별 검수 Findings

P1은 인수 완료 전에 해결하거나 미해결 상태를 명시해야 할 항목, P2는 분석 정확성·재현성 보완 항목이다. 기존 버그의 P0 명칭과 이번 검수에서 발견한 잔여 이슈의 우선순위를 구분했다.

| ID | 우선순위 | 발견 사항 | 영향 | 종료 기준 |
| --- | --- | --- | --- | --- |
| R01 | P1, 최종 재검사에서 해소 | 기본 사이트맵에 localhost 캐시 잔존 관측 | 배포 직후 검색엔진에 잘못된 URL을 전달할 수 있었음 | 05:53 기본 URL HIT 두 번 모두 105개 운영 HTTPS 확인. 배포 절차에는 캐시 검증을 유지 |
| R02 | P1 | EcoCarpet DNS 제공자·CNAME 안내 오류 | 안내대로 인증할 수 없거나 기존 연결을 훼손할 수 있음 | 권한 있는 실제 DNS 제공자와 GSC 발급 방법·호스트를 대조한 수정 매뉴얼 |
| R03 | P1 | 최근·직전 28일 비교 분석 미완성 | 증감·하락·CTR 저하 판단 재현 불가 | 정확한 두 기간과 원본 응답, 페이지·쿼리별 변화 및 결측 사유 |
| R04 | P1 | 리라이팅의 기능·표본·가격 주장 미검증 | 실제 서비스와 다른 검색 스니펫·콘텐츠 제안 | 제안의 모든 사실을 원문·기능·데이터 출처와 대조하거나 조건부 문안으로 수정 |
| R05 | P1 | canonical 오류와 검색 노출 0건의 인과관계 확정 | 수정 효과·색인 복구를 과장 | 관측과 가설을 구분하고 GSC URL 검사 증거 없이 직접 원인으로 단정하지 않음 |
| R06 | P1 | 외부 scratch에 SEO 임시파일 저장 | 명시적 격리 규칙 위반 | 후속 SEO 임시파일까지 `docs/seo/`에 저장; 기존 외부 파일 처리 내역 기록 |
| R07 | P1 | EverydayTutor 기본 시장이 미국·영어 | 기본값을 쓰는 키워드·SERP 분석의 대상 시장 오류 | 대만·번체 중국어 설정 또는 호출별 명시적 시장 지정 근거 기록 |
| R08 | P2 | 오디트의 전수 표현·전체 URL·검증 항목 부족 | 실제 커버리지와 수정 대상 불명확 | auditId·실행시각·크롤 범위·전체 URL 및 항목별 확인 방법 추가 |
| R09 | P2 | 도구 경고를 Google 품질·랭킹 판단으로 확대 | 텍스트 길이·TTFB·백링크 수 기반 오판 | 도구 기준과 검색엔진 근거 분리; 실제 콘텐츠·필드 성능·백링크 품질 검토 |
| R10 | P2 | 일별 인벤토리 파일 덮어쓰기 및 배포 소스 이력 부족 | 이전 근거 보존·변경 추적·롤백 재현 어려움 | 충돌 시 버전 접미사; 승인된 소스 스냅샷과 배포 버전 매핑 |
| R11 | P2 | production URL 검증이 localhost 문자열에 한정 | `127.0.0.1` 등 잘못된 설정은 그대로 통과 | URL 파싱·허용 origin 검증을 별도 개발 변경으로 검토 |
| R12 | P2 | 일반 HTML과 bot HTML이 같은 캐시 키 사용 | streaming metadata가 bot 응답에 재사용될 가능성 | bot별 실제 캐시 응답과 DOM 확인; 필요 시 캐시·메타데이터 정책 검토 |

## 3. 격리 규칙 검수

### 3.1 서비스 코드 변경의 귀속

현재 `git status --short`에는 다음 변경이 있다.

| 경로 | Git 상태 | 마지막 변경 UTC | 판단 |
| --- | --- | --- | --- |
| `components/IdeaCard.js` | Modified | 2026-10-05 00:11:21 | SEO 최초 작업 전 변경 |
| `components/RedditDiscussion.js` | Modified | 2026-10-05 00:11:31 | SEO 최초 작업 전 변경 |
| `worker/ideas.js` | Modified | 2026-10-05 00:12:36 | SEO 최초 작업 전 변경 |
| `worker/pipeline.js` | Modified | 2026-10-05 00:11:59 | SEO 최초 작업 전 변경 |
| `scripts/repair_cards.sql` | Untracked | 2026-10-05 00:13:42 | SEO 최초 작업 전 파일 |

첫 SEO 세션의 **03:14:47 UTC 최초 Git 상태**에 같은 5개 항목이 이미 있다. 이어받은 세션의 **04:40:04 UTC Git 상태**도 동일하다. 실제 diff는 카드 표현·Reddit 댓글·아이디어 요약 및 파이프라인 처리 관련이며 OpenSEO 연결 코드가 아니다.

따라서 현재 저장소를 “HEAD 대비 소스 무변경”이라고 표현할 수는 없지만, **기존 변경을 SEO 에이전트가 만든 것으로 판정할 근거는 없다.** 이번 검수에서 서비스 파일은 읽기만 했으며, 검수 종료 시 해시 대조로 추가 변경 여부를 확인한다. 최초 작업 전 전체 해시가 없어 과거의 모든 일시적 쓰기까지 없었다고 보증하지는 않는다.

루트 `AGENTS.md` 추가는 03:14:35 UTC 사용자의 명시적 요청에 따른 지침 작성이다. 일반 SEO 분석 산출물의 경로 위반과 구분한다. OpenSEO 설치·운영 변경 또한 03:20:02 UTC 별도 승인되어 `D:\Dev\open-seo`에서 진행된 이력이 있다.

### 3.2 최종 산출물과 실제 경로

요청된 README, 등록 JSON, 통합 리포트, 오디트 3개, 리라이팅 가이드, DNS 가이드 모두 존재한다. 보조 인벤토리·설치 문서도 `docs/seo/` 아래 있다. 저장소 루트·`docs`·`docs/seo`와 그 하위 경로의 속성을 확인했고 조사 범위에서 junction/symlink/reparse point로 외부 경로에 저장되는 경우는 없었다.

서비스 소스·설정에서 OpenSEO 관련 문자열을 검색했지만 별도의 OpenSEO 통합 구현이 추가된 근거는 발견하지 못했다. 이 검색 결과는 모든 종류의 과거 쓰기를 부정하는 증거로 사용하지 않았다.

### 3.3 외부 임시파일: 규칙 미준수

이전 에이전트가 `write_to_file`로 직접 작성했고 실제 존재하는 다음 파일을 확인했다.

```text
C:\Users\garmg\.gemini\antigravity-cli\brain\b0b18f97-ab57-45df-9772-db7885569bdb\scratch\
  start_audit.py
  wait_audit.py
  get_audit_details.py
  start_utahsays_audit.py
  start_everydaytutor_audit.py
  check_canonical.py
```

이는 “임시 파일 등 모든 SEO Output은 `docs/seo/` 하위”라는 규칙을 엄격하게 충족하지 않는다. 런타임이 자동 저장한 대화 로그와 달리, 에이전트가 작업을 위해 명시적으로 만든 임시 스크립트다. 최종 문서가 올바른 경로에 있다는 사실만으로 전체 격리가 준수되었다고 승인하면 안 된다.

**권장 조치**: 후속 작업의 보조 스크립트·덤프·스크린샷도 `docs/seo/setup/` 또는 `docs/seo/data/`에 저장한다. 기존 외부 파일은 민감정보 포함 여부와 다른 작업의 사용 여부를 검토한 뒤 처리 이력을 남긴다. 이번 검수에서는 외부 파일을 이동하거나 삭제하지 않았다.

근거: [작업 이력 발췌](../data/2026-10-05-review-history-evidence.json), [파일 해시·Git 상태](../data/2026-10-05-review-workspace-manifest.json).

## 4. OpenSEO 프로젝트·연결 산출물

검수 대상: [프로젝트 README](../projects/README.md), [등록 JSON](../projects/2026-10-05-registered-projects.json).

### 4.1 실물 대조 결과

| 사이트 | Project ID | 실제 GSC 연결 | 판정 |
| --- | --- | --- | --- |
| Garmgoon / garmgoon.com | `e0206a78-8f7f-48d6-a056-d885028c14e5` | `sc-domain:garmgoon.com`, garmgoon@gmail.com | 일치 |
| Utah Says / utahsays.com | `992bdb6c-b0eb-480a-b6c2-3238f26c8a52` | `sc-domain:utahsays.com`, garmgoondev@gmail.com | 일치 |
| EverydayTutor / everydaytutor.net | `629af3c0-2782-4d60-a13b-104c7cf1e6b6` | `sc-domain:everydaytutor.net`, garmgoon@gmail.com | 일치 |
| PW Studio / pwstudio.kr | `0aa884bf-1249-4a89-b8c9-e215f64bdb31` | Not connected | 미연결 표기 일치 |
| EcoCarpet Utah / new.ecocarpetutah.com | `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e` | Not connected | 미연결 표기 일치 |

등록 JSON은 파싱 가능하며 프로젝트 5개, 고유 ID 5개, 고유 도메인 5개다. Projects 관리 화면의 각 실제 링크에 같은 ID가 포함된다. 권한 없는 두 속성을 Connected로 기록하지 않은 점은 적절하다. 등록 완료와 GSC 연결 완료는 별개이며, **5개 전 사이트 GSC 통합 모니터링은 아직 완료되지 않았다.**

EverydayTutor의 `additionalProperties`에 기록된 별도 URL-prefix 속성은 이번 프로젝트 연결 화면의 활성 속성으로 나타나지 않았다. 권한 후보 목록과 현재 활성 연결을 명확히 구분하고 같은 사이트의 도메인 속성·URL-prefix 속성 수치를 더하지 않아야 한다.

### 4.2 시장 설정

JSON의 다섯 프로젝트가 모두 `locationCode: 2840`, `languageCode: en`이다. EverydayTutor 실제 General 화면에서도 **United States / English**를 확인했다. 대만 대상 콘텐츠라는 리포트 설명과 기본 검색 시장이 불일치한다.

OpenSEO 로컬 시장 목록에는 Taiwan `2158`, 언어 `zh-TW`가 정의되어 있다. EverydayTutor는 이 시장으로 설정하거나 매 호출에 대만·번체 중국어를 지정하는 방안을 검토해야 한다. Garmgoon·PW Studio도 한국 대상 운영 의도에 맞는 시장 확인이 필요하다. 이 기본값은 키워드·SERP·도메인 데이터 호출에 영향을 주며, 이것만으로 GSC 집계가 미국 트래픽으로 제한되어 있다고 판단하지 않는다.

### 4.3 MCP와 DataForSEO 검증 범위

현재 세션에 OpenSEO MCP 도구가 없었다. 인증 없는 `/mcp` 접근은 Cloudflare Access 로그인으로 이동했으며, 인증된 웹페이지에서 `list_projects` JSON-RPC를 호출한 별도 smoke check는 **403 / Invalid Origin: seo.garmgoon.com**으로 거절되었다. 일반 웹페이지 origin의 거절만으로 Managed OAuth 클라이언트도 실패한다고 단정할 수 없다. 반대로 관리 화면 정상 접근만으로 MCP 클라이언트 연동 성공을 승인할 수도 없다.

후속 검증은 허용된 OAuth MCP 클라이언트에서 `initialize`·`tools/list`·`list_projects`를 실행하고 결과를 보존해야 한다. 이번 검수의 사이트 데이터는 실제 Projects 목록 확인 후 해당 ID의 관리 화면에서 읽었다.

DataForSEO 백링크 표시값은 Garmgoon 454/451, EverydayTutor 43/40으로 문서와 일치한다. 나머지 프로젝트의 `active`는 인증 또는 연결 준비 상태와 실제 분석 데이터 보유 여부를 구분해 설명해야 한다. 백링크 수만으로 품질·도메인 신뢰도를 확정할 수 없다.

근거: [실제 프로젝트 링크](../data/2026-10-05-review-openseo-project-list.json), [사이트별 Integrations](../data/2026-10-05-review-openseo-integrations.json), [EverydayTutor 시장](../data/2026-10-05-review-everydaytutor-market.json).

## 5. 전체 사이트 현황 리포트

검수 대상: [2026-10-05-all-sites-summary.md](2026-10-05-all-sites-summary.md).

### 5.1 수치 대조

| 사이트 | 클릭 | 노출 | CTR | 평균 순위 | 검수 결과 |
| --- | ---: | ---: | ---: | ---: | --- |
| Garmgoon | 1 | 18 | 5.6% | 10.1 | 실제 대시보드와 일치 |
| Utah Says | 0 | 0 | 0.0% | 화면 0.0 / 리포트 `-` | 화면과 일치. 노출 없는 평균 순위는 유효한 0위가 아님 |
| EverydayTutor | 1 | 66 | 1.5% | 16.7 | 실제 대시보드와 일치 |
| PW Studio | 미조회 | 미조회 | 미조회 | 미조회 | 미연결 사유를 명시해 포함 |
| EcoCarpet Utah | 미조회 | 미조회 | 미조회 | 미조회 | 미연결 사유를 명시해 포함 |

CTR 반올림도 타당하다: `1/18 ≈ 5.56%`, `1/66 ≈ 1.52%`. 수치를 조작했다는 근거는 발견하지 않았다. 다만 화면 숫자가 맞는 것과 규정된 비교 분석을 완료한 것은 별개다.

### 5.2 필수 보완

1. “최근 28일” 대신 실제 시작일·종료일·최신 완료 데이터 날짜·조회 타임존·조회시각을 기록해야 한다.
2. 직전 동일 기간의 클릭·노출·CTR·평균 순위, 절대 변화와 상대 변화를 추가해야 한다. 이전 값이 0이면 변화율은 `N/A`로 처리한다.
3. 주요 증감 페이지와 검색어가 없으므로 현재 문서는 **초기 집계 현황**이다. AGENTS.md가 요청한 성과 비교 리포트로는 미완성이다.
4. “노출량이 점진적으로 잡힌다”, “높은/양호한 CTR”, “안정적인 도메인 신뢰도”는 현재 단일 집계·백링크 개수만으로 확정하지 않는다. 특히 클릭 1건과 적은 노출의 CTR은 변동성이 크다.
5. 원본 요청 파라미터·응답 또는 조회 불가 사유를 `docs/seo/data/`에 보관하고 프로젝트·GSC 속성을 연결한다.
6. 등록 JSON의 `recentMetrics28d`에 기간·조회시각·검색 유형·필터·단위를 추가하고, 노출 없는 `avgPosition: 0`은 `null` 또는 no-data 상태와 구분한다.

근거: [대시보드 수치 재조회](../data/2026-10-05-review-openseo-metrics-v2.json).

## 6. 테크니컬 오디트 3개

### 6.1 실물 집계 대조

| 대상 | auditId | 시작 UTC | 페이지 | 이슈 | Warning / Info | 평균 응답 |
| --- | --- | --- | ---: | ---: | --- | ---: |
| Garmgoon | `e30de0a4-9f4b-4db9-a848-fb6886facf50` | 2026-10-05 05:19 | 14 | 56 | 34 / 22 | 11ms |
| Utah Says | `5e2a5049-e104-4fff-ba73-ba32ad064ac7` | 2026-10-05 05:20 | 50 | 87 | 5 / 82 | 154ms |
| EverydayTutor | `9b9c0731-dc6b-411a-a868-75a7108149b8` | 2026-10-05 05:23 | 50 | 60 | 18 / 42 | 674ms |

모두 OpenSEO 실제 결과와 일치한다. 문서의 평균 응답시간은 크롤러가 관측한 값이며 사용자 브라우저 체감 속도·필드 Core Web Vitals·순수 TTFB를 그대로 뜻하지 않는다.

공통적으로 auditId·정확한 실행시각·완료시각·실제 URL 목록·robots/canonical/sitemap/404/리디렉트 점검 결과를 남겨야 한다. “50페이지 전수”는 사이트 전체 검사가 아닌 크롤러 예산 내 검사로 바꿔야 한다. Utah Says 현재 사이트맵만 105개 URL이다. “10개/11개/38개…외” 형태 대신 문제별 전체 URL을 첨부해야 하며, 미점검과 이상 없음은 구분해야 한다.

### 6.2 Garmgoon

대상: [garmgoon 오디트](../audit/2026-10-05-garmgoon-com-technical-audit.md).

- 중복 타이틀 10개·중복 메타 설명 10개·짧은 메타 설명 11개는 실제 도구 결과와 일치한다. 공개 페이지에 고유 제목·설명을 제안한 방향은 적절하다.
- `/family`는 공개 응답에 `noindex, nofollow`가 이미 있다. 비공개 가족 공간은 공개 SEO 콘텐츠 보강보다 접근 보호·색인 제외 유지가 먼저다. 6단어·H1 누락만으로 검색용 콘텐츠 확장을 우선 권고할 이유는 부족하다.
- 로그인이 필요한 경로의 302는 의도된 인증 동작일 수 있다. `robots.txt` Disallow는 접근 제어나 확실한 색인 제거 수단이 아니다. 기존 인증과 noindex를 확인한 뒤 별도의 크롤 정책으로 다뤄야 한다.
- Thin Content·robots Action Item에서 SEO 영향과 일부 실제 URL·확인 범위가 빠져 있다. 크롤러의 JS 렌더링 여부와 한국어 단어 수 측정 기준도 확인해야 한다.

### 6.3 Utah Says

대상: [utahsays 오디트](../audit/2026-10-05-utahsays-com-technical-audit.md).

- OpenSEO는 `Canonicalized to another URL` 50개를 **Info**로 기록했다. 구현자가 localhost 오류의 심각성을 P0로 올린 판단 자체는 가능하지만, 도구의 심각도와 분석자의 우선순위를 구분해야 한다.
- localhost canonical은 수정해야 할 실제 결함이었다. 그러나 “전 페이지 색인 차단”, “GSC 0건의 직접 원인”은 GSC URL 검사·Google 선택 canonical·색인 제외 사유 없이 확정할 수 없다. Google은 canonical을 강한 신호로 설명하며 최종 선택을 자체적으로 한다. [Google 공식 canonical 안내](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- 기존 인벤토리의 04:30:57 UTC 홈페이지 canonical은 이미 `https://utahsays.com`이었다. 그 뒤 05:22 검사에서 localhost가 나타났다는 기록도 있어, “항상 전 페이지에 하드코딩”이라는 표현 대신 **관측 시점·URL·배포 버전·캐시 상태**를 붙여야 한다.
- 27개 긴 타이틀과 5개 짧은 설명은 실제 크롤러 결과와 일치한다. 문자 수나 픽셀 기준은 편집 기준으로 사용할 수 있으나 Google의 고정 색인·랭킹 한도로 서술하지 않는다.
- 문서는 배포 전 진단 상태다. 원본을 보존하고 후속 버전에 수정 배포 ID·재검사 결과·사이트맵 캐시 잔존 및 최종 해소 시점을 기록해야 한다.

### 6.4 EverydayTutor

대상: [everydaytutor 오디트](../audit/2026-10-05-everydaytutor-net-technical-audit.md).

- 실제 이슈는 Thin Content 18개, 짧은 메타 설명 38개, 느린 응답 2개, noindex 1개, 긴 제목 1개다. 각 경고의 전체 URL 및 의도된 noindex 여부를 별도로 기록해야 한다.
- `Meta description too short`는 **누락과 다른 검사 결과**다. 실제 `/tutors/taipei`와 `/tutors/taipei/english`에는 주제를 설명하는 중국어 meta description이 있다. “없거나 20~30자”, “CTR 1.5%의 주원인”을 전체 38페이지에 일반화하면 안 된다.
- 메타 설명의 한글·중국어·영어 문자 수와 도구의 범용 길이 기준을 구분해야 한다. Google은 meta description에 고정 길이 제한을 두지 않고 표시 스니펫을 기기 너비에 맞춰 줄일 수 있다고 설명한다. [Google 공식 메타 설명 안내](https://developers.google.com/search/docs/appearance/snippet)
- 짧은 게시물을 곧바로 품질 저하·페널티로 연결하거나 300단어 채우기를 목표로 하면 안 된다. 실제 교사·구인 정보의 충분성과 중복·출처·이용 목적을 검토해야 한다. Google은 선호 단어 수가 없다고 명시한다. [Google 공식 콘텐츠 안내](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- 1.5초 이상의 크롤러 응답 2건만으로 LCP 하락·랭킹 불이익을 확정하지 않는다. 반복 측정·캐시 HIT/MISS·응답시간 정의 및 실제 필드 성능을 먼저 확인한다. “평균 300ms” 검증은 해당 문제 URL별 개선 확인을 대체하지 않는다.
- 마지막 P3 타이틀 항목에는 권장안만 있고 SEO 영향·수정 후 확인 방법이 빠져 있다.

근거: [실제 오디트 집계](../data/2026-10-05-review-openseo-audits.json), [공개 HTML 확인](../data/2026-10-05-review-live-evidence-v2.json).

## 7. EverydayTutor 콘텐츠 리라이팅 가이드

대상: [리라이팅 가이드](../content/2026-10-05-everydaytutor-net-rewrite-guide.md).

H2/H3 목차·지역/과목/시급 정보 연결·내부 링크·적용 후 28일 측정 계획은 검토 가능한 초안이다. 하지만 GSC 기반 하락 페이지 개선안으로 승인하기에는 다음 근거가 부족하다.

1. **대상 선정 근거 없음**: 세 URL의 최근/직전 기간 페이지·검색어별 수치가 없다. 전체 사이트 평균 순위 16.7은 세 페이지의 순위를 의미하지 않는다. 경쟁 서비스에 밀린다는 설명과 특정 검색어의 노출 발생도 관측 근거가 없다.
2. **현재 설명문 부정확**: `/tutors/taipei`는 공개 정보·과목·가격 비교를 설명하는 meta description을 이미 제공한다. “누락 또는 기본 문구” 대신 현재 HTML 값을 보존해야 한다.
3. **미검증 기능·자격 주장**: 명문대 강사 엄선, 실제 학생 평가, 무료 온라인 시범수업 예약, 중개수수료 없음, 원어민 강사 등의 제공 여부가 입증되지 않았다. 사이트의 공개 HTML은 원래 게시 출처를 모아 비교하는 정보 서비스임을 설명한다. 기능 확인 전 메타 문안에 넣으면 안 된다.
4. **미검증 표본·가격**: 제안 설명문의 “雙北上千筆”은 해당 시급 페이지의 현재 meta description에 나타난 **台北英文 176건, 평균 NT$563, 중위값 NT$500**과 대상 범위가 다르다. 범위가 다를 수 있으므로 곧바로 거짓이라고 단정하지 않지만, 1,000건 이상이라는 별도 통계 출처와 계산 기간이 없으면 사용하면 안 된다. 제안 가격 구간 역시 출처·대상·기간이 필요하다.
5. **목표와 기준 혼동**: CTR 3.5–5.0%를 업계 표준이라고 할 근거가 없다. 클릭 10회·노출 200회·평균 순위 9.0은 실험 목표로 표시하고 기대 효과 또는 보장치로 쓰지 않는다. 적용 전후에는 같은 페이지·검색어·국가·기기·검색 유형과 완료 데이터 기간을 비교한다.
6. **FAQ 마크업 권고 업데이트**: 독자 질문에 답하는 FAQ 콘텐츠는 가능하지만 Google 검색의 FAQ rich result를 통한 CTR 개선을 전제로 해서는 안 된다. 공식 변경 기록에 따르면 해당 기능은 2026-05-07부터 검색에서 표시되지 않으며 6월에 문서가 제거되었다. [Google 공식 변경 기록](https://developers.google.com/search/updates)

검증된 현재 기능만 사용하는 대체 초안 예시는 다음과 같다. 검색 성과 향상은 아직 검증하지 않았다.

```text
제목: 台北英文家教資訊：地區、教學方式與時薪比較 | 每日家教
설명: 彙整台北英文家教老師與學生需求，比較地區、教學方式與刊登價格，查看原始來源，協助了解家教選擇與時薪行情。
```

실제 가격·평가·예약 기능을 확인하면 관련 표현을 추가할 수 있다. 원본 콘텐츠나 메타데이터는 이번 검수에서 수정하지 않았다.

## 8. GSC DNS 인증 매뉴얼

대상: [gsc-domain-verification-guide.md](../setup/gsc-domain-verification-guide.md).

### 8.1 실제 DNS와 다른 안내

매뉴얼 14행은 두 사이트 모두 Cloudflare DNS라고 설명한다. 공개 DNS 조회 결과는 다음과 같다.

| 조회 대상 | 응답 | 의미 |
| --- | --- | --- |
| pwstudio.kr NS | `daisy.ns.cloudflare.com`, `lloyd.ns.cloudflare.com` | Cloudflare DNS 안내와 일치 |
| ecocarpetutah.com NS | `ns67.domaincontrol.com`, `ns68.domaincontrol.com` | 권한 있는 DNS 관리처는 Cloudflare로 확인되지 않음 |
| new.ecocarpetutah.com | CNAME → `ecocarpet-utah.pages.dev` | Cloudflare 호스팅과 도메인 DNS 제공자는 별개. `new` 이름에 CNAME 존재 |

기존 Cloudflare 인벤토리에도 ecocarpetutah.com 존이 없으며 DNS 상세 조회에는 403 제약이 기록되어 있다. 따라서 EcoCarpet의 DNS 편집 권한과 제공자를 확인하기 전에 Cloudflare 존에서 `new` TXT를 추가하도록 안내하면 안 된다.

또한 CNAME과 같은 이름에 다른 일반 레코드를 추가하는 방식은 충돌한다. `new` CNAME을 지우는 해결책은 기존 서비스 연결에 영향을 주므로 권장하지 않는다. [Cloudflare 공식 동일 이름 레코드 안내](https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/records-with-same-name/)

### 8.2 권장 매뉴얼 보완

- PW Studio는 GSC의 `sc-domain:pwstudio.kr` 인증 화면에서 발급한 정확한 TXT 값을 해당 Cloudflare 존에 추가하는 절차를 유지할 수 있다.
- EcoCarpet은 **실제 DNS 제공자·권한 확인 → 기존 레코드 확인 → GSC가 제시하는 인증 방법·정확한 호스트 확인** 순서를 먼저 넣어야 한다.
- 부모 도메인 소유권을 가지고 있다면 실제 제공자의 apex에 GSC 발급 TXT로 `ecocarpetutah.com` 도메인 속성을 인증하는 방안을 검토한다. 부모 도메인 인증은 하위 도메인도 포함한다. 또는 URL-prefix 속성의 HTML 인증 등 GSC가 제공하는 방식을 선택한다. 기존 CNAME을 유지한다. [Google 공식 소유권 인증 안내](https://support.google.com/webmasters/answer/9008080)
- 서브도메인이라는 이유만으로 URL-prefix 유형이 필수는 아니다. 정확한 프로토콜·호스트 범위가 필요한지, 도메인 전체 범위가 필요한지에 따라 선택한다.
- “즉시·영구 인증” 대신 DNS 전파·검증 지연·인증 레코드 유지 조건을 명시한다. Google은 수동 DNS 변경 반영이 2–3일 걸릴 수 있으며 검증 후 레코드를 제거하지 말라고 안내한다. 새 속성의 데이터 축적도 며칠 걸릴 수 있다. [Google 공식 인증·데이터 안내](https://support.google.com/webmasters/answer/9008080)
- OAuth 연결 계정이 실제로 해당 속성 권한을 갖는지 확인한 뒤 정확한 `sc-domain:...` 또는 `https://.../` 식별자를 선택한다. 화면상의 연결 성공과 성과 데이터 수신을 각각 확인한다.

근거: [DNS 조회 결과](../data/2026-10-05-review-dns-evidence.json). 두 프로젝트는 검수 당시에도 GSC Not connected 상태다. 인증 가이드 작성은 실제 소유권 인증·연결 완료를 뜻하지 않는다.

## 9. Utah Says canonical 수정 및 프로덕션 배포

### 9.1 확인된 변경

`D:\Dev\WhatsBestInUtah\src\lib\site.ts:16`의 이전 URL 결정은 환경변수에 localhost가 있으면 그대로 사용했다.

```typescript
// 변경 전
url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://utahsays.com").replace(/\/$/, "")
```

현재 production에서는 값이 없거나 `localhost` 문자열을 포함하면 `https://utahsays.com`으로 치환한다. 개발 환경에서는 설정한 로컬 주소를 유지한다. `wrangler.jsonc:53`에는 공개 변수 `NEXT_PUBLIC_SITE_URL=https://utahsays.com` 한 줄이 추가되었다.

이 두 변경은 05:28:17·05:28:20 UTC 작업 이력의 실제 diff와 현재 파일 내용이 일치한다. 해당 세션의 05:26:05 UTC 사용자 요청은 “모두 진행해주고 … 모두 검수”였고, 직전 제안에 canonical 수정 배포가 포함되어 있어 이 배포는 승인된 후속 작업으로 볼 수 있다.

프로젝트의 HEAD `4f6f611...`에는 추적 파일이 없고 서비스 파일은 모두 untracked 상태다. 따라서 보통의 `git diff HEAD`로 변경 전후 전체 배포 소스를 재구성할 수 없다. 이번 판단은 작업 이력의 해당 diff·현재 파일·실제 배포 결과를 함께 사용했다.

### 9.2 수정 로직 확인

실제 `site.ts`를 TypeScript로 변환하여 별도 VM에서 실행했다. 관계없는 `SEO` 설정 import만 상수로 대체했으며 URL 결정 코드는 그대로 실행했다.

| NODE_ENV | NEXT_PUBLIC_SITE_URL | 실제 `site.url` | 판단 |
| --- | --- | --- | --- |
| production | 미설정 | https://utahsays.com | 정상 |
| production | http://localhost:3000 | https://utahsays.com | 기존 오류 방어 정상 |
| production | https://utahsays.com/ | https://utahsays.com | 정상 |
| production | 빈 문자열 | https://utahsays.com | 정상 |
| development | http://localhost:3000 | http://localhost:3000 | 개발 주소 유지 |
| production | http://127.0.0.1:3000 | http://127.0.0.1:3000 | 다른 loopback 입력은 방어하지 않음 |

운영 변수의 HTTPS origin은 실제로 정상이다. 일반적 재발 방지는 URL 파싱·프로토콜·허용 hostname 검증을 별도 개발 변경으로 검토하면 된다. `includes("localhost")`는 유효 URL 검증을 대체하지 않는다.

`metadataBase`는 `site.url`, 홈 canonical은 `absoluteUrl("/")`, sitemap과 robots도 같은 URL 함수를 사용한다. 따라서 영향 범위는 canonical뿐 아니라 sitemap·social metadata 등이다. `NEXT_PUBLIC_*`는 빌드 때 값이 인라인될 수 있어 Wrangler runtime vars 추가만으로 모든 기존 번들을 수정할 수는 없다. 이번 작업은 새 빌드와 배포를 실제 수행했다. [Next.js 공식 환경변수 안내](https://nextjs.org/docs/app/guides/environment-variables)

### 9.3 프로덕션 배포 증거

| 항목 | 확인값 |
| --- | --- |
| Worker | `utahsays` |
| 최초 핫픽스 배포 생성 UTC | `2026-10-05T05:30:41.806384Z` |
| 최초 핫픽스 Deployment ID | `981fb42e-5c2f-4218-9542-c5a800ec1c91` |
| 최초 핫픽스 Version ID | `fd518b71-ca95-492b-8102-e1af1c0edfbf` |
| 최종 재조회 최신 배포 생성 UTC | `2026-10-05T05:39:51.447595Z` |
| 최종 최신 Deployment ID | `9c6b69df-93da-484f-a628-e88308d432f5` |
| 최종 최신 Version ID | `eacd0d1a-f71c-4bd4-a92b-2c12141fef30` |
| 라우팅 비중 | 100% |
| 원격 NEXT_PUBLIC_SITE_URL | `https://utahsays.com` |
| 원격 ALLOW_INDEXING | `true` |

작업 이력에는 최초 핫픽스의 OpenNext build 및 배포 종료코드 0, 같은 `fd518b71...` Version ID가 있다. 처음 Cloudflare API 조회 시 최신 버전도 동일했다. 검수 중 별도 배포가 진행되어 05:53 최종 조회에서는 `eacd0d1a...`가 100% 활성 버전으로 확인되었다. 이 검수 세션은 배포를 실행하지 않았다. 초기와 최종 HTTP 결과를 구분하고 새 활성 버전에 대한 상태를 기록했다. 기존 디자인·마케팅 문서의 `b16e38f1...`, `c1e8b519...`는 이전 릴리스다.

### 9.4 HTTP 실제 확인

사이트맵에 기재된 105개 **경로**를 운영 origin으로 치환해 검사하고, 홈 탭 query 2개와 UTM query 1개를 더해 108개를 확인했다. 사이트맵의 origin 오류를 숨기기 위해 치환한 것이 아니라 사이트맵 결함과 실제 페이지 상태를 분리해 검증했다.

- 108개 모두 HTTP 200.
- 각 응답의 canonical은 하나이며 localhost canonical 0개.
- 각 경로와 운영 canonical이 일치. 홈의 trailing slash 차이와 query 제거는 정상화 비교했다.
- 일반 응답 106개는 raw HTML head에서 canonical을 확인했고 2개는 metadata streaming으로 body에서 확인했다. bot별 신규 요청에서는 `/c/st-george`와 `/c/springdale`의 정상 head canonical도 확인했다.

| 요청 | 관측 결과 |
| --- | --- |
| `/` | canonical `https://utahsays.com` |
| `/?tab=new`, `/?tab=food` | canonical `https://utahsays.com` |
| `/about` | canonical `https://utahsays.com/about` |
| `/best-beginner-hike-in-utah?utm_source=review` | canonical에서 query 제거 |
| `https://www.utahsays.com/about?utm_source=review` | 301 → apex, path·query 유지 |
| `https://utahsays.garmgoon-domain.workers.dev/about` | 301 → 운영 apex |
| `http://utahsays.com/about` | 200, canonical은 HTTPS. HTTP→HTTPS redirect는 이번 관측에서 없음 |
| `/robots.txt` | 전체 Allow, 사적·관리 경로 Disallow, 운영 sitemap URL |

**canonical 수정과 배포는 실제 응답까지 통과했다.** 다만 한 위치의 GET 검사이고 비공개·비사이트맵 경로 전체 검사는 아니다.

### 9.5 사이트맵 캐시: 초기 실패 후 최종 재검사 통과

05:33·05:35·05:38·05:45 UTC 반복 확인에서 다음 차이가 있었다.

| 요청 | 캐시 | localhost loc | 운영 HTTPS loc |
| --- | --- | ---: | ---: |
| `https://utahsays.com/sitemap.xml` | HIT | 105 | 0 |
| `https://utahsays.com/sitemap.xml?review=final20261005` | MISS | 0 | 105 |

`worker.ts:29`는 sitemap을 3,600초 캐시하며 `cacheKey()`는 일반 query를 보존한다. 이 관측과 코드로 볼 때 **이전 sitemap 응답의 캐시 잔존**이 가장 유력하다. 새 배포 생성 로직의 지속적 localhost 오류라고 단정하지 않는다. 하지만 검색엔진에 제출되는 기본 URL의 응답이 잘못되어 있으므로 캐시 만료 또는 적절한 무효화와 재확인 전에는 사이트맵 검수를 승인할 수 없다.

**최종 상태 업데이트**: 05:52:47 UTC 기본 `/sitemap.xml`에서 MISS·105개 운영 HTTPS URL·localhost 0개를 확인했다. 05:53:11 UTC 같은 기본 URL을 두 번 다시 요청했고 두 응답 모두 HIT·105개 운영 HTTPS URL·localhost 0개였다. 따라서 **이 실행 위치의 최종 사이트맵 재검사는 통과**했다. 같은 시점 최신 활성 버전은 `eacd0d1a...`다. 이 검수 세션은 캐시 purge·추가 배포를 수행하지 않았으며, 정상화 원인이 캐시 만료인지 다른 작업자의 무효화인지까지는 확인하지 않았다. 전 세계 엣지 및 GSC 최종 읽기 결과는 별도 검증 범위다.

**권장 조치 및 확인**:

1. 배포 담당자가 캐시 계층을 확인하고 기본 sitemap의 잘못된 캐시를 해소한다. 캐시를 제거하지 않고 기다리는 경우에도 실제 기본 URL 재확인이 필요하다.
2. query 없는 `/sitemap.xml`을 읽어 105개 모든 loc의 origin·scheme·경로를 검사한다. 새 query의 성공만으로 종료하지 않는다.
3. 운영 페이지와 사이트맵 URL·canonical·robots가 일치하는지 확인한다. 다른 엣지 위치에서도 가능하면 검증한다.
4. GSC 사이트맵 최종 읽기·처리 상태를 확인하고 대표 페이지 URL 검사에서 사용자 선언·Google 선택 canonical·색인 상태를 기록한다.
5. 최신 완료 28일과 이후 완료 28일 성과를 비교한다. 색인 복구와 노출 상승은 별도의 관측 결과로 보고한다.

### 9.6 부수 확인: metadata와 캐시

일반 fetch 응답의 `/c/st-george`는 streaming metadata로 canonical이 body에 나타났다. 같은 query를 나중에 Bingbot UA로 요청하면 해당 HTML이 캐시 HIT로 재사용되었고, 별도 새 query의 Bingbot 요청은 head canonical을 포함했다. 이는 현재 캐시 키가 UA별 metadata 형태를 구분하지 않는다는 관측이다.

당장 localhost 결함으로 분류하지 않는다. bot 응답에서 필요한 metadata가 유지되는지 실제 캐시·DOM 검증을 별도 수행하는 것이 적절하다. 이번 UA 변경 요청은 검색엔진을 모사한 HTTP 검사이며 실제 Googlebot 방문·Google 색인 결과를 뜻하지 않는다.

### 9.7 검증 이력과 한계

| 검증 | 결과 | 범위 |
| --- | --- | --- |
| `pnpm exec eslint src/lib/site.ts` | 종료코드 0 | 수정 파일 lint |
| `pnpm exec tsc --noEmit --incremental false` | 종료코드 0 | 현재 프로젝트 타입 검사, incremental 산출물 비활성 |
| Wrangler JSONC 파싱 | 오류 없음 | TypeScript JSONC 파서 |
| 실제 site.ts 환경변수 실행 검사 | 기존 localhost 경로 통과 | VM 실행, 신규 테스트 파일 없음 |
| 기존 핫픽스 build·deploy 로그 | 종료코드 0 | 이전 실행 이력 및 Cloudflare 상태 대조 |
| 프로덕션 108 URL HTTP 검사 | 운영 canonical 확인 | 현재 응답 및 일부 bot 변형 |
| 기본 sitemap 검사 | 초기 실패 → 최종 통과 | 05:45까지 localhost 캐시, 05:52 MISS·05:53 HIT 두 번 정상 |
| GSC 색인 복구·직전 28일 비교 | 미확인 | 필요한 별도 데이터 없음 |

이번 검수에서 전체 unit/E2E 테스트, 새 빌드·배포, 원격 migration을 다시 실행하지 않았다. 현재 repo의 소스 변경 전후가 Git으로 보존되지 않아 배포 바이너리와 현재 소스의 완전한 동일성까지 입증하지 못한다.

근거: [108 URL 및 최초 배포 증거](../data/2026-10-05-review-live-evidence-v2.json), [05:45 사이트맵 캐시 관측](../data/2026-10-05-review-final-live-check.json), [05:52 정상 응답](../data/2026-10-05-review-final-live-check-v2.json), [05:53 캐시 HIT·최신 배포 재검사](../data/2026-10-05-review-final-live-check-v3.json), [소스 실행 검사](../data/2026-10-05-review-source-checks.json), [bot 재검사](../data/2026-10-05-review-bot-evidence-v2.json).

## 10. 보존·재현성 및 후속 작업

`docs/seo/setup/inventory.mjs:110`은 일별 `*-discovery.json`에 `writeFile`을 사용하여 같은 날 재실행하면 기존 파일을 덮어쓴다. AGENTS.md의 버전 접미사 규칙과 충돌하므로 후속 수정에서 충돌 없는 저장을 보장해야 한다. 기존 파일이 과거에 얼마나 덮어써졌는지는 확보한 자료만으로 확정하지 않는다.

후속 담당자는 다음 순서로 검수 항목을 닫는 것이 적절하다.

1. **배포 담당**: 이번 실행 위치에서 통과한 기본 sitemap을 다른 엣지와 GSC에서도 확인한다. 다음 배포의 소스 스냅샷·버전·빌드 변수·캐시 처리·HTTP 결과를 함께 남긴다.
2. **DNS/GSC 담당**: EcoCarpet의 실제 DNS 권한과 CNAME을 반영한 인증 절차를 정리하고, 미연결 두 프로젝트의 인증·권한·연결·데이터 수신을 각각 확인한다.
3. **SEO 분석 담당**: 사이트별 실제 최근·직전 기간과 페이지·쿼리 비교 자료를 확보한다. 확보하지 못한 항목은 명시적으로 미조회 처리한다.
4. **콘텐츠 담당**: 기존 HTML·기능·표본·가격을 검증하고, 과장된 제안과 원인 단정을 제거한 새 버전 문서를 작성한다. 원본은 보존한다.
5. **운영 담당**: 기본 시장 및 MCP 클라이언트 검증을 보완한다. 분석·임시 산출물 저장 경로와 인벤토리 버전 규칙을 준수한다.

이번 보고서는 실제 코드 수정·콘텐츠 게시·프로젝트 설정 변경을 수행하라는 지시가 아니다. 발견 사항과 검증 가능한 후속 Action Item을 전달하는 검수 산출물이다.

## 11. 근거 파일 안내

검수 근거는 모두 `docs/seo/data/` 아래에 저장했다. 자격 증명 원문·쿠키·개인화 응답 본문은 저장하지 않았다.

| 파일 | 내용 |
| --- | --- |
| `2026-10-05-review-history-evidence.json` | 승인·기존 변경·실제 수정 diff·배포 로그·외부 임시파일 위치 발췌 |
| `2026-10-05-review-workspace-manifest.json` | 두 저장소 HEAD·Git 상태·관련 파일 해시 |
| `2026-10-05-review-openseo-project-list.json` | 실제 프로젝트 링크와 ID |
| `2026-10-05-review-openseo-integrations.json` | 5개 사이트 GSC 연결 화면 |
| `2026-10-05-review-openseo-metrics-v2.json` | 값 로딩 완료 후 성과·백링크 화면 |
| `2026-10-05-review-openseo-audits.json` | 기존 오디트 3개 집계 및 auditId |
| `2026-10-05-review-everydaytutor-market.json` | 실제 기본 시장·언어 |
| `2026-10-05-review-live-evidence-v2.json` | 108개 HTTP 검사·캐시·공개 변수·배포 |
| `2026-10-05-review-final-live-check.json` | 기본 사이트맵과 새 query 응답 최종 대조 |
| `2026-10-05-review-final-live-check-v2.json` | 05:52 기본 사이트맵 정상화 관측 |
| `2026-10-05-review-final-live-check-v3.json` | 05:53 기본 사이트맵 HIT 정상·최신 활성 버전 |
| `2026-10-05-review-final-integrity.json` | 보고서 링크·검수 대상 서비스 파일 해시 대조 |
| `2026-10-05-review-bot-evidence*.json` | UA·캐시별 metadata 관측 |
| `2026-10-05-review-dns-evidence.json` | 두 도메인 네임서버 및 EcoCarpet CNAME |
| `2026-10-05-review-source-checks.json` | lint·타입·JSONC·URL 로직 검사 |

초기 `review-live-evidence.json`에는 잘못된 사이트맵 origin을 그대로 조회한 실패도 포함되어 있다. 전체 운영 페이지 검사의 판단 기준은 경로를 운영 origin으로 명시적으로 치환한 **v2**다. 첫 metrics 파일은 일부 값 로딩 전 화면이므로 숫자 판정에는 **metrics-v2**를 사용했다. 초기 근거는 후속 버전과 함께 보존했다.
