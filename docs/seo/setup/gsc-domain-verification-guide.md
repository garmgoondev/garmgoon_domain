# 미연결 사이트 Google Search Console 속성 추가 및 소유권 인증 가이드 (개정판 v2)

- **작성일**: 2026-10-05
- **대상 사이트**: `pwstudio.kr`, `new.ecocarpetutah.com`
- **목적**: Google Search Console에 각 도메인의 실제 DNS 관리자 및 호스팅 구조에 맞추어 소유권을 인증하고, OpenSEO 대시보드(`https://seo.garmgoon.com`)에서 실시간 GSC 검색 데이터를 연동할 수 있도록 안내합니다.

---

## 1. 사이트별 인프라 및 DNS 사전 확인

OpenSEO에는 이미 두 사이트가 독립 프로젝트로 등록되어 있습니다:
- **PW Studio**: `0aa884bf-1249-4a89-b8c9-e215f64bdb31` (도메인: `pwstudio.kr`)
- **EcoCarpet Utah**: `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e` (도메인: `new.ecocarpetutah.com`)

두 도메인의 네임서버 및 DNS 관리 환경이 서로 다르므로, 각각에 맞는 인증 방식을 적용해야 합니다:

| 도메인 | 권한 네임서버 (NS) | 실제 DNS 관리처 | 현재 DNS 레코드 특이사항 | 권장 소유권 인증 방식 |
| :--- | :--- | :--- | :--- | :--- |
| **pwstudio.kr** | `daisy.ns.cloudflare.com`<br>`lloyd.ns.cloudflare.com` | **Cloudflare DNS** | apex 도메인 직접 관리 | **DNS TXT 레코드 추가** (Cloudflare DNS) |
| **new.ecocarpetutah.com** | `ns67.domaincontrol.com`<br>`ns68.domaincontrol.com` | **GoDaddy / DomainControl** | `new` 호스트명에 `ecocarpet-utah.pages.dev` CNAME 존재 | **방법 A**: Apex 도메인 DNS TXT (GoDaddy)<br>**방법 B**: URL 접두사 HTML 태그/파일 인증 |

> [!CAUTION] DNS CNAME 충돌 주의 (EcoCarpet)
> `new.ecocarpetutah.com`은 이미 Cloudflare Pages 배포 주소를 가리키는 CNAME 레코드가 등록되어 있습니다. RFC DNS 표준상 동일한 서브도메인 이름(`new`)에 CNAME과 TXT 레코드를 동시에 등록할 수 없습니다(충돌 발생). 따라서 서브도메인 직접 TXT 추가 대신 **Apex 도메인(`ecocarpetutah.com`)에 TXT 레코드 등록** 또는 **HTML 태그/파일 인증**을 사용해야 합니다.

---

## 2. 도메인별 속성 등록 및 소유권 인증 단계

### ① PW Studio (`pwstudio.kr`)

1. [Google Search Console](https://search.google.com/search-console)에 접속합니다. (관리 계정: `garmgoondev@gmail.com` 또는 `garmgoon@gmail.com`)
2. 좌측 상단 속성 선택기에서 **[+ 속성 추가]**를 클릭합니다.
3. 속성 유형 중 좌측의 **[도메인]**을 선택하고 `pwstudio.kr`을 입력한 뒤 **[계속]**을 누릅니다.
4. 화면에 표시되는 **Google 사이트 인증 TXT 레코드 값**을 복사합니다:
   - 예시: `google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
5. **Cloudflare 대시보드** 접속 → `pwstudio.kr` 도메인 선택 → **DNS → Records**로 이동합니다.
6. **[Add record]**를 클릭하고 다음 정보를 입력 후 저장합니다:
   - **Type**: `TXT`
   - **Name**: `@` (또는 `pwstudio.kr`)
   - **Content**: 복사한 `google-site-verification=...` 값
   - **TTL**: `Auto`
7. Google Search Console 팝업으로 돌아와 **[확인 (Verify)]**을 누르면 소유권 인증이 완료됩니다. (Cloudflare DNS는 1~2분 내 반영)

---

### ② EcoCarpet Utah (`new.ecocarpetutah.com`)

EcoCarpet은 상황에 따라 다음 두 가지 중 한 가지를 선택하여 진행합니다:

#### 방법 A: 부모 도메인 Apex DNS TXT 인증 (추천: 도메인 속성)
부모 도메인의 DNS 관리 권한(GoDaddy / DomainControl)이 있는 경우 가장 권장되는 방식입니다. 부모 도메인 인증 시 모든 하위 서브도메인이 자동으로 포함됩니다.
1. Google Search Console에서 **[+ 속성 추가]** → 좌측 **[도메인]** 선택 → `ecocarpetutah.com` 입력 후 [계속].
2. 발급된 TXT 인증 문자열 복사.
3. GoDaddy(또는 도메인 등록처) DNS 관리 페이지 접속.
4. TXT 레코드 추가:
   - **호스트 / Name**: `@`
   - **값 / Value**: 복사한 `google-site-verification=...` 값
   - **TTL**: 기본값(1시간 또는 1/2시간)
5. Search Console에서 [확인] 클릭 (DNS 전파에 수 분~수 시간 소요될 수 있음).
6. 인증 완료 후 `sc-domain:ecocarpetutah.com` 속성 내에서 `new.ecocarpetutah.com` 트래픽을 모두 조회할 수 있습니다.

#### 방법 B: URL 접두사 속성 - HTML 파일 또는 태그 인증 (간편형)
GoDaddy DNS 접근이 번거롭거나 Pages 배포 권한만 있는 경우:
1. Google Search Console에서 **[+ 속성 추가]** → 우측 **[URL 접두사]** 선택 → `https://new.ecocarpetutah.com/` 입력 후 [계속].
2. 확인 방법에서 **[HTML 파일]** 다운로드 (예: `google1234567890abcdef.html`).
3. 저장소(`D:\Dev\EcoCarpetUtah`)의 정적 파일 디렉터리(`public/` 등)에 해당 파일을 넣고 재배포.
4. 브라우저에서 `https://new.ecocarpetutah.com/google1234567890abcdef.html`이 200으로 열리는지 확인.
5. Search Console에서 [확인] 클릭 (즉시 완료).

---

## 3. OpenSEO에서 속성 연결

인증이 완료된 후 OpenSEO 중앙 대시보드에 연결합니다:

1. `https://seo.garmgoon.com/` 접속.
2. **PW Studio** 프로젝트 클릭 → **Settings** (`/p/0aa884bf-1249-4a89-b8c9-e215f64bdb31/settings`) → **Integrations** 탭 이동.
3. Google Search Console 섹션의 **[Choose property]** 드롭다운 클릭.
4. 인증된 `sc-domain:pwstudio.kr`을 선택하고 **[Save property]** 클릭.
5. **EcoCarpet Utah** 프로젝트 (`/p/d90ac9ec-e2d5-4d10-8a63-d80b15c2750e/settings`)에서도 동일하게 `sc-domain:ecocarpetutah.com` 또는 `https://new.ecocarpetutah.com/` 속성을 선택하여 저장.
6. 저장 즉시 OpenSEO 대시보드에서 5개 전체 사이트의 클릭수, 노출수, 평균 순위 통합 모니터링이 활성화됩니다.
