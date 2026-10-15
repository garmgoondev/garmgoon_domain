"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import IdeaBoard from "../../components/IdeaBoard";

// ?day= 로 들어온 날짜의 카드를 모두 보여준다
function AllCardsBoard() {
  return <IdeaBoard view="all" initialDay={useSearchParams().get("day")} />;
}

function CardsLoading() {
  return (
    <>
      <div className="pageHead">
        <div>
          <div className="eyebrow">🗂️ ALL CARDS ARCHIVE</div>
          <h1 className="pageTitle">비즈니스 아이디어 전체 아카이브</h1>
          <p className="pageDesc">
            수집 및 큐레이션된 전체 비즈니스 아이디어 카드 아카이브입니다. 날짜별 카드 전체 내역을 열람하거나 상단 검색창을 통해 원하는 키워드를 실시간으로 탐색할 수 있습니다.
          </p>
        </div>
      </div>
      <div className="skeleton" style={{ height: 380 }} />
    </>
  );
}

export default function AllCards() {
  return (
    <Suspense fallback={<CardsLoading />}>
      <AllCardsBoard />
    </Suspense>
  );
}
