"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMe } from "../lib/api";
import { formatDay, todayLocal } from "../lib/format";

const NAV = [
  { href: "/", label: "오늘의 카드" },
  { href: "/youtube", label: "유튜브" },
  { href: "/trends", label: "주간 트렌드" },
  { href: "/tools", label: "SaaS 도구", private: true },
  { href: "/scrap", label: "스크랩·노트", private: true },
  { href: "/settings", label: "설정", private: true },
];

export default function Header() {
  const pathname = usePathname();
  const me = useMe();
  const [today, setToday] = useState("");
  useEffect(() => setToday(formatDay(todayLocal())), []);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="headerTop">
        <Link href="/" className="brand">
          <span className="brandMark">G</span>
          garmgoon
        </Link>
        <span className="headerDate">{today}</span>
      </div>
      <nav className="nav" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`navItem${isActive(n.href) ? " active" : ""}`}>
            {n.label}
            {n.private && me && !me.authed ? <span className="lock" aria-label="로그인 필요">🔒</span> : null}
          </Link>
        ))}
      </nav>
    </header>
  );
}
