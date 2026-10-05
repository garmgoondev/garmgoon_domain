# EverydayTutor (`everydaytutor.net`) 테크니컬 SEO 오디트 리포트 (v2, 전체 크롤링)

- **대상**: `www.everydaytutor.net` (OpenSEO projectId `629af3c0-2782-4d60-a13b-104c7cf1e6b6`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO Site Audit (auditId `e616a20b-7e2f-44cc-9935-22aeea2ac103`, JS 비렌더링, Lighthouse 미실행), `sitemap.xml`(URL 48개)
- **크롤링 기간**: 2026-10-05 07:26:00 ~ 07:28:30 (UTC), 144/144 페이지 (한도 500 미도달 = 링크로 도달 가능한 전체)
- **비교 기준**: v1 리포트 `2026-10-05-everydaytutor-net-technical-audit.md` (auditId `9b9c0731-…`, 50페이지에서 잘림)
- **원본 데이터**: `docs/seo/data/2026-10-05-everydaytutor-net-audit-500.json`
- **분석 한계**: 이슈 수는 OpenSEO 이슈 레코드 수다. meta-description-too-short 기준은 영문 글자 수 기준이라, 번체 중국어 설명문에는 과하게 잡힌다(아래 P3 참고).

---

## 1. 요약

v1은 50페이지에서 잘려 크롤링하지 못한 영역이 있었다. 전체 144페이지를 다시 크롤링한 결과, **v1에 없던 Critical 이슈(깨진 내부 링크) 2건**이 발견됐다.

| 심각도 | 이슈 | 건수 |
| --- | --- | --- |
| Critical | broken-internal-link | 2 |
| Warning | broken-page (404) | 2 |
| Warning | thin-content | 19 |
| Warning | orphan-page | 1 |
| Info | meta-description-too-short | 128 |
| Info | noindex-page (`/search?…`) | 90 |
| Info | canonicalized-page (`/search?…`) | 85 |
| Info | deep-page (`/search?page=5…`) | 11 |
| Info | title-too-short (로그인·가입) | 4 |
| Info | title-too-long | 1 |

## 2. Action Items

### [P0] 인사이트 글의 깨진 내부 링크 수정

| 링크가 있는 페이지 | 깨진 대상 | 상태 |
| --- | --- | --- |
| `/insights/korean-tutor-rates` | `/tutors/taipei/korean` | 404 |
| `/insights/taipei-math-tutor-rates` | `/tutors/taipei/math` | 404 |

- **문제 근거**: 사이트에 실재하는 과목 경로는 `/tutors/mathematics`처럼 전체 영어 이름을 쓴다. 인사이트 글은 존재하지 않는 `taipei/math`, `taipei/korean` 경로로 링크하고 있다.
- **SEO 영향**: 가장 수요가 큰 "家教行情·費用" 계열 키워드를 받아야 할 시세 글(키워드 갭 문서 1순위)이 404로 링크를 흘려보낸다. 사용자는 이탈하고 크롤러는 신뢰도 신호를 잃는다.
- **권장 수정 방법**: 링크를 실제 경로로 교체한다. `taipei/math` 페이지가 없다면 `/tutors/taipei/mathematics`가 있는지 확인하고, 없으면 `/tutors/mathematics`로 교체한다. `taipei/korean`은 한국어 과목 페이지가 없으면 `/search?subject=korean` 대신 정규 랜딩 페이지를 새로 만들지 판단한다. 재발을 막으려면 과목 slug를 상수 하나로 관리한다.
- **확인 방법**: `curl -s -o /dev/null -w "%{http_code}"`로 새 링크 대상이 200인지 확인하고, 재오디트에서 broken-internal-link 0건을 확인한다.

### [P1] 고아 페이지 연결

- `/tutors/new-taipei/chinese`: 내부 링크가 없다. 새북시 허브(`/tutors/new-taipei` 계열)와 국어 과목 허브(`/tutors/chinese`)에서 링크한다.

### [P2] 지역×과목 랜딩 얇은 콘텐츠 (19건)

- 예: `/tutors/taipei/physics`(108단어), `/tutors/taipei/chemistry`, `/tutors/new-taipei/physics`, `/tutors/new-taipei/chemistry`, `/tutors/taichung/chinese`(87단어), `/tutors/taoyuan/english`
- **권장 수정 방법**: 템플릿에 지역별 시세 요약(시세 글로 링크), 수업 방식(대면/온라인), 학년별 수요, FAQ 블록을 넣어 고유 콘텐츠를 만든다. 공개된 교사·학생 게시글이 0건인 조합은 noindex를 검토한다.
- 키워드 갭 문서에서 수요가 확인된 조합(台中英文家教, 台南數學家教, 高雄英文家教 등)을 먼저 보강한다.

### [P3] 메타 설명 길이 (128건)

- 예: `/`(33자), `/tutors/mathematics`(40자), `/tutors/chinese`(35자)
- 번체 중국어는 한 글자의 정보량이 커서, 영문 기준 120자 권장치를 그대로 적용할 필요는 없다. 대신 **60~80자(전각)** 정도로 지역·과목·시세·행동 유도를 담도록 보강한다. 이미 작성된 `docs/seo/content/2026-10-05-everydaytutor-net-rewrite-guide.md`의 템플릿을 따른다.

### [정보] `/search` 변형 URL

- 90건 noindex, 85건 canonical → `/search` 처리가 올바르다. 다만 `?page=5` 이상 깊은 페이지(11건)까지 크롤링되므로, 지역×과목 랜딩 페이지에서 상세 게시글로 직접 링크해 탐색 깊이를 줄이는 것을 권장한다.

## 3. 다음 확인 일정

- P0 수정 배포 직후 재오디트를 실행한다(maxPages 500).
- GSC에서 `/insights/*` URL의 노출과 클릭을 4주 단위로 비교한다.
