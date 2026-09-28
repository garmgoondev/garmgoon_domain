"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

function keyBytes(b64) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.register("/family-sw.js", { scope: "/family" });
}

// 이 기기의 알림 켜기·끄기와 알림 종류 설정
export default function NotifySettings({ onClose }) {
  const [info, setInfo] = useState(null);
  const [sub, setSub] = useState(null);
  const [env, setEnv] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    setEnv({ supported, standalone, ios: /iphone|ipad|ipod/i.test(navigator.userAgent), permission: supported ? Notification.permission : "default" });
    api("/api/family/push")
      .then(setInfo)
      .catch((e) => setError(e.message));
    if (!supported) return;
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (s) => {
        setSub(s);
        // 이미 켜져 있으면 서버 쪽 정보(시간대 등)를 새로 맞춘다
        if (s) await api("/api/family/push/subscribe", { method: "POST", body: { ...s.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      setEnv((e) => ({ ...e, permission }));
      if (permission !== "granted") throw new Error("알림 권한을 허용해야 받을 수 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.");
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(info.publicKey) });
      await api("/api/family/push/subscribe", { method: "POST", body: { ...s.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone } });
      setSub(s);
      setInfo((i) => ({ ...i, devices: i.devices + 1 }));
      setMsg("이 기기에서 알림을 켰어요.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await api("/api/family/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } });
      await sub.unsubscribe();
      setSub(null);
      setInfo((i) => ({ ...i, devices: Math.max(0, i.devices - 1) }));
      setMsg("이 기기의 알림을 껐어요.");
    } finally {
      setBusy(false);
    }
  }

  async function save(patch) {
    const res = await api("/api/family/push/settings", { method: "PATCH", body: patch });
    setInfo((i) => ({ ...i, ...res }));
  }

  async function test() {
    setMsg("");
    setError("");
    try {
      const res = await api("/api/family/push/test", { method: "POST" });
      setMsg(`테스트 알림을 보냈어요 (${res.sent}/${res.total}개 기기).`);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="panel stack boardForm">
      <h3 className="panelTitle">🔔 알림 설정</h3>
      {!info ? <div className="skeleton" style={{ height: 120 }} /> : null}
      {info && !info.enabled ? <p className="error">관리자가 알림 키(VAPID)를 아직 설정하지 않았어요.</p> : null}
      {info?.enabled ? (
        <>
          <div className="boardNotifyDevice">
            <div>
              <b>이 기기</b>
              <div className="muted">{sub ? "알림 켜짐 ✅" : "알림 꺼짐"} · 알림 받는 내 기기 {info.devices}대</div>
            </div>
            {env.ios && !env.standalone ? null : !env.supported ? null : sub ? (
              <button type="button" className="btn small ghost" onClick={disable} disabled={busy}>
                끄기
              </button>
            ) : (
              <button type="button" className="btn small brand" onClick={enable} disabled={busy}>
                알림 켜기
              </button>
            )}
          </div>
          {env.ios && !env.standalone ? (
            <p className="boardWarn">
              📱 아이폰은 <b>홈 화면에 추가한 앱</b>에서만 알림을 받을 수 있어요. 사파리 공유 버튼(⬆︎) → <b>홈 화면에 추가</b> 후, 홈 화면의 '우리 가족'을 열어 알림을 켜 주세요.
            </p>
          ) : !env.supported ? (
            <p className="boardWarn">이 브라우저는 알림을 지원하지 않아요. 크롬·사파리·엣지 최신 버전에서 열어 주세요.</p>
          ) : env.permission === "denied" ? (
            <p className="boardWarn">이 기기에서 알림이 차단되어 있어요. 브라우저(또는 휴대폰) 설정에서 garmgoon.com 알림을 허용해 주세요.</p>
          ) : null}

          <label className="boardFormRow">
            <span className="boardLabel">아침 요약</span>
            <select
              className="select boardSelect"
              value={info.notifyHour ?? "off"}
              onChange={(e) => save({ notifyHour: e.target.value === "off" ? null : Number(e.target.value) })}
            >
              <option value="off">받지 않기</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  매일 {h < 12 ? `오전 ${h || 12}시` : `오후 ${h === 12 ? 12 : h - 12}시`}
                </option>
              ))}
            </select>
          </label>
          <p className="muted boardHint">그날 내 할 일과 다가오는 기념일(당일·1·3·7일 전)을 알려 줘요. 할 일이 없는 날은 오지 않아요.</p>
          <label className="boardCheckRow">
            <input type="checkbox" checked={info.notifyPosts} onChange={(e) => save({ notifyPosts: e.target.checked })} />
            가족의 새 글과 내 글에 달린 댓글 알림
          </label>
          {sub ? (
            <button type="button" className="btn small ghost" onClick={test}>
              테스트 알림 보내기
            </button>
          ) : null}
        </>
      ) : null}
      {msg ? <p className="saveHint">{msg}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="btn small ghost" onClick={onClose}>
        닫기
      </button>
    </section>
  );
}
