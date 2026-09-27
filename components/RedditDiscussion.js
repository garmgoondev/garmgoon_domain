const LABELS = { positive: "긍정 반응", concerns: "우려·개선 의견", questions: "질문" };

export default function RedditDiscussion({ discussion }) {
  if (!discussion) return null;
  const { status, sampledCount, summary, fetchedAt, bodyBasis } = discussion;
  const sampled = status === "sampled" && sampledCount > 0;
  const checked = fetchedAt ? new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(fetchedAt)) : null;
  const unavailable = status === "queued" ? "댓글은 요청 간격을 지키며 순서대로 확인하는 중이에요."
    : status === "rate_limited" || status === "cooldown" ? "요청 제한으로 댓글을 가져오지 못했어요."
    : status === "empty" ? "피드에서 읽을 수 있는 댓글이 없어요. 실제 댓글 수와 다를 수 있어요."
    : "댓글을 가져오지 못했어요.";
  return (
    <section className="ncardDiscussion" aria-label="Reddit 댓글 반응">
      <b>댓글 반응</b>
      {sampled ? (
        <>
          <small>수집 댓글 {sampledCount}개 기준 · 전체 여론 아님</small>
          {summary ? Object.entries(LABELS).map(([key, label]) => summary[key]?.length ? (
            <div className="ncardDiscussionGroup" key={key}>
              <strong>{label}</strong>
              <ul>{summary[key].map((line, index) => <li key={index}>{line}</li>)}</ul>
            </div>
          ) : null) : <p>댓글은 수집했지만 반응 요약을 만들지 못했어요.</p>}
        </>
      ) : <p>{unavailable} 댓글 반응은 추정하지 않았어요.</p>}
      <small>
        {bodyBasis === "title" ? "본문 수집 불가 · 제목 기준 카드" : bodyBasis === "listing" ? "후보 피드 내용 기준 요약" : "게시글 피드 내용 기준 요약"}
        {checked ? ` · 확인 ${checked} (한국 시간)` : ""}
      </small>
    </section>
  );
}
