# Google Analytics(GA4) 연결 준비 현황

- 작성일: 2026-10-05
- 참고: `D:\Dev\open-seo\docs\SELF_HOSTING_GOOGLE_ANALYTICS.md`

## 1. 사이트별 추적 코드 (2026-10-05 실시간 HTML 확인)

| 사이트 | 추적 코드 | 상태 | 조치 |
| --- | --- | --- | --- |
| `utahsays.com` | GA4 `G-QL3BW0J3KY` | 설치됨 | 서버 준비 후 바로 연결 가능 |
| `www.everydaytutor.net` | GA4 `G-QPGW2RBST4` | 설치됨 | 서버 준비 후 바로 연결 가능 |
| `pwstudio.kr` | 없음 | 미설치 | GA4 속성 생성 후 태그 설치 필요 |
| `new.ecocarpetutah.com` | 없음 | 미설치 | 본 도메인 전환 시 GA4 태그 설치 |
| `ecocarpetutah.com` (기존) | Universal Analytics `UA-49189933-1` | **데이터 수집 안 됨** | UA는 2024년에 완전히 종료됐다. 이 태그로는 현재 아무 데이터도 쌓이지 않는다. 전환 시 GA4로 교체 |
| `garmgoon.com` | 없음 | 미설치 | 개인 대시보드라 선택 사항 |

## 2. OpenSEO 서버(seo.garmgoon.com) 준비 상태

| 항목 | 상태 | 근거 |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `BETTER_AUTH_SECRET` | 설정됨 | `.env.selfhost`에 키 존재(값은 확인하지 않음) |
| OAuth 리디렉션 URI `…/api/gsc/oauth/callback` | 등록됨 | Google 인증 URL 테스트 결과 정상 로그인 화면으로 이동 |
| OAuth 리디렉션 URI `https://seo.garmgoon.com/api/ga4/oauth/callback` | **등록 완료 (2026-10-05)** | 클라이언트 "OpenSEO Web Client"에 추가 후 재조회로 저장 확인. Google 인증 URL 테스트도 정상 로그인 화면으로 이동 |
| Google Analytics Admin API / Data API 사용 설정 | **사용 설정 완료 (2026-10-05)** | 프로젝트 `openseo-hub`(번호 786868828048), 두 API 모두 Status: Enabled |
| OAuth 동의 화면 | Testing / External | 테스트 사용자 `garmgoon@gmail.com`, `garmgoondev@gmail.com` 등록됨. Testing 상태라 refresh 토큰이 7일 뒤 만료될 수 있음 |

> 아래 3번 작업은 2026-10-05 Orca CLI 브라우저 자동화로 완료했다. 기록용으로 남겨 둔다.

## 3. Google Cloud Console 작업 (완료)

GSC 연결에 쓰는 것과 **같은 Google Cloud 프로젝트**에서 진행한다.

1. **API 및 서비스 → 라이브러리**에서 다음 두 API를 "사용"으로 설정한다.
   - Google Analytics Admin API
   - Google Analytics Data API
2. **API 및 서비스 → 사용자 인증 정보** → OpenSEO가 쓰는 웹 애플리케이션 OAuth 클라이언트 → **승인된 리디렉션 URI**에 다음 주소를 추가한다. 기존 `/api/gsc/oauth/callback`은 그대로 둔다.
   - `https://seo.garmgoon.com/api/ga4/oauth/callback`
3. OAuth 동의 화면이 "테스트" 상태라면, 연결할 Google 계정(`garmgoon@gmail.com`, `garmgoondev@gmail.com`)이 테스트 사용자에 들어 있는지 확인한다. 테스트 상태에서는 토큰이 7일 만에 만료될 수 있다.

## 3-1. 연결 결과 (2026-10-05, Orca 브라우저로 진행)

| OpenSEO 프로젝트 | GA4 속성 | 측정 ID (사이트 태그와 일치) | 연결 계정 | MCP 조회 |
| --- | --- | --- | --- | --- |
| Utah Says | `properties/557341522` "Utah Says" | `G-QL3BW0J3KY` ✅ | `garmgoondev@gmail.com` | 정상. 2026-09-07~10-04 Organic Search 세션 없음 |
| EverydayTutor | `properties/554632841` "EverydayTutor" | `G-QPGW2RBST4` ✅ | `garmgoondev@gmail.com` | 정상. Organic Search 세션 2, 측정 경고 2건(`enhanced_measurement_disabled`, `site_search_measurement_disabled`) |

- 확인 결과 원문: `docs/seo/data/2026-10-05-ga4-connection-check.md`
- EverydayTutor 측정 경고: GA4 관리 → 데이터 스트림 → "EverydayTutor Web" → **향상된 측정**을 켜면 스크롤, 외부 링크 클릭, 사이트 내 검색(`/search?…`)이 자동 수집된다. 사이트 코드 변경은 필요 없다.
- **OAuth 앱 게시 상태: In production (2026-10-05)**
  - 게시 버튼을 막고 있던 것은 개인정보처리방침 링크였다. `garmgoon.com/privacy` 페이지(`app/privacy/page.js`)를 만들어 배포했고(Worker 버전 `a4b1ed13-…`), Branding에 홈페이지 `https://garmgoon.com`과 개인정보처리방침 `https://garmgoon.com/privacy`를 등록한 뒤 게시했다.
  - 앱 검증은 받지 않았다. 그래서 동의 화면에 "확인되지 않은 앱" 경고가 표시되지만, 사용자 100명 한도 안에서는 정상 작동한다.
  - Testing 상태에서 발급된 토큰은 7일 뒤 만료되므로, 게시 직후 세 토큰을 모두 다시 발급받았다: GA4(`garmgoondev@`), GSC(`garmgoondev@`), GSC(`garmgoon@`).
  - 재인증 후 MCP 확인: GSC 4개 프로젝트와 GA4 2개 프로젝트 모두 `ok`.

## 4. 그다음 연결 순서 (원래 계획, 1~2번 완료)

1. OpenSEO → Utah Says 프로젝트 → 대시보드의 Google Analytics 카드 → **Connect with Google** → 읽기 전용 권한 승인 → `G-QL3BW0J3KY` 스트림의 GA4 속성 선택
2. EverydayTutor도 같은 방식으로 연결(`G-QPGW2RBST4`)
3. PW Studio: GA4 속성을 만들고 태그를 설치한 뒤 연결(사이트 코드 수정은 해당 저장소에서 진행)
4. EcoCarpet: 본 도메인 전환 작업에 GA4 태그 설치를 포함

## 5. 연결 후 확인

- OpenSEO 대시보드 "Organic traffic" 카드에 Sessions, Active users, Engagement rate가 표시되는지 확인한다.
- MCP: Google Analytics 도구로 최근 28일 오가닉 세션이 조회되는지 확인한다.
