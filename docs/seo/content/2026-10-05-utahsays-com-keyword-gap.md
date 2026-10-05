# Utah Says (`utahsays.com`) 키워드 갭 분석

- **대상**: `utahsays.com` (projectId `992bdb6c-b0eb-480a-b6c2-3238f26c8a52`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO MCP → DataForSEO Labs (Google, 미국 `2840` / 영어 `en`). `find_serp_competitors`, `get_ranked_keywords`
- **조회 시점**: 2026-10-05 스냅샷. 검색량은 DataForSEO의 월평균 추정치다(GSC 실측치 아님).
- **원본 데이터**: `docs/seo/data/2026-10-05-utahsays-com-kw-competitors.json`, `…-kw-gap-raw.json`, `…-kw-gap-raw-v2.json`
- **분석 한계**
  - utahsays.com의 순위 키워드는 **0개**다(`get_ranked_keywords` 빈 결과). 그래서 "경쟁사는 있고 우리는 없는" 키워드가 사실상 경쟁사 키워드 전체다. 이 문서는 사이트 형식(투표·도시 허브·장소 페이지)에 맞는 키워드만 골랐다.
  - "near me" 키워드의 검색량은 미국 전국 기준이다. 유타 사용자 비중은 훨씬 작다.
  - 경쟁사 순위는 조회 시점의 순위이며, 우리 사이트의 예상 순위가 아니다.

---

## 1. 경쟁사 선정 근거

시드 키워드 10개(best burgers/hikes/pizza in utah, things to do in utah·st george·salt lake city, hidden gems in utah 등)로 SERP 경쟁 도메인을 조회했다. Reddit·Facebook·YouTube·Instagram·Yelp·Tripadvisor 같은 플랫폼은 제외하고, 유타 전문이면서 형식이 비슷한 사이트를 골랐다.

| 도메인 | 선정 이유 | 전체 순위 키워드 수 |
| --- | --- | --- |
| `utahsadventurefamily.com` | 유타 장소·공원·하이킹·시즌 활동 리스티클. Utah Says의 `/c/` 장소 페이지, outdoors 카테고리와 겹침 | 21,413 |
| `utahvalley.com` | 유타 카운티(Provo·Orem·Lehi) 관광청. `/provo` 허브, 지역 맛집 투표와 겹침 | 12,276 |
| `livelikeitstheweekend.com` (참고) | SERP 가시성 2위. 다만 범용 여행 블로그라 유타 키워드는 일부(SLC·Utah 버킷리스트)만 참고 | 15,568 |

## 2. 우선순위 키워드

점수 기준: ① Utah Says 형식(투표·허브)과의 적합도, ② 키워드 난이도(KD), ③ 검색량, ④ 기존 페이지 활용 가능 여부.

| 순위 | 키워드 | 월 검색량 | KD | 의도 | 경쟁사 순위 | 대응 페이지 |
| --- | --- | ---: | ---: | --- | --- | --- |
| 1 | things to do in provo | 5,400 | 2 | 정보 | utahsadventurefamily 2위 | `/provo` (보강) |
| 1 | things to do in provo utah | 5,400 | 17 | 정보 | utahsadventurefamily 2위 | `/provo` |
| 1 | things to do utah county | 1,300 | 0 | 정보 | utahvalley 2위 | `/provo` 또는 신규 `/utah-county` |
| 2 | things to do in salt lake city | 49,500 | 0 | 정보 | livelikeitstheweekend 4위 | `/salt-lake-city` (보강) |
| 2 | fun things to do in salt lake city | 6,600 | 9 | 정보 | livelikeitstheweekend 1위 | `/salt-lake-city` |
| 2 | things to do in slc | 49,500 | 0 | 정보 | livelikeitstheweekend 2위 | `/salt-lake-city` |
| 3 | fall activities near me | 18,100 | 0 | 정보 | utahsadventurefamily 5위 | 신규 투표 (시즌) |
| 3 | halloween activities near me | 14,800 | 0 | 정보 | utahsadventurefamily 2위 | 신규 투표 (시즌) |
| 4 | date night ideas near me | 33,100 | 0 | 정보 | utahsadventurefamily 2위 | 신규 투표 |
| 4 | date ideas near me | 40,500 | 0 | 상업 | utahsadventurefamily 2위 | 신규 투표 |
| 5 | soda shop | 14,800 | 2 | 탐색 | utahvalley 8위 | 신규 투표 |
| 6 | antelope island | 60,500 | 21 | 정보 | utahsadventurefamily 7위 | `/c/antelope-island` (보강) |
| 6 | bridal veil falls utah | 5,400 | 37 | 상업 | utahvalley 2위 | `/c/bridal-veil-falls` (보강) |
| 6 | cascade springs | 12,100 | 1 | 정보 | utahsadventurefamily 3위 | 신규 `/c/cascade-springs` |
| 7 | things to do in utah | 12,100 | 16 | 정보 | livelikeitstheweekend 5위 | `/things-to-do` (보강) |

제외한 키워드: "splash pads near me"(201,000)와 "trampoline parks near me"(246,000)는 수요가 크지만 여름·실내 시설 디렉터리 성격이다. 지금(10월)은 시즌이 아니어서 2027년 봄 계획으로 미룬다.

## 3. 콘텐츠 제안

### ① `/provo` 허브 보강: "Things to Do in Provo, Utah — Voted by Locals"

- **타깃**: things to do in provo / things to do in provo utah / things to do utah county
- **제목(title)**: `Things to Do in Provo, Utah (Voted by Locals) | Utah Says`
- **메타 설명**: `See what Utah County locals voted the best things to do in Provo — hikes, food, date spots and hidden gems. Cast your vote and see live results.`
- **목차**
  - H2 Top 10 Things to Do in Provo (Live Vote Results)
    - H3 Outdoors: Provo Canyon, Bridal Veil Falls, Y Mountain
    - H3 Food: Provo's Most-Voted Burgers, Pizza & Dessert
    - H3 Rainy-Day & Indoor Picks
  - H2 Things to Do in Provo This Season (Fall)
  - H2 Free Things to Do in Provo
  - H2 Day Trips from Provo (Utah County)
  - H2 FAQ — Is Provo worth visiting? Best time to go?
- **내부 링크**: `/c/bridal-veil-falls`, `/best-burgers-in-utah`, `/outdoors`, `/food`, 신규 "Best Date Night in Utah County" 투표

### ② `/salt-lake-city` 허브 보강: "Fun Things to Do in Salt Lake City"

- **타깃**: things to do in salt lake city / things to do in slc / fun things to do in salt lake city
- **제목**: `Fun Things to Do in Salt Lake City, Ranked by Utah | Utah Says`
- **목차**
  - H2 Salt Lake City's Top-Voted Activities Right Now
  - H2 Best Things to Do in SLC by Category
    - H3 Outdoors near SLC (Ensign Peak, Antelope Island, Mirror Lake Hwy)
    - H3 Food & Drink (burgers, fry sauce, soda shops)
    - H3 With Kids / Free / At Night
  - H2 Hidden Gems Locals Voted For
  - H2 FAQ
- **내부 링크**: `/c/ensign-peak`, `/c/antelope-island`, `/c/mirror-lake-highway`, `/best-fry-sauce-in-utah`, `/right-now`
- **참고**: 검색량이 가장 크지만 Tripadvisor·Visit Salt Lake와 경쟁한다. "투표 결과"라는 차별점을 제목과 첫 문단에 분명히 드러낸다.

### ③ 시즌 투표: "Best Fall Activity in Utah" / "Best Halloween Event in Utah" (즉시 착수)

- **타깃**: fall activities near me (18,100, KD 0), halloween activities near me (14,800, KD 0)
- **이유**: 10월이 시즌 정점이다. 경쟁사는 리스티클 1개(`/13-unique-halloween-activities-in-utah/`, `/fall-activities-in-utah/`)로 2~5위에 올라 있다.
- **제목**: `Best Fall Activities in Utah (2026) — Vote for Your Favorite | Utah Says`
- **목차**: H2 Vote: Utah's Best Fall Activity → H2 Corn Mazes & Pumpkin Patches → H2 Fall Colors Drives (Alpine Loop, Mirror Lake Hwy) → H2 Halloween Events by City (SLC, Provo, St. George) → H2 FAQ
- **내부 링크**: `/outdoors`, `/fun`, `/c/mirror-lake-highway`, 도시 허브 3곳

### ④ 신규 투표: "Best Date Night Spot in Utah"

- **타깃**: date night ideas near me (33,100, KD 0), date ideas near me (40,500, KD 0)
- **제목**: `Best Date Night Ideas in Utah, Voted by Locals | Utah Says`
- **목차**: H2 Live Results → H3 Cheap Date Ideas → H3 Outdoor Dates → H3 Restaurants for Date Night (SLC / Utah County / St. George) → H2 FAQ
- **내부 링크**: `/food`, `/best-burgers-in-utah`, 도시 허브

### ⑤ 신규 투표: "Best Soda Shop in Utah"

- **타깃**: soda shop (14,800, KD 2)
- **이유**: 유타 고유 문화(dirty soda)라 Utah Says의 "only in Utah" 콘셉트와 잘 맞는다. utahvalley.com은 블로그 글 하나로 8위다.
- **제목**: `Best Soda Shop in Utah — Swig vs Sodalicious vs Fiiz? | Utah Says`
- **목차**: H2 Vote → H2 Most-Ordered Dirty Sodas → H2 Soda Shops by City → H2 FAQ (What is dirty soda?)
- **내부 링크**: `/is-fry-sauce-utahs-greatest-invention`(embed 원본), `/food`, `/utah-life`

### ⑥ 장소 페이지 보강: `/c/antelope-island`, `/c/bridal-veil-falls`, 신규 `/c/cascade-springs`

- 현재 `/c/antelope-island`은 얇은 콘텐츠로 분류됐다(오디트 v2). 각 페이지에 H2 "Why Utah Voted for It", H2 "Visitor Info (hours, fees, parking)", H2 "Best Time to Go", H2 "Nearby Places Utahns Love"를 추가한다.
- antelope island(60,500, KD 21)는 검색량이 크지만 공식 사이트와 경쟁한다. 투표 순위와 방문 팁으로 차별화한다.

## 4. 실행 순서

1. 테크니컬 선행 작업: 오디트 v2의 P1(변형 URL 크롤링 차단, `/embed` noindex). 새 페이지가 크롤링 자원을 확보하려면 이게 먼저다.
2. ③ 시즌 투표(10월 안에 게시)
3. ①② 도시 허브 보강
4. ④⑤ 신규 투표, ⑥ 장소 페이지 보강

## 5. 성과 확인

- GSC: 게시 후 4주·8주 시점에 대상 URL의 노출, 클릭, 평균 순위를 확인한다(비교 기준: 게시 전 28일, 현재 0).
- OpenSEO: `get_ranked_keywords target=utahsays.com`을 월 1회 재조회해 순위 키워드 수(현재 0)를 추적한다.
