import Header from "../components/Header";
import "./globals.css";

export const metadata = {
  title: "garmgoon",
  description: "매일 아침 비즈니스 아이디어 카드뉴스와 유튜브 요약을 모아 보는 개인 대시보드",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F4F7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0F13" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <Header />
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
