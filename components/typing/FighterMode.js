"use client";

import { useEffect, useRef, useState } from "react";
import FighterArena from "./FighterArena";
import FighterEngine from "./FighterEngine";
import {
  playPunchHit,
  playHeavyHit,
  playBlockSound,
  playHealSound,
  playUltimateSound,
  playKoSound,
} from "../../lib/typingAudio";
import { FIGHTER_SKILLS, ULTIMATE_SKILL } from "../../lib/fighterSkills";
import { FighterBattleManager } from "../../lib/webrtcFighter";
import { generateRoomCode } from "../../lib/webrtcRace";

export default function FighterMode({ nickname = "Fighter", t = null, initialRoomCode = "" }) {
  const [subMode, setSubMode] = useState("solo"); // 'solo' | 'multi'
  const [battleActive, setBattleActive] = useState(false);

  // Fighter States
  const [p1, setP1] = useState({
    nickname: nickname || "Player 1",
    hp: 100,
    maxHp: 100,
    combo: 0,
    isGuarding: false,
    state: "idle",
  });

  const [p2, setP2] = useState({
    nickname: "Shadow Fist 🤖",
    hp: 100,
    maxHp: 100,
    combo: 0,
    isGuarding: false,
    state: "idle",
  });

  const [floatingTexts, setFloatingTexts] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [roundStatus, setRoundStatus] = useState("FIGHT");
  const [winner, setWinner] = useState(null);
  const [p2IsAttacking, setP2IsAttacking] = useState(false);

  // Multiplayer (P2P) states
  const [multiRole, setMultiRole] = useState("host");
  const [roomCode, setRoomCode] = useState("");
  const [inputRoomCode, setInputRoomCode] = useState("");
  const [fighterManager, setFighterManager] = useState(null);
  const connectionRef = useRef(null);
  const [connecting, setConnecting] = useState(false);
  const [multiError, setMultiError] = useState("");

  const aiIntervalRef = useRef(null);
  const aiTypingTimerRef = useRef(null);

  // Sync nickname
  useEffect(() => {
    setP1((prev) => ({ ...prev, nickname: nickname || "Player 1" }));
  }, [nickname]);

  // Check URL parameters or initialRoomCode prop on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const room = params.get("room") || initialRoomCode;
      if (room) {
        setSubMode("multi");
        setMultiRole("join");
        setInputRoomCode(room.toUpperCase());
      }
    } else if (initialRoomCode) {
      setSubMode("multi");
      setMultiRole("join");
      setInputRoomCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  // Clean up
  useEffect(() => {
    return () => {
      if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
      if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);
      connectionRef.current?.destroy();
      connectionRef.current = null;
    };
  }, []);

  // Trigger Action FX (Damage popup, sound, screen shake)
  const triggerFx = ({ target, text, type, isHeavy = false }) => {
    const id = Date.now() + Math.random();
    const x = target === "p2" ? "70%" : "25%";
    const y = "50%";

    setFloatingTexts((prev) => [...prev, { id, text, type, x, y }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1000);

    if (type === "guard") {
      playBlockSound();
    } else if (type === "heal") {
      playHealSound();
    } else if (type === "ultDmg") {
      playUltimateSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } else if (type === "dmg") {
      if (isHeavy) {
        playHeavyHit();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 300);
      } else {
        playPunchHit();
      }
    }
  };

  // ---------- SOLO BATTLE (vs AI) ----------

  const startSoloBattle = () => {
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);

    setP1({
      nickname: nickname || "Player 1",
      hp: 100,
      maxHp: 100,
      combo: 0,
      isGuarding: false,
      state: "idle",
    });

    setP2({
      nickname: "Shadow Fist 🤖",
      hp: 100,
      maxHp: 100,
      combo: 0,
      isGuarding: false,
      state: "idle",
    });

    setRoundStatus("START");
    setWinner(null);
    setBattleActive(true);

    setTimeout(() => {
      setRoundStatus("FIGHT");
      startAiCycle();
    }, 1500);
  };

  const startAiCycle = () => {
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    // AI evaluates move every 2.8 ~ 4.2 seconds
    aiIntervalRef.current = setInterval(() => {
      if (winner) return;

      // Choose AI move
      setP2((prevP2) => {
        let skillToUse = FIGHTER_SKILLS[0]; // light jab

        if (prevP2.combo >= 3) {
          skillToUse = ULTIMATE_SKILL;
        } else {
          const rand = Math.random();
          if (rand < 0.45) skillToUse = FIGHTER_SKILLS[0]; // light
          else if (rand < 0.75) skillToUse = FIGHTER_SKILLS[1]; // heavy
          else skillToUse = FIGHTER_SKILLS[2]; // guard
        }

        // Signal that AI is preparing attack
        if (skillToUse.type === "attack" || skillToUse.type === "ultimate") {
          setP2IsAttacking(true);
        }

        // Simulate AI typing delay
        const delay = skillToUse.id === "ultimate" ? 3800 : skillToUse.id === "heavy" ? 2800 : 1600;

        aiTypingTimerRef.current = setTimeout(() => {
          setP2IsAttacking(false);
          executeAiSkill(skillToUse);
        }, delay);

        return prevP2;
      });
    }, 3800);
  };

  const executeAiSkill = (skill) => {
    setP2((prevP2) => {
      setP1((prevP1) => {
        if (prevP1.hp <= 0 || prevP2.hp <= 0) return prevP1;

        if (skill.type === "attack" || skill.type === "ultimate") {
          let dmg = skill.damage;
          let wasGuarded = prevP1.isGuarding;

          if (wasGuarded) {
            dmg = Math.round(dmg * 0.3);
            const nextHp = Math.max(0, prevP1.hp - dmg);
            triggerFx({ target: "p1", text: `BLOCKED! -${dmg}`, type: "guard" });
            // Counter reflect to AI
            triggerFx({ target: "p2", text: `PARRY -8`, type: "dmg" });
            setP2((cur) => ({ ...cur, hp: Math.max(0, cur.hp - 8) }));

            if (nextHp <= 0) handleKo("p2");
            return { ...prevP1, hp: nextHp };
          } else {
            const nextHp = Math.max(0, prevP1.hp - dmg);
            triggerFx({
              target: "p1",
              text: skill.id === "ultimate" ? `⚡ CRITICAL -${dmg}` : `-${dmg}`,
              type: skill.id === "ultimate" ? "ultDmg" : "dmg",
              isHeavy: skill.id === "heavy" || skill.id === "ultimate",
            });

            if (nextHp <= 0) handleKo("p2");
            return { ...prevP1, hp: nextHp, state: "hit" };
          }
        } else if (skill.type === "guard") {
          triggerFx({ target: "p2", text: "GUARD UP!", type: "guard" });
          setTimeout(() => {
            setP2((cur) => ({ ...cur, isGuarding: false }));
          }, skill.durationMs || 4000);
          return prevP1;
        }

        return prevP1;
      });

      // Update AI combo & animation
      const nextCombo = skill.id === "ultimate" ? 0 : Math.min(3, (prevP2.combo || 0) + 1);
      const nextState = skill.id === "ultimate" ? "ultimate" : skill.id === "heavy" ? "attack_heavy" : skill.type === "guard" ? "guard" : "attack_light";

      setTimeout(() => {
        setP2((cur) => ({ ...cur, state: "idle" }));
      }, 500);

      return {
        ...prevP2,
        combo: nextCombo,
        state: nextState,
        isGuarding: skill.type === "guard" ? true : prevP2.isGuarding,
      };
    });
  };

  // Player 1 Casts a Skill
  const handlePlayerCastSkill = (skill, metrics) => {
    if (subMode === "multi" && fighterManager) {
      fighterManager.castSkill(skill);
      return;
    }

    // Solo Mode Execution
    setP1((prevP1) => {
      const nextCombo = skill.id === "ultimate" ? 0 : Math.min(3, (prevP1.combo || 0) + 1);
      const nextState = skill.id === "ultimate" ? "ultimate" : skill.id === "heavy" ? "attack_heavy" : skill.type === "guard" ? "guard" : "attack_light";

      setTimeout(() => {
        setP1((cur) => ({ ...cur, state: "idle" }));
      }, 500);

      if (skill.type === "heal") {
        const nextHp = Math.min(prevP1.maxHp, prevP1.hp + (skill.healAmount || 16));
        triggerFx({ target: "p1", text: `+${skill.healAmount} HEAL`, type: "heal" });
        return { ...prevP1, hp: nextHp, combo: nextCombo, state: nextState };
      }

      if (skill.type === "guard") {
        triggerFx({ target: "p1", text: "GUARD UP!", type: "guard" });
        setTimeout(() => {
          setP1((cur) => ({ ...cur, isGuarding: false }));
        }, skill.durationMs || 4000);
        return { ...prevP1, isGuarding: true, combo: nextCombo, state: nextState };
      }

      return { ...prevP1, combo: nextCombo, state: nextState };
    });

    if (skill.type === "attack" || skill.type === "ultimate") {
      setP2((prevP2) => {
        let dmg = skill.damage;
        let wasGuarded = prevP2.isGuarding;

        if (wasGuarded) {
          dmg = Math.round(dmg * 0.3);
          const nextHp = Math.max(0, prevP2.hp - dmg);
          triggerFx({ target: "p2", text: `BLOCKED! -${dmg}`, type: "guard" });
          triggerFx({ target: "p1", text: "PARRY -8", type: "dmg" });
          setP1((cur) => ({ ...cur, hp: Math.max(0, cur.hp - 8) }));

          if (nextHp <= 0) handleKo("p1");
          return { ...prevP2, hp: nextHp };
        } else {
          const nextHp = Math.max(0, prevP2.hp - dmg);
          triggerFx({
            target: "p2",
            text: skill.id === "ultimate" ? `⚡ CRITICAL -${dmg}` : `-${dmg}`,
            type: skill.id === "ultimate" ? "ultDmg" : "dmg",
            isHeavy: skill.id === "heavy" || skill.id === "ultimate",
          });

          if (nextHp <= 0) handleKo("p1");
          return { ...prevP2, hp: nextHp, state: "hit" };
        }
      });
    }
  };

  const handleKo = (winnerSide) => {
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    if (aiTypingTimerRef.current) clearTimeout(aiTypingTimerRef.current);

    setRoundStatus("KO");
    setWinner(winnerSide);
    playKoSound();

    if (winnerSide === "p1") {
      setP2((prev) => ({ ...prev, hp: 0, state: "ko" }));
    } else {
      setP1((prev) => ({ ...prev, hp: 0, state: "ko" }));
    }
  };

  // ---------- MULTIPLAYER (P2P) SETUP ----------

  // ---------- MULTIPLAYER (P2P) SETUP ----------

  const handleCreateMultiRoom = async () => {
    setMultiError("");
    setConnecting(true);

    let fm;
    try {
      const code = generateRoomCode();
      fm = new FighterBattleManager({
        onStateChange: (state) => {
          if (state.battleState) {
            setP1(state.battleState.p1);
            setP2(state.battleState.p2);
            setRoundStatus(state.battleState.roundStatus);
            setWinner(state.battleState.winner);
          }
          if (state.battleStarted) {
            setBattleActive(true);
            setRoundStatus("FIGHT");
          }
          if (state.opponentLeft) setBattleActive(false);
          if (state.resetToLobby) {
            setBattleActive(false);
            setRoundStatus("WAITING");
          }
        },
        onError: (err) => {
          if (connectionRef.current !== fm) return;
          fm.destroy();
          setFighterManager(null);
          setRoomCode("");
          setBattleActive(false);
          setMultiError(err.message);
        },
        onActionFx: (fx) => triggerFx(fx),
      });

      connectionRef.current?.destroy();
      connectionRef.current = fm;
      await fm.createRoom(code, nickname || "Host Fighter");
      if (connectionRef.current !== fm) return;
      setFighterManager(fm);
      setRoomCode(code);
      setBattleActive(false); // Stay in lobby until opponent joins & host starts!
      setRoundStatus("WAITING");
    } catch (err) {
      fm?.destroy();
      if (connectionRef.current !== fm) return;
      setFighterManager(null);
      setRoomCode("");
      setMultiError((t?.errCreateRoom || "방 생성 오류: ") + err.message);
    } finally {
      if (connectionRef.current === fm) setConnecting(false);
    }
  };

  const handleJoinMultiRoom = async () => {
    const code = inputRoomCode.trim().toUpperCase();
    if (!code) {
      setMultiError(t?.errEnterCode || "방 코드를 입력해주세요.");
      return;
    }
    setMultiError("");
    setConnecting(true);

    let fm;
    try {
      fm = new FighterBattleManager({
        onStateChange: (state) => {
          if (state.battleState) {
            setP1(state.battleState.p1);
            setP2(state.battleState.p2);
            setRoundStatus(state.battleState.roundStatus);
            setWinner(state.battleState.winner);
          }
          if (state.battleStarted) {
            setBattleActive(true);
            setRoundStatus("FIGHT");
          }
          if (state.opponentLeft) setBattleActive(false);
          if (state.resetToLobby) {
            setBattleActive(false);
            setRoundStatus("WAITING");
          }
        },
        onError: (err) => {
          if (connectionRef.current !== fm) return;
          fm.destroy();
          setFighterManager(null);
          setRoomCode("");
          setBattleActive(false);
          setMultiError(err.message);
        },
        onActionFx: (fx) => triggerFx(fx),
      });

      connectionRef.current?.destroy();
      connectionRef.current = fm;
      await fm.joinRoom(code, nickname || "Guest Fighter");
      if (connectionRef.current !== fm) return;
      setFighterManager(fm);
      setRoomCode(code);
      setBattleActive(false); // Stay in lobby until host starts!
      setRoundStatus("WAITING");
    } catch (err) {
      fm?.destroy();
      if (connectionRef.current !== fm) return;
      setFighterManager(null);
      setRoomCode("");
      setMultiError((t?.errJoinRoom || "방 참가 오류: ") + err.message);
    } finally {
      if (connectionRef.current === fm) setConnecting(false);
    }
  };

  const handleStartMultiBattle = () => {
    if (fighterManager && fighterManager.isHost) {
      fighterManager.startBattle();
      setBattleActive(true);
      setRoundStatus("FIGHT");
    }
  };

  const handleLeaveMultiRoom = () => {
    connectionRef.current?.destroy();
    connectionRef.current = null;
    setConnecting(false);
    if (fighterManager) {
      setFighterManager(null);
    }
    setRoomCode("");
    setBattleActive(false);
    setRoundStatus("WAITING");
    setP1({
      nickname: nickname || "Player 1",
      hp: 100,
      maxHp: 100,
      combo: 0,
      isGuarding: false,
      state: "idle",
    });
    setP2({
      nickname: "Shadow Fist 🤖",
      hp: 100,
      maxHp: 100,
      combo: 0,
      isGuarding: false,
      state: "idle",
    });
  };

  // Local Player vs Opponent determination
  const isGuest = subMode === "multi" && fighterManager && !fighterManager.isHost;
  const myPlayer = isGuest ? p2 : p1;
  const oppPlayer = isGuest ? p1 : p2;
  const isMyWin = (winner === "p1" && !isGuest) || (winner === "p2" && isGuest);

  return (
    <div className="fighterModeWrapper">
      {/* ARENA STAGE (Always visible) */}
      <FighterArena
        p1={p1}
        p2={p2}
        floatingTexts={floatingTexts}
        isShaking={isShaking}
        roundStatus={roundStatus}
        winner={winner}
        subMode={subMode}
        isHost={!isGuest}
        roomCode={roomCode}
        t={t}
      />

      {/* LOBBY / PRE-BATTLE CONTROLS */}
      {!battleActive ? (
        <div className="lobbyCard">
          <div className="modeTabs">
            <button
              className={`modeTabBtn ${subMode === "solo" ? "active" : ""}`}
              onClick={() => {
                handleLeaveMultiRoom();
                setSubMode("solo");
              }}
            >
              {t?.fighterSoloTab || "🥋 AI 배틀 (vs Shadow Fist)"}
            </button>
            <button
              className={`modeTabBtn ${subMode === "multi" ? "active" : ""}`}
              onClick={() => setSubMode("multi")}
            >
              {t?.fighterMultiTab || "⚔️ 1:1 실시간 결투 (P2P)"}
            </button>
          </div>

          {subMode === "solo" ? (
            <div>
              <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "20px" }}>
                {t?.fighterSoloDesc || "체력 100의 단판 데스매치! AI 파이터를 상대로 기술을 구사하고 공격을 가드하며 승리하세요."}
              </p>
              <button className="btnPrimary" onClick={startSoloBattle} style={{ width: "100%", fontSize: "18px" }}>
                {t?.fighterStartBtn || "대전 시작 (FIGHT) 🥊"}
              </button>
            </div>
          ) : (
            <div>
              {!fighterManager ? (
                <div>
                  <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <button
                      className={`btnSecondary ${multiRole === "host" ? "active" : ""}`}
                      style={{ flex: 1, borderColor: multiRole === "host" ? "var(--brand)" : undefined }}
                      onClick={() => setMultiRole("host")}
                    >
                      {t?.hostFighterTab || "방 만들기 (Host)"}
                    </button>
                    <button
                      className={`btnSecondary ${multiRole === "join" ? "active" : ""}`}
                      style={{ flex: 1, borderColor: multiRole === "join" ? "var(--brand)" : undefined }}
                      onClick={() => setMultiRole("join")}
                    >
                      {t?.joinFighterTab || "방 참가하기 (Join)"}
                    </button>
                  </div>

                  {multiRole === "host" ? (
                    <div>
                      <p style={{ color: "var(--text-2)", fontSize: "14px", marginBottom: "16px" }}>
                        {t?.hostFighterDesc || "방 코드를 생성해 친구와 1:1 진검승부를 펼치세요."}
                      </p>
                      <button
                        className="btnPrimary"
                        onClick={handleCreateMultiRoom}
                        disabled={connecting}
                        style={{ width: "100%", fontSize: "16px" }}
                      >
                        {connecting ? (t?.creatingFighterRoom || "방 개설 중...") : (t?.createFighterRoomBtn || "결투방 만들기 ⚔️")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div className="inputGroup">
                        <label>{t?.joinFighterCodeLabel || "방 코드 입력 (6자리)"}</label>
                        <input
                          type="text"
                          className="textInput"
                          placeholder={t?.joinFighterPlaceholder || "예: FIGHT9"}
                          value={inputRoomCode}
                          maxLength={8}
                          onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                        />
                      </div>
                      <button
                        className="btnPrimary"
                        onClick={handleJoinMultiRoom}
                        disabled={connecting || !inputRoomCode.trim()}
                        style={{ width: "100%", fontSize: "16px" }}
                      >
                        {connecting ? (t?.joiningFighterRoom || "접속 중...") : (t?.joinFighterRoomBtn || "결투방 입장하기 🚀")}
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
                /* MULTIPLAYER WAITING LOBBY */
                <div className="multiplayerRoomInfo">
                  {/* Room Code Box */}
                  <div className="roomCodeBox">
                    <div>
                      <span style={{ fontSize: "13px", color: "var(--text-2)", display: "block" }}>
                        {t?.roomCodeTitle || "방 초대 코드"}
                      </span>
                      <span className="roomCodeValue">{roomCode}</span>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      <button
                        className="btnSecondary"
                        onClick={() => {
                          const inviteUrl = `${window.location.origin}/games/typing?mode=fighter&room=${roomCode}`;
                          navigator.clipboard.writeText(inviteUrl);
                          alert((t?.linkCopiedAlert || "초대 링크가 복사되었습니다:\n") + inviteUrl);
                        }}
                      >
                        🔗 {t?.copyLinkBtn || "초대 링크 복사"}
                      </button>
                      <button
                        className="btnSecondary"
                        onClick={() => {
                          navigator.clipboard.writeText(roomCode);
                          alert((t?.codeCopiedAlert || "방 코드가 복사되었습니다: ") + roomCode);
                        }}
                      >
                        📋 {t?.copyCodeBtn || "코드만 복사"}
                      </button>
                    </div>
                  </div>

                  {/* Fighter Matchup Roster */}
                  <div className="fighterRosterContainer">
                    {/* 1P Host Card */}
                    <div className="fighterRosterCard host">
                      <span className="rosterBadge hostBadge">👑 1P {t?.fighterHostBadge || "방장"}</span>
                      <div className="rosterAvatar">🥋</div>
                      <div className="rosterName">{p1.nickname}</div>
                      <span className="rosterStatus ready">READY</span>
                    </div>

                    <div className="fighterRosterVs">VS</div>

                    {/* 2P Guest Card */}
                    <div className={`fighterRosterCard guest ${p2.nickname ? "connected" : "waiting"}`}>
                      <span className="rosterBadge guestBadge">🥊 2P {t?.fighterChallengerBadge || "도전자"}</span>
                      <div className="rosterAvatar">{p2.nickname ? "🥷" : "⏳"}</div>
                      <div className="rosterName">
                        {p2.nickname ? p2.nickname : (t?.waitingForChallenger || "도전자 입장 대기 중...")}
                      </div>
                      <span className={`rosterStatus ${p2.nickname ? "ready" : "waiting"}`}>
                        {p2.nickname ? "READY" : (t?.waitingDots || "대기 중...")}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar (Start button or waiting notice) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                    {fighterManager.isHost ? (
                      <>
                        {p2.nickname ? (
                          <button
                            className="btnPrimary btnPulse"
                            onClick={handleStartMultiBattle}
                            style={{ width: "100%", fontSize: "18px", padding: "14px" }}
                          >
                            🔥 {t?.startBattleBtn || "결투 시작! (START FIGHT)"}
                          </button>
                        ) : (
                          <div className="waitingNoticeBox">
                            <span className="pulsingDot" />
                            <span>
                              {t?.waitingOpponentNotice || "친구에게 방 코드나 초대 링크를 보내주세요. 도전자 입장 시 대결을 시작할 수 있습니다."}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="waitingNoticeBox">
                        <span className="pulsingDot" />
                        <span>
                          {t?.waitingHostToStart || "방장이 결투를 시작할 때까지 잠시 대기해주세요..."}
                        </span>
                      </div>
                    )}

                    <button
                      className="btnSecondary"
                      onClick={handleLeaveMultiRoom}
                      style={{ width: "100%" }}
                    >
                      {t?.leaveRoomBtn || "방 나가기"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE BATTLE CONTROLS & ENGINE */
        <div>
          {roundStatus !== "KO" ? (
            <FighterEngine
              isActive={roundStatus === "FIGHT"}
              combo={myPlayer.combo || 0}
              opponentIsAttacking={oppPlayer.state?.startsWith("attack") || oppPlayer.state === "ultimate"}
              isGuarding={myPlayer.isGuarding}
              onCastSkill={handlePlayerCastSkill}
              t={t}
            />
          ) : (
            /* MATCH FINISHED RESULT CARD */
            <div className="resultCard">
              <h2 className="resultTitle">
                {isMyWin ? (t?.koYouWin || "🏆 YOU WIN! (K.O.)") : (t?.koYouLose || "💀 YOU LOSE... (K.O.)")}
              </h2>
              <p style={{ color: "var(--text-2)", margin: "0 0 20px 0" }}>
                {isMyWin
                  ? (t?.koWinDesc || "화려한 타격과 필살기로 상대를 완벽하게 쓰러뜨렸습니다!")
                  : (t?.koLoseDesc || "체력이 다했습니다. 재정비하고 다시 도전해보세요!")}
              </p>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  className="btnPrimary"
                  onClick={() => {
                    if (subMode === "solo") {
                      startSoloBattle();
                    } else if (fighterManager) {
                      fighterManager.restartBattle();
                    }
                  }}
                >
                  {t?.fighterRematchBtn || "다시 싸우기 🔄"}
                </button>
                <button
                  className="btnSecondary"
                  onClick={() => {
                    if (subMode === "solo") {
                      setBattleActive(false);
                    } else if (fighterManager) {
                      if (fighterManager.isHost) {
                        fighterManager.resetToLobby();
                      }
                      setBattleActive(false);
                    }
                  }}
                >
                  {t?.leaveRoomBtn || "대기실로 돌아가기"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
