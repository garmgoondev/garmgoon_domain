"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import IdeaBoard from "../../components/IdeaBoard";

// ?day= 로 들어온 날짜의 카드를 모두 보여준다
function AllCardsBoard() {
  return <IdeaBoard view="all" initialDay={useSearchParams().get("day")} />;
}

export default function AllCards() {
  return (
    <Suspense fallback={<div className="skeleton" style={{ height: 380 }} />}>
      <AllCardsBoard />
    </Suspense>
  );
}
