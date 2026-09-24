"use client";

import { useEffect, useState } from "react";

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);
  return data;
}

let mePromise = null;

// 로그인 여부. 로딩 중에는 null.
export function useMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    mePromise ??= api("/api/me").catch(() => ({ authed: false }));
    mePromise.then(setMe);
  }, []);
  return me;
}

export function resetMe() {
  mePromise = null;
}

// 경로의 데이터를 불러오고 다시 불러오는 함수를 함께 돌려준다
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    api(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [path, version]);
  return { ...state, reload: () => setVersion((v) => v + 1), setData: (fn) => setState((s) => ({ ...s, data: fn(s.data) })) };
}

// 스크랩한 id 목록을 들고 있다가 낙관적으로 켜고 끈다
export function useScrapSet(kind, initial) {
  const [set, setSet] = useState(() => new Set());
  useEffect(() => setSet(new Set(initial || [])), [initial]);
  const toggle = async (refId) => {
    const on = set.has(refId);
    const flip = (s) => {
      const n = new Set(s);
      on ? n.delete(refId) : n.add(refId);
      return n;
    };
    setSet(flip);
    try {
      if (on) await api(`/api/p/scraps?kind=${kind}&ref=${encodeURIComponent(refId)}`, { method: "DELETE" });
      else await api("/api/p/scraps", { method: "POST", body: { kind, refId } });
    } catch (e) {
      setSet((s) => {
        const n = new Set(s);
        on ? n.add(refId) : n.delete(refId);
        return n;
      });
      alert(e.message);
    }
  };
  return [set, toggle];
}
