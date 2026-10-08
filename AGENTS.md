# Agent Instructions

---

## Garmgoon Domain Project Instructions

### Role & Purpose
- 이 저장소(`D:\Dev\garmgoon_domain`)는 `garmgoon.com` 개인 도메인 및 포트폴리오 웹사이트 전용 저장소이다.
- 서비스 소스코드(`src/`, `app/`, `components/`, `lib/`, `worker/` 등)의 개발 및 유지관리를 담당한다.

### 중앙 SEO 관제 분리 안내
- 사용자가 운영하는 전체 웹사이트(EverydayTutor, PW Studio, Utah Says, EcoCarpet Utah, Garmgoon 등)의 통합 SEO 전략, GSC/GA4 분석, 키워드 갭 및 테크니컬 오디트는 **독립 중앙 관제소인 `D:\Dev\SEO_Hub`** 에서 전담한다.
- 다른 사이트의 SEO 보고서, 키워드 분석 데이터, 오디트 결과물은 이 저장소에 생성하지 않고 `D:\Dev\SEO_Hub`에서 관리한다.

### 절대 원칙: 가상/임의(Mock) 데이터 사용 금지 (Strict No-Mock Policy)
- 모든 개발, 대시보드 및 지표 시각화 작업 시 임의로 꾸며낸 가상(Mock/Fake) 수치, 더미 지표, 임의 보간 데이터를 일절 포함하지 않는다.
- 데이터가 아직 없는 신규 서비스나 미수집 항목은 `0`, `-`, 또는 `데이터 수집 대기 중`으로 정직하고 명확하게 표기한다.
- 시장 조사 및 타깃 분석 데이터(예: 키워드 검색량)는 실제 유입 수치와 혼동되지 않도록 `공략 타깃 키워드 (시장 검색량)`로 명확히 분리하여 표기한다.
- 이 원칙은 향후 진행되는 모든 프로젝트에 영구적으로 적용된다.
