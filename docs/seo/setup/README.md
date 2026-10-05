# 중앙 OpenSEO 운영 구성

## 현재 상태

Cloudflare 배포와 Google Search Console(GSC) OAuth 자격 증명 연동, Managed OAuth 설정이 완료되었습니다.

- Cloudflare 배포: `https://seo.garmgoon.com` (Cloudflare Access 및 전용 D1·KV·R2 리소스 연동 완료)
- Managed OAuth: `https://seo.garmgoon.com/mcp` (localhost 및 loopback 클라이언트 허용)
- DataForSEO: API 키 연동 및 유효성 검증 완료
- Google Cloud: 전용 프로젝트(`openseo-hub`) 생성, Google Search Console API 활성화, OAuth 동의 화면 구성, 테스트 사용자(`garmgoondev@gmail.com`) 등록 완료
- GSC OAuth 클라이언트: 웹 애플리케이션 클라이언트 발급 및 콜백 URI(`https://seo.garmgoon.com/api/gsc/oauth/callback`) 설정 완료
- Worker 시크릿: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`이 `.env.selfhost`에 설정되어 `pnpm deploy:selfhost`로 Worker에 성공적으로 반영됨

- 관리 화면: `https://seo.garmgoon.com`
- MCP 엔드포인트: `https://seo.garmgoon.com/mcp`
- 배포 저장소: `D:\Dev\open-seo`
- 인증 모드: `cloudflare_access`
- 워크스페이스: OpenSEO의 `shared-workspace`를 사용한다. 허용된 사용자는 같은 프로젝트 목록을 볼 수 있다.
- 사이트별 OpenSEO 프로젝트를 만들고 각 프로젝트에 해당 도메인과 GSC 속성을 연결한다. 다른 Cloudflare 계정이나 Vercel 등에서 운영하는 사이트도 등록할 수 있다.

## 적용된 로컬 설정

OpenSEO의 selfhost 배포 설정에 `SELFHOST_DOMAIN`을 추가했다. 이 값이 있으면 앱 Worker의 Custom Domain과 Cloudflare Access 앱이 같은 호스트를 사용하며, 앱 Worker의 `workers.dev` 공개 주소는 비활성화한다. 오디트 Worker와 데이터 저장소는 OpenSEO 전용 리소스를 사용한다.

`deploy:selfhost`에 배포 후 Managed OAuth를 적용·재조회하는 스크립트를 추가했다. Alchemy beta.61의 Access 리소스가 이 필드를 관리하지 않으므로 별도 API 단계에서 기존 접근 정책과 HTTPS 콜백을 보존하면서 localhost·loopback 클라이언트 등록을 활성화한다. 액세스 토큰은 15분, OAuth 세션은 168시간으로 설정한다. 웹 기반 MCP 커넥터는 해당 클라이언트의 HTTPS 콜백을 허용 목록에 추가해야 한다. 기존 Access 앱을 직접 관리하는 옵션을 사용하면 해당 앱의 OAuth 설정도 직접 관리한다.

`.env.selfhost`는 Git에서 제외된다. `SELFHOST_DOMAIN=seo.garmgoon.com`, 소유자 이메일 허용 목록과 토큰 암호화용 `BETTER_AUTH_SECRET`을 준비했다. DataForSEO 및 Google OAuth 값은 실제 자격 증명을 입력해야 한다. 비밀 값은 이 문서나 프로젝트 목록에 저장하지 않는다.

Windows에서 실행할 수 있도록 OpenSEO의 `pnpm alchemy` 스크립트를 Node 실행 방식으로 변경했다. 의존성 버전과 기존 garmgoon 서비스 설정은 변경하지 않았다.

## 배포 순서

별도 OpenSEO 폴더의 PowerShell에서 실행한다.

```powershell
Set-Location D:\Dev\open-seo
pnpm install --frozen-lockfile
pnpm alchemy login deploy/alchemy/alchemy.run.ts --env-file .env.selfhost --configure
```

Cloudflare 인증 과정에서 기본 권한을 유지하고 `access:write`를 포함한다. 로그인에는 계정 소유자의 인증이 필요할 수 있다.

`.env.selfhost`의 `DATAFORSEO_API_KEY`에 DataForSEO가 제공한 Base64 `login:password` 자격 증명을 입력한다. 이후 다음을 실행한다.

```powershell
pnpm alchemy cloudflare bootstrap
pnpm deploy:selfhost --yes
```

배포 후 확인할 항목:

1. `seo.garmgoon.com` 도메인이 OpenSEO 앱 Worker에 연결되는지 확인한다.
2. 허용 이메일로 Cloudflare Access 로그인 후 관리 화면과 `/api/health`를 확인한다.
3. Access 앱의 **Additional settings → OAuth → Managed OAuth**가 활성화되었는지 확인하고 웹 커넥터를 사용할 경우 해당 HTTPS 리디렉션 URI를 추가한다.
4. `https://seo.garmgoon.com/mcp`에 로그인하고 `list_projects`를 호출한다.
5. 기존 도메인과 프로젝트를 비교한 뒤 누락된 사이트만 `create_project`로 등록한다. 반환된 `projectId`를 등록 현황에 기록한다.

## GSC 연결

Google Cloud에서 Search Console API를 활성화하고 웹 애플리케이션 OAuth 클라이언트를 생성한다.

콜백 주소는 다음과 정확히 일치해야 한다.

```text
https://seo.garmgoon.com/api/gsc/oauth/callback
```

`.env.selfhost`에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`을 설정하고 재배포한다. OpenSEO의 Integrations에서 권한이 있는 Google 계정으로 로그인하고 사이트별 속성을 프로젝트에 연결한다. 외부 OAuth 앱의 Testing 상태에서는 refresh token이 7일 뒤 만료될 수 있으므로 장기 운영 시 게시 상태를 확인한다.

## 프로젝트 목록과 리포트

- 읽기 전용 인벤토리: `node docs/seo/setup/inventory.mjs`
- 조사 결과: `docs/seo/projects/*-discovery.json`
- 연결 현황과 사이트별 `projectId`: `docs/seo/projects/`
- 성과 리포트: `docs/seo/reports/`
- 콘텐츠 가이드: `docs/seo/content/`
- 테크니컬 오디트: `docs/seo/audit/`

인벤토리는 현재 Cloudflare 계정의 배포 도메인과 로컬 저장소 목록을 조사한다. 로컬 저장소가 있다는 사실만으로 공개 사이트 또는 OpenSEO 등록 완료로 판단하지 않는다. `www` 별칭은 같은 사이트에 통합하고, 별도 도메인·공개 호스트는 독립 후보로 기록한다. 후보가 같은 사이트의 다른 배포 주소인지 확인한 뒤 등록한다.

전체 사이트 분석은 OpenSEO의 실제 프로젝트 목록을 기준으로 수행하고, 연결되지 않은 GSC나 누락된 데이터도 상태와 함께 보고한다. 에이전트 산출물은 모두 이 저장소의 `docs/seo/` 아래에 저장한다.

## 근거

- [공식 Cloudflare 셀프호스팅](https://www.openseo.so/docs/self-hosting/cloudflare)
- [공용 워크스페이스와 배포 운영](https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE.md)
- [Google Search Console 설정](https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md)
- [Google OAuth 토큰 만료 조건](https://developers.google.com/identity/protocols/oauth2#expiration)
