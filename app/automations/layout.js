export const metadata = {
  title: "도메인 자동화 실시간 현황판 | Garmgoon",
  description:
    "도메인, VPS 서버 및 로컬 환경에서 가동되는 6대 핵심 자동화 파이프라인의 실시간 실행 상태, 성공률, 실패율 및 Cron 스케줄러 로그를 투명하게 모니터링하고 관제하는 대시보드입니다.",
  alternates: {
    canonical: "/automations",
  },
  openGraph: {
    title: "도메인 자동화 실시간 현황판 | Garmgoon",
    description:
      "도메인, VPS 서버 및 로컬 환경에서 가동되는 6대 핵심 자동화 파이프라인의 실시간 실행 상태, 성공률, 실패율 및 Cron 스케줄러 로그를 투명하게 모니터링하고 관제하는 대시보드입니다.",
    url: "/automations",
  },
};

export default function AutomationsLayout({ children }) {
  return children;
}
