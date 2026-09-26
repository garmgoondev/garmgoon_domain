"use client";

import { useEffect } from "react";

// 타자 레이스는 게임 모음 안으로 옮겼다. 예전 초대 링크(?room=…)도 그대로 따라간다.
export default function TypingRedirect() {
  useEffect(() => {
    window.location.replace(`/games/typing${window.location.search}${window.location.hash}`);
  }, []);
  return <p className="muted">/games/typing …</p>;
}
