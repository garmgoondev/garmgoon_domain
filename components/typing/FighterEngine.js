"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playKeyClick, playErrorSound } from "../../lib/typingAudio";
import { FIGHTER_SKILLS, ULTIMATE_SKILL, getRandomPrompt, getRandomUltimatePrompt } from "../../lib/fighterSkills";

export default function FighterEngine({
  isActive = false,
  combo = 0,
  opponentIsAttacking = false,
  isGuarding = false,
  onCastSkill = () => {},
  t = null,
}) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [targetText, setTargetText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMistake, setCurrentMistake] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState(null);

  const inputRef = useRef(null);

  // Focus input automatically
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (selectedSkill && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedSkill]);

  // Select a skill and pick a prompt
  const handleSelectSkill = (skill) => {
    if (!isActive) return;
    const prompt = skill.id === "ultimate" ? getRandomUltimatePrompt() : getRandomPrompt(skill);
    setSelectedSkill(skill);
    setTargetText(prompt);
    setCurrentIndex(0);
    setCurrentMistake(null);
    setErrorCount(0);
    setTypingStartTime(Date.now());
  };

  // Keyboard shortcut listener (1, 2, 3, 4, or U for ultimate) when no skill is selected
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (!isActive) return;

      // Escape to cancel current skill and pick another
      if (e.key === "Escape" && selectedSkill) {
        setSelectedSkill(null);
        setTargetText("");
        return;
      }

      if (!selectedSkill) {
        if (e.key === "1") handleSelectSkill(FIGHTER_SKILLS[0]);
        else if (e.key === "2") handleSelectSkill(FIGHTER_SKILLS[1]);
        else if (e.key === "3") handleSelectSkill(FIGHTER_SKILLS[2]);
        else if (e.key === "4") handleSelectSkill(FIGHTER_SKILLS[3]);
        else if ((e.key === "5" || e.key === "u" || e.key === "U") && combo >= 3) {
          handleSelectSkill(ULTIMATE_SKILL);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isActive, selectedSkill, combo]);

  // Handle typing input in Strict Mode
  const handleKeyDown = (e) => {
    if (!isActive || !selectedSkill) return;

    if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      if (currentMistake !== null) {
        setCurrentMistake(null);
        playKeyClick();
      }
      return;
    }

    if (e.key.length !== 1) return;

    e.preventDefault();

    // Strict Mode: if mistake exists, must press backspace
    if (currentMistake !== null) {
      playErrorSound();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
      return;
    }

    const expectedChar = targetText[currentIndex];

    if (e.key === expectedChar) {
      playKeyClick();
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Skill completed!
      if (nextIndex >= targetText.length) {
        const elapsedSec = (Date.now() - (typingStartTime || Date.now())) / 1000;
        const totalTyped = nextIndex + errorCount;
        const accuracy = Math.round((nextIndex / totalTyped) * 100);

        onCastSkill(selectedSkill, { timeSeconds: elapsedSec, accuracy });

        // Reset
        setSelectedSkill(null);
        setTargetText("");
        setCurrentIndex(0);
        setCurrentMistake(null);
      }
    } else {
      playErrorSound();
      setCurrentMistake(e.key);
      setErrorCount((prev) => prev + 1);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 200);
    }
  };

  return (
    <div className="fighterEngineCard" onClick={focusInput}>
      {/* Hidden input to capture keystrokes */}
      <input
        ref={inputRef}
        type="text"
        className="hiddenKeyCaptureInput"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        onKeyDown={handleKeyDown}
        readOnly={!isActive || !selectedSkill}
        aria-label="fighter typing input"
      />

      {/* Dynamic Battle Status Warnings */}
      <div className="battleStatusNotices">
        {opponentIsAttacking && (
          <div className="attackWarningBanner pulse">
            {t?.opponentAttacking || "⚠️ Opponent is attacking! Guard to reduce damage!"}
          </div>
        )}
        {isGuarding && (
          <div className="guardActiveBanner">
            {t?.guardActiveNotice || "🛡️ Guard Active! (-70% Damage & Parry Counter)"}
          </div>
        )}
        {combo >= 3 && !selectedSkill && (
          <div className="ultimateReadyBannerGlow">
            {t?.ultimateReadyBanner || "⚡ 3 COMBOS REACHED! ULTIMATE FINISHER UNLOCKED! ⚡"}
          </div>
        )}
      </div>

      {/* SKILL SELECTION VIEW */}
      {!selectedSkill ? (
        <div className="skillSelectionSection">
          <div className="skillSelectHeader">
            <span>{t?.selectSkillPrompt || "Select a skill to cast (Press 1~4 or Click):"}</span>
          </div>

          <div className="skillCardsGrid">
            {FIGHTER_SKILLS.map((skill) => (
              <button
                key={skill.id}
                className={`skillCard ${skill.type}`}
                onClick={() => handleSelectSkill(skill)}
                disabled={!isActive}
              >
                <div className="skillCardTop">
                  <span className="skillKeyBadge">[{skill.key}]</span>
                  <span className="skillIcon">{skill.icon}</span>
                  <span className="skillName">{t?.langBtn?.includes("한국어") ? skill.nameKo : skill.nameEn}</span>
                </div>

                <div className="skillCardDetails">
                  {skill.damage && <span className="statDmg">⚔️ {skill.damage} DMG</span>}
                  {skill.healAmount && <span className="statHeal">💚 +{skill.healAmount} HP</span>}
                  {skill.type === "guard" && <span className="statGuard">🛡️ GUARD & PARRY</span>}
                </div>

                <p className="skillDesc">{t?.langBtn?.includes("한국어") ? skill.descKo : skill.descEn}</p>
              </button>
            ))}

            {/* Ultimate Skill Card (Appears glowing when 3 Combos) */}
            {combo >= 3 && (
              <button
                className="skillCard ultimateCard"
                onClick={() => handleSelectSkill(ULTIMATE_SKILL)}
                disabled={!isActive}
              >
                <div className="skillCardTop">
                  <span className="skillKeyBadge ultimateKey">[5 / U]</span>
                  <span className="skillIcon">{ULTIMATE_SKILL.icon}</span>
                  <span className="skillName">{ULTIMATE_SKILL.nameEn}</span>
                </div>
                <div className="skillCardDetails">
                  <span className="statDmg ultimateDmg">⚡ 48 DMG (MASSIVE K.O.)</span>
                </div>
                <p className="skillDesc">Devastating Meteor Strike! Decisive finishing move.</p>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* TYPING IN PROGRESS VIEW */
        <div className={`activeSkillTypingBox ${isShaking ? "shakeAnimation" : ""}`}>
          <div className="activeSkillBar">
            <div className="activeSkillTitle">
              <span className="activeSkillIcon">{selectedSkill.icon}</span>
              <b>{selectedSkill.nameEn}</b>
              <span className="activeSkillTypeTag">{selectedSkill.type.toUpperCase()}</span>
            </div>
            <button
              className="cancelSkillBtn"
              onClick={() => {
                setSelectedSkill(null);
                setTargetText("");
              }}
              title="Cancel skill (Esc)"
            >
              취소 (Esc)
            </button>
          </div>

          {/* Typing Prompt Display */}
          <div className="fighterTypingTextDisplay">
            <span className="charsDone">{targetText.slice(0, currentIndex)}</span>

            {currentIndex < targetText.length && (
              <span className="charCursorContainer">
                {currentMistake !== null ? (
                  <span className="charMistake">
                    {currentMistake === " " ? "␣" : currentMistake}
                  </span>
                ) : (
                  <span className="charCurrent">
                    {targetText[currentIndex] === " " ? "␣" : targetText[currentIndex]}
                  </span>
                )}
              </span>
            )}

            <span className="charsUpcoming">
              {targetText.slice(currentMistake !== null ? currentIndex : currentIndex + 1)}
            </span>
          </div>

          <div className="typingHelpBar">
            {currentMistake !== null ? (
              <span className="helpErrorMsg">
                ⚠️ {t?.helpError || "Typo detected! Press Backspace to fix it."}
              </span>
            ) : (
              <span className="helpTypingMsg">
                {t?.helpTyping || "Type fast and accurately to unleash the strike!"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
