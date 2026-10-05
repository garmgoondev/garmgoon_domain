# OpenSEO MCP 클라이언트 연결 현황

- 작성일: 2026-10-05
- MCP 엔드포인트: `https://seo.garmgoon.com/mcp`
- 인증: Cloudflare Access Managed OAuth (팀 도메인 `dawn-field-884e.cloudflareaccess.com`, 동적 클라이언트 등록)

## 연결 및 테스트 결과

테스트 방법: 각 클라이언트에서 `list_projects` 호출 → 5개 프로젝트(Garmgoon, Utah Says, EverydayTutor, PW Studio, EcoCarpet Utah) 반환 여부 확인.

| 클라이언트 | 설정 위치 | 등록 명령 | 인증 | 테스트 |
| --- | --- | --- | --- | --- |
| Claude Code | `~/.claude.json` (user scope) | `claude mcp add --transport http --scope user openseo https://seo.garmgoon.com/mcp` | `claude mcp login openseo` (대화형 터미널 필요) | 통과 |
| Codex (Orca 계정 `c1b8a780…`) | `%APPDATA%/orca/codex-accounts/c1b8a780…/home/config.toml` | `codex mcp add openseo --url https://seo.garmgoon.com/mcp` | 등록 시 자동 OAuth | 통과 |
| Codex (기본 `~/.codex`, Orca 밖) | `~/.codex/config.toml` | `CODEX_HOME=~/.codex codex mcp add …` | 등록 시 자동 OAuth 완료 | 모델 사용량 한도로 호출 테스트 보류 |
| Antigravity (agy CLI·IDE 공용) | `~/.gemini/config/mcp_config.json` | `agy mcp add --type http openseo https://seo.garmgoon.com/mcp` | 대화형 `agy` → `/mcp` → openseo → Authenticate → 브라우저에 표시된 코드 붙여넣기 | 통과 (대화형) |

## 주의 사항

- **Orca는 Codex 계정마다 별도 `CODEX_HOME`을 쓴다.** Orca 터미널 안에서 `codex mcp add`를 실행하면 현재 Orca 계정 폴더에만 등록된다. Orca에서 새 Codex 계정을 추가하면 그 계정에서도 다시 등록·로그인해야 한다.
- **Antigravity OAuth 콜백은 `https://antigravity.google/oauth-callback`(고정)** 이다. Cloudflare Access 앱 `open-seo selfhost`의 Managed OAuth `dynamic_client_registration.allowed_uris`에 이 주소를 추가했다(2026-10-05). localhost·loopback 허용은 기존 그대로다.
  - `open-seo/scripts/selfhost-managed-oauth.mjs`는 기존 `dynamic_client_registration` 값을 펼쳐서 유지하므로, 재배포 후에도 이 항목이 보존되어야 한다. 재배포 후 Antigravity 인증이 실패하면 이 항목을 먼저 확인한다.
- Antigravity 헤드리스 모드(`agy -p`)는 MCP 도구 권한 승인을 띄울 수 없어 자동 거부된다. OpenSEO에는 쓰기 도구(프로젝트 생성·컨텍스트 수정 등)도 있으므로 전체 자동 허용은 걸지 않았다. 대화형 세션에서 사용한다.
- 테스트 중 Cloudflare 동적 등록 확인용으로 빈 OAuth 클라이언트 2개(`probe-test`, `propagation-check`)가 등록되었다. 승인된 토큰이 없어 접근 권한은 없다.
