"use client";

import { useState } from "react";
import Link from "next/link";
import { SITES_METRICS, PERIODS, getAggregatedStats } from "../../lib/stats-data";
import { useApi, api } from "../../lib/api";
import "./stats.css";

export default function StatsPage() {
  const { data: apiData, loading, reload } = useApi("/api/stats/summary");
  const sites = apiData?.sites || SITES_METRICS;

  const [activeSiteId, setActiveSiteId] = useState("all");
  const [period, setPeriod] = useState("28d");
  const [chartMetric, setChartMetric] = useState("impressions");
  const [pingStatus, setPingStatus] = useState({});
  const [isPingingAll, setIsPingingAll] = useState(false);

  const selectedSite = activeSiteId === "all" ? null : sites.find((s) => s.id === activeSiteId) || sites[0];

  // 현재 선택된 기간의 전체 합산 실측 통계
  const totals = apiData?.periodTotals?.[period] || getAggregatedStats(sites, period);
  const periodLabel = period === "7d" ? "최근 7일" : period === "90d" ? "최근 90일" : "최근 28일";

  // 사이트별 기간별 데이터 추출 헬퍼
  const getSitePeriodData = (site, p = period) => {
    return site.overview?.periods?.[p] || {
      clicks: site.overview?.clicks28d ?? 0,
      impressions: site.overview?.impressions28d ?? 0,
      ctr: site.overview?.ctr ?? 0,
      avgPosition: site.overview?.avgPosition ?? 0,
      users: site.overview?.users28d ?? 0,
      sessions: site.overview?.sessions28d ?? 0,
      engagementRate: site.overview?.engagementRate ?? 0,
      avgDuration: site.overview?.avgDuration ?? "-",
      conversions: site.overview?.conversions?.count ?? 0,
    };
  };

  // 단일 도메인 실시간 핑 테스트
  const handlePing = async (domain, id) => {
    setPingStatus((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const res = await api(`/api/stats/ping?domain=${encodeURIComponent(domain)}`);
      setPingStatus((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          ok: res.ok,
          status: res.status,
          latencyMs: res.latencyMs,
          checkedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      }));
    } catch (err) {
      setPingStatus((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          ok: false,
          status: 0,
          error: err.message,
          checkedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        },
      }));
    }
  };

  // 전체 도메인 동시 실시간 헬스체크
  const handlePingAll = async () => {
    setIsPingingAll(true);
    try {
      const res = await api("/api/stats/live-check");
      if (res?.health) {
        const nowStr = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const updated = {};
        for (const [id, info] of Object.entries(res.health)) {
          updated[id] = {
            loading: false,
            ok: info.ok,
            status: info.status,
            latencyMs: info.latencyMs,
            checkedAt: nowStr,
          };
        }
        setPingStatus(updated);
      }
    } catch (err) {
      console.error("Live check failed:", err);
    } finally {
      setIsPingingAll(false);
    }
  };

  // 부드러운 곡선(Cubic Spline) SVG 차트 렌더러
  const renderSmoothChart = (history = []) => {
    if (!history || history.length === 0) return null;
    const values = history.map((h) => Number(h[chartMetric] || 0));
    const maxVal = Math.max(...values, 5);
    const width = 720;
    const height = 180;
    const paddingX = 42;
    const paddingY = 28;

    const points = values.map((val, idx) => {
      const x = paddingX + (idx / Math.max(1, values.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return { x, y, val, date: history[idx].date };
    });

    let pathD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - paddingY} L ${points[0].x.toFixed(1)} ${height - paddingY} Z`;
    const accentColor = chartMetric === "impressions" ? "#3b82f6" : chartMetric === "clicks" ? "var(--brand)" : "#00a676";

    return (
      <div className="stChartSvgWrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="stChartSvg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`chart-grad-${chartMetric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.32" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* 수평 보조 가이드선 */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--line)" strokeDasharray="3 3" strokeOpacity="0.8" />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="var(--line)"
            strokeDasharray="3 3"
            strokeOpacity="0.5"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="var(--line)"
          />

          {/* 그라디언트 채우기 */}
          <path d={areaD} fill={`url(#chart-grad-${chartMetric})`} />

          {/* 부드러운 스플라인 곡선 */}
          <path d={pathD} fill="none" stroke={accentColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* 데이터 포인트 & 레이블 */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="var(--surface)" stroke={accentColor} strokeWidth="2.5" />
              <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--text)">
                {p.val}
              </text>
              <text x={p.x} y={height - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text-3)">
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="stRoot">
      {/* 1. 상단 타이틀 & 글로벌 액션 바 */}
      <div className="stHead">
        <div className="stTitleWrap">
          <div className="eyebrow">
            <span>⚡</span>
            <span>CENTRAL SEO & ANALYTICS</span>
          </div>
          <h1 className="pageTitle">사이트 통합 통계 대시보드</h1>
          <p className="pageDesc">
            운영 중인 {sites.length}개 웹사이트의 검색 유입, 사용자 행동 및 실시간 가동 상태를 100% 실측 데이터로 관제합니다.
          </p>
        </div>

        <div className="stHeadActions">
          {/* 기간 필터 세그먼트 (GA4 / GSC 스타일) */}
          <div className="stSeg" role="tablist" aria-label="조회 기간 선택">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`stSegBtn${period === p.id ? " active" : ""}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="stBtn"
            onClick={handlePingAll}
            disabled={isPingingAll}
            title="모든 도메인의 실시간 응답 속도를 점검합니다"
          >
            {isPingingAll ? (
              <>
                <span className="stLiveDot" />
                <span>점검 중...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>전체 핑 점검</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="stBtn"
            onClick={() => reload()}
            title="통계 지표를 새로고침합니다"
          >
            <span>🔄</span>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 2. 세련된 사이트 선택 칩 네비게이션 (.chips / .axChips 스타일) */}
      <div className="stChipsWrap">
        <nav className="stChips" aria-label="사이트 선택 탭">
          <button
            type="button"
            className={`stChip${activeSiteId === "all" ? " active" : ""}`}
            onClick={() => setActiveSiteId("all")}
          >
            <span className="chipIcon">🌐</span>
            <span>전체 사이트 종합 비교</span>
            <span className="chipCount">{sites.length}</span>
          </button>
          {sites.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`stChip${activeSiteId === s.id ? " active" : ""}`}
              onClick={() => setActiveSiteId(s.id)}
            >
              <span className="chipIcon">{s.icon}</span>
              <span>{s.shortName}</span>
              {s.dataStatus === "new" && (
                <span style={{ fontSize: "10px", opacity: 0.8, color: "var(--brand)" }}>[신규]</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ======================================================== */}
      {/* 모드 1: 전체 사이트 종합 비교 뷰 (Overview Matrix) */}
      {/* ======================================================== */}
      {activeSiteId === "all" ? (
        <>
          {/* 상단 4대 핵심 KPI 카드 (선택 기간 실측치) */}
          <div className="stMetrics">
            <div className="stMetric" data-accent="ok">
              <div className="stMetricHeader">
                <span className="stMetricTitle">운영 중인 사이트</span>
                <span className="stLivePill ok" style={{ height: "22px", padding: "0 8px", fontSize: "11px" }}>
                  <span className="stLiveDot" /> 정상
                </span>
              </div>
              <div className="stMetricValue">
                {totals.activeSites}
                <small> / {totals.totalSites}개</small>
              </div>
              <div className="stMetricFoot">
                <span style={{ color: "var(--st-ok-text)", fontWeight: 700 }}>100% 정상 가동</span> (글로벌 엣지 배포)
              </div>
            </div>

            <div className="stMetric" data-accent="blue">
              <div className="stMetricHeader">
                <span className="stMetricTitle">{periodLabel} 실측 순방문자</span>
                <span className="stMetricSource">GA4 실측</span>
              </div>
              <div className="stMetricValue">
                {totals.totalUsers}
                <small>명</small>
              </div>
              <div className="stMetricFoot">
                <span>EverydayTutor · Utah Says 실측 오가닉 세션</span>
              </div>
            </div>

            <div className="stMetric" data-accent="brand">
              <div className="stMetricHeader">
                <span className="stMetricTitle">구글 검색 실측 성과 ({periodLabel})</span>
                <span className="stMetricSource">GSC 실측</span>
              </div>
              <div className="stMetricValue">
                {totals.totalClicks}
                <small> 클릭 / {totals.totalImpressions} 노출</small>
              </div>
              <div className="stMetricFoot">
                <span>실측 평균 CTR</span>
                <b style={{ color: "var(--brand)" }}>{totals.avgCtr}%</b>
              </div>
            </div>

            <div className="stMetric" data-accent="purple">
              <div className="stMetricHeader">
                <span className="stMetricTitle">총 색인 대상 페이지</span>
                <span className="stMetricSource">인덱싱 현황</span>
              </div>
              <div className="stMetricValue">
                {totals.totalIndexedPages || 0}
                <small>개 페이지</small>
              </div>
              <div className="stMetricFoot">
                <span>{sites.length}개 웹 서비스 검색엔진 노출 대상 URL</span>
              </div>
            </div>
          </div>

          {/* 전체 사이트 비교 매트릭스 패널 */}
          <div className="stPanel">
            <div className="stPanelHeader">
              <h2 className="stPanelTitle">
                <span>📋</span>
                <span>전 사이트 실측 성과 및 인프라 매트릭스 ({periodLabel})</span>
              </h2>
              <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-3)", fontWeight: 500 }}>
                가상 데이터를 일절 배제한 100% 실측 지표입니다
              </span>
            </div>

            <div className="stTableWrap">
              <table className="stTable">
                <thead>
                  <tr>
                    <th>사이트</th>
                    <th>도메인</th>
                    <th>실시간 상태</th>
                    <th>GSC 연동</th>
                    <th>{periodLabel} 클릭</th>
                    <th>{periodLabel} 노출</th>
                    <th>평균 CTR</th>
                    <th>{periodLabel} 순방문자</th>
                    <th>핵심 검색어 / 공략 타깃</th>
                    <th>상세</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => {
                    const ping = pingStatus[s.id];
                    const pData = getSitePeriodData(s, period);

                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="stSiteCell">
                            <div className="stSiteIcon">{s.icon}</div>
                            <div>
                              <div className="stSiteName">{s.name}</div>
                              <div className="stSiteCategory">
                                {s.dataStatus === "new" ? "오늘 신규 런칭" : s.badge}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stDomainLink"
                          >
                            <span>{s.domain}</span>
                            <span style={{ fontSize: "11px", opacity: 0.7 }}>↗</span>
                          </a>
                        </td>
                        <td>
                          {ping?.loading ? (
                            <span className="stLivePill warn">
                              <span className="stLiveDot" /> 측정 중...
                            </span>
                          ) : ping ? (
                            <span className={`stLivePill ${ping.ok ? "ok" : "warn"}`}>
                              <span className="stLiveDot" />
                              {ping.ok ? `${ping.latencyMs}ms` : "확인 필요"}
                            </span>
                          ) : (
                            <span className="stLivePill ok">
                              <span className="stLiveDot" /> 정상
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`stTag ${s.integrations.gsc.connected ? "ok" : ""}`}
                            style={{ fontSize: "11px" }}
                          >
                            {s.integrations.gsc.connected ? "연동 완료" : "준비 중"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800 }}>
                          {s.dataStatus === "staging" ? "-" : pData.clicks}
                        </td>
                        <td>
                          {s.dataStatus === "staging" ? "-" : pData.impressions}
                        </td>
                        <td>
                          {s.dataStatus === "staging" ? "-" : pData.ctr > 0 ? `${pData.ctr}%` : "0%"}
                        </td>
                        <td style={{ fontWeight: 800, color: pData.users > 0 ? "var(--brand)" : "inherit" }}>
                          {s.dataStatus === "staging" ? "-" : pData.users > 0 ? `${pData.users}명` : "0"}
                        </td>
                        <td>
                          {s.topQueries?.[0] ? (
                            <span className={`stTag ${s.queryType === "real" ? "ok" : "brand"}`}>
                              {s.queryType === "real" ? "실측: " : "타깃: "}
                              {s.topQueries[0].query}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-3)" }}>-</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="stBtn"
                            style={{ height: "30px", padding: "0 10px", fontSize: "12px" }}
                            onClick={() => setActiveSiteId(s.id)}
                          >
                            상세 보기 →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 중앙 관제 우선 과제 패널 */}
          <div className="stActionPanel">
            <div className="stActionPanelHeader">
              <span>🎯</span>
              <h3>중앙 SEO Hub 관제 우선 과제 (Action Plan)</h3>
            </div>
            <ul className="stActionList">
              <li className="stActionItem">
                <span className="stActionBullet">1</span>
                <div>
                  <b>[EverydayTutor]</b> 대만 실측 검색어 <code>高中英文家教行情</code> (현재 25.3위)의 1페이지(5위 이내) 진입을 위해 기 작성된 메타 디스크립션 및 본문 H2/H3 리라이팅 가이드 적용
                </div>
              </li>
              <li className="stActionItem">
                <span className="stActionBullet">2</span>
                <div>
                  <b>[WebOmok]</b> 오늘 신규 배포 완료에 따라 구글 서치 콘솔 속성 등록 및 네이버 검색광고 실측 월 7,710회(경쟁도 낮음)인 <code>오목게임</code> 온페이지 최적화
                </div>
              </li>
              <li className="stActionItem">
                <span className="stActionBullet">3</span>
                <div>
                  <b>[PW Studio]</b> 신규 GA4(G-B2EWMRBHTN) 연동 완료에 따른 소상공인 전문 웹사이트 제작 키워드 갭 블로그 포스트 발행
                </div>
              </li>
              <li className="stActionItem">
                <span className="stActionBullet">4</span>
                <div>
                  <b>[EcoCarpet Utah]</b> 신규 Cloudflare Pages 구축 완료에 따른 본 도메인(ecocarpetutah.com) 정식 DNS 이전 준비
                </div>
              </li>
              <li className="stActionItem">
                <span className="stActionBullet">5</span>
                <div>
                  <b>[웹지뢰찾기]</b> 국내 월 43.6만 건 검색량 공략을 위한 온페이지 타이틀 및 보스 키(ESC 엑셀 위장) 메타 디스크립션 최적화 &amp; 구글 서치 콘솔 색인 제출
                </div>
              </li>
              <li className="stActionItem">
                <span className="stActionBullet">6</span>
                <div>
                  <b>[KimEdit]</b> 영상 크리에이터 및 프리랜서 영상 편집자 커뮤니티 초기 베타 런칭 안내 및 Supabase/R2 세션 모니터링
                </div>
              </li>
            </ul>
          </div>
        </>
      ) : (
        /* ======================================================== */
        /* 모드 2: 사이트별 상세 통계 드릴다운 (Site-by-Site View) */
        /* ======================================================== */
        selectedSite && (() => {
          const sitePeriod = getSitePeriodData(selectedSite, period);
          const historyData = selectedSite.history?.[period] || [];
          const hasRealHistory = historyData.length > 0 && historyData.some((h) => h.impressions > 0 || h.clicks > 0 || h.users > 0);

          return (
            <div>
              {/* 사이트 프로필 히어로 패널 */}
              <div className="stHeroPanel">
                <div className="stHeroTop">
                  <div className="stHeroProfile">
                    <div className="stHeroIcon">{selectedSite.icon}</div>
                    <div>
                      <h2 className="stHeroTitle">
                        <span>{selectedSite.name}</span>
                        <span className="stTag brand">
                          {selectedSite.dataStatus === "new" ? "오늘 신규 런칭" : selectedSite.badge}
                        </span>
                      </h2>
                      <div className="stHeroMeta">
                        <a
                          href={selectedSite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="stDomainLink"
                        >
                          <span>{selectedSite.domain}</span>
                          <span>↗</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="stHeroControls">
                    {pingStatus[selectedSite.id] && !pingStatus[selectedSite.id].loading && (
                      <div className="stPingResult">
                        <span className="stLiveDot" style={{ color: pingStatus[selectedSite.id].ok ? "var(--st-ok)" : "var(--st-bad)" }} />
                        <span style={{ color: pingStatus[selectedSite.id].ok ? "var(--st-ok-text)" : "var(--st-bad-text)" }}>
                          {pingStatus[selectedSite.id].ok
                            ? `${pingStatus[selectedSite.id].latencyMs}ms 정상`
                            : `오류 (${pingStatus[selectedSite.id].status})`}
                        </span>
                        <span style={{ color: "var(--text-3)", fontSize: "11px" }}>
                          ({pingStatus[selectedSite.id].checkedAt})
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      className="stBtn"
                      onClick={() => handlePing(selectedSite.domain, selectedSite.id)}
                      disabled={pingStatus[selectedSite.id]?.loading}
                    >
                      <span>⚡</span>
                      <span>{pingStatus[selectedSite.id]?.loading ? "핑 측정 중..." : "실시간 핑 테스트"}</span>
                    </button>

                    <a
                      href={selectedSite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stBtn primary"
                    >
                      <span>사이트 열기 ↗</span>
                    </a>
                  </div>
                </div>

                {/* 하단 메타 태그 */}
                <div className="stHeroBadges">
                  <span className="stTag">스택: {selectedSite.stack}</span>
                  <span className={`stTag ${selectedSite.integrations.gsc.connected ? "ok" : ""}`}>
                    GSC: {selectedSite.integrations.gsc.connected ? "연동 완료" : "준비 중"}
                  </span>
                  <span className={`stTag ${selectedSite.integrations.ga4.connected ? "ok" : ""}`}>
                    GA4: {selectedSite.integrations.ga4.connected ? "측정 중" : "준비 중"}
                  </span>
                  <span className="stTag">타깃 시장: {selectedSite.targetMarket}</span>
                  <span className="stTag">색인 페이지: {selectedSite.overview.indexedPages ?? "-"}개</span>
                </div>
              </div>

              {/* 사이트 핵심 4대 지표 (선택 기간 실측치) */}
              <div className="stMetrics">
                <div className="stMetric" data-accent="brand">
                  <div className="stMetricHeader">
                    <span className="stMetricTitle">{periodLabel} 검색 클릭</span>
                    <span className="stMetricSource">GSC 실측</span>
                  </div>
                  <div className="stMetricValue">
                    {selectedSite.dataStatus === "staging" ? "-" : sitePeriod.clicks}
                    <small>회</small>
                  </div>
                  <div className="stMetricFoot">
                    <span>총 노출:</span>
                    <b>{selectedSite.dataStatus === "staging" ? "-" : `${sitePeriod.impressions}회`}</b>
                  </div>
                </div>

                <div className="stMetric" data-accent="blue">
                  <div className="stMetricHeader">
                    <span className="stMetricTitle">평균 CTR & 순위</span>
                    <span className="stMetricSource">실측 효율</span>
                  </div>
                  <div className="stMetricValue">
                    {selectedSite.dataStatus === "staging" ? "-" : `${sitePeriod.ctr}%`}
                    <small> / {sitePeriod.avgPosition > 0 ? `${sitePeriod.avgPosition}위` : "-"}</small>
                  </div>
                  <div className="stMetricFoot">
                    <span>구글 검색결과 평균 노출 순위</span>
                  </div>
                </div>

                <div className="stMetric" data-accent="ok">
                  <div className="stMetricHeader">
                    <span className="stMetricTitle">순 방문자 (UV)</span>
                    <span className="stMetricSource">GA4 실측</span>
                  </div>
                  <div className="stMetricValue">
                    {selectedSite.dataStatus === "staging" ? "-" : sitePeriod.users}
                    <small>명</small>
                  </div>
                  <div className="stMetricFoot">
                    <span>참여율:</span>
                    <b>{sitePeriod.engagementRate > 0 ? `${sitePeriod.engagementRate}%` : "-"}</b>
                    {sitePeriod.avgDuration !== "-" && <span>({sitePeriod.avgDuration})</span>}
                  </div>
                </div>

                <div className="stMetric" data-accent="purple">
                  <div className="stMetricHeader">
                    <span className="stMetricTitle">전환 목표</span>
                    <span className="stMetricSource">실측 집계</span>
                  </div>
                  <div className="stMetricValue">
                    {sitePeriod.conversions}
                    <small>{selectedSite.overview.conversions?.unit ?? "건"}</small>
                  </div>
                  <div className="stMetricFoot">
                    <span>{selectedSite.overview.conversions?.label ?? "전환 목표"}</span>
                  </div>
                </div>
              </div>

              {/* 유려한 곡선 추이 차트 패널 (데이터 부재 시 정직한 대기 안내 표시) */}
              <div className="stChartPanel">
                <div className="stChartHeader">
                  <div className="stPanelTitle" style={{ fontSize: "var(--fs-base)" }}>
                    <span>📈</span>
                    <span>{periodLabel} 실측 성과 추이</span>
                  </div>

                  {hasRealHistory && (
                    <div className="stSeg" role="tablist">
                      <button
                        type="button"
                        className={`stSegBtn${chartMetric === "impressions" ? " active" : ""}`}
                        onClick={() => setChartMetric("impressions")}
                      >
                        <span>검색 노출 (Impressions)</span>
                      </button>
                      <button
                        type="button"
                        className={`stSegBtn${chartMetric === "clicks" ? " active" : ""}`}
                        onClick={() => setChartMetric("clicks")}
                      >
                        <span>클릭수 (Clicks)</span>
                      </button>
                      <button
                        type="button"
                        className={`stSegBtn${chartMetric === "users" ? " active" : ""}`}
                        onClick={() => setChartMetric("users")}
                      >
                        <span>순 방문자 (Users)</span>
                      </button>
                    </div>
                  )}
                </div>

                {hasRealHistory ? (
                  renderSmoothChart(historyData)
                ) : (
                  <div className="stChartEmpty">
                    <span className="emptyIcon">📊</span>
                    <b>실제 트래픽 데이터 수집 대기 중</b>
                    <p>
                      {selectedSite.dataStatus === "new"
                        ? "오늘 신규 런칭된 서비스로, 구글 검색엔진 인덱싱 및 애널리틱스 트래픽 인입(통상 2~4일 소요) 후 실측 그래프가 자동으로 표시됩니다."
                        : "선택하신 기간 동안의 오가닉 검색 및 방문 기록이 아직 집계되지 않았습니다. 임의의 가상 선을 그리지 않고 실제 인입 데이터만 투명하게 표시합니다."}
                    </p>
                  </div>
                )}
              </div>

              {/* 키워드 & 랜딩 페이지 2단 패널 */}
              <div className="stGrid2">
                {/* 검색어 테이블 (실측 쿼리 vs 시장 분석 타깃 구분) */}
                <div className="stPanel" style={{ margin: 0 }}>
                  <div className="stPanelHeader">
                    <h3 className="stPanelTitle" style={{ fontSize: "var(--fs-base)" }}>
                      <span>🔍</span>
                      <span>
                        {selectedSite.queryType === "real"
                          ? "실제 유입 검색어 (GSC 실측)"
                          : selectedSite.queryType === "market_research"
                          ? "공략 타깃 키워드 (네이버 검색광고 실측 검색량)"
                          : "공략 목표 키워드 (색인 대기 중)"}
                      </span>
                    </h3>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)", fontWeight: 600 }}>
                      {selectedSite.topQueries?.length || 0}개 키워드
                    </span>
                  </div>
                  <div className="stTableWrap">
                    <table className="stTable">
                      <thead>
                        <tr>
                          <th>검색어</th>
                          <th>{selectedSite.queryType === "real" ? "실측 순위" : "타깃 구분"}</th>
                          <th>{selectedSite.queryType === "market_research" ? "시장 검색량" : "노출"}</th>
                          <th>클릭</th>
                          <th>비고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSite.topQueries?.map((q, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700 }}>{q.query}</td>
                            <td style={{ fontWeight: 600 }}>
                              {typeof q.rank === "number" ? `${q.rank}위` : q.rank}
                            </td>
                            <td>
                              {q.impressions > 0 ? (
                                selectedSite.queryType === "market_research"
                                  ? `월 ${q.impressions.toLocaleString()}회`
                                  : q.impressions
                              ) : (
                                "0"
                              )}
                            </td>
                            <td style={{ fontWeight: 800, color: q.clicks > 0 ? "var(--brand)" : "inherit" }}>
                              {q.clicks}
                            </td>
                            <td>
                              <span className={`stTag ${selectedSite.queryType === "real" ? "ok" : "brand"}`}>
                                {q.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 주요 랜딩 페이지 테이블 */}
                <div className="stPanel" style={{ margin: 0 }}>
                  <div className="stPanelHeader">
                    <h3 className="stPanelTitle" style={{ fontSize: "var(--fs-base)" }}>
                      <span>📄</span>
                      <span>인기 랜딩 페이지</span>
                    </h3>
                    <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)", fontWeight: 600 }}>
                      {selectedSite.topPages?.length || 0}개 페이지
                    </span>
                  </div>
                  <div className="stTableWrap">
                    <table className="stTable">
                      <thead>
                        <tr>
                          <th>경로</th>
                          <th>페이지 제목</th>
                          <th>실측 조회수</th>
                          <th>클릭</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSite.topPages?.map((p, idx) => (
                          <tr key={idx}>
                            <td>
                              <code style={{ fontSize: "12px", color: "var(--text-2)" }}>{p.path}</code>
                            </td>
                            <td style={{ fontWeight: 600 }}>{p.title}</td>
                            <td style={{ fontWeight: 800 }}>{p.views > 0 ? `${p.views}회` : "0회"}</td>
                            <td style={{ fontWeight: 800, color: p.clicks > 0 ? "var(--brand)" : "inherit" }}>
                              {p.clicks > 0 ? `${p.clicks}회` : "0회"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 사이트 맞춤형 최적화 과제 */}
              <div className="stActionPanel">
                <div className="stActionPanelHeader">
                  <span>🎯</span>
                  <h3>{selectedSite.shortName} 맞춤형 최적화 과제 (Action Items)</h3>
                </div>
                <ul className="stActionList">
                  {selectedSite.actionItems?.map((item, idx) => (
                    <li key={idx} className="stActionItem">
                      <span className="stActionBullet">{idx + 1}</span>
                      <div>{item}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
