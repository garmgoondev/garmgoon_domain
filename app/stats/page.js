"use client";

import { useState } from "react";
import Link from "next/link";
import { SITES_METRICS, getAggregatedStats } from "../../lib/stats-data";
import { useApi, api } from "../../lib/api";
import "./stats.css";

export default function StatsPage() {
  const { data: apiData, loading, reload } = useApi("/api/stats/summary");
  const sites = apiData?.sites || SITES_METRICS;
  const totals = apiData?.totals || getAggregatedStats(sites);

  const [activeSiteId, setActiveSiteId] = useState("all");
  const [chartMetric, setChartMetric] = useState("impressions");
  const [pingStatus, setPingStatus] = useState({});
  const [isPingingAll, setIsPingingAll] = useState(false);

  const selectedSite = activeSiteId === "all" ? null : sites.find((s) => s.id === activeSiteId) || sites[0];

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

  // SVG 차트 그리기 헬퍼
  const renderChart = (history = []) => {
    if (!history || history.length === 0) return null;
    const values = history.map((h) => Number(h[chartMetric] || 0));
    const maxVal = Math.max(...values, 5);
    const minVal = 0;
    const width = 680;
    const height = 150;
    const paddingX = 40;
    const paddingY = 24;

    const points = values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - (val / maxVal) * (height - paddingY * 2);
      return { x, y, val, date: history[idx].date };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
    const areaPoints = `${points[0].x},${height - paddingY} ${polylinePoints} ${points[points.length - 1].x},${height - paddingY}`;

    const color = chartMetric === "impressions" ? "#3b82f6" : chartMetric === "clicks" ? "#ff5a36" : "#10b981";

    return (
      <div className="stChartSvgWrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="stChartSvg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${chartMetric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* 가로 보조선 */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="var(--line)" strokeDasharray="3 3" />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="var(--line)"
          />

          {/* 그라디언트 채우기 */}
          <polygon points={areaPoints} fill={`url(#grad-${chartMetric})`} />

          {/* 선 그래프 */}
          <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={polylinePoints} />

          {/* 포인트 & 레이블 */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" fill="var(--surface)" stroke={color} strokeWidth="2.5" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
                {p.val}
              </text>
              <text x={p.x} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--text-3)">
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
      {/* 헤더 섹션 */}
      <div className="stHead">
        <div className="stTitleWrap">
          <div className="eyebrow">📊 MULTI-SITE ANALYTICS</div>
          <h1 className="pageTitle">사이트 통합 통계 대시보드</h1>
          <p className="pageDesc">
            운영 중인 {sites.length}개 웹사이트의 검색 트래픽, GA4 사용자, SEO 키워드 및 실시간 가동 상태를 사이트별로 모니터링합니다.
          </p>
        </div>
        <div className="stHeadActions">
          <button
            type="button"
            className="stRefreshBtn"
            onClick={handlePingAll}
            disabled={isPingingAll}
            title="모든 도메인의 실시간 응답 상태를 동시 점검합니다"
          >
            {isPingingAll ? "⚡ 점검 중..." : "⚡ 전체 실시간 핑 점검"}
          </button>
          <button
            type="button"
            className="stRefreshBtn"
            onClick={() => reload()}
            title="통계 데이터를 새로고침합니다"
          >
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* 사이트 선택 네비게이션 탭 */}
      <nav className="stSiteNav" aria-label="사이트 선택 탭">
        <button
          type="button"
          className={`stSiteTab${activeSiteId === "all" ? " active" : ""}`}
          onClick={() => setActiveSiteId("all")}
        >
          <span className="tabIcon">🌐</span>
          전체 사이트 종합 비교
          <span className="tabBadge">{sites.length}</span>
        </button>
        {sites.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stSiteTab${activeSiteId === s.id ? " active" : ""}`}
            onClick={() => setActiveSiteId(s.id)}
          >
            <span className="tabIcon">{s.icon}</span>
            {s.shortName}
          </button>
        ))}
      </nav>

      {/* ======================================================== */}
      {/* 모드 1: 전체 사이트 종합 비교 뷰 (Overview Matrix) */}
      {/* ======================================================== */}
      {activeSiteId === "all" ? (
        <>
          {/* 상단 4대 종합 KPI 카드 */}
          <div className="stMetrics">
            <div className="stMetricCard" data-tone="green">
              <div className="stMetricLabel">
                <span>모니터링 대상 사이트</span>
                <span>🟢 정상</span>
              </div>
              <div className="stMetricValue">
                {totals.activeSites}
                <small> / {totals.totalSites}개</small>
              </div>
              <div className="stMetricSub">
                <span className="stPositive">100% 가동 중</span> (모든 엣지 서버 정상)
              </div>
            </div>

            <div className="stMetricCard" data-tone="blue">
              <div className="stMetricLabel">
                <span>최근 28일 총 순방문자</span>
                <span>GA4 / Cloudflare</span>
              </div>
              <div className="stMetricValue">
                {totals.totalUsers28d}
                <small>명</small>
              </div>
              <div className="stMetricSub">
                WebOmok 및 Garmgoon 유입 강세
              </div>
            </div>

            <div className="stMetricCard" data-tone="orange">
              <div className="stMetricLabel">
                <span>구글 검색 성과 (28일)</span>
                <span>GSC 집계</span>
              </div>
              <div className="stMetricValue">
                {totals.totalClicks28d}
                <small> 클릭 / {totals.totalImpressions28d} 노출</small>
              </div>
              <div className="stMetricSub">
                평균 CTR <span className="stPositive">{totals.avgCtr}%</span>
              </div>
            </div>

            <div className="stMetricCard" data-tone="purple">
              <div className="stMetricLabel">
                <span>비즈니스 전환 및 액션</span>
                <span>누적</span>
              </div>
              <div className="stMetricValue">
                {totals.totalConversions.toLocaleString()}
                <small>건</small>
              </div>
              <div className="stMetricSub">
                게임 대국, 견적 문의, 파이프라인
              </div>
            </div>
          </div>

          {/* 전체 사이트 비교 매트릭스 테이블 */}
          <div className="stTableWrap">
            <div className="stTableHeader">
              <h3>
                <span>📋</span> 전체 관리 사이트 성과 및 인프라 매트릭스
              </h3>
              <span className="stMetricSub">사이트를 클릭하면 상세 통계로 이동합니다</span>
            </div>
            <div className="stTableScroll">
              <table className="stTable">
                <thead>
                  <tr>
                    <th>사이트</th>
                    <th>도메인</th>
                    <th>실시간 상태</th>
                    <th>GSC 연동</th>
                    <th>28일 클릭</th>
                    <th>28일 노출</th>
                    <th>CTR</th>
                    <th>28일 방문자</th>
                    <th>핵심 유입/공략 키워드</th>
                    <th>상세</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => {
                    const ping = pingStatus[s.id];
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="stSiteCell">
                            <span className="stSiteIcon">{s.icon}</span>
                            <div>
                              <div className="stSiteTitle">{s.name}</div>
                              <span className="stQueryTag" style={{ fontSize: "10px", padding: "1px 5px" }}>
                                {s.badge}
                              </span>
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
                            {s.domain} ↗
                          </a>
                        </td>
                        <td>
                          {ping?.loading ? (
                            <span className="stStatusBadge warn">
                              <span className="stStatusDot" /> 측정 중...
                            </span>
                          ) : ping ? (
                            <span className={`stStatusBadge ${ping.ok ? "ok" : "warn"}`}>
                              <span className="stStatusDot" />
                              {ping.ok ? `${ping.latencyMs}ms` : "점검 요망"}
                            </span>
                          ) : (
                            <span className="stStatusBadge ok">
                              <span className="stStatusDot" /> 정상
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "12px",
                              color: s.integrations.gsc.connected ? "#00774f" : "var(--text-3)",
                              fontWeight: 600,
                            }}
                          >
                            {s.integrations.gsc.connected ? "연동 완료" : "준비 중"}
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--st-mono)", fontWeight: 700 }}>
                          {s.overview.clicks28d ?? "-"}
                        </td>
                        <td style={{ fontFamily: "var(--st-mono)" }}>
                          {s.overview.impressions28d ?? "-"}
                        </td>
                        <td style={{ fontFamily: "var(--st-mono)" }}>
                          {s.overview.ctr ? `${s.overview.ctr}%` : "-"}
                        </td>
                        <td style={{ fontFamily: "var(--st-mono)", fontWeight: 700, color: "var(--brand)" }}>
                          {s.overview.users28d ? `${s.overview.users28d}명` : "-"}
                        </td>
                        <td>
                          {s.topQueries?.[0] ? (
                            <span className="stQueryTag">
                              {s.topQueries[0].query}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-3)" }}>-</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="stActionBtn"
                            onClick={() => setActiveSiteId(s.id)}
                          >
                            상세 보기 ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 중앙 SEO 관제 안내 및 빠른 추천 액션 */}
          <div className="stActionBox">
            <h3>
              <span>🎯</span> 전 사이트 통합 SEO 최우선 과제 (SEO Hub 관제)
            </h3>
            <ul className="stActionList">
              <li>
                <b>[EverydayTutor]</b> 대만 검색어 <code>高中英文家教行情</code> (현재 25.3위)의 1페이지(5위 이내) 진입을 위한 콘텐츠 리라이팅 가이드 적용
              </li>
              <li>
                <b>[WebOmok]</b> 네이버 월 7,710회 검색량에 경쟁도 '낮음'인 <code>오목게임</code> 키워드 온페이지(H1, Title, FAQ) 선점 및 일본어 메타 보강
              </li>
              <li>
                <b>[PW Studio]</b> 신규 GA4(G-B2EWMRBHTN) 연동 완료 후 소상공인 공식 홈페이지 제작 키워드 갭 블로그 포스트 발행
              </li>
              <li>
                <b>[EcoCarpet Utah]</b> 신규 Cloudflare Pages 구축 완료에 따른 본 도메인(ecocarpetutah.com) 정식 DNS 이전 준비
              </li>
            </ul>
          </div>
        </>
      ) : (
        /* ======================================================== */
        /* 모드 2: 사이트별 상세 통계 뷰 (Site-by-Site Drilldown) */
        /* ======================================================== */
        selectedSite && (
          <div>
            {/* 사이트 히어로 카드 */}
            <div className="stDetailHero">
              <div className="stDetailHeaderRow">
                <div className="stDetailIdentity">
                  <div className="heroIcon">{selectedSite.icon}</div>
                  <div>
                    <h2>
                      {selectedSite.name}
                      <span className="stQueryTag" style={{ fontSize: "12px", verticalAlign: "middle" }}>
                        {selectedSite.badge}
                      </span>
                    </h2>
                    <a
                      href={selectedSite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="stDomainLink"
                    >
                      {selectedSite.domain} ↗
                    </a>
                  </div>
                </div>

                {/* 우측 실시간 핑 버튼 및 응답 상태 */}
                <div className="stDetailControls">
                  {pingStatus[selectedSite.id] && !pingStatus[selectedSite.id].loading && (
                    <div className="stPingBox">
                      <span>최근 응답:</span>
                      <b style={{ color: pingStatus[selectedSite.id].ok ? "#00774f" : "#c4262c" }}>
                        {pingStatus[selectedSite.id].ok
                          ? `${pingStatus[selectedSite.id].latencyMs}ms (정상)`
                          : `오류 (${pingStatus[selectedSite.id].status})`}
                      </b>
                      <span style={{ color: "var(--text-3)" }}>
                        ({pingStatus[selectedSite.id].checkedAt})
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="stRefreshBtn"
                    onClick={() => handlePing(selectedSite.domain, selectedSite.id)}
                    disabled={pingStatus[selectedSite.id]?.loading}
                  >
                    {pingStatus[selectedSite.id]?.loading ? "⚡ 핑 측정 중..." : "⚡ 실시간 핑 테스트"}
                  </button>
                  <a
                    href={selectedSite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="stRefreshBtn"
                    style={{ textDecoration: "none" }}
                  >
                    사이트 열기 ↗
                  </a>
                </div>
              </div>

              {/* 하단 메타 배지 */}
              <div className="stDetailBadges">
                <span className="stDetailBadge">스택: {selectedSite.stack}</span>
                <span className={`stDetailBadge ${selectedSite.integrations.gsc.connected ? "active" : ""}`}>
                  GSC: {selectedSite.integrations.gsc.connected ? "연동 완료" : "대기"}
                </span>
                <span className={`stDetailBadge ${selectedSite.integrations.ga4.connected ? "active" : ""}`}>
                  GA4: {selectedSite.integrations.ga4.connected ? "측정 중" : "준비 중"}
                </span>
                <span className="stDetailBadge">타깃 시장: {selectedSite.targetMarket}</span>
                <span className="stDetailBadge">색인 완료: {selectedSite.overview.indexedPages ?? "-"}페이지</span>
              </div>
            </div>

            {/* 사이트 핵심 4대 지표 */}
            <div className="stMetrics">
              <div className="stMetricCard" data-tone="orange">
                <div className="stMetricLabel">
                  <span>최근 28일 검색 클릭</span>
                  <span>GSC</span>
                </div>
                <div className="stMetricValue">
                  {selectedSite.overview.clicks28d ?? "-"}
                  <small>회</small>
                </div>
                <div className="stMetricSub">
                  총 노출수: <b>{selectedSite.overview.impressions28d ?? "-"}</b>회
                </div>
              </div>

              <div className="stMetricCard" data-tone="blue">
                <div className="stMetricLabel">
                  <span>평균 CTR & 순위</span>
                  <span>효율</span>
                </div>
                <div className="stMetricValue">
                  {selectedSite.overview.ctr ? `${selectedSite.overview.ctr}%` : "-"}
                  <small> / {selectedSite.overview.avgPosition ? `${selectedSite.overview.avgPosition}위` : "-"}</small>
                </div>
                <div className="stMetricSub">
                  구글 검색결과 평균 노출 순위
                </div>
              </div>

              <div className="stMetricCard" data-tone="green">
                <div className="stMetricLabel">
                  <span>순 방문자 (UV)</span>
                  <span>GA4</span>
                </div>
                <div className="stMetricValue">
                  {selectedSite.overview.users28d ?? "-"}
                  <small>명</small>
                </div>
                <div className="stMetricSub">
                  참여율: <b>{selectedSite.overview.engagementRate ? `${selectedSite.overview.engagementRate}%` : "-"}</b> ({selectedSite.overview.avgDuration})
                </div>
              </div>

              <div className="stMetricCard" data-tone="purple">
                <div className="stMetricLabel">
                  <span>핵심 전환 (Conversions)</span>
                  <span>목표</span>
                </div>
                <div className="stMetricValue">
                  {selectedSite.overview.conversions?.count ?? "-"}
                  <small>{selectedSite.overview.conversions?.unit ?? "건"}</small>
                </div>
                <div className="stMetricSub">
                  {selectedSite.overview.conversions?.label ?? "전환 액션"}
                </div>
              </div>
            </div>

            {/* 시계열 추이 차트 */}
            <div className="stChartCard">
              <div className="stChartHeader">
                <div className="stChartTitle">
                  <span>📈</span> 최근 7일 성과 추이
                </div>
                <div className="stChartTabs">
                  <button
                    type="button"
                    className={`stChartTab${chartMetric === "impressions" ? " active" : ""}`}
                    onClick={() => setChartMetric("impressions")}
                  >
                    검색 노출 (Impressions)
                  </button>
                  <button
                    type="button"
                    className={`stChartTab${chartMetric === "clicks" ? " active" : ""}`}
                    onClick={() => setChartMetric("clicks")}
                  >
                    클릭수 (Clicks)
                  </button>
                  <button
                    type="button"
                    className={`stChartTab${chartMetric === "users" ? " active" : ""}`}
                    onClick={() => setChartMetric("users")}
                  >
                    순 방문자 (Users)
                  </button>
                </div>
              </div>
              {renderChart(selectedSite.history7d)}
            </div>

            {/* 키워드 & 랜딩 페이지 2단 그리드 */}
            <div className="stGrid2">
              {/* 상위 검색 쿼리 */}
              <div className="stCard">
                <div className="stCardHeader">
                  <h3>
                    <span>🔍</span> 주요 유입 검색어 (Top Queries)
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {selectedSite.topQueries?.length || 0}개 키워드
                  </span>
                </div>
                <div className="stTableScroll">
                  <table className="stTable">
                    <thead>
                      <tr>
                        <th>검색어</th>
                        <th>순위</th>
                        <th>노출</th>
                        <th>클릭</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSite.topQueries?.map((q, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600 }}>{q.query}</td>
                          <td style={{ fontFamily: "var(--st-mono)" }}>
                            {typeof q.rank === "number" ? `${q.rank}위` : q.rank}
                          </td>
                          <td style={{ fontFamily: "var(--st-mono)" }}>{q.impressions}</td>
                          <td style={{ fontFamily: "var(--st-mono)", fontWeight: 700, color: "var(--brand)" }}>
                            {q.clicks}
                          </td>
                          <td>
                            <span className="stQueryTag">{q.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 주요 랜딩 페이지 */}
              <div className="stCard">
                <div className="stCardHeader">
                  <h3>
                    <span>📄</span> 인기 페이지 (Top Pages)
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                    {selectedSite.topPages?.length || 0}개 페이지
                  </span>
                </div>
                <div className="stTableScroll">
                  <table className="stTable">
                    <thead>
                      <tr>
                        <th>페이지 경로</th>
                        <th>페이지명</th>
                        <th>조회수</th>
                        <th>클릭</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSite.topPages?.map((p, idx) => (
                        <tr key={idx}>
                          <td>
                            <code style={{ fontSize: "12px" }}>{p.path}</code>
                          </td>
                          <td style={{ fontWeight: 600 }}>{p.title}</td>
                          <td style={{ fontFamily: "var(--st-mono)", fontWeight: 700 }}>
                            {p.views}회
                          </td>
                          <td style={{ fontFamily: "var(--st-mono)", color: "var(--brand)" }}>
                            {p.clicks}회
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 해당 사이트 맞춤 추천 액션 */}
            <div className="stActionBox">
              <h3>
                <span>🎯</span> {selectedSite.shortName} 맞춤형 최적화 과제 (Action Items)
              </h3>
              <ul className="stActionList">
                {selectedSite.actionItems?.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      )}
    </div>
  );
}
