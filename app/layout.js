import Header from "../components/Header";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://garmgoon.com"),
  title: {
    default: "garmgoon - 비즈니스 아이디어 & 테크 트렌드 대시보드",
    template: "%s",
  },
  description:
    "매일 아침 글로벌 비즈니스 아이디어 카드뉴스와 최신 유튜브 핵심 요약, 주간 트렌드 분석 리포트 및 웹 브라우저 게임·도구를 한곳에서 모아보는 개인 대시보드 플랫폼입니다.",
  openGraph: {
    title: "garmgoon - 비즈니스 아이디어 & 테크 트렌드 대시보드",
    description:
      "매일 아침 글로벌 비즈니스 아이디어 카드뉴스와 최신 유튜브 핵심 요약, 주간 트렌드 분석 리포트 및 웹 브라우저 게임·도구를 한곳에서 모아보는 개인 대시보드 플랫폼입니다.",
    url: "https://garmgoon.com",
    siteName: "Garmgoon",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "garmgoon - 비즈니스 아이디어 & 테크 트렌드 대시보드",
    description:
      "매일 아침 글로벌 비즈니스 아이디어 카드뉴스와 최신 유튜브 핵심 요약, 주간 트렌드 분석 리포트 및 웹 브라우저 게임·도구를 한곳에서 모아보는 개인 대시보드 플랫폼입니다.",
  },
};

export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F4F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F13" },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Garmgoon",
  url: "https://garmgoon.com",
  description:
    "매일 아침 글로벌 비즈니스 아이디어 카드뉴스와 최신 유튜브 핵심 요약, 주간 트렌드 분석 리포트 및 웹 브라우저 게임·도구를 한곳에서 모아보는 개인 대시보드 플랫폼입니다.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Header />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
