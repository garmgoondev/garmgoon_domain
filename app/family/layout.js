// 가족 탭만 홈 화면에 앱처럼 설치할 수 있게 매니페스트와 아이콘을 따로 붙인다
export const metadata = {
  title: "우리 가족 · garmgoon",
  description: "가족끼리 일기와 메시지를 나누는 공간",
  manifest: "/family.webmanifest",
  icons: { apple: "/icons/family-180.png" },
  appleWebApp: { capable: true, title: "우리 가족", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export default function FamilyLayout({ children }) {
  return children;
}
