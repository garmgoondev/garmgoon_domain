# Residential Hub — 맥미니 집 회선 자막 및 크롤링 마이크로서비스

Cloudflare Worker나 VPS 같은 데이터센터 클라우드 환경에서 발생하는 봇 차단(429/403/캡차) 문제를 해결하고, 비싼 비디오 멀티모달 AI 과금을 방지하기 위해 구축된 **맥미니 전용 사설 마이크로서비스 인프라**입니다.

---

## 1. 배경 및 해결한 문제

1. **유튜브 데이터센터 IP 차단**:
   - Cloudflare Worker(Edge)에서 유튜브 Player API나 자막 주소(`timedtext`)로 직접 접근 시, 구글의 데이터센터 IP 차단으로 인해 자막 수집이 실패함.
2. **Gemini 비디오 멀티모달 유료 과금 발생 문제**:
   - 기존에는 자막 수집 실패 시, 영상을 직접 시청하도록 OpenRouter의 `google/gemini-2.5-flash-lite` 비디오 입력을 호출함.
   - 이로 인해 Cron이 돌 때마다 영상 전체 토큰 비용이 발생하여 원치 않는 API 요금이 누적됨.
3. **해결책**:
   - 상시 가동 중인 사용자 자택의 맥미니(가정용 회선 / Residential IP)에 독립된 자막 추출 API 서버(`residential-hub`)를 구축.
   - Cloudflare Tunnel(`hub.garmgoon.com`)로 안전하게 중계하여 외부 API 비용 **0원**으로 자막을 100% 안정적으로 수집.
   - Worker에서 Gemini 2.5 Flash Lite 비디오 분석 호출 로직을 완전 제거하여 유료 과금 원천 차단.

---

## 2. 전체 아키텍처

```mermaid
flowchart LR
    subgraph Cloudflare [Cloudflare Network]
        Worker["garmgoon_domain Worker<br/>(garmgoon.com)"]
        Tunnel["Cloudflare Tunnel<br/>(hub.garmgoon.com)"]
    end

    subgraph Home [사용자 자택 (가정용 인터넷)]
        CFD["cloudflared 데몬"]
        subgraph MacMini ["Mac mini (Residential Hub)"]
            FastAPI["FastAPI 서버<br/>(:8765)"]
            YT["youtube-transcript-api<br/>(IPv4 강제 적용)"]
        end
    end

    subgraph External [외부 서비스]
        YouTube["YouTube 공식 서버"]
    end

    Worker -->|1. 자막 요청 (X-Hub-Key)| Tunnel
    Tunnel --> CFD
    CFD --> FastAPI
    FastAPI --> YT
    YT -->|2. 가정용 회선 IP로 자막 파싱| YouTube
    YouTube -->> YT
    YT -->> FastAPI
    FastAPI -->> Worker
```

---

## 3. 맥미니 인프라 구성 현황

### ① 독립 환경 및 코드 위치
* **경로**: `/Users/ai-server/residential-hub/` (다른 프로젝트와 100% 무관한 독립 폴더)
* **가상환경**: `/Users/ai-server/residential-hub/.venv` (Python 3.13)
* **의존성**: `fastapi`, `uvicorn`, `youtube-transcript-api`

### ② 핵심 기술: IPv4 강제 라우팅
맥미니의 IPv6 주소가 대량 요청으로 인해 유튜브 측에서 일시적으로 레이트 리밋(`IpBlocked`)에 걸릴 수 있습니다. 이를 방지하기 위해 내부 네트워크 요청 시 **IPv4 소켓(`24.2.74.76`)**을 강제로 사용하도록 구성하여 차단율 0%를 유지합니다.

```python
# ~/residential-hub/server.py
import socket
import requests.packages.urllib3.util.connection as urllib3_conn

# IPv6 대신 가정용 IPv4 주소로만 요청
urllib3_conn.allowed_gai_family = lambda: socket.AF_INET
```

### ③ 24/7 백그라운드 구동 및 자동 복구 (Watchdog)
맥미니의 `crontab`에 감시 스크립트가 등록되어 있어, 부팅 시 자동 실행되고 프로세스가 종료되더라도 5분 이내에 자동 복구됩니다:
* `@reboot /bin/bash /Users/ai-server/residential-hub/start.sh >/dev/null 2>&1`
* `*/5 * * * * /bin/bash /Users/ai-server/residential-hub/start.sh >/dev/null 2>&1`

