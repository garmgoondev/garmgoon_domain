import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 40 }}>
      <span className="emoji">🧭</span>
      <b>페이지를 찾을 수 없어요</b>
      <Link href="/" className="btn small" style={{ marginTop: 8 }}>
        오늘의 카드로 가기
      </Link>
    </div>
  );
}
