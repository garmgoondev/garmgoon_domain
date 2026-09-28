"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "family-install-dismissed";

// 휴대폰 홈 화면에 앱처럼 추가하도록 안내한다. 안드로이드·크롬은 버튼, 아이폰은 방법을 알려 준다.
export default function InstallHint() {
  const [prompt, setPrompt] = useState(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone || localStorage.getItem(DISMISS_KEY)) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setHidden(false);
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!prompt && !ios)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  return (
    <div className="famInstall">
      <span>📱</span>
      <span className="famInstallText">
        {prompt ? (
          "홈 화면에 추가하면 앱처럼 바로 열 수 있어요."
        ) : (
          <>
            사파리 아래쪽 <b>공유 버튼(⬆︎)</b> → <b>홈 화면에 추가</b>를 누르면 앱처럼 열 수 있어요.
          </>
        )}
      </span>
      {prompt ? (
        <button
          type="button"
          className="btn small brand"
          onClick={async () => {
            prompt.prompt();
            await prompt.userChoice;
            dismiss();
          }}
        >
          추가하기
        </button>
      ) : null}
      <button type="button" className="iconBtn" onClick={dismiss} aria-label="안내 닫기">
        ✕
      </button>
    </div>
  );
}