---

## 4. Cloudflare Tunnel 사양

* **터널 이름**: `mac-mini-hub`
* **터널 ID**: `1a9defa7-4ab8-46b8-b8e3-1894d4bb8717`
* **공개 호스트명**: `hub.garmgoon.com`
* **로컬 연결 대상**: `http://localhost:8765`
* **DNS 레코드**: CNAME `hub` ➔ `1a9defa7-4ab8-46b8-b8e3-1894d4bb8717.cfargotunnel.com` (프록시됨)

---

## 5. API 규격 (API Specification)

모든 요청은 보안을 위해 `X-Hub-Key` 헤더를 포함해야 합니다.

### ① 헬스체크
* **엔드포인트**: `GET https://hub.garmgoon.com/health`
* **응답 예시**:
  ```json
  {
    "status": "ok",
    "service": "residential-hub",
    "version": "1.0.0"
  }
  ```

### ② 유튜브 자막 추출
* **엔드포인트**: `GET https://hub.garmgoon.com/v1/youtube/transcript?v={videoId}`
* **헤더**:
  * `X-Hub-Key: <HUB_API_KEY>`
* **파라미터**:
  * `v`: 11자리 영상 ID 또는 유튜브 URL
* **성공 응답 (HTTP 200)**:
  ```json
  {
    "ok": true,
    "video_id": "dQw4w9WgXcQ",
    "language": "English",
    "language_code": "en",
    "is_generated": false,
    "chars": 2089,
    "text": "자막 전체 텍스트..."
  }
  ```
* **실패 응답 (자막 없음 / 비공개 영상 - HTTP 404)**:
  ```json
  {
    "ok": false,
    "error": "no_transcript",
    "message": "영상에 사용 가능한 자막이 없습니다."
  }
  ```

---

## 6. 향후 확장 및 신규 프로젝트 연동 가이드

### ① 새로운 프로젝트에서 자막 기능이 필요할 때
새로운 프로젝트(클라우드 워커, VPS 웹앱, CLI 등)에서 유튜브 자막이 필요하면 복잡한 파이썬 라이브러리나 프록시 설정 없이 **아래 표준 fetch 한 줄**로 맥미니의 집 회선 기능을 사용할 수 있습니다:

```javascript
// Node.js, Next.js, Cloudflare Worker 등 어디서든 사용 가능
async function getYouTubeTranscript(videoId) {
  const res = await fetch(`https://hub.garmgoon.com/v1/youtube/transcript?v=${encodeURIComponent(videoId)}`, {
    headers: { "X-Hub-Key": process.env.HUB_API_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.ok ? data.text : null;
}
```

### ② 맥미니에 새로운 기능(스크래핑, 로컬 AI 등)을 추가할 때
맥미니의 `~/residential-hub/server.py`에 새 라우트만 추가하고 저장하면 모든 프로젝트에서 즉시 활용할 수 있습니다.

* **예: 네이버/쿠팡 봇 차단 우회 크롤러 추가 (`/v1/scrape`)**:
  ```python
  @app.post("/v1/scrape")
  def scrape_web(url: str, x_hub_key: str | None = Header(None)):
      verify_auth(x_hub_key)
      # 맥미니 집 IP로 웹페이지 다운로드
      resp = requests.get(url, headers={"User-Agent": "..."})
      return {"html": resp.text}
  ```
* **예: Whisper 기반 오디오/영상 음성 전사 추가 (`/v1/whisper`)**:
  - 맥미니의 GPU/Apple Silicon Neural Engine을 이용해 오디오 파일을 텍스트로 받아쓰는 엔드포인트를 추가할 수 있습니다.

---

## 7. 운영 및 유지보수 명령어

데스크톱(Orca)에서 맥미니로 SSH 접속하여 상태를 확인할 수 있습니다 (`ssh mac-mini`).

```bash
# 허브 서버 및 터널 프로세스 동작 확인
ps aux | grep -E 'server.py|cloudflared' | grep -v grep

# 실시간 허브 로그 확인
tail -f ~/residential-hub/hub.log

# 실시간 Cloudflare Tunnel 로그 확인
tail -f ~/residential-hub/cloudflared.log

# 허브 수동 재시작
pkill -f 'residential-hub/server.py'
pkill -f 'cloudflared.*1a9defa7'
~/residential-hub/start.sh
```
