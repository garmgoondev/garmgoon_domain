"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import Avatar from "../Avatar";

const POLL_MS = 15000;

// 가족 공용 장보기 목록. 마트에서 여럿이 동시에 보더라도 맞도록 화면이 켜져 있으면 15초마다 새로 받는다.
export default function Shopping({ members }) {
  const [items, setItems] = useState(null);
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const byId = new Map(members.map((m) => [m.id, m]));

  const load = () =>
    api("/api/family/board/shopping")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await api("/api/family/board/shopping", { method: "POST", body: { title, qty } });
      setItems((list) => [res.item, ...list]);
      setTitle("");
      setQty("");
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggle(item) {
    const res = await api(`/api/family/board/shopping/${item.id}`, { method: "PATCH", body: { done: !item.doneAt } });
    setItems((list) => list.map((x) => (x.id === item.id ? res.item : x)));
  }

  async function remove(item) {
    await api(`/api/family/board/shopping/${item.id}`, { method: "DELETE" });
    setItems((list) => list.filter((x) => x.id !== item.id));
  }

  async function clearDone() {
    if (!confirm("산 물건을 목록에서 모두 지울까요?")) return;
    await api("/api/family/board/shopping?done", { method: "DELETE" });
    setItems((list) => list.filter((x) => !x.doneAt));
  }

  if (!items) return error ? <p className="error">{error}</p> : <div className="skeleton" style={{ height: 300 }} />;
  const todo = items.filter((i) => !i.doneAt);
  const done = items.filter((i) => i.doneAt);

  const row = (item) => {
    const who = byId.get(item.doneAt ? item.doneBy : item.addedBy);
    return (
      <div key={item.id} className={`boardTask${item.doneAt ? " done" : ""}`}>
        <button type="button" className="boardCheck" onClick={() => toggle(item)} aria-pressed={Boolean(item.doneAt)} aria-label={`${item.title} ${item.doneAt ? "안 삼" : "삼"}`}>
          {item.doneAt ? "✓" : ""}
        </button>
        <span className="boardTaskMain static">
          <span className="boardTaskTitle">
            {item.title}
            {item.qty ? <span className="boardQty">{item.qty}</span> : null}
          </span>
          <span className="boardTaskMeta">{who ? `${who.name} ${item.doneAt ? "샀어요" : "추가"}` : ""}</span>
        </span>
        {who ? <Avatar member={who} size={24} /> : null}
        <button type="button" className="boardRemove" onClick={() => remove(item)} aria-label={`${item.title} 지우기`}>
          ✕
        </button>
      </div>
    );
  };

  return (
    <div className="boardShopping">
      <form className="panel boardShopAdd" onSubmit={add}>
        <input ref={inputRef} className="input" placeholder="살 물건 (예: 우유)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        <input className="input boardQtyInput" placeholder="수량" value={qty} onChange={(e) => setQty(e.target.value)} maxLength={20} />
        <button className="btn brand" disabled={!title.trim()}>
          추가
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <section className="boardDay">
        <header>
          <b>🛒 살 것</b>
          <span className="muted">{todo.length}개</span>
        </header>
        {todo.length ? todo.map(row) : <p className="boardEmpty">다 샀어요! 필요한 물건을 적어 두세요.</p>}
      </section>
      {done.length ? (
        <section className="boardDay past">
          <header>
            <b>✅ 산 것</b>
            <span className="muted">사흘 뒤 자동으로 사라져요</span>
            <span className="famSpacer" />
            <button type="button" className="btn small ghost" onClick={clearDone}>
              비우기
            </button>
          </header>
          {done.map(row)}
        </section>
      ) : null}
    </div>
  );
}
