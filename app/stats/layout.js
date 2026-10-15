export const metadata = {
  title: "사이트 통합 통계 & 실시간 모니터링 | Garmgoon",
  description:
    "운영 중인 멀티 웹사이트의 Google Search Console 검색 실적, GA4 방문자 지표, 실시간 도메인 응답 상태 및 헬스체크를 허구의 가상 데이터 없이 실측 수치로 통합 모니터링합니다.",
  alternates: {
    canonical: "/stats",
  },
  openGraph: {
    title: "사이트 통합 통계 & 실시간 모니터링 | Garmgoon",
    description:
      "운영 중인 멀티 웹사이트의 Google Search Console 검색 실적, GA4 방문자 지표, 실시간 도메인 응답 상태 및 헬스체크를 허구의 가상 데이터 없이 실측 수치로 통합 모니터링합니다.",
    url: "/stats",
  },
};

export default function StatsLayout({ children }) {
  return children;
}
