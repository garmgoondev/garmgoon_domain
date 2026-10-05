# EcoCarpet Utah (`ecocarpetutah.com` → `new.ecocarpetutah.com`) 키워드 갭 분석

- **대상**: 기존 운영 사이트 `ecocarpetutah.com`, 교체 예정 데모 `new.ecocarpetutah.com` (projectId `d90ac9ec-e2d5-4d10-8a63-d80b15c2750e`)
- **작성일**: 2026-10-05
- **데이터 출처**: OpenSEO MCP → DataForSEO Labs (Google, 미국 `2840` / `en`). `find_serp_competitors`, `get_ranked_keywords`
- **조회 시점**: 2026-10-05 스냅샷. 검색량과 CPC는 DataForSEO 추정치다.
- **원본 데이터**: `docs/seo/data/2026-10-05-ecocarpetutah-com-kw-competitors.json`, `…-kw-gap-raw.json`
- **분석 한계**
  - GSC는 연결되지 않았다(데모 단계, 본 도메인 전환 시 연결 예정). 그래서 실제 클릭·노출 대신 DataForSEO 순위 추정치를 사용했다.
  - 지역 서비스업은 Google 지도(로컬팩) 순위가 핵심이지만, 이 분석은 일반 검색(organic) 순위만 다룬다. Google Business Profile 분석은 별도로 필요하다.
  - 서비스 지역(어느 도시까지 출장하는지)은 사업주 확인이 필요하다. 아래 도시 목록은 데이터상 기회일 뿐이다.

---

## 1. 가장 중요한 발견: 기존 사이트의 순위를 지켜야 한다

다른 사이트들과 달리, **기존 `ecocarpetutah.com`은 이미 129개 키워드로 순위에 올라 있다.** 새 사이트로 교체할 때 URL이 바뀌고 리디렉션이 없으면 이 순위는 사라진다.

| 기존 URL | 대표 키워드 | 현재 순위 | 월 검색량 |
| --- | --- | ---: | ---: |
| `/` | carpet cleaning orem | 4 | 320 |
| `/` | eco friendly carpet cleaning | 7 | 1,600 |
| `/` | eco friendly carpet cleaners | 8 | 1,600 |
| `/` | eco carpet cleaning / eco carpet cleaners | 2 | 480 |
| `/` | carpet cleaners provo utah | 9 | 260 |
| `/` | carpet cleaning utah county | 11 | 210 |
| `/blog/how-to-get-gum-out-of-carpet.html` | how to get gum out of carpet | 21 | 3,600 |
| `/blog/juicespills.html` | spilled juice | 17 | 480 |
| `/blog/how-often-should-i-vacuum.php` | how often should you vacuum carpet | 51 | 590 |
| `/contact.html` | carpet cleaning provo utah | 58 | 260 |
| `/service/upholsterycleaning.html` | upholstery cleaning slc | 43 | 30 |

### [P0] 도메인 전환 전 리디렉션 맵 작성

1. 기존 사이트의 전체 URL 목록을 확보한다. OpenSEO 오디트를 `https://ecocarpetutah.com/`으로 1회 실행하고, 기존 사이트맵도 함께 확인한다.
2. 블로그 글 3개(`gum`, `juicespills`, `how-often-should-i-vacuum`)는 **새 사이트에 내용을 옮기고** `/blog/<slug>`로 301 리디렉션한다. 순위 키워드 상당수가 이 글들에서 나온다.
3. `.html`·`.php` 서비스 페이지는 새 사이트의 대응 서비스 페이지로 1:1 301 리디렉션한다. 대응 페이지가 없으면 홈이 아니라 가장 가까운 서비스 페이지로 보낸다.
4. 새 홈의 title·H1에 "eco-friendly / natural carpet cleaning"을 유지한다. 현재 홈의 "Natural, no-residue"도 좋지만, 순위가 있는 "eco friendly" 표현이 빠지면 안 된다.
5. 전환 당일 GSC 도메인 속성을 인증하고 새 사이트맵을 제출한다.

- **확인 방법**: 전환 후 기존 URL 전체에 `curl -I`를 실행해 301과 목적지 200을 확인한다. 2주 뒤 `get_ranked_keywords target=ecocarpetutah.com`로 순위 키워드 수(현재 129)를 비교한다.

## 2. 경쟁사 선정 근거

시드 키워드 10개(carpet cleaning orem·provo·utah county·lehi·american fork, upholstery cleaning provo 등)로 SERP 경쟁 도메인을 조회했다. Yelp·Thumbtack·Facebook 같은 디렉터리와 전국 프랜차이즈(Oxi Fresh, Zerorez)는 제외했다.

| 도메인 | 선정 이유 | 전체 순위 키워드 수 |
| --- | --- | ---: |
| `trurinse.com` | 유타 카운티 지역 업체. 일반 검색 가시성 2위, 도시별 랜딩 페이지로 다수 도시에서 4~5위 | 128 |
| `hellocleancarpetcleaning.com` | 유타 카운티 지역 업체. American Fork·Pleasant Grove 등 도시 페이지 보유 | 15 |

## 3. 키워드 갭: 도시별 랜딩 페이지

trurinse는 **도시마다 별도 페이지**를 두고 4~5위를 차지한다. 기존 ecocarpetutah.com은 같은 키워드에서 홈페이지 하나로 40~60위에 머문다.

