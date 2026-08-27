import "./globals.css";

export const metadata = {
  title: "Garmgoon — Building in public",
  description: "작게 만들고, 직접 운영하며, 배운 것을 기록합니다.",
};

export default function RootLayout({ children }) {
  return <html lang="ko"><body>{children}</body></html>;
}
