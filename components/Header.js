"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useMe } from "../lib/api";
import { formatDay, todayLocal } from "../lib/format";

const NAV = [
  { href: "/", label: "오늘의 카드" },
  { href: "/youtube", label: "유튜브" },
  { href: "/trends", label: "주간 트렌드" },
  { href: "/games", label: "게임 🎮" },
  { href: "/family", label: "가족 🏠", family: true },
  { href: "/tools", label: "SaaS 도구", private: true },
  { href: "/scrap", label: "스크랩·노트", private: true },
  { href: "/settings", label: "설정", private: true },
];

export default function Header() {
  const pathname = usePathname();
  const me = useMe();
  const [today, setToday] = useState("");
  useEffect(() => setToday(formatDay(todayLocal())), []);

  const isActive = (href) => (href === "/" ? pathname === "/" || pathname.startsWith("/cards") : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="headerTop">
        <Link href="/" className="brand">
          <span className="brandMark">G</span>
          garmgoon
        </Link>
        <div className="headerMeta">
          <span className="headerDate">{today}</span>
          {me?.authed ? (
            <button type="button" className="btn ghost small headerAuthBtn" onClick={() => logout("/")} title="로그아웃">
              로그아웃
            </button>
          ) : me && !me.authed ? (
            <Link
              href={pathname && pathname !== "/" && pathname !== "/login" ? `/login?next=${encodeURIComponent(pathname)}` : "/login"}
              className="btn ghost small headerAuthBtn"
              title="로그인"
            >
              로그인
            </Link>
          ) : null}
        </div>
      </div>
      <nav className="nav" aria-label="주요 메뉴">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`navItem${isActive(n.href) ? " active" : ""}`}>
            {n.label}
            {n.private && me && !me.authed ? <span className="lock" aria-label="로그인 필요">🔒</span> : null}
            {n.family && me?.family?.unread && !isActive(n.href) ? (
              <span className="navBadge" aria-label={`새 소식 ${me.family.unread}개`}>
                {me.family.unread > 99 ? "99+" : me.family.unread}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </header>
  );
}
