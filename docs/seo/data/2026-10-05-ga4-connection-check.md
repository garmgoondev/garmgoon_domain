4개 호출 모두 `status: "ok"`로 응답했습니다. 다만 (3) 전체 세션·활성 사용자는 두 도구 응답 어디에도 없습니다. `organic_overview`는 `channel: "organic_search"` 수치만 반환합니다.

## Utah Says (`992bdb6c-b0eb-480a-b6c2-3238f26c8a52`)

**(1) 속성 식별 정보**
- propertyId: `properties/557341522`
- propertyDisplayName: `Utah Says`
- streamId: `16042607555`
- displayName: `Utah Says web`
- measurementId: `G-QL3BW0J3KY`
- defaultUri: `https://utahsays.com`
- propertyTimeZone: `America/Los_Angeles`
- currencyCode: `USD`

**(2) 조회 기간**
- resolvedDateRange: `2026-09-07` ~ `2026-10-04`
- previousDateRange: `2026-08-10` ~ `2026-09-06`

**(3) 전체 세션·활성 사용자:** 응답에 없음

**(4) Organic Search**
- `current: null`, `previous: null`
- `sessions.current: null`, `activeUsers.current: null`
- `trend: []`
- `warnings: []`, `diagnostics: []`

**(5) measurement health 경고**
- `issueCount: 0`, `issues: []`

## EverydayTutor (`629af3c0-2782-4d60-a13b-104c7cf1e6b6`)

**(1) 속성 식별 정보**
- propertyId: `properties/554632841`
- propertyDisplayName: `EverydayTutor`
- streamId: `15791169472`
- displayName: `EverydayTutor Web`
- measurementId: `G-QPGW2RBST4`
- defaultUri: `https://www.everydaytutor.net`
- propertyTimeZone: `Asia/Taipei`
- currencyCode: `TWD`

**(2) 조회 기간**
- resolvedDateRange: `2026-09-07` ~ `2026-10-04`
- previousDateRange: `2026-08-10` ~ `2026-09-06`

**(3) 전체 세션·활성 사용자:** 응답에 없음

**(4) Organic Search**
- current: `sessions: 2`, `activeUsers: 2`
- previous: `null`
- trend: `20260922` sessions 1, `20261004` sessions 1
- `warnings: []`, `diagnostics: []`

**(5) measurement health 경고**
- `issueCount: 2`
- `issues: ["enhanced_measurement_disabled", "site_search_measurement_disabled"]`
- 해당 응답 필드: `enhancedMeasurement.streamEnabled: false`

전체 채널 세션·활성 사용자가 필요하면 `get_google_analytics_traffic_acquisition`을 추가로 호출해야 합니다.
