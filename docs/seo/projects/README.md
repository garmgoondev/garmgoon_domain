# 여러 사이트의 중앙 관리

중앙 허브는 `https://seo.garmgoon.com`, MCP는 `https://seo.garmgoon.com/mcp`를 사용한다. 모든 사이트는 같은 OpenSEO 워크스페이스에서 독립 프로젝트로 관리한다.

## 등록 및 연동 현황 (2026-10-05 기준)

| 프로젝트명 | 도메인 / 배포 주소 | Project ID | GSC 연결 상태 | DataForSEO | 비고 |
| --- | --- | --- | --- | --- | --- |
| **Garmgoon** | `garmgoon.com` | `e0206a78-8f7f-48d6-a056-d885028c14e5` | `sc-domain:garmgoon.com` (`garmgoon@gmail.com`) | 정상 연동 (백링크 454) | 메인 포털/개인 브랜드 |
| **Utah Says** | `utahsays.com` | `992bdb6c-b0eb-480a-b6c2-3238f26c8a52` | `sc-domain:utahsays.com` (`garmgoondev@gmail.com`) | 정상 연동 | 유타 여론조사/커뮤니티 |
| **EverydayTutor** | `everydaytutor.net` | `629af3c0-2782-4d60-a13b-104c7cf1e6b6` | `sc-domain:everydaytutor.net` (`garmgoon@gmail.com`) | 정상 연동 (백링크 43) | `www.everydaytutor.net` 정규화 |
| **PW Studio** | `pwstudio.kr` | `0aa884bf-1249-4a89-b8c9-e215f64bdb31` | `sc-domain:pwstudio.kr` (`garmgoon@gmail.com`) | 정상 연동 | 웹사이트 제작 솔루션 (DNS 자동인증 및 연동 완료) |
| **EcoCarpet Utah** | `new.ecocarpetutah.com` | `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e` | 보류 (데모 단계, 본 사이트 오픈 시 연동 예정) | 정상 연동 | `ecocarpet-site` 워커 기반 |

*상세 메타데이터 및 지표는 `2026-10-05-registered-projects.json`에 기록되어 있습니다.*

## 추가 검토 후보 배포처

아래 목록은 Cloudflare API에서 조회한 배포 주소 중 아직 OpenSEO에 등록되지 않았거나 통합 여부 검토가 필요한 항목이다.

| 후보 | 배포 주소 | 현황 및 조치 권장 |
| --- | --- | --- |
| Gagebase | `gagebase.pages.dev` | 인증/로그인 전용 웹앱이므로 공개 SEO 대상 여부 확인 필요 |
| Norangdal Architects | `norangdal-architects.pages.dev` | 정식 도메인 연결 시 OpenSEO 프로젝트 추가 권장 |
| Car Tuner | `car-tuner.garmgoon-domain.workers.dev` | 3D 커스텀 설정 툴, 정식 도메인 연결 시 추가 권장 |
| EcoCarpet Worker | `ecocarpet-site.garmgoon-domain.workers.dev` | `new.ecocarpetutah.com`의 원본 배포처로 확인되어 해당 프로젝트에 통합 |
| Pixie | `pixie.garmgoon.com` | n8n 내부 워크플로우 관리 인스턴스로 검색 엔진 수집 제외 대상 |

## 프로젝트 등록과 연결 가이드

1. OpenSEO MCP의 `list_projects` 또는 관리 화면(`https://seo.garmgoon.com/projects`)에서 등록된 프로젝트 목록과 `projectId`를 확인한다.
2. 새 프로젝트 생성 시 이름과 대표 도메인을 지정한다.
3. Google Search Console 연결:
   - Google 계정(`garmgoon@gmail.com` 또는 `garmgoondev@gmail.com`)에 Search Console 속성이 이미 등록되어 있으면 OpenSEO 프로젝트의 `Integrations` 메뉴에서 즉시 선택하여 연결할 수 있다.
   - 아직 GSC에 등록되지 않은 도메인(`pwstudio.kr`, `new.ecocarpetutah.com` 등)은 먼저 [Google Search Console](https://search.google.com/search-console)에서 속성 추가 및 DNS TXT / 메타태그 소유권 인증을 진행한 후 OpenSEO에서 연결한다.
4. 프로젝트별 데이터 조회 및 분석 요청 시 항상 해당 `projectId`를 사용한다.