| 키워드 | 월 검색량 | KD | CPC($) | trurinse 순위 | 기존 Eco 순위 |
| --- | ---: | ---: | ---: | ---: | ---: |
| carpet cleaning st george | 590 | 0 | 17.41 | 9 | — |
| carpet cleaning saratoga springs | 140 | 0 | 10.49 | 4 | — |
| lehi utah carpet cleaning | 140 | 0 | 14.62 | 4 | — |
| carpet cleaning springville utah | 110 | 0 | 8.30 | 4 | 42 |
| carpet cleaning american fork | 110 | 0 | 17.08 | 10 | 61 |
| carpet cleaning spanish fork | 110 | 0 | 21.78 | 12 | 50 |
| carpet cleaning west jordan | 110 | 0 | 10.67 | 6 | 63 |
| carpet cleaning eagle mountain | 90 | 0 | 39.51 | 4 | — |
| carpet cleaning south jordan | 70 | 1 | 14.33 | 10 | 64 |
| carpet cleaning herriman | 50 | 0 | 27.42 | 4 | 42 |
| carpet cleaning pleasant grove | 50 | 0 | 8.81 | — (hello clean 6) | 31 |
| carpet cleaning mapleton | 30 | 0 | 38.02 | 6 | 51 |

- KD가 거의 0이고 CPC가 높다(광고 단가가 높다 = 전환 가치가 높다).
- 새 사이트 홈은 "Orem, Provo & Utah County"를 표방한다. 그러니 **유타 카운티 도시부터** 페이지를 만든다: Lehi, American Fork, Saratoga Springs, Eagle Mountain, Springville, Spanish Fork, Pleasant Grove, Mapleton. St. George(590)와 솔트레이크 카운티 도시는 실제로 출장 가능할 때만 만든다.

### 도시 페이지 템플릿 (예: Lehi)

- **URL**: `/carpet-cleaning/lehi-ut`
- **제목**: `Carpet Cleaning in Lehi, UT — Natural, No-Residue | EcoCarpet Utah`
- **메타 설명**: `Eco-friendly carpet, upholstery and tile cleaning in Lehi, Utah. Instant online pricing from $39/room, same-week booking, kid- and pet-safe.`
- **목차**
  - H1 Eco-Friendly Carpet Cleaning in Lehi, UT
  - H2 Our Lehi Carpet Cleaning Prices (실제 가격표 / 온라인 견적 버튼)
  - H2 Services in Lehi
    - H3 Carpet Cleaning · H3 Upholstery · H3 Tile & Grout · H3 Pet Stain & Odor
  - H2 Neighborhoods We Serve in Lehi (실제 출장 지역)
  - H2 Recent Lehi Jobs / Reviews (실제 리뷰만)
  - H2 FAQ — How long to dry? Is it safe for pets?
- **내부 링크**: 서비스 페이지 4개, 인접 도시 2곳(American Fork, Saratoga Springs), 예약 페이지
- **주의**: 도시 이름만 바꾼 복제 페이지는 저품질로 평가된다. 도시마다 출장 지역, 리뷰, 사진처럼 고유한 내용을 최소 2개 넣는다.

## 4. 키워드 갭: 서비스·정보형

| 키워드 | 월 검색량 | KD | 경쟁사 순위 | 제안 |
| --- | ---: | ---: | --- | --- |
| polyester fabric upholstery | 1,600 | 0 | trurinse 6 | 업홀스터리 서비스 페이지에 "원단별 세척법" 가이드 섹션 추가 |
| how to clean spill on carpet | 140 | 0 | trurinse 6 | 기존 juicespills 글을 "Carpet Spill Guide"로 확장 |
| how often to get carpets cleaned | 50 | 0 | trurinse 10 | 기존 vacuum 글과 묶어 "Carpet Care Schedule" 글로 |
| pet odor removal carpet cleaning | 30 | 10 | trurinse 20 | Pet Stain & Odor 서비스 페이지 |
| utah carpet cleaning | 210 | 5 | trurinse 4 (기존 Eco 45) | 홈 title·H1에 "Utah" 명시 |

### 업홀스터리 서비스 페이지 (예시 목차)

- **제목**: `Upholstery Cleaning in Utah County — Couch & Chair Cleaning | EcoCarpet Utah`
- H2 Upholstery Cleaning Prices → H2 Fabrics We Clean (H3 Polyester · H3 Microfiber · H3 Olefin/Polypropylene · H3 Leather) → H2 Our Natural Cleaning Process → H2 FAQ
- **내부 링크**: 도시 페이지, 블로그 "Carpet Spill Guide", 예약

## 5. 실행 순서

1. [P0] 리디렉션 맵과 블로그 이전(전환 전에 반드시)
2. 유타 카운티 도시 페이지 4개(Lehi, American Fork, Saratoga Springs, Springville)
3. 업홀스터리·펫 서비스 페이지, 블로그 확장
4. 나머지 도시 페이지(실제 서비스 지역 확인 후)

## 6. 성과 확인

- 전환 후 2주: 기존 순위 키워드 유지율(129개 기준)
- 전환 후 4주·8주: GSC에서 도시 페이지별 노출, 클릭, 평균 순위. 비교 기준은 전환 전 DataForSEO 순위(위 표)
