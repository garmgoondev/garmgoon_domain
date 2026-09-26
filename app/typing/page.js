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

export default function TypingPage() {
  // Page / Game States: 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'RESULT'
  const [gameState, setGameState] = useState("LOBBY");
  const [gameMode, setGameMode] = useState("solo"); // 'solo' | 'multi'

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

  // Load saved nickname and audio preference, and check URL for room invite
  useEffect(() => {
    const savedName = localStorage.getItem("typing_nickname");
    if (savedName) setNickname(savedName);
    setSoundMuted(isMuted());

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
          <h1 className="heroTitle">🏎️ 타자 레이스 (Typing Race)</h1>
          <p className="heroSubtitle">실시간으로 경쟁하며 타자 속도(WPM)와 정확도를 겨뤄보세요.</p>
        </div>

        <div className="heroActions">
          <button className="iconButton" onClick={handleToggleSound} title="효과음 켜기/끄기">
            {soundMuted ? "🔇 음소거됨" : "🔊 효과음 ON"}
          </button>
          <button className="iconButton" onClick={() => setIsLeaderboardOpen(true)}>
            🏆 명예의 전당
          </button>
        </div>
      </div>

      {/* Racetrack (Visible during Countdown, Racing, and Result) */}
      {gameState !== "LOBBY" && (
        <div style={{ position: "relative" }}>
          <RaceTrack players={players} myId={myIdRef.current} />

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
              🚀 싱글 연습 (Solo AI Race)
            </button>
            <button
              className={`modeTabBtn ${gameMode === "multi" ? "active" : ""}`}
              onClick={() => setGameMode("multi")}
            >
              👥 실시간 멀티 (WebRTC P2P)
            </button>
          </div>

          <div className="lobbyFormSection">
            {/* Nickname Input */}
            <div className="inputGroup">
              <label>레이서 닉네임</label>
              <input
                type="text"
                className="textInput"
                value={nickname}
                maxLength={20}
                placeholder="닉네임을 입력하세요"
                onChange={(e) => handleNicknameChange(e.target.value)}
              />
            </div>

            {/* SOLO MODE CONTENT */}
            {gameMode === "solo" && (
              <div>
                <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "20px" }}>
                  가상 AI 레이서(Bot Turbo)와 함께 1:1 레이스를 펼칩니다. 완주 후 기록을 명예의 전당에 바로 등록할 수 있습니다.
                </p>
                <button className="btnPrimary" onClick={startSoloRace} style={{ width: "100%" }}>
                  레이스 시작하기 🏁
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
                        방 만들기 (Host)
                      </button>
                      <button
                        className={`btnSecondary ${multiRole === "join" ? "active" : ""}`}
                        style={{ flex: 1, borderColor: multiRole === "join" ? "var(--brand)" : undefined }}
                        onClick={() => setMultiRole("join")}
                      >
                        방 참가하기 (Join)
                      </button>
                    </div>

                    {multiRole === "host" ? (
                      <div>
                        <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "16px" }}>
                          방을 생성하면 초대 코드가 발급됩니다. 친구에게 코드를 공유해 함께 실시간 레이스를 즐기세요.
                        </p>
                        <button
                          className="btnPrimary"
                          onClick={handleCreateRoom}
                          disabled={connecting}
                          style={{ width: "100%" }}
                        >
                          {connecting ? "방 개설 중..." : "방 만들기 & 대기실 입장"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div className="inputGroup">
                          <label>참가할 방 코드 (6자리)</label>
                          <input
                            type="text"
                            className="textInput"
                            placeholder="예: ABC123"
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
                          {connecting ? "방 접속 중..." : "방 입장하기 🚀"}
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
                          방 초대 코드
                        </span>
                        <span className="roomCodeValue">{roomCode}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btnSecondary"
                          onClick={() => {
                            const inviteUrl = `${window.location.origin}/typing?room=${roomCode}`;
                            navigator.clipboard.writeText(inviteUrl);
                            alert("초대 링크가 복사되었습니다! 새 탭이나 다른 브라우저에 붙여넣으세요:\n" + inviteUrl);
                          }}
                        >
                          초대 링크 복사 🔗
                        </button>
                        <button
                          className="btnSecondary"
                          onClick={() => {
                            navigator.clipboard.writeText(roomCode);
                            alert("방 코드가 클립보드에 복사되었습니다: " + roomCode);
                          }}
                        >
                          코드 복사 📋
                        </button>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-2)", display: "block", marginBottom: "8px" }}>
                        대기 중인 레이서 ({players.length}명)
                      </span>
                      <div className="playerListGrid">
                        {players.map((p) => (
                          <div key={p.id} className="playerBadge">
                            <span className="playerColorDot" style={{ background: p.color }} />
                            <span>{p.nickname}</span>
                            {p.isHost && <span style={{ fontSize: "11px", color: "var(--brand)" }}>(방장)</span>}
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
                        모두 모였으면 레이스 시작! 🚦
                      </button>
                    ) : (
                      <p style={{ textAlign: "center", color: "var(--text-2)", fontSize: "14px", margin: "10px 0 0" }}>
                        방장이 레이스를 시작할 때까지 대기 중입니다...
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
          onProgress={handleTypingProgress}
          onFinish={handleTypingFinish}
        />
      )}

      {/* RESULT STATE */}
      {gameState === "RESULT" && myResult && (
        <div className="resultCard">
          <h2 className="resultTitle">🏁 레이스 완주!</h2>
          <p style={{ color: "var(--text-2)", margin: 0 }}>
            멋진 주행이었습니다! 최종 기록을 확인해보세요.
          </p>

          <div className="resultStatsGrid">
            <div className="resultStatBox">
              <span className="statLabel">최종 속도</span>
              <span className="resultStatVal statWpm">{myResult.wpm} WPM</span>
            </div>
            <div className="resultStatBox">
              <span className="statLabel">타이핑 정확도</span>
              <span className="resultStatVal statAcc">{myResult.accuracy}%</span>
            </div>
            <div className="resultStatBox">
              <span className="statLabel">완주 시간</span>
              <span className="resultStatVal statProg">{myResult.timeSeconds.toFixed(1)}초</span>
            </div>
          </div>

          {/* Submit score to D1 Leaderboard */}
          <div className="submitScoreSection">
            {scoreSubmitted ? (
              <span style={{ color: "var(--ok)", fontWeight: "700" }}>
                ✅ 명예의 전당 리더보드에 성공적으로 등록되었습니다!
              </span>
            ) : (
              <>
                <span>닉네임: <b>{nickname || "익명"}</b></span>
                <button
                  className="btnPrimary"
                  onClick={handleSubmitScore}
                  disabled={submittingScore}
                >
                  {submittingScore ? "등록 중..." : "🏆 리더보드에 내 기록 등록하기"}
                </button>
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btnPrimary" onClick={handleRestart}>
              다시 레이스하기 🏎️
            </button>
            <button className="btnSecondary" onClick={() => setIsLeaderboardOpen(true)}>
              리더보드 보기 🏆
            </button>
          </div>
        </div>
      )}

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </div>
  );
}
