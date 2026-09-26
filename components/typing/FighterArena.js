"use client";

import { useEffect, useState } from "react";

export default function FighterArena({
  p1 = { nickname: "Player 1", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
  p2 = { nickname: "Shadow Fist 🤖", hp: 100, maxHp: 100, combo: 0, isGuarding: false, state: "idle" },
  floatingTexts = [],
  isShaking = false,
  roundStatus = "FIGHT", // 'START' | 'FIGHT' | 'KO'
  winner = null, // 'p1' | 'p2' | null
  t = null,
}) {
  const p1HpPercent = Math.max(0, Math.min(100, (p1.hp / p1.maxHp) * 100));
  const p2HpPercent = Math.max(0, Math.min(100, (p2.hp / p2.maxHp) * 100));

  const getHpColor = (percent) => {
    if (percent > 50) return "linear-gradient(90deg, #10B981, #059669)";
    if (percent > 20) return "linear-gradient(90deg, #F59E0B, #D97706)";
    return "linear-gradient(90deg, #EF4444, #B91C1C)";
  };

  return (
    <div className={`fighterArenaContainer ${isShaking ? "screenShake" : ""}`}>
      {/* Top HUD: Health Bars & Combo Gauges */}
      <div className="arenaHud">
        {/* Player 1 Health & Combo */}
        <div className="hudFighterLeft">
          <div className="hudFighterNameRow">
            <span className="hudFighterName">
              {p1.nickname} {p1.isGuarding && <span className="guardBadgePulse">🛡️ GUARD</span>}
            </span>
            <span className="hudHpNumber">{Math.max(0, Math.round(p1.hp))} / {p1.maxHp}</span>
          </div>

          <div className="hpBarTrack">
            <div
              className="hpBarFill"
              style={{
                width: `${p1HpPercent}%`,
                background: getHpColor(p1HpPercent),
              }}
            />
          </div>

          {/* Combo / Ultimate Meter */}
          <div className="comboMeterRow">
            <span className="comboLabel">COMBO</span>
            <div className="comboDots">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`comboDot ${p1.combo >= step ? "active" : ""} ${p1.combo >= 3 ? "ultimateReady" : ""}`}
                />
              ))}
            </div>
            {p1.combo >= 3 && <span className="ultimateReadyTag">⚡ ULTIMATE READY!</span>}
          </div>
        </div>

        {/* Center VS Badge */}
        <div className="hudVsBadge">
          <span className="vsText">VS</span>
        </div>

        {/* Player 2 Health & Combo */}
        <div className="hudFighterRight">
          <div className="hudFighterNameRow" style={{ flexDirection: "row-reverse" }}>
            <span className="hudFighterName">
              {p2.isGuarding && <span className="guardBadgePulse">🛡️ GUARD</span>} {p2.nickname}
            </span>
            <span className="hudHpNumber">{Math.max(0, Math.round(p2.hp))} / {p2.maxHp}</span>
          </div>

          <div className="hpBarTrack rightTrack">
            <div
              className="hpBarFill rightFill"
              style={{
                width: `${p2HpPercent}%`,
                background: getHpColor(p2HpPercent),
              }}
            />
          </div>

          {/* Combo / Ultimate Meter for P2 */}
          <div className="comboMeterRow rightCombo">
            {p2.combo >= 3 && <span className="ultimateReadyTag">⚡ ULTIMATE READY!</span>}
            <div className="comboDots">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`comboDot ${p2.combo >= step ? "active" : ""} ${p2.combo >= 3 ? "ultimateReady" : ""}`}
                />
              ))}
            </div>
            <span className="comboLabel">COMBO</span>
          </div>
        </div>
      </div>

      {/* Battle Stage */}
      <div className="battleStage">
        {/* Stage Lighting & Atmosphere */}
        <div className="stageBackgroundGlow" />
        <div className="stageRopes" />
        <div className="stageFloor" />

        {/* Floating Combat Numbers */}
        {floatingTexts.map((f) => (
          <div
            key={f.id}
            className={`floatingDamageText ${f.type}`}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}
          </div>
        ))}

        {/* Fighter 1 (Left - Blue Gi) */}
        <div className={`fighterCharacter p1Fighter ${p1.state}`}>
          {/* Energy Shield Aura */}
          {p1.isGuarding && <div className="guardShieldAura" />}

          {/* Hit Spark on P1 */}
          {p1.state === "hit" && <div className="hitSparkEffect" />}

          <svg width="120" height="150" viewBox="0 0 120 150" className="fighterSvg">
            {/* Fighter Shadow */}
            <ellipse cx="60" cy="142" rx="38" ry="6" fill="rgba(0,0,0,0.35)" />

            {/* Body / Gi */}
            <path d="M40 70 L30 110 L50 140 L70 140 L90 110 L80 70 Z" fill="#2563EB" />
            <path d="M48 70 L60 95 L72 70" stroke="#F1F5F9" strokeWidth="5" fill="none" />

            {/* Belt */}
            <rect x="42" y="92" width="36" height="6" rx="2" fill="#0F172A" />
            <path d="M56 98 L54 116 M62 98 L64 114" stroke="#0F172A" strokeWidth="4" />

            {/* Head & Headband */}
            <circle cx="60" cy="45" r="18" fill="#FBBF24" />
            <path d="M40 40 Q60 36 80 40 L80 46 Q60 42 40 46 Z" fill="#EF4444" />
            {/* Headband tail waving */}
            <path d="M38 42 Q25 40 18 52" stroke="#EF4444" strokeWidth="4" fill="none" className="headbandTail" />

            {/* Facial Expression */}
            <circle cx="67" cy="45" r="2.5" fill="#1E293B" />
            <line x1="64" y1="40" x2="71" y2="42" stroke="#1E293B" strokeWidth="2" />

            {/* Left Arm / Glove */}
            <g className="armLeft">
              <path d="M35 72 L18 85 L26 95" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" />
              <circle cx="26" cy="95" r="9" fill="#1E40AF" />
            </g>

            {/* Right Arm / Glove (Punching Arm) */}
            <g className="armRight">
              <path d="M78 72 L95 80 L108 76" stroke="#2563EB" strokeWidth="8" strokeLinecap="round" />
              <circle cx="108" cy="76" r="10" fill="#EF4444" />
            </g>
          </svg>
        </div>

        {/* Fighter 2 (Right - Red/Black Gi) */}
        <div className={`fighterCharacter p2Fighter ${p2.state}`}>
          {/* Energy Shield Aura */}
          {p2.isGuarding && <div className="guardShieldAura rightShield" />}

          {/* Hit Spark on P2 */}
          {p2.state === "hit" && <div className="hitSparkEffect rightSpark" />}

          <svg width="120" height="150" viewBox="0 0 120 150" className="fighterSvg">
            {/* Fighter Shadow */}
            <ellipse cx="60" cy="142" rx="38" ry="6" fill="rgba(0,0,0,0.35)" />

            {/* Body / Gi */}
            <path d="M40 70 L30 110 L50 140 L70 140 L90 110 L80 70 Z" fill="#1E293B" />
            <path d="M48 70 L60 95 L72 70" stroke="#DC2626" strokeWidth="5" fill="none" />

            {/* Belt */}
            <rect x="42" y="92" width="36" height="6" rx="2" fill="#DC2626" />
            <path d="M56 98 L54 116 M62 98 L64 114" stroke="#DC2626" strokeWidth="4" />

            {/* Head & Mask */}
            <circle cx="60" cy="45" r="18" fill="#F59E0B" />
            <path d="M42 42 Q60 38 78 42 L78 48 Q60 44 42 48 Z" fill="#0F172A" />
            <circle cx="53" cy="45" r="2.5" fill="#EF4444" />
            <line x1="56" y1="40" x2="49" y2="42" stroke="#0F172A" strokeWidth="2" />

            {/* Left Arm / Glove */}
            <g className="armLeft">
              <path d="M35 72 L18 80 L12 76" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
              <circle cx="12" cy="76" r="10" fill="#DC2626" />
            </g>

            {/* Right Arm / Glove */}
            <g className="armRight">
              <path d="M78 72 L95 85 L88 95" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
              <circle cx="88" cy="95" r="9" fill="#0F172A" />
            </g>
          </svg>
        </div>

        {/* Round Start & K.O. Banners */}
        {roundStatus === "START" && (
          <div className="fightBannerOverlay">
            <span className="fightBannerText pulse">ROUND 1</span>
            <span className="fightSubBannerText">FIGHT!</span>
          </div>
        )}

        {roundStatus === "KO" && (
          <div className="koBannerOverlay">
            <span className="koBannerText bounceIn">K.O.!</span>
            <span className="koWinnerText">
              {winner === "p1" ? (t?.koYouWin || "🏆 YOU WIN!") : (t?.koYouLose || "💀 YOU LOSE...")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
