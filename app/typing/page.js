"use client";

import { useEffect, useRef, useState } from "react";
import "./typing.css";
import RaceTrack from "../../components/typing/RaceTrack";
import TypingEngine from "../../components/typing/TypingEngine";
import LeaderboardModal from "../../components/typing/LeaderboardModal";
import Confetti from "../../components/typing/Confetti";
import { getRandomText } from "../../lib/typingTexts";
import {
  isMuted,
  toggleMute,
  playCountdownBeep,
  playVictoryFanfare,
} from "../../lib/typingAudio";
import { RacePeerManager, generateRoomCode } from "../../lib/webrtcRace";
import { TRANSLATIONS, getInitialLang } from "../../lib/typingI18n";

export default function TypingPage() {
  // Page / Game States: 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'RESULT'
  const [gameState, setGameState] = useState("LOBBY");
  const [gameMode, setGameMode] = useState("solo"); // 'solo' | 'multi'
  const [lang, setLang] = useState("ko");

  // User Profile
  const [nickname, setNickname] = useState("Racer");
  const [soundMuted, setSoundMuted] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  // Match / Race State
  const [currentQuote, setCurrentQuote] = useState(getRandomText());
  const [countdownNum, setCountdownNum] = useState(3);
  const [raceStartTime, setRaceStartTime] = useState(null);
  const [myResult, setMyResult] = useState(null);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);

  // WebRTC Multiplayer State
  const [multiRole, setMultiRole] = useState("host"); // 'host' | 'join'
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [peerManager, setPeerManager] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [multiError, setMultiError] = useState("");

  // Players in race
  const [players, setPlayers] = useState([]);
  const myIdRef = useRef("me");

  // Bot interval for Solo Mode
  const botIntervalRef = useRef(null);

  // Load saved nickname, audio preference, language, and check URL for room invite
  useEffect(() => {
    const savedName = localStorage.getItem("typing_nickname");
    if (savedName) setNickname(savedName);
    setSoundMuted(isMuted());
    setLang(getInitialLang());

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get("room");
      if (roomParam) {
        setGameMode("multi");
        setMultiRole("join");
        setInputRoomCode(roomParam.toUpperCase());
      }
    }
  }, []);

  // Update nickname and persist
  const handleNicknameChange = (val) => {
    setNickname(val);
    localStorage.setItem("typing_nickname", val);
  };

  const handleToggleSound = () => {
    const next = toggleMute();
    setSoundMuted(next);
  };

  const handleToggleLang = () => {
    const nextLang = lang === "ko" ? "en" : "ko";
    setLang(nextLang);
    localStorage.setItem("typing_lang", nextLang);
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ko;

  // Cleanup WebRTC and timers on unmount
  useEffect(() => {
    return () => {
      if (peerManager) peerManager.destroy();
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [peerManager]);

  // ---------- SOLO MODE LOGIC ----------

  const startSoloRace = () => {
    const quote = getRandomText();
    setCurrentQuote(quote);

    const me = {
      id: "me",
      nickname: nickname || "Racer",
      color: "#ff5a36",
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false,
      rank: null,
    };

    const bot = {
      id: "bot-turbo",
      nickname: "Bot Turbo 🤖",
      isBot: true,
      color: "#64748B",
      progress: 0,
      wpm: 52,
      accuracy: 98,
      finished: false,
      rank: null,
    };

    setPlayers([me, bot]);
    myIdRef.current = "me";
    runCountdown(quote);
  };

  const startBotSimulation = (quoteLength, startTime) => {
    if (botIntervalRef.current) clearInterval(botIntervalRef.current);

    // Target bot WPM between 45 and 65 WPM
    const targetWpm = 48 + Math.floor(Math.random() * 15);
    const charsPerMinute = targetWpm * 5;
    const charsPerSecond = charsPerMinute / 60;

    botIntervalRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const botChars = Math.min(quoteLength, elapsedSec * charsPerSecond);
      const botProg = (botChars / quoteLength) * 100;
      const botDone = botProg >= 100;

      setPlayers((prev) =>
        prev.map((p) => {
          if (p.isBot) {
            return {
              ...p,
              progress: botProg,
              wpm: targetWpm,
              finished: botDone,
              rank: botDone && !p.rank ? 2 : p.rank,
            };
          }
          return p;
        }),
      );

      if (botDone) {
        clearInterval(botIntervalRef.current);
      }
    }, 250);
  };

  // ---------- MULTIPLAYER WEBRTC LOGIC ----------

  const handleCreateRoom = async () => {
    setMultiError("");
    setConnecting(true);

    try {
      const code = generateRoomCode();
      const pm = new RacePeerManager({
        onStateChange: (state) => {
          if (state.players) setPlayers([...state.players]);
          if (state.raceStarting) {
            handleRemoteRaceStart(state.textData, state.startTime);
          }
          if (state.raceReset) {
            setGameState("LOBBY");
          }
        },
        onError: (err) => {
          setMultiError(err.message || "연결 오류가 발생했습니다.");
        },
      });

      await pm.createRoom(code, nickname || "Host");
      setPeerManager(pm);
      setRoomCode(code);
      myIdRef.current = pm.myId;
      setPlayers(pm.players);
    } catch (err) {
      setMultiError("방 생성에 실패했습니다: " + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    const code = inputRoomCode.trim().toUpperCase();
    if (!code) {
      setMultiError("방 코드를 입력해주세요.");
      return;
    }
    setMultiError("");
    setConnecting(true);

    try {
      const pm = new RacePeerManager({
        onStateChange: (state) => {
          if (state.players) setPlayers([...state.players]);
          if (state.raceStarting) {
            handleRemoteRaceStart(state.textData, state.startTime);
          }
          if (state.raceReset) {
            setGameState("LOBBY");
          }
        },
        onError: (err) => {
          setMultiError(err.message || "연결 오류가 발생했습니다.");
        },
      });

      setPeerManager(pm);
      setRoomCode(code);

      await pm.joinRoom(code, nickname || "Guest");
      myIdRef.current = pm.myId;
      if (pm.players && pm.players.length) {
        setPlayers([...pm.players]);
      }
    } catch (err) {
      setMultiError("방 참가에 실패했습니다: " + err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleStartMultiRace = () => {
    if (!peerManager || !peerManager.isHost) return;
    const quote = getRandomText();
    setCurrentQuote(quote);
    peerManager.startRace(quote);
  };

  const handleRemoteRaceStart = (quote, startTime) => {
    setCurrentQuote(quote);
    const delay = Math.max(0, startTime - Date.now() - 3000);
    setTimeout(() => {
      runCountdown(quote, startTime);
    }, delay);
  };

  // ---------- COUNTDOWN & GAME LIFECYCLE ----------

  const runCountdown = (quote, exactStartTime = null) => {
    setGameState("COUNTDOWN");
    setCountdownNum(3);
    playCountdownBeep(false);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        playCountdownBeep(false);
      } else if (count === 0) {
        setCountdownNum("GO!");
        playCountdownBeep(true);
      } else {
        clearInterval(interval);
        const actualStart = exactStartTime || Date.now();
        setRaceStartTime(actualStart);
        setGameState("RACING");

        // Start bot simulation if solo
        if (gameMode === "solo") {
          startBotSimulation(quote.text.length, actualStart);
        }
      }
    }, 1000);
  };

  // Handling typing progress from local TypingEngine
  const handleTypingProgress = (metrics) => {
    const { progress, wpm, accuracy, finished } = metrics;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === myIdRef.current) {
          return {
            ...p,
            progress,
            wpm,
            accuracy,
            finished,
            rank: finished && !p.rank ? prev.filter((x) => x.finished).length + 1 : p.rank,
          };
        }
        return p;
      }),
    );

    if (gameMode === "multi" && peerManager) {
      peerManager.sendProgress({ progress, wpm, accuracy, finished });
    }
  };

  // When player completes the quote
  const handleTypingFinish = (metrics) => {
    playVictoryFanfare();
    if (botIntervalRef.current) clearInterval(botIntervalRef.current);

    setMyResult({
      ...metrics,
      textLength: currentQuote.text.length,
    });
    setScoreSubmitted(false);
    setGameState("RESULT");
  };

  // Submit score to Cloudflare D1 Leaderboard
  const handleSubmitScore = async () => {
    if (!myResult || scoreSubmitted || submittingScore) return;
    setSubmittingScore(true);

    try {
      const res = await fetch("/api/typing/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nickname: nickname || "익명 레이서",
          wpm: myResult.wpm,
          accuracy: myResult.accuracy,
          timeSeconds: myResult.timeSeconds,
          textLength: myResult.textLength,
          mode: gameMode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setScoreSubmitted(true);
      }
    } catch (e) {
      alert("리더보드 등록 중 오류가 발생했습니다: " + e.message);
    } finally {
      setSubmittingScore(false);
    }
  };

  const handleRestart = () => {
    if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    if (peerManager && peerManager.isHost) {
      peerManager.resetRace();
    }
    setGameState("LOBBY");
    setMyResult(null);
    setScoreSubmitted(false);
  };

  return (
    <div className="typingPageWrapper">
      {/* Confetti when finished with a great race */}
      {gameState === "RESULT" && <Confetti />}

      {/* Header & Controls */}
      <div className="typingHero">
        <div>
          <h1 className="heroTitle">{t.heroTitle}</h1>
          <p className="heroSubtitle">{t.heroSubtitle}</p>
        </div>

        <div className="heroActions">
          <button className="iconButton" onClick={handleToggleLang} title="언어 변경 / Switch Language">
            {lang === "ko" ? "🇺🇸 English" : "🇰🇷 한국어"}
          </button>
          <button className="iconButton" onClick={handleToggleSound} title="효과음 켜기/끄기">
            {soundMuted ? t.soundMuted : t.soundOn}
          </button>
          <button className="iconButton" onClick={() => setIsLeaderboardOpen(true)}>
            {t.leaderboardBtn}
          </button>
        </div>
      </div>

      {/* Racetrack (Visible during Countdown, Racing, and Result) */}
      {gameState !== "LOBBY" && (
        <div style={{ position: "relative" }}>
          <RaceTrack players={players} myId={myIdRef.current} t={t} />

          {/* Countdown Overlay */}
          {gameState === "COUNTDOWN" && (
            <div className="countdownOverlay">
              <span className={`countdownNumber ${countdownNum === "GO!" ? "go" : ""}`}>
                {countdownNum}
              </span>
            </div>
          )}
        </div>
      )}

      {/* LOBBY STATE */}
      {gameState === "LOBBY" && (
        <div className="lobbyCard">
          {/* Mode Selector Tabs */}
          <div className="modeTabs">
            <button
              className={`modeTabBtn ${gameMode === "solo" ? "active" : ""}`}
              onClick={() => {
                setGameMode("solo");
                if (peerManager) peerManager.destroy();
                setPeerManager(null);
                setRoomCode("");
              }}
            >
              {t.soloTab}
            </button>
            <button
              className={`modeTabBtn ${gameMode === "multi" ? "active" : ""}`}
              onClick={() => setGameMode("multi")}
            >
              {t.multiTab}
            </button>
          </div>

          <div className="lobbyFormSection">
            {/* Nickname Input */}
            <div className="inputGroup">
              <label>{t.nicknameLabel}</label>
              <input
                type="text"
                className="textInput"
                value={nickname}
                maxLength={20}
                placeholder={t.nicknamePlaceholder}
                onChange={(e) => handleNicknameChange(e.target.value)}
              />
            </div>

            {/* SOLO MODE CONTENT */}
            {gameMode === "solo" && (
              <div>
                <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "20px" }}>
                  {t.soloDesc}
                </p>
                <button className="btnPrimary" onClick={startSoloRace} style={{ width: "100%" }}>
                  {t.startSoloBtn}
                </button>
              </div>
            )}

            {/* MULTIPLAYER MODE CONTENT */}
            {gameMode === "multi" && (
              <div>
                {!peerManager ? (
                  <div>
                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                      <button
                        className={`btnSecondary ${multiRole === "host" ? "active" : ""}`}
                        style={{ flex: 1, borderColor: multiRole === "host" ? "var(--brand)" : undefined }}
                        onClick={() => setMultiRole("host")}
                      >
                        {t.hostTab}
                      </button>
                      <button
                        className={`btnSecondary ${multiRole === "join" ? "active" : ""}`}
                        style={{ flex: 1, borderColor: multiRole === "join" ? "var(--brand)" : undefined }}
                        onClick={() => setMultiRole("join")}
                      >
                        {t.joinTab}
                      </button>
                    </div>

                    {multiRole === "host" ? (
                      <div>
                        <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "16px" }}>
                          {t.hostDesc}
                        </p>
                        <button
                          className="btnPrimary"
                          onClick={handleCreateRoom}
                          disabled={connecting}
                          style={{ width: "100%" }}
                        >
                          {connecting ? t.creatingRoom : t.createRoomBtn}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="inputGroup">
                          <label>{t.joinCodeLabel}</label>
                          <input
                            type="text"
                            className="textInput"
                            placeholder={t.joinPlaceholder}
                            value={inputRoomCode}
                            maxLength={8}
                            onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                          />
                        </div>
                        <button
                          className="btnPrimary"
                          onClick={handleJoinRoom}
                          disabled={connecting || !inputRoomCode.trim()}
                        >
                          {connecting ? t.joiningRoom : t.joinRoomBtn}
                        </button>
                      </div>
                    )}

                    {multiError && (
                      <p style={{ color: "var(--danger)", fontSize: "14px", marginTop: "12px", fontWeight: "600" }}>
                        ⚠️ {multiError}
                      </p>
                    )}
                  </div>
                ) : (
                  /* MULTIPLAYER LOBBY (CONNECTED) */
                  <div className="multiplayerRoomInfo">
                    <div className="roomCodeBox">
                      <div>
                        <span style={{ fontSize: "12px", color: "var(--text-2)", display: "block" }}>
                          {t.roomCodeTitle}
                        </span>
                        <span className="roomCodeValue">{roomCode}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btnSecondary"
                          onClick={() => {
                            const inviteUrl = `${window.location.origin}/typing?room=${roomCode}`;
                            navigator.clipboard.writeText(inviteUrl);
                            alert(t.linkCopiedAlert + inviteUrl);
                          }}
                        >
                          {t.copyLinkBtn}
                        </button>
                        <button
                          className="btnSecondary"
                          onClick={() => {
                            navigator.clipboard.writeText(roomCode);
                            alert(t.codeCopiedAlert + roomCode);
                          }}
                        >
                          {t.copyCodeBtn}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-2)", display: "block", marginBottom: "8px" }}>
                        {t.waitingRacers(players.length)}
                      </span>
                      <div className="playerListGrid">
                        {players.map((p) => (
                          <div key={p.id} className="playerBadge">
                            <span className="playerColorDot" style={{ background: p.color }} />
                            <span>{p.nickname}</span>
                            {p.isHost && <span style={{ fontSize: "11px", color: "var(--brand)" }}>{t.hostBadge}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {peerManager.isHost ? (
                      <button
                        className="btnPrimary"
                        onClick={handleStartMultiRace}
                        style={{ marginTop: "10px" }}
                      >
                        {t.startMultiBtn}
                      </button>
                    ) : (
                      <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: "14px", margin: "10px 0 0" }}>
                        {t.waitingForHost}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RACING STATE (Strict Mode Typing Engine) */}
      {gameState === "RACING" && (
        <TypingEngine
          text={currentQuote.text}
          isActive={true}
          startTime={raceStartTime}
          t={t}
          onProgress={handleTypingProgress}
          onFinish={handleTypingFinish}
        />
      )}

      {/* RESULT STATE */}
      {gameState === "RESULT" && myResult && (
        <div className="resultCard">
          <h2 className="resultTitle">{t.resultTitle}</h2>
          <p style={{ color: "var(--text-2)", margin: 0 }}>
            {t.resultSubtitle}
          </p>

          <div className="resultStatsGrid">
            <div className="resultStatBox">
              <span className="statLabel">{t.statFinalSpeed}</span>
              <span className="resultStatVal statWpm">{myResult.wpm} WPM</span>
            </div>
            <div className="resultStatBox">
              <span className="statLabel">{t.statFinalAcc}</span>
              <span className="resultStatVal statAcc">{myResult.accuracy}%</span>
            </div>
            <div className="resultStatBox">
              <span className="statLabel">{t.statFinalTime}</span>
              <span className="resultStatVal statProg">{myResult.timeSeconds.toFixed(1)}{t.secondsSuffix}</span>
            </div>
          </div>

          {/* Submit score to D1 Leaderboard */}
          <div className="submitScoreSection">
            {scoreSubmitted ? (
              <span style={{ color: "var(--ok)", fontWeight: "700" }}>
                {t.submitSuccess}
              </span>
            ) : (
              <>
                <span>{t.nicknamePrefix}<b>{nickname || t.anonymous}</b></span>
                <button
                  className="btnPrimary"
                  onClick={handleSubmitScore}
                  disabled={submittingScore}
                >
                  {submittingScore ? t.submitting : t.submitScoreBtn}
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btnPrimary" onClick={handleRestart}>
              {t.raceAgainBtn}
            </button>
            <button className="btnSecondary" onClick={() => setIsLeaderboardOpen(true)}>
              {t.viewLeaderboardBtn}
            </button>
          </div>
        </div>
      )}

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        t={t}
      />
    </div>
  );
}
