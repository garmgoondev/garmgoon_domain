"use client";

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Composer from "./Composer";
import PostCard from "./PostCard";

// 가족 공간(가족 공개 글)과 내 공간(내가 쓴 모든 글)을 같은 모양으로 보여 준다
export default function Feed({ query, defaults, filters, empty, onFirstLoad, accept = () => true }) {
  const [posts, setPosts] = useState(null);
  const [next, setNext] = useState(null);
  const [error, setError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let alive = true;
    setPosts(null);
    setError("");
    api(`/api/family/posts?${query}`)
      .then((d) => {
        if (!alive) return;
        setPosts(d.posts);
        setNext(d.nextBefore);
        onFirstLoad?.();
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [query]);

  async function more() {
    setLoadingMore(true);
    try {
      const d = await api(`/api/family/posts?${query}&before=${next}`);
      setPosts((p) => [...p, ...d.posts]);
      setNext(d.nextBefore);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }

  // 고친 글이 이 목록에 맞지 않게 되면(예: 가족 공간에서 나만 보기로 바꿈) 목록에서 뺀다
  const change = (np) => setPosts((list) => (accept(np) ? list.map((p) => (p.id === np.id ? np : p)) : list.filter((p) => p.id !== np.id)));
  const remove = (id) => setPosts((list) => list.filter((p) => p.id !== id));

  return (
    <>
      <Composer defaults={defaults} onSaved={(p) => accept(p) && setPosts((list) => [p, ...(list || [])])} />
      {filters}
      {error ? <p className="error">{error}</p> : null}
      {!posts && !error ? (
        <div className="famList">
          <div className="skeleton" style={{ height: 180 }} />
          <div className="skeleton" style={{ height: 180 }} />
        </div>
      ) : posts?.length ? (
        <div className="famList">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onChange={change} onDelete={remove} />
          ))}
          {next ? (
            <button type="button" className="btn ghost" onClick={more} disabled={loadingMore}>
              {loadingMore ? "불러오는 중…" : "더 보기"}
            </button>
          ) : null}
        </div>
      ) : posts ? (
        empty
      ) : null}
    </>
  );
}
