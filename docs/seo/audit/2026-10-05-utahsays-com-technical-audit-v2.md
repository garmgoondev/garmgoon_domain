# Utah Says (`utahsays.com`) 테크니컬 SEO 오디트 리포트 (v2, 500페이지 확장)

- **대상**: `utahsays.com` (OpenSEO projectId `992bdb6c-b0eb-480a-b6c2-3238f26c8a52`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO Site Audit (auditId `2c29b29c-56d7-4003-90a7-e60c4ab6b739`, JS 비렌더링, Lighthouse 미실행), 실시간 HTTP 확인(curl), `sitemap.xml`
- **크롤링 기간**: 2026-10-05 07:25:57 ~ 07:34:22 (UTC), 500/500 페이지
- **비교 기준**: v1 리포트 `2026-10-05-utahsays-com-technical-audit.md` (auditId `5e2a5049-…`, 50페이지)
- **원본 데이터**: `docs/seo/data/2026-10-05-utahsays-com-audit-500.json`
- **분석 한계**: 페이지 예산 500에 다시 도달했다. 아래 1번 문제 때문에 매개변수 변형 URL이 예산 대부분을 차지했으며, 사이트맵 URL 105개를 모두 크롤링했는지는 확인하지 못했다. 이슈 수는 OpenSEO의 이슈 레코드 수이며 고유 페이지 수와 다를 수 있다.

---

## 1. 요약

| 구분 | v1 (50페이지) | v2 (500페이지) | 비고 |
| --- | --- | --- | --- |
| P0 canonical `http://localhost:3000` | 전 페이지 | **해결됨** | 2026-10-05 실시간 확인: `/` → `https://utahsays.com`, `/about` → `https://utahsays.com/about` |
| 크롤링된 URL | 50 | 500 (한도 도달) | 사이트맵 URL은 105개 |
| 이슈 합계 | 87 | 952 | 대부분 Info |

**v2에서 새로 드러난 핵심 문제**는 크롤링 함정(crawl trap)이다. 사이트맵에 있는 URL은 105개인데, 탭·선택지 링크가 만드는 변형 URL이 수백 개 크롤링된다. 각 URL에 canonical 또는 noindex가 적용돼 있어 색인 오염은 막고 있다. 하지만 Google이 신생 사이트에 배정하는 크롤링 자원을 이 변형 URL들이 소모한다.

## 2. Action Items

### [P1] 매개변수·선택지 변형 URL 크롤링 낭비 차단

- **영향받는 URL**
  - `?tab=` 변형: canonicalized-page 328건. 예: `/?tab=new`, `/?tab=food`, `/?tab=places`, `/?tab=utah-life`, `/?tab=people`, `/?tab=fun` → 모두 canonical `https://utahsays.com/`
  - 선택지 상세 `/<poll>/c/o_<poll>__<place>`: noindex-page 305건. 예: `/best-burgers-in-utah/c/o_best-burgers-in-utah__apollo-burger`, `/best-park-in-utah/c/o_best-park-in-utah__antelope-island-state-park` → `noindex, follow`
  - `?pick=` 변형. 예: `/best-only-in-utah-restaurant?pick=o_best-only-in-utah-restaurant__black-sheep-cafe`
- **문제 근거**: 크롤러가 사이트맵 URL의 약 5배가 넘는 URL을 발견했다(500 한도 도달). 탭 전환과 투표 선택지가 `<a href>` 링크로 렌더링되는 것으로 보인다.
- **SEO 영향**: 노출 0회(v2 전체 요약 기준)인 신생 사이트에서 Googlebot의 크롤링이 정규 페이지보다 변형 URL에 분산된다. 그만큼 새 투표·장소 페이지의 발견과 색인이 늦어진다.
- **권장 수정 방법** (택1 또는 병행)
  1. 홈 탭(`?tab=`)과 투표 선택(`?pick=`)은 크롤링할 링크가 아니라 상태 변경이므로, `<a href>` 대신 `<button>`과 클라이언트 상태로 구현한다.
  2. 링크 유지가 필요하면 `robots.txt`에 `Disallow: /*?tab=`, `Disallow: /*?pick=`, `Disallow: /*/c/o_`를 추가한다. 단, 이미 noindex인 페이지를 robots로 막으면 Google이 noindex를 볼 수 없다. 색인된 적이 없는 신생 사이트이므로 robots 차단을 우선 권장한다.
  3. 선택지 상세 페이지가 공유용으로 필요하면 noindex를 유지하되, 사이트 내부에서는 해당 링크를 줄인다.
- **확인 방법**: 수정 후 OpenSEO 재오디트(maxPages 500)를 실행한다. 크롤링 URL 수가 사이트맵 규모(약 105~150개)로 줄고 한도에 도달하지 않는지 확인한다. GSC '페이지' 보고서의 "대체 페이지(적절한 표준 태그 포함)" 수 추이도 함께 본다.

### [P1] `/embed/*` 위젯 페이지 색인 제외

- **영향받는 URL** (missing-meta-description 29건). 예: `/embed/best-public-bathroom-in-utah`, `/embed/best-dad-in-utah`, `/embed/best-pro-sports-team-in-utah`, `/embed/byu-vs-utah`, `/embed/is-fry-sauce-utahs-greatest-invention`, `/embed/which-utah-city-would-survive-a-zombie-apocalypse`
- **문제 근거**: 외부 사이트 삽입용 iframe 페이지가 메타 설명 없이 크롤링 대상에 노출돼 있다.
- **SEO 영향**: 원본 투표 페이지와 내용이 겹치는 얇은 페이지가 색인되면, 원본과 검색 노출을 나눠 갖거나 품질 신호를 떨어뜨릴 수 있다.
- **권장 수정 방법**: `/embed/*` 응답에 `X-Robots-Tag: noindex` 헤더나 `<meta name="robots" content="noindex">`를 추가한다. 메타 설명을 따로 작성할 필요는 없다. 원본 투표 페이지로 향하는 canonical을 추가하는 것도 좋다.
- **확인 방법**: `curl -I https://utahsays.com/embed/byu-vs-utah`로 `X-Robots-Tag`를 확인하고, 재오디트에서 missing-meta-description 0건을 확인한다.

### [P2] 허브·장소 페이지 얇은 콘텐츠 보강 (35건)

- **영향받는 URL** 예: `/right-now`, `/people`, `/sports`, `/provo`, `/st-george`, `/c/antelope-island`. 단어 수 예시: 131, 121, 129
- **SEO 영향**: 도시 허브(`/provo`, `/st-george`, `/salt-lake-city`)와 장소 페이지(`/c/...`)는 키워드 갭 분석에서 공략 대상으로 꼽힌 페이지들이다(`docs/seo/content/2026-10-05-utahsays-com-keyword-gap.md`). 본문이 투표 목록뿐이면 "things to do in provo" 같은 정보형 검색 의도를 충족하지 못한다.
- **권장 수정 방법**: 키워드 갭 문서의 H2/H3 목차를 따라 각 허브에 300~600단어 분량의 설명 섹션(요약, 계절별 추천, 투표 결과 해설, FAQ)을 추가한다.
- **확인 방법**: 재오디트 thin-content 건수 감소, GSC에서 해당 URL의 노출 발생 여부.

### [P3] 타이틀 길이 (247건)

- 예: `/explore`(68자), `/right-now`(67자), `/salt-lake-city`, `/st-george`, `/c/antelope-island-state-park`(62자)
- 대부분 템플릿 접미사 때문에 60자를 넘는 것으로 보인다. 템플릿을 `"{페이지명} | Utah Says"` 형태로 짧게 줄이는 것만으로 일괄 해결된다. v1 P1(27건)과 같은 원인이다.

### [P3] 메타 설명 길이

- 너무 짧음(5건): `/privacy`, `/fun`, `/sports`(41자), `/things-to-do`, `/utah-life`. 120~155자로 보강한다.
- 너무 김(3건): `?pick=` 변형 3건(165자). 위 P1을 해결하면 함께 사라진다.

## 3. 다음 확인 일정

- 수정 배포 후 OpenSEO 재오디트(maxPages 500, JS 비렌더링)를 실행한다.
- GSC: 사이트맵 재제출 후 2~4주 동안 색인된 페이지 수와 "크롤링됨 - 현재 색인이 생성되지 않음" 추이를 확인한다.
