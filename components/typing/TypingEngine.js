"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playKeyClick, playErrorSound } from "../../lib/typingAudio";

export default function TypingEngine({
  text = "",
  isActive = false,
  startTime = null,
  t = null,
  onProgress = () => {},
  onFinish = () => {},
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMistake, setCurrentMistake] = useState(null); // string or null
  const [errorCount, setErrorCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Hidden input ref for capturing keystrokes and virtual mobile keyboard
  const inputRef = useRef(null);

  // Keep latest stats for callback
  const statsRef = useRef({
    currentIndex: 0,
    errorCount: 0,
    isFinished: false,
  });

  // Focus input when race becomes active
  useEffect(() => {
    if (isActive && !isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive, isFinished]);

  // Reset state when text changes or race resets
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentMistake(null);
    setErrorCount(0);
    setIsFinished(false);
    statsRef.current = {
      currentIndex: 0,
      errorCount: 0,
      isFinished: false,
    };
  }, [text]);

  const computeMetrics = useCallback(
    (curIdx, errors, finished) => {
      if (!startTime) return { wpm: 0, accuracy: 100, progress: 0 };
      const elapsedMs = Math.max(1, Date.now() - startTime);
      const elapsedMinutes = elapsedMs / 60000;

      // Standard typing calculation: 5 characters = 1 word
      const wpm = Math.round(curIdx / 5 / elapsedMinutes) || 0;
      const totalKeystrokes = curIdx + errors;
      const accuracy = totalKeystrokes > 0 ? Math.max(0, Math.round((curIdx / totalKeystrokes) * 1000) / 10) : 100;
      const progress = text.length > 0 ? (curIdx / text.length) * 100 : 0;

      return { wpm, accuracy, progress, finished, timeSeconds: elapsedMs / 1000 };
    },
    [startTime, text.length],
  );

  const handleKeyDown = (e) => {
    if (!isActive || isFinished) return;

    // Ignore special modifier keys alone
    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(e.key)) {
      return;
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentMistake !== null) {
        // Clear current mistake in Strict Mode
        setCurrentMistake(null);
        playKeyClick();
      }
      return;
    }

    // Only process single printable characters
    if (e.key.length !== 1) return;

    e.preventDefault();

    // In Strict Mode: if there's already a mistake, user must press backspace to fix it!
    if (currentMistake !== null) {
      playErrorSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
      return;
    }

    const expectedChar = text[currentIndex];

    if (e.key === expectedChar) {
      // Correct keystroke!
      playKeyClick();
      const nextIndex = currentIndex + 1;
      const isDone = nextIndex >= text.length;

      setCurrentIndex(nextIndex);
      statsRef.current.currentIndex = nextIndex;

      const metrics = computeMetrics(nextIndex, errorCount, isDone);
      onProgress(metrics);

      if (isDone) {
        setIsFinished(true);
        statsRef.current.isFinished = true;
        onFinish(metrics);
      }
    } else {
      // Mistake! Strict mode triggers
      playErrorSound();
      setCurrentMistake(e.key);
      const nextErrors = errorCount + 1;
      setErrorCount(nextErrors);
      statsRef.current.errorCount = nextErrors;

      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);

      const metrics = computeMetrics(currentIndex, nextErrors, false);
      onProgress(metrics);
    }
  };

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const currentMetrics = computeMetrics(currentIndex, errorCount, isFinished);

  return (
    <div className={`typingEngineCard ${isShaking ? "shakeAnimation" : ""}`} onClick={focusInput}>
      {/* Hidden input to capture physical & virtual keyboards */}
      <input
        ref={inputRef}
        type="text"
        className="hiddenKeyCaptureInput"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        onKeyDown={handleKeyDown}
        readOnly={!isActive || isFinished}
        aria-label="typing input"
      />

      {/* Real-time Status Header */}
      <div className="typingEngineStatsHeader">
        <div className="statItem">
          <span className="statLabel">{t?.statWpm || "WPM"}</span>
          <span className="statValue statWpm">{currentMetrics.wpm}</span>
        </div>
        <div className="statItem">
          <span className="statLabel">{t?.statAcc || "ACC"}</span>
          <span className="statValue statAcc">{currentMetrics.accuracy}%</span>
        </div>
        <div className="statItem">
          <span className="statLabel">{t?.statProg || "Progress"}</span>
          <span className="statValue statProg">{Math.round(currentMetrics.progress)}%</span>
        </div>
        <div className="statItem modeIndicator">
          <span className="strictBadge">{t?.strictBadge || "🛡️ Strict Mode"}</span>
        </div>
      </div>

      {/* Target Text Display Area */}
      <div className="typingTextDisplay">
        {/* Completed text */}
        <span className="charsDone">{text.slice(0, currentIndex)}</span>

        {/* Current Active Character & Cursor */}
        {!isFinished && currentIndex < text.length && (
          <span className="charCursorContainer">
            {currentMistake !== null ? (
              <span className="charMistake">
                {currentMistake === " " ? "␣" : currentMistake}
              </span>
            ) : (
              <span className="charCurrent">
                {text[currentIndex] === " " ? "␣" : text[currentIndex]}
              </span>
            )}
          </span>
        )}

        {/* Remaining upcoming text */}
        <span className="charsUpcoming">
          {text.slice(currentMistake !== null ? currentIndex : currentIndex + 1)}
        </span>
      </div>

      {/* Helper Guidance Message */}
      <div className="typingHelpBar">
        {currentMistake !== null ? (
          <span className="helpErrorMsg">
            {t?.helpError || "⚠️ Typo detected! Press Backspace to delete it before continuing."}
          </span>
        ) : !isActive ? (
          <span className="helpReadyMsg">
            {t?.helpReady || "Get ready! Typing starts when the countdown finishes."}
          </span>
        ) : (
          <span className="helpTypingMsg">
            {t?.helpTyping || "Type fast and accurately! (Click anywhere to focus)"}
          </span>
        )}
      </div>
    </div>
  );
}
