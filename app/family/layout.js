// 가족 탭만 홈 화면에 앱처럼 설치할 수 있게 매니페스트와 아이콘을 따로 붙인다
export const metadata = {
  title: "우리 가족 · garmgoon",
  description:
    "소중한 가족 구성원들이 모여 하루 일상과 특별한 순간의 사진, 따뜻한 안부 메시지를 자유롭게 기록하고 실시간으로 나누는 가족 전용 비공개 프라이빗 공간입니다.",
  manifest: "/family.webmanifest",
  icons: { apple: "/icons/family-180.png" },
  appleWebApp: { capable: true, title: "우리 가족", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export default function FamilyLayout({ children }) {
  return children;
}
